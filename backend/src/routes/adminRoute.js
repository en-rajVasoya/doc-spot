import express from "express"
import authMiddleware from "../middleware/authMiddleware.js"
import adminMiddleware from "../middleware/adminMiddleware.js"
import { createUser, getUsers, updateUser, getUserDetails, deleteUser, importUsers } from "../controllers/adminController.js"
import profilePicUploadMiddleware from "../middleware/profilePicMiddleware.js"

const adminRouter = express.Router()

//  creat user
adminRouter.post("/create_user", authMiddleware, adminMiddleware, profilePicUploadMiddleware.single("profilePic"), createUser)

// get users
adminRouter.get("/get_users", authMiddleware, adminMiddleware, getUsers)

//  update user
adminRouter.patch("/update_user/:update_user_id", authMiddleware, adminMiddleware, profilePicUploadMiddleware.single("profilePic"), updateUser)

// get users
adminRouter.get("/user_details/:user_id", authMiddleware, adminMiddleware, getUserDetails)

// get users
adminRouter.delete("/remove_user", authMiddleware, adminMiddleware, deleteUser)

// get users
adminRouter.post("/import_users", authMiddleware, adminMiddleware, profilePicUploadMiddleware.single("file"), importUsers)


export default adminRouter