import express from "express"
import authMiddleware from "#middleware/authMiddleware"
import optionalAuth from "#middleware/optionalAuth";
import { storeLinks, accessLink, verifyLinkPassword, getLinkInfo } from "#controllers/sharedLinks"

const sharedLinksRouter = express.Router()

//  search files and folder here
sharedLinksRouter.get("/info", authMiddleware, getLinkInfo)
sharedLinksRouter.post("/store", authMiddleware, storeLinks)
sharedLinksRouter.get("/access", optionalAuth, accessLink);
sharedLinksRouter.post("/verify_password", optionalAuth, verifyLinkPassword);

export default sharedLinksRouter