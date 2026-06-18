import dotenv from "dotenv"
dotenv.config()
import path from "path"

import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"

import connectDB from "./config/db.js"
import userRouter from "./routes/userRoute.js"
import uploadRouter from "./routes/uploadRoute.js"
import shareRouter from "./routes/shareROute.js"
import { initSocket, emitToUser } from "./socket.js"
import downloadRouter from "./routes/downloadRoute.js"
import searchRouter from "./routes/searchRoute.js"
import trashRouter from "./routes/trashRoute.js"
import fileRouter from "./routes/fileRoute.js"
import { startTrashCleanup, startExpiredLinksCleanup } from "./utils/cronjob.js"
import adminRouter from "./routes/adminRoute.js"
import sharedLinksRouter from "./routes/sharedLinks.js"
import notificationRoutes from "./routes/notification.js";
// import { initClamAV } from "./virusTotal/clamAVWorker.js"

// ===================================
// DATABASE & CRON JOB INITIALIZATION
// ===================================
connectDB()
// initClamAV()
startTrashCleanup() // Cron job that deletes trash files/folders periodically
startExpiredLinksCleanup()

// ===================================
// EXPRESS APP INITIALIZATION
// ===================================
const app = express()

// ===================================
// CORS CONFIGURATION
// ===================================
app.use(cors({
    origin: [
        "http://localhost:5177",
        "https://localhost:5177",
        "http://192.168.1.19:5177",
        "https://192.168.1.19:5177",
        "http://192.168.1.35:5177",
        "https://192.168.1.35:5177",
        "http://192.168.1.112:5177",
        "https://192.168.1.112:5177",
        "https://192.168.1.213:5177",
    ],
    credentials: true,
    exposedHeaders: ["Accept-Ranges", "Content-Range", "Content-Length"]
}))

// ===================================
// SOCKET.IO INITIALIZATION & MIDDLEWARE
// ===================================
export const initializeSocket = (httpServer) => {
    initSocket(httpServer)
}

// Middleware to attach emitToUser function to each request
app.use((req, res, next) => {
    req.emitToUser = emitToUser
    next()
})

// ===================================
// STATIC FILES SERVING
// ===================================
// Serve uploaded images
app.use("/uploadimage", express.static(path.resolve("uploadimage")))

// Serve uploaded files with cross-origin headers
const __dirname = path.resolve()
app.use("/files", (req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin")
    next()
})
app.use("/files", express.static(path.join(__dirname, "files")))

// ===================================
// BODY PARSER & COOKIE MIDDLEWARE
// ===================================
app.use(express.json({ limit: "100mb" }))
app.use(express.urlencoded({ limit: "100mb", extended: true }))
app.use(cookieParser())

// ===================================
// REQUEST TIMEOUT CONFIGURATION
// ===================================
app.use((req, res, next) => {
    req.setTimeout(5 * 60 * 1000) // 5 minutes
    res.setTimeout(5 * 60 * 1000) // 5 minutes
    next()
})

// ===================================
// ACTIVE CONNECTIONS MONITORING
// ===================================
let activeConnections = 0
app.use((req, res, next) => {
    activeConnections++
    res.on("finish", () => activeConnections--)
    res.on("close", () => activeConnections--)
    if (activeConnections % 10 === 0) {
        console.log(`[CONNECTIONS] active=${activeConnections}`)
    }
    next()
})

// ===================================
// SPECIAL TIMEOUT FOR UPLOAD CHUNKS
// ===================================
// No timeout for chunk upload to prevent interruptions
app.use("/api/upload/upload-chunk", (req, res, next) => {
    req.setTimeout(0)
    res.setTimeout(0)
    next()
})

// ===================================
// ROUTE DEFINITIONS
// ===================================

// Authentication routes
app.use("/api/auth", userRouter)

// File upload routes
app.use("/api/upload", uploadRouter)

// File management routes (get-files, folder, rename, color, move, copy, create-folder)
app.use("/api/file", fileRouter)

// File download routes
app.use("/api/download", downloadRouter)

// File sharing routes
app.use("/api", shareRouter)

// Search routes
app.use("/api/search", searchRouter)

// Trash management routes
app.use("/api/trash", trashRouter)

app.use("/api/notifications", notificationRoutes);

// Share Links routes
app.use("/api/links", sharedLinksRouter)

// Admin routes
app.use("/api/admin", adminRouter)

// ===================================
// GLOBAL ERROR HANDLING MIDDLEWARE (Optional)
// ===================================
app.use((err, req, res, next) => {
    console.error("[ERROR]", err)
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error"
    })
})

// ===================================
// 404 HANDLER
// ===================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    })
})

export default app