import dotenv from "dotenv"
dotenv.config()
import fs from "fs"
import path from "path"

import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"
import { createServer } from "https"

import connectDB from "./config/db.js";
import userRouter from "./routes/userRoute.js";
import uploadRouter from "./routes/uploadRoute.js";
import shareRouter from "./routes/shareROute.js"
import { initSocket, emitToUser } from "./socket.js"
import downloadRouter from "./routes/downloadRoute.js"
import searchRouter from "./routes/searchRoute.js"
import trashRouter from "./routes/trashRoute.js"
import fileRouter from "./routes/fileRoute.js"
import { startTrashCleanup } from "./utils/cronjob.js"
import adminRouter from "./routes/adminRoute.js"
// import { initClamAV } from "./virusTotal/clamAVWorker.js"


// connect databse
connectDB()
// initClamAV()
//  cron job that run and delete trash page files and folder 
startTrashCleanup()

//  init the express
const app = express();

const options = {
    key: fs.readFileSync(path.join(path.resolve(), '192.168.1.112+2-key.pem')),
    cert: fs.readFileSync(path.join(path.resolve(), '192.168.1.112+2.pem'))
};
const httpServer = createServer(options, app)     // creating https server here   
app.use((req, res, next) => {
    req.setTimeout(5 * 60 * 1000);
    res.setTimeout(5 * 60 * 1000);
    next();
});
httpServer.setTimeout(5 * 60 * 1000);



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

//  init socket server
initSocket(httpServer)
// middleware for emmiting every user request 
app.use((req, res, next) => {
    req.emitToUser = emitToUser
    next()
})


//  for getting images for frontend
app.use("/uploadimage", express.static(path.resolve("uploadimage")))

//  for getting uploaded files to the frontend here
const __dirname = path.resolve()
app.use("/files", (req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin")
    next()
})
app.use("/files", express.static(path.join(__dirname, "files")))


app.use(express.json({ limit: "100mb" }))
app.use(express.urlencoded({ limit: "100mb", extended: true }))
app.use(cookieParser())


// auth
app.use("/api/auth", userRouter)

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


// while uplaoding no timeout 
app.use("/api/upload/upload-chunk", (req, res, next) => {
    req.setTimeout(0)
    res.setTimeout(0)
    next()
})

app.use("/api/upload", uploadRouter)


//  file management (get-files, folder, rename, color, move, copy, create-folder)
app.use("/api/file", fileRouter)


//  downloading
app.use("/api/download", downloadRouter)

//  sharing here
app.use("/api", shareRouter)


//  search api here
app.use("/api/search", searchRouter)


//  trash api 
app.use("/api/trash", trashRouter)



//  admin routes
app.use("/api/admin", adminRouter)


const PORT = process.env.PORT

// app.listen(PORT, () => {
//     console.log("Server Running on ", PORT)
// })

process.on("uncaughtException", (err) => {
    console.error("[CRASH] uncaughtException:", err)
})

process.on("unhandledRejection", (reason) => {
    console.error("[CRASH] unhandledRejection:", reason)
})

// IDENTIFICATION TOOL: Monitor resources and event loop
let lastTick = Date.now();
const MONITOR_INTERVAL = 2000;
setInterval(() => {
    const now = Date.now();
    const lag = now - lastTick - MONITOR_INTERVAL;
    const mem = process.memoryUsage();
    const heapUsed = Math.round(mem.heapUsed / 1024 / 1024);

    if (lag > 200 || heapUsed > 1000) {
        console.warn(`[RESOURCES] Lag: ${lag}ms | Heap: ${heapUsed}MB`);
    }
    lastTick = now;
}, MONITOR_INTERVAL);

//  we are using socket connection so change to
httpServer.listen(PORT, () => {
    console.log(`[SERVER START] Time: ${new Date().toLocaleTimeString()} | Port: ${PORT}`);
})
