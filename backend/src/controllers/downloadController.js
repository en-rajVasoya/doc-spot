import fs from "fs"
import path from "path"
import { v4 as uuidv4 } from "uuid"
import { fork } from "child_process"
import { fileURLToPath } from "url"
import { dirname } from "path"
import mongoose from "mongoose"

// models
import uploadModel from "#models/uploadModel"

// helper
import { logger } from "#utils/logger"
import { getUserPermission } from "#utils/userPermissionUtil";
import { getAbsolutePath } from "#utils/pathHelper";

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const ZIPS_DIR = path.resolve("./zips")
if (!fs.existsSync(ZIPS_DIR)) {
    fs.mkdirSync(ZIPS_DIR, { recursive: true })
}

const zipJobsMap = new Map()

const nowMs = () => Date.now()

const cleanupOldZips = () => {
    const TWO_HOURS = 2 * 60 * 60 * 1000
    const now = Date.now()

    zipJobsMap.forEach((job, zipId) => {
        if (job.createdAt && (now - job.createdAt) > TWO_HOURS) {
            if (job.zipPath && fs.existsSync(job.zipPath)) {
                try {
                    fs.unlinkSync(job.zipPath)
                    console.log(`[CLEANUP] Deleted old zip: ${zipId}`)
                } catch (err) {
                    logger.error(err)
                    console.error(`[CLEANUP] Failed to delete zip: ${zipId}`, err.message)
                }
            }
            zipJobsMap.delete(zipId)
        }
    })
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

        // resolve folder paths iteratively because $graphLookup order is not guaranteed
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
                storagePath: getAbsolutePath(file.storagePath),
                archiveName: path.join(parentPath, file.name)
            })
        }
    }

    return fileList
}

// ─── helper: fork zip worker and wire up events ───────────────────────────────
const startZipWorker = (zipId, zipPath, fileList, folderName) => {
    const workerStartMs = nowMs()
    console.log(`[ZIP][${zipId}] Worker spawn start | files=${fileList.length} | name=${folderName}`)
    const child = fork(path.join(__dirname, "../workers/zipWorker.js"))

    const currentJob = zipJobsMap.get(zipId)
    if (currentJob) currentJob.childProcess = child

    child.send({ fileList, zipPath })

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
                zipPath,
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
        const userID = req.user._id

        // retrieve permission
        const permission = await getUserPermission(userID, id);

        // check if no permission then return
        if (!permission) {
            return res.status(403).json({ success: false, message: "Access denied" })
        }

        // retrieve file data
        const fileData = await uploadModel.findOne({ _id: id, type: "file", uploadStatus: "completed" });

        // check if no file data then return error
        if (!fileData) {
            return res.status(404).json({ success: false, message: "File not found" })
        }

        const absFilePath = getAbsolutePath(fileData.storagePath)
        if (!absFilePath || !fs.existsSync(absFilePath)) {
            return res.status(404).json({ success: false, message: "File not found on server" })
        }

        const fileSize = fileData.fileSize
        const rangeHeader = req.headers.range

        res.attachment(fileData.name)
        res.setHeader("Content-Type", fileData.fileType || "application/octet-stream")
        res.setHeader("Accept-Ranges", "bytes")

        if (!rangeHeader) {
            res.setHeader("Content-Length", fileSize)
            const stream = fs.createReadStream(absFilePath)
            stream.pipe(res)
            return
        }

        const parts = rangeHeader.replace(/bytes=/, "").split("-")
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1

        if (start >= fileSize || end >= fileSize) {
            res.setHeader("Content-Range", `bytes */${fileSize}`)
            return res.status(416).json({ success: false, message: "Range is invalid" })
        }

        const chunkSize = end - start + 1
        res.status(206)
        res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`)
        res.setHeader("Content-Length", chunkSize)

        const stream = fs.createReadStream(absFilePath, { start, end })
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
        const userID = req.user._id

        // retrieve permission for user
        const permission = await getUserPermission(userID, id)

        // check if no permission found then return error
        if (!permission) {
            return res.status(403).json({ success: false, message: "Access denied" })
        }

        // retrieve folder data
        const folderData = await uploadModel.findOne({ _id: id, type: "folder" })

        // check if no folder data found then return error message
        if (!folderData) {
            return res.status(404).json({ success: false, message: "Folder not found" })
        }

        // collect all files using $graphLookup — replaces the old BFS while loop
        const collectStartMs = nowMs()

        const includeTrash = folderData.isTrashed === true;

        const fileList = await collectFilesFromFolders([id], {
            [id.toString()]: ""   // root folder itself is not a prefix — files sit at root of zip
        }, includeTrash);

        console.log(`[ZIP][folder:${id}] File list ready | files=${fileList.length} | collectMs=${nowMs() - collectStartMs}`)

        const zipId = uuidv4()
        const zipPath = path.join(ZIPS_DIR, `${zipId}.zip`)

        zipJobsMap.set(zipId, {
            status: "creating",
            zipPath,
            folderName: folderData.name,
            createdAt: Date.now()
        })

        res.json({ success: true, zipId, folderName: folderData.name })
        console.log(`[ZIP][${zipId}] Job created from folder download | setupMs=${nowMs() - requestStartMs}`)

        startZipWorker(zipId, zipPath, fileList, folderData.name)

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
        const userID = req.user._id

        // convert ids into array here
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: "No items selected" })
        }

        //  check permission here for safty not anyone can downloa dhere
        for (const id of ids) {
            const permission = await getUserPermission(userID, id);

            if (!permission) {
                return res.status(403).json({ success: false, message: "Access denied" })
            }
        }

        //  fetch all selected items and fodlers here to now which are files and which are folders
        const items = await uploadModel.find({
            _id: { $in: ids },
            $or: [
                { type: "folder" },
                { type: "file", uploadStatus: "completed" }
            ]
        }).select("name type storagePath fileType fileSize isTrashed").lean()

        // Determine if we are downloading from the Trash page
        const isFromTrash = items.some(item => item.isTrashed === true)
        const includeTrash = req.query.includeTrash === "true" || isFromTrash

        // If not downloading from Trash, we exclude any items that are trashed
        const activeItems = includeTrash ? items : items.filter(item => item.isTrashed !== true)

        const fileList = []
        const folderIds = []
        const pathPrefixMap = {}

        for (const item of activeItems) {
            //  if type is file here
            if (item.type === "file") {
                //  directly add file to root of zip
                if (item.storagePath) {
                    fileList.push({
                        storagePath: getAbsolutePath(item.storagePath),
                        archiveName: item.name
                    })
                }
            } else if (item.type === "folder") {
                folderIds.push(item._id.toString())
                // fodler name is prefix so folder structure as it is in side zip
                pathPrefixMap[item._id.toString()] = item.name
            }
        }

        // if folder collect all nested child from mongoo using graphLookup
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
        const zipPath = path.join(ZIPS_DIR, `${zipId}.zip`)

        const now = new Date()
        const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19)
        const zipName = `docspot-download-${timestamp}`

        zipJobsMap.set(zipId, {
            status: "creating",
            zipPath,
            folderName: zipName,
            createdAt: Date.now()
        })

        res.json({ success: true, zipId, folderName: zipName })
        console.log(`[ZIP][${zipId}] Job created from multi download | totalFiles=${fileList.length} | setupMs=${nowMs() - requestStartMs}`)
        startZipWorker(zipId, zipPath, fileList, zipName)
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

        if (!fs.existsSync(job.zipPath)) {
            return res.status(404).json({ success: false, message: "Zip file not found on disk" })
        }

        const fileSize = job.fileSize
        const rangeHeader = req.headers.range

        res.setHeader("Content-Disposition", `attachment; filename="${job.folderName}.zip"`)
        res.setHeader("Content-Type", "application/zip")
        res.setHeader("Accept-Ranges", "bytes")

        if (!rangeHeader) {
            res.setHeader("Content-Length", fileSize)
            const stream = fs.createReadStream(job.zipPath)
            stream.pipe(res)
            return
        }

        const parts = rangeHeader.replace(/bytes=/, "").split("-")
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1

        if (start >= fileSize || end >= fileSize) {
            res.setHeader("Content-Range", `bytes */${fileSize}`)
            return res.status(416).json({ success: false, message: "Range is invalid" })
        }

        const chunkSize = end - start + 1
        res.status(206)
        res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`)
        res.setHeader("Content-Length", chunkSize)

        const stream = fs.createReadStream(job.zipPath, { start, end })
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

        if (job.zipPath && fs.existsSync(job.zipPath)) {
            try {
                fs.unlinkSync(job.zipPath)
                console.log(`[ZIP] Deleted: ${zip_id}`)
            } catch (err) {
                logger.error(err)
                console.error(`[ZIP] Delete failed: ${zip_id}`, err.message)
            }
        }

        zipJobsMap.delete(zip_id)

        res.json({ success: true })

    } catch (error) {
        logger.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

//  file preview of pdf here 
export const previewFile = async (req, res) => {
    try {
        const { id } = req.params
        const userID = req.user._id

        const permission = await getUserPermission(userID, id)
        if (!permission) {
            return res.status(403).json({ success: false, message: "Access denied" })
        }

        const fileData = await uploadModel.findOne({ _id: id, type: "file", uploadStatus: "completed" })
        if (!fileData) {
            return res.status(404).json({ success: false, message: "File not found" })
        }

        const absFilePath = getAbsolutePath(fileData.storagePath)
        if (!absFilePath || !fs.existsSync(absFilePath)) {
            return res.status(404).json({ success: false, message: "File not found on server" })
        }

        const fileSize = fileData.fileSize
        const rangeHeader = req.headers.range

        res.setHeader("Content-Type", "application/pdf")
        res.setHeader("Content-Disposition", "inline")
        res.setHeader("Accept-Ranges", "bytes")

        if (!rangeHeader) {
            res.setHeader("Content-Length", fileSize)
            const stream = fs.createReadStream(absFilePath)
            stream.pipe(res)
            return
        }

        const parts = rangeHeader.replace(/bytes=/, "").split("-")
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1

        if (start >= fileSize || end >= fileSize) {
            res.setHeader("Content-Range", `bytes */${fileSize}`)
            return res.status(416).json({ success: false, message: "Range is invalid" })
        }

        const chunkSize = end - start + 1
        res.status(206)
        res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`)
        res.setHeader("Content-Length", chunkSize)

        const stream = fs.createReadStream(absFilePath, { start, end })
        stream.pipe(res)

    } catch (error) {
        logger.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}