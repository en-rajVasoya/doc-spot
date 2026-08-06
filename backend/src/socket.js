// import { Server } from "socket.io"


// // map for getting online user list
// const onlineUsers = new Map()
// let _io = null


// // creating here server of scoket io
// export const initSocket = (httpServer) => {
//     _io = new Server(httpServer, {
//         cors: {
//             origin: [
//                 "http://localhost:5177",
//                 "https://localhost:5177",
//                 "http://192.168.1.19:5177",
//                 "https://192.168.1.19:5177",
//                 "http://192.168.1.35:5177",
//                 "https://192.168.1.35:5177",
//                 "http://192.168.1.112:5177",
//                 "https://192.168.1.112:5177",
//                 "http://docspot-frontend-web.s3-website.ap-south-1.amazonaws.com",
//                 // "https://d2u61zpmg3hahd.cloudfront.net",
//             ],
//             credentials: true
//         },
//         pingTimeout: 60000,
//         pingInterval: 25000
//     })


//     //  eastablish connection here and getting all online users
//     _io.on("connection", (socket) => {
//         const userId = socket.handshake.query.userId;
//         if (userId) {
//             onlineUsers.set(userId, socket.id)
//             console.log("User connected ", userId)
//         }

//         //  if user disconnected then 
//         socket.on("disconnect", () => {
//             onlineUsers.delete(userId)
//             console.log("User disconnected ", userId)
//         })
//     })

//     return _io
// }


// // now emit to user like sending event
// export const emitToUser = (userId, event, data) => {
//     const socketId = onlineUsers.get(userId.toString())
//     if (socketId && _io) {
//         _io.to(socketId).emit(event, data)
//     }
// }



// export { onlineUsers }







import { Server } from "socket.io"
import uploadModel from "#models/uploadModel";

// Map user ID -> Set of socket IDs (multi-tab support)
const onlineUsers = new Map()
let _io = null

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
                "https://192.168.1.112:5177",
                "http://docspot-frontend-web.s3-website.ap-south-1.amazonaws.com",
            ],
            credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000
    })

    // establish connection and handle multi-tab socket set
    _io.on("connection", (socket) => {
        const userId = socket.handshake.query.userId;
        if (userId) {
            const uidStr = userId.toString();
            if (!onlineUsers.has(uidStr)) {
                onlineUsers.set(uidStr, new Set());
            }
            onlineUsers.get(uidStr).add(socket.id);
            console.log(`User connected ${userId} (socket: ${socket.id}, active tabs: ${onlineUsers.get(uidStr).size})`);
        }

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