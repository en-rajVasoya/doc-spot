import path from "path"
import archiver from "archiver"
import { getStorage } from "../services/storageFactory.js"
import { getAbsolutePath } from "../utils/pathHelper.js"

const storage = getStorage()
const isLocal = process.env.STORAGE_PROVIDER !== "s3"

process.on("message", async ({ fileList, zipKey }) => {
    const startMs = Date.now()

    try {
        // This creates a ZIP maker in our computer's memory.
        // level: 0 means "Do not compress the files, just bundle them together".
        // This makes the zipping process lightning fast (0 seconds of CPU math).
        const archive = archiver("zip", { zlib: { level: 0 } })

        // This creates the empty "pipe" connecting to the destination (local file or S3)
        const destination = storage.createZipDestination(zipKey)

        // We connect the ZIP maker directly to the destination pipe.
        // As soon as bytes are zipped, they instantly fall into the pipe!
        archive.pipe(destination.writeStream)

        // total bytes for progress % — sum of known source file sizes
        const totalBytes = fileList.reduce((sum, f) => sum + (f.fileSize || 0), 0)

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

        archive.on("warning", (err) => {
            console.warn("[ZIP WORKER] archive warning:", err.message)
        })

        // Fixed: error handler now notifies the parent process so the
        // frontend gets a proper failure instead of hanging forever.
        archive.on("error", (err) => {
            console.error("[ZIP WORKER] archive ERROR:", err.message)
            process.send({ type: "error", error: err.message })
            process.exit(1)
        })

        process.send({ type: "started", fileCount: fileList.length })

        if (isLocal) {
            // LOCAL DISK: use archive.file() — archiver reads files directly
            // from disk internally, much faster than manually opening thousands
            // of ReadStreams one at a time through getFileStream().
            for (const file of fileList) {
                const absPath = getAbsolutePath(file.storageKey)
                archive.file(absPath, { name: file.archiveName })
            }
        } else {
            // S3 (or any other provider): stream each file through storage layer.
            // append each file ONE AT A TIME — never Promise.all this loop,
            // or you'll hold many concurrent S3 read streams in memory at once.
            for (const file of fileList) {
                // Download the raw bytes of this single file from S3
                const { stream } = await storage.getFileStream(file.storageKey)

                stream.on("error", (err) => {
                    console.error(`[ZIP WORKER] STREAM ERROR on ${file.archiveName}:`, err.message)
                })

                archive.append(stream, { name: file.archiveName })
            }
        }

        await archive.finalize()
        await destination.finalize()

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