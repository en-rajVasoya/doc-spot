import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL)
        console.log("mongoDB connected")
    } catch (error) {
        console.log(error.message)
    }
}


export default connectDB