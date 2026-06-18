// SocketContext.jsx
import { createContext, useContext, useRef, useEffect, useState } from "react"
import { io } from "socket.io-client"
import { useAuth } from "./AuthContext"
import { useNotification } from "./NotificationContext" // ADDED THIS

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") || "";
const SocketContext = createContext()

export function SocketProvider({ children }) {
    // ADDED setUser and logout here:
    const { user, setUser, logout } = useAuth()
    const { showNotification } = useNotification() // ADDED THIS

    const socketRef = useRef(null)
    const [socket, setSocket] = useState(null)

    useEffect(() => {
        if (!user?._id) {
            setSocket(null)
            socketRef.current = null
            return
        }

        const socketInstance = io(SOCKET_URL, {
            query: { userId: user._id },
            withCredentials: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
            timeout: 30000
        })

        socketRef.current = socketInstance
        setSocket(socketInstance)

        // GLOBAL LISTENERS ADDED HERE:
        socketInstance.on("profile_updated", (updatedUserData) => {
            // Instantly update the name, email, avatar, etc.
            setUser(prev => ({ ...prev, ...updatedUserData }));
        });

        socketInstance.on("force_logout", () => {
            logout(); // Kick them out instantly!
            showNotification("Your account has been deactivated by an Admin.", "error", "bottom-center");
        });

        return () => {
            socketInstance.off("profile_updated"); // CLEANUP
            socketInstance.off("force_logout");    // CLEANUP
            socketInstance.disconnect()
            socketRef.current = null
            setSocket(null)
        }
    }, [user?._id])

    return (
        <SocketContext.Provider value={{ socket, socketRef }}>
            {children}
        </SocketContext.Provider>
    )
}

export function useSocket() {
    return useContext(SocketContext)
}