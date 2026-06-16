//  this file is used for cron job like every day one time checking like if trashed item 30day tme left or not if yes then auto delete this
import fs from "fs";
import cron from "node-cron";

import Upload from "#models/uploadModel";
import SharedLink from "#models/sharedLinksModel";

import { deleteForver } from "#controllers/trashController";

import { deleteItemPermanently } from '#utils/index';
import { logger } from "#utils/logger";

// cronjob to clear trash afte 30 days and run at midnight daily at 12 AM
export const startTrashCleanup = () => {
    cron.schedule("0 0 * * *", async () => {
        logger.info("[Trash cleanup] Starting at midnight...")
        try {
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

            const expiredItems = await Upload.find({
                isTrashed: true,
                trashedAt: { $lte: thirtyDaysAgo }
            }).select("_id type storagePath parent")

            if (expiredItems.length === 0) {
                logger.info("[TRASH CLEANUP] No expired items")
                return
            }

            logger.info(`[TRASH CLEANUP] Found ${expiredItems.length} expired items`)

            // Delete each item permanently (without Express req/res)
            for (const item of expiredItems) {
                try {
                    await deleteItemPermanently(item)
                    logger.info(`[Trash cleanup] Item deleted: ${item._id}`)
                } catch (error) {
                    logger.error(`[TRASH CLEANUP] Failed to delete ${item._id}: ${error.message}`)
                }
            }

            logger.info(`[TRASH CLEANUP] Done — deleted ${expiredItems.length} items`)
        } catch (error) {
            logger.error("[TRASH CLEANUP] Error:", error.message)
        }
    })
}

// cronjob to expired the shared link and runs on evry 5 minutes
export const startExpiredLinksCleanup = () => {
    // runs every hour to check expired links
    cron.schedule("0 * * * *", async () => {
        logger.info("[LINK CLEANUP] Starting expired links check...")
        try {
            const now = new Date()

            const result = await SharedLink.updateMany(
                {
                    is_expired: false,
                    expire_date: { $lte: now }  // expire_date has passed
                },
                {
                    $set: { is_expired: true }
                }
            )

            if (result.modifiedCount === 0) {
                logger.info("[LINK CLEANUP] No expired links found")
                return
            }

            logger.info(`[LINK CLEANUP] Done — marked ${result.modifiedCount} links as expired`)

        } catch (error) {
            logger.error("[LINK CLEANUP] Error:", error.message)
        }
    })
}