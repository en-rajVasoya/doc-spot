//  this function is used to update Upload Panel file items 
import { useState, useRef } from "react"

const CHUNK_SIZE = 7 * 1024 * 1024


export function useUploadSession(refs) {
    const { sessionMapsRef, uploadQueuesRef, uploadStartedRef } = refs

    const [sessions, setSessionsState] = useState([])
    const sessionsRef = useRef([])
    const throttleTimerRef = useRef(null)

    const [isPanelOpen, setIsPanelOpen] = useState(false)
    const [isMinimized, setIsMinimized] = useState(false)

    const lastCalcRef = useRef({}) // Track last calculation time per session
    const calcCacheRef = useRef({}) // Store last calculated values

    // Throttled state update to prevent re-render explosion
    const setSessions = (updater, force = false) => {
        const next = typeof updater === "function" ? updater(sessionsRef.current) : updater
        sessionsRef.current = next

        if (force) {
            if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current)
            setSessionsState(next)
            throttleTimerRef.current = null
            return
        }

        if (!throttleTimerRef.current) {
            throttleTimerRef.current = setTimeout(() => {
                setSessionsState(sessionsRef.current)
                throttleTimerRef.current = null
            }, 500) // Update UI every 500ms
        }
    }

    // update a specific session's summary fields
    const updateSession = (sessionId, changes) => {
        setSessions(prev =>
            prev.map(s => s.id === sessionId ? { ...s, ...changes } : s)
        )
    }

    // update a specific file inside a session
    const updateFile = (sessionId, filekey, changes, manualOldStatus = null, manualOldProgress = null) => {
        const filesMap = sessionMapsRef.current.get(sessionId)
        if (!filesMap) return

        const existing = filesMap.get(filekey)
        if (existing) {
            filesMap.set(filekey, { ...existing, ...changes })
        }

        setSessions(prev =>
            prev.map(s => {
                if (!s || s.id !== sessionId) return s

                const isLarge = s.isLarge;
                const now = Date.now()
                const lastCal = lastCalcRef.current[sessionId] || 0;

                // small files direct state update
                if (!isLarge && !s.isFolder) {
                    const updatedFiles = (s.files || []).map(f =>
                        f.filekey === filekey ? { ...f, ...changes } : f
                    )
                    return { ...s, files: updatedFiles }
                }


                //  for large files and folder logic of updating state here
                let next = { ...s }

                // clculate finished state for later use
                const isFinished = (status) => ["done", "skipped", "error", "blocked"].includes(status)

                //  now calculate all other state here
                const oldStatus = manualOldStatus || existing?.status
                const wasFinished = isFinished(oldStatus)
                const nowFinished = changes.status ? isFinished(changes.status) : wasFinished


                //  here update the  counter 
                if (changes.status) {
                    if (nowFinished && !wasFinished) {
                        //  if now finished so moving here from non finished to finished
                        next[changes.status] = (next[changes.status] || 0) + 1;

                        if (oldStatus === "uploading") {
                            next.uploading = Math.max(0, (next.uploading || 0) - 1)
                        }

                    } else if (nowFinished && wasFinished && oldStatus !== changes.status) {
                        //  moving from one finished state to another  (error => done)
                        next[oldStatus] = Math.max(0, (next[oldStatus] || 0) - 1)
                        next[changes.status] = (next[changes.status] || 0) + 1

                    } else if (!nowFinished && wasFinished) {
                        // moving back to non - finshed from finished
                        next[oldStatus] = Math.max(0, (next[oldStatus] || 0) - 1)
                        if (changes.status === "uploading") {
                            next.uploading = (next.uploading || 0) + 1
                        }

                    } else if (changes.status === "uploading" && oldStatus !== "uploading" && !wasFinished) {
                        //  normal transition to uploading
                        next.uploading = (next.uploading || 0) + 1
                    }
                }

                //  handle progress and byte tracking 
                if (changes.progress !== undefined || changes.status) {
                    const fileSize = existing?.file?.size || 0;

                    if (fileSize > 0) {
                        //  use manualOldProgress for retry here fro tracking progress previous
                        const oldFileProgress = manualOldProgress !== null ? manualOldProgress : (existing?.progress || 0)
                        const newFileProgress = changes.progress !== undefined ? changes.progress : oldFileProgress


                        //  byte calulation at 0 and file size
                        const oldUploaded = Math.min(fileSize, Math.max(0, (oldFileProgress / 100) * fileSize))
                        const newUploaded = Math.min(fileSize, Math.max(0, (newFileProgress / 100) * fileSize))
                        const byteDiff = newUploaded - oldUploaded

                        //  update session Bytes ensuring it stays between 0 and totalBytes
                        next.uploadedBytes = Math.max(0, Math.min(next.totalBytes, (next.uploadedBytes || 0) + byteDiff))

                    }

                    // update percent on bytes
                    if (next.totalBytes > 0) {
                        let calcPercent = (next.uploadedBytes / next.totalBytes) * 100;

                        //  only allow the Ui to show here 100% if all file in folder is uploaded if one file is less then show here only 99.99%
                        const totalFinished = (next.done || 0) + (next.skipped || 0) + (next.error || 0) + (next.blocked || 0)
                        if (totalFinished < next.total && calcPercent >= 100) {
                            calcPercent = 99.9
                        }
                        next.percent = Number(calcPercent.toFixed(1))

                    } else {
                        // ONLY fallback to file count if totalBytes is 0
                        const totalFinished = (next.done || 0) + (next.skipped || 0) + (next.error || 0) + (next.blocked || 0)
                        next.percent = next.total > 0 ? Number(((totalFinished / next.total) * 100).toFixed(1)) : 0
                    }
                }


                //  handle speed tracking
                if (changes.speed !== undefined || (nowFinished && wasFinished === false)) {
                    const oldFileSpeed = existing?.speed || 0
                    const newFileSpeed = nowFinished ? 0 : (changes.speed !== undefined ? changes.speed : oldFileSpeed)
                    const speedDiff = newFileSpeed - oldFileSpeed

                    next.speed = Math.max(0, (next.speed || 0) + speedDiff)
                }
                return next
            })
        )

    }


    // here remove one session from panel when user removes it for specific file and folder - remove not abort here
    const closeSession = (sessionId) => {
        setSessions(prev => {
            const updated = prev.filter(s => s.id !== sessionId)
            if (updated.length === 0) setIsPanelOpen(false)
            return updated
        }, true) // force update
        sessionMapsRef.current.delete(sessionId)
        uploadQueuesRef.current.delete(sessionId)
        uploadStartedRef.current.delete(sessionId)
    }


    //  for removing single from upload panel 
    const removeFile = (sessionId, filekey) => {
        const fileMap = sessionMapsRef.current.get(sessionId)
        if (!fileMap) return

        //  remove from map here
        fileMap.delete(filekey)


        setSessions(prev => {
            const nextSessions = prev.map(s => {
                if (s.id !== sessionId) return s
                const updateFiles = s.files.filter(f => f.filekey !== filekey)
                return { ...s, files: updateFiles }
            }).filter(s => s.isFolder || s.isLarge || s.files?.length > 0)

            if (nextSessions.length === 0) {
                setIsPanelOpen(false)
            }

            return nextSessions
        }, true) // force update

    }

    //  minimize and maximize the panel
    const toggleMinimize = () => setIsMinimized(prev => !prev)


    return {
        sessions,
        setSessions,
        isPanelOpen,
        setIsPanelOpen,
        isMinimized,
        setIsMinimized,
        updateSession,
        updateFile,
        closeSession,
        removeFile,
        toggleMinimize
    }

}