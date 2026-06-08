import fs from "fs"
import path from "path"

const OUTPUT_DIR = "./test-files"

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

const TOTAL = 100000

for (let i = 1; i <= TOTAL; i++) {
    const content = `This is test file number ${i}\nCreated for testing purposes.\n`
    const filePath = path.join(OUTPUT_DIR, `test-file-${i}.txt`)
    fs.writeFileSync(filePath, content)

    if (i % 10000 === 0) {
        console.log(`Created ${i} files...`)
    }
}

console.log("Done! 1 lakh files created.")











import fs from "fs"
import busboy from "busboy"
import Chunk from "../models/chunkModel.js"
import Upload from "../models/uploadModel.js"


// ═══════════════════════════════════════════════════════════════════
//  GLOBAL SEMAPHORE — Limits concurrent disk writes across ALL users
//  This prevents server crash when 100+ users upload simultaneously
//  The queue is FIFO so no user gets starved
// ═══════════════════════════════════════════════════════════════════
const MAX_CONCURRENT_WRITES = 10
let activeWrites = 0
const globalWriteQueue = []

const acquireWriteSlot = () => {
    if (activeWrites < MAX_CONCURRENT_WRITES) {
        activeWrites++
        return Promise.resolve()
    }
    return new Promise(resolve => globalWriteQueue.push(resolve))
}

const releaseWriteSlot = () => {
    activeWrites--
    if (globalWriteQueue.length > 0) {
        activeWrites++
        const next = globalWriteQueue.shift()
        next()
    }
}


// ═══════════════════════════════════════════════════════════════════
//  FILE DESCRIPTOR POOL — Keeps file handles open to avoid
//  repeated open/close syscalls per chunk (huge perf win)
// ═══════════════════════════════════════════════════════════════════
const fdPool = new Map()

const getFd = (uploadId, storagePath) => {
    if (!fdPool.has(uploadId)) {
        const fd = fs.openSync(storagePath, "r+")
        fdPool.set(uploadId, { fd, lastUsed: Date.now() })
    } else {
        fdPool.get(uploadId).lastUsed = Date.now()
    }
    return fdPool.get(uploadId).fd
}

export const releaseFd = (uploadId) => {
    const entry = fdPool.get(uploadId)
    if (!entry) return
    try { fs.closeSync(entry.fd) } catch (_) { }
    fdPool.delete(uploadId)
}

// Auto-close stale FDs after 2 minutes of inactivity
setInterval(() => {
    const now = Date.now()
    for (const [uploadId, entry] of fdPool.entries()) {
        if (now - entry.lastUsed > 2 * 60 * 1000) {
            try { fs.closeSync(entry.fd) } catch (_) { }
            fdPool.delete(uploadId)
        }
    }
}, 2 * 60 * 1000)


// ═══════════════════════════════════════════════════════════════════
//  PER-FILE SEQUENTIAL WRITE QUEUE — Prevents data corruption
//  when multiple chunks for the SAME file arrive simultaneously
//  (e.g. resume from 2 devices, or parallel batch requests)
// ═══════════════════════════════════════════════════════════════════
const writeQueues = new Map()  // uploadId -> Promise (last queued write)

const getWriteQueue = (uploadId) => {
    if (!writeQueues.has(uploadId)) {
        writeQueues.set(uploadId, Promise.resolve())
    }
    return writeQueues.get(uploadId)
}

const queueWrite = (uploadId, writeFn) => {
    const last = getWriteQueue(uploadId)

    const next = last.then(() => {
        return new Promise((resolve, reject) => {
            // Safety timeout: if disk write takes > 20s, fail it so queue doesn't hang forever
            const timer = setTimeout(() => {
                reject(new Error("Disk write TIMEOUT (20s) - Queue Unlocked"));
            }, 20000);

            writeFn()
                .then(() => {
                    clearTimeout(timer);
                    resolve();
                })
                .catch(err => {
                    clearTimeout(timer);
                    reject(err);
                });
        });
    }).catch(err => {
        console.error(`[QUEUE ERROR] uploadId=${uploadId} | ${err.message}`);
        // We continue the chain so the NEXT chunk isn't blocked by one failure
        return Promise.resolve();
    });

    writeQueues.set(uploadId, next)
    return next
}

export const clearWriteQueue = (uploadId) => {
    writeQueues.delete(uploadId)
}


// ═══════════════════════════════════════════════════════════════════
//  UPLOAD RECORD CACHE — Avoids hitting MongoDB on every chunk
//  for the same file. TTL = 10 minutes.
// ═══════════════════════════════════════════════════════════════════
const uploadRecordCache = new Map()
const CACHE_TTL = 10 * 60 * 1000

const getCachedUpload = async (uploadId, owner) => {
    const cached = uploadRecordCache.get(uploadId)
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
        return cached.record
    }
    const record = await Upload.findOne({ uploadId, owner })
    if (record) {
        uploadRecordCache.set(uploadId, { record, cachedAt: Date.now() })
    }
    return record
}

export const clearUploadCache = (uploadId) => {
    uploadRecordCache.delete(uploadId)
}

setInterval(() => {
    const now = Date.now()
    for (const [uploadId, entry] of uploadRecordCache.entries()) {
        if (now - entry.cachedAt > CACHE_TTL) {
            uploadRecordCache.delete(uploadId)
        }
    }
}, 5 * 60 * 1000)


// ═══════════════════════════════════════════════════════════════════
//  MAIN MIDDLEWARE — Receives chunked uploads via Busboy,
//  writes to disk using the Global Semaphore + Per-File Queue,
//  then records chunk indexes in MongoDB
// ═══════════════════════════════════════════════════════════════════
export const streamChunkMiddleware = (req, res, next) => {
    const owner = req.user._id
    const fields = {}
    const writePromises = []

    // Track whether busboy fully received all data from the network
    let dataFullyReceived = false

    // Monitor for truly stuck requests (30s+)
    const hangTimer = setTimeout(() => {
        console.warn(`[STUCK WARNING] Request active for 30s+ | id: ...${fields.uploadId?.slice(-6)}`);
    }, 30000);

    // Only log disconnect if data was NOT fully received from the network
    // If data IS received but we're just slow writing to disk, that's fine — not a real disconnect
    req.on("close", () => {
        clearTimeout(hangTimer);
        if (!dataFullyReceived && !res.writableEnded) {
            console.warn(`[DISCONNECT] Client dropped before data was fully received | id: ...${fields.uploadId?.slice(-6)}`);
        }
    });

    const bb = busboy({
        headers: req.headers,
        limits: { fileSize: 10 * 1024 * 1024 }
    })

    bb.on("field", (name, value) => {
        fields[name] = value
    })

    bb.on("file", (fieldname, stream) => {
        // buffer the stream into memory first — chunk is max 7MB so fine
        const chunks = []
        stream.on("data", d => chunks.push(d))

        const promise = new Promise((resolve, reject) => {
            stream.on("end", async () => {
                try {
                    if (!fields.indexes || !fields.starts || !fields.uploadId) {
                        return resolve({ skipped: true })
                    }

                    const chunkIndex = parseInt(fieldname.split("_")[1])
                    const indexes = JSON.parse(fields.indexes)
                    const starts = JSON.parse(fields.starts)
                    const uploadId = fields.uploadId
                    const position = starts[indexes.indexOf(chunkIndex)]
                    const buffer = Buffer.concat(chunks)

                    const record = await getCachedUpload(uploadId, owner)

                    if (!record) {
                        return resolve({ skipped: true, chunkIndex })
                    }

                    const existing = await Chunk.findOne({ uploadId, chunkIndex })

                    if (existing) {
                        return resolve({ skipped: true, chunkIndex })
                    }

                    const stillExists = await Upload.exists({ uploadId, owner })
                    if (!stillExists) {
                        return resolve({ skipped: true, chunkIndex })
                    }

                    // STEP 1: Acquire a global write slot (prevents server overload)
                    await acquireWriteSlot()

                    try {
                        // STEP 2: Wait for per-file queue (prevents corruption on same file)
                        await queueWrite(uploadId, () => new Promise((res, rej) => {

                            const fd = getFd(uploadId, record.storagePath)

                            const writeStream = fs.createWriteStream(null, {
                                fd,
                                start: position,
                                autoClose: false
                            })

                            writeStream.write(buffer)
                            writeStream.end()

                            writeStream.on("finish", res)
                            writeStream.on("error", (err) => {
                                console.error(`[DISK ERROR] chunk=${chunkIndex} | uploadId=...${uploadId.slice(-6)} | ${err.message}`);
                                rej(err)
                            })
                        }))

                        resolve({ skipped: false, chunkIndex })
                    } finally {
                        // STEP 3: Always release the global slot, even if write failed
                        releaseWriteSlot()
                    }

                } catch (err) {
                    reject(err)
                }
            })

            stream.on("error", reject)
        })

        writePromises.push(promise)
    })

    bb.on("finish", async () => {
        // All data from the network has been received by busboy
        dataFullyReceived = true
        clearTimeout(hangTimer)

        try {
            const results = await Promise.allSettled(writePromises)

            const writtenIndexes = results
                .filter(r => r.status === "fulfilled" && !r.value?.skipped)
                .map(r => r.value.chunkIndex)

            // Log any chunk-level failures (disk errors, timeouts, etc.)
            const failures = results.filter(r => r.status === "rejected")
            if (failures.length > 0) {
                console.error(`[CHUNK FAILURES] ${failures.length} chunk(s) failed | id: ...${fields.uploadId?.slice(-6)}`);
            }

            if (writtenIndexes.length > 0) {
                const uploadId = fields.uploadId
                const docs = writtenIndexes.map(chunkIndex => ({ uploadId, chunkIndex }))
                try {
                    await Chunk.insertMany(docs, { ordered: false })
                } catch (err) {
                    if (err.code !== 11000 && err?.writeErrors?.some(e => e.code !== 11000)) {
                        console.error(`[DB ERROR] uploadId=...${uploadId.slice(-6)} | ${err.message}`);
                        throw err
                    }
                }
            }

            // Minimal batch log — only when chunks were actually written
            if (writtenIndexes.length > 0) {
                console.log(`[BATCH] Done: ${writtenIndexes.length} chunks | id: ...${fields.uploadId?.slice(-6)}`)
            }

            req.chunkResults = {
                received: writtenIndexes,
                uploadId: fields.uploadId
            }

            next()

        } catch (err) {
            console.error(`[BATCH ERROR] uploadId=...${fields.uploadId?.slice(-6)} | ${err.message}`);
            res.status(500).json({ success: false, message: err.message })
        }
    })

    bb.on("error", (err) => {
        clearTimeout(hangTimer)
        res.status(500).json({ success: false, message: err.message })
    })

    req.pipe(bb)
}








{
  "name": "backend",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "dev": "nodemon --ignore files/ --ignore debug_logs.txt --ignore temp/ --ignore zips/ src/index.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "archiver": "^7.0.1",
    "bcryptjs": "^3.0.3",
    "busboy": "^1.6.0",
    "clamscan": "^2.4.0",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.6",
    "dotenv": "^17.3.1",
    "express": "^5.2.1",
    "file-type": "^22.0.1",
    "jsonwebtoken": "^9.0.3",
    "mongoose": "^9.3.1",
    "multer": "^2.1.1",
    "node-cron": "^4.2.1",
    "nodemon": "^3.1.14",
    "paseto": "^3.1.4",
    "paseto-ts": "^2.0.6",
    "socket.io": "^4.8.3",
    "uuid": "^13.0.0"
  }
}






//  this file is for the creating zip file when user click on dwnload folder 
//  here we are using node child_preocess this will run seperatly it will not effect on our main server here
import dotenv from "dotenv"
dotenv.config()
import mongoose from "mongoose";
import fs from "fs"
import path from "path"
import Upload from "../models/uploadModel.js";
import archiver from "archiver";


//  child preocess needs it's own mongo db connection
mongoose.connect(process.env.MONGODB_URL)
    .then(() => {
        console.log("[ZIP WORKER] MongoDB connected")

        //  here we are receving the folder id and zip path 
        process.on("message", async ({ folderId, zipPath }) => {
            try {
                //  write stream zip will be created to path of disk here
                const output = fs.createWriteStream(zipPath)

                //  creting zip wih level 0
                const archive = archiver("zip", { zlib: { level: 0 } })

                // if archiver has any warnings log them
                archive.on("warning", (err) => {
                    console.warn("[ZIP WORKER] Warning:", err.message)
                })

                // if archiver has any errors tell parent
                archive.on("error", (err) => {
                    process.send({ type: "error", error: err.message })
                    process.exit(1)
                })


                //  pipe archive output to file on the disk 
                archive.pipe(output)

                // add all files from folder to archive using fast bulk query
                await addToArchive(archive, folderId)

                // thi will stat actual writing on disk
                archive.finalize()



                //  when output stream finishing writing completly
                output.on("close", () => {
                    const fileSize = archive.pointer()   // total bytes written
                    console.log(`[ZIP WORKER] Done - ${fileSize} bytes`)

                    // tell parent zip is ready with file size
                    process.send({ type: "done", fileSize })

                    // close db connection and exit cleanly
                    mongoose.connection.close()
                    process.exit(0)
                })

                // handle output stream errors
                output.on("error", (err) => {
                    process.send({ type: "error", error: err.message })
                    mongoose.connection.close()
                    process.exit(1)
                })

            } catch (error) {
                process.send({ type: "error", error: error.message })
                mongoose.connection.close()
                process.exit(1)
            }
        })
    })
    .catch((err) => {
        console.error("[ZIP WORKER] MongoDB connection failed:", err.message)
        process.exit(1)
    })



//  OPTIMIZED: Fetch ALL descendants in bulk (level by level) instead of
//  one query per folder. This turns 60+ queries into 3-5 queries.
//
//  Old way:  folder1 → query, folder2 → query, folder3 → query... (N queries)
//  New way:  level1 → one query, level2 → one query, level3 → one query (3-5 queries)
const addToArchive = async (archive, rootFolderId) => {

    // STEP 1: Fetch ALL items level by level (BFS)
    let parentIds = [new mongoose.Types.ObjectId(rootFolderId)]
    const allItems = []

    while (parentIds.length > 0) {
        const children = await Upload.find({
            parent: { $in: parentIds },
            $or: [
                { type: "folder" },
                { type: "file", uploadStatus: "completed" }
            ]
        }).select("name type parent storagePath").lean()

        allItems.push(...children)

        // next level: only look inside folders
        parentIds = children
            .filter(c => c.type === "folder")
            .map(c => c._id)
    }

    console.log(`[ZIP WORKER] Found ${allItems.length} items to archive`)

    // STEP 2: Build folder path map (id → full path like "photos/vacation/day1")
    const pathMap = new Map()
    pathMap.set(rootFolderId.toString(), "")

    // folders are already in level order (level 1 first, then level 2, etc.)
    // so parent path is always available when we process a child
    const folders = allItems.filter(i => i.type === "folder")
    for (const folder of folders) {
        const parentPath = pathMap.get(folder.parent.toString()) || ""
        pathMap.set(folder._id.toString(), path.join(parentPath, folder.name))
    }

    // STEP 3: Add all files to archive
    const files = allItems.filter(i => i.type === "file")
    for (const file of files) {
        if (fs.existsSync(file.storagePath)) {
            const parentPath = pathMap.get(file.parent.toString()) || ""
            archive.file(file.storagePath, {
                name: path.join(parentPath, file.name)
            })
        }
    }
}






