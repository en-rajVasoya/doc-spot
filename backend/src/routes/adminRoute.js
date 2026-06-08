import express from "express"
import authMiddleware from "../middleware/authMiddleware.js"
import adminMiddleware from "../middleware/adminMiddleware.js"
import { createUser, getUsers, updateUser, updateUserStatus } from "../controllers/adminController.js"
import profilePicUploadMiddleware from "../middleware/profilePicMiddleware.js"

const adminRouter = express.Router()


//  creat user
adminRouter.post("/create-user", authMiddleware, adminMiddleware, profilePicUploadMiddleware.single("profilePic"), createUser)


// get users
adminRouter.get("/get-users", authMiddleware, adminMiddleware, getUsers)


//  update user
adminRouter.patch("/update-user/:userUpdateId", authMiddleware, adminMiddleware, profilePicUploadMiddleware.single("profilePic"), updateUser)


//  deactive - active user
adminRouter.patch("/user-status/:userId", authMiddleware, adminMiddleware, updateUserStatus)


export default adminRouter