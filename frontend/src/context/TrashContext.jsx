
import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import axiosApi from "../utils/api.js";
import { useNotification } from "./NotificationContext.jsx";
import { useAuth } from "./AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { useFileExplorer } from "./FileExplorerContext.jsx";
import { useSocket } from "./SocketContext.jsx";


const TrashContext = createContext()



export function TrashProvider({ children }) {
    const { showNotification, removeNotification } = useNotification()
    const { user } = useAuth()
    const navigate = useNavigate()
    const { folderId } = useParams()
    const { socket } = useSocket()

    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [trail, setTrail] = useState([])
    const [selectedIds, setSelectedIds] = useState(new Set())
    const [isRestoring, setIsRestoring] = useState(false)

    //  here we are defining current folder id when child so child id
    const currentFolderId = trail.length ? trail[trail.length - 1].id : null;





    // Sorting state
    const [sortBy, setSortBy] = useState(() => localStorage.getItem("docspot_trash_sortBy") || "modified")
    const [sortOrder, setSortOrder] = useState(() => localStorage.getItem("docspot_trash_sortOrder") || "desc")

    //  sorting ref here
    const sortByRef = useRef(sortBy)
    const sortOrderRef = useRef(sortOrder)

    useEffect(() => {
        sortByRef.current = sortBy
        sortOrderRef.current = sortOrder
    }, [sortBy, sortOrder])

    // In-memory sorting hook specifically for Trash
    const sortedItems = useMemo(() => {
        const itemsCopy = [...items]

        itemsCopy.sort((a, b) => {
            if (a.type !== b.type) {
                return a.type === "folder" ? -1 : 1
            }

            let valA, valB
            if (sortBy === "name") {
                valA = a.name.toLowerCase()
                valB = b.name.toLowerCase()
            } else if (sortBy === "size") {
                valA = a.type === "folder" ? (a.totalSize || 0) : (a.fileSize || 0);
                valB = b.type === "folder" ? (b.totalSize || 0) : (b.fileSize || 0);
            } else {
                valA = new Date(a.trashedAt || a.updatedAt).getTime()
                valB = new Date(b.trashedAt || b.updatedAt).getTime()
            }

            if (valA < valB) return sortOrder === "asc" ? -1 : 1
            if (valA > valB) return sortOrder === "asc" ? 1 : -1

            return new Date(b.createdAt) - new Date(a.createdAt)
        })

        return itemsCopy
    }, [items, sortBy, sortOrder])



    // fetch all trashed items here
    const fetchTrashedItems = useCallback(async () => {
        setError(null)
        setLoading(true)

        try {
            const { data } = await axiosApi.get("/trash/trash-items", {
                params: {
                    parent: currentFolderId ?? undefined,
                    sortBy: sortByRef.current,
                    sortOrder: sortOrderRef.current
                }
            })

            // just set items directly (no more pagination logic)
            setItems(data.items)

        } catch (error) {
            setError(error.response?.data?.message || "Failed to fetch trash items")
        } finally {
            setLoading(false)
        }
    }, [currentFolderId])




    useEffect(() => {
        fetchTrashedItems()
    }, [fetchTrashedItems])

    //  here when url changes sync the trail here
    useEffect(() => {
        if (!folderId) {
            setTrail([])
            return
        }

        // get folder id here
        const lastTrailId = trail[trail.length - 1]?.id
        if (lastTrailId === folderId) return


        // here get that data
        axiosApi.get(`/file/folder/${folderId}`)
            .then(({ data }) => {
                setTrail(data.trail)
            })
            .catch(() => {
                navigate("/trash-dashboard")
            })

    }, [folderId])

    //  socket event here
    useEffect(() => {
        if (!user?._id || !socket) return;

        const handleItemTrashedForTrash = () => {
            if (!currentFolderId) {
                fetchTrashedItems()
            }
        }

        const handleItemDeletedForever = ({ itemId, itemIds } = {}) => {
            const deletedSet = new Set((itemIds || [itemId]).filter(Boolean).map(String));
            setItems(prev => prev.filter(i => !deletedSet.has(String(i._id))));
            if (currentFolderId && deletedSet.has(String(currentFolderId))) {
                navigate("/trash-dashboard");
            }
        }

        socket.on("item_trashed", handleItemTrashedForTrash)
        socket.on("item_deleted_forever", handleItemDeletedForever)

        return () => {
            socket.off("item_trashed", handleItemTrashedForTrash)
            socket.off("item_deleted_forever", handleItemDeletedForever)
        }

    }, [user?._id, currentFolderId, fetchTrashedItems, socket])


    //  here we are using open folder to user can go inside that folder
    const openFolder = useCallback((folder) => {
        clearSelection()
        setItems([])           // clear old items immediately so no flicker
        setLoading(true)       // show loading spinner right away
        setTrail(prev => {
            const lastId = prev[prev.length - 1]?.id
            if (lastId === folder._id) return prev    // here if last folder id is same so dont push it here
            return [...prev, { id: folder._id, name: folder.name }]
        })
        navigate(`/trash-dashboard/folder/${folder._id}`)

    }, [navigate])


    //  breadcumb navigation to track back folders here
    const navigateTo = useCallback((depth) => {
        setItems([])           // clear old items immediately so no flicker
        setLoading(true)       // show loading spinner right away
        setTrail(prev => {
            clearSelection()
            const newTrail = prev.slice(0, depth)
            if (newTrail.length === 0) {
                navigate("/trash-dashboard")
            } else {
                navigate(`/trash-dashboard/folder/${newTrail[newTrail.length - 1].id}`)
            }
            return newTrail
        })
    }, [navigate])


    //  restore item here
    const restoreItemApi = async (ids, silent = false) => {
        if (isRestoring) return // Prevents clicking 2 or 3 times!

        const idArray = Array.isArray(ids) ? ids : [ids]
        setIsRestoring(true)

        try {
            const { data } = await axiosApi.post("/trash/restore", { ids: idArray })

            const failedSet = new Set((data.failed || []).map(f => String(f.id)))
            const restoredSet = new Set(idArray.map(String).filter(id => !failedSet.has(id)))

            setItems(prev => prev.filter(item => !restoredSet.has(String(item._id))))
            setSelectedIds(new Set())

            if (!silent) {
                if (failedSet.size > 0) {
                    showNotification(`${data.restored} restored, ${failedSet.size} failed`, "error", "bottom-center")
                } else {
                    const message = restoredSet.size > 1 ? "Items restored successfully" : "Item restored successfully"
                    showNotification(message, "success", "bottom-center")
                }
            }

            if (currentFolderId && restoredSet.has(String(currentFolderId))) {
                navigate("/trash-dashboard")
            }

            return data
        } catch (error) {
            showNotification(error.response?.data?.message || "Restore failed", "error", "bottom-center")
        } finally {
            setIsRestoring(false)
        }
    }




    //  delete item forever here
    const deleteForeverApi = async (ids) => {
        const idArray = Array.isArray(ids) ? ids : [ids]
        let loadingId;
        try {
            loadingId = showNotification("Deleting...", "info", "bottom-center")
            await axiosApi.delete("/trash/delete-forever", { data: { ids: idArray } })
            setItems(prev => prev.filter(item => !idArray.includes(item._id)))
            setSelectedIds(new Set())
            if (loadingId) {
                removeNotification(loadingId)
            }
            showNotification("Deleted forever", "success", "bottom-center")
            if (idArray.includes(currentFolderId)) {
                navigate("/trash-dashboard")
            }
        } catch (error) {
            if (loadingId) {
                removeNotification(loadingId)
            }
            showNotification(error.response?.data?.message || "Delete forever failed", "error", "bottom-center")
        }
    }

    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const clearSelection = () => setSelectedIds(new Set())


    return (
        <TrashContext.Provider value={{
            items,
            loading,
            error,
            trail,
            currentFolderId,
            selectedIds,
            setSelectedIds,
            toggleSelect,
            clearSelection,
            fetchTrashedItems,
            openFolder,
            navigateTo,
            restoreItemApi,
            deleteForeverApi,
            sortedItems,
            sortBy,
            setSortBy,
            sortOrder,
            setSortOrder,
            isRestoring
        }}>
            {children}
        </TrashContext.Provider>
    )
}



export function useTrash() {
    return useContext(TrashContext)
}

