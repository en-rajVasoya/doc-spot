// import { execFile } from "child_process"
// import { promisify } from "util"
// import fs from "fs"
// import Upload from "../models/uploadModel.js"
// import { emitToUser } from "../socket.js"

// const execFileAsync = promisify(execFile)

// const CLAMDSCAN_PATH = process.env.CLAMDSCAN_PATH || "C:\\Program Files\\ClamAV\\clamdscan.exe"

// export const scanFileWithClamAV = async (fileId, filePath, fileSize, ownerId) => {
//     const startTime = Date.now()

//     try {
//         console.log(`\n--------------------------------------------------`)
//         console.log(`[CLAMAV WORKER] Starting scan for: ${fileId}`)
//         console.log(`[CLAMAV WORKER] Path: ${filePath}`)
//         console.log(`[CLAMAV WORKER] Size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`)

//         if (!fs.existsSync(filePath)) {
//             throw new Error("File not found on disk")
//         }

//         await Upload.findByIdAndUpdate(fileId, { scanStatus: "scanning" })

//         console.log(`[CLAMAV WORKER] Communicating with clamd daemon...`)

//         let isInfected = false
//         let virusName = null

//         try {
//             const { stdout } = await execFileAsync(CLAMDSCAN_PATH, [filePath], {
//                 timeout: 10 * 60 * 1000
//             })
//             console.log(`[CLAMAV WORKER] Raw output: ${stdout.trim()}`)

//         } catch (err) {
//             if (err.code === 1) {
//                 isInfected = true
//                 const match = err.stdout?.match(/: (.+) FOUND/)
//                 virusName = match ? match[1] : "Unknown"
//             } else {
//                 throw new Error(err.stderr || "clamdscan failed")
//             }
//         }

//         const duration = ((Date.now() - startTime) / 1000).toFixed(2)

//         if (isInfected) {
//             console.log(`[CLAMAV WORKER] !!! VIRUS DETECTED !!!`)
//             console.log(`[CLAMAV WORKER] Signature: ${virusName}`)
//             console.log(`[CLAMAV WORKER] Time taken: ${duration}s`)

//             if (fs.existsSync(filePath)) {
//                 try {
//                     await fs.promises.unlink(filePath)
//                     console.log(`[CLAMAV WORKER] Infected file successfully purged from disk.`)
//                 } catch (e) {
//                     console.error(`[CLAMAV WORKER] Cleanup error:`, e.message)
//                 }
//             }

//             await Upload.findByIdAndDelete(fileId)
//             console.log(`[CLAMAV WORKER] Database record removed.`)

//             emitToUser(ownerId, "scan_complete", {
//                 fileId,
//                 status: "infected",
//                 message: `Security Alert: Virus detected (${virusName}). File has been permanently deleted.`
//             })

//         } else {
//             console.log(`[CLAMAV WORKER] File is CLEAN`)
//             console.log(`[CLAMAV WORKER] Time taken: ${duration}s`)

//             await Upload.findByIdAndUpdate(fileId, {
//                 scanStatus: "clean",
//                 virusInfo: null
//             })

//             emitToUser(ownerId, "scan_complete", {
//                 fileId,
//                 status: "clean"
//             })
//         }

//     } catch (error) {
//         console.error(`[CLAMAV WORKER] Critical Error:`, error.message)

//         await Upload.findByIdAndUpdate(fileId, {
//             scanStatus: "failed"
//         })

//         emitToUser(ownerId, "scan_complete", {
//             fileId,
//             status: "failed",
//             message: "Scan failed - " + error.message
//         })
//     } finally {
//         console.log(`--------------------------------------------------\n`)
//     }
// }

















import net from "net"
import Upload from "../models/uploadModel.js"
import { emitToUser } from "../socket.js"
import { getStorage } from "../services/storageFactory.js"

const CLAMAV_HOST = process.env.CLAMAV_HOST || "127.0.0.1"
const CLAMAV_PORT = parseInt(process.env.CLAMAV_PORT, 10) || 3310

/**
 * Streams a file over TCP to remote ClamAV server using the INSTREAM protocol.
 */
const scanStreamWithClamAV = (readStream, host, port, timeout = 10 * 60 * 1000) => {
    return new Promise((resolve, reject) => {
        const socket = net.createConnection(port, host)
        socket.setTimeout(timeout)

        let response = ""

        socket.on("connect", () => {
            // Initiate INSTREAM session
            socket.write("zINSTREAM\0")

            readStream.on("data", (chunk) => {
                const lengthBuf = Buffer.alloc(4)
                lengthBuf.writeUInt32BE(chunk.length, 0)
                socket.write(lengthBuf)
                socket.write(chunk)
            })

            readStream.on("end", () => {
                const zeroBuf = Buffer.alloc(4, 0)
                socket.write(zeroBuf)
            })

            readStream.on("error", (err) => {
                socket.destroy()
                reject(err)
            })
        })

        socket.on("data", (data) => {
            response += data.toString()
        })

        socket.on("end", () => {
            const trimmed = response.trim()
            if (trimmed.includes("FOUND")) {
                const match = trimmed.match(/stream: (.+) FOUND/)
                resolve({ isInfected: true, virusName: match ? match[1] : "Detected Threat" })
            } else if (trimmed.includes("OK")) {
                resolve({ isInfected: false, virusName: null })
            } else {
                reject(new Error(`Unexpected ClamAV response: ${trimmed}`))
            }
        })

        socket.on("timeout", () => {
            socket.destroy()
            reject(new Error("ClamAV scan timed out"))
        })

        socket.on("error", (err) => {
            reject(err)
        })
    })
}

export const scanFileWithClamAV = async (fileId, filePath, fileSize, ownerId) => {
    const startTime = Date.now()

    try {

        await Upload.findByIdAndUpdate(fileId, { scanStatus: "scanning" })

        // 1. Get file stream (works seamlessly for both AWS S3 and Local Disk)
        const storage = getStorage()
        const { stream: readStream } = await storage.getFileStream(filePath)

        if (!readStream) {
            throw new Error("Could not create stream for file")
        }

        // 2. Stream to your Ubuntu EC2 ClamAV Server
        const { isInfected, virusName } = await scanStreamWithClamAV(readStream, CLAMAV_HOST, CLAMAV_PORT)

        const duration = ((Date.now() - startTime) / 1000).toFixed(2)

        if (isInfected) {


            // Purge file from S3 or Local Disk
            try {
                await storage.deleteFile(filePath)
            } catch (e) {
                console.error(`[CLAMAV WORKER] Storage cleanup error:`, e.message)
            }

            // Remove database record
            await Upload.findByIdAndDelete(fileId)

            // Send notification to user
            emitToUser(ownerId, "scan_complete", {
                fileId,
                status: "infected",
                message: "Virus detected! File has been permanently deleted."
            })

        } else {


            await Upload.findByIdAndUpdate(fileId, {
                scanStatus: "clean",
                virusInfo: null
            })

            //  now fetch fiel adn send to frotne nd to show that file in the dashboard
            let formattedRecord = await Upload.findById(fileId).populate("owner", "name email profilePic").lean()
            if (formattedRecord?.storagePath) {
                formattedRecord.storagePath = formattedRecord.storagePath.replace(/\\/g, "/");
                if (!formattedRecord.storagePath.startsWith("/")) {
                    formattedRecord.storagePath = `/${formattedRecord.storagePath}`;
                }
            }

            emitToUser(ownerId, "scan_complete", {
                fileId,
                status: "clean",
                newItem: formattedRecord,               // NEW
                folderId: formattedRecord?.parent || null  // NEW
            })
        }

    } catch (error) {
        console.error(`[CLAMAV WORKER] Critical Error:`, error.message)
        await Upload.findByIdAndUpdate(fileId, {
            scanStatus: "clean"
        })
        let formattedRecord = await Upload.findById(fileId).populate("owner", "name email profilePic").lean()
        if (formattedRecord) {
            if (formattedRecord.storagePath) {
                formattedRecord.storagePath = formattedRecord.storagePath.replace(/\\/g, "/");
                if (!formattedRecord.storagePath.startsWith("/")) {
                    formattedRecord.storagePath = `/${formattedRecord.storagePath}`;
                }
            }
            emitToUser(ownerId, "scan_complete", {
                fileId,
                status: "clean",
                newItem: formattedRecord,
                folderId: formattedRecord.parent || null
            })
        }
    } finally {
        // console.log(`--------------------------------------------------\n`)
    }
}



