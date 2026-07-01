import express from "express"
import path from "path"
import fs from "fs"
import { V3 } from "paseto"
import { createSecretKey } from "crypto"


//  models 
import userModel from "#models/userModel"


const servingFileRouter = express.Router()

const DEV_REFERERS = [
    "http://localhost:5177",
    "https://localhost:5177",
    "http://192.168.1.19:5177",
    "https://192.168.1.19:5177",
    "http://192.168.1.35:5177",
    "https://192.168.1.35:5177",
    "http://192.168.1.112:5177",
    "https://192.168.1.112:5177",
    "https://192.168.1.213:5177",
]


const isFromApp = (referer, origin) => {
    const isDev = process.env.NODE_ENV !== "production"
    const PRODUCTION_DOMAIN = process.env.ALLOWED_DOMAIN?.replace(/"/g, "")
    if (isDev) {
        return DEV_REFERERS.some(r => referer.startsWith(r) || origin === r)
    } else {
        return origin.endsWith(`.${PRODUCTION_DOMAIN}`) ||
            origin === `https://${PRODUCTION_DOMAIN}` ||
            referer.startsWith(`https://${PRODUCTION_DOMAIN}`) ||
            referer.startsWith(`https://*.${PRODUCTION_DOMAIN}`)
    }
}


const getKey = () => {
    return createSecretKey(Buffer.from(process.env.PASETO_SECRET_KEY, "hex"))
}


const getAccessDeniedHTML = (message) => `
<html>
<body style="font-family:sans-serif;text-align:center;padding:50px">
<h2 style="color:#d9534f">Access Denied</h2>
<p>${message}</p>
</body>
</html>
`

servingFileRouter.get("/*splat", async (req, res) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin")

    try {
        const referer = req.headers.referer || req.headers.referrer || ""
        const origin = req.headers.origin || ""

        //  immediate serve file if request  form the inside of front end
        if (isFromApp(referer, origin)) {
            return serveFile(req, res)
        }

        //  if some user open the direct link in the borwser if cookie is set then only give
        const token = req.cookies?.auth_token
        if (!token) {
            return res.status(401).send(getAccessDeniedHTML("Access Denied"))
        }

        //  decode token adn verify that is this user actuly in our database or not 
        let decoded
        try {
            decoded = await V3.decrypt(token, getKey())
        } catch (error) {
            return res.status(401).send(getAccessDeniedHTML("Access Denied"))
        }

        const user = await userModel.findById(decoded.id)
        if(!user || !user.is_active || user.is_deleted){
            return res.status(401).send(getAccessDeniedHTML("Access Denied"))
        }
        
        return serveFile(req, res)

    } catch (error) {
        console.error("Uploads router error:", error)
        return res.status(500).send(getAccessDeniedHTML("Internal Server Error occurred while trying to view this file."))
    }
})



function serveFile(req, res) {
    const filesDir = path.resolve("files")
    const resolvedPath = path.resolve(filesDir, req.path.slice(1))
    // Protection against directory traversal attacks
    if (!resolvedPath.startsWith(filesDir)) {
        return res.status(403).send("Forbidden")
    }
    if (!fs.existsSync(resolvedPath)) {
        return res.status(404).send("File Not Found")
    }
    res.sendFile(resolvedPath)
}


export default servingFileRouter