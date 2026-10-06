import mongoose, { Mongoose } from "mongoose"

const uploadSchema = mongoose.Schema({

    //  file or folder name
    name: {
        type: String,
        required: true
    },

    //  type file or folder
    type: {
        type: String,
        enum: ["folder", "file"],
        required: true
    },

    //  file or folder structure
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Upload",
        default: null
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },

    //  file only fields - folder null
    fingerprint: {
        type: String,
        default: null
    },
    uploadId: {
        type: String,
        default: null
    },

    //  this is for the s3 uplado and s3_id
    s3_uplaod_id: {
        type: String,
        default: null
    },

    fileSize: {
        type: Number,
        default: null
    },

    // total nested size specifically for folders (prevents double-counting in storage quotas)
    totalSize: {
        type: Number,
        default: 0
    },
    fileType: {
        type: String,
        default: null
    },
    storagePath: {
        type: String,
        default: null
    },

    //  total number of chunks this file is divided into
    totalChunks: {
        type: Number,
        default: null
    },

    uploadStatus: {
        type: String,
        enum: ["uploading", "completed", "expired", null]
    },

    //  folder color - user can change folder color
    color: {
        type: String,
        default: "Red"
    },

    //  refCount for sharing and copy without disk duplication
    //  when refCount hits 0 physical file is deleted
    refCount: {
        type: Number,
        default: 1
    },

    //  last upload activity - used for expiry cleanup of stuck uploads
    lastActivity: {
        type: Date,
        default: null
    },


    //  sharing field 
    //  shared with which users
    sharedWith: [
        {
            //  which user
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true
            },
            file_ids: Array,

            //  which permission to give editor = rename, upload, delete  viewer = only view and download
            permission: {
                type: String,
                enum: ["viewer", "editor"],
                required: true
            }
        }
    ],

    //  only flag for faster query 
    isShared: {
        type: Boolean,
        default: false
    },

    //  this is for the building here the ancestore array for every item
    ancestorIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Upload",
        default: []
    }],


    //  here when user delete any file or folder then it will go to the trash page
    isTrashed: {
        type: Boolean,
        default: false
    },

    //  for tracking when user trash item so we can delete after 30days
    trashedAt: {
        type: Date,
        default: null
    },

    //  this s for when some child trash directly 
    directly_trashed: {
        type: Boolean,
        default: false
    },

    replacesFileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Upload",
        default: null
    },

    // antivirus scan fields
    scanStatus: {
        type: String,
        enum: ["pending", "scanning", "clean", "infected", "failed", null],
        default: null
    },

    virusInfo: {
        type: String,
        default: null
    },

    sha256: {
        type: String,
        default: null
    },

}, { versionKey: false, timestamps: true })


//  indexing for faster queries
uploadSchema.index({ owner: 1, parent: 1 })
uploadSchema.index({ owner: 1, fingerprint: 1, parent: 1 })
uploadSchema.index({ owner: 1, uploadStatus: 1 })
uploadSchema.index({ uploadId: 1 })

//  shared 
uploadSchema.index({ "sharedWith.userId": 1, parent: 1 })
uploadSchema.index({ owner: 1, isShared: 1 })


//  trashed faster wuery here
uploadSchema.index({ owner: 1, isTrashed: 1 })
uploadSchema.index({ trashedAt: 1, isTrashed: 1 })
uploadSchema.index({ owner: 1, isTrashed: 1, directly_trashed: 1 })


uploadSchema.index({ sha256: 1 })
uploadSchema.index({ scanStatus: 1 })


//  search faster here 
uploadSchema.index({ parent: 1, type: 1, isTrashed: 1 })
uploadSchema.index({ "sharedWith.userId": 1, type: 1, isTrashed: 1 })

// new added for testing
uploadSchema.index({ owner: 1, isTrashed: 1, type: 1 })
uploadSchema.index({ name: "text" })
uploadSchema.index({ "sharedWith.userId": 1 })
uploadSchema.index({ parent: 1 })
uploadSchema.index({ createdAt: -1 })
uploadSchema.index({ fileType: 1 })
uploadSchema.index({ ancestorIds: 1 })
uploadSchema.index(
    { name: 1 },
    { collation: { locale: "en", strength: 2 } }
)
const Upload = mongoose.model("Upload", uploadSchema)

export default Upload