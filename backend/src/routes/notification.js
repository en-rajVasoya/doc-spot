import express from "express";
import {
    getNotifications,
    markAllNotificationsRead,
    markNotificationRead
} from "#controllers/notification";

import authMiddleware from "#middleware/authMiddleware";

const router = express.Router();

router.get("/", authMiddleware, getNotifications);

router.post("/read_all", authMiddleware, markAllNotificationsRead);

router.put("/:id/read", authMiddleware, markNotificationRead);

export default router;