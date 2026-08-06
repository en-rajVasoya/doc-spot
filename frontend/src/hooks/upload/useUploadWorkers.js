//  here this file start uplaodihn all files and folder here 
import axiosApi from "../../utils/api";
import axios from "axios"; // Clean axios for direct S3 requests
import { isBlockedFile, checkZipContainsBlocked, checkRarContainsBlocked } from "../../utils/blockFileTypes.js";

const CHUNK_SIZE = 15 * 1024 * 1024
const SMALL_FILE_THRESHOLD = 1 * 1024 * 1024
const SMALL_BATCH_SIZE = 50
const CHUNK_BATCH_SIZE = 10
const MAX_CONCURRENT = 4

export function useUploadWorkers(refs, updateFile, onUploadComplete, updateSession) {
    const { sessionMapsRef, uploadQueuesRef, uploadStartedRef, abortControllersRef } = refs

    // Checks if the user is trying to upload the exact same file twice at the same time.
    // If it is already uploading, we skip the duplicate to save bandwidth.
    const isDuplicateActiveUpload = (sessionId, filekey, fingerprint, parentId) => {
        for (const [sid, map] of sessionMapsRef.current.entries()) {
            for (const [fk, f] of map.entries()) {
                if (sid === sessionId && fk === filekey) continue
                if (f.fingerprint === fingerprint &&
                    (f.parentId || null) === (parentId || null) &&
                    ["waiting", "uploading"].includes(f.status)) {
                    return true
                }
            }
        }
        return false
    }

    // Reads the first 4100 bytes (header) of a file.
    // We send this small piece to the backend to securely verify the real file type (MIME type),
    // preventing hackers from uploading malicious files with fake extensions.
    const getFileHeader = (file) => {
        return new Promise((resolve) => {
            const slice = file.slice(0, 4100)
            const reader = new FileReader()
            reader.onload = (e) => {
                const base64 = btoa(String.fromCharCode(...new Uint8Array(e.target.result)))
                resolve(base64)
            }
            reader.readAsArrayBuffer(slice)
        })
    }


    // Takes a group of small files and uploads them all together in one single API request.
    // This is much faster than doing a separate network request for every single small image or text file.
    const uploadSmallBatch = async (sessionId, batch, parentId) => {
        // STEP 1 — handle placeholders separately
        // (A placeholder is just an empty UI shell, we mark it done immediately without sending data)
        batch
            .filter(f => f.file._isPlaceholder)
            .forEach(f => {
                updateFile(sessionId, f.filekey, { status: "done", progress: 100 }, f.status)
            })

        // STEP 2 — filter real files
        // If there are no real files left to upload, we stop here.
        const realBatch = batch.filter(f => !f.file._isPlaceholder)
        if (realBatch.length === 0) return

        // STEP 3 — block dangerous files (frontend validation)
        // We check the file names and extensions to make sure they aren't harmful before sending them.
        const safeBatch = []
        for (const f of realBatch) {
            if (isBlockedFile(f.file.name)) {
                updateFile(sessionId, f.filekey, {
                    status: "blocked",
                    message: "File type not allowed"
                }, f.status)
                continue
            }
            if (f.file.name.endsWith(".zip") || f.file.type === "application/zip") {
                const hasBlocked = await checkZipContainsBlocked(f.file);
                if (hasBlocked) {
                    updateFile(sessionId, f.filekey, {
                        status: "blocked",
                        message: "Zip contains blocked files"
                    }, f.status)
                    continue
                }
            }
            if (f.file.name.endsWith(".rar") || f.file.type === "application/x-rar-compressed" || f.file.type === "application/rar") {
                const hasBlocked = await checkRarContainsBlocked(f.file);
                if (hasBlocked) {
                    updateFile(sessionId, f.filekey, {
                        status: "blocked",
                        message: "Rar contains blocked files"
                    }, f.status)
                    continue
                }
            }
            safeBatch.push(f)
        }

        if (safeBatch.length === 0) return

        const uploadBatch = []
        for (const f of safeBatch) {
            if (isDuplicateActiveUpload(sessionId, f.filekey, f.fingerprint, f.parentId)) {
                updateFile(sessionId, f.filekey, { status: "skipped", progress: 100 }, f.status)
                continue
            }
            uploadBatch.push(f)
        }

        if (uploadBatch.length === 0) return

        // STEP 4 — create abort controller for batch
        // This allows the user to click "Cancel" and completely stop the network request.
        const controller = new AbortController()
        uploadBatch.forEach(f => {
            abortControllersRef.current.set(f.filekey, controller)
        })

        const form = new FormData()
        form.append("parent", parentId ? String(parentId) : null)

        try {
            // STEP 5 — get file headers for backend security check
            // We read the first few bytes of every file in the batch to verify they are safe.
            const fileHeaders = await Promise.all(
                uploadBatch.map(f => getFileHeader(f.file))
            )

            const metadata = uploadBatch.map((f, i) => ({
                fileName: f.file.name,
                fingerprint: f.fingerprint,
                fileSize: f.file.size,
                fileType: f.file.type || "application/octet-stream",
                parentId: f.parentId,
                fileHeader: fileHeaders[i],
                replacesFileId: f.replacesFileId || null
            }))

            form.append("metadata", JSON.stringify(metadata))

            // STEP 6 — append files and mark uploading
            // We pack all the files into a single form data package and tell the UI they are uploading.
            uploadBatch.forEach((f, i) => {
                form.append(`file_${i}`, f.file)
                updateFile(sessionId, f.filekey, { status: "uploading" }, f.status)
            })

            // STEP 7 — API call
            // We send the entire package of small files to the server at once.
            const { data } = await axiosApi.post("/upload/small-batch", form, {
                signal: controller.signal,
                timeout: 30000
            })

            // STEP 8 — handle response
            // The server tells us which files succeeded and which were blocked, and we update the UI.
            uploadBatch.forEach(f => {
                const result = data.results?.find(
                    r => r.fingerprint === f.fingerprint
                )

                if (result?.status === "blocked") {
                    updateFile(sessionId, f.filekey, {
                        status: "blocked",
                        message: result.message || "File not allowed"
                    }, f.status)
                } else {
                    // store uploadId back to filesMap for cancel cleanup
                    const filesMap = sessionMapsRef.current.get(sessionId)
                    if (filesMap?.has(f.filekey)) {
                        filesMap.set(f.filekey, {
                            ...filesMap.get(f.filekey),
                            uploadId: result?.uploadId
                        })
                    }

                    updateFile(sessionId, f.filekey, {
                        status: "done",
                        progress: 100,
                        id: result?.id || null // Store the DB _id
                    })
                    // onUploadComplete?.()
                    // if (f.isRetry) onUploadComplete?.()
                }
            })

        } catch (error) {
            if (error.name === "CanceledError") return
            console.error("[DEBUG] uploadSmallBatch error response:", error.response?.data);
            console.error("uploadSmallBatch error:", error)

            const isNetworkError = !error.response
            const isBlocked = error.response?.status === 403 || error.response?.status === 400
            const errorMessage = isNetworkError ? "No connection" : error.response?.data?.message || "Upload failed"

            // Treat 403 (Permission) and 400 (Trash) as "blocked" status
            uploadBatch.forEach(f => {
                updateFile(sessionId, f.filekey, {
                    status: isBlocked ? "blocked" : "error",
                    message: errorMessage
                }, f.status)
            })

            // if network is down then stop the whole queue
            if (isNetworkError) {
                const queue = uploadQueuesRef.current.get(sessionId)
                if (queue) {
                    // mark all remaining files in queue as error
                    queue.forEach(fileObj => {
                        if (fileObj === "DONE" || !fileObj) return
                        updateFile(sessionId, fileObj.filekey, {
                            status: "error",
                            message: "No connection"
                        }, fileObj.status)
                    })
                    queue.length = 0
                    queue.push("DONE")
                }
            }
        }
    }



    // Handles uploading large files by breaking them down into small 15MB chunks.
    // It safely checks for dangerous files, tracks real-time progress, and sends the chunks to either our backend or directly to S3.
    const uploadLargeFile = async (sessionId, fileObj, replaceMap) => {
        if (fileObj.file._isPlaceholder) {
            updateFile(sessionId, fileObj.filekey, {
                status: "done",
                progress: 100
            }, fileObj.status)
            return; // STOP upload completely
        }

        const { file, filekey, fingerprint, parentId } = fileObj;

        if (isDuplicateActiveUpload(sessionId, filekey, fingerprint, parentId)) {
            updateFile(sessionId, filekey, { status: "skipped", progress: 100 }, fileObj.status)
            return
        }

        updateFile(sessionId, filekey, { status: "uploading" })

        // create abort controller for this file
        // This allows the user to click "Cancel" to stop the big upload midway through.
        const controller = new AbortController()
        abortControllersRef.current.set(filekey, controller)

        try {

            await new Promise(r => setTimeout(r, 500))

            //  here we are blocking the dangorus file extension 
            // We check the file type right away so we don't waste time uploading a bad file.
            if (isBlockedFile(file.name)) {
                updateFile(sessionId, filekey, { status: "blocked", message: "File type is not allowed" })
                return
            }
            if (file.name.endsWith(".zip") || file.type === "application/zip") {
                const hasBlocked = await checkZipContainsBlocked(file);
                if (hasBlocked) {
                    updateFile(sessionId, filekey, { status: "blocked", message: "Zip contains blocked files" })
                    return
                }
            }
            if (file.name.endsWith(".rar") || file.type === "application/x-rar-compressed" || file.type === "application/rar") {
                const hasBlocked = await checkRarContainsBlocked(file);
                if (hasBlocked) {
                    updateFile(sessionId, filekey, { status: "blocked", message: "Rar contains blocked files" })
                    return
                }
            }
            const fileHeader = await getFileHeader(file)

            let uploadId, alreadyUploaded

            //  first init data to backend for check status
            // We tell the server "Hey, I have a big file. Where should I put it?"
            const initStart = performance.now()
            const { data: initData } = await axiosApi.post("/upload/init", {
                fileName: file.name,
                fingerprint,
                fileSize: file.size,
                fileType: file.type || "application/octet-stream",
                totalChunks: Math.ceil(file.size / CHUNK_SIZE),
                parent: parentId || null,
                fileHeader,
                replacesFileId: replaceMap?.[file.name] || null
            }, { signal: controller.signal })


            //  if the mime is block from backend 
            if (initData.blocked) {
                console.warn(`[DEBUG] init blocked: ${file.name} | reason=${initData.message}`);
                updateFile(sessionId, filekey, { status: "blocked", message: initData.message })
                return
            }
            console.log(`[INIT] ${(performance.now() - initStart).toFixed(1)}ms | uploadId=${initData.uploadId}`);

            //  if file already uploaded then already uploaded
            // If the exact file is already there, we skip uploading and instantly mark it 100%.
            if (initData.status === "completed") {
                updateFile(sessionId, filekey, { status: "done", progress: 100 }, fileObj.status)
                return
            }

            uploadId = initData.uploadId

            // store uploadId in fileObj for cancle use
            // We save the ID so if the user clicks cancel, we can tell the server to delete the incomplete pieces.
            const filesMap = sessionMapsRef.current.get(sessionId)
            if (filesMap?.has(filekey)) {
                filesMap.set(filekey, { ...filesMap.get(filekey), uploadId })
            }


            alreadyUploaded = new Set(initData.uploadedChunks || [])    // how many chunks are already uploaded
            const totalChunks = Math.ceil(file.size / CHUNK_SIZE)

            // here skipp the chunks that are already uploaded
            // If the upload failed halfway earlier, we resume from where it left off instead of starting from 0%.
            const chunks = []
            for (let i = 0; i < totalChunks; i++) {
                if (alreadyUploaded.has(i)) continue
                const start = i * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, file.size)
                chunks.push({ index: i, start, blob: file.slice(start, end) })
            }

            let uploadCount = alreadyUploaded.size;
            // S3 Single Put (files between 1MB and 5MB)
            if (initData.singlePutUrl) {
                console.log(`[S3 SINGLE PUT] ${file.name} | sending directly to S3...`);
                let retries = 0;
                const MAX_RETRIES = 3;
                while (true) {
                    try {
                        let lastLoaded = 0;
                        let bytesInWindow = 0;
                        let windowStart = Date.now();
                        const SPEED_UPDATE_INTERVAL = 1500;

                        await axios.put(initData.singlePutUrl, file, {
                            headers: { "Content-Type": file.type || "application/octet-stream" },
                            signal: controller.signal,
                            onUploadProgress: (progressEvent) => {
                                const pct = parseFloat((progressEvent.progress * 100).toFixed(1));

                                const loadedDelta = progressEvent.loaded - lastLoaded;
                                bytesInWindow += loadedDelta;
                                lastLoaded = progressEvent.loaded;

                                const now = Date.now();
                                const elapsed = now - windowStart;
                                if (elapsed >= SPEED_UPDATE_INTERVAL) {
                                    const speedMBps = (bytesInWindow / (1024 * 1024)) / (elapsed / 1000);
                                    updateFile(sessionId, filekey, { progress: pct, speed: speedMBps });
                                    bytesInWindow = 0;
                                    windowStart = now;
                                } else {
                                    updateFile(sessionId, filekey, { progress: pct });
                                }
                            }
                        });
                        break;
                    } catch (err) {
                        if (err.name === "CanceledError") return;
                        const isNetworkError = !err.response;
                        if (isNetworkError && retries < MAX_RETRIES) {
                            retries++;
                            await new Promise(r => setTimeout(r, 2000 * retries));
                            continue;
                        }
                        updateFile(sessionId, filekey, { status: "error", message: "Upload failed - connection lost" });
                        throw err;
                    }
                }
                uploadCount = totalChunks;
            } else {
                //  in one batch how many chunk we want
                // We bundle the 15MB chunks into groups of 10 so we don't overwhelm the browser.
                const batches = []
                for (let i = 0; i < chunks.length; i += CHUNK_BATCH_SIZE) {
                    batches.push(chunks.slice(i, i + CHUNK_BATCH_SIZE))
                }

                //  internet speed tracking here
                let bytesInWindow = 0
                let windowStart = Date.now()
                const SPEED_UPDATE_INTERVAL = 1500     // here every 1.5 second speed update

                // Track total bytes across all chunks for smooth % bar
                let totalBytesLoaded = alreadyUploaded.size * CHUNK_SIZE;
                if (totalBytesLoaded > file.size) totalBytesLoaded = file.size;

                //  send batch to the backend /upload-chunk
                console.log(`[CHUNKS] ${file.name} | Total batches: ${batches.length} | Total chunks: ${chunks.length} | Already uploaded: ${alreadyUploaded.size}`)
                for (let i = 0; i < batches.length; i++) {
                    const batch = batches[i]
                    const batchBytes = batch.reduce((sum, c) => sum + c.blob.size, 0)

                    const chunkStart = performance.now()
                    console.log(`[BATCH START] ${file.name} | batch ${i + 1}/${batches.length} | chunks: [${batch.map(c => c.index)}] | sending...`)

                    let retries = 0
                    const MAX_RETRIES = 3
                    while (true) {
                        try {
                            if (initData.urls) {
                                // S3 MULTIPART PUT
                                // Uploading directly to Amazon S3 (the fastest and safest way).
                                await Promise.all(batch.map(async (c) => {
                                    const putUrl = initData.urls[c.index];
                                    let lastLoaded = 0;
                                    await axios.put(putUrl, c.blob, {
                                        headers: { "Content-Type": "application/octet-stream" },
                                        signal: controller.signal,
                                        onUploadProgress: (progressEvent) => {
                                            const loadedDelta = progressEvent.loaded - lastLoaded;
                                            bytesInWindow += loadedDelta;
                                            totalBytesLoaded += loadedDelta;
                                            lastLoaded = progressEvent.loaded;

                                            const pct = Math.min(99.9, parseFloat(((totalBytesLoaded / file.size) * 100).toFixed(1)));

                                            const now = Date.now();
                                            const elapsed = now - windowStart;
                                            if (elapsed >= SPEED_UPDATE_INTERVAL) {
                                                const speedMBps = (bytesInWindow / (1024 * 1024)) / (elapsed / 1000);
                                                updateFile(sessionId, filekey, { progress: pct, speed: speedMBps });
                                                bytesInWindow = 0;
                                                windowStart = now;
                                            } else {
                                                updateFile(sessionId, filekey, { progress: pct });
                                            }
                                        }
                                    });
                                }));
                            } else {
                                // LOCAL CHUNK UPLOAD
                                // Uploading to our own server, which will piece the chunks together later.
                                const form = new FormData()
                                batch.forEach(c => form.append(`chunk_${c.index}`, c.blob))

                                let lastLoaded = 0;
                                await axiosApi.post("/upload/upload-chunk", form, {
                                    signal: controller.signal,
                                    timeout: 45000,   // 5 miniutes
                                    headers: {
                                        "x-upload-id": uploadId,
                                        "x-indexes": JSON.stringify(batch.map(c => c.index)),
                                        "x-starts": JSON.stringify(batch.map(c => c.start))
                                    },
                                    onUploadProgress: (progressEvent) => {
                                        const loadedDelta = progressEvent.loaded - lastLoaded;
                                        bytesInWindow += loadedDelta;
                                        totalBytesLoaded += loadedDelta;
                                        lastLoaded = progressEvent.loaded;

                                        const pct = Math.min(99.9, parseFloat(((totalBytesLoaded / file.size) * 100).toFixed(1)));

                                        const now = Date.now();
                                        const elapsed = now - windowStart;
                                        if (elapsed >= SPEED_UPDATE_INTERVAL) {
                                            const speedMBps = (bytesInWindow / (1024 * 1024)) / (elapsed / 1000);
                                            updateFile(sessionId, filekey, { progress: pct, speed: speedMBps });
                                            bytesInWindow = 0;
                                            windowStart = now;
                                        } else {
                                            updateFile(sessionId, filekey, { progress: pct });
                                        }
                                    }
                                })
                            }
                            console.log(`[BATCH OK] ${file.name} | batch ${i + 1}/${batches.length} | took ${(performance.now() - chunkStart).toFixed(0)}ms`)
                            break // Success!
                        } catch (err) {
                            if (err.name === "CanceledError") return
                            console.error(`[BATCH FAIL DETAIL]`, {
                                fileName: file.name,
                                batchIndex: i,
                                totalBatches: batches.length,
                                errorName: err.name,
                                errorCode: err.code,
                                errorMessage: err.message,
                                httpStatus: err.response?.status,
                                httpData: err.response?.data,
                                isTimeout: err.code === "ECONNABORTED",
                                isNetworkError: !err.response,
                                retriesExhausted: retries >= MAX_RETRIES
                            })

                            const isNetworkError = !err.response && err.code !== "ECONNABORTED"
                            if (isNetworkError && retries < MAX_RETRIES) {
                                retries++
                                console.warn(`[RETRY] ${file.name} | batch ${i + 1}/${batches.length} | retry ${retries}/${MAX_RETRIES} | err=${err.message}`)
                                await new Promise(r => setTimeout(r, 2000 * retries)) // Wait 2s, 4s, 6s
                                continue
                            }

                            console.error(`[BATCH FAIL] ${file.name} | batch ${i + 1}/${batches.length} | took ${(performance.now() - chunkStart).toFixed(0)}ms | err.name=${err.name} | err.code=${err.code} | status=${err.response?.status} | msg=${err.message}`)
                            console.error(`[UPLOAD ERROR] ${new Date().toLocaleTimeString()} | File: ${file.name} | Status: ${err.response?.status} | Msg: ${err.message}`);
                            updateFile(sessionId, filekey, { status: "error", message: "Upload failed - connection lost" })
                            throw err
                        }
                    }

                    // Local speed is now handled inside onUploadProgress
                }
            }

            console.log(`[ALL BATCHES DONE] ${file.name} | Finished chunking loops | calling /upload/complete...`)

            console.log(`[COMPLETE] calling complete for: ${file.name}, uploadId: ${uploadId}`)

            const { data: completeData } = await axiosApi.post("/upload/complete", { uploadId }, { signal: controller.signal })
            updateFile(sessionId, filekey, {
                status: "done",
                progress: 100,
                speed: null,
                id: completeData?.id || null // Store the DB _id
            }, fileObj.status)

            console.log(`[COMPLETE RESPONSE] ${file.name}: ${JSON.stringify(completeData)}`)

            // if (fileObj.isRetry) onUploadComplete?.()


        } catch (error) {
            console.error(`[LARGEFILE CATCH] ${file.name} | error.name=${error.name} | error.code=${error.code} | error.message=${error.message}`)
            if (error.name === "CanceledError") return
            console.error("[DEBUG] uploadLargeFile error response:", error.response?.data);
            console.error("uploadLargeFile error:", error)

            console.error(`[LARGEFILE CATCH DETAIL]`, {
                fileName: file.name,
                errorName: error.name,
                errorCode: error.code,
                errorMessage: error.message,
                httpStatus: error.response?.status,
                httpData: error.response?.data,
                isTimeout: error.code === "ECONNABORTED",
                isNetworkError: !error.response
            })

            // check if already marked as error from chunk failure
            const currentFile = sessionMapsRef.current.get(sessionId)?.get(filekey)
            if (currentFile?.status === "error") {
                console.warn(`[LARGEFILE CATCH] ${file.name} | Already marked as error, skipping`)
                return  // ← already handled, don't overwrite
            }

            const errorMessage = error.response?.data?.message || "Upload failed"
            const isBlocked = error.response?.status === 403 || error.response?.status === 400
            const isNetworkError = !error.response

            console.error(`[LARGEFILE CATCH] ${file.name} | Setting status=${isBlocked ? 'blocked' : 'error'} | msg=${errorMessage}`)
            updateFile(sessionId, filekey, {
                status: isBlocked ? "blocked" : "error",
                message: errorMessage
            }, fileObj.status)

            // if network is down then stop the whole queue (same as small file logic)
            if (isNetworkError) {
                console.error(`[LARGEFILE CATCH] ${file.name} | Network error — stopping entire queue`)
                const queue = uploadQueuesRef.current.get(sessionId)
                if (queue) {
                    queue.forEach(queuedFile => {
                        if (queuedFile === "DONE" || !queuedFile) return
                        updateFile(sessionId, queuedFile.filekey, {
                            status: "error",
                            message: "No connection"
                        }, queuedFile.status)
                    })
                    queue.length = 0
                    queue.push("DONE")
                }
            }
        }

    }


    // Creates up to 4 background "workers" that constantly check the queue for new files.
    // This ensures we never upload more than 4 files at the exact same time, preventing the browser from freezing or crashing.
    const startUploadWorkers = (sessionId) => {
        if (uploadStartedRef.current.get(sessionId)) return []
        uploadStartedRef.current.set(sessionId, true)

        const queue = uploadQueuesRef.current.get(sessionId)
        console.log(`[WORKERS] Starting ${MAX_CONCURRENT} workers for session ${sessionId} | Queue size: ${queue.length}`)

        return Array(MAX_CONCURRENT).fill(null).map(async (_, workerIndex) => {
            await new Promise(r => setTimeout(r, workerIndex * 500))
            console.log(`[WORKER-${workerIndex}] Started`)
            while (true) {
                const fileObj = queue.shift()
                if (!fileObj) {
                    await new Promise(r => setTimeout(r, 100))
                    continue
                }
                if (fileObj === "DONE") {
                    console.log(`[WORKER-${workerIndex}] saw DONE, stopping`)
                    queue.unshift("DONE")
                    break
                }
                console.log(`[WORKER-${workerIndex}] picking up: ${fileObj.file.name} | isSmall=${fileObj.isSmall} | queue remaining: ${queue.length}`)
                const workerFileStart = performance.now()
                if (fileObj.isSmall) {
                    const batch = [fileObj]
                    while (batch.length < SMALL_BATCH_SIZE && queue[0]?.isSmall) {
                        batch.push(queue.shift())
                    }
                    console.log(`[WORKER-${workerIndex}] uploading small batch of ${batch.length} files`)
                    await uploadSmallBatch(sessionId, batch, batch[0].parentId)
                    console.log(`[WORKER-${workerIndex}] small batch done | took ${(performance.now() - workerFileStart).toFixed(0)}ms`)
                } else {
                    console.log(`[WORKER-${workerIndex}] uploading large file: ${fileObj.file.name} (${(fileObj.file.size / 1024 / 1024).toFixed(1)}MB)`)
                    await uploadLargeFile(sessionId, fileObj)
                    console.log(`[WORKER-${workerIndex}] large file done: ${fileObj.file.name} | took ${(performance.now() - workerFileStart).toFixed(0)}ms`)
                }
                console.log(`[WORKER-${workerIndex}] finished processing, looping back for next file`)
            }
            console.log(`[WORKER-${workerIndex}] EXITED the while loop — this worker is now DEAD`)
        })
    }


    // When a single file fails (like losing internet), this function resets its status and pushes it back to the front of the queue to try again.
    const retryFile = (sessionId, filekey) => {
        const filesMap = sessionMapsRef.current.get(sessionId)
        const fileObj = filesMap?.get(filekey)
        if (!fileObj) return

        // reset status
        const updated = { ...fileObj, status: "waiting", progress: 0, speed: null, isRetry: true }
        filesMap.set(filekey, updated)
        updateFile(sessionId, filekey, { status: "waiting", progress: 0, speed: null }, fileObj.status)

        // get queue and remove DONE sentinel first
        const queue = uploadQueuesRef.current.get(sessionId)
        if (queue) {
            // remove DONE from queue so workers don't stop immediately
            const doneIndex = queue.indexOf("DONE")
            if (doneIndex !== -1) queue.splice(doneIndex, 1)

            // push file to front
            queue.unshift(updated)

            // add DONE back at end
            queue.push("DONE")
        }

        // reset uploadStarted so workers can restart
        uploadStartedRef.current.set(sessionId, false)

        // restart workers
        startUploadWorkers(sessionId)
    }



    // When an entire folder fails, this function finds all the failed files inside it, resets them, and restarts the background workers to try them all again.
    const retryFolder = (sessionId) => {
        const filesMap = sessionMapsRef.current.get(sessionId)
        if (!filesMap) return

        // 1. Get only the files that actually failed
        const errorFiles = [];
        filesMap.forEach((fileObj) => {
            if (fileObj.status === "error" || fileObj.status === "blocked") {
                errorFiles.push(fileObj)
            }
        })
        console.log(`[DEBUG] retryFolder: Found ${errorFiles.length} files with status 'error'`);
        if (errorFiles.length === 0) return

        // 2. Reset all error files to "waiting"
        errorFiles.forEach(fileObj => {
            // Capture the old "error" status so updateFile knows to subtract from it
            const oldStatus = fileObj.status;
            const oldProgress = fileObj.progress;

            const updated = {
                ...fileObj,
                status: "waiting",
                progress: 0,
                speed: null,
                isRetry: true
            };

            filesMap.set(fileObj.filekey, updated);

            // Update the UI state - Passing 'oldStatus' ensures the error count drops to 0
            updateFile(sessionId, fileObj.filekey, {
                status: "waiting",
                progress: 0,
                speed: null
            }, oldStatus, oldProgress);
        });

        // 3. RESET QUEUE COMPLETELY
        // We create a fresh queue to avoid any leftovers
        const queue = [];
        uploadQueuesRef.current.set(sessionId, queue);

        // 5. RESTART WORKERS
        // Clear the started flag so startUploadWorkers actually runs
        uploadStartedRef.current.set(sessionId, false);
        startUploadWorkers(sessionId);

        // 4. ADD RETRIED FILES BACK TO QUEUE
        errorFiles.forEach(fileObj => {
            const updated = filesMap.get(fileObj.filekey);
            queue.push(updated);
        });

        // Add the sentinel so workers know when to stop
        queue.push("DONE");


    }


    return {
        uploadSmallBatch,
        uploadLargeFile,
        startUploadWorkers,
        getFileHeader,
        retryFile,
        retryFolder
    }
}