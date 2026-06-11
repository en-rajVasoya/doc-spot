import express from "express"
import authMiddleware from "#middleware/authMiddleware"
import { optionalAuth } from "#middleware/optionalAuth";
import { storeLinks, accessLink } from "#controllers/sharedLinks"

const sharedLinksRouter = express.Router()

//  search files and folder here
sharedLinksRouter.post("/store", authMiddleware, storeLinks)
sharedLinksRouter.get("/access", optionalAuth, accessLink);

export default sharedLinksRouter