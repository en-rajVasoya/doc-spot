import { V3 } from "paseto"
import { createSecretKey } from "crypto"

const getKey = () => {
    return createSecretKey(Buffer.from(process.env.PASETO_SECRET_KEY, "hex"))
}

const optionalAuth = async (req, res, next) => {
    const hasShareToken = Boolean(req.query.token || req.body?.token)

    try {
        let token = req.cookies.doc_auth_token || req.cookies.auth_token
        if (!token && req.headers.authorization?.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1]
        }

        if (token) {
            const payload = await V3.decrypt(token, getKey())
            req.user = { _id: payload.id }
            return next()
        }
    } catch (err) {
        // Bad or expired cookie - ignore and fall through below
    }

    // 1. If public share link, allow guest through
    if (hasShareToken) return next()

    // 2. If private download with missing/expired cookie, return 401 to trigger refresh!
    return res.status(401).json({ message: "Please refresh token or login" })
}

export default optionalAuth
