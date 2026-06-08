import { execFile } from "child_process"
import { promisify } from "util"
import fs from "fs"
import Upload from "../models/uploadModel.js"
import { emitToUser } from "../socket.js"

const execFileAsync = promisify(execFile)

const CLAMDSCAN_PATH = process.env.CLAMDSCAN_PATH || "C:\\Program Files\\ClamAV\\clamdscan.exe"

export const scanFileWithClamAV = async (fileId, filePath, fileSize, ownerId) => {
    const startTime = Date.now()

    try {
        console.log(`\n--------------------------------------------------`)
        console.log(`[CLAMAV WORKER] Starting scan for: ${fileId}`)
        console.log(`[CLAMAV WORKER] Path: ${filePath}`)
        console.log(`[CLAMAV WORKER] Size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`)

        if (!fs.existsSync(filePath)) {
            throw new Error("File not found on disk")
        }

        await Upload.findByIdAndUpdate(fileId, { scanStatus: "scanning" })

        console.log(`[CLAMAV WORKER] Communicating with clamd daemon...`)

        let isInfected = false
        let virusName = null

        try {
            const { stdout } = await execFileAsync(CLAMDSCAN_PATH, [filePath], {
                timeout: 10 * 60 * 1000
            })
            console.log(`[CLAMAV WORKER] Raw output: ${stdout.trim()}`)

        } catch (err) {
            if (err.code === 1) {
                isInfected = true
                const match = err.stdout?.match(/: (.+) FOUND/)
                virusName = match ? match[1] : "Unknown"
            } else {
                throw new Error(err.stderr || "clamdscan failed")
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2)

        if (isInfected) {
            console.log(`[CLAMAV WORKER] !!! VIRUS DETECTED !!!`)
            console.log(`[CLAMAV WORKER] Signature: ${virusName}`)
            console.log(`[CLAMAV WORKER] Time taken: ${duration}s`)

            if (fs.existsSync(filePath)) {
                try {
                    await fs.promises.unlink(filePath)
                    console.log(`[CLAMAV WORKER] Infected file successfully purged from disk.`)
                } catch (e) {
                    console.error(`[CLAMAV WORKER] Cleanup error:`, e.message)
                }
            }

            await Upload.findByIdAndDelete(fileId)
            console.log(`[CLAMAV WORKER] Database record removed.`)

            emitToUser(ownerId, "scan_complete", {
                fileId,
                status: "infected",
                message: `Security Alert: Virus detected (${virusName}). File has been permanently deleted.`
            })

        } else {
            console.log(`[CLAMAV WORKER] File is CLEAN`)
            console.log(`[CLAMAV WORKER] Time taken: ${duration}s`)

            await Upload.findByIdAndUpdate(fileId, {
                scanStatus: "clean",
                virusInfo: null
            })

            emitToUser(ownerId, "scan_complete", {
                fileId,
                status: "clean"
            })
        }

    } catch (error) {
        console.error(`[CLAMAV WORKER] Critical Error:`, error.message)

        await Upload.findByIdAndUpdate(fileId, {
            scanStatus: "failed"
        })

        emitToUser(ownerId, "scan_complete", {
            fileId,
            status: "failed",
            message: "Scan failed - " + error.message
        })
    } finally {
        console.log(`--------------------------------------------------\n`)
    }
}