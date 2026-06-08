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
        unique: true
    },

    password: {
        type: String,
        required: [true, "User password is required"]
    },

    profilePic: {
        type: String, // store URL or path
        default: "/uploadimage/profilepic/u2.jpg"
    },

    //  for active user - admin can deactive user and active user here no need t delete user completely
    isActive:{
        type: Boolean,
        default: true
    },

    //  role based access - user - admin - superadmin
    role: {
        type: String,
        enum: ["user", "admin"],  // in future we can add super admin
        default: "user"
    }

}, { timestamps: true });




//  indexing for faster query
userSchema.index({ name: "text", email: "text", user_id: "text" })



// sorting indexing
userSchema.index({ role: 1, isActive: 1, createdAt: -1 })


const User =  mongoose.model("User", userSchema);


export default User