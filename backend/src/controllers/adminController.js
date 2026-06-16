import fs from "fs";
import csv from "csv-parser";
import bcrypt from "bcryptjs";
import { Validator } from "node-input-validator";

//  model - schamea
import userModel from "#models/userModel"

//  utils - helper
import { logger } from "#utils/logger"
import { searchOptimize } from "#utils/index"
import { processProfileImage } from "#utils/imageProcessor";

// ----------------------------- CREATE USER  ----------------------------------
export const createUser = async (req, res) => {
    try {

        // #################################################
        // ---- STEP 1: Extract inputs -------------
        // ###############################################
        let { user_id, name, email, password, role, is_active } = req.body;

        // ##################################################
        //  --- STEP - 2 : Validation
        // #################################################
        const validations = new Validator(req.body, {
            user_id: "required|string",
            name: "required|string",
            email: "required|email",
            password: "required|minLength:8",
            role: "in:admin,user",
            is_active: "boolean"
        });

        const matched = await validations.check();

        if (!matched) {
            const errors = Object.fromEntries(Object.entries(validations.errors).map(([field, error]) => [field, error.message]));
            return res.status(400).json({ success: false, errors });
        }

        // Normalize the fields 
        name = name.trim()
        user_id = user_id.trim()

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

        // ##################################################
        //  --- STEP - 4 : ProfilePic - uploading
        // #################################################
        //  if in request profilePic is there other wise default profile pic
        const profilePic = req.file
            ? `/uploadimage/profilepic/${req.file.filename}`
            : "/uploadimage/profilepic/u2.jpg"

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
            role: role || "user",   // if not specified role so default - User
            is_active: is_active !== undefined ? is_active : true,
            profilePic
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

        // ##################################################
        // ---- STEP 5: Fetch users -------------------------
        // ##################################################

        const users = await userModel.find(query)
            .select("-password")
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
        const { name, email, user_id, password, is_active, update_user_id } = req.body;

        const userData = await userModel.findById(update_user_id);

        if (!userData) {
            return res.status(404).json({ message: "User not found" });
        }

        // ==============================
        // USERNAME CHECK
        // ==============================
        if (user_id && user_id !== userData.user_id) {
            const exists = await userModel.findOne({ user_id });

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

        if (is_active) {
            userData.is_active = is_active;
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
        const { user_ids } = req.body; // array of IDs from body, not params

        if (!Array.isArray(user_ids) || user_ids.length === 0) {
            return res.status(400).json({ success: false, message: "user_ids must be a non-empty array" });
        }

        const result = await userModel.updateMany(
            { _id: { $in: user_ids }, is_deleted: false },
            { $set: { is_deleted: true } }
        );

        if (result.matchedCount === 0) {
            return res.status(400).json({ success: false, message: "No active users found" });
        }

        res.status(200).json({
            success: true,
            message: `${result.modifiedCount} user(s) deleted successfully`,
        });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

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
