import { Server } from "socket.io"


// map for getting online user list
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
            ],
            credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000
    })


    //  eastablish connection here and getting all online users
    _io.on("connection", (socket) => {
        const userId = socket.handshake.query.userId;
        if (userId) {
            onlineUsers.set(userId, socket.id)
            console.log("User connected ", userId)
        }

        //  if user disconnected then 
        socket.on("disconnect", () => {
            onlineUsers.delete(userId)
            console.log("User disconnected ", userId)
        })
    })

    return _io
}


// now emit to user like sending event
export const emitToUser = (userId, event, data) => {
    const socketId = onlineUsers.get(userId.toString())
    if (socketId && _io) {
        _io.to(socketId).emit(event, data)
    }
}



export { onlineUsers }