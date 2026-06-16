import bcrypt from "bcryptjs"
import fs from "fs";
import path from "path";

//  models - schema
import User from "../models/userModel.js";

//  utils - helper
import { logger } from "#utils/logger";
import { generateToken } from "../utils/generateLoginToken.js";
import { processProfileImage } from "#utils/imageProcessor";

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
        res.cookie("token", token, {
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
        res.clearCookie("token", {
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
        const { name, email, user_id, password } = req.body;

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

            userData.email = emailRegex;
        }

        if (password) {
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