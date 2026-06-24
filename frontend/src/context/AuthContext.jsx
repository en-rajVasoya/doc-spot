import { createContext, useContext, useState, useEffect } from "react";
import axiosApi from "../utils/api.js";
import { useNotification } from "./NotificationContext.jsx";



//  create global state
const AuthContext = createContext(null)


export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    //  notifiation toaster
    const { showNotification } = useNotification();

    // On app start check login status is user is there or not
    const checkAuthStatus = async () => {
        try {
            const res = await axiosApi.get("/auth/me")
            setUser(res.data.user)
        } catch (error) {
            console.log(error.message)
        } finally {
            setIsLoading(false)
        }
    }
    useEffect(() => {
        checkAuthStatus()
    }, [])


    //  if token expred here so auto refresh to login page here
    useEffect(() => {
        const interceptor = axiosApi.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response && error.response.status === 401) {
                    setUser(null); // This clears user state and triggers ProtectedRoute redirect
                }
                return Promise.reject(error);
            }
        );
        // Cleanup interceptor when component unmounts
        return () => {
            axiosApi.interceptors.response.eject(interceptor);
        };
    }, []);

    // when user click on login button this will run
    const login = async (email, password, remember) => {
        try {
            const res = await axiosApi.post("/auth/login", { email, password, remember })

            //  if error comes
            if (!res.data.success) {
                throw new Error(res.data?.message || "Login Failed")
            }
            // fetch full user from DB including role - no need to set user from login response
            await checkAuthStatus()
            return res.data
        } catch (error) {
            showNotification(error.response.data.message, "error", "bottom-center");
        }

    }


    //  here register will come

    // when user click on logout
    const logout = async () => {
        await axiosApi.post("/auth/logout")
        setUser(null)
        if (navigator.credentials && navigator.credentials.preventSilentAccess) {
            await navigator.credentials.preventSilentAccess()
        }
    }



    //  here this fucntion is for the update user profile 
    const updateProfile = async (formData) => {
        try {
            const res = await axiosApi.post("/auth/edit_profile", formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })

            if (res.data.success || res.status === 200) {
                showNotification(res.data.message || "Profile updated successfully!", "success", "bottom-center");

                if (res.data.data) {
                    setUser(res.data.data)
                }

                return { success: true, data: res.data };
            }

        } catch (error) {
            showNotification(error.response?.data?.message || "Failed to update profile", "error", "bottom-center");
            return { success: false, error: error };
        }
    }

    // return all this function to every file
    const value = {
        user,
        isLoading,
        setUser,
        login,
        checkAuthStatus,
        logout,
        updateProfile
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )

}



// create custom hook
export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error("useAuth must be inside AuthProvider")
    }

    return context
}