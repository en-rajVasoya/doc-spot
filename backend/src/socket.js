import { Server } from "socket.io"
import { V3 } from "paseto"
import { createSecretKey } from "crypto"
import uploadModel from "#models/uploadModel";
import User from "#models/userModel";

// Map user ID -> Set of socket IDs (multi-tab support)
const onlineUsers = new Map()
let _io = null


const getKey = () => {
    return createSecretKey(Buffer.from(process.env.PASETO_SECRET_KEY, "hex"))
}

//  this helper fucntino will rturn cookie
const parseCookies = (cookieHeader) => {
    const cookies = {}
    if (!cookieHeader) return cookies
    cookieHeader.split(";").forEach(pair => {
        const idx = pair.indexOf("=")
        if (idx === -1) return
        const key = pair.slice(0, idx).trim()
        const value = pair.slice(idx + 1).trim()
        cookies[key] = decodeURIComponent(value)
    })
    return cookies
}

// creating here server of scoket io
export const initSocket = (httpServer) => {
    _io = new Server(httpServer, {
        cors: {
            origin: [
                "http://localhost:5177",
                "https://localhost:5177",
                "http://192.168.1.19:5177",
                "https://192.168.1.19:5177",
                "http://192.168.1.35:5177",
                "https://192.168.1.35:5177",
                "http://192.168.1.112:5177",
                "https://192.168.1.160:5177",
                "http://docspot-frontend-web.s3-website.ap-south-1.amazonaws.com",
            ],
            credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000
    })

    //  check the user is logged in here or not by auth token
    //  for public share link allow anyone can view
    _io.use(async (socket, next) => {
        try {
            // token can come from the auth payload (preferred) or from cookies
            let token = socket.handshake.auth?.token

            if (!token) {
                const cookies = parseCookies(socket.handshake.headers.cookie)
                token = cookies.doc_auth_token || cookies.auth_token
            }

            // no token at all — allow connection through as anonymous
            // (shared-link public viewers need this)
            if (!token) {
                return next()
            }

            const payload = await V3.decrypt(token, getKey())

            if (payload.exp && new Date(payload.exp) < new Date()) {
                // expired token — treat as anonymous instead of rejecting outright
                return next()
            }

            const user = await User.findById(payload.id).select("-password")

            if (!user || !user.is_active) {
                return next()
            }

            // attach verified user to the socket so the connection handler can trust it
            socket.userId = user._id.toString()

            next()

        } catch (error) {
            // invalid/corrupt token — don't hard fail the connection,
            // just let them connect as anonymous
            next()
        }
    })

    // establish connection and handle multi-tab socket set
    _io.on("connection", (socket) => {
        const userId = socket.userId;

        if (userId) {
            const uidStr = userId.toString();
            if (!onlineUsers.has(uidStr)) {
                onlineUsers.set(uidStr, new Set());
            }
            onlineUsers.get(uidStr).add(socket.id);
            console.log(`User connected ${userId} (socket: ${socket.id}, active tabs: ${onlineUsers.get(uidStr).size})`);
        }

        //  shared link rooms - room name after token 
        socket.on("join_shared_link", (token) => {
            if (!token) return
            socket.join(token)
        })

        socket.on("leave_shared_link", (token) => {
            if (!token) return
            socket.leave(token)
        })

        // if user disconnected then clean up specific socket ID
        socket.on("disconnect", () => {
            if (userId) {
                const uidStr = userId.toString();
                const userSockets = onlineUsers.get(uidStr);
                if (userSockets) {
                    userSockets.delete(socket.id);
                    if (userSockets.size === 0) {
                        onlineUsers.delete(uidStr);
                    }
                }
                console.log(`User disconnected ${userId} (socket: ${socket.id})`);
            }
        })
    })

    return _io
}

// emit to all open tabs of target user
export const emitToUser = (userId, event, data) => {
    if (userId && _io) {
        const userSockets = onlineUsers.get(userId.toString());
        console.log(`[emitToUser] event=${event} userId=${userId} foundSockets=`, userSockets ? [...userSockets] : "NONE");
        if (userSockets) {
            userSockets.forEach(socketId => {
                _io.to(socketId).emit(event, data);
            });
        }
    }
}

export { onlineUsers }




// Add this 1 line at the bottom of socket.js:
export const getIO = () => _io;