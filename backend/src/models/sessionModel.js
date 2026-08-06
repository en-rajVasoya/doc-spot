import mongoose from "mongoose"

const sessionSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",   
        required: true
    },

    refresh_token: {
        type: String,
        required: true
    },

    device_label: {
        type: String,
        default: null
    },
    last_active_at:{
        type: Date,
        default: Date.now
    }
}, { timestamps: true })



sessionSchema.index({ user_id: 1 })
sessionSchema.index({ refresh_token: 1 })

const Session = mongoose.model("Session", sessionSchema)

export default Session