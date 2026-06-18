// models/User.js

import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    user_id: {
        type: String,
        unique: true,
        trim: true,
    },
    name: {
        type: String,
        required: [true, "User name is required"]
    },

    email: {
        type: String,
        required: [true, "User Email is required"],
        unique: [true, "Email already exists"]
    },

    password: {
        type: String,
        required: [true, "User password is required"]
    },

    profilePic: {
        type: String, // store URL or path
    },

    //  here is the comprassed profile image for the resize here
    compressed_profile_pic: {
        type: String,
    },

    thumbnail_profile_pic: {
        type: String
    },

    //  for active user - admin can deactive user and active user here no need t delete user completely
    is_active: {
        type: Boolean,
        default: true
    },

    //  role based access - user - admin - superadmin
    role: {
        type: String,
        enum: ["user", "admin"],  // in future we can add super admin
        default: "user"
    },

    is_deleted: {
        type: Boolean,
        default: false
    },

}, { versionKey: false, timestamps: true });




//  indexing for faster query
userSchema.index({ name: "text", email: "text", user_id: "text" })



// sorting indexing
userSchema.index({ role: 1, is_active: 1, createdAt: -1 })


const User = mongoose.model("User", userSchema);


export default User