import { V3 } from "paseto"
import { createSecretKey } from "crypto"

const getKey = () => {
    return createSecretKey(Buffer.from(process.env.PASETO_SECRET_KEY, "hex"))
}

export const generateToken = async (userId, remember) => {
    const now = new Date()
    const exp = new Date(now)

    if (remember) {
        exp.setDate(exp.getDate() + 7)
    } else {
        exp.setDate(exp.getDate() + 1)
    }

    const token = await V3.encrypt(
        { id: userId.toString(), exp: exp.toISOString() },
        getKey()
    )
    return token
}