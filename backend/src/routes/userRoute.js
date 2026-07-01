import express from "express"
import { currentUser, registerUser, userLogin, userLogout, updateProfile, forgotPassword, validateResetToken, resetPassword } from "#controllers/userController";
import authMiddleware from "#middleware/authMiddleware";
import profilePicUploadMiddleware from "#middleware/profilePicMiddleware";

const userRouter = express.Router();


//  user Register route
userRouter.post("/register", registerUser)


//  for user login route
userRouter.post("/login", userLogin)


//  for getting the current user
userRouter.get("/me", authMiddleware, currentUser)

//  to update user profile
userRouter.post("/edit_profile", authMiddleware, profilePicUploadMiddleware.single("profilePic"), updateProfile)

//  for logout user
userRouter.post("/logout", authMiddleware, userLogout)


// ==========================================
// FORGOT / RESET PASSWORD ROUTES
// ==========================================
userRouter.post("/forgot_password", forgotPassword);
userRouter.get("/reset_password/validate/:token", validateResetToken);
userRouter.post("/reset_password/:token", resetPassword);

export default userRouter