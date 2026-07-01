import bcrypt from "bcryptjs"
import fs from "fs";
import path from "path";
import crypto from "crypto";

//  models - schema
import User from "../models/userModel.js";

//  utils - helper
import { logger } from "#utils/logger";
import { generateToken } from "../utils/generateLoginToken.js";
import { processProfileImage } from "#utils/imageProcessor";
import { sendEmail } from "#utils/sendEmail";

//  User Register Controller
export const registerUser = async (req, res) => {
    try {
        let { name, email, password } = req.body;

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

        //  validation for password - password must contains one upper case one special charcter and must 8 char long
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ success: false, message: "Password must be 8 char one upper case and one special symbole" })
        }

        //  find if user already registered
        const existingUser = await User.findOne({ email: normalizedEmail })
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email already registered" })
        }

        //  password hashing
        const hashedPassword = await bcrypt.hash(password, 10)

        //  create new user
        const user = await User.create({
            name,
            email: normalizedEmail,
            password: hashedPassword
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
        console.log("remember value:", req.body.remember, typeof req.body.remember)

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
                message: "Email not found"
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

        //  generate jwt token here 
        const token = await generateToken(user._id, remember);
        const maxAge = remember
            ? 7 * 24 * 60 * 60 * 1000   // 7 days
            : 24 * 60 * 60 * 1000;      // 1 day

        //  now saving this toke in cookie
        res.cookie("auth_token", token, {
            httpOnly: true,
            secure: false,      // Must be FALSE for localhost (HTTP)
            sameSite: "lax",    // Required for cross-origin localhost requests
            maxAge
        });

        res.status(200).json({
            success: true,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                profilePic: user.profilePic
            }
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
        // clear cookies
        res.clearCookie("auth_token", {
            httpOnly: true,
            maxAge: 0
        })

        res.status(200).json({ success: true, message: "Logged out success" })
    } catch (error) {
        logger.error(error);
        res.status(500).json({ success: false, message: error.message })
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
        const { name, email, user_id, password, currentPassword } = req.body;

        let userID = req.user._id;

        const userData = await User.findById(userID);

        if (!userData) {
            return res.status(404).json({ message: "User not found" });
        }

        // ==============================
        // USERNAME CHECK
        // ==============================
        if (user_id && user_id !== userData.user_id) {
            const exists = await User.findOne({ user_id });

            if (exists) {
                return res.status(400).json({
                    message: "User ID already taken"
                });
            }

            userData.user_id = user_id;
        }

        // ==============================
        // NAME UPDATE
        // ==============================
        if (name) {
            userData.name = name;
        }

        if (email) {
            const normalizedEmail = email.trim().toLowerCase()

            //  Email validation email must contains @ - domain - . - extension
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(normalizedEmail)) {
                return res.status(400).json({ success: false, message: "Email is invalid" })
            }

            userData.email = normalizedEmail;
        }

        if (password || currentPassword) {
            if (!currentPassword) {
                return res.status(400).json({ message: "Current password is required to set a new password" });
            }
            if (!password) {
                return res.status(400).json({ message: "New password is required" });
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
            if (userData.avatar) {
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
        }

        await userData.save();

        return res.status(200).json({
            message: "Profile updated successfully",
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


        // generate random 32 char token
        const rawToken = crypto.randomBytes(32).toString("hex")

        // hash the token to store in the database securely
        const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex")


        //  save this token to data base adn token expire is 15 miniutes
        user.reset_password_token = hashedToken;
        user.reset_password_expires = Date.now() + 15 * 60 * 1000
        await user.save()


        //  create reset url here with token here
        const resetUrl = `${process.env.WEB_URL}/reset-password/${rawToken}`

        //  build the email html
        const emailHtml = `
            <h3>Hello ${user.name},</h3>
            <p>You requested a password reset. Click the link below to securely set a new password:</p>
            <a href="${resetUrl}" target="_blank">${resetUrl}</a>
            <p>This link will expire in 15 minutes.</p>
            <p>If you didn't request this, you can safely ignore this email.</p>
        `;


        //  send the email with helper function 
        await sendEmail({
            to: user.email,
            subject: "Password Reset Request - DocSpot",
            html: emailHtml
        })

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
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ success: false, message: "New password is required" });
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

        res.status(200).json({ success: true, message: "Password reset successfully. You can now login." });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ success: false, message: "Error resetting password" });
    }
}