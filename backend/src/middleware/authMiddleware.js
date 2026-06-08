import { V3 } from "paseto"
import { createSecretKey } from "crypto"
import User from "../models/userModel.js"

const getKey = () => {
    return createSecretKey(Buffer.from(process.env.PASETO_SECRET_KEY, "hex"))
}

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies.token
        if (!token) {
            return res.status(401).json({ message: "Not authorized, please login" })
        }

        const payload = await V3.decrypt(token, getKey())

        if (payload.exp && new Date(payload.exp) < new Date()) {
            return res.status(401).json({ message: "Token expired, please login again" })
        }

        req.user = await User.findById(payload.id).select("-password")
        if (!req.user) {
            return res.status(401).json({ message: "User no longer exists" })
        }


        //  her instant logged out here when admin deactive the user
        if(!req.user.isActive){
            return res.status(401).json({ message: "Your account has been deactivated"  })
        }

        next()

    } catch (error) {
        console.log("Auth error:", error.message)
        res.status(401).json({ message: "Token failed" })
    }
}

export default authMiddleware