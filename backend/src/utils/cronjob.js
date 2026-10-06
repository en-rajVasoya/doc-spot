//  this file is used for cron job like every day one time checking like if trashed item 30day tme left or not if yes then auto delete this
import fs from "fs";
import cron from "node-cron";

import Upload from "#models/uploadModel";
import SharedLink from "#models/sharedLinksModel";
import notificationModel from "#models/notification";

import { deleteForver } from "#controllers/trashController";

import { deleteItemPermanently } from '#utils/index';
import { logger } from "#utils/logger";
import { emitToUser } from "../socket.js";

// cronjob to clear trash afte 30 days and run at midnight daily at 12 AM
export const startTrashCleanup = (emitToUser) => {

    cron.schedule("0 0 * * *", async () => {
        logger.info("[Trash cleanup] Starting daily check...")
        try {
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

            const expiredItems = await Upload.find({
                isTrashed: true,
                trashedAt: { $lte: thirtyDaysAgo }
            }).select("_id type storagePath parent owner")

            if (expiredItems.length === 0) {
                logger.info("[TRASH CLEANUP] No expired items")
                return
            }

            logger.info(`[TRASH CLEANUP] Found ${expiredItems.length} expired items`)

            // Collect all IDs including nested children of expired folders
            const allItemIds = [];

            for (const item of expiredItems) {
                allItemIds.push(item._id);

                if (item.type === "folder") {
                    let parentIds = [item._id];
                    while (parentIds.length > 0) {
                        const children = await Upload.find({
                            parent: { $in: parentIds }
                        }).select("_id type").lean();

                        for (const child of children) {
                            allItemIds.push(child._id);
                        }

                        parentIds = children
                            .filter(c => c.type === "folder")
                            .map(c => c._id);
                    }
                }
            }

            // Find notifications for all expired items, emit removal, then delete
            const notifsToDelete = await notificationModel.find({
                type: { $in: ["file_deleted", "folder_deleted"] },
                "metadata.itemId": { $in: allItemIds }
            }).lean();

            if (notifsToDelete.length > 0) {
                // Group by recipient
                const recipientMap = new Map();
                notifsToDelete.forEach(n => {
                    const rid = n.recipient.toString();
                    if (!recipientMap.has(rid)) recipientMap.set(rid, []);
                    recipientMap.get(rid).push(n._id);
                });

                await notificationModel.deleteMany({
                    _id: { $in: notifsToDelete.map(n => n._id) }
                });

                // Emit to each recipient so their UI clears instantly
                recipientMap.forEach((notifIds, recipientId) => {
                    emitToUser(recipientId, "notifications_removed", { ids: notifIds });
                });

                logger.info(`[TRASH CLEANUP] Removed ${notifsToDelete.length} notifications`)
            }

            // Delete each item permanently and notify the owner live via Socket
            const allItemIdsStr = allItemIds.map(id => String(id));

            for (const item of expiredItems) {
                try {
                    await deleteItemPermanently(item)

                    if (item.owner) {
                        const ownerIdStr = item.owner.toString();
                        console.log(`[Trash cleanup] Emitting item_deleted_forever to owner ${ownerIdStr} for item ${item._id}`);
                        emitToUser(ownerIdStr, "item_deleted_forever", {
                            itemId: item._id.toString(),
                            itemIds: allItemIdsStr
                        });
                    }

                    logger.info(`[Trash cleanup] Item deleted: ${item._id}`)
                } catch (error) {
                    console.error(`[TRASH CLEANUP] Error deleting item ${item._id}:`, error);
                    logger.error(`[TRASH CLEANUP] Failed to delete ${item._id}: ${error.message}`)
                }
            }

            logger.info(`[TRASH CLEANUP] Done — deleted ${expiredItems.length} items`)
        } catch (error) {
            console.error("[TRASH CLEANUP] Global error:", error);
            logger.error("[TRASH CLEANUP] Error:", error)
        }
    })
}

// cronjob to expire shared links — runs every 1 minute
export const startExpiredLinksCleanup = (emitToUser) => {
    console.log("[LINK CLEANUP] Cron initialized — will run every 1 minute (* * * * *)");
    logger.info("[LINK CLEANUP] Cron initialized — will run every 1 minute (* * * * *)");

    // runs every 1 minute to check expired links
    cron.schedule("* * * * *", async () => {
        const timestamp = new Date().toLocaleTimeString();
        logger.info(`[LINK CLEANUP] [${timestamp}] Running 1-minute check for expired links...`);

        try {
            const now = new Date()

            // 1) find the links about to expire BEFORE updating them,
            // so we know which user_id/item_id each one belongs to
            const linksToExpire = await SharedLink.find({
                is_expired: false,
                expire_date: { $ne: null, $lte: now }
            })

            if (linksToExpire.length === 0) {
                logger.info("[LINK CLEANUP] No expired links found")
                return
            }

            console.log(`[LINK CLEANUP] [${timestamp}] Found ${linksToExpire.length} expired link(s) to expire`);

            const idsToExpire = linksToExpire.map(l => l._id)

            // 2) mark them all expired in one bulk update
            await SharedLink.updateMany(
                { _id: { $in: idsToExpire } },
                { $set: { is_expired: true } }
            )

            logger.info(`[LINK CLEANUP] Done — marked ${linksToExpire.length} links as expired`)

            // 3) send a notification to each link's owner
            for (const link of linksToExpire) {
                try {
                    if (!link.user_id) continue
                    const item = await Upload.findById(link.item_id).select("name type").lean()
                    if (!item) continue

                    const linkType = link.is_public ? "public link" : "shared link"
                    const notification = new notificationModel({
                        recipient: link.user_id,
                        actor: link.user_id,
                        type: "link_expired",
                        message: `The ${linkType} for your ${item.type} <b>"${item.name}"</b> has expired.`,
                        metadata: {
                            itemId: item._id,
                            itemName: item.name,
                            itemType: item.type,
                            expireDate: link.expire_date
                        }
                    })

                    await notification.save()

                    if (link.user_id) {
                        emitToUser(link.user_id.toString(), "new_notification", notification)
                    }
                } catch (innerError) {
                    logger.error(`[LINK CLEANUP] Failed to notify for link ${link._id}: ${innerError.message}`)
                }
            }

            logger.info(`[LINK CLEANUP] Sent ${linksToExpire.length} expiration notifications`)

        } catch (error) {
            logger.error("[LINK CLEANUP] Error:", error.message)
        }
    })
}
