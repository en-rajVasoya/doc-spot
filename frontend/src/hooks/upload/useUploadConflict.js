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
    const pendingUploadRef = useRef(null)   //here for storing pending upload while modal is open


    //  here this is for like same file name or folder name exist in current directory or not 
    const checkAndUpload = (selectedFiles, parentId, items) => {
        if (!items || items.length === 0) {
            addFiles.current(selectedFiles, parentId)
            return
        }

        //  first checking i this folder or ingle file here 
        const isFolder = selectedFiles[0]?.webkitRelativePath?.includes("/")


        //  if this is folder 
        if (isFolder) {
            // for folder only check root folder name
            const rootFolderName = selectedFiles[0].webkitRelativePath.split("/")[0]
            const existingFolder = items.find(i => i.name === rootFolderName && i.type === "folder")

            if (existingFolder) {
                // if folder already exist same name modal open now
                pendingUploadRef.current = { selectedFiles, parentId, isFolder: true, items }
                setConflictModalData({
                    conflicts: [rootFolderName],
                    replaceMap: { [rootFolderName]: existingFolder._id }
                })
                return
            }
        } else {
            //  for single files
            const conflicts = []
            const replaceMap = {}

            selectedFiles.forEach(file => {
                const existing = items.find(i => i.name === file.name && i.type === "file")
                console.log("checking file", file.name, "found existing", existing)
                if (existing) {
                    conflicts.push(file.name)
                    replaceMap[file.name] = existing._id
                }
            })
            console.log("conflicts", conflicts)

            if (conflicts.length > 0) {
                //  how modal here
                pendingUploadRef.current = { selectedFiles, parentId, isFolder: false, items }
                setConflictModalData({ conflicts, replaceMap })
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
            return
        }

        const { selectedFiles, parentId, items } = pendingUploadRef.current
        const { replaceMap } = conflictModalData

        if (choice === "replace") {
            addFiles.current(selectedFiles, parentId, replaceMap)
        } else {
            if (pendingUploadRef.current.isFolder) {
                // rename the root folder segment in every file's webkitRelativePath
                const originalRootName = selectedFiles[0].webkitRelativePath.split("/")[0]
                const newRootName = generateUniqueName(originalRootName, items)

                const renamedFiles = selectedFiles.map(file => {
                    const newPath = file.webkitRelativePath.replace(
                        new RegExp(`^${originalRootName}/`),
                        `${newRootName}/`
                    )
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

        setConflictModalData(null)
        pendingUploadRef.current = null
    }


    return {
        conflictModalData,
        setConflictModalData,
        checkAndUpload,
        resolveConflict
    }
}