// SocketContext.jsx
import { createContext, useContext, useEffect, useState } from "react"
import { io } from "socket.io-client"
import { useAuth } from "./AuthContext"
import { useNotification } from "./NotificationContext" // ADDED THIS
import axiosApi from "../utils/api.js"

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") || "";
const SocketContext = createContext()

export function SocketProvider({ children }) {
    // ADDED setUser and logout here:
    const { user, setUser, logout } = useAuth()
    const { showNotification } = useNotification() // ADDED THIS

    const [socket, setSocket] = useState(null)

    useEffect(() => {
        if (!user?._id) {
            setSocket(null)
            return
        }

        const socketInstance = io(SOCKET_URL, {
            // query: { userId: user._id },
            withCredentials: true,
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 2000,
            timeout: 30000
        })

        socketInstance.on("connect", () => {
            console.log("Socket connected! ID is now:", socketInstance.id);
        });

        // GLOBAL LISTENERS ADDED HERE:
        socketInstance.on("profile_updated", (updatedUserData) => {
            // Instantly update the name, email, avatar, etc.
            setUser(prev => ({ ...prev, ...updatedUserData }));
        });

        socketInstance.on("force_logout", (data) => {
            logout(); // Kick them out instantly!
            showNotification(data?.message || "Your account access has been changed by an Admin.", "error", "bottom-center");
        });

        setSocket(socketInstance)

        // Wake-up handling: when tab becomes visible after being asleep/hidden
        let hiddenAt = 0;
        let isChecking = false;

        const handleVisibilityChange = async () => {
            if (document.hidden) {
                hiddenAt = Date.now();
                return;
            }

            const awayMinutes = hiddenAt ? (Date.now() - hiddenAt) / (1000 * 60) : 0;
            if ((awayMinutes > 5 || !socketInstance.connected) && !isChecking) {
                isChecking = true;
                try {
                    await axiosApi.get("/auth/me");
                    socketInstance.disconnect();
                    socketInstance.connect();
                } catch (err) {
                    console.warn("[Socket] Wakeup auth check failed:", err.message);
                } finally {
                    isChecking = false;
                }
            }
        };

        const handleOnline = () => {
            if (!socketInstance.connected) {
                socketInstance.connect();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("online", handleOnline);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("online", handleOnline);
            socketInstance.off("profile_updated"); // CLEANUP
            socketInstance.off("force_logout");    // CLEANUP
            socketInstance.disconnect()
            setSocket(null)
        }
    }, [user?._id])

    return (
        <SocketContext.Provider value={{ socket }}>
            {children}
        </SocketContext.Provider>
    )
}

export function useSocket() {
    return useContext(SocketContext)
}