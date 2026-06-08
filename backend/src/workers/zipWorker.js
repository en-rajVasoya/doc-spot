import fs from "fs"
import path from "path"
import archiver from "archiver"

// no MongoDB, no dotenv, no mongoose — pure disk work only
process.on("message", async ({ fileList, zipPath }) => {
    try {
        const startedAt = Date.now()
        const output = fs.createWriteStream(zipPath)
        const archive = archiver("zip", { zlib: { level: 0 } })
        process.send({ type: "started", fileCount: fileList.length })

        archive.on("progress", (progress) => {
            if (progress.fs.totalBytes > 0) {
                const percent = Math.round((progress.fs.processedBytes / progress.fs.totalBytes) * 100)
                process.send({
                    type: "progress",
                    percent,
                    processedBytes: progress.fs.processedBytes,
                    totalBytes: progress.fs.totalBytes
                })
            }
        })
        archive.on("warning", (err) => {
            console.warn("[ZIP WORKER] Warning:", err.message)
        })

        archive.on("error", (err) => {
            process.send({ type: "error", error: err.message })
            process.exit(1)
        })

        archive.pipe(output)

        // file list already built in main process - just add to archive
        for (const file of fileList) {
            archive.file(file.storagePath, { name: file.archiveName })
        }

        archive.finalize()

        output.on("close", () => {
            const fileSize = archive.pointer()
            console.log(`[ZIP WORKER] Done - ${fileSize} bytes`)
            process.send({
                type: "done",
                fileSize,
                fileCount: fileList.length,
                elapsedMs: Date.now() - startedAt
            })
            process.exit(0)
        })

        output.on("error", (err) => {
            process.send({ type: "error", error: err.message })
            process.exit(1)
        })

    } catch (error) {
        process.send({ type: "error", error: error.message })
        process.exit(1)
    }
})