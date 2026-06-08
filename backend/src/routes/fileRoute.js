import express from "express"
import authMiddleware from "../middleware/authMiddleware.js"
import {
  getUserFiles,
  getFolderPath,
  renameItem,
  changeItemColor,
  moveItem,
  copyItem,
  createFolder
} from "../controllers/fileController.js"

const fileRouter = express.Router()


//  get all files and folders
fileRouter.get("/get-files", authMiddleware, getUserFiles)


//  get folder path (breadcrumb trail)
fileRouter.get("/folder/:id", authMiddleware, getFolderPath)


//  rename folder or file
fileRouter.patch("/rename", authMiddleware, renameItem)


//  change folder color
fileRouter.patch("/color", authMiddleware, changeItemColor)


//  move item
fileRouter.patch("/move", authMiddleware, moveItem)


//  copy item
fileRouter.post("/copy", authMiddleware, copyItem)


// create new empty folder
fileRouter.post("/create-folder", authMiddleware, createFolder)


export default fileRouter
