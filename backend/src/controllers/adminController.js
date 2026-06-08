import bcrypt from "bcryptjs";

//  model - schamea
import userModel from "#models/userModel"

//  utils - helper
import { logger } from "#utils/logger"




// ----------------------------- CREATE USER  ----------------------------------
export const createUser = async (req, res) => {
    try {

        // #################################################
        // ---- STEP 1: Extract inputs -------------
        // ###############################################
        let { user_id, name, email, password, role, isActive } = req.body;


        // ##################################################
        //  --- STEP - 2 : Validation
        // #################################################

        // 1) All fields are required - validation
        if (!user_id || !name || !email || !password) {
            return res.status(400).json({ success: false, message: "Fields are required" })
        }

        //  2) Normalize the fields 
        name = name.trim()
        user_id = user_id.trim()
        const normalizedEmail = email.trim().toLowerCase()


        //  3) Email validation email must contains @ - domain - . - extension
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({ success: false, message: "Email is invalid" })
        }


        // 4) validation for password - password must contains one upper case one special charcter and must 8 char long
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
            isActive: isActive !== undefined ? isActive : true,
            profilePic
        })

        // Dont send password to front end
        newUser.password = undefined


        // ##################################################
        //  --- STEP - 7 : Send response
        // #################################################
        res.status(201).json({ success: true, newUser })

    } catch (error) {
        logger.error(error)
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

        // here getting all paramter from query to search
        const requestedPage = parseInt(req.query.page) || 1        // if page is defined otherwise first page 
        const requestedLimit = parseInt(req.query.limit) || 25     // if user imit is defined otherwise 25 user per page
        const searchQuery = req.query.search?.trim() || ""         // if search query other wise all users
        const roleFilter = req.query.role || ""                   // if user want to sort by role - admin or user
        const isActiveFilter = req.query.isActive                 // sort by active or deactive users


        // ##################################################
        // ---- STEP 2: Build filter object -----------------
        // ##################################################
        const filter = {}

        // 1) search by - name, email, user_id
        if (searchQuery) {
            filter.$or = [
                { name: { $regex: searchQuery, $options: "i" } },    // name search - i case in senstive matching
                { email: { $regex: searchQuery, $options: "i" } },
                { user_id: { $regex: searchQuery, $options: "i" } }
            ]
        }


        //  2) filter by role
        if (roleFilter) {
            filter.role = roleFilter
        }

        //  3) filter by user active status
        if (isActiveFilter !== undefined && isActiveFilter !== "") {
            filter.isActive = isActiveFilter === "true"
        }


        // ##################################################
        // ---- STEP 3: Pagination --------------------------
        // ##################################################
        const skip = (requestedPage - 1) * requestedLimit     // how many ecord to skip for curent page
        const total = await userModel.countDocuments(filter)    // count how many user is matched filter
        const totalPages = Math.ceil(total / requestedLimit)    // for all users how many pages we will need



        // ##################################################
        // ---- STEP 4: Fetch users -------------------------
        // ##################################################
        const users = await userModel.find(filter)
            .select("-password")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(requestedLimit)
            .lean()     // lean return palin js object 



        // ##################################################
        // ---- STEP 5: Send response -----------------------
        // ##################################################

        res.status(200).json({
            success: true,
            users,
            pagination: {
                total,
                requestedPage,
                requestedLimit,
                totalPages,
                hasMore: requestedPage  < totalPages
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
        let { name, email, user_id, role, isActive, password } = req.body;
        const { userUpdateId } = req.params;


        // ##################################################
        //  --- STEP - 2 : Validation of existing user
        // #################################################

        // 1) check if userId is in database or not 
        const existingUser = await userModel.findById(userUpdateId)
        if (!existingUser) {
            return res.status(404).json({ success: false, message: "No user found" })
        }


        // ####################################################################
        //  --- STEP - 3 : Getting fields that are not empty and validation 
        // ####################################################################

        //  name trim here
        if(name) name =  name.trim()

        // 1) create one empty object 
        const updateFields = {}
        const allowedFields = ["name", "role", "isActive"]
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
                _id: { $ne: userUpdateId }
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
                _id: { $ne: userUpdateId }
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
        const updatedUser = await userModel.findByIdAndUpdate(userUpdateId, updateFields, { new: true }).select("-password")

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







// ----------------------------- DEACTIVE USER ------------------------------
export const updateUserStatus = async (req, res) => {
    try {
        
        // #################################################
        // ---- STEP 1: Extract inputs -------------
        // ###############################################
        const { userId } = req.params;


        // #################################################
        // ---- STEP 2: Check user id exist in DB -------------
        // ###############################################
        const existingUser = await userModel.findById(userId)
        if(!userId){
            return res.status(404).json({ success: false, message: "No user found" })
        }


        // #################################################
        // ---- STEP 3: Update isAcive  field -------------
        // ###############################################
        existingUser.isActive = !existingUser.isActive
        await existingUser.save()
        existingUser.password = undefined


        // #################################################
        // ---- STEP 3: return resposne -------------
        // ###############################################
        res.status(200).json({ success: true, user: existingUser })

    } catch (error) {
        logger.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}
// ----------------------------- DEACTIVE USER END --------------------------