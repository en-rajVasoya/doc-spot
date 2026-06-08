// SocketContext.jsx
import { createContext, useContext, useRef, useEffect, useState } from "react"
import { io } from "socket.io-client"
import { useAuth } from "./AuthContext"

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") || "";
const SocketContext = createContext()

export function SocketProvider({ children }) {
    const { user } = useAuth()
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

        return () => {
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