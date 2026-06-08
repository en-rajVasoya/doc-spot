import express from "express";
import {
  shareItem,
  unshareItem,
  getSharedUsers,
  searchUsers,
  checkPermission
} from "../controllers/shareController.js";
import { getUserPermission } from "#utils/userPermissionUtil";
import authMiddleware from "../middleware/authMiddleware.js"



const shareRouter = express.Router();

/* ─────────────── SHARE / UNSHARE ROUTES ─────────────── */

// Share item — only owner
shareRouter.post("/share", authMiddleware, shareItem);

// Unshare item — only owner
shareRouter.delete("/unshare", authMiddleware, unshareItem);

// Search users to share with — any logged-in user
shareRouter.get("/share/search", authMiddleware, searchUsers);

// Get all users who have access to an item — only owner
shareRouter.get("/share/:itemId", authMiddleware, getSharedUsers);



export default shareRouter;