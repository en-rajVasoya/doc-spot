import { V3 } from "paseto"
import { createSecretKey } from "crypto"

const getKey = () => {
    return createSecretKey(Buffer.from(process.env.PASETO_SECRET_KEY, "hex"))
}

export const generateToken = async (userId, expiresInMs, isRefresh = false) => {
    const exp = new Date(Date.now() + expiresInMs)
    const payload = { id: userId.toString(), exp: exp.toISOString() }

    // Only add this if it is a refresh token
    if (isRefresh) {
        payload.type = "refresh"
    }

    const token = await V3.encrypt(payload, getKey())
    return token
}