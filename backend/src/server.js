import fs from "fs"
import path from "path"
import { createServer } from "https"
import app, { initializeSocket } from "./app.js"

// ===================================
// ENVIRONMENT VARIABLES
// ===================================
const PORT = process.env.PORT || 3000
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || path.join(path.resolve(), '192.168.1.112+2-key.pem')
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || path.join(path.resolve(), '192.168.1.112+2.pem')

// ===================================
// HTTPS SERVER CONFIGURATION
// ===================================
let httpServer

try {
    const options = {
        key: fs.readFileSync(SSL_KEY_PATH),
        cert: fs.readFileSync(SSL_CERT_PATH)
    }
    httpServer = createServer(options, app)
    console.log("[SSL] HTTPS certificates loaded successfully")
} catch (error) {
    console.error("[SSL ERROR] Failed to load SSL certificates:", error.message)
    process.exit(1)
}

// ===================================
// SOCKET.IO INITIALIZATION
// ===================================
initializeSocket(httpServer)

// ===================================
// REQUEST TIMEOUT FOR HTTPS SERVER
// ===================================
httpServer.setTimeout(5 * 60 * 1000) // 5 minutes timeout

// ===================================
// UNCAUGHT EXCEPTIONS HANDLER
// ===================================
process.on("uncaughtException", (err) => {
    console.error("[CRASH] uncaughtException:", err)
    console.error("[CRASH] Stack:", err.stack)
    // Optionally: Send to error tracking service (Sentry, DataDog, etc.)
    // Restart the process or notify admin
})

// ===================================
// UNHANDLED PROMISE REJECTIONS HANDLER
// ===================================
process.on("unhandledRejection", (reason, promise) => {
    console.error("[CRASH] unhandledRejection:", reason)
    console.error("[CRASH] Promise:", promise)
    // Optionally: Send to error tracking service (Sentry, DataDog, etc.)
})

// ===================================
// GRACEFUL SHUTDOWN HANDLERS
// ===================================
process.on("SIGTERM", () => {
    console.log("[SHUTDOWN] SIGTERM received, gracefully shutting down...")
    httpServer.close(() => {
        console.log("[SHUTDOWN] Server closed")
        process.exit(0)
    })
})

process.on("SIGINT", () => {
    console.log("[SHUTDOWN] SIGINT received, gracefully shutting down...")
    httpServer.close(() => {
        console.log("[SHUTDOWN] Server closed")
        process.exit(0)
    })
})

// ===================================
// RESOURCE MONITORING
// ===================================
/**
 * Monitor event loop lag and memory usage
 * Alert if:
 * - Event loop lag > 200ms
 * - Heap memory > 1000MB
 */
let lastTick = Date.now()
const MONITOR_INTERVAL = 2000 // Check every 2 seconds

const resourceMonitor = setInterval(() => {
    const now = Date.now()
    const lag = now - lastTick - MONITOR_INTERVAL
    const mem = process.memoryUsage()
    const heapUsed = Math.round(mem.heapUsed / 1024 / 1024)
    const external = Math.round(mem.external / 1024 / 1024)

    if (lag > 200 || heapUsed > 1000) {
        console.warn(
            `[RESOURCES] Lag: ${lag}ms | Heap: ${heapUsed}MB | External: ${external}MB`
        )
    }
    lastTick = now
}, MONITOR_INTERVAL)

// Clean up monitor on shutdown
process.on("exit", () => {
    clearInterval(resourceMonitor)
})

// ===================================
// SERVER STARTUP
// ===================================
httpServer.listen(PORT, () => {
    console.log("SERVER STARTED SUCCESSFULLY ")
})

// ===================================
// ERROR HANDLER FOR SERVER
// ===================================
httpServer.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
        console.error(`[ERROR] Port ${PORT} is already in use`)
        process.exit(1)
    } else {
        console.error("[ERROR] Server error:", error)
    }
})

export default httpServer