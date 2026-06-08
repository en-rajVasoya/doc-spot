import fs from "fs"
import Upload from "../models/uploadModel.js"
import { emitToUser } from "../socket.js"

import {
    calculateHash,
    checkHashVirusTotal,
    uploadFileVirusTotal,
    getLargeFileUploadUrl,
    uploadLargeFileVirusTotal,
    pollAnalysisResult
} from "./virusTotalScanner.js"

const SMALL_FILE_LIMIT = 32 * 1024 * 1024   // 32MB
const LARGE_FILE_LIMIT = 650 * 1024 * 1024  // 650MB


export const scanFileWithVirusTotal = async (fileId,filePath,fileSize,ownerId) => {
    try {

        console.log(`\n--------------------------------------------------`)
        console.log(`[VT WORKER] Starting scan for: ${fileId}`)
        console.log(`[VT WORKER] Path: ${filePath}`)

        // file missing
        if (!fs.existsSync(filePath)) {
            throw new Error("File not found on disk")
        }

        // update db status
        await Upload.findByIdAndUpdate(fileId, {
            scanStatus: "scanning"
        })

        // calculate hash
        console.log(`[VT WORKER] Calculating SHA-256 hash...`)

        const hash = await calculateHash(filePath)

        console.log(`[VT WORKER] Hash: ${hash}`)

        // save hash
        await Upload.findByIdAndUpdate(fileId, {
            sha256: hash
        })

        // reuse existing scan result from mongodb
        const existingScan = await Upload.findOne({
            sha256: hash,
            scanStatus: { $in: ["clean", "infected"] },
            _id: { $ne: fileId }
        })

        if (existingScan) {

            console.log(`[VT WORKER] Reusing existing scan result`)

            await Upload.findByIdAndUpdate(fileId, {
                scanStatus: existingScan.scanStatus,
                virusInfo: existingScan.virusInfo || null
            })

            emitToUser(ownerId, "scan_complete", {
                fileId,
                status: existingScan.scanStatus
            })

            return
        }

        // check hash in VirusTotal
        console.log(`[VT WORKER] 
            
            ...`)

        const hashResult = await checkHashVirusTotal(hash)

        // hash already exists in VT
        if (hashResult.found) {

            console.log(`[VT WORKER] Hash found in VirusTotal database`)

            await handleScanResult(
                fileId,
                filePath,
                ownerId,
                hashResult
            )

            return
        }

        // upload file
        console.log(`[VT WORKER] Hash not found — uploading file to VirusTotal...`)

        // too large
        if (fileSize > LARGE_FILE_LIMIT) {

            console.log(`[VT WORKER] File too large for VirusTotal: ${fileSize} bytes`)

            await Upload.findByIdAndUpdate(fileId, {
                scanStatus: "failed",
                virusInfo: "File too large for VirusTotal scan (max 650MB)"
            })

            emitToUser(ownerId, "scan_complete", {
                fileId,
                status: "failed",
                message: "File too large to scan (max 650MB)"
            })

            return
        }

        let analysisId

        // small file
        if (fileSize <= SMALL_FILE_LIMIT) {

            console.log(`[VT WORKER] Small file — uploading directly...`)

            analysisId = await uploadFileVirusTotal(filePath)

        } else {

            // large file
            console.log(`[VT WORKER] Large file — getting upload URL first...`)

            const uploadUrl = await getLargeFileUploadUrl()

            analysisId = await uploadLargeFileVirusTotal(
                filePath,
                uploadUrl
            )
        }

        if (!analysisId) {
            throw new Error("No analysis ID returned from VirusTotal")
        }

        // poll result
        console.log(`[VT WORKER] Polling for result — analysis ID: ${analysisId}`)

        const scanResult = await pollAnalysisResult(analysisId)

        // handle result
        await handleScanResult(
            fileId,
            filePath,
            ownerId,
            scanResult
        )

    } catch (error) {

        console.error(`[VT WORKER] Error:`, error.message)

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



// helper function
const handleScanResult = async (fileId,filePath,ownerId,result) => {

    // clean
    if (result.clean) {

        console.log(`[VT WORKER] File is CLEAN`)

        await Upload.findByIdAndUpdate(fileId, {
            scanStatus: "clean",
            virusInfo: null
        })

        emitToUser(ownerId, "scan_complete", {
            fileId,
            status: "clean"
        })

        return
    }

    // infected
    console.log(`[VT WORKER] VIRUS DETECTED: ${result.virusName}`)

    // delete infected file
    if (fs.existsSync(filePath)) {

        try {

            await fs.promises.unlink(filePath)

            console.log(`[VT WORKER] Infected file deleted from disk`)

        } catch (error) {

            console.error(
                `[VT WORKER] Failed to delete infected file:`,
                error.message
            )
        }
    }



    // delete the record after file is infected
    await Upload.findByIdAndDelete(fileId)

    emitToUser(ownerId, "scan_complete", {
        fileId,
        status: "infected",
        message:
            `Security Alert: Virus detected (${result.virusName}). File has been permanently deleted.`
    })
}