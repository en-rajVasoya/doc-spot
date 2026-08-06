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
        if (!req.file) {
            return res.status(400).json({ message: "CSV file required" });
        }

        const users = [];

        await new Promise((resolve, reject) => {
            fs.createReadStream(req.file.path)
                .pipe(csv({
                    mapHeaders: ({ header }) => {
                        const normalized = header.toLowerCase().trim();

                        if (normalized === "fullname" || normalized === "full_name" || normalized === "full name") {
                            return "name";
                        }
                        if (normalized === "user_id" || normalized === "userid" || normalized === "user id") {
                            return "user_id";
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

        const emails = users.map(u => u.email);
        const userIDs = users.map(u => u.user_id);

        const existingUsers = await userModel.find({
            $or: [
                { email: { $in: emails } },
                { user_id: { $in: userIDs } }
            ]
        });

        const existingEmailSet = new Set(existingUsers.map(u => u.email));
        const existingUsernameSet = new Set(existingUsers.map(u => u.user_id));

        const bulkOps = [];
        const skipped = [];
        const errors = [];

        for (let i = 0; i < users.length; i++) {
            const user = users[i];

            try {
                if (!user.name || !user.email || !user.user_id || !user.password) {
                    errors.push({ row: i + 1, reason: "Missing required fields" });
                    continue;
                }

                if (existingEmailSet.has(user.email) || existingUsernameSet.has(user.user_id)) {
                    skipped.push({ row: i + 1, email: user.email });
                    continue;
                }

                const hashedPassword = await bcrypt.hash(user.password, 10);

                bulkOps.push({
                    insertOne: {
                        document: {
                            name: user.name,
                            user_id: user.user_id,
                            email: user.email,
                            password: hashedPassword,
                            profilePic: ""
                        }
                    }
                });

            } catch (err) {
                errors.push({ row: i + 1, reason: err.message });
            }
        }

        if (bulkOps.length) {
            await userModel.bulkWrite(bulkOps);
        }

        fs.unlinkSync(req.file.path);

        return res.status(200).json({
            message: "Users import completed",
            inserted: bulkOps.length,
            skipped: skipped.length,
            errors: errors.length,
            skippedDetails: skipped,
            errorDetails: errors
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
