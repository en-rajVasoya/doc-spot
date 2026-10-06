// Middleware for handling CSV user import file uploads

import multer from "multer"
import path from "path"
import fs from "fs"

// Ensure temporary CSV directory exists
const TEMP_CSV_DIR = path.resolve("temp/csv")
if (!fs.existsSync(TEMP_CSV_DIR)) {
    fs.mkdirSync("temp/csv", { recursive: true })
}

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, TEMP_CSV_DIR)
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase()
        const uniqueName = `import_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`
        cb(null, uniqueName)
    }
})

// File filter for CSV files
const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const allowedMimeTypes = [
        "text/csv",
        "application/vnd.ms-excel",
        "text/plain",
        "application/csv",
        "text/x-csv",
        "application/x-csv"
    ]

    if (ext === ".csv" || allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true)
    } else {
        cb(new Error("Only CSV files (.csv) are allowed"), false)
    }
}

// Multer middleware instance for CSV uploads
const csvUploadMiddleware = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter
})

export default csvUploadMiddleware
