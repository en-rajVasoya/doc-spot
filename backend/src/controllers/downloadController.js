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

// ============================================================
// ZIP WORKER CONCURRENCY LIMITER (MAX 5)
// ============================================================
const MAX_CONCURRENT_ZIP_WORKERS = 5
let activeZipWorkers = 0
const zipWorkerQueue = []

const acquireZipSlot = () => {
    if (activeZipWorkers < MAX_CONCURRENT_ZIP_WORKERS) {
        activeZipWorkers++
        return Promise.resolve()
    }
    return new Promise(resolve => {
        zipWorkerQueue.push(resolve)
    })
}

const releaseZipSlot = () => {
    activeZipWorkers--
    if (zipWorkerQueue.length > 0) {
        activeZipWorkers++
        const next = zipWorkerQueue.shift()
        next()
    }
}

const nowMs = () => Date.now()

const cleanupOldZips = async () => {
    const storage = getStorage()
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000
    const now = Date.now()

    for (const [zipId, job] of zipJobsMap.entries()) {
        if (job.createdAt && (now - job.createdAt) > TWENTY_FOUR_HOURS) {
            if (job.zipKey) {
                await storage.deleteZipFile(job.zipKey)
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

    // fetch all descendants of ANY of these folders in one query
    const matchConditions = {
        ancestorIds: { $in: objectIds },
        ...(!includeTrash && { isTrashed: { $ne: true } }),
        $or: [
            { type: "folder" },
            { type: "file", uploadStatus: "completed" }
        ]
    }

    const allDescendants = await uploadModel.find(matchConditions)
        .select("name type fileSize storagePath parent ancestorIds")
        .lean()

    // also fetch the root folders themselves (for their names)
    const rootFolders = await uploadModel.find({ _id: { $in: objectIds } })
        .select("name").lean()
    const rootNameMap = new Map(rootFolders.map(r => [r._id.toString(), r.name]))

    // group descendants by which root folder they belong to
    const pathMap = new Map()
    for (const rootId of objectIds) {
        const rootIdStr = rootId.toString()
        pathMap.set(rootIdStr, pathPrefixMap[rootIdStr] ?? rootNameMap.get(rootIdStr))
    }

    // sort descendants by depth (ancestorIds.length) so we always
    // resolve a folder's path AFTER its own parent's path is known
    const sortedDescendants = [...allDescendants].sort(
        (a, b) => (a.ancestorIds?.length || 0) - (b.ancestorIds?.length || 0)
    )

    const fileList = []

    for (const doc of sortedDescendants) {
        if (doc.type === "folder") {
            const parentPath = pathMap.get(doc.parent.toString())
            if (parentPath !== undefined) {
                pathMap.set(doc._id.toString(), path.join(parentPath, doc.name))
            }
        } else if (doc.type === "file" && doc.storagePath) {
            const parentPath = pathMap.get(doc.parent.toString())
            if (parentPath !== undefined) {
                fileList.push({
                    storageKey: doc.storagePath,
                    archiveName: path.join(parentPath, doc.name),
                    fileSize: doc.fileSize
                })
            }
        }
    }

    return fileList
}

// ─── helper: fork zip worker and wire up events ───────────────────────────────
const startZipWorker = async (zipId, zipKey, fileList, folderName) => {
    // Wait here if 5 zip jobs are already running
    await acquireZipSlot()

    const workerStartMs = nowMs()
    const child = fork(path.join(__dirname, "../workers/zipWorker.js"))

    const currentJob = zipJobsMap.get(zipId)
    if (currentJob) currentJob.childProcess = child

    // ensure releaseZipSlot is only called ONCE per job
    let isReleased = false
    const safeRelease = () => {
        if (!isReleased) {
            isReleased = true
            releaseZipSlot()
        }
    }

    child.send({ fileList, zipKey })

    child.on("message", (msg) => {
        if (msg.type === "started") {
            // console.log(`[ZIP][${zipId}] Worker started | files=${msg.fileCount}`)
        }

        if (msg.type === "progress") {
            const job = zipJobsMap.get(zipId)
            if (job) {
                zipJobsMap.set(zipId, { ...job, progress: msg.percent })
            }

            const lastLoggedPercent = job?.lastLoggedPercent ?? -10
            if (msg.percent >= lastLoggedPercent + 10 || msg.percent === 100) {
                const elapsedSec = ((nowMs() - workerStartMs) / 1000).toFixed(1)
                
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
            safeRelease()
        }
        if (msg.type === "error") {
            zipJobsMap.set(zipId, { status: "error", error: msg.error })
            console.error(`[ZIP][${zipId}] Failed - ${msg.error}`)
            safeRelease()
        }
    })

    child.on("exit", (code) => {
        if (code !== 0) {
            const job = zipJobsMap.get(zipId)
            if (job?.status === "creating") {
                zipJobsMap.set(zipId, { status: "error", error: "Zip worker crashed" })
            }
        }
        safeRelease()
    })

    child.on("error", (err) => {
        console.error("[ZIP WORKER ERROR]", err)
        safeRelease()
    })
}

// function to downlaod files
export const downloadFile = async (req, res) => {
    try {
        const storage = getStorage()
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
            const cleanStoragePath = fileData.storagePath?.replace(/^[/\\]+/, "").replace(/\\/g, "/")
            fileStreamResult = await storage.getFileStream(cleanStoragePath, rangeHeader)
        } catch (err) {
            console.error("[DOWNLOAD STREAM ERROR]:", err.message, {
                storagePath: fileData.storagePath,
                rangeHeader
            })
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


        const zipId = uuidv4()
        const zipKey = `zips/${zipId}.zip`
        zipJobsMap.set(zipId, { status: "creating", zipKey, folderName: folderData.name, createdAt: Date.now() })

        res.json({ success: true, zipId, folderName: folderData.name })

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
        const storage = getStorage()
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
        const storage = getStorage()
        const { zip_id } = req.params

        const job = zipJobsMap.get(zip_id)
        if (!job) {
            return res.status(404).json({ success: false, message: "Zip job not found" })
        }

        if (job.status === "creating" && job.childProcess) {
            job.childProcess.kill()
        }

        if (job.zipKey) {
            await storage.deleteZipFile(job.zipKey)
        }

        zipJobsMap.delete(zip_id)
        res.json({ success: true })

    } catch (error) {
        logger.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}
