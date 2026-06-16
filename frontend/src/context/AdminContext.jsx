import { createContext, useContext, useState, useEffect } from "react";
import axiosApi from "../utils/api.js";
import { useNotification } from "./NotificationContext.jsx";


const AdminContext = createContext(null)

export function AdminAuthProvider({ children }) {
    const [isLoading, setIsLoading] = useState(true)
    const [users, setUsers] = useState([])

    // for pagination state
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 25, totalPages: 0 })
    const [searchQuery, setSearchQuery] = useState("")
    const [roleFilter, setRoleFilter] = useState("")
    const [activeFilter, setActiveFilter] = useState("")

    // for select users 
    const [selectedIds, setSelectedIds] = useState(new Set())

    const [sortBy, setSortBy] = useState("name")
    const [sortOrder, setSortOrder] = useState("asc")

    //  notifiation toaster
    const { showNotification } = useNotification();





    //  fetch users
    const fetchUsers = async () => {
        try {
            const res = await axiosApi.get("/admin/get_users", {
                params: {
                    page: pagination.page,
                    limit: pagination.limit,
                    search: searchQuery,
                    role: roleFilter,
                    is_active: activeFilter,
                    sortField: sortBy,
                    sortOrder,
                }
            })
            setUsers(res.data.users)
            setPagination(res.data.pagination)
        } catch (error) {
            showNotification(error.resposne?.data?.message)
        } finally {
            setIsLoading(false)
        }
    }



    //     const fetchUsers = async () => {
    //     try {
    //         const res = await axiosApi.get("/admin/get_users", {
    //             params: {
    //                 page: Number(pagination.page),
    //                 limit: Number(pagination.limit),
    //                 search: searchQuery,
    //                 role: roleFilter,
    //                 is_active: activeFilter,
    //                 sortField: sortBy,
    //                 sortOrder,
    //             }
    //         })
    //         setUsers(res.data.users)
    //         // only update total and totalPages, NOT page and limit
    //         setPagination(prev => ({
    //             ...prev,
    //             total: res.data.pagination.total,
    //             totalPages: res.data.pagination.totalPages,
    //         }))
    //     } catch (error) {
    //         showNotification(error.response?.data?.message)
    //     } finally {
    //         setIsLoading(false)
    //     }
    // }


    //  Admin create user
    const createUser = async (formData) => {
        try {
            const res = await axiosApi.post("/admin/create_user", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            })

            // add new user to top of the list
            setUsers(prev => [res.data.user, ...prev])

            // update total count
            setPagination(prev => ({ ...prev, total: prev.total + 1 }))
            showNotification("User created successfully", "success", "bottom-center")


        } catch (error) {
            showNotification(error.response?.data?.message || "Create user failed", "error", "bottom-center")
            throw error
        }
    }


    useEffect(() => {
        fetchUsers()
    }, [searchQuery, roleFilter, activeFilter, pagination.page, pagination.limit, sortBy, sortOrder])  // add sortBy, sortOrder



    //  here this function is used for the when user select on the main check box so select all users here
    const toggleSelectAll = () => {
        if (selectedIds.size === users.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(users.map(u => u.user._id)))
        }
    }


    //  when user select one user 
    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = newSet(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    //  clear selection 
    const clearSelection = () => setSelectedIds(new Set())


    return (
        <AdminContext.Provider
            value={{
                users,
                isLoading,
                pagination,
                fetchUsers,
                searchQuery,
                setSearchQuery,
                setPagination,
                selectedIds,
                setSelectedIds,
                toggleSelectAll,
                toggleSelect,
                clearSelection,
                setSortBy,
                sortBy,
                setSortOrder,
                sortOrder,
                roleFilter,
                setRoleFilter,
                activeFilter,
                setActiveFilter,
            }}>
            {children}
        </AdminContext.Provider>
    )
}

export function useAdmin() {
    return useContext(AdminContext)
}