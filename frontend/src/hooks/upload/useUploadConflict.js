//  this file is used for conflict in upload lke if same name file or folder exist
//  so modal will open and show here replace all or keep both here
import { useState, useRef } from "react"


//  here this is helper function to create file and foldr unique name if same file is there then give name abc (2).txt here
const generateUniqueName = (originalName, existingItems) => {
    if (!existingItems || existingItems.length === 0) {
        return `${originalName} (1)`
    }

    const ext = originalName.includes(".")
        ? "." + originalName.split(".").pop()
        : ""
    const base = originalName.includes(".")
        ? originalName.substring(0, originalName.lastIndexOf("."))
        : originalName

    let counter = 1
    let newName = `${base} (${counter})${ext}`

    while (existingItems.some(i => i.name === newName)) {
        counter++
        newName = `${base} (${counter})${ext}`
    }

    return newName
}



export function useUploadConflict(addFiles) {
    //  here this is for the confilick file or folder name like replace all or keep both
    const [conflictModalData, setConflictModalData] = useState(null)
    const pendingUploadRef = useRef(null)   // here for storing pending upload while modal is open
    const conflictQueueRef = useRef([])     // queue for handling multiple conflicting items (e.g. multiple dropped folders)


    //  here this is for like same file name or folder name exist in current directory or not 
    const checkAndUpload = (selectedFiles, parentId, items) => {
        if (!items || items.length === 0) {
            addFiles.current(selectedFiles, parentId)
            return
        }

        // At root level (!parentId), only check conflicts against items owned by the current user.
        // Ignore items shared with the user by others.
        // Inside folders (parentId exists), check all items as usual.
        const targetItems = !parentId
            ? items.filter(i => !i.isSharedWithMe)
            : items

        if (!targetItems || targetItems.length === 0) {
            addFiles.current(selectedFiles, parentId)
            return
        }

        //  first checking i this folder or ingle file here 
        const isFolder = selectedFiles[0]?.webkitRelativePath?.includes("/")


        //  if this is folder 
        if (isFolder) {
            // for folder only check root folder name
            const rootFolderName = selectedFiles[0].webkitRelativePath.split("/")[0]
            const existingFolder = targetItems.find(i => i.name === rootFolderName && i.type === "folder")

            if (existingFolder) {
                // if folder already exist same name modal open now
                const conflictItem = {
                    selectedFiles,
                    parentId,
                    isFolder: true,
                    items: targetItems,
                    conflicts: [rootFolderName],
                    replaceMap: { [rootFolderName]: existingFolder._id }
                }

                if (!pendingUploadRef.current) {
                    pendingUploadRef.current = conflictItem
                    setConflictModalData({
                        conflicts: [rootFolderName],
                        replaceMap: { [rootFolderName]: existingFolder._id }
                    })
                } else {
                    conflictQueueRef.current.push(conflictItem)
                }
                return
            }
        } else {
            //  for single files
            const conflicts = []
            const replaceMap = {}

            selectedFiles.forEach(file => {
                const existing = targetItems.find(i => i.name === file.name && i.type === "file")
                if (existing) {
                    conflicts.push(file.name)
                    replaceMap[file.name] = existing._id
                }
            })

            if (conflicts.length > 0) {
                const conflictItem = {
                    selectedFiles,
                    parentId,
                    isFolder: false,
                    items: targetItems,
                    conflicts,
                    replaceMap
                }

                if (!pendingUploadRef.current) {
                    pendingUploadRef.current = conflictItem
                    setConflictModalData({ conflicts, replaceMap })
                } else {
                    conflictQueueRef.current.push(conflictItem)
                }
                return
            }
        }

        //  no conflits upload normal here
        addFiles.current(selectedFiles, parentId)
    }


    //  here this is function for slove conflict here like user choice here replace or kepp both 
    const resolveConflict = (choice) => {
        if (!choice || !pendingUploadRef.current) {
            setConflictModalData(null)
            pendingUploadRef.current = null
            conflictQueueRef.current = []
            return
        }

        const { selectedFiles, parentId, items, isFolder } = pendingUploadRef.current
        const { replaceMap } = conflictModalData

        if (choice === "replace") {
            addFiles.current(selectedFiles, parentId, replaceMap)
        } else {
            if (isFolder) {
                // rename the root folder segment in every file's webkitRelativePath
                const originalRootName = selectedFiles[0].webkitRelativePath.split("/")[0]
                const newRootName = generateUniqueName(originalRootName, items)

                const renamedFiles = selectedFiles.map(file => {
                    const parts = file.webkitRelativePath.split("/")
                    parts[0] = newRootName
                    const newPath = parts.join("/")
                    const renamedFile = new File([file], file.name, { type: file.type })
                    Object.defineProperty(renamedFile, "webkitRelativePath", {
                        value: newPath,
                        writable: false
                    })
                    return renamedFile
                })

                addFiles.current(renamedFiles, parentId, {})
            } else {
                // existing file rename logic stays the same
                const renamedFiles = selectedFiles.map(file => {
                    if (!replaceMap[file.name]) return file
                    const newName = generateUniqueName(file.name, items)
                    const renamedFile = new File([file], newName, { type: file.type })
                    if (file.webkitRelativePath) {
                        Object.defineProperty(renamedFile, "webkitRelativePath", {
                            value: file.webkitRelativePath,
                            writable: false
                        })
                    }
                    return renamedFile
                })
                addFiles.current(renamedFiles, parentId, {})
            }
        }

        // Process next queued conflict if any exists
        if (conflictQueueRef.current.length > 0) {
            const nextItem = conflictQueueRef.current.shift()
            pendingUploadRef.current = nextItem
            setConflictModalData({
                conflicts: nextItem.conflicts,
                replaceMap: nextItem.replaceMap
            })
        } else {
            setConflictModalData(null)
            pendingUploadRef.current = null
        }
    }


    return {
        conflictModalData,
        setConflictModalData,
        checkAndUpload,
        resolveConflict
    }
}