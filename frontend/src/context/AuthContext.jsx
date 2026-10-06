import { createContext, useContext, useState, useEffect, useRef } from "react";
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
            localStorage.setItem("docspot_has_session", "true")
        } catch (error) {
            localStorage.removeItem("docspot_has_session")
            console.log(error.message)
        } finally {
            setIsLoading(false)
        }
    }
    useEffect(() => {
        checkAuthStatus()
    }, [])



    //  here this is api call every 4.5 miniute so gets a new access token here
    useEffect(() => {
        if (!user) return

        // refresh access token
        const interval = setInterval(async () => {
            try {
                await axiosApi.get("/auth/refresh_token")
                console.log("[Auth] Access token silently refreshed in background");
            } catch (error) {
                console.warn("[Auth] Background refresh failed:", error.message);
                if (error.response?.status === 401) {
                    setUser(null);
                    localStorage.removeItem("docspot_has_session");
                }
            }
        }, 110 * 60 * 1000)
        return () => clearInterval(interval)
    }, [user])


    // Keep userRef updated with latest user state
    const userRef = useRef(null);
    useEffect(() => {
        userRef.current = user;
    }, [user]);

    //  listen to the auto expired from the api.js
    useEffect(() => {
        const handleAuthExpired = () => {
            // Ignore if nobody is logged in (e.g. login page, public share link)
            if (!userRef.current) return;

            setUser(null)
            localStorage.removeItem("docspot_has_session");
            showNotification("Session expired, please log in again", "error", "bottom-center");
        }

        window.addEventListener("auth-expired", handleAuthExpired);
        return () => window.removeEventListener("auth-expired", handleAuthExpired);
    }, [])

    // when user click on login button this will run
    const login = async (email, password, remember) => {
        try {
            const res = await axiosApi.post("/auth/login", { email, password, remember })

            //  if error comes
            if (!res.data.success) {
                throw new Error(res.data?.message || "Login Failed")
            }
            localStorage.setItem("docspot_has_session", "true")
            // fetch full user from DB including role - no need to set user from login response
            await checkAuthStatus()
            return res.data
        } catch (error) {
            showNotification(error.response?.data?.message || error.message || "Login failed", "error", "bottom-center");
        }

    }


    //  here register will come

    // when user click on logout
    const logout = async () => {
        try {
            await axiosApi.post("/auth/logout")
        } catch (error) {
            console.warn("[Auth] Logout API call failed, clearing local session anyway:", error.message)
        }
        setUser(null)
        localStorage.removeItem("docspot_has_session")
        if (navigator.credentials && navigator.credentials.preventSilentAccess) {
            await navigator.credentials.preventSilentAccess()
        }
    }



    //  here this fucntion is for the update user profile 
    const updateProfile = async (formData, passwordUpdate = false) => {
        try {
            const res = await axiosApi.post("/auth/edit_profile", formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })

            if (res.data.success || res.status === 200) {
                showNotification(res.data.message || `${passwordUpdate ? "Password update successfully" : "Profile update successfully"}`, "success", "bottom-center");

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