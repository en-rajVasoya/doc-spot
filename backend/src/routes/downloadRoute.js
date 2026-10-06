import express from "express"
import authMiddleware from "../middleware/authMiddleware.js"
import optionalAuth from "../middleware/optionalAuth.js"
import { deleteZip, downloadFile, downloadFolder, downloadMultiple, downloadZip, getZipStatus } from "../controllers/downloadController.js"

const downloadRouter = express.Router()

//  download any file here
downloadRouter.get("/file/:id", optionalAuth, downloadFile)

//  download any folder
downloadRouter.post("/folder/:id", optionalAuth, downloadFolder)

//  download multiple items here
downloadRouter.post("/multiple", optionalAuth, downloadMultiple)

//  zip status checking
downloadRouter.get("/zip_status/:zip_id", getZipStatus)

// download zip inchunk
downloadRouter.get("/zip/:zip_id", optionalAuth, downloadZip)

// delete zip
downloadRouter.delete("/zip/:zip_id", optionalAuth, deleteZip)




export default downloadRouter