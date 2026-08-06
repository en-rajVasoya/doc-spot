

import { createContext, useContext, useState, useRef, useEffect } from "react"
import { openDB } from "idb"
import axiosApi from "../utils/api.js"
import { useNotification } from "./NotificationContext.jsx"

const DownloadContext = createContext()

const CHUNK_SIZE = 25 * 1024 * 1024  // 25MB per chunk
const MAX_CONCURRENT = 2             // 2 parallel download workers
const DB_NAME = "dataspot_downloads"
const DB_VERSION = 2
const STORE_NAME = "chunks"

// -------------------------------------------------------
// we also store zip job info in indexedDB so after browser
// refresh we can resume folder download from where it left off
// key: "zipjob_${folderId}" => { zipId, fileSize, folderName }
// -------------------------------------------------------
const ZIP_JOB_STORE = "zipjobs"

// initialize indexedDB - now with two stores
// one for chunks, one for zip job info
const initDB = async () => {
    return openDB(DB_NAME, DB_VERSION, {  // bump version for new store
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME)
            }
            // new store for zip job info
            if (!db.objectStoreNames.contains(ZIP_JOB_STORE)) {
                db.createObjectStore(ZIP_JOB_STORE)
            }
        }
    })
}

export function DownloadProvider({ children }) {
    const { showNotification } = useNotification()

    const [sessions, setSessions] = useState([])
    const [isPanelOpen, setIsPanelOpen] = useState(false)
    const [isMinimized, setIsMinimized] = useState(false)

    const activeDownloadsRef = useRef(new Map())  // fileId -> abortController
    // track polling intervals so we can clear them on cancel
    const pollingIntervalsRef = useRef(new Map())  // folderId -> intervalId
    const inProgressFoldersRef = useRef(new Set())
    const inProgressMultipleRef = useRef(new Set())

    const sessionsRef = useRef([])

    // Sync sessionsRef with sessions state
    useEffect(() => {
        sessionsRef.current = sessions
    }, [sessions])

    // Listen to messages from our self-hosted streamsaver service worker
    useEffect(() => {
        const handleServiceWorkerMessage = async (event) => {
            const { type, fileId, progress } = event.data || {}

            if (type === "NATIVE_DOWNLOAD_PROGRESS") {
                setSessions(prev => prev.map(s => {
                    // Match either by fileId or zipId (since fileId inside the SW is the fileId/zipId)
                    if (s.fileId === fileId || s.zipId === fileId) {
                        return { ...s, status: "assembling", progress: 100, assemblyProgress: progress }
                    }
                    return s
                }))
            }

            if (type === "DOWNLOAD_COMPLETE") {
                console.log(`[SW Streamer] Native download completed for fileId: ${fileId}`)
                const db = await initDB()

                const session = sessionsRef.current.find(s => s.fileId === fileId || s.zipId === fileId)
                if (session) {
                    if (session.isFolder) {
                        try {
                            const zipJob = await getZipJob(db, session.fileId)
                            if (zipJob) {
                                await deleteZipJob(db, session.fileId)
                                await axiosApi.delete(`/download/zip/${zipJob.zipId}`)
                            } else if (session.zipId) {
                                await axiosApi.delete(`/download/zip/${session.zipId}`)
                            }
                        } catch (err) {
                            console.error("SW Download complete cleanup failed:", err)
                        }
                    }

                    // Delete chunks from IndexedDB once streamed to disk
                    try {
                        const totalChunks = session.totalChunks || Math.ceil(session.fileSize / CHUNK_SIZE)
                        await cleanupChunks(db, fileId, totalChunks)
                    } catch (e) {
                        console.error("Cleanup chunks failed:", e)
                    }

                    setSessions(prev => prev.map(s => {
                        if (s.fileId === fileId || s.zipId === fileId) {
                            return { ...s, status: "done", progress: 100 }
                        }
                        return s
                    }))
                }
            }
        }

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)
        }
        return () => {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage)
            }
        }
    }, [])


    // update a specific download session
    const updateSession = (sessionId, changes) => {
        setSessions(prev =>
            prev.map(s => s.id === sessionId ? { ...s, ...changes } : s)
        )
    }


    // -------------------------------------------------------
    // IndexedDB helpers - UNTOUCHED from your existing code
    // -------------------------------------------------------
    const saveChunk = async (db, fileId, chunkIndex, data) => {
        await db.put(STORE_NAME, data, `${fileId}_chunk_${chunkIndex}`)
    }

    const getSavedChunks = async (db, fileId, totalChunks) => {
        const saved = new Set()
        for (let i = 0; i < totalChunks; i++) {
            const chunk = await db.get(STORE_NAME, `${fileId}_chunk_${i}`)
            if (chunk) saved.add(i)
        }
        return saved
    }

    const getChunk = async (db, fileId, chunkIndex) => {
        return db.get(STORE_NAME, `${fileId}_chunk_${chunkIndex}`)
    }

    const cleanupChunks = async (db, fileId, totalChunks) => {
        try {
            console.log(`[CLEANUP] Starting cleanup for ${totalChunks} chunks of ${fileId}...`);
            const tx = db.transaction(STORE_NAME, "readwrite")
            for (let i = 0; i < totalChunks; i++) {
                tx.store.delete(`${fileId}_chunk_${i}`)
            }
            await tx.done
            console.log(`[CLEANUP SUCCESS] All chunks deleted for ${fileId}!`);
        } catch (e) {
            console.error(`[CLEANUP ERROR] Failed to delete chunks for ${fileId}:`, e);
        }
    }



    //  this funtion will start here service worker to stream file chunks from index db to the chrome downloa dpanel
    const assembleAndSave = async (db, fileId, totalChunks, fileName, fileType, fileSize, sessionId, isFolder = false, folderId = null, signal = null) => {
        try {
            console.log(`[SW Streamer] Triggering Service Worker download for ${fileName} (${fileSize} bytes)...`);

            // Create a hidden iframe to initiate the service-worker intercepted GET request
            const iframe = document.createElement("iframe");
            iframe.style.display = "none";
            iframe.src = `/native-download/${fileId}?name=${encodeURIComponent(fileName)}&size=${fileSize}`;
            document.body.appendChild(iframe);

            // Clean up the iframe DOM element after 30 seconds
            setTimeout(() => {
                if (iframe.parentNode) {
                    document.body.removeChild(iframe);
                }
            }, 30000);

            console.log(`[SUCCESS] Native download triggered for ${fileName}`);

        } catch (error) {
            console.error("Service worker assembly failed:", error);
            updateSession(sessionId, { status: "error", error: error.message || "Trigger failed" });
        }
    }


    // -------------------------------------------------------
    // NEW - save zip job info to IndexedDB
    // so after browser refresh we can resume folder download
    // key: folderId => { zipId, fileSize, folderName }
    // -------------------------------------------------------
    const saveZipJob = async (db, folderId, zipJobInfo) => {
        await db.put(ZIP_JOB_STORE, zipJobInfo, `zipjob_${folderId}`)
    }

    const getZipJob = async (db, folderId) => {
        return db.get(ZIP_JOB_STORE, `zipjob_${folderId}`)
    }

    const deleteZipJob = async (db, folderId) => {
        await db.delete(ZIP_JOB_STORE, `zipjob_${folderId}`)
    }


    // -------------------------------------------------------
    // CORE CHUNK DOWNLOAD LOGIC
    // extracted into its own function so both downloadFile
    // and downloadFolder can reuse the exact same logic
    // fileId = actual file id OR zipId for folder zips
    // endpoint = the url to fetch chunks from
    // -------------------------------------------------------
    const downloadInChunks = async (fileId, endpoint, fileSize, fileName, fileType, isFolder = false, folderId = null, sessionId) => {
        const totalChunks = Math.ceil(fileSize / CHUNK_SIZE)

        const abortController = new AbortController()
        activeDownloadsRef.current.set(sessionId, abortController)

        try {
            const db = await initDB()
            // const totalChunks = Math.ceil(fileSize / CHUNK_SIZE)
            const savedChunks = await getSavedChunks(db, fileId, totalChunks)
            let downloadedCount = savedChunks.size

            const progress = parseFloat(((downloadedCount / totalChunks) * 100).toFixed(1))

            // check existing progress in indexedDB - resume support


            updateSession(sessionId, {
                progress: parseFloat(((downloadedCount / totalChunks) * 100).toFixed(1))
            })

            // build list of chunks still needed
            const chunksToDownload = []
            for (let i = 0; i < totalChunks; i++) {
                if (!savedChunks.has(i)) {
                    const start = i * CHUNK_SIZE
                    const end = Math.min(start + CHUNK_SIZE, fileSize) - 1
                    chunksToDownload.push({ index: i, start, end })
                }
            }

            // speed tracking
            let bytesInWindow = 0
            let windowStart = Date.now()
            const SPEED_UPDATE_INTERVAL = 1500

            // download chunks with concurrency control
            const queue = [...chunksToDownload]

            const worker = async () => {
                while (queue.length > 0) {
                    if (abortController.signal.aborted) break

                    const chunk = queue.shift()
                    if (!chunk) break

                    try {
                        let lastLoaded = 0;

                        const response = await axiosApi.get(endpoint, {
                            headers: { Range: `bytes=${chunk.start}-${chunk.end}` },
                            responseType: "arraybuffer",
                            signal: abortController.signal,
                            onDownloadProgress: (progressEvent) => {
                                if (abortController.signal.aborted) return;

                                const currentLoaded = progressEvent.loaded || 0;
                                const diff = currentLoaded - lastLoaded;
                                lastLoaded = currentLoaded;

                                bytesInWindow += diff;

                                const now = Date.now();
                                const elapsed = now - windowStart;

                                if (elapsed >= SPEED_UPDATE_INTERVAL) {
                                    const speedMBps = (bytesInWindow / (1024 * 1024)) / (elapsed / 1000);
                                    const currentProgress = parseFloat(((downloadedCount / totalChunks) * 100).toFixed(1));

                                    updateSession(sessionId, { progress: currentProgress, speed: speedMBps });

                                    bytesInWindow = 0;
                                    windowStart = now;
                                }
                            }
                        })

                        if (abortController.signal.aborted) break

                        await saveChunk(db, fileId, chunk.index, response.data)

                        downloadedCount++

                        const progress = parseFloat(((downloadedCount / totalChunks) * 100).toFixed(1))
                        updateSession(sessionId, { progress })

                        await new Promise(r => setTimeout(r, 100))

                    } catch (error) {
                        if (error.name === "CanceledError") return
                        if (abortController.signal.aborted) return
                        if (error.response?.status === 404) return
                        console.warn(`chunk ${chunk.index} failed, retrying...`, error)
                        queue.push(chunk)
                    }
                }
            }

            // run concurrent workers
            await Promise.all(Array(MAX_CONCURRENT).fill(null).map(() => worker()))

            // if finished without abort - assemble and save
            if (!abortController.signal.aborted) {
                const sessionKey = sessionId
                updateSession(sessionKey, { status: "assembling", progress: 100 })

                // Hand off to Service Worker for persistent streaming
                await assembleAndSave(db, fileId, totalChunks, fileName, fileType, fileSize, sessionId, isFolder, folderId, abortController.signal)

                // We don't cleanupChunks immediately because the SW is still reading them!
                // The cleanup should happen once the SW is done or the user closes the session.
                // For now, let's leave it to be cleaned up when the session is closed.
            }

        } catch (error) {
            console.error("downloadInChunks error:", error)
            const sessionKey = sessionId
            updateSession(sessionKey, { status: "error" })
        } finally {
            activeDownloadsRef.current.delete(sessionId)
        }
    }


    // -------------------------------------------------------
    // YOUR EXISTING downloadFile - UNTOUCHED
    // just calls the shared downloadInChunks function now
    // -------------------------------------------------------
    const downloadFile = async (file, token = null) => {
        const activeToken = token || new URLSearchParams(window.location.search).get("token");
        const { _id: fileId, name, fileSize, fileType } = file

        if (sessions.some(s => s.fileId === fileId && (s.status === "downloading" || s.status === "assembling" || s.status === "creating"))) return

        const db = await initDB()
        const totalChunks = Math.ceil(fileSize / CHUNK_SIZE)
        const savedChunks = await getSavedChunks(db, fileId, totalChunks)

        const progress = parseFloat(((savedChunks.size / totalChunks) * 100).toFixed(1))

        const sessionId = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2)

        setSessions(prev => [{
            id: sessionId,
            fileId,
            name,
            fileSize,
            fileType,
            totalChunks,
            status: "downloading",
            progress,
            speed: null,
            error: null
        }, ...prev])

        setIsPanelOpen(true)
        setIsMinimized(false)

        await downloadInChunks(
            fileId,
            `/download/file/${fileId}${activeToken ? `?token=${activeToken}` : ""}`,
            fileSize,
            name,
            fileType,
            false,
            null,
            sessionId
        )
    }


    // -------------------------------------------------------
    // NEW downloadFolder - completely rewritten
    // Phase 1 - create zip on backend and poll until ready
    // Phase 2 - download zip in chunks exactly like a file
    // resume works because zipId and fileSize saved to IndexedDB
    // -------------------------------------------------------
    const downloadFolder = async (folder, token = null) => {
        const activeToken = token || new URLSearchParams(window.location.search).get("token");
        const { _id: folderId, name } = folder

        if (sessions.some(s => s.fileId === folderId && (s.status === "downloading" || s.status === "assembling" || s.status === "creating"))) return
        if (inProgressFoldersRef.current.has(folderId.toString())) return

        inProgressFoldersRef.current.add(folderId.toString())

        const sessionId = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2)

        setSessions(prev => [{
            id: sessionId,
            fileId: folderId,
            name: `${name}.zip`,
            fileSize: null,
            status: "creating",
            progress: 0,
            speed: null,
            isFolder: true
        }, ...prev])

        setIsPanelOpen(true)
        setIsMinimized(false)

        try {
            const db = await initDB()

            let zipId, fileSize, folderName

            const savedZipJob = await getZipJob(db, folderId)

            if (savedZipJob) {
                console.log(`[FOLDER DOWNLOAD] Resuming from saved zip job: ${savedZipJob.zipId}`)
                zipId = savedZipJob.zipId
                fileSize = savedZipJob.fileSize
                folderName = savedZipJob.folderName

                updateSession(sessionId, {
                    status: "downloading",
                    fileSize,
                    name: `${folderName}.zip`,
                    zipId
                })

            } else {
                updateSession(sessionId, { status: "creating" })

                const { data: createData } = await axiosApi.post(`/download/folder/${folderId}${activeToken ? `?token=${activeToken}` : ""}`)

                if (!createData.success) {
                    updateSession(sessionId, { status: "error" })
                    return
                }

                zipId = createData.zipId
                folderName = createData.folderName

                updateSession(sessionId, { zipId })

                fileSize = await new Promise((resolve, reject) => {
                    const interval = setInterval(async () => {
                        try {
                            const { data: statusData } = await axiosApi.get(`/download/zip_status/${zipId}`)

                            if (statusData.status === "ready") {
                                clearInterval(interval)
                                pollingIntervalsRef.current.delete(folderId)
                                resolve(statusData.fileSize)
                            }
                            if (statusData.status === "creating") {
                                updateSession(sessionId, { zipProgress: statusData.progress || 0 })
                            }

                            if (statusData.status === "error") {
                                clearInterval(interval)
                                pollingIntervalsRef.current.delete(folderId)
                                reject(new Error(statusData.error || "Zip creation failed"))
                            }

                        } catch (err) {
                            clearInterval(interval)
                            pollingIntervalsRef.current.delete(folderId)
                            reject(err)
                        }
                    }, 2000)

                    pollingIntervalsRef.current.set(folderId, interval)
                })

                await saveZipJob(db, folderId, { zipId, fileSize, folderName })

                updateSession(sessionId, {
                    status: "downloading",
                    fileSize,
                    name: `${folderName}.zip`,
                    zipId
                })
            }

            await downloadInChunks(
                zipId,
                `/download/zip/${zipId}${activeToken ? `?token=${activeToken}` : ""}`,
                fileSize,
                `${folderName}.zip`,
                "application/zip",
                true,
                folderId,
                sessionId
            )

        } catch (error) {
            console.error("downloadFolder error:", error)
            updateSession(sessionId, { status: "error" })
            const interval = pollingIntervalsRef.current.get(folderId)
            if (interval) {
                clearInterval(interval)
                pollingIntervalsRef.current.delete(folderId)
            }
        } finally {
            inProgressFoldersRef.current.delete(folderId.toString())
        }
    }


    //  her ethis si when user select multiple file then  zip it and download her 
    const downloadMultiple = async (selectedItems, token = null) => {
        const activeToken = token || new URLSearchParams(window.location.search).get("token");
        // selectedItems = array of { _id, name, type } objects

        // stable key — sort ids so same selection always gives same key
        const stableKey = selectedItems
            .map(i => i._id)
            .sort()
            .join("_")

        // check if already downloading this exact selection
        if (sessions.some(s => s.fileId === stableKey && (s.status === "downloading" || s.status === "assembling" || s.status === "creating"))) return
        if (inProgressMultipleRef.current.has(stableKey)) return

        inProgressMultipleRef.current.add(stableKey)

        const sessionId = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2)

        setSessions(prev => [{
            id: sessionId,
            fileId: stableKey,       // used as key in activeDownloadsRef
            name: "docspot_download.zip",
            fileSize: null,
            status: "creating",
            progress: 0,
            speed: null,
            isFolder: true,          // reuse folder cleanup logic
            isMultiple: true
        }, ...prev])

        setIsPanelOpen(true)
        setIsMinimized(false)

        try {
            const db = await initDB()

            let zipId, fileSize, folderName

            // check IndexedDB first — resume support within 2 hours
            const savedZipJob = await getZipJob(db, stableKey)

            if (savedZipJob) {
                console.log(`[MULTIPLE DOWNLOAD] Resuming from saved zip job: ${savedZipJob.zipId}`)
                zipId = savedZipJob.zipId
                fileSize = savedZipJob.fileSize
                folderName = savedZipJob.folderName

                updateSession(sessionId, {
                    status: "downloading",
                    fileSize,
                    name: `${folderName}.zip`,
                    zipId
                })

            } else {
                // send all selected ids to backend
                const ids = selectedItems.map(i => i._id)

                const { data: createData } = await axiosApi.post(`/download/multiple${activeToken ? `?token=${activeToken}` : ""}`, { ids })

                if (!createData.success) {
                    updateSession(sessionId, { status: "error" })
                    return
                }

                zipId = createData.zipId
                folderName = createData.folderName

                // store zipId in session so it can be canceled during creation
                updateSession(sessionId, { zipId })

                // poll until zip is ready — same as downloadFolder
                fileSize = await new Promise((resolve, reject) => {
                    const interval = setInterval(async () => {
                        try {
                            const { data: statusData } = await axiosApi.get(`/download/zip_status/${zipId}`)

                            if (statusData.status === "ready") {
                                clearInterval(interval)
                                pollingIntervalsRef.current.delete(stableKey)
                                resolve(statusData.fileSize)
                            }

                            if (statusData.status === "error") {
                                clearInterval(interval)
                                pollingIntervalsRef.current.delete(stableKey)
                                reject(new Error(statusData.error || "Zip creation failed"))
                            }

                        } catch (err) {
                            clearInterval(interval)
                            pollingIntervalsRef.current.delete(stableKey)
                            reject(err)
                        }
                    }, 2000)

                    pollingIntervalsRef.current.set(stableKey, interval)
                })

                // save to IndexedDB for resume support
                await saveZipJob(db, stableKey, { zipId, fileSize, folderName })

                updateSession(sessionId, {
                    status: "downloading",
                    fileSize,
                    name: `${folderName}.zip`,
                    zipId
                })
            }

            // download in chunks — exactly same as folder download
            await downloadInChunks(
                zipId,
                `/download/zip/${zipId}${activeToken ? `?token=${activeToken}` : ""}`,
                fileSize,
                `${folderName}.zip`,
                "application/zip",
                true,          // isFolder = true so cleanup logic works
                stableKey,     // used as folderId for IndexedDB zip job key
                sessionId
            )

        } catch (error) {
            console.error("downloadMultiple error:", error)
            updateSession(sessionId, { status: "error" })
            const interval = pollingIntervalsRef.current.get(stableKey)
            if (interval) {
                clearInterval(interval)
                pollingIntervalsRef.current.delete(stableKey)
            }
        } finally {
            inProgressMultipleRef.current.delete(stableKey)
        }
    }


    // -------------------------------------------------------
    // abortDownload - clears active download and polling interval
    // -------------------------------------------------------
    const abortDownload = (sessionId, fileId) => {
        const controller = activeDownloadsRef.current.get(sessionId)
        if (controller) {
            controller.abort()
            activeDownloadsRef.current.delete(sessionId)
        }
        // if it's a folder, also clear the zip-status polling interval
        if (fileId) {
            const interval = pollingIntervalsRef.current.get(fileId)
            if (interval) {
                clearInterval(interval)
                pollingIntervalsRef.current.delete(fileId)
            }
        }
    }

    // -------------------------------------------------------
    // closeSession - updated to handle folder zip cleanup
    // -------------------------------------------------------
    const closeSession = async (sessionId) => {
        const session = sessions.find(s => s.id === sessionId)
        if (!session) return;
        const fileId = session.fileId;

        // stop download immediately
        abortDownload(sessionId, fileId)

        //  here ref will delete after user close the download 
        inProgressFoldersRef.current.delete(fileId.toString())
        inProgressMultipleRef.current.delete(fileId)

        const db = await initDB()

        if (session && !session.isFolder) {
            // file - cleanup chunks from IndexedDB
            try {
                await cleanupChunks(db, fileId, session.totalChunks)
            } catch (e) {
                console.error("Chunk cleanup failed:", e)
            }
        }

        if (session && session.isFolder) {
            // folder - cleanup zip job from IndexedDB
            // and delete zip from backend disk
            try {
                const zipJob = await getZipJob(db, fileId)
                if (zipJob) {
                    // delete chunks saved for this zip
                    const totalChunks = Math.ceil(zipJob.fileSize / CHUNK_SIZE)
                    await cleanupChunks(db, zipJob.zipId, totalChunks)
                    // delete zip job record
                    await deleteZipJob(db, fileId)
                    // tell backend to delete zip file from disk
                    await axiosApi.delete(`/download/zip/${zipJob.zipId}`)
                } else if (session.zipId) {
                    // If canceled during Phase 1 (zipping in progress)
                    await axiosApi.delete(`/download/zip/${session.zipId}`)
                }
            } catch (e) {
                console.error("Zip cleanup failed:", e)
            }
        }

        setSessions(prev => {
            const updated = prev.filter(s => s.id !== sessionId)
            if (updated.length === 0) setIsPanelOpen(false)
            return updated
        })
    }


    // -------------------------------------------------------
    // closeAllSessions - updated to handle folders too
    // -------------------------------------------------------
    const closeAllSessions = async () => {
        // stop all downloads immediately
        activeDownloadsRef.current.forEach((controller) => controller.abort())
        activeDownloadsRef.current.clear()

        // clear all polling intervals
        pollingIntervalsRef.current.forEach((interval) => clearInterval(interval))
        pollingIntervalsRef.current.clear()

        try {
            const db = await initDB()
            for (const session of sessions) {
                if (!session.isFolder) {
                    // cleanup file chunks
                    await cleanupChunks(db, session.fileId, session.totalChunks)
                } else {
                    // cleanup folder zip job and chunks
                    const zipJob = await getZipJob(db, session.fileId)
                    if (zipJob) {
                        const totalChunks = Math.ceil(zipJob.fileSize / CHUNK_SIZE)
                        await cleanupChunks(db, zipJob.zipId, totalChunks)
                        await deleteZipJob(db, session.fileId)
                        // tell backend to delete zip file from disk
                        try {
                            await axiosApi.delete(`/download/zip/${zipJob.zipId}`)
                        } catch (err) {
                            console.error("deleteZip failed:", err.message)
                        }
                    } else if (session.zipId) {
                        // If canceled during Phase 1 (zipping in progress)
                        try {
                            await axiosApi.delete(`/download/zip/${session.zipId}`)
                        } catch (err) {
                            console.error("deleteZip failed:", err.message)
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Cleanup all failed:", e)
        }

        setSessions([])
        setIsPanelOpen(false)
    }

    const toggleMinimized = () => {
        setIsMinimized(prev => !prev)
    }


    return (
        <DownloadContext.Provider value={{
            sessions,
            isPanelOpen,
            isMinimized,
            toggleMinimized,
            downloadFile,
            downloadMultiple,
            downloadFolder,
            closeSession,
            closeAllSessions
        }}>
            {children}
        </DownloadContext.Provider>
    )
}

export function useDownload() {
    return useContext(DownloadContext)
}






