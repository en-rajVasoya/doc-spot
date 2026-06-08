
import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
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
    const { socketRef } = useSocket()

    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [trail, setTrail] = useState([])
    const [selectedIds, setSelectedIds] = useState(new Set())


    //  here we are defining current folder id when child so child id
    const currentFolderId = trail.length ? trail[trail.length - 1].id : null;


    //  scroll pagination here 
    const [hasMoreItems, setHasMoreItems] = useState(false)
    const [loadingMoreItems, setLoadingMoreItems] = useState(false)
    const itemsLengthRef = useRef(0)

    useEffect(() => {
        itemsLengthRef.current = items.length
    }, [items])

    //  fetch all trashed items here
    const fetchTrashedItems = useCallback(async (isAppend = false) => {
        if (!isAppend) {
            setError(null)
            setLoading(true)
        } else {
            setLoadingMoreItems(true)
        }
        try {
            const skip = isAppend ? itemsLengthRef.current : 0
            const { data } = await axiosApi.get("/trash/trash-items", {
                params: { parent: currentFolderId ?? undefined, limit: 50, skip }
            })
            if (isAppend) {
                setItems(prev => {
                    const existingIds = new Set(prev.map(i => i._id.toString()))
                    return [...prev, ...data.items.filter(i => !existingIds.has(i._id.toString()))]
                })
            } else {
                setItems(data.items)
            }
            setHasMoreItems(data.hasMore || false)
        } catch (error) {
            setError(error.response?.data?.message || "Failed to fetch trash items")
        } finally {
            setLoading(false)
            setLoadingMoreItems(false)
        }
    }, [currentFolderId])

    const loadMoreItems = useCallback(() => {
        if (loadingMoreItems || !hasMoreItems) return
        fetchTrashedItems(true)
    }, [loadingMoreItems, hasMoreItems, fetchTrashedItems])

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
        if (!user?._id) return;
        if (!socketRef.current) return;

        //  socket event here
        socketRef.current.off("item_trashed")
        // socketRef.current.off("item_restored")

        //  if any item get trashed trash page refresh
        socketRef.current.on("item_trashed", ({ parentId }) => {
            if (!currentFolderId) {
                fetchTrashedItems()
            }
        })

        //  here if any item is restored then refresh page
        // socketRef.current.on("item_restored", ({ parentId }) => {
        //     if (currentFolderId === parentId || (!currentFolderId && !parentId)) {
        //         fetchTrashedItems()
        //     }
        // })

        return () => {
            socketRef.current.off("item_trashed")
            // socketRef.current.off("item_restored")
        }

    }, [user?._id, currentFolderId, fetchTrashedItems])


    //  here we are using open folder to user can go inside that folder
    const openFolder = useCallback((folder) => {
        clearSelection()
        setTrail(prev => {
            const lastId = prev[prev.length - 1]?.id
            if (lastId === folder._id) return prev    // here if last folder id is same so dont push it here
            return [...prev, { id: folder._id, name: folder.name }]
        })
        navigate(`/trash-dashboard/folder/${folder._id}`)

    }, [navigate])


    //  breadcumb navigation to track back folders here
    const navigateTo = useCallback((depth) => {
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
    const restoreItemApi = async (id, silent = false) => {
        try {
            const { data } = await axiosApi.post("/trash/restore", { id })
            setItems(prev => prev.filter(item => item._id !== id))
            setSelectedIds(new Set())
            if (!silent) showNotification("Restored successfully", "success", "bottom-center")
        } catch (error) {
            showNotification(error.response?.data?.message || "Restore failed", "error", "bottom-center")
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
            hasMoreItems,
            loadingMoreItems,
            loadMoreItems,
        }}>
            {children}
        </TrashContext.Provider>
    )
}



export function useTrash() {
    return useContext(TrashContext)
}

