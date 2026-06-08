import mongoose from "mongoose";



const chunkSchema = new mongoose.Schema({
    uploadId: {
        type: String,
        required: true
    },
    chunkIndex: {
        type: Number,
        required: true
    }
}, { timestamps: true })




//  indexing here for fatser wuery
chunkSchema.index({ uploadId: 1, chunkIndex: 1 }, {unique: true})
chunkSchema.index({ uploadId: 1 })


const Chunk = mongoose.model("Chunk", chunkSchema)

export default Chunk