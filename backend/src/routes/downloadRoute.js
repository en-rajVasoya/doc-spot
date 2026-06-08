import express from "express"
import authMiddleware from "../middleware/authMiddleware.js"
import { deleteZip, downloadFile, downloadFolder, downloadMultiple, downloadZip, getZipStatus, previewFile } from "../controllers/downloadController.js"


const downloadRouter = express.Router()

//  download any file here
downloadRouter.get("/file/:id", authMiddleware, downloadFile)

//  download any folder
downloadRouter.post("/folder/:id", authMiddleware, downloadFolder)

//  download multiple items here
downloadRouter.post("/multiple", authMiddleware, downloadMultiple)

//  zip status checking
downloadRouter.get("/zip_status/:zip_id", getZipStatus)

// download zip inchunk
downloadRouter.get("/zip/:zip_id", authMiddleware, downloadZip)

// delete zip
downloadRouter.delete("/zip/:zip_id", authMiddleware, deleteZip)

//  file preview modal here 
downloadRouter.get("/preview/:id", authMiddleware, previewFile)

export default downloadRouter