import express from "express"
import authMiddleware from "../middleware/authMiddleware.js"
import { searchFiles } from "../controllers/searchController.js"


const searchRouter = express.Router()


//  search files and folder here
searchRouter.get("/filter", authMiddleware, searchFiles)



export default searchRouter