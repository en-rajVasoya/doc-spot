import {
    ListPartsCommand,
    UploadPartCommand,
    AbortMultipartUploadCommand,
    CreateMultipartUploadCommand,
    PutObjectCommand,
    CompleteMultipartUploadCommand,
    CopyObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "../config/s3.js";
import { logger } from "#utils/logger";

import { Upload } from "@aws-sdk/lib-storage";
import { PassThrough } from "stream";

// Helper to sanitize S3 keys: strips leading slashes and converts backslashes to forward slashes
const cleanS3Key = (key) => {
    if (!key) return key;
    return key.replace(/^[/\\]+/, "").replace(/\\/g, "/");
};

export const s3Storage = {
    // -------------------------------------------------------------
    // 1. Resume Check
    // -------------------------------------------------------------

    checkResume: async (storagePath, s3UploadId, totalChunks) => {
        if (!s3UploadId) {
            return { action: "delete_record" };
        }

        try {
            let allParts = [];
            let nextPartNumberMarker = undefined;
            let isTruncated = true;

            //  in check the reusme login with out while loop aws will give only 1000 result so in the large fiel without while it will fail
            while (isTruncated) {
                const listCommand = new ListPartsCommand({
                    Bucket: process.env.AWS_S3_BUCKET_NAME,
                    Key: storagePath,
                    UploadId: s3UploadId,
                    PartNumberMarker: nextPartNumberMarker
                });

                const listRes = await s3Client.send(listCommand);
                if (listRes.Parts) {
                    allParts = allParts.concat(listRes.Parts);
                }
                //  AWS will give us the isTruncated true and false based on thsi while loop will run
                isTruncated = listRes.IsTruncated;
                nextPartNumberMarker = listRes.NextPartNumberMarker;
            }

            const uploadedChunks = allParts.map(p => p.PartNumber - 1);

            //  this will give the new url of the remaning chunks here
            let urls = null;
            if (totalChunks > 1) {
                urls = {};
                for (let i = 0; i < totalChunks; i++) {
                    if (!uploadedChunks.includes(i)) {
                        const uploadPartCommand = new UploadPartCommand({
                            Bucket: process.env.AWS_S3_BUCKET_NAME,
                            Key: storagePath,
                            UploadId: s3UploadId,
                            PartNumber: i + 1
                        });
                        urls[i] = await getSignedUrl(s3Client, uploadPartCommand, { expiresIn: 43200 });
                    }
                }
            }
            return { action: "resume", uploadedChunks, urls };

        } catch (error) {
            logger.error(`[S3 Resume Error] ${error.message}`);
            try {
                const abortCommand = new AbortMultipartUploadCommand({
                    Bucket: process.env.AWS_S3_BUCKET_NAME,
                    Key: storagePath,
                    UploadId: s3UploadId
                });
                await s3Client.send(abortCommand);
            } catch (abortErr) {
                logger.error(`[S3 Resume Abort Cleanup Error] ${abortErr.message}`);
            }
            return { action: "delete_record" };

        }
    },


    // -------------------------------------------------------------
    // 2. Initialize New Upload
    // -------------------------------------------------------------
    initNewUpload: async (uploadId, fileType, totalChunks, fileSize, fileName) => {
        const bucket = uploadId.substring(0, 2);
        const finalExtension = fileName?.includes(".") ? "." + fileName.split(".").pop() : "";
        const storagePath = `files/${bucket}/${uploadId}${finalExtension}`;
        let s3UploadId = null;
        let urls = null;
        let singlePutUrl = null;

        //  if fiel size is large and total chunks is greater then one so create each chunk diffrent url
        if (totalChunks > 1) {
            //  s3 will return the new upaldoId for this item
            const createCommand = new CreateMultipartUploadCommand({
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: storagePath,
                ContentType: fileType || "application/octet-stream"
            })
            const createResponse = await s3Client.send(createCommand);
            s3UploadId = createResponse.UploadId;

            //  generating each chunk url
            urls = {};
            for (let i = 0; i < totalChunks; i++) {
                const uploadPartCommand = new UploadPartCommand({
                    Bucket: process.env.AWS_S3_BUCKET_NAME,
                    Key: storagePath,
                    UploadId: s3UploadId,
                    PartNumber: i + 1
                });
                urls[i] = await getSignedUrl(s3Client, uploadPartCommand, { expiresIn: 43200 });
            }

        } else {
            const putCommand = new PutObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: storagePath,
                ContentType: fileType || "application/octet-stream"
            });
            singlePutUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: 43200 });
        }
        return { storagePath, s3UploadId, urls, singlePutUrl };

    },


    // -------------------------------------------------------------
    // 3. Complete Upload (Merge chunks and Rename)
    // -------------------------------------------------------------
    completeUpload: async (uploadId, storagePath, s3UploadId, totalChunks, finalExtension) => {
        if (totalChunks > 1) {
            let allParts = [];
            let nextPartNumberMarker = undefined;
            let isTruncated = true;

            //  while loop to get all parts chunks here
            while (isTruncated) {
                const listCommand = new ListPartsCommand({
                    Bucket: process.env.AWS_S3_BUCKET_NAME,
                    Key: storagePath,
                    UploadId: s3UploadId,
                    PartNumberMarker: nextPartNumberMarker
                });

                const listRes = await s3Client.send(listCommand);
                if (listRes.Parts) {
                    allParts = allParts.concat(listRes.Parts.map(p => ({
                        PartNumber: p.PartNumber,
                        ETag: p.ETag
                    })));
                }
                isTruncated = listRes.IsTruncated;
                nextPartNumberMarker = listRes.NextPartNumberMarker;
            }

            //  if total chunks and recevied chunks not matched here so return 
            if (allParts.length !== totalChunks) {
                throw new Error("Missing S3 parts for completion");
            }

            const sortedParts = allParts.sort((a, b) => a.PartNumber - b.PartNumber);

            //  now the after all chunk receving here save the 
            const completeCommand = new CompleteMultipartUploadCommand({
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: storagePath,
                UploadId: s3UploadId,
                MultipartUpload: { Parts: sortedParts }
            });
            await s3Client.send(completeCommand);
        }

        const bucket = uploadId.substring(0, 2);
        const newRelativePath = `files/${bucket}/${uploadId}${finalExtension}`;

        if (storagePath !== newRelativePath) {
            try {
                const copyCommand = new CopyObjectCommand({
                    Bucket: process.env.AWS_S3_BUCKET_NAME,
                    CopySource: encodeURI(`${process.env.AWS_S3_BUCKET_NAME}/${storagePath}`),
                    Key: newRelativePath
                });
                await s3Client.send(copyCommand);
                const deleteCommand = new DeleteObjectCommand({
                    Bucket: process.env.AWS_S3_BUCKET_NAME,
                    Key: storagePath
                });
                await s3Client.send(deleteCommand);
            } catch (s3RenameErr) {
                logger.error(`[S3 RENAME ERROR] ${s3RenameErr.message}`);
                throw new Error("Failed to finalize S3 file rename");
            }
        }

        return newRelativePath;

    },


    // -------------------------------------------------------------
    // 4. Cancel Upload (Abort in-progress multipart)
    // -------------------------------------------------------------

    cancelUpload: async (storagePath, s3UploadId) => {
        if (s3UploadId) {
            try {
                const abortCmd = new AbortMultipartUploadCommand({
                    Bucket: process.env.AWS_S3_BUCKET_NAME,
                    Key: storagePath,
                    UploadId: s3UploadId
                });
                await s3Client.send(abortCmd);
            } catch (error) {
                logger.error(`S3 Abort failed during cancel: ${error.message}`);
            }
        }
    },


    // -------------------------------------------------------------
    // 5. Delete File (Remove completely finished file)
    // -------------------------------------------------------------

    deleteFile: async (storagePath) => {
        try {
            const cleanKey = cleanS3Key(storagePath);
            const deleteCmd = new DeleteObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: cleanKey
            });
            await s3Client.send(deleteCmd);
        } catch (error) {
            logger.error(`S3 Delete failed: ${error.message}`);
        }
    },

    // -------------------------------------------------------------
    // 6. Upload Buffer (For small batch uploads)
    // -------------------------------------------------------------
    uploadBuffer: async (storagePath, buffer, fileType) => {
        const cleanKey = cleanS3Key(storagePath);
        const putCommand = new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: cleanKey,
            Body: buffer,
            ContentType: fileType || "application/octet-stream"
        });
        return s3Client.send(putCommand);
    },



    // -------------------------------------------------------------
    // 7. Get File Stream (for downloadFile, downloadZip, and the
    //    zip worker reading each source file)
    // -------------------------------------------------------------
    getFileStream: async (storagePath, range) => {
        const cleanKey = cleanS3Key(storagePath);
        const command = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: cleanKey,
            Range: range || undefined
        });

        const s3Response = await s3Client.send(command);
        return {
            stream: s3Response.Body,
            contentLength: s3Response.ContentLength,
            contentRange: s3Response.ContentRange || null,
            isPartial: !!s3Response.ContentRange
        };
    },

    // -------------------------------------------------------------
    // 8. Create Zip Destination (Uploads Zip to S3 on the fly)
    //    This creates an empty "pipe" (PassThrough) that our zipWorker 
    //    can push data into. AWS will automatically suck the data 
    //    out of this pipe and upload it to S3 in 10MB chunks.
    // -------------------------------------------------------------
    createZipDestination: (zipKey) => {
        // PassThrough is like an empty hose or pipe. 
        // We push zipped bytes into one end, and AWS reads from the other end.
        const passthrough = new PassThrough();

        // This is the AWS Uploader. It automatically handles uploading massive files
        // to S3 by breaking them into smaller chunks (Multipart Upload).
        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: zipKey, // The exact path in S3 (e.g. zips/1234.zip)
                Body: passthrough, // AWS will suck the data out of our empty pipe here
                ContentType: "application/zip"
            },
            queueSize: 4, // Upload 4 chunks at the exact same time
            partSize: 10 * 1024 * 1024 // Break the file into 10 Megabyte chunks
        })

        // CRITICAL FIX: We must call .done() immediately to turn the uploader "ON".
        // If we don't turn it on, the pipe gets clogged (backpressure) and everything freezes!
        const uploadDonePromise = upload.done()

        return {
            writeStream: passthrough, // We give this to our zipWorker so it can push data into the pipe
            onProgress: (callback) => {
                // Sends progress updates back to the frontend (e.g. "80% uploaded")
                upload.on("httpUploadProgress", (progress) => callback(progress));
            },
            finalize: async () => {
                // Wait until the very last chunk is successfully uploaded to S3
                const result = await uploadDonePromise
                return result;
            }
        };
    },


    // -------------------------------------------------------------
    // 9. Delete Zip File (same as deleteFile — kept as separate
    //    name for clarity in the controller/worker call sites)
    // -------------------------------------------------------------
    deleteZipFile: async (zipKey) => {
        try {
            const deleteCmd = new DeleteObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: zipKey
            });
            await s3Client.send(deleteCmd);
        } catch (error) {
            logger.error(`S3 zip delete failed: ${error.message}`);
        }
    }

}