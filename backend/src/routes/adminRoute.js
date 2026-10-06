import express from "express"
import authMiddleware from "../middleware/authMiddleware.js"
import adminMiddleware from "../middleware/adminMiddleware.js"
import { createUser, getUsers, updateUser, getUserDetails, deleteUser, importUsers, checkAvailability, userInfo } from "../controllers/adminController.js"
import profilePicUploadMiddleware from "../middleware/profilePicMiddleware.js"
import csvUploadMiddleware from "../middleware/csvMiddleware.js"

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
adminRouter.post("/import_users", authMiddleware, adminMiddleware, importUsers)


//  user info user id and email for the import user model
adminRouter.get("/user_info", authMiddleware, adminMiddleware, userInfo)

export default adminRouter