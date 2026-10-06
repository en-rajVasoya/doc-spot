import dotenv from "dotenv"
import path from "path"
import https from "https"
import http from "http"
import mongoose from "mongoose"
import User from "#models/userModel"
import { generateToken } from "#utils/generateLoginToken"

import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, "../.env") })
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

const MONGODB_URL = process.env.MONGODB_URL || process.env.MONGODB_URI || "mongodb://localhost:27017/dataSpot"
const BASE_URL = process.env.BASE_URL || "https://localhost:4001"
const urlObj = new URL(BASE_URL)
const isHttps = urlObj.protocol === "https:"
const httpModule = isHttps ? https : http

// ============================================================
// TEST CONFIGURATION
// ============================================================
// Pass arguments from CLI: node scripts/stress-test-upload.js [users] [sizeMB]
const NUM_USERS = parseInt(process.argv[2] || "10", 10)           // Default: 10 concurrent users
const FILE_SIZE_MB = parseInt(process.argv[3] || "100", 10)       // Default: 100MB per user
const CHUNK_SIZE = 10 * 1024 * 1024                               // 10MB chunk (matches real frontend)
const CHUNK_BATCH_SIZE = 3                                        // 3 chunks per batch (matches real frontend)

const FILE_SIZE = FILE_SIZE_MB * 1024 * 1024
const TOTAL_CHUNKS = Math.ceil(FILE_SIZE / CHUNK_SIZE)

// Single shared raw Buffer template — ZERO BLOBS USED!
const sharedChunkBuffer = Buffer.alloc(CHUNK_SIZE, "A")

const stats = {
    started: 0,
    success: 0,
    failed: 0,
    timeouts: 0,
    retries: 0,
    errors: []
}

/**
 * Send chunk batch via native socket stream using raw Buffers (NO BLOBS)
 */
function sendMultipartBatch(uploadId, batchIndexes, starts, token) {
    return new Promise((resolve, reject) => {
        const boundary = "----DocSpotBoundary" + Date.now() + Math.random().toString(36).substring(2)

        // Pre-calculate multipart parts and exact byte length
        const parts = []
        let totalLength = 0

        for (const j of batchIndexes) {
            const currentBytes = (j === TOTAL_CHUNKS - 1)
                ? FILE_SIZE - (j * CHUNK_SIZE)
                : CHUNK_SIZE
            const head = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="chunk_${j}"; filename="chunk.bin"\r\nContent-Type: application/octet-stream\r\n\r\n`)
            const tail = Buffer.from("\r\n")
            parts.push({ head, currentBytes, tail })
            totalLength += head.length + currentBytes + tail.length
        }

        const closing = Buffer.from(`--${boundary}--\r\n`)
        totalLength += closing.length

        const req = httpModule.request({
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: "/api/upload/upload-chunk",
            method: "POST",
            rejectUnauthorized: false,
            timeout: 120000,
            headers: {
                "Content-Type": `multipart/form-data; boundary=${boundary}`,
                "Content-Length": totalLength,
                "Cookie": `doc_auth_token=${token}`,
                "x-upload-id": uploadId,
                "x-indexes": JSON.stringify(batchIndexes),
                "x-starts": JSON.stringify(starts)
            }
        }, (res) => {
            let data = ""
            res.on("data", chunk => data += chunk)
            res.on("end", () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(JSON.parse(data)) } catch (e) { resolve(data) }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`))
                }
            })
        })

        req.on("timeout", () => {
            req.destroy(new Error("Timeout: upload socket hung up"))
        })

        req.on("error", reject)

        // Stream raw Buffers straight to the network socket (Zero Blobs, Zero Extra RAM)
        for (const part of parts) {
            req.write(part.head)
            req.write(sharedChunkBuffer.subarray(0, part.currentBytes))
            req.write(part.tail)
        }
        req.write(closing)
        req.end()
    })
}

/**
 * Simulates one user uploading a file in batches of 3 chunks
 */
async function uploadOneUser(userIndex, token) {
    const stagger = Math.floor(Math.random() * 2000)
    await new Promise(r => setTimeout(r, stagger))

    stats.started++
    const startTime = Date.now()
    const fileName = `stress_u${userIndex}_${Date.now()}.bin`
    console.log(`[USER ${userIndex}] Started upload: ${fileName} (${FILE_SIZE_MB}MB)`)

    try {
        // 1. INIT UPLOAD SESSION
        const initRes = await fetch(`${BASE_URL}/api/upload/init`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Cookie": `doc_auth_token=${token}`
            },
            body: JSON.stringify({
                fileName,
                fileSize: FILE_SIZE,
                fileType: "application/octet-stream",
                totalChunks: TOTAL_CHUNKS,
                fingerprint: `fp_u${userIndex}_${Date.now()}`,
                fileHeader: Buffer.alloc(4100).toString("base64")
            })
        })
        const initData = await initRes.json()
        if (!initData.uploadId) {
            throw new Error(`Init failed: ${JSON.stringify(initData)}`)
        }
        const uploadId = initData.uploadId

        // 2. UPLOAD CHUNKS IN BATCHES OF 3 (NO BLOBS)
        for (let i = 0; i < TOTAL_CHUNKS; i += CHUNK_BATCH_SIZE) {
            const batchIndexes = []
            for (let j = i; j < Math.min(i + CHUNK_BATCH_SIZE, TOTAL_CHUNKS); j++) {
                batchIndexes.push(j)
            }
            const starts = batchIndexes.map(idx => idx * CHUNK_SIZE)

            let retries = 0
            const MAX_RETRIES = 3

            while (true) {
                try {
                    await sendMultipartBatch(uploadId, batchIndexes, starts, token)
                    break // Batch succeeded
                } catch (err) {
                    const errMsg = err.message || err.code || "Socket Hangup / Timeout"
                    if (errMsg.includes("Timeout")) {
                        stats.timeouts++
                        console.warn(`[USER ${userIndex}] TIMEOUT on chunks [${batchIndexes}]`)
                    }
                    retries++
                    stats.retries++
                    if (retries > MAX_RETRIES) {
                        throw new Error(`Batch [${batchIndexes}] failed after ${MAX_RETRIES} retries: ${errMsg}`)
                    }
                    console.warn(`[USER ${userIndex}] Retrying chunks [${batchIndexes}] (attempt ${retries}/${MAX_RETRIES})... Error: ${errMsg}`)
                    await new Promise(r => setTimeout(r, 2000 * retries))
                }
            }

            // Small 200ms pause between batches to simulate network latency and let disk flush
            await new Promise(r => setTimeout(r, 200))
        }

        // 3. COMPLETE UPLOAD
        const compRes = await fetch(`${BASE_URL}/api/upload/complete`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Cookie": `auth_token=${token}`
            },
            body: JSON.stringify({ uploadId })
        })
        const compJson = await compRes.json()
        if (!compJson.success) {
            throw new Error(`Complete failed: ${JSON.stringify(compJson)}`)
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
        const speed = (FILE_SIZE_MB / elapsed).toFixed(2)
        console.log(`[USER ${userIndex}] SUCCESS in ${elapsed}s (${speed} MB/s)`)
        stats.success++

    } catch (err) {
        console.error(`[USER ${userIndex}] FAILED: ${err.message}`)
        stats.failed++
        stats.errors.push({ user: userIndex, error: err.message })
    }
}

/**
 * Main Concurrency Runner
 */
async function runConcurrencyTest() {
    console.log("\n============================================================")
    console.log(" DOCSPOT BACKEND CONCURRENCY & STRESS TEST (ZERO-BLOB)")
    console.log("============================================================")
    console.log(` Target Server:       ${BASE_URL}`)
    console.log(` Concurrent Users:    ${NUM_USERS}`)
    console.log(` File Size per User:  ${FILE_SIZE_MB} MB (${TOTAL_CHUNKS} chunks x 10MB)`)
    console.log(` Total Upload Volume: ${((NUM_USERS * FILE_SIZE_MB) / 1024).toFixed(2)} GB`)
    console.log(` Batching:            ${CHUNK_BATCH_SIZE} chunks per HTTP request`)
    console.log(` Mode:                Native raw Buffer streaming (ZERO BLOBS)`)
    console.log("============================================================\n")

    // Get auth token from MongoDB
    console.log("[DB] Connecting to MongoDB to get test session...")
    await mongoose.connect(MONGODB_URL)
    const user = await User.findOne({ is_active: true, is_deleted: { $ne: true } })
    if (!user) {
        console.error("Error: No active user found in MongoDB.")
        process.exit(1)
    }
    const token = await generateToken(user._id, 3600000)
    console.log(`[AUTH] Session ready for user: ${user.email}`)

    // Launch all users simultaneously!
    console.log(`\n[TEST] Firing ${NUM_USERS} concurrent upload sessions...\n`)
    const testStart = Date.now()

    const promises = []
    for (let i = 1; i <= NUM_USERS; i++) {
        promises.push(uploadOneUser(i, token))
    }
    await Promise.all(promises)

    const totalSeconds = ((Date.now() - testStart) / 1000).toFixed(1)
    const totalGB = ((stats.success * FILE_SIZE_MB) / 1024).toFixed(2)
    const overallThroughput = ((stats.success * FILE_SIZE_MB) / totalSeconds).toFixed(2)

    console.log("\n============================================================")
    console.log(" CONCURRENCY TEST RESULTS")
    console.log("============================================================")
    console.log(` Total Duration:      ${totalSeconds}s`)
    console.log(` Successful Uploads:  ${stats.success}/${NUM_USERS}`)
    console.log(` Failed Uploads:      ${stats.failed}/${NUM_USERS}`)
    console.log(` Total Transferred:   ${totalGB} GB`)
    console.log(` Average Throughput:  ${overallThroughput} MB/s`)
    console.log(` Timeouts Hit:        ${stats.timeouts}`)
    console.log(` Retries Performed:   ${stats.retries}`)

    if (stats.errors.length > 0) {
        console.log("\n Failure Breakdown:")
        stats.errors.forEach(e => console.log(`   - User ${e.user}: ${e.error}`))
    }
    console.log("============================================================\n")

    await mongoose.disconnect()
}

runConcurrencyTest().catch((err) => {
    console.error("\n[CRITICAL ERROR]", err)
})
