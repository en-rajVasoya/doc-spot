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
            // await new Promise(resolve => setTimeout(resolve, 100))
            setItems(data.items)

        } catch (error) {
            setError(error.response?.data?.message || "Failed to fetch files and folders")
        } finally {
            setLoading(false)
        }
    }, [currentFolderId])

    const isNavigatingRef = useRef(false)
    const prevSearchModeRef = useRef(false)

    useEffect(() => {
        isNavigatingRef.current = false
        fetchItems()
    }, [fetchItems, location.pathname])

    //  re-fetch dashboard items when exiting search mode here
    useEffect(() => {
        if (prevSearchModeRef.current && !isSearchMode) {
            if (!isNavigatingRef.current) {
                fetchItems()
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
        socket.off("scan_complete")
        socket.off("item_folder_created")
        socket.off("global_user_profile_updated")


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


        socket.on("share_added", ({ itemIds } = {}) => {
            if (!currentFolderId) {
                fetchItems();
            }
            if (currentFolderId) {
                axiosApi.get(`/file/folder/${currentFolderId}`)
                    .then(({ data }) => {
                        setCurrentFolderPermission(data.currentPermission || null);
                    });
            }

            // this is for when share user modal is opned here so update user list when other user sahre o run share user
            if (sharedUsersData.itemId && (!itemIds || itemIds.some(id => String(id) === String(sharedUsersData.itemId)))) {
                loadSharedUsers(sharedUsersData.itemId)
            }
        });


        socket.on("share_removed", ({ itemIds, accessRevoked } = {}) => {

            // ONLY kick out user, deselect items, and auto-close modals if THIS user's access was revoked!
            if (accessRevoked) {
                if (itemIds && itemIds.length > 0) {
                    setSelectedIds(prev => {
                        const next = new Set(prev);
                        itemIds.forEach(id => next.delete(String(id)));
                        return next;
                    });
                    onItemsRemovedRef.current?.(itemIds);
                }

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
            }

            // refresh the share user modal when other user changes it 
            if (sharedUsersData.itemId && (!itemIds || itemIds.some(id => String(id) === String(sharedUsersData.itemId)))) {
                loadSharedUsers(sharedUsersData.itemId)
            }
        })

        socket.on("item_uploaded", ({ folderId, newItem, newItems }) => {
            if (String(currentFolderId) === String(folderId) || (!currentFolderId && !folderId)) {
                const itemsToAdd = newItems?.length ? newItems : (newItem ? [newItem] : []);
                if (itemsToAdd.length > 0) {
                    setItems(prev => {
                        let next = [...prev];
                        itemsToAdd.forEach(item => {
                            if (item.replacesFileId) {
                                next = next.filter(existing => String(existing._id) !== String(item.replacesFileId));
                            }
                            if (!next.some(existing => String(existing._id) === String(item._id))) {
                                next = insertSorted(next, item);
                            }
                        });
                        return next;
                    });
                } else {
                    fetchItems();
                }
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
                // If moving to Root (newParent is null), only add to screen if current user is the owner of movedItem
                if (!newParent && user?._id && movedItem?.owner) {
                    const movedItemOwnerId = typeof movedItem.owner === "object" ? movedItem.owner._id : movedItem.owner;
                    if (String(user._id) !== String(movedItemOwnerId)) {
                        return;
                    }
                }

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
                // If copying to Root (parentId is null), only add to screen if current user is the owner of newItem
                if (!parentId && user?._id && newItem?.owner) {
                    const newItemOwnerId = typeof newItem.owner === "object" ? newItem.owner._id : newItem.owner;
                    if (String(user._id) !== String(newItemOwnerId)) {
                        return;
                    }
                }
                setItems(prev => insertSorted(prev, newItem))
            }
        })





        //  here if user trash someting notify user 2 
        const handleItemTrashed = (data) => {
            const { parentId, ids, itemId, oldParent } = data;

            if (ids) {
                // triggered via notifySharedUsers
                if (String(currentFolderId) === String(parentId) || (!currentFolderId && !parentId)) {
                    setItems(prev => prev.filter(item => !ids.includes(item._id.toString())));
                }
                if (ids.includes(currentFolderId)) {
                    navigate(getPathPrefix());
                }
            } else if (itemId) {
                // triggered via crossUserItemsMap (shared file trashed by another user)
                if (String(currentFolderId) === String(oldParent) || (!currentFolderId && !oldParent)) {
                    setItems(prev => prev.filter(item => item._id.toString() !== itemId.toString()));
                }

                // If the editor deleted the folder the owner is currently looking at, kick the owner out to root!
                if (String(itemId) === String(currentFolderId)) {
                    navigate(getPathPrefix());
                }

            }
        };

        socket.on("item_trashed", handleItemTrashed);

        //  here when user restor something it main screeen socket event
        socket.on("item_restored", ({ parentId }) => {

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


        //  here this socket is for the profile update global all users will see this here
        // Listen for global profile updates (updates dashboard items AND suggestedUsers centrally)
        socket.on("global_user_profile_updated", (updatedUser) => {
            if (!updatedUser?._id) return;

            // 1. Update dashboard items (owners and sharedWith)
            setItems(prev => prev.map(item => {
                if (!item) return item;
                let updatedItem = { ...item };

                if (updatedItem.owner) {
                    const ownerId = typeof updatedItem.owner === "object" ? (updatedItem.owner._id || updatedItem.owner.userId) : updatedItem.owner;
                    if (ownerId && String(ownerId) === String(updatedUser._id)) {
                        if (typeof updatedItem.owner === "object") {
                            updatedItem.owner = { ...updatedItem.owner, ...updatedUser };
                        }
                    }
                }

                if (Array.isArray(updatedItem.sharedWith)) {
                    updatedItem.sharedWith = updatedItem.sharedWith.map(s => {
                        if (!s) return s;
                        const memberId = typeof s === "object" ? (s.userId || s._id) : s;
                        if (memberId && String(memberId) === String(updatedUser._id)) {
                            return typeof s === "object" ? { ...s, ...updatedUser } : s;
                        }
                        return s;
                    });
                }

                return updatedItem;
            }));

            // 2. Update suggestedUsers centrally so Modals and SearchBars automatically update live
            setSuggestedUsers(prev => prev.map(u =>
                String(u._id) === String(updatedUser._id) ? { ...u, ...updatedUser } : u
            ));

            // 3. Update the open Share modal's owner/sharedWith data if it matches
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
        });

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
            socket.off("item_trashed", handleItemTrashed)
            socket.off("scan_complete")
            socket.off("item_folder_created")
            socket.off("global_user_profile_updated")
        }

    }, [user?._id, socket, currentFolderId, fetchItems, sharedUsersData.itemId])





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
    const getSuggestedUsersApi = async () => {
        try {
            const { data } = await axiosApi.get("/share/suggested_users")
            const users = data.users || []

            setSuggestedUsers(users)

            return users

        } catch (error) {
            console.log(error.message)
            return []
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
            setSharedUsersData({ itemId, owner: data.owner, sharedWith: data.sharedWith })
        }
        return data
    }

    const clearSharedUsers = () => {
        setSharedUsersData({ itemId: null, owner: null, sharedWith: [] })
    }



    // this function is calculating the folder size
    const getFolderSizeApi = async (folderId) => {
        try {
            const { data } = await axiosApi.get(`/file/folder/${folderId}/size`)
            return data.size
        } catch (error) {
            console.error(error.message)
            return null
        }
    }

    const clearSelection = () => setSelectedIds(new Set())


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

