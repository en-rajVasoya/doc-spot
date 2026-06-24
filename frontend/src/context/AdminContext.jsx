import { createContext, useContext, useState, useEffect } from "react";
import axiosApi from "../utils/api.js";
import { useNotification } from "./NotificationContext.jsx";
import { useAuth } from "./AuthContext.jsx";


const AdminContext = createContext(null)

export function AdminAuthProvider({ children }) {
    const { user: loggedInUser, setUser } = useAuth();
    const [isLoading, setIsLoading] = useState(true)
    const [users, setUsers] = useState([])


    // for pagination state
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 25, totalPages: 0 })
    const [searchQuery, setSearchQuery] = useState("")
    const [roleFilter, setRoleFilter] = useState("")
    const [activeFilter, setActiveFilter] = useState("")

    // for select users 
    const [selectedIds, setSelectedIds] = useState(new Set())

    const [sortBy, setSortBy] = useState("createdAt")
    const [sortOrder, setSortOrder] = useState("desc")

    //  for seelct all users checkbox
    const [allMatchingIds, setAllMatchingIds] = useState([])

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
            setAllMatchingIds(res.data.allIds)
        } catch (error) {
            showNotification(error.resposne?.data?.message)
        } finally {
            setIsLoading(false)
        }
    }


    useEffect(() => {
        fetchUsers()
    }, [searchQuery, roleFilter, activeFilter, pagination.page, pagination.limit, sortBy, sortOrder])  // add sortBy, sortOrder

    const selectAllAcrossPages = () => {
        setSelectedIds(new Set(allMatchingIds))
    }

    //  Admin create user
    const createUser = async (formData) => {
        try {
            const res = await axiosApi.post("/admin/create_user", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            })

            // add new user to top of the list
            setUsers(prev => [res.data.userResponse, ...prev])

            // update total count
            setPagination(prev => ({ ...prev, total: prev.total + 1 }))
            showNotification("User created successfully", "success", "bottom-center")


        } catch (error) {
            showNotification(error.response?.data?.message || "Create user failed", "error", "bottom-center")
            throw error
        }
    }


    //  Admin update the user data
    const updateUser = async (update_user_id, formData) => {
        try {
            const res = await axiosApi.patch(`/admin/update_user/${update_user_id}`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            setUsers(prev => prev.map(u =>
                u._id === res.data.data._id ? res.data.data : u
            ));

            if (loggedInUser?._id === res.data.data._id) {
                setUser(res.data.data);
            }

            showNotification("User updated successfully", "success", "bottom-center");
        } catch (error) {
            showNotification(error.response?.data?.message || "Update user failed", "error", "bottom-center");
            throw error;
        }
    };


    // admin delete user
    const deleteUsers = async (user_ids) => {
        try {
            // Note: In Axios, to send a body with a DELETE request, it must be inside a 'data' object
            const res = await axiosApi.delete("/admin/remove_user", {
                data: { user_ids }
            });
            // Remove the deleted users from the local state so the table updates instantly
            setUsers(prev => prev.filter(u => !user_ids.includes(u._id)));
            // Update the total count for pagination
            setPagination(prev => ({
                ...prev,
                total: Math.max(0, prev.total - user_ids.length)
            }));
            // Clear checkboxes
            setSelectedIds(new Set());
            showNotification(res.data.message || "Users deleted successfully", "success", "bottom-center");

        } catch (error) {
            showNotification(error.response?.data?.message || "Delete users failed", "error", "bottom-center");
            throw error;
        }
    };


    //  here this function is used for the when user select on the main check box so select all users here
    const toggleSelectAll = () => {
        if (selectedIds.size === users.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(users.map(u => u._id)))
        }
    }


    //  when user select one user 
    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    //  clear selection 
    const clearSelection = () => setSelectedIds(new Set())


    // check availability of username or email
    const checkAvailability = async (query) => {
        try {
            const res = await axiosApi.get("/admin/check_availability", { params: query });
            return res.data.exists;
        } catch (error) {
            console.error("Check availability failed", error);
            return false;
        }
    };


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

                createUser,
                updateUser,
                deleteUsers,
                allMatchingIds,  
                selectAllAcrossPages,
                checkAvailability,
            }}>
            {children}
        </AdminContext.Provider>
    )
}

export function useAdmin() {
    return useContext(AdminContext)
}