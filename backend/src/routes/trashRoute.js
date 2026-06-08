import express from "express"
import { trashItem, restoreItem, getTrashedItems, deleteForver } from "../controllers/trashController.js"
import authMiddleware from "../middleware/authMiddleware.js"


const trashRouter = express.Router()


//  here when click on delete 
trashRouter.post("/delete", authMiddleware, trashItem)


//  here when user restore the item 
trashRouter.post("/restore", authMiddleware, restoreItem)


//  here getting all trash item here
trashRouter.get("/trash-items", authMiddleware, getTrashedItems)

//  delete file forever 
trashRouter.delete("/delete-forever", authMiddleware, deleteForver)

export default trashRouter