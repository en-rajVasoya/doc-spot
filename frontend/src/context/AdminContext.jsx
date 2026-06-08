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
                    isActive: activeFilter
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
    }, [searchQuery, roleFilter, activeFilter, pagination.page, pagination.limit])



    return (
        <AdminContext.Provider
            value={{
                users,
                isLoading,
                pagination,
                fetchUsers,
                searchQuery,
                setSearchQuery
            }}>
            {children}
        </AdminContext.Provider>
    )
}

export function useAdmin() {
    return useContext(AdminContext)
}