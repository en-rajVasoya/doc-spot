import fs from "fs";
import csv from "csv-parser";
import bcrypt from "bcryptjs";
import { Validator } from "node-input-validator";

//  model - schamea
import userModel from "#models/userModel"

//  utils - helper
import { logger } from "#utils/logger"
import { searchOptimize } from "#utils/index"

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
        // ##################################################\
        let { page, limit, search, role = "user", is_active } = req.query;

        // ##################################################
        // ---- STEP 2: Build filter object -----------------
        // ##################################################
        const filters = [{ $match: { is_deleted: false } }];

        // 1) Search by name, email, user_id
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

        // 2) Filter by role
        if (role) {
            filters.push({ role });
        }

        // 3) Filter by active status
        if (is_active !== undefined && is_active !== "") {
            filters.push({
                is_active: is_active === "true"
            });
        }

        // Final query
        const query = filters.length ? { $and: filters } : {};

        const skip = (page - 1) * limit;

        const total = await userModel.countDocuments(query);

        const totalPages = Math.ceil(total / limit);

        // ##################################################
        // ---- STEP 4: Fetch users -------------------------
        // ##################################################
        const users = await userModel.find(query)
            .select("-password")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean()     // lean return palin js object 

        // ##################################################
        // ---- STEP 5: Send response -----------------------
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
        })

    } catch (error) {
        logger.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// ----------------------------- GET USERS ALSO WITH SEARCH END ----------------

// ----------------------------- UPDATE USER ----------------------------------
export const updateUser = async (req, res) => {
    try {
        // ##################################################
        // ---- STEP 1: Getting input parament ----------------
        // ##################################################
        let { name, email, user_id, role, is_active, password } = req.body;
        const { update_user_id } = req.params;

        // ##################################################
        //  --- STEP - 2 : Validation of existing user
        // #################################################

        // 1) check if userId is in database or not 
        const existingUser = await userModel.findById(update_user_id)
        if (!existingUser) {
            return res.status(404).json({ success: false, message: "No user found" })
        }

        // ####################################################################
        //  --- STEP - 3 : Getting fields that are not empty and validation 
        // ####################################################################

        //  name trim here
        if (name) name = name.trim()

        // 1) create one empty object 
        const updateFields = {}
        const allowedFields = ["name", "role", "is_active"]
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateFields[field] = req.body[field]
            }
        });

        // 2) if email is there so validation email
        if (email) {
            const normalizedEmail = email.trim().toLowerCase()

            //  Email validation email must contains @ - domain - . - extension
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(normalizedEmail)) {
                return res.status(400).json({ success: false, message: "Email is invalid" })
            }

            //  check if email is already assign with other user email
            const emailExist = await userModel.findOne({
                email: normalizedEmail,
                _id: { $ne: update_user_id }
            })

            //  if email already exist so return
            if (emailExist) {
                return res.status(400).json({ success: false, message: "Email alread assigned with diffrent user" })
            }

            //  assign email to update field
            updateFields.email = normalizedEmail
        }

        // 3) user_id field validation
        if (user_id) {
            let trimmedUserId = user_id.trim()

            // check same user_id already assigned to diffren user or not 
            const existingUserId = await userModel.findOne({
                user_id: trimmedUserId,
                _id: { $ne: update_user_id }
            })

            //  if user id assiged to diffrent user id so return
            if (existingUserId) {
                return res.status(400).json({ success: false, message: "User id alread assigned with diffrent user" })
            }

            //  set user_id to update field
            updateFields.user_id = trimmedUserId
        }

        // 4) if pasword is there so hash it
        if (password) {
            // validation for password - password must contains one upper case one special charcter and must 8 char long
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
            if (!passwordRegex.test(password)) {
                return res.status(400).json({ success: false, message: "Password must be 8 characters, one uppercase and one special symbol" })
            }

            //  hashed password
            const hashedPassword = await bcrypt.hash(password, 10)
            updateFields.password = hashedPassword
        }

        // ##################################################
        //  --- STEP - 4 : Updating the profile pic
        // #################################################
        if (req.file) {
            const profilePic = `/uploadimage/profilepic/${req.file.filename}`

            //  assigning profile pic to the updated field
            updateFields.profilePic = profilePic
        }

        // ##################################################
        //  --- STEP - 5 : Updating the data base
        // #################################################
        const updatedUser = await userModel.findByIdAndUpdate(update_user_id, updateFields, { new: true }).select("-password")

        // ##################################################
        //  --- STEP - 5 : send response
        // #################################################

        res.status(200).json({ success: true, user: updatedUser })
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
            console.log("423 -->", user);
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
