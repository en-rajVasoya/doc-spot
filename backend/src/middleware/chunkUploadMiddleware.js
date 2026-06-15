


import fs from "fs"
import fsPromises from "fs/promises"
import busboy from "busboy"
import Chunk from "../models/chunkModel.js"
import Upload from "../models/uploadModel.js"
import { getAbsolutePath } from "../utils/pathHelper.js"



// ============================================================
// GLOBAL WRITE SEMAPHORE
// ============================================================

// Prevents writing too many chunks at once to keep the hard disk fast.
const MAX_CONCURRENT_WRITES = 15 
let activeWrites = 0
const globalWriteQueue = []



// when chunk is ready to write so call this function
const acquireWriteSlot = () => {
    // if there is a empty slot so add chunk
    if (activeWrites < MAX_CONCURRENT_WRITES) {
        activeWrites++
        return Promise.resolve()
    }
    // If all full so next chunk add to queue
    return new Promise(resolve => {
        globalWriteQueue.push(resolve)
    })
}

//  when chunk write is done so relese the chunk 
const releaseWriteSlot = () => {
    activeWrites--
    // If there is a next chunk so add to aueue
    if (globalWriteQueue.length > 0) {
        activeWrites++
        const next = globalWriteQueue.shift()
        next() 
    }
}



// ============================================================
// FD POOL
// ============================================================
// Pool of open files. Opening/closing a file is slow. 
// This opens the file once, writes all chunks, and closes at the end.
const fdPool = new Map() 


// getFd: Get open file handle or open it if it's the first chunk
const getFd = async (uploadId, storagePath) => {
    let entry = fdPool.get(uploadId) // Check cache to see if file is already open
    if (!entry) {
        // If not open, open it on the disk in read/write mode ("r+")
        const handle = await fsPromises.open(storagePath, "r+")
        entry = {
            fd: handle.fd,       // Number ID of open file
            handle,             // Open file controller
            lastUsed: Date.now() // Timestamp of this write
        }
        fdPool.set(uploadId, entry) // Save to cache
    }
    entry.lastUsed = Date.now() // Reset idle timer
    return entry.fd
}

// releaseFd: Close file handle when upload finishes or gets cancelled
export const releaseFd = async (uploadId) => {
    const entry = fdPool.get(uploadId)
    if (!entry) return
    try {
        await entry.handle.close() // Safely close file on the hard disk
    } catch (err) {
        console.error(`[FD CLOSE ERROR] ${err.message}`)
    }
    fdPool.delete(uploadId) // Remove from cache Map
}


// Auto-cleanup: check every 2 minutes. 
// If an upload has no writes for 2 minutes, close the file to prevent memory/file leaks.
setInterval(async () => {
    const now = Date.now()
    for (const [uploadId, entry] of fdPool.entries()) {
        if (now - entry.lastUsed > 2 * 60 * 1000) {
            try {
                await entry.handle.close()
            } catch {}
            fdPool.delete(uploadId)
        }
    }
}, 2 * 60 * 1000)



// ============================================================
// PER FILE CONCURRENCY
// ============================================================
// limit write streams for a single file to 3 at the same time
const PER_FILE_PARALLEL_WRITES = 3
const activeFileWrites = new Map() // Tracks number of active writes per uploadId
const waitingFileWrites = new Map() // Queue of resolve functions waiting for a slot per uploadId

// get slot to write to this file
const acquireFileSlot = (uploadId) => {
    const active = activeFileWrites.get(uploadId) || 0
    // If active writes for this file is less than 3, increment it and start immediately
    if (active < PER_FILE_PARALLEL_WRITES) {
        activeFileWrites.set(uploadId, active + 1)
        return Promise.resolve()
    }
    // If 3 writes are already active, wait in a queue for this specific file
    return new Promise(resolve => {
        if (!waitingFileWrites.has(uploadId)) {
            waitingFileWrites.set(uploadId, [])
        }
        waitingFileWrites.get(uploadId).push(resolve)
    })
}

// release slot for this file
const releaseFileSlot = (uploadId) => {
    const active = activeFileWrites.get(uploadId) || 0
    activeFileWrites.set(uploadId, Math.max(0, active - 1)) // Decrement active writes for this file
    const queue = waitingFileWrites.get(uploadId)
    // If there are waiting writes in the queue for this file, resolve the first one in line
    if (queue && queue.length > 0) {
        activeFileWrites.set(uploadId, (activeFileWrites.get(uploadId) || 0) + 1)
        const next = queue.shift()
        next()
    }
}



// ============================================================
// UPLOAD CACHE
// ============================================================
// cache file upload database records in memory to save mongo queries
const uploadRecordCache = new Map()
const CACHE_TTL = 10 * 60 * 1000 // Cache records for 10 minutes

// get cached upload record
const getCachedUpload = async (uploadId, owner) => {
    const cached = uploadRecordCache.get(uploadId) // Check: Is the upload record already cached in memory?
    // If cached and still valid (under 10 minutes), return cached record immediately
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
        return cached.record
    }
    // IF NOT: Fetch from database, save in cache, and return it
    const record = await Upload.findOne({ uploadId, owner })
    if (record) {
        uploadRecordCache.set(uploadId, {
            record,
            cachedAt: Date.now()
        })
    }
    return record
}

// remove upload record from cache
export const clearUploadCache = (uploadId) => {
    uploadRecordCache.delete(uploadId)
}



// ============================================================
// CHUNK MEMORY CACHE
// ============================================================
// cache completed chunk indexes in memory so we do not download or write them again
const uploadedChunkCache = new Map()

// get list of already uploaded chunks
const getChunkSet = async (uploadId) => {
    // Check: Is the list of uploaded chunk indexes cached in memory?
    if (uploadedChunkCache.has(uploadId)) {
        return uploadedChunkCache.get(uploadId)
    }
    // IF NOT: Fetch completed chunk documents from database, extract index, convert to Set, and cache it
    const chunks = await Chunk.find(
        { uploadId },
        { chunkIndex: 1, _id: 0 }
    ).lean()
    const set = new Set(chunks.map(c => c.chunkIndex))
    uploadedChunkCache.set(uploadId, set)
    return set
}

// remove chunk set from memory cache
export const clearChunkCache = (uploadId) => {
    uploadedChunkCache.delete(uploadId)
}



// ============================================================
// BULK INSERT BUFFER
// ============================================================
// buffer database writes for chunks in groups of 50 to save database calls
const chunkInsertBuffers = new Map()

// save chunk indexes to mongo database in bulk
const flushChunkBuffer = async (uploadId) => {
    const buffer = chunkInsertBuffers.get(uploadId) // Get buffered inserts for this upload
    if (!buffer || buffer.length === 0) return // If buffer is empty, do nothing
    chunkInsertBuffers.set(uploadId, []) // Reset the buffer before async write to avoid duplicate writes
    try {
        // Bulk insert chunk logs into database in single query
        await Chunk.insertMany(buffer, { ordered: false })
    } catch (err) {
        console.error(`[CHUNK BULK ERROR] ${err.message}`)
    }
}

// add chunk record to batch insertion buffer
const addChunkInsert = async (uploadId, chunkIndex) => {
    if (!chunkInsertBuffers.has(uploadId)) {
        chunkInsertBuffers.set(uploadId, [])
    }
    const arr = chunkInsertBuffers.get(uploadId)
    arr.push({ uploadId, chunkIndex }) // Add chunk record to batch list in memory
    // If we have 50 or more records buffered, save them to the database in bulk
    if (arr.length >= 50) {
        await flushChunkBuffer(uploadId)
    }
}



// ============================================================
// MAIN MIDDLEWARE
// ============================================================
// main express middleware to parse incoming chunk stream and write to disk
export const streamChunkMiddleware = (req, res, next) => {
    // Get owner, uploadId, chunk indexes, and start positions from request headers
    const owner = req.user._id
    const uploadId = req.headers["x-upload-id"]
    const indexes = JSON.parse(req.headers["x-indexes"] || "[]") // Array of chunk indexes in this request
    const starts = JSON.parse(req.headers["x-starts"] || "[]") // Array of start byte positions for each chunk

    // validation: uploadId is required
    if (!uploadId) {
        return res.status(400).json({
            success: false,
            message: "Missing x-upload-id"
        })
    }

    // start busboy to parse multipart fields and stream files
    const bb = busboy({
        headers: req.headers,
        limits: {
            fileSize: 10 * 1024 * 1024 // Cap individual chunk size at 10MB
        }
    })

    const writePromises = [] // Store all chunk write promise operations

    // when busboy finds a file stream in the form data
    bb.on("file", (fieldname, stream) => {

        const promise = (async () => {
            try {
                // get chunk index and byte position
                const chunkIndex = parseInt(fieldname.split("_")[1])
                const position = starts[indexes.indexOf(chunkIndex)]

                // check if start byte position is valid. If not, resume (discard) stream and skip
                if (position === undefined || position === -1) {
                    stream.resume() // discard incoming data
                    return { skipped: true }
                }

                // get upload details from cache/DB. If missing, skip chunk
                const record = await getCachedUpload(uploadId, owner)
                if (!record) {
                    stream.resume() // discard incoming data
                    return { skipped: true }
                }

                // skip if this chunk was already uploaded
                const uploadedSet = await getChunkSet(uploadId)
                if (uploadedSet.has(chunkIndex)) {
                    stream.resume() // discard incoming data
                    return { skipped: true }
                }

                // wait for global and per-file write slots (stands in line)
                await acquireWriteSlot()
                await acquireFileSlot(uploadId)

                try {
                    // get open file descriptor (FD) from cache pool, or open file if first chunk
                    const fd = await getFd(uploadId, getAbsolutePath(record.storagePath))

                    // write chunk stream directly into correct byte position in file
                    await new Promise((resolveWrite, rejectWrite) => {
                        const writeStream = fs.createWriteStream(null, {
                            fd,
                            start: position,
                            autoClose: false // Keep file handle open in pool
                        })

                        // clear connection if write gets stuck for 2 minutes
                        const timeout = setTimeout(() => {
                            stream.unpipe(writeStream)
                            writeStream.destroy()
                            rejectWrite(new Error("Write timeout - chunk stuck"))
                        }, 120000)

                        // Resolve promise when write finishes successfully
                        writeStream.on("finish", () => {
                            clearTimeout(timeout)
                            resolveWrite()
                        })

                        // Reject promise on write error
                        writeStream.on("error", (err) => {
                            clearTimeout(timeout)
                            stream.unpipe(writeStream)
                            writeStream.destroy()
                            rejectWrite(err)
                        })

                        stream.on("error", (err) => {
                            clearTimeout(timeout)
                            stream.unpipe(writeStream)
                            writeStream.destroy()
                            rejectWrite(err)
                        })

                        // Pipe incoming file chunk stream into filesystem write stream
                        stream.pipe(writeStream)
                    })

                    // add to completed chunks cache list
                    uploadedSet.add(chunkIndex)
                    // add to db insert buffer
                    await addChunkInsert(uploadId, chunkIndex)

                    return { skipped: false, chunkIndex }

                } finally {
                    // release write slots when finished or failed
                    releaseWriteSlot()
                    releaseFileSlot(uploadId)
                }

            } catch (err) {
                console.error(`[WRITE ERROR] ${uploadId} ${err.message}`)
                if (!stream.destroyed) {
                    stream.resume()
                }
                throw err
            }
        })()

        writePromises.push(promise)
    })

    // when busboy finishes parsing the whole request body
    bb.on("finish", async () => {
        try {
            // wait for all chunks in request to finish writing
            await Promise.all(writePromises)
            // flush remaining chunk database writes
            await flushChunkBuffer(uploadId)
            // return success response
            if (!res.writableEnded) {
                res.json({
                    success: true,
                    message: "Written"
                })
            }
        } catch (err) {
            console.error(`[FINAL ERROR] ${err.message}`)
            if (!res.writableEnded) {
                res.status(500).json({
                    success: false,
                    message: err.message
                })
            }
        }
    })

    // handle parsing error
    bb.on("error", err => {
        console.error(`[BUSBOY ERROR] ${err.message}`)
        if (!res.writableEnded) {
            res.status(500).json({
                success: false,
                message: err.message
            })
        }
    })

    // pipe the incoming request stream directly into busboy
    req.pipe(bb)
}



// ============================================================
// CLEANUP HELPERS
// ============================================================
// clear cache maps and close file handles when upload is done or cancelled
export const cleanupUploadResources = async (uploadId) => {
    // Save remaining chunk records in buffer to database
    await flushChunkBuffer(uploadId)
    // Close file descriptor in cache pool
    await releaseFd(uploadId)

    // Remove limits trackers
    activeFileWrites.delete(uploadId)
    waitingFileWrites.delete(uploadId)

    // Clear caches from RAM
    clearUploadCache(uploadId)
    clearChunkCache(uploadId)

    chunkInsertBuffers.delete(uploadId)
}