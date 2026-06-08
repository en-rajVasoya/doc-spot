import express from "express"
import authMiddleware from "../middleware/authMiddleware.js"
import { streamChunkMiddleware } from "../middleware/chunkUploadMiddleware.js"
import {
  checkFilesBulk,
  completeUpload,
  createFoldersBulk,
  // getUploadStatus,
  initUpload,
  uploadChunk,
  uploadSmallBatch,
  smallUpload,
  cancelUpload,
  cancelFolderUpload,
  completeFolderReplace,
  notifyUploadComplete,
} from "../controllers/uploadController.js"



const uploadRouter = express.Router()


//  init upload
uploadRouter.post("/init", authMiddleware, initUpload)


//  uploading chunks
uploadRouter.post("/upload-chunk", authMiddleware, streamChunkMiddleware, uploadChunk)


//  saving file after successfully uploading
uploadRouter.post("/complete", authMiddleware, completeUpload)


//  status check here
// uploadRouter.get("/status/:uploadId", authMiddleware, getUploadStatus)

uploadRouter.post("/small-batch", authMiddleware, smallUpload.any(), uploadSmallBatch)



//  bulk folder upload
uploadRouter.post("/folders-bulk", authMiddleware, createFoldersBulk);

//  bulk file fingerprint and status check here 
uploadRouter.post("/check-files-bulk", authMiddleware, checkFilesBulk);


//  here for cancle upload file 
uploadRouter.delete("/cancle/:uploadId", authMiddleware, cancelUpload)

// here cancle folder upload
uploadRouter.delete("/cancle-folder", authMiddleware, cancelFolderUpload)




//  here re write the folder when user select same name folder with replace files
uploadRouter.post("/complete-folder-replace", authMiddleware, completeFolderReplace)

//  notify shared users when upload is done
uploadRouter.post("/notify-complete", authMiddleware, notifyUploadComplete)



export default uploadRouter