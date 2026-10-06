import bcrypt from "bcryptjs"
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { V3 } from "paseto"


//  models - schema
import User from "../models/userModel.js";
import sessionModel from "#models/sessionModel";

//  utils - helper
import { logger } from "#utils/logger";
import { generateToken } from "../utils/generateLoginToken.js";
import { processProfileImage } from "#utils/imageProcessor";
import { sendEmail } from "#utils/sendEmail";



//  helper function here 
const getKey = () => {
    return crypto.createSecretKey(Buffer.from(process.env.PASETO_SECRET_KEY, "hex"))
}

//  User Register Controller
export const registerUser = async (req, res) => {
    try {
        let { name, email, password, user_id } = req.body;

        // validation check all filed are required
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: "All Fields Are Required" })
        }

        // normalize email - Test@gmail.com -> test@gmail.com
        const normalizedEmail = email.trim().toLowerCase();
        name = name?.trim();

        // Email validation email must contains @ - domain - . - extension
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({ success: false, message: "Email is invalid" })
        }

        // Determine user_id (use provided user_id or generate from email prefix)
        const finalUserId = user_id && user_id.trim()
            ? user_id.trim()
            : normalizedEmail.split("@")[0];

        //  validation for password - password must contains one upper case one special charcter and must 8 char long
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters, with 1 uppercase, 1 special symbol, and no spaces" })
        }

        //  find if user already registered by email
        const existingUser = await User.findOne({ email: normalizedEmail })
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email already registered" })
        }

        // Check if user_id is already taken
        const existingUserId = await User.findOne({ user_id: finalUserId })
        if (existingUserId) {
            return res.status(400).json({ success: false, message: "Username/user_id already exists" })
        }

        // Automatically make the very first user in the database an admin!
        const userCount = await User.countDocuments()
        const role = userCount === 0 ? "admin" : (req.body.role || "user")

        //  password hashing
        const hashedPassword = await bcrypt.hash(password, 10)

        //  create new user
        const user = await User.create({
            user_id: finalUserId,
            name,
            email: normalizedEmail,
            password: hashedPassword,
            role
        })

        // dont send password to frontend
        user.password = undefined;

        res.status(201).json({ success: true, user })

    } catch (error) {
        logger.error(error);
        res.status(500).json({ success: false, message: error.message })
    }
}

//  for user Login
export const userLogin = async (req, res) => {
    try {
        let { email, password, remember = false } = req.body;
        // console.log("remember value:", req.body.remember, typeof req.body.remember)

        //  normalize theemail
        email = email?.trim().toLowerCase();

        // validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        //  find if user is exist or not in server
        const user = await User.findOne({ email })
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid Credential"
            });
        }

        // check if user is deleted
        if (user.is_deleted) {
            return res.status(403).json({
                success: false,
                message: "Your account has been deleted"
            });
        }

        // check if user is active
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: "Account inactivate. Please contact admin"
            });
        }

        // check password vlaidation
        const isPasswordMatch = await bcrypt.compare(password, user.password)
        if (!isPasswordMatch) {
            return res.status(400).json({
                success: false,
                message: "Invalid Credential"
            });
        }

        // ------------------------------------------
        // Access Token - always short lived (2 hour)
        // ------------------------------------------
        const accessToken = await generateToken(user._id, 2 * 60 * 60 * 1000)


        // ------------------------------------------
        // Refresh Token - duration depends on "remember me"
        // ------------------------------------------
        const refreshTokenExpiry = remember
            //  ? 7 * 24 * 60 * 60 * 1000   // 7 days
            //     : 24 * 60 * 60 * 1000;
            ? 30 * 24 * 60 * 60 * 1000   // 30 days (1 month)
            : 7 * 24 * 60 * 60 * 1000;   // 7 days


        const refreshToken = await generateToken(user._id, refreshTokenExpiry, true)


        // ------------------------------------------
        // Save session in DB so refresh token is trackable/revocable
        // ------------------------------------------
        await sessionModel.create({
            user_id: user._id,
            refresh_token: refreshToken,
            device_label: req.headers["user-agent"] || null,
            last_active_at: new Date()
        })



        const isProduction = process.env.NODE_ENV === "production";

        // access token cookie
        res.cookie("doc_auth_token", accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 2 * 60 * 60 * 1000
        })


        //  refresh token cookie
        res.cookie("doc_refresh_token", refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: refreshTokenExpiry    // 7 days or 30 days (1 month)
        })


        res.status(200).json({
            success: true,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                profilePic: user.profilePic
            },
            token: accessToken
        });

    } catch (error) {
        logger.error(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

// Clear token when user logged out
export const userLogout = async (req, res) => {
    try {
        const isProduction = process.env.NODE_ENV === "production";
        const refreshToken = req.cookies.doc_refresh_token || req.cookies.refresh_token

        //  delete the session from DB so refresh token can not be used agian here
        if (refreshToken) {
            await sessionModel.deleteOne({ refresh_token: refreshToken })
        }


        res.clearCookie("doc_auth_token", {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 0
        })

        res.clearCookie("doc_refresh_token", {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 0
        })

        res.status(200).json({ success: true, message: "Logged out success" })


    } catch (error) {
        logger.error(error);
        res.status(500).json({ success: false, message: error.message })
    }
}




//  refresh token for the new acces token generate here
export const refreshAccessToken = async (req, res) => {
    try {
        const token = req.cookies.doc_refresh_token || req.cookies.refresh_token
        if (!token) {
            return res.status(401).json({ success: false, message: "No refresh token, please login" });
        }

        //  first find thsi seeion db record if exist or not with this refresh token here
        const session = await sessionModel.findOne({ refresh_token: token })
        if (!session) {
            return res.status(401).json({ success: false, message: "Invalid session, please login" });
        }

        //  if session found with refresh token so decrypt it here
        let payload
        try {
            payload = await V3.decrypt(token, getKey())

            //  now chek here the expire date from the payload here 
            if (payload.exp && new Date(payload.exp) < new Date()) {
                throw new Error("expired")
            }

            // make sure this is a refresh token not the access token here
            if (payload.type !== "refresh") {
                throw new Error("invalid type")
            }

        } catch (verifyError) {
            // token expired/invalid/tampered — session is dead, clean it up
            await sessionModel.deleteOne({ _id: session._id })
            res.clearCookie("doc_auth_token")
            res.clearCookie("doc_refresh_token")
            return res.status(401).json({ success: false, message: "Session expired, please login again" });
        }


        // if refresh token is still valid so create new access token here
        const newAccessToken = await generateToken(payload.id, 2 * 60 * 60 * 1000)

        const isProduction = process.env.NODE_ENV === "production";

        res.cookie("doc_auth_token", newAccessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 2 * 60 * 60 * 1000    // 2 hours
        })


        //  update the last active time on this session
        session.last_active_at = new Date()
        await session.save()

        res.status(200).json({ success: true });

    } catch (error) {
        logger.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}






//  get current user here 
export const currentUser = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(400).json({
                success: false,
                message: "No user found"
            });
        }

        res.status(200).json({
            success: true,
            user: req.user
        });

    } catch (error) {
        logger.error(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

//  function to update user profile details 
export const updateProfile = async (req, res) => {
    try {
        if (req.body.name) req.body.name = req.body.name.trim();

        const { name, password, currentPassword } = req.body;

        let userID = req.user._id;

        const userData = await User.findById(userID);

        if (!userData) {
            return res.status(404).json({ message: "User not found" });
        }

        // ==============================
        // NAME UPDATE
        // ==============================
        if (name) {
            userData.name = name;
        }

        if (password || currentPassword) {
            if (!currentPassword) {
                return res.status(400).json({ message: "Current password is required to set a new password" });
            }
            if (!password) {
                return res.status(400).json({ message: "New password is required" });
            }

            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!passwordRegex.test(password)) {
                return res.status(400).json({ message: "Password must be at least 8 characters, with 1 uppercase, 1 special symbol, and no spaces" });
            }

            const isMatch = await bcrypt.compare(currentPassword, userData.password);
            if (!isMatch) {
                return res.status(400).json({ message: "Incorrect current password" });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            userData.password = hashedPassword;
        }

        // ==============================
        // AVATAR UPLOAD (USING YOUR HELPER)
        // ==============================
        if (req.file && !req.file.mimetype.startsWith("image/")) {
            return res.status(400).json({ message: "Only image allowed for profile picture" });
        }

        if (req.file) {
            // process via existing helper
            const newAvatar = await processProfileImage(req.file);

            // ==============================
            // DELETE OLD AVATAR
            // ==============================
            if (userData.profilePic) {
                try {
                    if (userData.profilePic) {
                        fs.unlinkSync(
                            path.join(process.cwd(), userData.profilePic)
                        );
                    }

                    if (userData.compressed_profile_pic) {
                        fs.unlinkSync(
                            path.join(process.cwd(), userData.compressed_profile_pic)
                        );
                    }

                    if (userData.thumbnail_profile_pic) {
                        fs.unlinkSync(
                            path.join(process.cwd(), userData.thumbnail_profile_pic)
                        );
                    }
                } catch (err) {
                    logger.error("Avatar delete error:", err);
                }
            }

            userData.profilePic = newAvatar.original_url;
            userData.compressed_profile_pic = newAvatar.compressed_url;
            userData.thumbnail_profile_pic = newAvatar.thumbnail_url;
        } else if (req.body.removeProfilePic === "true") {
            // if user remove the profile picture here so delete the backend files here 
            if (userData.profilePic) {
                try {
                    if (userData.profilePic) fs.unlinkSync(path.join(process.cwd(), userData.profilePic));
                    if (userData.compressed_profile_pic) fs.unlinkSync(path.join(process.cwd(), userData.compressed_profile_pic));
                    if (userData.thumbnail_profile_pic) fs.unlinkSync(path.join(process.cwd(), userData.thumbnail_profile_pic));
                } catch (error) {
                    logger.error("Avatar delete error:", error);
                }
            }

            userData.profilePic = null;
            userData.compressed_profile_pic = null;
            userData.thumbnail_profile_pic = null;
        }

        await userData.save();

        //  check here if passwro di supdated or not 
        const isPasswordUpdate = !!(password || currentPassword)

        req.io?.emit("global_user_profile_updated", {
            _id: userData._id.toString(),
            name: userData.name,
            email: userData.email,
            profilePic: userData.profilePic,
            compressed_profile_pic: userData.compressed_profile_pic,
            thumbnail_profile_pic: userData.thumbnail_profile_pic
        });


        return res.status(200).json({
            message: isPasswordUpdate ? "Password updated successfully" : "Profile updated successfully",
            data: userData
        });

    } catch (error) {
        logger.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}



//  this function is used for the forgot password so create token adn send mail to user here
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required" })
        }


        //  validation if email exist in our database
        const normalizeEmail = email.trim().toLowerCase()

        //  find if any user exist with this email id or not 
        const user = await User.findOne({ email: normalizeEmail })
        if (!user) {
            return res.status(404).json({ success: false, message: "Invalid email" })
        }

        // check if user is deactivated or deleted
        if (!user.is_active || user.is_deleted) {
            return res.status(403).json({ success: false, message: "Account is inactive. Please contact your administrator." })
        }

        // generate random 16 byte (32 char) token
        const rawToken = crypto.randomBytes(16).toString("hex")

        // hash the token to store in the database securely
        const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex")


        //  save this token to data base adn token expire is 15 miniutes
        user.reset_password_token = hashedToken;
        user.reset_password_expires = Date.now() + 15 * 60 * 1000
        await user.save()


        //  create reset url here with token here
        const resetUrl = `${process.env.WEB_URL}/reset-password/${rawToken}`


        //  send the email with helper function 
        await sendEmail({
            to: user.email,
            subject: "Password Reset Request - DocSpot",
            template: "resetPassword",    // which tempelate you want to use
            data: {
                name: user.name,
                link: resetUrl,
                MAIN_URL: process.env.APP_URL || `http://localhost:${process.env.PORT || 4001}`,
                unsubscribe_link: "#"
            }
        });

        res.status(200).json({ success: true, message: "Password reset link sent to your email" });

    } catch (error) {
        logger.error(error);

        // if email sending was fail so we need to earse the token from database
        if (req.body.email) {
            const user = await User.findOne({ email: req.body.email.trim().toLowerCase() });
            if (user) {
                user.reset_password_token = undefined;
                user.reset_password_expires = undefined;
                await user.save();
            }
        }

        res.status(500).json({ success: false, message: "Error sending email. Please try again later." });

    }
}




//  this fucntion will check like if link token is expired or not if expired so we can do bettwe ui herre
export const validateResetToken = async (req, res) => {
    try {
        const { token } = req.params;

        //  hash the incoming token here
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex")


        // lokk for a user where token and expire date here will be greater then current time
        const user = await User.findOne({
            reset_password_token: hashedToken,
            reset_password_expires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: "Link has expired or is invalid" });
        }
        res.status(200).json({ success: true, message: "Token is valid" });

    } catch (error) {
        logger.error(error);
        res.status(500).json({ success: false, message: "Error validating token" });
    }
}




// reset password 
export const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password, confirmPassword } = req.body;

        //  check if passwro dand confirm password bothe field exist here
        if (!password || !confirmPassword) {
            return res.status(400).json({ success: false, message: "Password and Confirm Password are required." });
        }

        // verify that here passwrod and confirm passwrod match here
        if (password !== confirmPassword) {
            return res.status(400).json({ success: false, message: "Passwords do not match." });
        }

        // 3. Verify backend password complexity rules
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters, with 1 uppercase, 1 special symbol, and no spaces"
            });
        }

        // Hash the token from the URL
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        // Find user with valid token and unexpired date
        const user = await User.findOne({
            reset_password_token: hashedToken,
            reset_password_expires: { $gt: Date.now() }
        });
        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
        }


        // hash the new password here
        const hashedPassword = await bcrypt.hash(password, 10)

        //  update the user password and clear token
        user.password = hashedPassword;
        user.reset_password_token = undefined;
        user.reset_password_expires = undefined;
        await user.save()

        // Delete all active sessions for this user from DB so all other devices lose access
        await sessionModel.deleteMany({ user_id: user._id });

        // Emit real-time force_logout to all connected devices/mobile sessions of this user
        req.emitToUser?.(user._id.toString(), "force_logout", {
            message: "Your password was reset successfully. Please log in again."
        });

        res.status(200).json({ success: true, message: "Password reset successfully. You can now login." });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ success: false, message: "Error resetting password" });
    }
}