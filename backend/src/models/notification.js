import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        actor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        type: {
            type: String,
            enum: ["file_deleted", "file_restored", "file_shared", "folder_deleted"],
            required: true
        },
        message: {
            type: String,
            required: true
        },
        metadata: {
            itemId: mongoose.Schema.Types.ObjectId,
            itemName: String,
            itemType: String,
            parentId: mongoose.Schema.Types.ObjectId,
            profilePic: String
        },
        isRead: {
            type: Boolean,
            default: false
        }
    },
    { versionKey: false, timestamps: true }
);

const notification = mongoose.model("Notification", notificationSchema, "notifications");


export default notification