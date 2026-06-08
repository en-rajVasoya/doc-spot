import express from "express"
import authMiddleware from "../middleware/authMiddleware.js"
import adminMiddleware from "../middleware/adminMiddleware.js"
import { createUser, getUsers, updateUser, updateUserStatus } from "../controllers/adminController.js"
import profilePicUploadMiddleware from "../middleware/profilePicMiddleware.js"

const adminRouter = express.Router()

//  creat user
adminRouter.post("/create_user", authMiddleware, adminMiddleware, profilePicUploadMiddleware.single("profilePic"), createUser)

// get users
adminRouter.get("/get_users", authMiddleware, adminMiddleware, getUsers)

//  update user
adminRouter.patch("/update_user/:update_user_id", authMiddleware, adminMiddleware, profilePicUploadMiddleware.single("profilePic"), updateUser)

//  deactive - active user
adminRouter.patch("/user_status/:user_id", authMiddleware, adminMiddleware, updateUserStatus)

export default adminRouter