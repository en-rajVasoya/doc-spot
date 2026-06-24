import express from "express"
import authMiddleware from "../middleware/authMiddleware.js"
import adminMiddleware from "../middleware/adminMiddleware.js"
import { createUser, getUsers, updateUser, getUserDetails, deleteUser, importUsers, checkAvailability } from "../controllers/adminController.js"
import profilePicUploadMiddleware from "../middleware/profilePicMiddleware.js"

const adminRouter = express.Router()

//  creat user
adminRouter.post("/create_user", authMiddleware, adminMiddleware, profilePicUploadMiddleware.single("profilePic"), createUser)

// check availability of username or email
adminRouter.get("/check_availability", authMiddleware, adminMiddleware, checkAvailability)

// get users
adminRouter.get("/get_users", authMiddleware, adminMiddleware, getUsers)

//  update user
adminRouter.patch("/update_user/:update_user_id", authMiddleware, adminMiddleware, profilePicUploadMiddleware.single("profilePic"), updateUser)

// get single user
adminRouter.get("/user_details/:user_id", authMiddleware, adminMiddleware, getUserDetails)

// remove user - delete 
adminRouter.delete("/remove_user", authMiddleware, adminMiddleware, deleteUser)

// import users list from the csv
adminRouter.post("/import_users", profilePicUploadMiddleware.single("file"), importUsers)


export default adminRouter