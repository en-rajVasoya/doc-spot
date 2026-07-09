import archiver from "archiver"
import { getStorage } from "../services/storageFactory.js"

const storage = getStorage()

process.on("message", async ({ fileList, zipKey }) => {
    const startMs = Date.now()

    try {
        // This creates a ZIP maker in our computer's memory.
        // level: 0 means "Do not compress the files, just bundle them together".
        // This makes the zipping process lightning fast (0 seconds of CPU math).
        const archive = archiver("zip", { zlib: { level: 0 } })

        // This creates the empty "pipe" connecting to AWS S3 (from s3Storage.js)
        const destination = storage.createZipDestination(zipKey)

        // We connect the ZIP maker directly to the AWS pipe.
        // As soon as bytes are zipped, they instantly fall into the pipe and upload to S3!
        archive.pipe(destination.writeStream)

        // total bytes for progress % — sum of known source file sizes
        const totalBytes = fileList.reduce((sum, f) => sum + (f.fileSize || 0), 0)
        let processedBytes = 0

        // wire up progress reporting (real events on S3, no-op on local)
        destination.onProgress((progress) => {
            const percent = totalBytes ? Math.min(100, Math.round((progress.loaded / totalBytes) * 100)) : 0
            process.send({
                type: "progress",
                percent,
                processedBytes: progress.loaded || 0,
                totalBytes
            })
        })

        // NEW — log every time archiver actually finishes reading + zipping an entry
        archive.on("entry", (entryData) => {
            console.log(`[ZIP WORKER] archiver FINISHED entry: ${entryData.name}`)
        })

        archive.on("warning", (err) => {
            console.warn("[ZIP WORKER] archive warning:", err.message)
        })

        archive.on("error", (err) => {
            console.error("[ZIP WORKER] archive ERROR:", err.message)
        })

        process.send({ type: "started", fileCount: fileList.length })

        // append each file ONE AT A TIME — never Promise.all this loop,
        // or you'll hold many concurrent S3 read streams in memory at once
        for (const file of fileList) {
            console.log(`[ZIP WORKER] 1. Requesting stream for: ${file.archiveName}...`)

            // 1. Download the raw bytes of this single file from S3
            const { stream } = await storage.getFileStream(file.storageKey)

            // NEW — instrument the raw source stream itself
            stream.on("error", (err) => {
                console.error(`[ZIP WORKER] STREAM ERROR on ${file.archiveName}:`, err.message)
            })
            stream.on("end", () => {
                console.log(`[ZIP WORKER] stream ENDED (all bytes read) for: ${file.archiveName}`)
            })
            stream.on("close", () => {
                console.log(`[ZIP WORKER] stream CLOSED for: ${file.archiveName}`)
            })

            console.log(`[ZIP WORKER] 2. Stream received for: ${file.archiveName}, appending to archive...`)
            archive.append(stream, { name: file.archiveName })
            console.log(`[ZIP WORKER] 3. archive.append() called (queued) for: ${file.archiveName}`)

            processedBytes += file.fileSize || 0
        }

        console.log(`[ZIP WORKER] All files added to queue! Calling archive.finalize()...`)
        await archive.finalize()
        console.log(`[ZIP WORKER] archive.finalize() resolved. Finalizing destination...`)

        const result = await destination.finalize()
        console.log(`[ZIP WORKER] destination.finalize() resolved.`)

        process.send({
            type: "done",
            fileSize: archive.pointer(),
            fileCount: fileList.length,
            elapsedMs: Date.now() - startMs
        })

    } catch (error) {
        console.error(`[ZIP WORKER] CAUGHT ERROR:`, error)
        process.send({ type: "error", error: error.message })
    }

    process.exit(0)
})