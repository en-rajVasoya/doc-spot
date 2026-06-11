import { V3 } from "paseto"
import { createSecretKey } from "crypto"

const getKey = () => {
    return createSecretKey(Buffer.from(process.env.PASETO_SECRET_KEY, "hex"))
}

export const optionalAuth = async(req, res, next) => {
    try {
        const token = req.cookies.token
        if (token) {
            const payload = await V3.decrypt(token, getKey())

            if (payload.exp && new Date(payload.exp) < new Date()) {
                return res.status(401).json({ message: "Token expired, please login again" })
            }

            req.user = payload.id;
        }


    } catch (_) {
        // no valid token, just continue
    }
    next();
};