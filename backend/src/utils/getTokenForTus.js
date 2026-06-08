import jwt from "jsonwebtoken"

// here we nned to use this because tus can not read the token from express req.user._id
function getUserIdFromReq(req) {
    try {
        //  first get cookies
        const cookieHeader = req.headers.get ? req.headers.get("cookie") : req.headers.cookie;
        if (!cookieHeader) {
            console.log("No cookie Found")
            return null;
        }


        //  now get token from cookie
        const token = cookieHeader
            .split(";")
            .find((c) => c.trim().startsWith("token="))
            ?.split("=")[1];

        if (!token) {
            console.log("no token found in cookies")
            return null;
        }

        // now if token is there then decode that token
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        console.log("Authorized user is ", decoded.id)
        return decoded.id
    } catch (error) {
        console.log("Token jwt verifaction failed", error.message)
        return null
    }
}


export default getUserIdFromReq