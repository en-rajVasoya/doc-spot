import fs from "fs"
import path from "path"
import { v4 as uuidv4 } from "uuid"
import { fork } from "child_process"
import { fileURLToPath } from "url"
import { dirname } from "path"
import mongoose from "mongoose"

// models
import uploadModel from "#models/uploadModel"
import SharedLink from "#models/sharedLinksModel"

// helper
import { logger } from "#utils/logger"
import { getUserPermission } from "#utils/userPermissionUtil"
import { getAbsolutePath } from "#utils/pathHelper"
import { checkDownloadPermission } from "#utils/index"
import { getStorage } from "../services/storageFactory.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const ZIPS_DIR = path.resolve("./zips")
if (!fs.existsSync(ZIPS_DIR)) {
    fs.mkdirSync(ZIPS_DIR, { recursive: true })
}

const zipJobsMap = new Map()

const nowMs = () => Date.now()

const storage = getStorage()

const cleanupOldZips = async () => {
    const TWO_HOURS = 2 * 60 * 60 * 1000
    const now = Date.now()

    for (const [zipId, job] of zipJobsMap.entries()) {
        if (job.createdAt && (now - job.createdAt) > TWO_HOURS) {
            if (job.zipKey) {
                await storage.deleteZipFile(job.zipKey)
                console.log(`[CLEANUP] Deleted old zip: ${zipId}`)
            }
            zipJobsMap.delete(zipId)
        }
    }
}

setInterval(cleanupOldZips, 60 * 60 * 1000)

// this function is graph look up for collection all nested folder ids
const collectFilesFromFolders = async (folderIds, pathPrefixMap = {}, includeTrash = false) => {
    if (!folderIds.length) return []

    const objectIds = folderIds.map(id => new mongoose.Types.ObjectId(id))

    const results = await uploadModel.aggregate([
        { $match: { _id: { $in: objectIds } } },
        {
            $graphLookup: {
                from: "uploads",
                startWith: "$_id",
                connectFromField: "_id",
                connectToField: "parent",
                as: "allDescendants",
                restrictSearchWithMatch: {
                    ...(!includeTrash && { isTrashed: { $ne: true } }),
                    $or: [
                        { type: "folder" },
                        { type: "file", uploadStatus: "completed" }
                    ]
                }
            }
        },
        {
            $project: {
                name: 1,
                type: 1,
                fileSize: 1,
                allDescendants: 1
            }
        }
    ])

    const pathMap = new Map()
    const fileList = []

    for (const root of results) {
        const rootPrefix = pathPrefixMap[root._id.toString()] ?? root.name
        pathMap.set(root._id.toString(), rootPrefix)

        const folders = root.allDescendants.filter(d => d.type === "folder")
        const files = root.allDescendants.filter(d => d.type === "file")

        let remaining = [...folders]
        let attempts = 0

        while (remaining.length > 0 && attempts < 200) {
            attempts++
            const stillPending = []
            for (const folder of remaining) {
                const parentPath = pathMap.get(folder.parent.toString())
                if (parentPath !== undefined) {
                    pathMap.set(folder._id.toString(), path.join(parentPath, folder.name))
                } else {
                    stillPending.push(folder)
                }
            }
            remaining = stillPending
        }

        for (const file of files) {
            if (!file.storagePath) continue
            const parentPath = pathMap.get(file.parent.toString()) || rootPrefix
            fileList.push({
                storageKey: file.storagePath,
                archiveName: path.join(parentPath, file.name),
                fileSize: file.fileSize
            })
        }
    }

    return fileList
}

// ─── helper: fork zip worker and wire up events ───────────────────────────────
const startZipWorker = (zipId, zipKey, fileList, folderName) => {
    const workerStartMs = nowMs()
    console.log(`[ZIP][${zipId}] Worker spawn start | files=${fileList.length} | name=${folderName}`)
    const child = fork(path.join(__dirname, "../workers/zipWorker.js"))

    const currentJob = zipJobsMap.get(zipId)
    if (currentJob) currentJob.childProcess = child

    child.send({ fileList, zipKey })

    child.on("message", (msg) => {
        if (msg.type === "started") {
            console.log(`[ZIP][${zipId}] Worker started | files=${msg.fileCount}`)
        }

        if (msg.type === "progress") {
            const job = zipJobsMap.get(zipId)
            if (job) {
                zipJobsMap.set(zipId, { ...job, progress: msg.percent })
            }

            const lastLoggedPercent = job?.lastLoggedPercent ?? -10
            if (msg.percent >= lastLoggedPercent + 10 || msg.percent === 100) {
                const elapsedSec = ((nowMs() - workerStartMs) / 1000).toFixed(1)
                console.log(
                    `[ZIP][${zipId}] Progress ${msg.percent}% | ${msg.processedBytes}/${msg.totalBytes} bytes | elapsed=${elapsedSec}s`
                )
                if (job) {
                    zipJobsMap.set(zipId, { ...job, progress: msg.percent, lastLoggedPercent: msg.percent })
                }
            }
        }

        if (msg.type === "done") {
            zipJobsMap.set(zipId, {
                status: "ready",
                zipKey,
                folderName,
                fileSize: msg.fileSize,
                createdAt: Date.now()
            })
            const totalSec = ((nowMs() - workerStartMs) / 1000).toFixed(1)
            console.log(`[ZIP][${zipId}] Ready | size=${msg.fileSize} bytes | files=${msg.fileCount} | worker=${msg.elapsedMs}ms | total=${totalSec}s`)
        }
        if (msg.type === "error") {
            zipJobsMap.set(zipId, { status: "error", error: msg.error })
            console.error(`[ZIP][${zipId}] Failed - ${msg.error}`)
        }
    })

    child.on("exit", (code) => {
        if (code !== 0) {
            const job = zipJobsMap.get(zipId)
            if (job?.status === "creating") {
                zipJobsMap.set(zipId, { status: "error", error: "Zip worker crashed" })
            }
        }
    })

    child.on("error", (err) => {
        console.error("[ZIP WORKER ERROR]", err)
    })
}

// function to downlaod files
export const downloadFile = async (req, res) => {
    try {
        const { id } = req.params
        const permission = await checkDownloadPermission(req, id);
        if (!permission) {
            return res.status(403).json({ success: false, message: "Access denied" })
        }

        const fileData = await uploadModel.findOne({ _id: id, type: "file", uploadStatus: "completed" });
        if (!fileData) {
            return res.status(404).json({ success: false, message: "File not found" })
        }

        const rangeHeader = req.headers.range

        let fileStreamResult
        try {
            fileStreamResult = await storage.getFileStream(fileData.storagePath, rangeHeader)
        } catch (err) {
            return res.status(404).json({ success: false, message: "File not found on server" })
        }

        const { stream, contentLength, contentRange, isPartial } = fileStreamResult

        res.attachment(fileData.name)
        res.setHeader("Content-Type", fileData.fileType || "application/octet-stream")
        res.setHeader("Accept-Ranges", "bytes")
        res.setHeader("Content-Length", contentLength)

        if (isPartial) {
            res.status(206)
            res.setHeader("Content-Range", contentRange)
        }

        stream.pipe(res)

    } catch (error) {
        logger.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// single folder download — now uses $graphLookup via collectFilesFromFolders
export const downloadFolder = async (req, res) => {
    try {
        const requestStartMs = nowMs()
        const { id } = req.params

        const permission = await checkDownloadPermission(req, id);

        if (!permission) {
            return res.status(403).json({ success: false, message: "Access denied" })
        }

        const folderData = await uploadModel.findOne({ _id: id, type: "folder" })

        if (!folderData) {
            return res.status(404).json({ success: false, message: "Folder not found" })
        }

        const collectStartMs = nowMs()
        const includeTrash = folderData.isTrashed === true;

        const fileList = await collectFilesFromFolders([id], {
            [id.toString()]: ""   
        }, includeTrash);

        console.log(`[ZIP][folder:${id}] File list ready | files=${fileList.length} | collectMs=${nowMs() - collectStartMs}`)

        const zipId = uuidv4()
        const zipKey = `zips/${zipId}.zip`
        zipJobsMap.set(zipId, { status: "creating", zipKey, folderName: folderData.name, createdAt: Date.now() })

        res.json({ success: true, zipId, folderName: folderData.name })
        console.log(`[ZIP][${zipId}] Job created from folder download | setupMs=${nowMs() - requestStartMs}`)

        startZipWorker(zipId, zipKey, fileList, folderData.name)

    } catch (error) {
        logger.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// multi-select download — user selects mix of files and folders
export const downloadMultiple = async (req, res) => {
    try {
        const requestStartMs = nowMs()
        const { ids } = req.body

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: "No items selected" })
        }

        for (const id of ids) {
            const permission = await checkDownloadPermission(req, id);
            if (!permission) {
                return res.status(403).json({ success: false, message: "Access denied" })
            }
        }

        const items = await uploadModel.find({
            _id: { $in: ids },
            $or: [
                { type: "folder" },
                { type: "file", uploadStatus: "completed" }
            ]
        }).select("name type storagePath fileType fileSize isTrashed").lean()

        const isFromTrash = items.some(item => item.isTrashed === true)
        const includeTrash = req.query.includeTrash === "true" || isFromTrash
        const activeItems = includeTrash ? items : items.filter(item => item.isTrashed !== true)

        const fileList = []
        const folderIds = []
        const pathPrefixMap = {}

        for (const item of activeItems) {
            if (item.type === "file") {
                if (item.storagePath) {
                    fileList.push({
                        storageKey: item.storagePath,
                        archiveName: item.name,
                        fileSize: item.fileSize
                    })
                }
            } else if (item.type === "folder") {
                folderIds.push(item._id.toString())
                pathPrefixMap[item._id.toString()] = item.name
            }
        }

        if (folderIds.length > 0) {
            const collectStartMs = nowMs()
            const folderFiles = await collectFilesFromFolders(folderIds, pathPrefixMap, includeTrash)
            console.log(`[ZIP][multi] Nested file list ready | folderCount=${folderIds.length} | files=${folderFiles.length} | collectMs=${nowMs() - collectStartMs}`)
            fileList.push(...folderFiles)
        }

        if (fileList.length === 0) {
            return res.status(400).json({ success: false, message: "No downloadable files found" })
        }

        const zipId = uuidv4()
        const zipKey = `zips/${zipId}.zip`

        const now = new Date()
        const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19)
        const zipName = `docspot-download-${timestamp}`

        zipJobsMap.set(zipId, { status: "creating", zipKey, folderName: zipName, createdAt: Date.now() })

        res.json({ success: true, zipId, folderName: zipName })
        console.log(`[ZIP][${zipId}] Job created from multi download | totalFiles=${fileList.length} | setupMs=${nowMs() - requestStartMs}`)
        startZipWorker(zipId, zipKey, fileList, zipName)
    } catch (error) {
        logger.error(error)
        res.status(500).json({ success: false, message: error.message })
    }

}

// function to get zip status
export const getZipStatus = async (req, res) => {
    try {
        const { zip_id } = req.params

        const job = zipJobsMap.get(zip_id)
        if (!job) {
            return res.status(404).json({ success: false, message: "Zip job not found" })
        }

        res.json({
            success: true,
            status: job.status,
            folderName: job.folderName,
            fileSize: job.fileSize || null,
            progress: job.progress || 0,
            error: job.error || null
        })

    } catch (error) {
        logger.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// function to download zip
export const downloadZip = async (req, res) => {
    try {
        const { zip_id } = req.params
        const job = zipJobsMap.get(zip_id)

        if (!job || job.status !== "ready") {
            return res.status(404).json({ success: false, message: "Zip not ready or not found" })
        }

        const rangeHeader = req.headers.range

        let fileStreamResult
        try {
            fileStreamResult = await storage.getFileStream(job.zipKey, rangeHeader)
        } catch (err) {
            return res.status(404).json({ success: false, message: "Zip file not found on server" })
        }

        const { stream, contentLength, contentRange, isPartial } = fileStreamResult

        res.setHeader("Content-Disposition", `attachment; filename="${job.folderName}.zip"`)
        res.setHeader("Content-Type", "application/zip")
        res.setHeader("Accept-Ranges", "bytes")
        res.setHeader("Content-Length", contentLength)

        if (isPartial) {
            res.status(206)
            res.setHeader("Content-Range", contentRange)
        }

        stream.pipe(res)

    } catch (error) {
        logger.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// function to delete zip
export const deleteZip = async (req, res) => {
    try {
        const { zip_id } = req.params

        const job = zipJobsMap.get(zip_id)
        if (!job) {
            return res.status(404).json({ success: false, message: "Zip job not found" })
        }

        if (job.status === "creating" && job.childProcess) {
            job.childProcess.kill()
            console.log(`[ZIP] Killed worker process for zip: ${zip_id}`)
        }

        if (job.zipKey) {
            await storage.deleteZipFile(job.zipKey)
            console.log(`[ZIP] Deleted: ${zip_id}`)
        }

        zipJobsMap.delete(zip_id)
        res.json({ success: true })

    } catch (error) {
        logger.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}
