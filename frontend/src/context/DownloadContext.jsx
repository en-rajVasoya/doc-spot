import { createContext, useContext, useState, useRef, useEffect } from "react"
import { openDB } from "idb"
import axiosApi from "../utils/api.js"
import { useNotification } from "./NotificationContext.jsx"
import { detectIncognito } from "detectincognitojs"
import DownloadLocationModal from "../components/modals/DownloadLocationModal"
import { createStallGuard, waitForOnline } from "../utils/stallGuard.js"

const DownloadContext = createContext()

const CHUNK_SIZE = 25 * 1024 * 1024   // 25MB per chunk
const MAX_CONCURRENT = 2              // 2 parallel chunk downloads
const MAX_RETRIES = 3


// for the size of download reusem support
const STREAM_MAX_SIZE = Number(import.meta.env.VITE_DOWNLOAD_RESUME_SIZE || 5120) * 1024 * 1024


//  while merging the chunks delete merged chunks so space wont be twice here
const DELETE_PARTS_WHILE_MERGING = true

const DB_NAME = "dataspot_downloads"     // indexDB name 
const DB_VERSION = 7

const OLD_CHUNK_STORE = "chunks"      // old code for storing the chunks in index db
const ZIP_JOB_STORE = "zipjobs"       // { zipId, fileSize, folderName })
const DIR_STORE = "dirhandles"        // user directory picker save in index db for all fiel downlaod this folder path
const DIR_KEY = "download_dir"        // key of the fodler path here

// Chrome and Edge support the folder picker. Firefox and Safari use a normal browser download.
const SUPPORTS_FOLDER_PICKER = typeof window !== "undefined" && "showDirectoryPicker" in window

// Cached incognito detection result so it only runs once per session
let isPrivateSessionCache = null
//in normal chrome profile run index db otherwise run in memory
const canPersistHandle = async () => {
    try {
        if (isPrivateSessionCache !== null) {
            return !isPrivateSessionCache
        }

        const result = await detectIncognito()
        isPrivateSessionCache = result.isPrivate

        console.log(`[STORAGE] detectIncognito: isPrivate=${result.isPrivate}, browser=${result.browserName}`)

        // If Incognito / Private / Guest: stay in RAM only! (returns false)
        if (result.isPrivate) {
            console.log("[STORAGE] Incognito detected: Handle will remain in-memory only (never saved to IndexedDB).")
            return false
        }

        // If Normal Chrome: allow saving to IndexedDB! (returns true)
        console.log("[STORAGE] Normal profile detected: Storing handle in IndexedDB is enabled!")
        return true

    } catch (error) {
        console.warn("[STORAGE] detectIncognito failed, staying safe in RAM:", error)
        return false // If unsure, stay on the safe side in memory
    }
}

// returns true only if the handle still points to an existing folder we can write to
const isHandleUsable = async (handle) => {
    if (!handle) return false
    try {
        let perm = await handle.queryPermission({ mode: "readwrite" })
        if (perm !== "granted") perm = await handle.requestPermission({ mode: "readwrite" })
        if (perm !== "granted") return false
        await handle.values().next()   // throws NotFoundError if the folder was deleted
        return true
    } catch (e) {
        return false
    }
}

// -------------------------------------------------------
// IndexedDB - only small data lives here now (no file data)
// -------------------------------------------------------
const initDB = async () => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (db.objectStoreNames.contains(OLD_CHUNK_STORE)) {
                db.deleteObjectStore(OLD_CHUNK_STORE)
            }
            if (!db.objectStoreNames.contains(ZIP_JOB_STORE)) {
                db.createObjectStore(ZIP_JOB_STORE)
            }
            if (!db.objectStoreNames.contains(DIR_STORE)) {
                db.createObjectStore(DIR_STORE)
            }
        }
    })
}

//  save the zip job info in to the index db table 
const saveZipJob = async (db, key, info) => db.put(ZIP_JOB_STORE, info, `zipjob_${key}`)

// loook up and return saved any zip job  
const getZipJob = async (db, key) => db.get(ZIP_JOB_STORE, `zipjob_${key}`)

//  after download delete the zip job
const deleteZipJob = async (db, key) => db.delete(ZIP_JOB_STORE, `zipjob_${key}`)


// -------------------------------------------------------
// Part file helpers (files on the user's real disk)
// -------------------------------------------------------
//  creates a temporary folder in the disk for saving chunks
const partsDirName = (fileId) => `.docspot-parts-${String(fileId).replace(/[^a-zA-Z0-9_-]/g, "_")}`
const partName = (index) => `part_${String(index).padStart(6, "0")}`

const parsePartIndex = (name) => {
    const match = /^part_(\d{6})$/.exec(name)
    return match ? parseInt(match[1], 10) : null
}

// exact size a chunk must have (last chunk is smaller)
const expectedChunkSize = (index, fileSize) => {
    const start = index * CHUNK_SIZE
    return Math.min(start + CHUNK_SIZE, fileSize) - start
}

const getPartsDir = async (dirHandle, fileId) => {
    return dirHandle.getDirectoryHandle(partsDirName(fileId), { create: true })
}

// delete every part file one by one (a busy file can not block the others),
// then delete the empty folder. Retries because a file may still be closing.
const removePartsDir = async (dirHandle, fileId) => {
    if (!dirHandle) return

    let partsDir
    try {
        partsDir = await dirHandle.getDirectoryHandle(partsDirName(fileId))
    } catch (e) {
        return   // folder does not exist, nothing to clean
    }

    for (let attempt = 0; attempt < 4; attempt++) {
        const names = []
        try {
            for await (const [name] of partsDir.entries()) names.push(name)
        } catch (e) {
            console.warn("[PARTS CLEANUP] could not list parts:", e.name)
        }
        if (names.length === 0) break

        for (const name of names) {
            try {
                await partsDir.removeEntry(name)
            } catch (e) {
                console.warn("[PARTS CLEANUP] could not delete", name, e.name)
            }
        }
        await new Promise(r => setTimeout(r, 300))
    }

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            await dirHandle.removeEntry(partsDirName(fileId))
            return
        } catch (e) {
            if (e.name === "NotFoundError") return
            if (attempt === 2) console.error("[PARTS CLEANUP] folder delete failed:", e.name, e.message)
            else await new Promise(r => setTimeout(r, 300))
        }
    }
}

// write one chunk as its own small file and close it right away
// (Chrome only keeps the data after close, so a finished part file is always complete)
const writePartFile = async (partsDir, index, data) => {
    const fileHandle = await partsDir.getFileHandle(partName(index), { create: true })
    const writable = await fileHandle.createWritable()
    try {
        await writable.write(data)
        await writable.close()
    } catch (err) {
        try { await writable.abort() } catch (e) { }
        throw err
    }
}

// return how many chunks are saved in the folder so resume can happen
const getSavedChunks = async (partsDir, totalChunks, fileSize) => {
    const saved = new Set()
    try {
        for await (const [name, handle] of partsDir.entries()) {
            if (handle.kind !== "file") continue
            const index = parsePartIndex(name)
            if (index === null || index >= totalChunks) continue

            const file = await handle.getFile()
            if (file.size === expectedChunkSize(index, fileSize)) {
                saved.add(index)
            } else {
                // wrong size = broken part, delete it so it downloads again
                try { await partsDir.removeEntry(name) } catch (e) { }
            }
        }
    } catch (err) {
        console.warn("[PARTS] could not read parts folder:", err)
    }
    return saved
}

// if movie.mp4 already exists, use "movie (1).mp4" so we never overwrite a user's file
const getUniqueFileName = async (dirHandle, fileName) => {
    const dot = fileName.lastIndexOf(".")
    const base = dot > 0 ? fileName.slice(0, dot) : fileName
    const ext = dot > 0 ? fileName.slice(dot) : ""

    let candidate = fileName
    let counter = 0
    while (true) {
        try {
            await dirHandle.getFileHandle(candidate)   // throws NotFoundError if it does not exist
            counter++
            candidate = `${base} (${counter})${ext}`
        } catch (err) {
            if (err.name === "NotFoundError") return candidate
            throw err
        }
    }
}

// browser download for Firefox / Safari (no folder picker there)
const startNativeDownload = (endpoint, name) => {
    const base = (axiosApi.defaults?.baseURL || "").replace(/\/$/, "")
    const a = document.createElement("a")
    a.href = `${base}${endpoint}`
    a.download = name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
}

const makeSessionId = () =>
    (window.crypto && window.crypto.randomUUID)
        ? window.crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).substring(2)


export function DownloadProvider({ children }) {
    const { showNotification } = useNotification()

    const [sessions, setSessions] = useState([])
    const [isPanelOpen, setIsPanelOpen] = useState(false)
    const [isMinimized, setIsMinimized] = useState(false)

    const activeDownloadsRef = useRef(new Map())    // sessionId -> abortController
    const pollingIntervalsRef = useRef(new Map())   // folderId / stableKey -> intervalId
    const inProgressFoldersRef = useRef(new Set())
    const inProgressMultipleRef = useRef(new Set())
    const dirHandlesRef = useRef(new Map())         // sessionId -> FileSystemDirectoryHandle
    const downloadDoneRef = useRef(new Map())       // sessionId -> promise that resolves when the download fully stops

    const inMemoryDirHandleRef = useRef(null)
    const [downloadFolderName, setDownloadFolderName] = useState(() => {
        try {
            return localStorage.getItem("docspot_download_folder_name") || ""
        } catch (e) {
            return ""
        }
    })

    // Silently check if there is an existing saved folder on mount so UI knows the folder name
    useEffect(() => {
        getSavedDirSilently().then(handle => {
            if (handle?.name) {
                setDownloadFolderName(handle.name)
                try { localStorage.setItem("docspot_download_folder_name", handle.name) } catch (e) { }
            }
        }).catch(() => { })
    }, [])

    const sessionsRef = useRef([])
    useEffect(() => {
        sessionsRef.current = sessions
    }, [sessions])

    const updateSession = (sessionId, changes) => {
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, ...changes } : s))
    }


    // -------------------------------------------------------
    // Folder picker - asks once, then remembers the folder.
    // After a refresh, the browser only asks for permission again (one click).
    // -------------------------------------------------------
    const [showFolderGuidance, setShowFolderGuidance] = useState(false)
    let guidanceResolveRef = useRef(null)

    const waitForUserGuidance = () => {
        return new Promise((resolve) => {
            guidanceResolveRef.current = resolve
            setShowFolderGuidance(true)
        })
    }

    const forgetSavedDirectory = async () => {
        inMemoryDirHandleRef.current = null
        setDownloadFolderName("")
        try { localStorage.removeItem("docspot_download_folder_name") } catch (e) { }

        // only touch IndexedDB in a normal profile
        try {
            if (await canPersistHandle()) {
                const db = await initDB()
                await db.delete(DIR_STORE, DIR_KEY)
            }
        } catch (e) { }
    }

    const pickDownloadDirectory = async (forcePick = false) => {
        // 1. In-memory handle, but only if the folder still exists
        if (!forcePick && inMemoryDirHandleRef.current) {
            if (await isHandleUsable(inMemoryDirHandleRef.current)) {
                return inMemoryDirHandleRef.current
            }
            await forgetSavedDirectory()   // folder deleted -> clear and ask again
        }

        const canPersist = await canPersistHandle()
        const db = await initDB()

        // 2. IndexedDB only in a normal profile
        if (!forcePick && canPersist) {
            const saved = await db.get(DIR_STORE, DIR_KEY).catch(() => null)
            if (saved) {
                if (await isHandleUsable(saved)) {
                    inMemoryDirHandleRef.current = saved
                    if (saved.name) setDownloadFolderName(saved.name)
                    return saved
                }
                await forgetSavedDirectory()   // stale saved handle -> remove it
            }
        }

        // 3. Guidance modal + picker
        const userAgreed = await waitForUserGuidance()
        if (!userAgreed) return null

        try {
            const handle = await window.showDirectoryPicker({ id: "docspot-downloads", mode: "readwrite" })

            inMemoryDirHandleRef.current = handle
            if (handle?.name) {
                setDownloadFolderName(handle.name)
                try { localStorage.setItem("docspot_download_folder_name", handle.name) } catch (e) { }
            }

            if (canPersist) {
                await db.put(DIR_STORE, handle, DIR_KEY).catch(() => { })
            }

            return handle
        } catch (err) {
            if (err.name === "AbortError") return null
            console.error("Directory picker error:", err)
            return null   // was: pickDownloadDirectory(true), which could loop forever
        }
    }


    // lets the user pick a different download folder
    const changeDownloadFolder = async () => {
        if (!SUPPORTS_FOLDER_PICKER) return null
        const handle = await pickDownloadDirectory(true)
        if (handle) {
            inMemoryDirHandleRef.current = handle
            if (handle.name) {
                setDownloadFolderName(handle.name)
                try { localStorage.setItem("docspot_download_folder_name", handle.name) } catch (e) { }
            }
            showNotification("Download folder updated", "success", "bottom-center")
            return handle.name
        }
        return null
    }

    // used by cleanup code - never opens a popup, only returns the folder if permission is already granted
    const getSavedDirSilently = async () => {
        const validate = async (handle) => {
            try {
                if ((await handle.queryPermission({ mode: "readwrite" })) !== "granted") return false
                await handle.values().next()
                return true
            } catch (e) {
                return false
            }
        }

        if (inMemoryDirHandleRef.current) {
            if (await validate(inMemoryDirHandleRef.current)) return inMemoryDirHandleRef.current
            await forgetSavedDirectory()
            return null
        }

        try {
            if (!(await canPersistHandle())) return null
            const db = await initDB()
            const saved = await db.get(DIR_STORE, DIR_KEY)
            if (saved && (await validate(saved))) {
                inMemoryDirHandleRef.current = saved
                return saved
            }
            if (saved) await forgetSavedDirectory()
        } catch (e) { }
        return null
    }


    // -------------------------------------------------------
    // Zip cleanup on the backend + IndexedDB zip job
    // -------------------------------------------------------
    const cleanupZip = async (db, key, zipId) => {
        try {
            const zipJob = await getZipJob(db, key)
            const idToDelete = zipJob?.zipId || zipId
            if (zipJob) await deleteZipJob(db, key)
            if (idToDelete) await axiosApi.delete(`/download/zip/${idToDelete}`)
        } catch (err) {
            console.error("Zip cleanup failed:", err)
        }
    }


    // -------------------------------------------------------
    // MERGE: read part 1 -> write into final file -> delete part 1 -> repeat
    // -------------------------------------------------------
    const assembleAndSave = async (fileId, totalChunks, fileName, fileSize, sessionId, isFolder = false, folderId = null, signal = null) => {
        const dirHandle = dirHandlesRef.current.get(sessionId)
        let finalName = null
        let writable = null

        try {
            const partsDir = await getPartsDir(dirHandle, fileId)

            finalName = await getUniqueFileName(dirHandle, fileName)
            const finalHandle = await dirHandle.getFileHandle(finalName, { create: true })
            writable = await finalHandle.createWritable()

            let lastReported = 0
            for (let i = 0; i < totalChunks; i++) {
                if (signal?.aborted) {
                    await writable.abort()
                    writable = null
                    try { await dirHandle.removeEntry(finalName) } catch (e) { }
                    return
                }

                const partHandle = await partsDir.getFileHandle(partName(i))   // throws if missing
                const partFile = await partHandle.getFile()
                if (partFile.size !== expectedChunkSize(i, fileSize)) {
                    throw new Error(`Part ${i} has wrong size`)
                }

                await writable.write(partFile)

                if (DELETE_PARTS_WHILE_MERGING) {
                    await partsDir.removeEntry(partName(i))
                }

                const progress = Math.round(((i + 1) / totalChunks) * 100)
                if (progress - lastReported >= 2 || progress === 100) {
                    lastReported = progress
                    updateSession(sessionId, { status: "assembling", progress: 100, assemblyProgress: progress })
                }
            }

            await writable.close()
            writable = null

            // check the final file size before we say it is done
            const finalFile = await finalHandle.getFile()
            if (finalFile.size !== fileSize) {
                throw new Error("Final file size does not match, please download again")
            }

            // remove the parts folder (all parts if we kept them, or just the empty folder)
            await removePartsDir(dirHandle, fileId)

            // mark done first so the UI has no lag, then clean the backend in background
            setSessions(prev => prev.map(s => {
                if (s.id === sessionId) {
                    return { ...s, status: "done", progress: 100, assemblyProgress: 100, savedAs: finalName }
                }
                return s
            }))
            dirHandlesRef.current.delete(sessionId)

            if (isFolder) {
                const db = await initDB()
                cleanupZip(db, folderId || fileId, fileId)
            }

        } catch (error) {
            if (writable) {
                try { await writable.abort() } catch (e) { }
            }
            if (finalName) {
                try { await dirHandle.removeEntry(finalName) } catch (e) { }   // remove the empty file we created
            }
            console.error("Assembly failed:", error)
            updateSession(sessionId, {
                status: "error",
                error: error.message || "Could not save the file"
            })
        }
    }


    // -------------------------------------------------------
    // CORE CHUNK DOWNLOAD (used by files and by zips)
    // fileId = file id OR zipId, endpoint = url to fetch chunks from
    // -------------------------------------------------------
    const downloadInChunks = async (fileId, endpoint, fileSize, fileName, fileType, isFolder = false, folderId = null, sessionId) => {
        // cancel waits on this promise, so it only deletes files after all writes have stopped
        let resolveDone
        const donePromise = new Promise(r => { resolveDone = r })
        downloadDoneRef.current.set(sessionId, donePromise)

        const totalChunks = Math.ceil(fileSize / CHUNK_SIZE)
        const dirHandle = dirHandlesRef.current.get(sessionId)

        const abortController = new AbortController()
        activeDownloadsRef.current.set(sessionId, abortController)

        try {
            const db = await initDB()
            const partsDir = await getPartsDir(dirHandle, fileId)

            // resume: look in the folder, download only the missing chunks
            const savedChunks = await getSavedChunks(partsDir, totalChunks, fileSize)
            let downloadedCount = savedChunks.size

            updateSession(sessionId, {
                progress: totalChunks ? parseFloat(((downloadedCount / totalChunks) * 100).toFixed(1)) : 0
            })

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

            const queue = [...chunksToDownload]
            let failed = false

            const failDownload = async ({ message, deleteData }) => {
                if (failed) return
                failed = true

                queue.length = 0
                abortController.abort()

                if (deleteData) {
                    // small pause so a chunk that is closing right now can finish first
                    await new Promise(r => setTimeout(r, 500))
                    await removePartsDir(dirHandle, fileId)
                    if (isFolder) {
                        await cleanupZip(db, folderId || fileId, fileId)
                    }
                }
                updateSession(sessionId, { status: "error", error: message, progress: 0, speed: null })
            }

            const worker = async () => {
                while (queue.length > 0) {
                    if (abortController.signal.aborted) break

                    const chunk = queue.shift()
                    if (!chunk) break

                    let chunkSuccess = false
                    let retries = 0
                    const MAX_RETRIES = 3

                    // this specific chunk up to 3 times before failing
                    while (!chunkSuccess) {
                        if (abortController.signal.aborted || failed) break

                        const guard = createStallGuard(abortController.signal)
                        try {
                            let lastLoaded = 0

                            const response = await axiosApi.get(endpoint, {
                                headers: { Range: `bytes=${chunk.start}-${chunk.end}` },
                                responseType: "arraybuffer",
                                signal: guard.signal,
                                timeout: 0,
                                onDownloadProgress: (progressEvent) => {
                                    guard.touch()
                                    if (abortController.signal.aborted) return

                                    const currentLoaded = progressEvent.loaded || 0
                                    const diff = currentLoaded - lastLoaded
                                    lastLoaded = currentLoaded
                                    bytesInWindow += diff

                                    const now = Date.now()
                                    const elapsed = now - windowStart

                                    if (elapsed >= SPEED_UPDATE_INTERVAL) {
                                        const speedMBps = (bytesInWindow / (1024 * 1024)) / (elapsed / 1000)
                                        const currentProgress = parseFloat(((downloadedCount / totalChunks) * 100).toFixed(1))
                                        updateSession(sessionId, { progress: currentProgress, speed: speedMBps })
                                        bytesInWindow = 0
                                        windowStart = now
                                    }
                                }
                            })

                            // cancelled while this chunk was arriving - do not write it
                            if (abortController.signal.aborted) {
                                guard.cleanup()
                                break
                            }

                            // a short or broken chunk must never be saved as a part file
                            const expected = chunk.end - chunk.start + 1
                            if (response.data.byteLength !== expected) {
                                throw new Error(`Chunk ${chunk.index} size mismatch`)
                            }

                            // write to disk as a small file and close it right away
                            await writePartFile(partsDir, chunk.index, response.data)

                            downloadedCount++
                            updateSession(sessionId, {
                                progress: parseFloat(((downloadedCount / totalChunks) * 100).toFixed(1))
                            })

                            chunkSuccess = true // Success! Breaks inner while loop, 
                            guard.cleanup()

                            await new Promise(r => setTimeout(r, 100))

                        } catch (error) {
                            guard.cleanup()
                            if (error.name === "CanceledError" || abortController.signal.aborted) return

                            // disk / folder problems - retrying will not help
                            if (error.name === "QuotaExceededError") {
                                await failDownload({ message: "Not enough free disk space", deleteData: false })
                                return
                            }
                            if (["NotAllowedError", "NotFoundError", "SecurityError", "InvalidStateError"].includes(error.name)) {
                                await failDownload({ message: "Cannot write to the selected folder", deleteData: false })
                                return
                            }

                            const status = error.response?.status

                            if (status === 401) {
                                await failDownload({ message: "Session expired, please log in again", deleteData: true })
                                return
                            }
                            if (status === 403) {
                                await failDownload({ message: "Access to this file was removed", deleteData: true })
                                return
                            }
                            if (status === 404) {
                                await failDownload({ message: "File not found or no longer available", deleteData: true })
                                return
                            }

                            // If device is offline, wait up to 60s for Wi-Fi to reconnect before burning retries!
                            if (typeof navigator !== "undefined" && !navigator.onLine) {
                                console.warn(`[DOWNLOAD] chunk ${chunk.index} is offline. Waiting up to 60s for network...`)
                                const backOnline = await waitForOnline(60000)
                                if (!backOnline) {
                                    await failDownload({ message: "Network connection lost", deleteData: false })
                                    return
                                }
                                continue
                            }

                            // Network drop / Wi-Fi switch: retry the EXACT SAME chunk with backoff (2s, 4s, 6s)
                            retries++
                            if (retries <= MAX_RETRIES) {
                                console.warn(`[DOWNLOAD] chunk ${chunk.index} failed (attempt ${retries}/${MAX_RETRIES}), retrying in ${2 * retries}s...`)
                                await new Promise(r => setTimeout(r, 2000 * retries))
                                continue
                            }

                            // Retries exhausted (> 12 seconds with no internet): stop the download
                            console.error(`[DOWNLOAD] Connection lost on chunk ${chunk.index}. Stopping download immediately.`)
                            await failDownload({ message: "Connection lost", deleteData: false })
                            return
                        }
                    }

                }
            }

            await Promise.all(Array(MAX_CONCURRENT).fill(null).map(() => worker()))

            if (failed || abortController.signal.aborted) return

            // safety net: never merge a file that has holes
            const finalSaved = await getSavedChunks(partsDir, totalChunks, fileSize)
            if (finalSaved.size !== totalChunks) {
                updateSession(sessionId, { status: "error", error: "Download incomplete, please retry", speed: null })
                return
            }

            updateSession(sessionId, { status: "assembling", progress: 100, speed: null })
            await assembleAndSave(fileId, totalChunks, fileName, fileSize, sessionId, isFolder, folderId, abortController.signal)

        } catch (error) {
            console.error("downloadInChunks error:", error)
            updateSession(sessionId, { status: "error", error: error.message || "Download failed" })
        } finally {
            activeDownloadsRef.current.delete(sessionId)
            resolveDone()
            downloadDoneRef.current.delete(sessionId)
        }
    }


    // -------------------------------------------------------
    // ZIP helpers (used by folder download and multiple download)
    // -------------------------------------------------------
    const pollZipUntilReady = (zipId, key, sessionId, intervalMs, showZipProgress) => {
        return new Promise((resolve, reject) => {
            const interval = setInterval(async () => {
                try {
                    const { data: statusData } = await axiosApi.get(`/download/zip_status/${zipId}`)

                    if (statusData.status === "ready") {
                        clearInterval(interval)
                        pollingIntervalsRef.current.delete(key)
                        resolve(statusData.fileSize)
                    }

                    if (statusData.status === "creating" && showZipProgress) {
                        updateSession(sessionId, { zipProgress: statusData.progress || 0 })
                    }

                    if (statusData.status === "error") {
                        clearInterval(interval)
                        pollingIntervalsRef.current.delete(key)
                        reject(new Error(statusData.error || "Zip creation failed"))
                    }
                } catch (err) {
                    clearInterval(interval)
                    pollingIntervalsRef.current.delete(key)
                    reject(err)
                }
            }, intervalMs)

            pollingIntervalsRef.current.set(key, { interval, reject })
        })
    }

    // shared flow: create zip -> wait until ready -> download it (chunks, or native download)
    const runZipFlow = async ({ key, sessionId, dirHandle, tokenQuery, createRequest, pollMs, showZipProgress }) => {
        const db = await initDB()
        let zipId, fileSize, folderName

        const savedZipJob = dirHandle ? await getZipJob(db, key) : null
        // 1. If saved zip exists, verify if the backend still has it
        if (savedZipJob) {
            try {
                // Quick 10ms check to see if the server still has this zip ready
                const { data } = await axiosApi.get(`/download/zip_status/${savedZipJob.zipId}`)
                if (data.status === "ready") {
                    console.log(`[ZIP DOWNLOAD] Resuming from saved zip job: ${savedZipJob.zipId}`)
                    zipId = savedZipJob.zipId
                    fileSize = savedZipJob.fileSize || data.fileSize
                    folderName = savedZipJob.folderName || data.folderName
                    updateSession(sessionId, { status: "downloading", fileSize, name: `${folderName}.zip`, zipId })
                } else {
                    throw new Error("Zip expired")
                }
            } catch (err) {
                // Backend deleted the zip (2 hours passed or server restart)
                console.log("[ZIP] Saved zip expired on server, creating fresh zip...")
                await deleteZipJob(db, key) // Remove stale ID from IndexedDB
                zipId = null               // Set to null so it creates a new one below
            }
        }
        // 2. If no saved zip (or if the old one expired above), create a brand new one!
        if (!zipId) {
            updateSession(sessionId, { status: "creating" })
            const { data: createData } = await createRequest()
            if (!createData.success) {
                updateSession(sessionId, { status: "error" })
                return
            }
            zipId = createData.zipId
            folderName = createData.folderName
            updateSession(sessionId, { zipId })
            fileSize = await pollZipUntilReady(zipId, key, sessionId, pollMs, showZipProgress)
            // Only save to IndexedDB for 5GB+ zips (small zips don't need resume)
            if (dirHandle && fileSize > STREAM_MAX_SIZE) {
                await saveZipJob(db, key, { zipId, fileSize, folderName })
            }
            updateSession(sessionId, { status: "downloading", fileSize, name: `${folderName}.zip`, zipId })
        }
        // 3. Firefox / Safari check
        if (!dirHandle) {
            startNativeDownload(`/download/zip/${zipId}${tokenQuery}`, `${folderName}.zip`)
            updateSession(sessionId, { status: "done", progress: 100, nativeHandoff: true })
            return
        }
        // 4. Stream if under 5GB
        if (fileSize <= STREAM_MAX_SIZE) {
            const success = await streamDownloadToFile(
                `/download/zip/${zipId}${tokenQuery}`,
                `${folderName}.zip`,
                fileSize,
                sessionId
            )
            if (success) {
                cleanupZip(db, key, zipId) // Finished successfully, delete from server
            } else {
                await deleteZipJob(db, key) // Failed or cancelled, delete from IndexedDB
            }
            return
        }
        // ─── ZIP 5GB OR GREATER: Chunked download with resume ───
        await downloadInChunks(
            zipId,
            `/download/zip/${zipId}${tokenQuery}`,
            fileSize,
            `${folderName}.zip`,
            "application/zip",
            true,
            key,
            sessionId
        )


    }

    const clearPolling = (key) => {
        const item = pollingIntervalsRef.current.get(key)
        if (item) {
            clearInterval(item.interval || item)
            if (item.reject) item.reject(new Error("Cancelled"))
            pollingIntervalsRef.current.delete(key)
        }
    }


    // -------------------------------------------------------
    // Direct downlaod small files
    // -------------------------------------------------------
    const streamDownloadToFile = async (endpoint, fileName, fileSize, sessionId) => {
        let resolveDone
        downloadDoneRef.current.set(sessionId, new Promise(r => { resolveDone = r }))

        const dirHandle = dirHandlesRef.current.get(sessionId)
        const abortController = new AbortController()
        activeDownloadsRef.current.set(sessionId, abortController)

        let writable = null
        let finalName = null

        let stage = "start"
        let lastActivity = Date.now()
        let stalled = false

        // The Watchdog Timer to catch Chromium API freezes and Network drops
        const watchdog = setInterval(() => {
            if (Date.now() - lastActivity > 10000) { // 10 seconds frozen
                stalled = true
                clearInterval(watchdog)

                if (stage === "closing") {
                    // Chrome is stuck scanning the fully saved file! Force UI to done!
                    console.log(`[WATCHDOG] Frozen during close. Forcing UI to Done for ${fileName}.`)
                    updateSession(sessionId, { status: "done", progress: 100, speed: null, savedAs: finalName })
                    dirHandlesRef.current.delete(sessionId)
                } else {
                    // Frozen during network transfer. Abort and show Retry.
                    console.log(`[WATCHDOG] Frozen during ${stage}. Aborting download.`)
                    abortController.abort()
                    updateSession(sessionId, { status: "error", error: "Download stalled, please retry", speed: null })
                }
            }
        }, 3000)

        try {
            finalName = await getUniqueFileName(dirHandle, fileName)
            const fileHandle = await dirHandle.getFileHandle(finalName, { create: true })
            writable = await fileHandle.createWritable()

            const base = (axiosApi.defaults?.baseURL || "").replace(/\/$/, "")
            const response = await fetch(`${base}${endpoint}`, {
                credentials: "include",
                signal: abortController.signal
            })

            if (!response.ok) {
                const err = new Error("Download failed")
                err.status = response.status
                throw err
            }

            const reader = response.body.getReader()
            let loaded = 0
            let bytesInWindow = 0
            let windowStart = Date.now()

            stage = "reading"
            while (true) {
                const { done, value } = await reader.read()
                lastActivity = Date.now()
                if (done) break

                stage = "writing"
                await writable.write(value)
                lastActivity = Date.now()
                stage = "reading"

                loaded += value.length
                bytesInWindow += value.length

                const now = Date.now()
                if (now - windowStart >= 500) {
                    const speed = (bytesInWindow / (1024 * 1024)) / ((now - windowStart) / 1000)
                    updateSession(sessionId, {
                        progress: fileSize ? parseFloat(((loaded / fileSize) * 100).toFixed(1)) : 0,
                        speed
                    })
                    bytesInWindow = 0
                    windowStart = now
                }
            }

            stage = "closing"
            lastActivity = Date.now()

            // Show "Saving..." in the UI right before we wait on the Chromium close() API
            updateSession(sessionId, { status: "assembling", progress: 100, speed: null })

            await writable.close()
            writable = null

            // If the watchdog already caught a stall, quietly exit out since UI is already handled
            if (stalled || abortController.signal.aborted) {
                if (stalled && stage === "closing") return true;
                try { await dirHandle.removeEntry(finalName) } catch (e) { }
                return false
            }

            updateSession(sessionId, { status: "done", progress: 100, speed: null, savedAs: finalName })
            dirHandlesRef.current.delete(sessionId)
            return true

        } catch (error) {
            // If the watchdog caught a stall, we just exit, UI is already updated
            if (stalled) {
                if (stage === "closing") return true;
                return false;
            }

            if (writable) { try { await writable.abort() } catch (e) { } }
            if (finalName && dirHandle) { try { await dirHandle.removeEntry(finalName) } catch (e) { } }

            if (abortController.signal.aborted || error.name === "AbortError") return

            let message = "Download failed"
            if (error.name === "QuotaExceededError") message = "Not enough free disk space"
            else if (error.status === 401) message = "Session expired, please log in again"
            else if (error.status === 403) message = "Access to this file was removed"
            else if (error.status === 404) message = "File not found or no longer available"
            else if (error.name === "TypeError") message = "Connection lost"

            updateSession(sessionId, { status: "error", error: message, speed: null })
            return false
        } finally {
            clearInterval(watchdog)
            activeDownloadsRef.current.delete(sessionId)
            resolveDone()
            downloadDoneRef.current.delete(sessionId)
        }
    }



    // -------------------------------------------------------
    // DOWNLOAD FILE
    // -------------------------------------------------------
    const downloadFile = async (file, token = null) => {
        const activeToken = token || new URLSearchParams(window.location.search).get("token")
        const { _id: fileId, name, fileSize, fileType } = file
        const tokenQuery = activeToken ? `?token=${activeToken}` : ""
        const endpoint = `/download/file/${fileId}${tokenQuery}`

        if (sessions.some(s => s.fileId === fileId && ["downloading", "assembling", "creating"].includes(s.status))) return

        // Firefox / Safari: normal browser download
        if (!SUPPORTS_FOLDER_PICKER) {
            startNativeDownload(endpoint, name)
            setSessions(prev => [{
                id: makeSessionId(), fileId, name, fileSize, fileType,
                status: "done", progress: 100, speed: null, error: null, nativeHandoff: true
            }, ...prev])
            setIsPanelOpen(true)
            setIsMinimized(false)
            return
        }

        // Chrome / Edge: ask for the folder while the click is fresh
        const baseDirHandle = await pickDownloadDirectory()
        if (!baseDirHandle) return
        const sessionId = makeSessionId()
        // Save directly in the selected folder — NO extra subfolder created!
        dirHandlesRef.current.set(sessionId, baseDirHandle)
        // ─── UNDER 5GB: Fast direct stream (No parts folder, no assembly) ───
        if (fileSize !== null && fileSize !== undefined && fileSize <= STREAM_MAX_SIZE) {
            setSessions(prev => [{
                id: sessionId,
                fileId,
                name,
                fileSize,
                fileType,
                status: "downloading",
                progress: 0,
                speed: null,
                error: null
            }, ...prev])
            setIsPanelOpen(true)
            setIsMinimized(false)
            await streamDownloadToFile(endpoint, name, fileSize, sessionId)
            return
        }
        // ─── 5GB OR GREATER: Chunked + Resume System ───
        setSessions(prev => [{
            id: sessionId,
            fileId,
            name,
            fileSize,
            fileType,
            totalChunks: Math.ceil(fileSize / CHUNK_SIZE),
            status: "downloading",
            progress: 0,
            speed: null,
            error: null
        }, ...prev])
        setIsPanelOpen(true)
        setIsMinimized(false)
        await downloadInChunks(fileId, endpoint, fileSize, name, fileType, false, null, sessionId)
    }


    // -------------------------------------------------------
    // DOWNLOAD FOLDER (zip on backend, then download the zip)
    // -------------------------------------------------------
    const downloadFolder = async (folder, token = null) => {
        const activeToken = token || new URLSearchParams(window.location.search).get("token")
        const tokenQuery = activeToken ? `?token=${activeToken}` : ""
        const { _id: folderId, name } = folder

        if (sessions.some(s => s.fileId === folderId && ["downloading", "assembling", "creating"].includes(s.status))) return
        if (inProgressFoldersRef.current.has(folderId.toString())) return

        let baseDirHandle = null
        if (SUPPORTS_FOLDER_PICKER) {
            baseDirHandle = await pickDownloadDirectory()
            if (!baseDirHandle) return
        }

        const dirHandle = baseDirHandle

        inProgressFoldersRef.current.add(folderId.toString())

        const sessionId = makeSessionId()
        if (dirHandle) dirHandlesRef.current.set(sessionId, dirHandle)

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
            await runZipFlow({
                key: folderId,
                sessionId,
                dirHandle,
                tokenQuery,
                createRequest: () => axiosApi.post(`/download/folder/${folderId}${tokenQuery}`),
                pollMs: 500,
                showZipProgress: true
            })
        } catch (error) {
            if (error.message === "Cancelled") return
            console.error("downloadFolder error:", error)
            updateSession(sessionId, { status: "error", error: error.message })
            clearPolling(folderId)
        } finally {
            inProgressFoldersRef.current.delete(folderId.toString())
        }
    }


    // -------------------------------------------------------
    // DOWNLOAD MULTIPLE (selected files + folders in one zip)
    // -------------------------------------------------------
    const downloadMultiple = async (selectedItems, token = null) => {
        const activeToken = token || new URLSearchParams(window.location.search).get("token")
        const tokenQuery = activeToken ? `?token=${activeToken}` : ""

        // same selection always gives the same key
        const stableKey = selectedItems.map(i => i._id).sort().join("_")

        if (sessions.some(s => s.fileId === stableKey && ["downloading", "assembling", "creating"].includes(s.status))) return
        if (inProgressMultipleRef.current.has(stableKey)) return

        let baseDirHandle = null
        if (SUPPORTS_FOLDER_PICKER) {
            baseDirHandle = await pickDownloadDirectory()
            if (!baseDirHandle) return
        }

        const dirHandle = baseDirHandle

        inProgressMultipleRef.current.add(stableKey)

        const sessionId = makeSessionId()
        if (dirHandle) dirHandlesRef.current.set(sessionId, dirHandle)

        setSessions(prev => [{
            id: sessionId,
            fileId: stableKey,
            name: "docspot_download.zip",
            fileSize: null,
            status: "creating",
            progress: 0,
            speed: null,
            isFolder: true,
            isMultiple: true
        }, ...prev])

        setIsPanelOpen(true)
        setIsMinimized(false)

        try {
            const ids = selectedItems.map(i => i._id)

            await runZipFlow({
                key: stableKey,
                sessionId,
                dirHandle,
                tokenQuery,
                createRequest: () => axiosApi.post(`/download/multiple${tokenQuery}`, { ids }),
                pollMs: 2000,
                showZipProgress: false
            })
        } catch (error) {
            if (error.message === "Cancelled") return
            console.error("downloadMultiple error:", error)
            updateSession(sessionId, { status: "error", error: error.message })
            clearPolling(stableKey)
        } finally {
            inProgressMultipleRef.current.delete(stableKey)
        }
    }


    // -------------------------------------------------------
    // CANCEL / CLOSE
    // Closing a session = user cancels, so its part files are deleted.
    // (Closing the browser does NOT call this, so parts stay and resume works.)
    // -------------------------------------------------------
    const abortDownload = (sessionId, fileId) => {
        const controller = activeDownloadsRef.current.get(sessionId)
        if (controller) {
            controller.abort()
            // do not delete it from the ref here, downloadInChunks does it in its finally block
        }
        if (fileId) clearPolling(fileId)
    }

    // wait until the workers really stopped (max 10 seconds so cancel never hangs)
    const waitForStop = async (sessionId) => {
        const done = downloadDoneRef.current.get(sessionId)
        if (!done) return
        await Promise.race([done, new Promise(r => setTimeout(r, 10000))])
    }

    const cleanupUnfinishedSession = async (session, dirHandle) => {
        // finished sessions are already cleaned, native handoffs keep their zip for the browser
        if (session.status === "done") return

        const db = await initDB()
        const handle = dirHandle || (await getSavedDirSilently())

        if (!session.isFolder) {
            if (handle && session.fileId) await removePartsDir(handle, session.fileId)
            return
        }

        const zipJob = await getZipJob(db, session.fileId)
        const zipId = zipJob?.zipId || session.zipId
        if (handle && zipId) await removePartsDir(handle, zipId)
        if (zipJob) await deleteZipJob(db, session.fileId)
        if (zipId) {
            try {
                await axiosApi.delete(`/download/zip/${zipId}`)
            } catch (err) {
                console.error("deleteZip failed:", err.message)
            }
        }
    }

    const closeSession = async (sessionId) => {
        console.log("[CANCEL] closeSession called", sessionId)

        const session = sessions.find(s => s.id === sessionId)
        if (!session) return

        const fileId = session.fileId

        // 1) stop the downloads
        abortDownload(sessionId, fileId)

        // 2) wait until running chunk writes have finished
        await waitForStop(sessionId)

        const dirHandle = dirHandlesRef.current.get(sessionId)
        dirHandlesRef.current.delete(sessionId)

        inProgressFoldersRef.current.delete(fileId.toString())
        inProgressMultipleRef.current.delete(fileId)

        // 3) now delete the part files and the folder
        try {
            await cleanupUnfinishedSession(session, dirHandle)
        } catch (e) {
            console.error("Session cleanup failed:", e)
        }

        setSessions(prev => {
            const updated = prev.filter(s => s.id !== sessionId)
            if (updated.length === 0) setIsPanelOpen(false)
            return updated
        })
    }

    const closeAllSessions = async () => {
        const currentSessions = [...(sessionsRef.current || sessions)]

        // 1) stop everything
        activeDownloadsRef.current.forEach((controller) => {
            try { controller.abort() } catch (e) { }
        })

        pollingIntervalsRef.current.forEach((item) => {
            clearInterval(item.interval || item)
            if (item.reject) item.reject(new Error("Cancelled"))
        })
        pollingIntervalsRef.current.clear()

        inProgressFoldersRef.current.clear()
        inProgressMultipleRef.current.clear()

        // 2) wait until all running writes have finished
        await Promise.all(currentSessions.map(s => waitForStop(s.id)))

        // 3) delete part files
        try {
            for (const session of currentSessions) {
                try {
                    await cleanupUnfinishedSession(session, dirHandlesRef.current.get(session.id))
                } catch (itemErr) {
                    console.error("Cleanup item error:", itemErr)
                }
            }
        } finally {
            activeDownloadsRef.current.clear()
            dirHandlesRef.current.clear()
            setSessions([])
            setIsPanelOpen(false)
        }
    }

    //  for retry the download 
    const retryDownload = async (sessionId) => {
        const session = sessions.find(s => s.id === sessionId)

        if (!session || session.status !== "error") return

        console.log("[DOWNLOAD] Retrying download for session:", session.name)

        // Reset status to downloading
        updateSession(sessionId, { status: "downloading", error: null, speed: null })

        const token = new URLSearchParams(window.location.search).get("token")
        const tokenQuery = token ? `?token=${token}` : ""

        // Ensure directory handle exists
        let dirHandle = dirHandlesRef.current.get(sessionId)
        if (!dirHandle) {
            dirHandle = await pickDownloadDirectory()
            if (!dirHandle) {
                updateSession(sessionId, { status: "error", error: "Download folder required" })
                return
            }
            dirHandlesRef.current.set(sessionId, dirHandle)
        }

        if (session.isFolder) {
            // Folder / Multiple zip resume
            const endpoint = `/download/zip/${session.zipId || session.fileId}${tokenQuery}`
            await downloadInChunks(session.zipId || session.fileId, endpoint, session.fileSize, session.name, "application/zip", true, session.fileId, sessionId)
        } else {
            // Single file resume
            const endpoint = `/download/file/${session.fileId}${tokenQuery}`
            await downloadInChunks(session.fileId, endpoint, session.fileSize, session.name, session.fileType, false, null, sessionId)
        }
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
            closeAllSessions,
            changeDownloadFolder,
            downloadFolderName,
            supportsFolderPicker: SUPPORTS_FOLDER_PICKER,
            retryDownload
        }}>
            {children}

            {/* Download Location Modal */}
            <DownloadLocationModal
                show={showFolderGuidance}
                onConfirm={() => {
                    setShowFolderGuidance(false)
                    guidanceResolveRef.current?.(true)
                }}
                onClose={() => {
                    setShowFolderGuidance(false)
                    guidanceResolveRef.current?.(false)
                }}
            />
        </DownloadContext.Provider>
    )
}

export function useDownload() {
    return useContext(DownloadContext)
}