import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useUpload } from "./UploadContext";
import axiosApi from "../utils/api.js";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import { useNotification } from "./NotificationContext.jsx";
import { useSocket } from "./SocketContext.jsx";
import { useSearch } from "./SearchContext.jsx";
import { useSocketEvent } from "../hooks/useSocketEvent.js";

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
    const { socket } = useSocket()
    const { isSearchMode, setSearchResults, searchFilters, searchApi } = useSearch()

    const [trail, setTrail] = useState([])
    const trailRef = useRef([])
    useEffect(() => {
        trailRef.current = trail
    }, [trail])
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

    const [suggestedHasMore, setSuggestedHasMore] = useState(false)


    // Callback ref to notify Dashboard when items are unshared/removed in real-time
    const onItemsRemovedRef = useRef(null);
    const setOnItemsRemoved = useCallback((fn) => {
        onItemsRemovedRef.current = fn;
    }, []);


    //  this state user for geting user permission here like when user has a only viewer permission here so all funcionality will disbaled here
    const [currentFolderPermission, setCurrentFolderPermission] = useState(null)


    //  this is used for in breadcrumb when user goes inside folder so user want some action liek rename move copy 
    const [currentFolderMeta, setCurrentFolderMeta] = useState(null)



    //  this state is for suggested user so in search bar and share user modal search inpu 
    const [suggestedUsers, setSuggestedUsers] = useState([]);


    // this state is for the updating the share user modal users when editor or owner share or un share user
    const [sharedUsersData, setSharedUsersData] = useState({ itemId: null, owner: null, sharedWith: [] })

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
                valA = a.type === "folder" ? (a.totalSize || 0) : (a.fileSize || 0);
                valB = b.type === "folder" ? (b.totalSize || 0) : (b.fileSize || 0);
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
    const fetchRequestIdRef = useRef(0)

    const fetchItems = useCallback(async (showSpinner = true) => {
        const requestId = ++fetchRequestIdRef.current
        setError(null)
        if (showSpinner) setLoading(true)
        try {
            const { data } = await axiosApi.get("/file/get-files", {
                params: {
                    parent: currentFolderId ?? "null",
                    sortBy: sortByRef.current,
                    sortOrder: sortOrderRef.current
                }
            })

            // if a newer fetchItems() call has started since this one, drop this stale response
            if (requestId !== fetchRequestIdRef.current) return

            setItems(data.items)

        } catch (error) {
            if (requestId !== fetchRequestIdRef.current) return
            setError(error.response?.data?.message || "Failed to fetch files and folders")
        } finally {
            if (requestId === fetchRequestIdRef.current) {
                setLoading(false)
            }
        }
    }, [currentFolderId])

    const isNavigatingRef = useRef(false)
    const prevSearchModeRef = useRef(false)

    useEffect(() => {
        isNavigatingRef.current = false
        fetchItems()
    }, [fetchItems, location.pathname])

    //  re-fetch dashboard items when exit search mode here
    useEffect(() => {
        if (prevSearchModeRef.current && !isSearchMode) {
            if (!isNavigatingRef.current) {
                fetchItems()
            } else {
                console.log(`[FileExplorerContext] SKIPPED fetchItems — isNavigatingRef is true`)
            }
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
    // Each event is one stable useSocketEvent call.
    // The hook keeps the handler in a ref, so the handler always
    // reads the latest state/props without re-registering on every render.
    // ##################################################

    const rawUserId = user?._id || user?.id
    const myId = rawUserId ? String(rawUserId) : null

    // helpers — read live values directly (safe because hook always updates handlerRef)
    const isHere = (folderId) =>
        String(currentFolderId || null) === String(folderId || null)

    // --- scan_complete ---
    useSocketEvent(socket, "scan_complete", ({ fileId, status, newItem, folderId }) => {
        if (status === "infected") {
            setItems(prev => prev.filter(item => item._id !== fileId))
        } else if (status === "clean" && newItem) {
            if (isHere(folderId)) {
                setItems(prev => {
                    if (prev.some(item => String(item._id) === String(newItem._id))) return prev
                    let next = prev
                    if (newItem.replacesFileId) {
                        next = next.filter(e => String(e._id) !== String(newItem.replacesFileId))
                    }
                    return insertSorted(next, newItem)
                })
            }
        }
    })

    // --- share_added ---
    useSocketEvent(socket, "share_added", ({ itemIds, senderId } = {}) => {
        if (senderId && senderId !== myId) {
            fetchItems()
        }
        if (currentFolderId) {
            axiosApi.get(`/file/folder/${currentFolderId}`)
                .then(({ data }) => setCurrentFolderPermission(data.currentPermission || null))
                .catch(() => { })
        }

        if (itemIds?.length) {
            itemIds.forEach(id => {
                axiosApi.get(`/share/${id}`).then(({ data }) => {
                    setItems(prev => prev.map(item => {
                        if (item._id.toString() !== id.toString()) return item
                        const myShare = data.sharedWith?.find(s => String(s.userId?._id || s.userId || s) === myId)
                        const newPerm = myShare ? myShare.permission : item.permission
                        return { ...item, sharedWith: data.sharedWith, isShared: data.sharedWith.length > 0, permission: newPerm }
                    }))
                    if (sharedUsersData.itemId && String(id) === String(sharedUsersData.itemId)) {
                        setSharedUsersData(prev => ({
                            ...prev,
                            itemId: id,
                            owner: data.owner,
                            inheritedFolderOwner: data.inheritedFolderOwner || null,
                            sharedWith: data.sharedWith
                        }))
                    }
                }).catch(err => console.log("[share_added] fetch failed:", err.response?.status, err.message))
            })
        }
    })

    // --- share_removed ---
    useSocketEvent(socket, "share_removed", ({ itemIds, accessRevoked } = {}) => {
        if (accessRevoked) {
            if (itemIds && itemIds.length > 0) {
                setSelectedIds(prev => {
                    const next = new Set(prev)
                    itemIds.forEach(id => next.delete(String(id)))
                    return next
                })
                onItemsRemovedRef.current?.(itemIds)
            }

            if (currentFolderId) {
                axiosApi.get(`/file/folder/${currentFolderId}`)
                    .then(({ data }) => setCurrentFolderPermission(data.currentPermission || null))
                    .catch(() => {
                        const currentTrail = trailRef.current
                        const revokedIndex = currentTrail.findIndex(t => (itemIds || []).some(id => String(id) === String(t.id)))
                        if (revokedIndex > 0) {
                            const safeParent = currentTrail[revokedIndex - 1]
                            navigate(`${getPathPrefix()}/folder/${safeParent.id}`)
                        } else {
                            navigate(getPathPrefix())
                        }
                    })
            }
            fetchItems()
        }

        if (itemIds?.length) {
            itemIds.forEach(id => {
                axiosApi.get(`/share/${id}`).then(({ data }) => {
                    setItems(prev => prev.map(item => {
                        if (item._id.toString() !== id.toString()) return item
                        const myShare = data.sharedWith?.find(s => String(s.userId?._id || s.userId || s) === myId)
                        const newPerm = myShare ? myShare.permission : item.permission
                        return { ...item, sharedWith: data.sharedWith, isShared: data.sharedWith.length > 0, permission: newPerm }
                    }))
                }).catch(err => console.log("[share_removed] fetch failed:", err.response?.status, err.message))
            })
        }

        if (sharedUsersData.itemId && (!itemIds || itemIds.some(id => String(id) === String(sharedUsersData.itemId)))) {
            loadSharedUsers(sharedUsersData.itemId)
        }
    })

    // --- item_uploaded ---
    useSocketEvent(socket, "item_uploaded", ({ folderId, newItem, newItems }) => {
        if (!isHere(folderId)) return
        const itemsToAdd = (newItems?.length ? newItems : (newItem ? [newItem] : []))
            .filter(item => item.type === "folder" || item.scanStatus !== "scanning")

        if (itemsToAdd.length > 0) {
            setItems(prev => {
                let next = [...prev]
                itemsToAdd.forEach(item => {
                    if (item.replacesFileId) {
                        next = next.filter(e => String(e._id) !== String(item.replacesFileId))
                    }
                    if (!next.some(e => String(e._id) === String(item._id))) {
                        next = insertSorted(next, item)
                    }
                })
                return next
            })
        } else if (!(newItems?.length || newItem)) {
            fetchItems()
        }
    })

    // --- item_renamed ---
    useSocketEvent(socket, "item_renamed", ({ itemId, newName }) => {
        setItems(prev => prev.map(item =>
            item._id === itemId ? { ...item, name: newName, updatedAt: new Date().toISOString() } : item
        ))
        if (itemId === currentFolderId) {
            setCurrentFolderMeta(prev => ({ ...prev, name: newName }))
        }
        setTrail(prev => prev.map(t => t.id === itemId ? { ...t, name: newName } : t))
    })

    // --- item_color_changed ---
    useSocketEvent(socket, "item_color_changed", ({ itemId, color }) => {
        setItems(prev => prev.map(item =>
            item._id === itemId ? { ...item, color, updatedAt: new Date().toISOString() } : item
        ))
    })

    // --- item_moved ---
    useSocketEvent(socket, "item_moved", ({ itemId, oldParent, newParent, movedItem, reason }) => {
        // remove from old folder
        if (isHere(oldParent)) {
            setItems(prev => prev.filter(item => item._id.toString() !== itemId.toString()))
        }
        // add to new folder
        if (isHere(newParent)) {
            if (!newParent && myId && movedItem?.owner) {
                const movedItemOwnerId = typeof movedItem.owner === "object" ? movedItem.owner._id : movedItem.owner
                if (myId !== String(movedItemOwnerId)) return
            }
            setItems(prev => {
                if (prev.some(item => String(item._id) === String(movedItem._id))) return prev
                return insertSorted(prev, movedItem)
            })
        }
        if (itemId === currentFolderId && reason !== "removed") {
            navigate(newParent ? `${getPathPrefix()}/folder/${newParent}` : getPathPrefix())
        }
    })

    // --- item_copied ---
    useSocketEvent(socket, "item_copied", ({ parentId, newItem }) => {
        if (!isHere(parentId)) return
        if (!parentId && myId && newItem?.owner) {
            const newItemOwnerId = typeof newItem.owner === "object" ? newItem.owner._id : newItem.owner
            if (myId !== String(newItemOwnerId)) return
        }
        setItems(prev => insertSorted(prev, newItem))
    })

    // --- item_trashed ---
    useSocketEvent(socket, "item_trashed", (data) => {
        const { parentId, ids, itemId, oldParent } = data
        const trashedIds = ids ? ids.map(String) : (itemId ? [String(itemId)] : [])

        // remove by id no matter which folder/tab I'm in (if it's not on screen, filter does nothing)
        setItems(prev => prev.filter(item => !trashedIds.includes(item._id.toString())))

        const currentTrail = trailRef.current
        const trashedIndex = currentTrail.findIndex(t => trashedIds.includes(String(t.id)))

        if (trashedIndex !== -1) {
            const safeParent = trashedIndex > 0 ? currentTrail[trashedIndex - 1] : null
            if (safeParent) {
                navigate(`${getPathPrefix()}/folder/${safeParent.id}`)
            } else {
                navigate(getPathPrefix())
            }
        } else if (trashedIds.includes(String(currentFolderId))) {
            navigate(parentId ? `${getPathPrefix()}/folder/${parentId}` : getPathPrefix())
        }
    })

    // --- item_restored ---
    useSocketEvent(socket, "item_restored", () => {
        fetchItems(false)
    })

    // --- item_folder_created ---
    useSocketEvent(socket, "item_folder_created", ({ parentId, newFolder }) => {
        if (String(currentFolderId) === String(parentId)) {
            setItems(prev => {
                if (prev.some(item => String(item._id) === String(newFolder._id))) return prev
                return insertSorted(prev, newFolder)
            })
        }
    })

    // --- global_user_profile_updated ---
    useSocketEvent(socket, "global_user_profile_updated", (updatedUser) => {
        if (!updatedUser?._id) return

        setItems(prev => prev.map(item => {
            if (!item) return item
            let updatedItem = { ...item }

            if (updatedItem.owner) {
                const ownerId = typeof updatedItem.owner === "object" ? (updatedItem.owner._id || updatedItem.owner.userId) : updatedItem.owner
                if (ownerId && String(ownerId) === String(updatedUser._id) && typeof updatedItem.owner === "object") {
                    updatedItem.owner = { ...updatedItem.owner, ...updatedUser }
                }
            }

            if (Array.isArray(updatedItem.sharedWith)) {
                updatedItem.sharedWith = updatedItem.sharedWith.map(s => {
                    if (!s) return s
                    const memberId = typeof s === "object" ? (s.userId || s._id) : s
                    if (memberId && String(memberId) === String(updatedUser._id)) {
                        return typeof s === "object" ? { ...s, ...updatedUser } : s
                    }
                    return s
                })
            }

            return updatedItem
        }))

        setSuggestedUsers(prev => prev.map(u =>
            String(u._id) === String(updatedUser._id) ? { ...u, ...updatedUser } : u
        ))

        setSharedUsersData(prev => {
            if (!prev.itemId) return prev
            let changed = false
            let nextOwner = prev.owner
            if (prev.owner && String(prev.owner.userId) === String(updatedUser._id)) {
                nextOwner = { ...prev.owner, ...updatedUser }
                changed = true
            }
            const nextSharedWith = prev.sharedWith.map(s => {
                const memberId = s.userId || s._id
                if (String(memberId) === String(updatedUser._id)) {
                    changed = true
                    return { ...s, ...updatedUser }
                }
                return s
            })
            return changed ? { ...prev, owner: nextOwner, sharedWith: nextSharedWith } : prev
        })
    })

    // --- folder_size_updated ---
    useSocketEvent(socket, "folder_size_updated", ({ updates }) => {
        if (!updates?.length) return
        const sizeMap = new Map(updates.map(u => [String(u.folderId), u.totalSize]))
        setItems(prev => prev.map(item =>
            item.type === "folder" && sizeMap.has(String(item._id))
                ? { ...item, totalSize: sizeMap.get(String(item._id)) }
                : item
        ))
    })

    // --- folder_replaced ---
    useSocketEvent(socket, "folder_replaced", ({ oldFolderId, newFolderId }) => {
        setItems(prev => prev.filter(i => String(i._id) !== String(oldFolderId)))

        const currentTrail = trailRef.current
        const idx = currentTrail.findIndex(t => String(t.id) === String(oldFolderId))

        if (String(currentFolderId) === String(oldFolderId) || idx !== -1) {
            navigate(`${getPathPrefix()}/folder/${newFolderId}`)
        }
    })

    // re-sync items when the socket reconnects (wifi drop, laptop sleep, manual reconnect)
    const hasConnectedOnceRef = useRef(false)

    useEffect(() => {
        if (!socket) return
        hasConnectedOnceRef.current = socket.connected // already connected = first connect is done

        const handleConnect = () => {
            if (!hasConnectedOnceRef.current) {
                hasConnectedOnceRef.current = true // first connect: page already fetched, skip
                return
            }
            fetchItems() // real reconnect: catch up
        }

        socket.on("connect", handleConnect)
        return () => socket.off("connect", handleConnect)
    }, [socket, fetchItems])




    // ##################################################
    // ---- STEP 5: Sync breadcrumb trail on URL change -
    // ##################################################
    useEffect(() => {
        setHighlightedId(null)
        clearSelection()
        setItems([]) // Clear old items immediately to prevent UI flicker
        if (!folderId) {
            setTrail([])
            setCurrentFolderPermission(null)
            return
        }

        // const lastTrailId = trail[trail.length - 1]?.id
        // if (lastTrailId === folderId) return

        axiosApi.get(`/file/folder/${folderId}`)
            .then(({ data }) => {
                setTrail(data.trail)
                setCurrentFolderPermission(data.currentPermission || null)   // get the current folder permission
                setCurrentFolderMeta(data.currentFolder || null)
            })
            .catch(() => {
                navigate(getPathPrefix())
            })
    }, [folderId])





    // useEffect(() => {
    //     setOnUploadComplete(async () => {
    //         await new Promise(r => setTimeout(r, 300))
    //         fetchItems()
    //     })
    // }, [fetchItems, setOnUploadComplete])

    // use effect for on upload complete fetch all item and display to main screen
    useEffect(() => {
        setOnUploadComplete(() => {
            // No-op or notification trigger — items are inserted via Socket / direct response without full API refetch
        })
    }, [setOnUploadComplete])


    // ##################################################
    // ---- STEP 6: Open Folder Handler -----------------
    // ##################################################
    const openFolder = useCallback((folder) => {
        isNavigatingRef.current = true
        clearSelection()
        setItems([])
        setLoading(true)
        setCurrentFolderMeta(folder)

        // store the permission of current folder
        setCurrentFolderPermission(folder.permission || null)

        const isDirectChild = String(folder.parent || "null") === String(currentFolderId || "null")
        if (isDirectChild) {
            setTrail(prev => {
                const lastId = prev[prev.length - 1]?.id
                if (lastId === folder._id) return prev

                // Add color and share properties so the breadcrumb knows what icon to show
                return [...prev, {
                    id: folder._id,
                    name: folder.name,
                    color: folder.color,
                    isShared: folder.isShared,
                    isSharedWithMe: folder.isSharedWithMe
                }]
            })
        } else {
            setTrail([])
        }
        navigate(`${getPathPrefix()}/folder/${folder._id}`)
    }, [navigate, getPathPrefix, currentFolderId])



    // ##################################################
    // ---- STEP 7: Navigate Breadcrumb Trail -----------
    // ##################################################
    const navigateTo = useCallback((depth) => {
        isNavigatingRef.current = true
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

    const prepareNavigation = useCallback(() => {
        isNavigatingRef.current = true
        setItems([])
        setLoading(true)
    }, [])

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
                    item._id === id ? {
                        ...item,
                        name: newName,
                        updatedAt: data.item?.updatedAt || new Date().toISOString()
                    } : item
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
    const deleteItemApi = async (ids, toastMessage = "Moved to trash") => {
        try {
            // Optimistically update the UI to feel instant
            setItems(prev => prev.filter(item => !ids.includes(item._id)))
            if (isSearchMode) {
                setSearchResults(prev => prev.filter(item => !ids.includes(item._id)))
            }
            setSelectedIds(new Set())

            // Send a single batch request to the server
            await axiosApi.post("/trash/delete", { ids })

            // ONLY show notification if a message was provided
            if (toastMessage) {
                showNotification(toastMessage, "success", "bottom-center")
            }
        } catch (error) {
            // If the server fails (e.g. Access Denied), refresh to get the real state
            fetchItems()
            showNotification("Move to trash failed", "error", "bottom-center")
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

            showNotification("Folder color changed", "success", "bottom-center")

        } catch (error) {
            showNotification(error.response?.data?.message || "Folder color changed failed", "error", "bottom-center")
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
    const shareItemApi = async (ids, userIds, permission, applyToChildren = false) => {
        try {
            const idArray = Array.isArray(ids) ? ids : [ids]
            await axiosApi.post("/share", { itemIds: idArray, userIds, permission, applyToChildren })

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
            const idSet = new Set(idArray.map(id => id.toString()))
            const userIdSet = new Set(userIds.map(id => id.toString()))

            await axiosApi.delete("/unshare", { data: { itemIds: idArray, userIds } })

            setItems(prev => prev.map(item => {
                if (!idSet.has(item._id.toString())) return item
                const nextSharedWith = (item.sharedWith || []).filter(
                    s => !userIdSet.has((s.userId?._id || s.userId).toString())
                )
                return { ...item, sharedWith: nextSharedWith, isShared: nextSharedWith.length > 0 }
            }))

            if (isSearchMode) {
                setSearchResults(prev => prev.map(item => {
                    if (!idSet.has(item._id.toString())) return item
                    const nextSharedWith = (item.sharedWith || []).filter(
                        s => !userIdSet.has((s.userId?._id || s.userId).toString())
                    )
                    return { ...item, sharedWith: nextSharedWith, isShared: nextSharedWith.length > 0 }
                }))
            }

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

            setItems(prev => {
                // Check if socket already added it to prevent duplicates
                const exists = prev.some(item => String(item._id) === String(data.folder._id))
                if (exists) return prev

                return insertSorted(prev, data.folder)
            })

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
    const getSuggestedUsersApi = async (itemId, page = 1) => {
        try {
            const { data } = await axiosApi.get("/share/suggested_users", {
                params: { itemId, page, limit: 10 }
            })
            const users = data.users || []

            setSuggestedUsers(prev => {
                if (page === 1) return users                 // first page replaces the list
                const seen = new Set(prev.map(u => String(u._id)))
                return [...prev, ...users.filter(u => !seen.has(String(u._id)))]   // later pages append, no duplicates
            })
            setSuggestedHasMore(Boolean(data.hasMore))

            return users
        } catch (error) {
            console.log(error.message)
            return null   // null = failed, so the modal won't advance the page
        }
    }


    //  this function is used for in list view shared filed to update the user list there 
    const updateSharedWith = (itemId, sharedWithArray, isShared) => {
        const formattedSharedWith = sharedWithArray.map(s => ({
            ...s,
            userId: typeof s.userId === 'object' && s.userId !== null
                ? s.userId
                : { _id: s.userId, name: s.name, email: s.email, profilePic: s.profilePic }
        }));
        setItems(prev =>
            prev.map(item =>
                item._id === itemId ? { ...item, sharedWith: formattedSharedWith, isShared } : item
            )
        );
    };


    //  this is for the updating the share user modal user list when owner or editor share or un share
    const loadSharedUsers = async (itemId) => {
        const data = await getSharedUsersApi(itemId)
        if (data) {
            setSharedUsersData({ itemId, owner: data.owner, inheritedFolderOwner: data.inheritedFolderOwner || null, sharedWith: data.sharedWith, permission: data.permission })
        }
        return data
    }

    const clearSharedUsers = () => {
        setSharedUsersData({ itemId: null, owner: null, inheritedFolderOwner: null, sharedWith: [] })
    }



    // this function is calculating the folder size
    const getFolderSizeApi = async (folderId) => {
        try {
            const { data } = await axiosApi.get(`/file/folder/${folderId}/size`)
            return data
        } catch (error) {
            console.error(error.message)
            return null
        }
    }

    const clearSelection = useCallback(() => {
        setSelectedIds(prev => (prev.size === 0 ? prev : new Set()))
    }, [])


    //  if user is only the viewer so expose this permission
    const isViewerOnly = currentFolderPermission === "viewer"


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
            updateSharedWith,
            getFolderSizeApi,
            prepareNavigation,


            //  sorting 
            sortBy,
            setSortBy,
            sortOrder,
            setSortOrder,

            // highlight
            highlightedId,
            setHighlightedId,
            triggerHighlight,
            currentFolderPermission,
            isViewerOnly,

            // share
            searchUsersApi,
            getSharedUsersApi,
            shareItemApi,
            unshareItemApi,
            suggestedUsers,
            suggestedHasMore,
            setOnItemsRemoved,
            sharedUsersData,
            loadSharedUsers,
            clearSharedUsers,
        }}>
            {children}
        </FileExplorerContext.Provider>
    )
}

export function useFileExplorer() {
    return useContext(FileExplorerContext)
}

