import fs from "fs";
import csv from "csv-parser";
import bcrypt from "bcryptjs";
import { Validator } from "node-input-validator";

import path from "path"

//  model - schamea
import userModel from "#models/userModel"
import uploadModel from "#models/uploadModel"
import sharedLinkModel from "#models/sharedLinksModel"
import chunkModel from "#models/chunkModel"
import sessionModel from "#models/sessionModel"
import notificationModel from "#models/notification";


//  utils - helper
import { logger } from "#utils/logger"
import { searchOptimize } from "#utils/index"
import { processProfileImage } from "#utils/imageProcessor";
import { getStorage } from "../services/storageFactory.js";

//  htis for the editor upaldoe ditem moe to editor root
import { sharedItemReperent } from "#utils/sharedItemReparent";
import { updateFolderSizeTree } from "#utils/getFolderSizeHelper";

// ----------------------------- CREATE USER  ----------------------------------
export const createUser = async (req, res) => {
    try {

        // Trim inputs in request body first
        if (req.body.name) req.body.name = req.body.name.trim();
        if (req.body.user_id) req.body.user_id = req.body.user_id.trim();
        if (req.body.email) req.body.email = req.body.email.trim();

        let { user_id, name, email, password, is_active } = req.body;

        // ##################################################
        //  --- STEP - 2 : Validation
        // #################################################
        const validations = new Validator(req.body, {
            user_id: "required|string",
            name: "required|string",
            email: "required|email",
            password: "required|minLength:8",
            is_active: "boolean"
        });

        const matched = await validations.check();

        if (!matched) {
            const errors = Object.fromEntries(Object.entries(validations.errors).map(([field, error]) => [field, error.message]));
            return res.status(400).json({ success: false, errors });
        }

        const normalizedEmail = email.trim().toLowerCase()

        // Email validation email must contains @ - domain - . - extension
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({ success: false, message: "Email is invalid" })
        }

        //validation for password - password must contains one upper case one special charcter and must 8 char long
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

        if (!passwordRegex.test(password)) {
            return res.status(400).json({ success: false, message: "Password must be 8 characters, one uppercase and one special symbol" })
        }

        // ##################################################
        //  --- STEP - 3 : Data base check for email and password
        // #################################################

        //  1) check user wil the same email id exist on the databse or not
        const existingEmail = await userModel.findOne({ email: normalizedEmail })

        if (existingEmail) {
            return res.status(400).json({ success: false, message: "Email already registered" })
        }

        // 2) check user with same user_id already exist or not 
        const existingUserId = await userModel.findOne({ user_id })
        if (existingUserId) {
            return res.status(400).json({ success: false, message: "User ID already taken" })
        }

        // ==============================
        // AVATAR UPLOAD (USING YOUR HELPER)
        // ==============================
        if (req.file && !req.file.mimetype.startsWith("image/")) {
            return res.status(400).json({ message: "Only image allowed for profile picture" });
        }

        let newAvatar = {};

        if (req.file) {
            // process via existing helper
            newAvatar = await processProfileImage(req.file);
        }

        // ##################################################
        //  --- STEP - 5 : Hashing password
        // #################################################
        const hashedPassword = await bcrypt.hash(password, 10)

        // ##################################################
        //  --- STEP - 5=6 : Create user in database
        // #################################################
        const newUser = await userModel.create({
            user_id,
            name,
            email: normalizedEmail,
            password: hashedPassword,
            is_active: is_active !== undefined ? is_active : true,
            profilePic: newAvatar?.original_url || "",
            compressed_profile_pic: newAvatar?.compressed_url || "",
            thumbnail_profile_pic: newAvatar?.thumbnail_url || "",
        })

        // Dont send password to front end
        const userResponse = newUser.toObject();

        delete userResponse.password;

        // ##################################################
        //  --- STEP - 7 : Send response
        // #################################################
        res.status(201).json({ success: true, userResponse })

    } catch (error) {
        logger.error("Create user error: ", error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ----------------------------- CREATE USER END  ------------------------------

// ----------------------------- GET USERS ALSO WITH SEARCH --------------------
export const getUsers = async (req, res) => {
    try {

        // ##################################################
        // ---- STEP 1: Extract query params ----------------
        // ##################################################

        let {
            page = 1,
            limit = 25,
            search,
            role = "user",
            is_active
        } = req.query;

        page = parseInt(page);
        limit = parseInt(limit);

        const sortField = req.query.sortField || "createdAt";
        const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

        // ##################################################
        // ---- STEP 2: Build query -------------------------
        // ##################################################

        const filters = [
            { is_deleted: false }
        ];

        // Search by name, email, user_id
        if (search) {
            search = searchOptimize(search.trim());

            filters.push({
                $or: [
                    { name: search },
                    { email: search },
                    { user_id: search }
                ]
            });
        }

        // Filter by role
        if (role) {
            filters.push({ role });
        }

        // Filter by active status
        if (is_active !== undefined && is_active !== "") {
            filters.push({
                is_active: is_active === "true"
            });
        }

        const query = filters.length > 1
            ? { $and: filters }
            : filters[0];

        // ##################################################
        // ---- STEP 3: Sorting & Pagination ----------------
        // ##################################################

        const ALLOWED_SORT_FIELDS = [
            "user_id",
            "email",
            "createdAt",
            "is_active",
            "name"
        ];

        const safeSortField = ALLOWED_SORT_FIELDS.includes(sortField)
            ? sortField
            : "createdAt";

        const skip = (page - 1) * limit;

        // ##################################################
        // ---- STEP 4: Get total count ---------------------
        // ##################################################

        const total = await userModel.countDocuments(query);

        const totalPages = Math.ceil(total / limit);

        // here we are getting all ids of users becuase we have this main checkbox here when  user seelct so select all users
        const allMatchingIds = await userModel.find(query).select("_id").lean()

        // ##################################################
        // ---- STEP 5: Fetch users -------------------------
        // ##################################################

        const users = await userModel.find(query)
            .select("-password")
            .collation({ locale: "en", strength: 2 })
            .sort({ [safeSortField]: sortOrder })
            .skip(skip)
            .limit(limit)
            .lean();

        // ##################################################
        // ---- STEP 6: Send response -----------------------
        // ##################################################

        res.status(200).json({
            success: true,
            users,
            allIds: allMatchingIds.map(u => u._id),
            pagination: {
                total,
                page,
                limit,
                totalPages,
                hasMore: page < totalPages
            }
        });

    } catch (error) {
        logger.error(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ----------------------------- GET USERS ALSO WITH SEARCH END ----------------

// ----------------------------- UPDATE USER ----------------------------------
export const updateUser = async (req, res) => {
    try {
        // Trim inputs in request body first
        if (req.body.name) req.body.name = req.body.name.trim();
        if (req.body.user_id) req.body.user_id = req.body.user_id.trim();
        if (req.body.email) req.body.email = req.body.email.trim();

        const { name, password, is_active } = req.body;
        const { update_user_id } = req.params;

        //  if user id is same so dont change status and role here
        const isSelf = req.user._id.toString() === update_user_id.toString()

        const userData = await userModel.findById(update_user_id);

        if (!userData) {
            return res.status(404).json({ message: "User not found" });
        }

        // ==============================
        // USERNAME CHECK (Disabled so admin cannot change user_id)
        // ==============================
        // if (user_id && user_id !== userData.user_id) {
        //     const exists = await userModel.findOne({ user_id });
        //
        //     if (exists) {
        //         return res.status(400).json({
        //             message: "User ID already taken"
        //         });
        //     }
        //
        //     userData.user_id = user_id;
        // }

        // ==============================
        // NAME UPDATE
        // ==============================
        if (name) {
            userData.name = name;
        }

        // EMAIL UPDATE (Disabled so admin cannot change email)
        // if (email) {
        //     const normalizedEmail = email.trim().toLowerCase()
        //
        //     //  Email validation email must contains @ - domain - . - extension
        //     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        //     if (!emailRegex.test(normalizedEmail)) {
        //         return res.status(400).json({ success: false, message: "Email is invalid" })
        //     }
        //
        //     if (normalizedEmail !== userData.email) {
        //         //  here chek liek if email id is already register here or not
        //         const existingEmail = await userModel.findOne({ email: normalizedEmail })
        //         if (existingEmail) {
        //             return res.status(400).json({ success: false, message: "Email already registered" })
        //         }
        //     }
        //
        //     userData.email = normalizedEmail;
        // }

        //    user active status
        if (is_active !== undefined) {
            const isActiveBool = is_active === "true" || is_active === true
            if (isSelf && !isActiveBool) {
                return res.status(400).json({ message: "You cannot deactivate your own account." });
            }
            userData.is_active = isActiveBool
        }

        if (password) {
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!passwordRegex.test(password)) {
                return res.status(400).json({
                    success: false,
                    message: "Password must be 8 characters, one uppercase and one special symbol"
                });
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
                    const pic = userData.profilePic.replace(/^[/\\]+/, '')
                    const comp = userData.compressed_profile_pic?.replace(/^[/\\]+/, '')
                    const thumb = userData.thumbnail_profile_pic?.replace(/^[/\\]+/, '')

                    if (pic && fs.existsSync(path.join(process.cwd(), pic))) fs.unlinkSync(path.join(process.cwd(), pic));
                    if (comp && fs.existsSync(path.join(process.cwd(), comp))) fs.unlinkSync(path.join(process.cwd(), comp));
                    if (thumb && fs.existsSync(path.join(process.cwd(), thumb))) fs.unlinkSync(path.join(process.cwd(), thumb));

                } catch (err) {
                    logger.error("Avatar delete error:", err);
                }
            }

            userData.profilePic = newAvatar.original_url;
            userData.compressed_profile_pic = newAvatar.compressed_url;
            userData.thumbnail_profile_pic = newAvatar.thumbnail_url;

        } else if (req.body.removeProfilePic === "true") {
            // remove the profile picture here form the storage
            if (userData.profilePic) {
                try {
                    const pic = userData.profilePic.replace(/^[/\\]+/, '');
                    const comp = userData.compressed_profile_pic?.replace(/^[/\\]+/, '');
                    const thumb = userData.thumbnail_profile_pic?.replace(/^[/\\]+/, '');
                    if (pic && fs.existsSync(path.join(process.cwd(), pic))) fs.unlinkSync(path.join(process.cwd(), pic));
                    if (comp && fs.existsSync(path.join(process.cwd(), comp))) fs.unlinkSync(path.join(process.cwd(), comp));
                    if (thumb && fs.existsSync(path.join(process.cwd(), thumb))) fs.unlinkSync(path.join(process.cwd(), thumb));
                } catch (err) {
                    logger.error("Avatar delete error:", err);
                }
            }

            userData.profilePic = null;
            userData.compressed_profile_pic = null;
            userData.thumbnail_profile_pic = null;
        }


        await userData.save();


        // 1. Create a safe copy without the password
        const safeUserData = userData.toObject();
        delete safeUserData.password;


        //  here send the socket event to other user 
        if (userData.is_active === false) {
            // force log out for account deactivation
            req.emitToUser(userData._id.toString(), "force_logout", { message: "Your account has been deactivated by an Admin." })
        } else if (!isSelf && password) {
            // force log out for password change
            req.emitToUser(userData._id.toString(), "force_logout", { message: "Your password was updated by an Admin. Please log in again." })
        }
        else {
            //  instant update the profile of other user socket
            req.emitToUser(safeUserData._id.toString(), "profile_updated", safeUserData);

            // 2. Global broadcast to everyone
            req.io?.emit("global_user_profile_updated", safeUserData);
        }

        return res.status(200).json({
            message: "Profile updated successfully",
            data: safeUserData
        });

    } catch (error) {
        logger.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ----------------------------- UPDATE USER END ------------------------------

// ----------------------------- GET USER ------------------------------
export const getUserDetails = async (req, res) => {
    try {
        // get user_id from params
        const { user_id } = req.params;

        const userDetails = await userModel.findOne({ _id: user_id, is_deleted: false }).select("-password");

        if (!userDetails) {
            return res.status(400).json({ success: false, message: "User not found" })
        }

        res.status(200).json({ success: true, data: userDetails, message: "User fetched successfully" })
    } catch (error) {
        logger.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ----------------------------- GET USER ------------------------------
export const deleteUser = async (req, res) => {
    try {
        const { user_ids } = req.body

        if (!Array.isArray(user_ids) || user_ids.length === 0) {
            return res.status(400).json({ success: false, message: "user_ids must be a non-empty array" });
        }


        if (user_ids.some(id => id.toString() === req.user._id.toString())) {
            return res.status(400).json({ success: false, message: "You cannot delete your own admin account." });
        }

        // -------------------------------------------------------------
        // STEP 1: Find target users
        // -------------------------------------------------------------
        const targetUsers = await userModel.find({ _id: { $in: user_ids } })
        if (!targetUsers || targetUsers.length === 0) {
            return res.status(404).json({ success: false, message: "No active users found" });
        }


        // -------------------------------------------------------------
        // STEP 2: Editor uplaoded item move to editor root
        // -------------------------------------------------------------
        const foldersOwnedByTarget = await uploadModel.find({
            owner: { $in: user_ids },
            type: "folder"
        }).select("_id").lean()

        const rootFolderIds = foldersOwnedByTarget.map(f => f._id);

        let reparentMap = new Map()
        if (rootFolderIds.length > 0) {
            reparentMap = await sharedItemReperent(
                rootFolderIds,
                (ownerId) => !user_ids.map(String).includes(ownerId)
            )
        }

        //  notify the ediotr whoes items moved out from deleted user shared folder
        reparentMap.forEach((items, ownerId) => {
            items.forEach(({ itemId, oldParent, movedItem }) => {
                req.emitToUser(ownerId, "item_moved", {
                    itemId,
                    oldParent,
                    newParent: null,
                    movedItem
                })
            })
        })


        // -------------------------------------------------------------
        // STEP 3: Here find all items that are upladoed by the user who is deleting
        // -------------------------------------------------------------
        const ownedItems = await uploadModel.find({
            owner: { $in: user_ids }
        }).lean()

        const ownedFileItems = ownedItems.filter(i => i.type === "file")
        const ownedIdSet = new Set(ownedItems.map(i => i._id.toString()))
        const userUploadIds = ownedFileItems.map(f => f.uploadId).filter(Boolean)


        // -------------------------------------------------------------
        // STEP 4: when user is deleted here so if this user upaldoed items in another shared item so modify fodler size here
        // -------------------------------------------------------------
        for (const file of ownedFileItems) {
            if (file.parent && file.fileSize && !ownedIdSet.has(file.parent.toString())) {
                await updateFolderSizeTree(file.parent, -file.fileSize)
            }
        }


        // -------------------------------------------------------------
        // STEP 5: Delete DB records first
        // -------------------------------------------------------------
        if (userUploadIds.length > 0) {
            await chunkModel.deleteMany({ uploadId: { $in: userUploadIds } })
        }

        await uploadModel.deleteMany({ owner: { $in: user_ids } })

        //  here delete this user from the shared list where othr user shared file with this user 
        await uploadModel.updateMany(
            { "sharedWith.userId": { $in: user_ids } },
            { $pull: { sharedWith: { userId: { $in: user_ids } } } }
        )

        //  shared link modal delete all record here
        await sharedLinkModel.deleteMany({ user_id: { $in: user_ids } })

        // session modal deelte 
        await sessionModel.deleteMany({ user_id: { $in: user_ids } })

        //  notification model deelte everything
        await notificationModel.deleteMany({
            $or: [
                { recipient: { $in: user_ids } },
                { actor: { $in: user_ids } }
            ]
        })

        //  user record delte the record 
        const deleteResult = await userModel.deleteMany({ _id: { $in: user_ids } })


        // -------------------------------------------------------------
        // STEP 6: Force logout
        // -------------------------------------------------------------
        user_ids.forEach(userId => {
            req.emitToUser(userId.toString(), "force_logout", {})
        })

        res.status(200).json({
            success: true,
            message: `${deleteResult.deletedCount} user(s) and all associated files/data permanently deleted successfully`
        });


        // -------------------------------------------------------------
        // STEP 7: Noe deelte the files form the disk 
        // (avatars + uploaded files, refCount-safe)
        // -------------------------------------------------------------

        (async () => {
            const storage = getStorage()

            //  user profile pic delete
            for (const u of targetUsers) {
                try {
                    const pic = u.profilePic?.replace(/^[/\\]+/, '');
                    const comp = u.compressed_profile_pic?.replace(/^[/\\]+/, '');
                    const thumb = u.thumbnail_profile_pic?.replace(/^[/\\]+/, '');

                    if (pic && fs.existsSync(path.join(process.cwd(), pic))) fs.unlinkSync(path.join(process.cwd(), pic));
                    if (comp && fs.existsSync(path.join(process.cwd(), comp))) fs.unlinkSync(path.join(process.cwd(), comp));
                    if (thumb && fs.existsSync(path.join(process.cwd(), thumb))) fs.unlinkSync(path.join(process.cwd(), thumb));
                } catch (error) {
                    logger.error(`Avatar delete failed for ${u._id}: ${error.message}`);
                }
            }

            // uploaded file delete
            for (const file of ownedFileItems) {
                if (!file.storagePath) continue

                try {
                    if (file.uploadStatus === "uploading") {
                        await storage.cancelUpload(file.storagePath, file.s3_uplaod_id, file.uploadId)
                        continue
                    }
                    await uploadModel.updateMany(
                        { storagePath: file.storagePath },
                        { $inc: { refCount: -1 } }
                    )

                    const remaining = await uploadModel.countDocuments({
                        storagePath: file.storagePath
                    })

                    if (remaining === 0) {
                        await storage.deleteFile(file.storagePath)
                    }

                } catch (error) {
                    logger.error(`Background delete failed for ${file._id}: ${error.message}`);
                }
            }
        })()

    } catch (error) {
        logger.error("Delete user error: ", error);
        return res.status(500).json({ success: false, message: error.message });
    }
}


// ----------------------------- IMPORT USERS ------------------------------
export const importUsers = async (req, res) => {
    try {
        if (!req.clientDb) {
            return res.status(400).json({ message: "Client DB not found" });
        }
        const userModel = getUserModel(req.clientDb);
        const clientModel = require("@models/client");
        if (!req.file) {
            return res.status(400).json({ message: "CSV file required" });
        }
        const users = [];
        await new Promise((resolve, reject) => {
            fs.createReadStream(req.file.path)
                .pipe(csv({
                    mapHeaders: ({ header }) => {
                        // Normalize case (Email, EMAIL, EMail -> email) but keep exact
                        // spelling otherwise, so typos like "Emails" don't silently
                        // pass through as something else.
                        const normalized = header.toLowerCase().trim();
                        if (normalized === "fullname" || normalized === "full_name" || normalized === "full name") {
                            return "name";
                        }
                        return normalized;
                    }
                }))
                .on("data", (row) => users.push(row))
                .on("end", resolve)
                .on("error", reject);
        });
        if (!users.length) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: "CSV is empty" });
        }

        // ── Header validation ───────────────────────────────────────────
        // Required columns (case-insensitive), but must match EXACTLY once
        // normalized — "Emails", "user_name", "pass word" etc. should NOT
        // be silently accepted as the real column.
        const REQUIRED_HEADERS = ["username", "name", "email", "password"];
        const HEADER_DISPLAY_NAME = {
            username: "Username",
            name: "FullName",
            email: "Email",
            password: "Password",
        };
        const actualHeaders = Object.keys(users[0]);
        const missingHeaders = REQUIRED_HEADERS.filter((h) => !actualHeaders.includes(h));
        if (missingHeaders.length) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                message: `Can't import: file headers don't match the required format. Missing or renamed column(s): ${missingHeaders.map((h) => HEADER_DISPLAY_NAME[h]).join(", ")}. Expected columns: Username, FullName, Email, Password.`
            });
        }
        // ─────────────────────────────────────────────────────────────────

        // ── Validation helpers ──────────────────────────────────────────
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

        const validateEmail = (email) => emailRegex.test(String(email || "").trim());
        const validatePassword = (password) => passwordRegex.test(String(password || ""));

        // ── User limit check ──────────────────────────────────────────────
        const client = await clientModel.findOne({ admin_user_id: req.user._id })
            .select("subscription_status number_of_users");
        const subscriptionStatus = client?.subscription_status || "trial";
        const isTrial = subscriptionStatus === "trial";
        const userLimit = isTrial
            ? parseInt(process.env.TRIAL_USER_LIMIT || "20", 10)
            : parseInt(client.number_of_users || "501", 10);
        const currentUserCount = await userModel.countDocuments({});
        const availableSlots = userLimit - currentUserCount;
        if (availableSlots <= 0) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                message: `User limit reached. Your ${isTrial ? "trial" : "current"} plan allows up to ${userLimit} users. You already have ${currentUserCount} users. Please upgrade your plan to add more users.`
            });
        }
        // ─────────────────────────────────────────────────────────────────
        const emails = users.map(u => u.email).filter(Boolean);
        const usernames = users.map(u => u.username).filter(Boolean);
        const existingUsers = await userModel.find({
            $or: [
                { email: { $in: emails } },
                { username: { $in: usernames } }
            ]
        });
        const existingEmailSet = new Set(existingUsers.map(u => u.email));
        const existingUsernameSet = new Set(existingUsers.map(u => u.username));

        // Track usernames/emails seen within the CSV itself (to catch duplicates inside the file)
        const seenEmailSet = new Set();
        const seenUsernameSet = new Set();

        const bulkOps = [];
        const errors = [];
        let limitReachedCount = 0;

        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            const row = i + 2;
            const username = (user.username || "").trim();
            const email = (user.email || "").trim();

            try {
                // ── Basic required fields ──────────────────────────────
                if (!user.name || !email || !username || !user.password) {
                    errors.push({ row, username: username || null, email: email || null, error: "Missing required fields" });
                    continue;
                }

                // ── Username uniqueness (DB + within file) ─────────────
                if (existingUsernameSet.has(username) || seenUsernameSet.has(username)) {
                    errors.push({ row, username, email, error: "Username already exists" });
                    continue;
                }

                // ── Email uniqueness (DB + within file) ────────────────
                if (existingEmailSet.has(email) || seenEmailSet.has(email)) {
                    errors.push({ row, username, email, error: "Email already exists" });
                    continue;
                }

                // ── Email format ────────────────────────────────────────
                if (!validateEmail(email)) {
                    errors.push({ row, username, email, error: "Invalid email address" });
                    continue;
                }

                // ── Password strength ───────────────────────────────────
                if (!validatePassword(user.password)) {
                    errors.push({
                        row,
                        username,
                        email,
                        error: "Password must be at least 8 characters and contain 1 uppercase, 1 lowercase, 1 number, and 1 special character"
                    });
                    continue;
                }

                // ── Stop inserting once available slots are filled ────
                if (bulkOps.length >= availableSlots) {
                    limitReachedCount++;
                    errors.push({
                        row,
                        username,
                        email,
                        error: `User limit reached. Your ${isTrial ? "trial" : "current"} plan allows up to ${userLimit} users.`
                    });
                    continue;
                }

                // Mark as seen so later duplicate rows in the same file get caught
                seenUsernameSet.add(username);
                seenEmailSet.add(email);

                const hashedPassword = await bcrypt.hash(user.password, 10);
                bulkOps.push({
                    insertOne: {
                        document: {
                            name: user.name,
                            username,
                            email,
                            password: hashedPassword,
                            status: "offline",
                            avatar: {
                                "file_name": "default-profile-7.svg",
                                "file_url": "/uploads/default/default-icon.svg",
                                "original_file_url": "/uploads/default/compressed-default-icon.webp",
                                "file_type": "image/svg+xml",
                                "file_size": 172450,
                                "thumbnail_url": "/uploads/default/thumb-default-icon.png"
                            }
                        }
                    }
                });
            } catch (err) {
                errors.push({ row, username: username || null, email: email || null, error: err.message });
            }
        }

        if (bulkOps.length) {
            await userModel.bulkWrite(bulkOps);
        }
        fs.unlinkSync(req.file.path);
        return res.status(200).json({
            message: limitReachedCount > 0
                ? `Import completed. ${limitReachedCount} user(s) were not imported because you've reached your ${isTrial ? "trial" : "plan"} limit of ${userLimit} users. Please upgrade your plan to add more users.`
                : "Users import completed",
            inserted: bulkOps.length,
            // errors: errors.length,
            // errorDetails: errors
        });
    } catch (error) {
        logger.error("Import Users Error:", error);
        if (req.file?.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        return res.status(500).json({ message: "Import failed" });
    }
};

// ----------------------------- CHECK AVAILABILITY ---------------------------
//  when admin create new user and input box of user id and email show this message 
export const checkAvailability = async (req, res) => {
    try {
        const { user_id, email } = req.query;
        let exists = false;

        if (user_id) {
            const normalizedUserId = user_id.trim();
            const user = await userModel.findOne({ user_id: normalizedUserId, is_deleted: false });
            if (user) exists = true;
        } else if (email) {
            const normalizedEmail = email.trim().toLowerCase();
            const user = await userModel.findOne({ email: normalizedEmail, is_deleted: false });
            if (user) exists = true;
        }

        return res.status(200).json({ success: true, exists });
    } catch (error) {
        logger.error("Check availability error: ", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
