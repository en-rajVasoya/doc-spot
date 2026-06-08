/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */


import { createContext, useContext, useState, useRef, useMemo } from "react";
import { generateFingerprintBatch } from "../utils/fileHash.js"
import axiosApi from "../utils/api.js"
// import { data, replace } from "react-router-dom";
// import { useFileExplorer } from "./FileExplorerContext.jsx";

import { useUploadRefs } from "../hooks/upload/useUploadRefs.js";
import { useUploadSession } from "../hooks/upload/useUploadSession.js";
import { useUploadWorkers } from "../hooks/upload/useUploadWorkers.js";
import { useUploadCancel } from "../hooks/upload/useUploadCancel.js";
import { useUploadConflict } from "../hooks/upload/useUploadConflict.js";


const UploadContext = createContext()

const LARGE_UPLOAD_THRESHOLD = 100
const BATCH_SIZE = 50
const SMALL_FILE_THRESHOLD = 1 * 1024 * 1024


export function UploadProvider({ children }) {



    const onUploadCompleteRef = useRef(null)
    const setOnUploadComplete = (fn) => {
        onUploadCompleteRef.current = fn
    }

    //  import refs from useRefs
    const refs = useUploadRefs()
    const addFilesRef = useRef(null)
    const { sessionMapsRef, uploadQueuesRef, uploadStartedRef } = refs


    //  for uplaod panel import all function 
    const {
        sessions, setSessions,
        isPanelOpen, setIsPanelOpen,
        isMinimized, setIsMinimized,
        updateSession, updateFile,
        closeSession, removeFile,
        toggleMinimize
    } = useUploadSession(refs)


    // for uplaoding import all worker here
    const { uploadSmallBatch, uploadLargeFile, startUploadWorkers, getFileHeader, retryFile, retryFolder } = useUploadWorkers(refs, updateFile, onUploadCompleteRef, updateSession)


    // for cancle abort import all
    const { cancelFileUpload, cancelSessionUpload, closeAllSessions } = useUploadCancel(refs, sessions, setSessions, setIsPanelOpen)


    //  for conflick files and folder import 
    const { conflictModalData, checkAndUpload, resolveConflict } = useUploadConflict(addFilesRef)



    //   here this function is used for like creating folder if user upload a folder here
    const createFolders = async (selectedFiles, parentId, replaceMap, isFolder) => {
        const folderPathSet = new Set()

        // Optimization: Process in chunks to avoid blocking UI
        const CHUNK = 1000
        for (let i = 0; i < selectedFiles.length; i += CHUNK) {
            const batch = selectedFiles.slice(i, i + CHUNK)
            batch.forEach(file => {
                const parts = file.webkitRelativePath.split("/")
                for (let j = 1; j < parts.length; j++) {
                    folderPathSet.add(parts.slice(0, j).join("/"))
                }
            })
            // yield to main thread
            await new Promise(r => setTimeout(r, 0))
        }

        const folders = [...folderPathSet]
            .sort((a, b) => a.split("/").length - b.split("/").length)
            .map(folderPath => {
                const parts = folderPath.split("/")
                return {
                    name: parts[parts.length - 1],
                    folderPath,
                    parentPath: parts.slice(0, -1).join("/") || null
                }
            })

        const { data } = await axiosApi.post("/upload/folders-bulk", {
            folders,
            parentId,
            replacesFileId: isFolder && replaceMap ? Object.values(replaceMap)[0] || null : null
        })
        return data.pathToId
    }




    //  here open panel instantly when user selects folder so panel shows before file scanning
    const scanCancelledRef = useRef(false)

    const openScanningPanel = (folderName = null) => {
        scanCancelledRef.current = false
        const scanSession = {
            id: 'scanning-' + Date.now(),
            name: folderName || 'Scanning files...',
            isFolder: true,
            isLarge: false,
            total: 0,
            totalBytes: 0,
            uploadedBytes: 0,
            parentId: null,
            done: 0,
            skipped: 0,
            error: 0,
            uploading: 0,
            prepared: 0,
            percent: 0,
            files: [],
            isScanning: true,
        }
        setSessions(prev => [scanSession, ...prev], true)
        setIsPanelOpen(true)
        setIsMinimized(false)
    }

    const cancelScanning = () => {
        scanCancelledRef.current = true
        setSessions(prev => prev.filter(s => !s.isScanning), true)
    }

    const isScanningCancelled = () => scanCancelledRef.current

    //  here our main function hta runs first for uplading 
    const addFiles = async (selectedFiles, parentId = null, replaceMap = {}) => {
        // Remove any scanning placeholder session
        setSessions(prev => prev.filter(s => !s.isScanning), true)
        const isFolder = selectedFiles[0]?.webkitRelativePath?.includes("/")
        const totalFiles = selectedFiles.length
        const isLarge = totalFiles >= LARGE_UPLOAD_THRESHOLD

        const sessionStart = performance.now()
        console.log(`[SESSION START] files: ${totalFiles}`)

        const totalBytes = Array.from(selectedFiles).reduce((sum, f) => sum + f.size, 0)
        const sessionId = Date.now()
        const newSession = {
            id: sessionId,
            name: isFolder ? selectedFiles[0].webkitRelativePath.split("/")[0] : null,
            isFolder,
            isLarge,
            total: totalFiles,
            totalBytes,
            uploadedBytes: 0,
            parentId: parentId || null,
            done: 0,
            skipped: 0,
            error: 0,
            uploading: 0,
            prepared: 0,
            percent: 0,
            files: [],
        }

        setSessions(prev => [newSession, ...prev], true)
        setIsPanelOpen(true)
        setIsMinimized(false)

        const filesMap = new Map()
        sessionMapsRef.current.set(sessionId, filesMap)
        uploadQueuesRef.current.set(sessionId, [])
        uploadStartedRef.current.set(sessionId, false)

        await new Promise(r => setTimeout(r, 100))

        let pathToId = {}
        const folderPromise = isFolder
            ? createFolders(selectedFiles, parentId, replaceMap, isFolder).then(result => { pathToId = result })
            : Promise.resolve()

        const allFileObjects = []

        // PHASE 1 — fingerprint
        const fingerprintStart = performance.now()
        for (let i = 0; i < totalFiles; i += BATCH_SIZE) {
            const batch = selectedFiles.slice(i, i + BATCH_SIZE)

            // Separate small files and large files
            const smallFiles = batch.filter(f => f.size < SMALL_FILE_THRESHOLD)
            const largeFiles = batch.filter(f => f.size >= SMALL_FILE_THRESHOLD)

            // Generate fingerprints for small files instantly
            const smallResults = smallFiles.map(file => {
                const name = encodeURIComponent(file.name.trim())
                const fingerprint = `spot-${name}-${file.size}-${file.lastModified}`
                const filekey = file.webkitRelativePath || file.name
                return { success: true, fingerprint, filekey }
            })

            // Generate fingerprints for large files using worker
            let largeResults = []
            if (largeFiles.length > 0) {
                largeResults = await generateFingerprintBatch(largeFiles)
            }

            // Combine results
            const resultsMap = new Map()
            smallResults.forEach(r => resultsMap.set(r.filekey, r.fingerprint))
            largeResults.forEach(r => resultsMap.set(r.filekey, r.fingerprint))

            const fileObjects = batch.map(file => {
                const filekey = file.webkitRelativePath || file.name
                const fingerprint = resultsMap.get(filekey)
                return {
                    file,
                    filekey,
                    fingerprint,
                    parentId: null,
                    progress: 0,
                    status: "waiting",
                    isSmall: file.size < SMALL_FILE_THRESHOLD,
                    replacesFileId: replaceMap?.[file.name] || null
                }
            })

            fileObjects.forEach(f => {
                filesMap.set(f.filekey, f)
                allFileObjects.push(f)
            })

            setSessions(prev => prev.map(s =>
                s.id === sessionId
                    ? { ...s, prepared: Math.min(i + BATCH_SIZE, totalFiles) }
                    : s
            ))

            await new Promise(r => setTimeout(r, 0))
        }
        console.log(`[FINGERPRINT] ${(performance.now() - fingerprintStart).toFixed(1)}ms`)

        // wait folders
        const folderWaitStart = performance.now()
        try {
            await folderPromise
            if (isFolder) {
                // Find the ID of the top-most folder to highlight
                const rootFolderName = selectedFiles[0].webkitRelativePath.split("/")[0]
                const rootId = pathToId[rootFolderName]
                setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, rootId } : s))

                // if (onUploadComplete) {
                //     onUploadComplete()
                // }
            }
        } catch (error) {
            console.error("Folder creation failed:", error)
            const errorMessage = error.response?.data?.message || "Folder creation failed"
            const isPermissionError = error.response?.status === 403 && errorMessage.toLowerCase().includes("permission")

            allFileObjects.forEach(f => {
                updateFile(sessionId, f.filekey, {
                    status: isPermissionError ? "blocked" : "error",
                    message: errorMessage
                })
            })
            // If folder creation fails, we can't continue with the files
            return
        }
        console.log(`[FOLDER CREATE] ${(performance.now() - folderWaitStart).toFixed(1)}ms`)

        allFileObjects.forEach(f => {
            if (isFolder) {
                const parts = f.file.webkitRelativePath.split("/")
                const folderPath = parts.slice(0, -1).join("/")
                f.parentId = pathToId[folderPath] || null
            } else {
                f.parentId = parentId
            }
        })

        if (!isLarge) {
            setSessions(prev => prev.map(s =>
                s.id === sessionId ? { ...s, files: allFileObjects } : s
            ))
        }


        const queue = uploadQueuesRef.current.get(sessionId)

        const getDedupKey = (fingerprint, parentId) => fingerprint + "_" + (parentId || null)

        const isFileActiveInTab = (fingerprint, parentId, currentSessionId, currentFilekey) => {
            for (const [sid, map] of sessionMapsRef.current.entries()) {
                for (const [filekey, f] of map.entries()) {
                    if (sid === currentSessionId && filekey === currentFilekey) continue
                    if (f.fingerprint === fingerprint &&
                        (f.parentId || null) === (parentId || null) &&
                        ["waiting", "uploading"].includes(f.status)) {
                        return true
                    }
                }
            }
            return false
        }

        const queuedInThisAdd = new Set()

        // PHASE 2 — bulk check
        const checkStart = performance.now()
        // Throttled UI update for bulk check
        let lastUiUpdate = Date.now()
        const CHECK_BATCH_SIZE = 1000

        try {
            for (let i = 0; i < allFileObjects.length; i += CHECK_BATCH_SIZE) {
                const checkBatch = allFileObjects.slice(i, i + CHECK_BATCH_SIZE)

                const filesPayload = checkBatch.map(f => ({
                    fingerprint: f.fingerprint,
                    parentId: f.parentId
                }))

                const { data: bulkData } = await axiosApi.post("/upload/check-files-bulk", { files: filesPayload })
                const statuses = bulkData.statuses || {}

                let batchSkipped = 0

                checkBatch.forEach(f => {
                    const key = getDedupKey(f.fingerprint, f.parentId)
                    const info = statuses[key]

                    if (queuedInThisAdd.has(key)) {
                        console.log(`[QUEUE] skipped duplicate in selection: ${f.file.name}`)
                        f.status = "skipped"
                        f.progress = 100
                        filesMap.set(f.filekey, f)
                        updateFile(sessionId, f.filekey, { status: "skipped", progress: 100 }, "waiting")
                    } else if (isFileActiveInTab(f.fingerprint, f.parentId, sessionId, f.filekey)) {
                        console.log(`[QUEUE] skipped already active in tab: ${f.file.name}`)
                        f.status = "skipped"
                        f.progress = 100
                        filesMap.set(f.filekey, f)
                        updateFile(sessionId, f.filekey, { status: "skipped", progress: 100 }, "waiting")
                    } else if (info?.status === "completed") {
                        console.log(`[QUEUE] skipped: ${f.file.name}`)
                        f.status = "skipped"
                        f.progress = 100
                        // batchSkipped++
                        filesMap.set(f.filekey, f)
                        updateFile(sessionId, f.filekey, { status: "skipped", progress: 100 }, "waiting")
                    } else if (info?.status === "resumable") {
                        console.log(`[QUEUE] resumable: ${f.file.name}`)
                        f.uploadId = info.uploadId
                        f.uploadedChunks = info.uploadedChunks
                        filesMap.set(f.filekey, f)
                        queue.push(f)
                        queuedInThisAdd.add(key)
                    } else {
                        console.log(`[QUEUE] pushed: ${f.file.name}`)
                        queue.push(f)
                        queuedInThisAdd.add(key)
                    }
                })

                // if (batchSkipped > 0) {
                //     setSessions(prev => prev.map(s =>
                //         s.id === sessionId
                //             ? { ...s, skipped: (s.skipped || 0) + batchSkipped }
                //             : s
                //     ))
                // }

                // Yield to UI if needed
                if (Date.now() - lastUiUpdate > 100) {
                    await new Promise(r => setTimeout(r, 0))
                    lastUiUpdate = Date.now()
                }
            }
        } catch (error) {
            // network failed during bulk check — mark all files as error
            allFileObjects.forEach(f => {
                updateFile(sessionId, f.filekey, {
                    status: "error",
                    message: "No Connection"
                })
            })

            //  clear th queue first
            queue.length = 0
            queue.push("DONE")
            return
        }


        console.log(`[BULK CHECK] ${(performance.now() - checkStart).toFixed(1)}ms`)

        queue.push("DONE")
        const workers = startUploadWorkers(sessionId)
        await Promise.all(workers)
        // onUploadComplete?.()

        // if folder replace - call backend and shared user data with new one and delete old folder here
        if (isFolder && replaceMap && Object.keys(replaceMap).length > 0) {
            const oldFolderId = Object.values(replaceMap)[0]
            const rootFolderName = selectedFiles[0].webkitRelativePath.split("/")[0]
            const newFolderPathToId = pathToId
            const newFolderId = newFolderPathToId[rootFolderName]

            if (newFolderId && oldFolderId) {
                try {
                    await axiosApi.post("/upload/complete-folder-replace", {
                        newFolderId,
                        replacesFileId: oldFolderId
                    })
                } catch (err) {
                    console.error("completeFolderReplace failed:", err)
                }
            }
        }

        const totalTime = performance.now() - sessionStart
        console.log(`[SESSION DONE] totalTime: ${(totalTime / 1000).toFixed(2)}s`)

        if (parentId) {
            axiosApi.post("/upload/notify-complete", { parentId }).catch(err => {
                console.error("notify-complete failed:", err)
            })
        }

        onUploadCompleteRef.current?.()
    }

    addFilesRef.current = addFiles


    const getSessionIssues = (sessionId) => {
        const filesMap = sessionMapsRef.current.get(sessionId)
        if (!filesMap) return []

        const issues = []
        filesMap.forEach((f) => {
            if (f.status === "blocked" || f.status === "error" || f.status === "allFailed" || f.status === "partial") {
                issues.push({
                    name: f.file.name,
                    status: f.status,
                    message: f.message || "Upload failed",
                    path: f.file.webkitRelativePath || f.file.name
                })
            }
        })
        return issues
    }


    //  use memo for prevents unnecessary  re render here 
    const contextValue = useMemo(() => ({
        sessions,
        isPanelOpen,
        isMinimized,
        addFiles,
        openScanningPanel,
        cancelScanning,
        isScanningCancelled,
        closeSession,
        toggleMinimize,
        setOnUploadComplete,
        removeFile,
        closeAllSessions,
        cancelFileUpload,
        cancelSessionUpload,
        retryFile,
        retryFolder,

        conflictModalData,
        checkAndUpload,
        resolveConflict,
        getSessionIssues,
    }), [
        sessions, isPanelOpen, isMinimized, addFiles, openScanningPanel, cancelScanning, isScanningCancelled, closeSession,
        toggleMinimize, setOnUploadComplete, removeFile, closeAllSessions,
        cancelFileUpload, cancelSessionUpload, retryFile, conflictModalData,
        checkAndUpload, resolveConflict, retryFolder
    ])


    return (
        <UploadContext.Provider value={contextValue}>
            {children}
        </UploadContext.Provider>
    )
}

export function useUpload() {
    return useContext(UploadContext)
}




