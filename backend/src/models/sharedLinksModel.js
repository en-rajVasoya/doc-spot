// models/User.js

import mongoose from "mongoose";

const sharedLinkSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
    },
    item_id: {
        type: mongoose.Schema.Types.ObjectId,
    },
    token: {
        type: String,
    },
    type: {
        type: String,
    },
    password: {
        type: String,
    },
    link: {
        type: String,
    },
    is_public: Boolean,
    permissions_users: Array,
    expire_date: {
        type: Date,
        default: null
    },
    is_expired: {
        type: Boolean,
        default: false
    }

}, { versionKey: false, timestamps: true });

const User = mongoose.model("sharedLinks", sharedLinkSchema, "shared_links");


export default User