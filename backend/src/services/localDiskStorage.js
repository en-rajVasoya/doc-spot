import fs from "fs";
import path from "path";
import chunkModel from "#models/chunkModel";
import { getAbsolutePath } from "#utils/pathHelper";
import { logger } from "#utils/logger";
import { cleanupUploadResources } from "../middleware/chunkUploadMiddleware.js";
import { createWriteStream } from "fs";


const getBucketPath = (uploadId) => {
    const bucket = uploadId.substring(0, 2);
    const bucketDir = path.resolve(`./files/${bucket}`);
    if (!fs.existsSync(bucketDir)) {
        fs.mkdirSync(bucketDir, { recursive: true });
    }
    return bucketDir;
};


export const localDiskStorage = {
    // -------------------------------------------------------------
    // 1. Resume Check
    // -------------------------------------------------------------
    checkResume: async (storagePath, s3UploadId, totalChunks, uploadId) => {
        const existingAbsPath = getAbsolutePath(storagePath);
        if (!storagePath || !existingAbsPath || !fs.existsSync(existingAbsPath)) {
            return { action: "delete_record" };
        } else {
            const uploadedChunks = await chunkModel.find({ uploadId }).select("chunkIndex -_id");
            return {
                action: "resume",
                uploadedChunks: uploadedChunks.map(c => c.chunkIndex),
                urls: null
            };
        }
    },


    // -------------------------------------------------------------
    // 2. Initialize New Upload
    // -------------------------------------------------------------
    initNewUpload: async (uploadId, fileType, totalChunks, fileSize, fileName) => {
        const bucketDir = getBucketPath(uploadId);
        const bucket = uploadId.substring(0, 2);
        const absoluteTmpPath = path.join(bucketDir, `${uploadId}.tmp`);
        const storagePath = `files/${bucket}/${uploadId}.tmp`;

        if (fileSize) {
            const fd = fs.openSync(absoluteTmpPath, "w");
            fs.ftruncateSync(fd, fileSize);
            fs.closeSync(fd);
        } else {
            fs.writeFileSync(absoluteTmpPath, "");
        }

        return { storagePath, s3UploadId: null, urls: null, singlePutUrl: null };
    },

    // -------------------------------------------------------------
    // 3. Complete Upload (Merge chunks and Rename)
    // -------------------------------------------------------------
    completeUpload: async (uploadId, storagePath, s3UploadId, totalChunks, finalExtension) => {
        const uploadedCount = await chunkModel.countDocuments({ uploadId });
        if (uploadedCount !== totalChunks) {
            throw new Error("Missing chunks");
        }
        // release fd / clear cache before renaming
        await cleanupUploadResources(uploadId);
        const bucketDir = getBucketPath(uploadId);
        const bucket = uploadId.substring(0, 2);
        const oldAbsPath = getAbsolutePath(storagePath);
        const newAbsPath = path.join(bucketDir, `${uploadId}${finalExtension}`);
        const newRelativePath = `files/${bucket}/${uploadId}${finalExtension}`;
        if (oldAbsPath && fs.existsSync(oldAbsPath)) {
            try {
                fs.renameSync(oldAbsPath, newAbsPath);
            } catch (renameErr) {
                logger.error(`[LOCAL RENAME ERROR] ${renameErr.message}`);
                throw new Error("Failed to finalize local file rename");
            }
        } else {
            // source file missing entirely — don't silently pretend it worked
            throw new Error("Local temp file missing at completion");
        }
        return newRelativePath;
    },


    // -------------------------------------------------------------
    // 4. Cancel Upload (delete in-progress local tmp file)
    // -------------------------------------------------------------
    cancelUpload: async (storagePath, s3UploadId, uploadId) => {
        if (uploadId) {
            await cleanupUploadResources(uploadId);
        }
        const cancelAbsPath = getAbsolutePath(storagePath);
        if (cancelAbsPath && fs.existsSync(cancelAbsPath)) {
            try {
                fs.unlinkSync(cancelAbsPath);
            } catch (err) {
                logger.error(`Local file delete failed during cancel: ${err.message}`);
            }
        }
    },



    // -------------------------------------------------------------
    // 5. Delete File (Remove completely finished file)
    // -------------------------------------------------------------
    deleteFile: async (storagePath) => {
        const absPath = getAbsolutePath(storagePath);
        if (absPath && fs.existsSync(absPath)) {
            try {
                fs.unlinkSync(absPath);
            } catch (err) {
                logger.error(`Local file delete failed: ${err.message}`);
            }
        }
    },



    // -------------------------------------------------------------
    // 6. Upload Buffer (For small batch uploads)
    // -------------------------------------------------------------
    uploadBuffer: async (storagePath, buffer, fileType) => {
        const uploadId = path.basename(storagePath).split(".")[0];
        getBucketPath(uploadId); // Ensure bucket dir exists just in case
        const absoluteStoragePath = getAbsolutePath(storagePath);
        await fs.promises.writeFile(absoluteStoragePath, buffer);
    },



    // -------------------------------------------------------------
    // 7. Get File Stream (for downloadFile, downloadZip, and the
    //    zip worker reading each source file)
    // -------------------------------------------------------------
    getFileStream: async (storagePath, range) => {
        const absPath = getAbsolutePath(storagePath);
        if (!absPath) throw new Error("File not found on disk");

        let stat;
        try {
            stat = await fs.promises.stat(absPath);
        } catch {
            throw new Error("File not found on disk");
        }

        const fileSize = stat.size;

        if (!range) {
            return {
                stream: fs.createReadStream(absPath),
                contentLength: fileSize,
                contentRange: null,
                isPartial: false
            };
        }

        // parse "bytes=start-end"
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize || end >= fileSize) {
            throw new Error("Range not satisfiable");
        }

        return {
            stream: fs.createReadStream(absPath, { start, end }),
            contentLength: end - start + 1,
            contentRange: `bytes ${start}-${end}/${fileSize}`,
            isPartial: true
        };
    },

    // -------------------------------------------------------------
    // 8. Create Zip Destination (for zipWorker's output side)
    //    Returns a writable stream + finalize(), matching the S3
    //    shape so zipWorker.js never branches on provider.
    // -------------------------------------------------------------
    createZipDestination: (zipKey) => {
        // zipKey here is treated as a relative path e.g. "zips/xyz.zip"
        const absPath = path.resolve(`./${zipKey}`);
        const dir = path.dirname(absPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const writeStream = createWriteStream(absPath);

        return {
            writeStream,
            onProgress: () => {
                // no native progress events for local fs writes — no-op
            },
            finalize: async () => {
                return new Promise((resolve, reject) => {
                    writeStream.on("finish", resolve);
                    writeStream.on("error", reject);
                });
            }
        };
    },

    // -------------------------------------------------------------
    // 9. Delete Zip File
    // -------------------------------------------------------------
    deleteZipFile: async (zipKey) => {
        const absPath = path.resolve(`./${zipKey}`);
        if (fs.existsSync(absPath)) {
            try {
                fs.unlinkSync(absPath);
            } catch (err) {
                logger.error(`Local zip delete failed: ${err.message}`);
            }
        }
    }
}