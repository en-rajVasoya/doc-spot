import express from "express"
import { currentUser, registerUser, userLogin, userLogout } from "../controllers/userController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const userRouter = express.Router();


//  user Register route
userRouter.post("/register", registerUser)


//  for user login route
userRouter.post("/login", userLogin)


//  for getting the current user
userRouter.get("/me", authMiddleware, currentUser)


//  for logout user
userRouter.post("/logout", authMiddleware, userLogout)

export default userRouter