



//  this file is used for like cancleing single file uplaod or cancel whole uplaod panel uploading
import axiosApi from "../../utils/api.js";


export function useUploadCancel(refs, sessions, setSessions, setIsPanelOpen) {

    const { sessionMapsRef, uploadQueuesRef, uploadStartedRef, abortControllersRef } = refs

    //  here for canceling all upload
    const cancelFileUpload = async (sessionId, filekey) => {
        const filesMap = sessionMapsRef.current.get(sessionId)
        const fileObj = filesMap?.get(filekey)

        //  abort request
        const controller = abortControllersRef.current.get(filekey)
        if (controller) {
            controller.abort()
            abortControllersRef.current.delete(filekey)
        }

        //  here cleanup backend — ONLY if not already finished
        if (fileObj?.uploadId && fileObj.status !== "done" && fileObj.status !== "skipped") {
            try {
                await axiosApi.delete(`/upload/cancle/${fileObj.uploadId}`)
            } catch (error) {
                console.log("cancle file failed ", error)
            }
        }

        // remove from panel
        filesMap?.delete(filekey)
        setSessions(prev => {
            const nextSessions = prev.map(s => {
                if (s.id !== sessionId) return s
                const updatedFiles = s.files.filter(f => f.filekey !== filekey)
                return { ...s, files: updatedFiles }
            }).filter(s => s.isFolder || s.isLarge || s.files?.length > 0)

            if (nextSessions.length === 0) {
                setIsPanelOpen(false)
            }

            return nextSessions
        })
    }


    //  here cancle folder upload

    // cancel entire folder or large session
    const cancelSessionUpload = async (sessionId) => {
        const filesMap = sessionMapsRef.current.get(sessionId)
        if (!filesMap) return

        // STEP 1 — stop workers immediately by clearing queue
        const queue = uploadQueuesRef.current.get(sessionId)
        if (queue) {
            queue.length = 0
            queue.push("DONE")
        }

        // STEP 2 — abort all in-flight requests
        filesMap.forEach((_, filekey) => {
            const controller = abortControllersRef.current.get(filekey)
            if (controller) {
                controller.abort()
                abortControllersRef.current.delete(filekey)
            }
        })

        // STEP 3 — collect uploadIds from files that are NOT finished
        const uploadIds = []
        filesMap.forEach(f => {
            if (f.uploadId && f.status !== "done" && f.status !== "skipped") {
                uploadIds.push(f.uploadId)
            }
        })

        // STEP 4 — collect folderIds if this is a folder session
        const folderIds = []
        const session = sessions.find(s => s.id === sessionId)
        if (session?.folderIds?.length > 0) {
            folderIds.push(...session.folderIds)
        }

        // STEP 5 — backend cleanup
        const isFinished = session && ((session.done || 0) + (session.skipped || 0) + (session.error || 0) + (session.blocked || 0)) >= (session.total || 0);

        if (!isFinished && (uploadIds.length > 0 || folderIds.length > 0 || session?.rootId)) {
            try {
                await axiosApi.delete("/upload/cancle-folder", {
                    data: { uploadIds, folderIds, rootFolderId: session.rootId }
                })
            } catch (error) {
                console.error("cancel folder cleanup failed:", error)
            }
        }

        // STEP 6 — cleanup refs
        sessionMapsRef.current.delete(sessionId)
        uploadQueuesRef.current.delete(sessionId)
        uploadStartedRef.current.delete(sessionId)

        // STEP 7 — update UI
        setSessions(prev => {
            const updated = prev.filter(s => s.id !== sessionId)
            if (updated.length === 0) setIsPanelOpen(false)
            return updated
        })
    }


    //  for closing all files and folder in upload panel
    const closeAllSessions = async () => {
        // Collect all active session IDs before we start wiping them
        const activeSessionIds = sessions.map(s => s.id)

        // Run the robust cancel function on every single one
        await Promise.all(activeSessionIds.map(id => cancelSessionUpload(id)))

        // Wipe the UI 
        setSessions([])
        setIsPanelOpen(false)

        // Clean refs
        sessionMapsRef.current.clear()
        uploadQueuesRef.current.clear()
        uploadStartedRef.current.clear()
        abortControllersRef.current.clear() // Added to ensure memory leak prevention on abort
    }



    return {
        cancelFileUpload,
        cancelSessionUpload,
        closeAllSessions        
      
    }
}





