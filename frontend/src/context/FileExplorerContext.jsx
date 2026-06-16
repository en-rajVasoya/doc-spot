

// import { createContext, useContext, useState, useCallback, useEffect } from "react";
// import { useUpload } from "./UploadContext";
// import axiosApi from "../utils/api.js";
// import { useParams, useNavigate } from "react-router-dom";
// import { useAuth } from "./AuthContext.jsx";
// import { useRef } from "react";
// import { io } from "socket.io-client"
// import { useNotification } from "./NotificationContext.jsx";
// import { useSocket } from "./SocketContext.jsx";
// import { useSearch } from "./SearchContext.jsx";


// //  this function is helpfull for copy and move item appear after all folder 
// const insertSorted = (items, newItem) => {

//     const index = items.findIndex(item => {

//         // folders always before files
//         if (newItem.type === "folder" && item.type === "file") {
//             return true
//         }

//         // same type -> newest first
//         if (newItem.type === item.type) {
//             return new Date(item.createdAt) < new Date(newItem.createdAt)
//         }

//         return false
//     })

//     // no position found -> push at end
//     if (index === -1) {
//         return [...items, newItem]
//     }

//     const updated = [...items]

//     updated.splice(index, 0, newItem)

//     return updated
// }


// const FileExplorerContext = createContext();

// export function FileExplorerProvider({ children }) {

//     // showing notification 
//     const { showNotification } = useNotification()

//     const { folderId } = useParams();
//     const navigate = useNavigate();
//     const { setOnUploadComplete } = useUpload()

//     // getting current user for scoket event
//     const { user } = useAuth()
//     const { socket, socketRef } = useSocket()
//     const { isSearchMode, setSearchResults, searchFilters, searchApi } = useSearch()

//     const [trail, setTrail] = useState([])
//     // currentFolderId always comes from trail, not URL directly
//     // const currentFolderId = trail.length ? trail[trail.length - 1].id : null;
//     const currentFolderId = folderId || null

//     const [items, setItems] = useState([])
//     const [loading, setLoading] = useState(true)
//     const [error, setError] = useState(null)
//     const [selectedIds, setSelectedIds] = useState(new Set())
//     const [highlightedId, setHighlightedId] = useState(null)

//     //  for rename the file and fodlers
//     const [renameItem, setRenameItem] = useState(null)


//     const [allIds, setAllIds] = useState([])
//     const [hasMoreFiles, setHasMoreFiles] = useState(false)
//     const [loadingMoreFiles, setLoadingMoreFiles] = useState(false)
//     const [total, setTotal] = useState(0)
//     const itemsLengthRef = useRef(0)




//     useEffect(() => {
//         itemsLengthRef.current = items.length
//     }, [items])


//     //  fetch all itesm for main screen
//     const fetchItems = useCallback(async (isAppend = false) => {
//         if (!isAppend) {
//             setError(null)
//             setLoading(true)
//         } else {
//             setLoadingMoreFiles(true)
//         }

//         try {
//             const skip = isAppend ? itemsLengthRef.current : 0

//             const { data } = await axiosApi.get("/upload/get-files", {
//                 params: {
//                     parent: currentFolderId ?? "null",
//                     limit: 50,
//                     skip
//                 }
//             })

//             // some delay HERE
//             await new Promise(resolve => setTimeout(resolve, 100))

//             if (isAppend) {
//                 setItems(prev => {
//                     const existingIds = new Set(prev.map(item => item._id.toString()))
//                     const newItems = data.items.filter(item => !existingIds.has(item._id.toString()))
//                     return [...prev, ...newItems]
//                 })
//             } else {
//                 setItems(data.items)
//                 setAllIds(data.allIds || [])
//             }

//             setTotal(data.total || 0)
//             setHasMoreFiles(data.hasMore || false)
//         } catch (error) {
//             setError(error.response?.data?.message || "Failed to fetch files and folder")
//         } finally {
//             setLoading(false)
//             setLoadingMoreFiles(false)
//         }
//     }, [currentFolderId])


//     //  here when user scroll down so load mroe 
//     const loadMoreFiles = useCallback(() => {
//         if (loadingMoreFiles || !hasMoreFiles) return
//         fetchItems(true)
//     }, [loadingMoreFiles, hasMoreFiles, fetchItems])

//     useEffect(() => {
//         fetchItems()
//     }, [fetchItems])


//     //  socket Event useEffect 
//     useEffect(() => {
//         if (!user?._id || !socket) return

//         //  removed all listener first if any there
//         socket.off("share_added")
//         socket.off("share_removed")
//         socket.off("item_uploaded")
//         socket.off("item_renamed")
//         socket.off("item_deleted_forever")
//         socket.off("item_color_changed")
//         socket.off("item_moved")
//         socket.off("item_copied")
//         socket.off("item_restored")
//         socket.off("item_trashed")
//         socket.off("scan_complete")
//         socket.off("item_folder_created")


//         //  for scanning here
//         socket.on("scan_complete", ({ fileId, status, message }) => {
//             if (status === "clean") {
//                 showNotification("File scanned — no threats found ", "success", "bottom-center")
//             } else if (status === "infected") {
//                 showNotification(message || "Virus detected! File has been deleted", "error", "bottom-center")
//                 setItems(prev => prev.filter(item => item._id !== fileId))
//             } else if (status === "failed") {
//                 showNotification("File scan failed ", "warning", "bottom-center")
//             }
//         })

//         //  someone has shared item with me event
//         socket.on("share_added", ({ itemId }) => {
//             // shared items always appear at root for the receiver
//             if (!currentFolderId) {
//                 fetchItems()  // user is already at root, refetch immediately
//             }
//             // if user is inside a folder, they'll see it when they go back to root
//             // showNotification("A folder has been shared with you", "info", "top-right")
//         })

//         //  someone removed from me shared event here
//         socket.on("share_removed", () => {
//             fetchItems()
//         })

//         //  when user uploaded some item in nested folder so socket event here
//         socket.on("item_uploaded", ({ folderId }) => {
//             if (String(currentFolderId) === String(folderId)) {
//                 fetchItems()
//             }
//         })

//         // item renamed event here
//         socket.on("item_renamed", ({ itemId, newName }) => {
//             setItems(prev => prev.map(item =>
//                 item._id === itemId ? { ...item, name: newName } : item
//             ))
//         })

//         // item delete
//         socket.on("item_deleted_forever", ({ itemId }) => {
//             setItems(prev => prev.filter(i => i._id !== itemId))
//         })

//         //  folder icon change socket evetn
//         socket.on("item_color_changed", ({ itemId, color }) => {
//             setItems(prev => prev.map(item =>
//                 item._id === itemId ? { ...item, color } : item
//             ))
//         })

//         // item moved socket
//         socket.on("item_moved", ({ itemId, oldParent, newParent, movedItem }) => {
//             // remove from old folder
//             if (String(currentFolderId) === String(oldParent) || (!currentFolderId && !oldParent)) {
//                 setItems(prev => prev.filter(item => item._id.toString() !== itemId.toString()))
//             }
//             // add to new folder
//             if (String(currentFolderId) === String(newParent) || (!currentFolderId && !newParent)) {
//                 setItems(prev => {
//                     const exists = prev.some(item => String(item._id) === String(movedItem._id))
//                     if (exists) return prev
//                     return insertSorted(prev, movedItem)
//                 })
//             }
//         })

//         //  item copied event 
//         socket.on("item_copied", ({ parentId, newItem }) => {
//             if (String(currentFolderId) === String(parentId) || (!currentFolderId && !parentId)) {
//                 setItems(prev => insertSorted(prev, newItem))
//             }
//         })


//         //  here if user trash someting notify user 2 
//         socket.on("item_trashed", ({ parentId, ids }) => {
//             if (String(currentFolderId) === String(parentId) || (!currentFolderId && !parentId)) {
//                 setItems(prev => prev.filter(item => !ids.includes(item._id.toString())))
//             }
//         })

//         //  here when user restor something it main screeen socket event
//         socket.on("item_restored", ({ parentId }) => {
//             console.log("RESTORE EVENT HIT:", parentId);
//             if (currentFolderId === parentId || (!currentFolderId && !parentId)) {
//                 fetchItems()
//             }
//         })


//         //  if inside the fodler new folder creating 
//         socket.on("item_folder_created", ({ parentId, newFolder }) => {
//             if (String(currentFolderId) === String(parentId)) {
//                 setItems(prev => {
//                     const exists = prev.some(item => String(item._id) === String(newFolder._id))
//                     if (exists) return prev
//                     return insertSorted(prev, newFolder)
//                 })
//             }
//         })

//         return () => {
//             socket.off("share_added")
//             socket.off("share_removed")
//             socket.off("item_uploaded")
//             socket.off("item_renamed")
//             socket.off("item_deleted_forever")
//             socket.off("item_color_changed")
//             socket.off("item_moved")
//             socket.off("item_copied")
//             socket.off("item_restored")
//             socket.off("item_trashed")
//             socket.off("scan_complete")
//             socket.off("item_folder_created")

//         }

//     }, [user?._id, socket, currentFolderId, fetchItems])





//     // when URL changes (browser back/forward) → sync trail
//     useEffect(() => {
//         clearSelection()
//         if (!folderId) {
//             setTrail([])
//             return
//         }

//         const lastTrailId = trail[trail.length - 1]?.id
//         if (lastTrailId === folderId) return

//         axiosApi.get(`/upload/folder/${folderId}`)
//             .then(({ data }) => {
//                 setTrail(data.trail)
//             })
//             .catch(() => {
//                 navigate("/dashboard")
//             })
//     }, [folderId])




//     // use effect for on upload complete fetch all item and display to main screen
//     useEffect(() => {
//         setOnUploadComplete(async () => {
//             await new Promise(r => setTimeout(r, 300))
//             fetchItems()
//         })
//     }, [fetchItems, setOnUploadComplete])


//     // when user open folder fetch that items
//     const openFolder = useCallback((folder) => {
//         clearSelection()
//         setTrail(prev => {
//             const lastId = prev[prev.length - 1]?.id
//             if (lastId === folder._id) return prev   // if folder id is same so dont push here
//             return [...prev, { id: folder._id, name: folder.name }]
//         })
//         navigate(`/dashboard/folder/${folder._id}`)
//     }, [navigate])



//     //  when user navigate to some folder change url
//     const navigateTo = useCallback((depth) => {
//         setTrail(prev => {
//             clearSelection()
//             const newTrail = prev.slice(0, depth)
//             // update URL based on new trail
//             if (newTrail.length === 0) {
//                 navigate("/dashboard")
//             } else {
//                 navigate(`/dashboard/folder/${newTrail[newTrail.length - 1].id}`)
//             }
//             return newTrail
//         })
//     }, [navigate])


//     // when user select some itesm using check box here
//     const toggleSelect = (id) => {
//         setSelectedIds(prev => {
//             const next = new Set(prev);
//             next.has(id) ? next.delete(id) : next.add(id)
//             return next;
//         })
//     }



//     // Highlight an item (e.g. after navigating from upload panel)
//     const triggerHighlight = useCallback((id) => {
//         if (!id) return
//         setHighlightedId(id)
//         setTimeout(() => {
//             setHighlightedId(null)
//         }, 2000)
//     }, [])



//     //  when user rename folder and file
//     const renameItemApi = async (id, newName) => {
//         try {
//             const { data } = await axiosApi.patch("/upload/rename", { id, newName })

//             //  update the ui
//             setItems(prev =>
//                 prev.map(item =>
//                     item._id === id ? data.item : item
//                 )
//             )

//             // update search results
//             if (isSearchMode) {
//                 setSearchResults(prev =>
//                     prev.map(item =>
//                         item._id === id ? { ...item, name: newName } : item
//                     )
//                 )
//             }

//             showNotification("Renamed successfully", "success", "bottom-center")

//         } catch (error) {
//             showNotification(error.response?.data?.message || "Rename failed", "error", "bottom-center")
//         }
//     }



//     //  folder and file delete
//     const deleteItemApi = async (ids) => {
//         try {
//             // Optimistically update the UI to feel instant
//             setItems(prev => prev.filter(item => !ids.includes(item._id)))
//             if (isSearchMode) {
//                 setSearchResults(prev => prev.filter(item => !ids.includes(item._id)))
//             }
//             setSelectedIds(new Set())

//             // Send a single batch request to the server
//             await axiosApi.post("/trash/delete", { ids })

//             showNotification("Moved to trash", "success", "bottom-center")
//         } catch (error) {
//             // If the server fails (e.g. Access Denied), refresh to get the real state
//             fetchItems()
//             showNotification(error.response?.data?.message || "Move to trash failed", "error", "bottom-center")
//         }
//     }



//     //  change folder color 
//     const changeColorApi = async (ids, color) => {
//         try {
//             await axiosApi.patch("/upload/color", { ids, color });

//             //  update the ui
//             setItems(prev =>
//                 prev.map(item =>
//                     ids.includes(item._id) && item.type === "folder" ? { ...item, color } : item
//                 )
//             );

//             // update search results
//             if (isSearchMode) {
//                 setSearchResults(prev =>
//                     prev.map(item =>
//                         ids.includes(item._id) && item.type === "folder" ? { ...item, color } : item
//                     )
//                 )
//             }

//             //  clear selection here 
//             setSelectedIds(new Set())

//             showNotification("Icon changed", "success", "bottom-center")

//         } catch (error) {
//             showNotification(error.response?.data?.message || "Icon changed failed", "error", "bottom-center")
//         }
//     }


//     //  move item
//     const moveItemApi = async (itemId, destinationId, silent = false) => {
//         try {
//             await axiosApi.patch("/upload/move", { itemId, destinationId: destinationId || null })
//             setItems(prev => prev.filter(item => item._id !== itemId))
//             if (isSearchMode) searchApi(searchFilters)
//             setSelectedIds(new Set())
//             if (!silent) showNotification("Item moved successfully", "success", "bottom-center")
//         } catch (error) {
//             if (!silent) showNotification(error.response?.data?.message || "Moved failed", "error", "bottom-center")
//             throw error
//         }
//     }

//     //  when user makes a copy 
//     const copyItemApi = async (itemId, destinationId, silent = false) => {
//         try {
//             const { data } = await axiosApi.post("/upload/copy", { itemId, destinationId: destinationId || null })
//             setSelectedIds(new Set())
//             if (!silent) showNotification("Item copied successfully", "success", "bottom-center")
//         } catch (error) {
//             if (!silent) showNotification(error.response?.data?.message || "Copy failed", "error", "bottom-right")
//             throw error
//         }
//     }



//     // in share modal search api
//     const searchUsersApi = async (query) => {
//         try {
//             const { data } = await axiosApi.get("/api/share/search", {
//                 params: { query }
//             })
//             return data.users || []
//         } catch (error) {
//             console.log(error.message)
//             return []
//         }
//     }


//     // getting all shared user with specif item
//     const getSharedUsersApi = async (itemId) => {
//         try {
//             const { data } = await axiosApi.get(`/api/share/${itemId}`)
//             return data
//         } catch (error) {
//             console.log(error.message)
//             return null
//         }
//     }


//     //  share item with users
//     const shareItemApi = async (ids, userIds, permission) => {
//         try {
//             const idArray = Array.isArray(ids) ? ids : [ids]
//             await axiosApi.post("/api/share", { itemIds: idArray, userIds, permission })

//             // update isShared in UI for all selected items
//             const idSet = new Set(idArray.map(id => id.toString()))
//             setItems(prev =>
//                 prev.map(item =>
//                     idSet.has(item._id.toString()) ? { ...item, isShared: true } : item
//                 )
//             )

//             if (isSearchMode) {
//                 setSearchResults(prev =>
//                     prev.map(item =>
//                         idSet.has(item._id.toString()) ? { ...item, isShared: true } : item
//                     )
//                 )
//             }
//         } catch (error) {
//             alert(error.response?.data?.message || "Share failed")
//         }
//     }



//     //  remove user from shared
//     const unshareItemApi = async (ids, userIds) => {
//         try {
//             const idArray = Array.isArray(ids) ? ids : [ids]
//             await axiosApi.delete("/api/unshare", { data: { itemIds: idArray, userIds } })
//         } catch (error) {
//             alert(error.response?.data?.message || "Unshare failed")
//         }
//     }


//     //  when user create new empty folder here
//     const createFolderApi = async (name) => {
//         try {
//             const { data } = await axiosApi.post("/upload/create-folder", {
//                 name,
//                 parentId: currentFolderId || null
//             })
//             if (!currentFolderId) {
//                 setItems(prev => insertSorted(prev, data.folder))
//             }
//             showNotification("Folder created", "success", "bottom-center")
//         } catch (error) {
//             showNotification(
//                 error.response?.data?.message || "Folder creation failed",
//                 "error",
//                 "bottom-center"
//             )
//         }
//     }


//     const clearSelection = () => setSelectedIds(new Set())


//     return (
//         <FileExplorerContext.Provider value={{
//             trail,
//             currentFolderId,
//             items,
//             loading,
//             error,
//             refetch: fetchItems,
//             openFolder,
//             navigateTo,
//             selectedIds,
//             setSelectedIds,
//             toggleSelect,
//             clearSelection,
//             renameItem,
//             setRenameItem,
//             renameItemApi,
//             deleteItemApi,
//             changeColorApi,
//             moveItemApi,
//             copyItemApi,
//             createFolderApi,
//             allIds,
//             hasMoreFiles,
//             loadingMoreFiles,
//             loadMoreFiles,
//             total,

//             // highlight
//             highlightedId,
//             triggerHighlight,

//             // share
//             searchUsersApi,
//             getSharedUsersApi,
//             shareItemApi,
//             unshareItemApi
//         }}>
//             {children}
//         </FileExplorerContext.Provider>
//     )
// }

// export function useFileExplorer() {
//     return useContext(FileExplorerContext)
// }

















import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useUpload } from "./UploadContext";
import axiosApi from "../utils/api.js";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import { useRef } from "react";
import { io } from "socket.io-client"
import { useNotification } from "./NotificationContext.jsx";
import { useSocket } from "./SocketContext.jsx";
import { useSearch } from "./SearchContext.jsx";
import { useMemo } from "react";

import { getRoute } from "../utils/getRoutes.js";



// ##################################################
// ---- STEP 1: Helper function for sorting items ---
// ##################################################
const insertSorted = (items, newItem) => {

    const index = items.findIndex(item => {

        // folders always before files
        if (newItem.type === "folder" && item.type === "file") {
            return true
        }

        // same type -> newest first
        if (newItem.type === item.type) {
            return new Date(item.createdAt) < new Date(newItem.createdAt)
        }

        return false
    })

    // no position found -> push at end
    if (index === -1) {
        return [...items, newItem]
    }

    const updated = [...items]

    updated.splice(index, 0, newItem)

    return updated
}


const FileExplorerContext = createContext();

export function FileExplorerProvider({ children }) {

    // showing notification 
    const { showNotification } = useNotification()
    const location = useLocation()
    const { folderId } = useParams();
    const navigate = useNavigate();
    const { setOnUploadComplete } = useUpload()

    // getting current user for scoket event
    const { user } = useAuth()
    const { socket, socketRef } = useSocket()
    const { isSearchMode, setSearchResults, searchFilters, searchApi } = useSearch()

    const [trail, setTrail] = useState([])
    // currentFolderId always comes from trail, not URL directly
    // const currentFolderId = trail.length ? trail[trail.length - 1].id : null;
    const currentFolderId = folderId || null

    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [selectedIds, setSelectedIds] = useState(new Set())
    const [highlightedId, setHighlightedId] = useState(null)

    //  for rename the file and fodlers
    const [renameItem, setRenameItem] = useState(null)


    //  this state user for geting user permission here like when user has a only viewer permission here so all funcionality will disbaled here
    const [currentFolderPermission, setCurrentFolderPermission] = useState(null)


    //  this is used for in breadcrumb when user goes inside folder so user want some action liek rename move copy 
    const [currentFolderMeta, setCurrentFolderMeta] = useState(null)



    // Sorting state
    const [sortBy, setSortBy] = useState(() => localStorage.getItem("docspot_sortBy") || "modified")
    const [sortOrder, setSortOrder] = useState(() => localStorage.getItem("docspot_sortOrder") || "desc")


    //  get the routes wher is user currently in dashboard oor somewhere else 
    const getPathPrefix = useCallback(() => {
        if (location.pathname.startsWith(getRoute.SHARED_WITH_ME)) return getRoute.SHARED_WITH_ME
        if (location.pathname.startsWith(getRoute.SHARED)) return getRoute.SHARED
        return getRoute.DASHBOARD
    }, [location.pathname])

    // save state to the local storeage when it changes
    useEffect(() => {
        localStorage.setItem("docspot_sortBy", sortBy)
    }, [sortBy])

    useEffect(() => {
        localStorage.setItem("docspot_sortOrder", sortOrder)
    }, [sortOrder])


    //  here use ref is used becuase we want to fetch here with out trigrring fetchItem
    const sortByRef = useRef(sortBy)
    const sortOrderRef = useRef(sortOrder)

    useEffect(() => {
        sortByRef.current = sortBy
        sortOrderRef.current = sortOrder
    }, [sortBy, sortOrder])


    // ##################################################
    // ---- STEP 2: In-memory sorting hook --------------
    // ##################################################
    const sortedItems = useMemo(() => {
        let filteredList = [...items]

        // only filter at root level not inside the fodlers
        if (!currentFolderId) {
            // shared-with-me route
            if (location.pathname.startsWith(getRoute.SHARED_WITH_ME)) {
                filteredList = items.filter(item => item.isSharedWithMe)
            }
            // shared route
            else if (location.pathname.startsWith(getRoute.SHARED)) {
                filteredList = items.filter(item => !item.isSharedWithMe && (item.isShared || item.sharedWith?.length > 0))
            }
        }


        const itemsCopy = [...filteredList]
        itemsCopy.sort((a, b) => {
            //  folder always comes first
            if (a.type !== b.type) {
                return a.type === "folder" ? -1 : 1
            }

            // sort by selected field
            let valA, valB
            if (sortBy === "name") {
                valA = a.name.toLowerCase()
                valB = b.name.toLowerCase()
            } else if (sortBy === "size") {
                valA = a.fileSize || 0;
                valB = b.fileSize || 0;
            } else {
                // "modified" / updatedAt / createdAt
                valA = new Date(a.updatedAt || a.createdAt).getTime()
                valB = new Date(b.updatedAt || b.createdAt).getTime()
            }

            if (valA < valB) return sortOrder === "asc" ? -1 : 1
            if (valA > valB) return sortOrder === "asc" ? 1 : -1

            // 3. Secondary sort (newest first)
            return new Date(b.createdAt) - new Date(a.createdAt)
        })
        return itemsCopy
    }, [items, sortBy, sortOrder, location.pathname, currentFolderId])


    // ##################################################
    // ---- STEP 3: Fetch items for main screen ---------
    // ##################################################
    const fetchItems = useCallback(async () => {
        setError(null)
        setLoading(true)
        try {
            const { data } = await axiosApi.get("/file/get-files", {
                params: {
                    parent: currentFolderId ?? "null",
                    sortBy: sortByRef.current,
                    sortOrder: sortOrderRef.current
                }
            })
            await new Promise(resolve => setTimeout(resolve, 100))
            setItems(data.items)

        } catch (error) {
            setError(error.response?.data?.message || "Failed to fetch files and folders")
        } finally {
            setLoading(false)
        }
    }, [currentFolderId])

    useEffect(() => {
        fetchItems()
    }, [fetchItems])

    //  re-fetch dashboard items when exiting search mode here
    const prevSearchModeRef = useRef(false)
    useEffect(() => {
        if (prevSearchModeRef.current && !isSearchMode) {
            fetchItems()
        }
        prevSearchModeRef.current = isSearchMode
    }, [isSearchMode, fetchItems])

    //  save/restore dashboard items when toggling search mode (no API call)
    // const cachedItemsRef = useRef(null)
    // useEffect(() => {
    //     if (isSearchMode && !cachedItemsRef.current) {
    //         cachedItemsRef.current = items
    //     }
    //     if (!isSearchMode && cachedItemsRef.current) {
    //         setItems(cachedItemsRef.current)
    //         cachedItemsRef.current = null
    //     }
    // }, [isSearchMode])


    // ##################################################
    // ---- STEP 4: Real-time socket event listeners ----
    // ##################################################
    useEffect(() => {
        if (!user?._id || !socket) return

        //  removed all listener first if any there
        socket.off("share_added")
        socket.off("share_removed")
        socket.off("item_uploaded")
        socket.off("item_renamed")
        socket.off("item_deleted_forever")
        socket.off("item_color_changed")
        socket.off("item_moved")
        socket.off("item_copied")
        socket.off("item_restored")
        socket.off("item_trashed")
        socket.off("scan_complete")
        socket.off("item_folder_created")


        //  for scanning here
        socket.on("scan_complete", ({ fileId, status, message }) => {
            if (status === "clean") {
                showNotification("File scanned — no threats found ", "success", "bottom-center")
            } else if (status === "infected") {
                showNotification(message || "Virus detected! File has been deleted", "error", "bottom-center")
                setItems(prev => prev.filter(item => item._id !== fileId))
            } else if (status === "failed") {
                showNotification("File scan failed ", "warning", "bottom-center")
            }
        })

        //  someone has shared item with me event
        socket.on("share_added", ({ itemId }) => {
            // shared items always appear at root for the receiver
            if (!currentFolderId) {
                fetchItems()  // user is already at root, refetch immediately
            }

            //  check if current folder is in the shared items
            axiosApi.get(`/file/folder/${currentFolderId}`)
                .then(({ data }) => {
                    console.log("socket share_added refetch:", data.currentPermission)
                    setCurrentFolderPermission(data.currentPermission || null)
                })
        })

        //  someone removed from me shared event here
        // socket.on("share_removed", () => {
        //     if (currentFolderId) {
        //         axiosApi.get(`/file/folder/${currentFolderId}`)
        //             .then(({ data }) => {
        //                 setCurrentFolderPermission(data.  //  someone removed from me shared event here
        //                     socket.on("share_removed", () => {
        //                         if (currentFolderId) {
        //                             axiosApi.get(`/file/folder/${currentFolderId}`)
        //                                 .then(({ data }) => {
        //                                     setCurrentFolderPermission(data.currentFolderPermission || null)
        //                                 })
        //                                 .catch(() => {
        //                                     //  if folder is no longer accisble go to dashboard page
        //                                     navigate("/dashboard")
        //                                 })
        //                         }
        //                     }) || null)
        //             })
        //             .catch(() => {
        //                 //  if folder is no longer accisble go to dashboard page
        //                 navigate("/dashboard")
        //             })
        //     }
        // })

        socket.on("share_removed", () => {
            if (currentFolderId) {
                // user is inside a folder - check if still have access
                axiosApi.get(`/file/folder/${currentFolderId}`)
                    .then(({ data }) => {
                        setCurrentFolderPermission(data.currentPermission || null)
                    })
                    .catch(() => {
                        // folder no longer accessible - kick user out
                        navigate(getPathPrefix())
                    })
            } else {
                // user is at root - just refetch to remove shared item from list
                fetchItems()
            }
        })

        //  when user uploaded some item in nested folder so socket event here
        socket.on("item_uploaded", ({ folderId }) => {
            if (!currentFolderId || String(currentFolderId) === String(folderId)) {
                fetchItems()
            }
        })

        // item renamed event here
        socket.on("item_renamed", ({ itemId, newName }) => {
            setItems(prev => prev.map(item =>
                item._id === itemId ? { ...item, name: newName, updatedAt: new Date().toISOString() } : item
            ))

            //  if in current folder and from breadcrumb it is changing so socket event
            if (itemId === currentFolderId) {
                setCurrentFolderMeta(prev => ({ ...prev, name: newName }))
                setTrail(prev => prev.map(t =>
                    t.id === itemId ? { ...t, name: newName } : t
                ))
            }
        })

        // item delete
        socket.on("item_deleted_forever", ({ itemId }) => {
            setItems(prev => prev.filter(i => i._id !== itemId))
        })

        //  folder icon change socket evetn
        socket.on("item_color_changed", ({ itemId, color }) => {
            setItems(prev => prev.map(item =>
                item._id === itemId ? { ...item, color, updatedAt: new Date().toISOString() } : item
            ))
        })

        // item moved socket
        socket.on("item_moved", ({ itemId, oldParent, newParent, movedItem }) => {
            // remove from old folder
            if (String(currentFolderId) === String(oldParent) || (!currentFolderId && !oldParent)) {
                setItems(prev => prev.filter(item => item._id.toString() !== itemId.toString()))
            }
            // add to new folder
            if (String(currentFolderId) === String(newParent) || (!currentFolderId && !newParent)) {
                setItems(prev => {
                    const exists = prev.some(item => String(item._id) === String(movedItem._id))
                    if (exists) return prev
                    return insertSorted(prev, movedItem)
                })
            }

            if (itemId === currentFolderId) {
                navigate(newParent ? `${getPathPrefix()}/folder/${newParent}` : getPathPrefix())
            }
        })

        //  item copied event 
        socket.on("item_copied", ({ parentId, newItem }) => {
            if (String(currentFolderId) === String(parentId) || (!currentFolderId && !parentId)) {
                setItems(prev => insertSorted(prev, newItem))
            }
        })


        //  here if user trash someting notify user 2 
        socket.on("item_trashed", ({ parentId, ids }) => {
            if (String(currentFolderId) === String(parentId) || (!currentFolderId && !parentId)) {
                setItems(prev => prev.filter(item => !ids.includes(item._id.toString())))
            }
            //  when user will move folder to trash through breadcrumb so user will redirect to dashboard page
            if (ids.includes(currentFolderId)) {
                navigate(getPathPrefix())
            }
        })

        //  here when user restor something it main screeen socket event
        socket.on("item_restored", ({ parentId }) => {
            console.log("RESTORE EVENT HIT:", parentId);
            if (currentFolderId === parentId || (!currentFolderId && !parentId)) {
                fetchItems()
            }
        })


        //  if inside the fodler new folder creating 
        socket.on("item_folder_created", ({ parentId, newFolder }) => {
            if (String(currentFolderId) === String(parentId)) {
                setItems(prev => {
                    const exists = prev.some(item => String(item._id) === String(newFolder._id))
                    if (exists) return prev
                    return insertSorted(prev, newFolder)
                })
            }
        })

        return () => {
            socket.off("share_added")
            socket.off("share_removed")
            socket.off("item_uploaded")
            socket.off("item_renamed")
            socket.off("item_deleted_forever")
            socket.off("item_color_changed")
            socket.off("item_moved")
            socket.off("item_copied")
            socket.off("item_restored")
            socket.off("item_trashed")
            socket.off("scan_complete")
            socket.off("item_folder_created")

        }

    }, [user?._id, socket, currentFolderId, fetchItems])





    // ##################################################
    // ---- STEP 5: Sync breadcrumb trail on URL change -
    // ##################################################
    useEffect(() => {
        clearSelection()
        setItems([]) // Clear old items immediately to prevent UI flicker
        if (!folderId) {
            setTrail([])
            setCurrentFolderPermission(null)
            return
        }

        const lastTrailId = trail[trail.length - 1]?.id
        if (lastTrailId === folderId) return

        axiosApi.get(`/file/folder/${folderId}`)
            .then(({ data }) => {
                console.log("currentPermission from backend:", data.currentPermission)
                setTrail(data.trail)
                setCurrentFolderPermission(data.currentPermission || null)   // get the current folder permission
                setCurrentFolderMeta(data.currentFolder || null)
            })
            .catch(() => {
                navigate(getPathPrefix())
            })
    }, [folderId])




    // use effect for on upload complete fetch all item and display to main screen
    useEffect(() => {
        setOnUploadComplete(async () => {
            await new Promise(r => setTimeout(r, 300))
            fetchItems()
        })
    }, [fetchItems, setOnUploadComplete])


    // ##################################################
    // ---- STEP 6: Open Folder Handler -----------------
    // ##################################################
    const openFolder = useCallback((folder) => {
        clearSelection()
        setItems([])           // clear old items immediately so no flicker
        setLoading(true)       // show loading spinner right away
        setCurrentFolderMeta(folder)
        // store the permission of current fodler 
        setCurrentFolderPermission(folder.permission || null)
        setTrail(prev => {
            const lastId = prev[prev.length - 1]?.id
            if (lastId === folder._id) return prev   // if folder id is same so dont push here
            return [...prev, { id: folder._id, name: folder.name }]
        })
        navigate(`${getPathPrefix()}/folder/${folder._id}`)
    }, [navigate, getPathPrefix])



    // ##################################################
    // ---- STEP 7: Navigate Breadcrumb Trail -----------
    // ##################################################
    const navigateTo = useCallback((depth) => {
        setItems([])           // clear old items immediately so no flicker
        setLoading(true)       // show loading spinner right away
        setTrail(prev => {
            clearSelection()
            const newTrail = prev.slice(0, depth)
            // update URL based on new trail
            if (newTrail.length === 0) {
                setCurrentFolderMeta(null)
                setCurrentFolderPermission(null)  // when user go back to the root so permission will be null
                navigate(getPathPrefix())
            } else {
                navigate(`${getPathPrefix()}/folder/${newTrail[newTrail.length - 1].id}`)
            }
            return newTrail
        })
    }, [navigate, getPathPrefix])


    // ##################################################
    // ---- STEP 8: Toggle Item Selection ---------------
    // ##################################################
    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id)
            return next;
        })
    }



    // ##################################################
    // ---- STEP 9: Trigger Item Highlight --------------
    // ##################################################
    const triggerHighlight = useCallback((id) => {
        if (!id) return
        setHighlightedId(id)
        setTimeout(() => {
            setHighlightedId(null)
        }, 2000)
    }, [])



    // ##################################################
    // ---- STEP 10: Rename Item API --------------------
    // ##################################################
    const renameItemApi = async (id, newName) => {
        try {
            const { data } = await axiosApi.patch("/file/rename", { id, newName })

            //  update the ui
            setItems(prev =>
                prev.map(item =>
                    item._id === id ? data.item : item
                )
            )

            // update search results
            if (isSearchMode) {
                setSearchResults(prev =>
                    prev.map(item =>
                        item._id === id ? { ...item, name: newName, updatedAt: data.item?.updatedAt || new Date().toISOString() } : item
                    )
                )
            }

            showNotification("Renamed successfully", "success", "bottom-center")

        } catch (error) {
            showNotification(error.response?.data?.message || "Rename failed", "error", "bottom-center")
        }
    }



    // ##################################################
    // ---- STEP 11: Delete Items API -------------------
    // ##################################################
    const deleteItemApi = async (ids) => {
        try {
            // Optimistically update the UI to feel instant
            setItems(prev => prev.filter(item => !ids.includes(item._id)))
            if (isSearchMode) {
                setSearchResults(prev => prev.filter(item => !ids.includes(item._id)))
            }
            setSelectedIds(new Set())

            // Send a single batch request to the server
            await axiosApi.post("/trash/delete", { ids })

            showNotification("Moved to trash", "success", "bottom-center")
        } catch (error) {
            // If the server fails (e.g. Access Denied), refresh to get the real state
            fetchItems()
            showNotification(error.response?.data?.message || "Move to trash failed", "error", "bottom-center")
        }
    }



    // ##################################################
    // ---- STEP 12: Change Folder Color API ------------
    // ##################################################
    const changeColorApi = async (ids, color) => {
        try {
            await axiosApi.patch("/file/color", { ids, color });

            //  update the ui
            setItems(prev =>
                prev.map(item =>
                    ids.includes(item._id) && item.type === "folder" ? { ...item, color, updatedAt: new Date().toISOString() } : item
                )
            );

            // update search results
            if (isSearchMode) {
                setSearchResults(prev =>
                    prev.map(item =>
                        ids.includes(item._id) && item.type === "folder" ? { ...item, color } : item
                    )
                )
            }

            //  clear selection here 
            setSelectedIds(new Set())

            showNotification("Icon changed", "success", "bottom-center")

        } catch (error) {
            showNotification(error.response?.data?.message || "Icon changed failed", "error", "bottom-center")
        }
    }


    // ##################################################
    // ---- STEP 13: Move Item API ----------------------
    // ##################################################
    const moveItemApi = async (itemId, destinationId, silent = false) => {
        try {
            await axiosApi.patch("/file/move", { itemId, destinationId: destinationId || null })
            setItems(prev => prev.filter(item => item._id !== itemId))
            if (isSearchMode) searchApi(searchFilters)
            setSelectedIds(new Set())
            if (!silent) showNotification("Item moved successfully", "success", "bottom-center")
        } catch (error) {
            if (!silent) showNotification(error.response?.data?.message || "Moved failed", "error", "bottom-center")
            throw error
        }
    }

    // ##################################################
    // ---- STEP 14: Copy Item API ----------------------
    // ##################################################
    const copyItemApi = async (itemId, destinationId, silent = false) => {
        try {
            const { data } = await axiosApi.post("/file/copy", { itemId, destinationId: destinationId || null })
            setSelectedIds(new Set())
            if (!silent) showNotification("Item copied successfully", "success", "bottom-center")
        } catch (error) {
            if (!silent) showNotification(error.response?.data?.message || "Copy failed", "error", "bottom-right")
            throw error
        }
    }



    // ##################################################
    // ---- STEP 15: Search Users API -------------------
    // ##################################################
    const searchUsersApi = async (query) => {
        try {
            const { data } = await axiosApi.get("/share/search", {
                params: { query }
            })
            return data.users || []
        } catch (error) {
            console.log(error.message)
            return []
        }
    }


    // ##################################################
    // ---- STEP 16: Get Shared Users API ---------------
    // ##################################################
    const getSharedUsersApi = async (itemId) => {
        try {
            const { data } = await axiosApi.get(`/share/${itemId}`)
            return data
        } catch (error) {
            console.log(error.message)
            return null
        }
    }


    // ##################################################
    // ---- STEP 17: Share Item API ---------------------
    // ##################################################
    const shareItemApi = async (ids, userIds, permission) => {
        try {
            const idArray = Array.isArray(ids) ? ids : [ids]
            await axiosApi.post("/share", { itemIds: idArray, userIds, permission })

            // update isShared in UI for all selected items
            const idSet = new Set(idArray.map(id => id.toString()))
            setItems(prev =>
                prev.map(item =>
                    idSet.has(item._id.toString()) ? { ...item, isShared: true } : item
                )
            )

            if (isSearchMode) {
                setSearchResults(prev =>
                    prev.map(item =>
                        idSet.has(item._id.toString()) ? { ...item, isShared: true } : item
                    )
                )
            }
        } catch (error) {
            alert(error.response?.data?.message || "Share failed")
        }
    }



    // ##################################################
    // ---- STEP 18: Unshare Item API -------------------
    // ##################################################
    const unshareItemApi = async (ids, userIds) => {
        try {
            const idArray = Array.isArray(ids) ? ids : [ids]
            await axiosApi.delete("/unshare", { data: { itemIds: idArray, userIds } })
        } catch (error) {
            alert(error.response?.data?.message || "Unshare failed")
        }
    }


    // ##################################################
    // ---- STEP 19: Create Folder API ------------------
    // ##################################################
    const createFolderApi = async (name) => {
        try {
            const { data } = await axiosApi.post("/file/create-folder", {
                name,
                parentId: currentFolderId || null
            })
            if (!currentFolderId) {
                setItems(prev => insertSorted(prev, data.folder))
            }
            showNotification("Folder created", "success", "bottom-center")
        } catch (error) {
            showNotification(
                error.response?.data?.message || "Folder creation failed",
                "error",
                "bottom-center"
            )
        }
    }




    //  here this is for when share user modal opens so suggested user will show there
    const getSuggestedUsersApi  = async () => {
        try {
            const {data} = await axiosApi.get("/share/suggested_users")
            return data.users || []

        } catch (error) {
            console.log(error.message)
            return []
        }
    }

    const clearSelection = () => setSelectedIds(new Set())


    //  if user is only the viewer so expose this permission
    const isViewerOnly = currentFolderPermission === "viewer"
    console.log("isViewerOnly:", isViewerOnly, "currentFolderPermission:", currentFolderPermission)


    return (
        <FileExplorerContext.Provider value={{
            trail,
            currentFolderId,
            items: sortedItems,
            loading,
            error,
            refetch: fetchItems,
            openFolder,
            navigateTo,
            selectedIds,
            setSelectedIds,
            toggleSelect,
            clearSelection,
            renameItem,
            setRenameItem,
            renameItemApi,
            deleteItemApi,
            changeColorApi,
            moveItemApi,
            copyItemApi,
            createFolderApi,
            currentFolderMeta,
            getSuggestedUsersApi,


            //  sorting 
            sortBy,
            setSortBy,
            sortOrder,
            setSortOrder,

            // highlight
            highlightedId,
            triggerHighlight,
            currentFolderPermission,
            isViewerOnly,

            // share
            searchUsersApi,
            getSharedUsersApi,
            shareItemApi,
            unshareItemApi
        }}>
            {children}
        </FileExplorerContext.Provider>
    )
}

export function useFileExplorer() {
    return useContext(FileExplorerContext)
}

