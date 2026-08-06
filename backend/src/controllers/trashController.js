import fs from "fs"
import _ from "lodash";

//  models - schema
import uploadModel from "#models/uploadModel";
import notificationModel from "#models/notification";

//  utils
import { logger } from "#utils/logger";
import { getUserPermission } from "#utils/userPermissionUtil";
import { notifySharedUsers } from "#utils/userNotification";
import { getAbsolutePath } from "#utils/pathHelper";
import { updateFolderSizeTree } from "#utils/getFolderSizeHelper";


import { getStorage } from "../services/storageFactory.js";
import { getFileUrl, deleteFromS3 } from "#config/s3";



export const trashItem = async (req, res) => {
    try {
        let ids = req.body.ids || req.body.id;
        if (!Array.isArray(ids)) ids = [ids];

        const deletedBy = req.user._id;
        const bulkOps = [];
        const parentsToNotify = new Set();
        const notificationsToCreate = [];
        // key: ownerId, value: array of their items trashed by someone else
        const crossUserItemsMap = new Map();

        // set of all ids being trashed in this request
        const idsSet = new Set(ids.filter(Boolean).map(id => id.toString()));


        // walk up from an item's parent — if any ancestor is ALSO
        // being trashed in this same request, skip this item's own
        // size subtraction (the ancestor's total already covers it)
        const hasAncestorInBatch = async (item) => {
            let currentParentId = item.parent;
            while (currentParentId) {
                if (idsSet.has(currentParentId.toString())) {
                    return true;
                }

                const parentDoc = await uploadModel.findById(currentParentId).select("parent")
                if (!parentDoc) break
                currentParentId = parentDoc.parent;
            }

            return false;
        }


        for (const id of ids) {
            if (!id) continue;

            const permission = await getUserPermission(deletedBy, id);
            if (permission !== "owner" && permission !== "editor") {
                return res.status(403).json({ success: false, message: "Access denied" });
            }

            const item = await uploadModel
                .findOne({ _id: id, isTrashed: { $ne: true } })
                .populate("owner", "_id name profilePic");

            if (!item || item.isTrashed) continue;

            const itemOwnerId = item.owner._id
                ? item.owner._id.toString()
                : item.owner.toString();

            const isOwnFile = itemOwnerId === deletedBy.toString();

            // Always trash under the file's actual owner
            bulkOps.push({
                updateOne: {
                    filter: { _id: id },
                    update: { $set: { isTrashed: true, trashedAt: new Date() } }
                }
            });

            // Update parent folder size by subtracting the trashed item's size
            if (item.parent) {
                const ancestorAlsoTrashed = await hasAncestorInBatch(item);
                if (!ancestorAlsoTrashed) {
                    const sizeToTrash = item.type === "folder" ? (item.totalSize || 0) : (item.fileSize || 0);
                    if (sizeToTrash > 0) {
                        await updateFolderSizeTree(item.parent, -sizeToTrash);
                    }
                }
            }

            parentsToNotify.add(item.parent ? item.parent.toString() : "root");

            // If deleted by someone OTHER than file owner → notify the file owner
            if (!isOwnFile) {
                const actorName = req.user.name || "Someone";
                const message = `${_.startCase(actorName)} deleted your shared ${item.type} <b>${item.name}</b>`;


                notificationsToCreate.push({
                    recipient: itemOwnerId,
                    actor: deletedBy,
                    type: item.type === "folder" ? "folder_deleted" : "file_deleted",
                    message,
                    metadata: {
                        itemId: item._id,
                        itemName: item.name,
                        itemType: item.type,
                        parentId: item.parent,
                        profilePic: req.user.thumbnail_profile_pic || req.user.profilePic
                    }
                });

                if (!crossUserItemsMap.has(itemOwnerId)) {
                    crossUserItemsMap.set(itemOwnerId, []);
                }
                crossUserItemsMap.get(itemOwnerId).push({
                    itemId: item._id,
                    oldParent: item.parent,
                    message,
                    movedItem: {
                        ...item.toObject(),
                        isTrashed: true,
                        trashedAt: new Date(),
                        owner: {
                            _id: item.owner._id,
                            name: item.owner.name,
                            profilePic: item.owner.profilePic
                        },
                        storagePath: item.storagePath ? `/${item.storagePath}` : null
                    }
                });
            }

            // Walk nested children if folder
            // Walk nested children if folder
            if (item.type === "folder") {
                let parentIds = [item._id];

                while (parentIds.length > 0) {
                    const children = await uploadModel
                        .find({ parent: { $in: parentIds }, isTrashed: { $ne: true } })
                        .populate("owner", "_id name profilePic")
                        .lean();

                    const nextParentIds = [];

                    for (const child of children) {
                        const childOwnerId = child.owner._id
                            ? child.owner._id.toString()
                            : child.owner.toString();

                        bulkOps.push({
                            updateOne: {
                                filter: { _id: child._id },
                                update: { $set: { isTrashed: true, trashedAt: new Date() } }
                            }
                        });

                        if (child.type === "folder") nextParentIds.push(child._id);
                    }

                    parentIds = nextParentIds;
                }
            }
        }

        // Bulk write file updates
        if (bulkOps.length > 0) {
            await uploadModel.bulkWrite(bulkOps);
        }

        // Save all notifications to DB
        let savedNotifications = [];
        if (notificationsToCreate.length > 0) {
            savedNotifications = await notificationModel.insertMany(notificationsToCreate);
        }

        // Populate actor info for socket payload
        const populatedActor = {
            _id: req.user._id,
            name: req.user.name,
            profilePic: req.user.profilePic
        };

        // Emit item_trashed + new_notification to each affected file owner
        crossUserItemsMap.forEach((items, ownerId) => {
            items.forEach(({ itemId, oldParent, movedItem, message }) => {
                // Update the trash view
                req.emitToUser(ownerId, "item_trashed", {
                    itemId,
                    oldParent,
                    movedItem
                });
            });

            // Find and emit all notifications for this owner
            const ownerNotifs = savedNotifications.filter(
                n => n.recipient.toString() === ownerId
            );
            ownerNotifs.forEach(notif => {
                req.emitToUser(ownerId, "new_notification", {
                    _id: notif._id,
                    type: notif.type,
                    message: notif.message,
                    metadata: notif.metadata,
                    actor: populatedActor,
                    isRead: false,
                    createdAt: notif.createdAt
                });
            });
        });

        for (const pId of parentsToNotify) {
            const actualParentId = pId === "root" ? null : pId;
            await notifySharedUsers(
                actualParentId || ids[0],
                "item_trashed",
                { parentId: actualParentId, ids },
                req.emitToUser
            );
        }


        //  here when owner moved item  to trash so that shared item notification we will remove here from shared users
        const trashedNotification = await notificationModel.find({
            "metadata.itemId": { $in: ids },
            type: "file_shared"
        }).select("_id recipient")

        if (trashedNotification.length > 0) {
            const idsToDelete = trashedNotification.map(n => n._id)
            await notificationModel.deleteMany({ _id: { $in: idsToDelete } })

            const notificationByRecipient = new Map()
            trashedNotification.forEach(n => {
                const recipientId = n.recipient.toString()
                if (!notificationByRecipient.has(recipientId)) {
                    notificationByRecipient.set(recipientId, [])
                }
                notificationByRecipient.get(recipientId).push(n._id)
            })

            notificationByRecipient.forEach((notifyIds, recipientId) => {
                req.emitToUser(recipientId, "notifications_removed", { ids: notifyIds })
            })
        }

        res.json({ success: true });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

//  here when user restore item so it need to restore it to original location here
// export const restoreItem = async (req, res) => {
//     try {
//         const { id } = req.body;
//         const owner = req.user._id

//         const permission = await getUserPermission(owner, id)
//         if (permission !== "owner") {
//             return res.status(403).json({ success: false, message: "Access denied" })
//         }

//         const item = await uploadModel.findOne({ _id: id })
//         if (!item) {
//             return res.status(404).json({ success: false, message: "Item not found" });
//         }

//         // walk parent chain to check if item or any ancestor is trashed
//         let isEffectivelyTrashed = item.isTrashed;
//         let isParentEffectivelyTrashed = false;

//         if (item.parent) {
//             let curr = await uploadModel.findById(item.parent).select("isTrashed parent")
//             while (curr) {
//                 if (curr.isTrashed) {
//                     isParentEffectivelyTrashed = true;
//                     isEffectivelyTrashed = true;
//                     break
//                 }
//                 if (!curr.parent) break;
//                 curr = await uploadModel.findById(curr.parent).select("isTrashed parent")
//             }
//         }

//         if (!isEffectivelyTrashed) {
//             return res.status(400).json({ success: false, message: "Item is not in trash" })
//         }

//         if (item.parent) {
//             // Find parent without restricting to owner so shared folders are found
//             const parentFolder = await uploadModel.findOne({ _id: item.parent })

//             // Check if the user still has permission to see and edit the destination folder
//             const parentPermission = await getUserPermission(owner, item.parent)
//             const lostAccess = !parentPermission || !["owner", "editor"].includes(parentPermission)

//             // If parent is missing, trashed, or user lost access, send to root
//             if (!parentFolder || isParentEffectivelyTrashed || lostAccess) {
//                 await uploadModel.updateOne(
//                     { _id: id },
//                     { $set: { isTrashed: false, trashedAt: null, parent: null } }
//                 )
//                 await notifySharedUsers(id, "item_restored", { itemId: id, parentId: null }, req.emitToUser)
//                 return res.json({ success: true, restoredToRoot: true })
//             }
//         }

//         await uploadModel.updateOne(
//             { _id: id },
//             { $set: { isTrashed: false, trashedAt: null } }
//         )

//         if (item.type === "folder" && item.sharedWith?.length > 0) {
//             const fileIdsToRestore = item.sharedWith.flatMap(entry => entry.file_ids || []);

//             if (fileIdsToRestore.length > 0) {
//                 await uploadModel.updateMany(
//                     { _id: { $in: fileIdsToRestore }, parent: null },
//                     { $set: { parent: id } }
//                 )
//             }
//         }

//         await notifySharedUsers(id, "item_restored", { itemId: id, parentId: item.parent }, req.emitToUser)
//         res.json({ success: true, restoredToRoot: false });

//     } catch (error) {
//         logger.error(error);
//         res.status(500).json({ success: false, message: error.message });
//     }
// }

export const restoreItem = async (req, res) => {
    try {
        const { id } = req.body;
        const owner = req.user._id

        const permission = await getUserPermission(owner, id)
        if (permission !== "owner") {
            return res.status(403).json({ success: false, message: "Access denied" })
        }

        const item = await uploadModel.findOne({ _id: id })
        if (!item) {
            return res.status(404).json({ success: false, message: "Item not found" });
        }

        // walk parent chain to check if item or any ancestor is trashed
        let isEffectivelyTrashed = item.isTrashed;
        let isParentEffectivelyTrashed = false;

        if (item.parent) {
            let curr = await uploadModel.findById(item.parent).select("isTrashed parent")
            while (curr) {
                if (curr.isTrashed) {
                    isParentEffectivelyTrashed = true;
                    isEffectivelyTrashed = true;
                    break
                }
                if (!curr.parent) break;
                curr = await uploadModel.findById(curr.parent).select("isTrashed parent")
            }
        }

        if (!isEffectivelyTrashed) {
            return res.status(400).json({ success: false, message: "Item is not in trash" })
        }

        // Collect all item IDs to clean up notifications (item + nested children if folder)
        const itemIdsToClean = [item._id];

        // -------------------------------------------------------------
        //  --- here when we restore the folder so mark all nested child is trashed false
        // ---------------------------------------------------------------------
        if (item.type === "folder") {
            let currentLevelParentIds = [item._id];
            while (currentLevelParentIds.length > 0) {
                const nestedChildren = await uploadModel.find({
                    parent: { $in: currentLevelParentIds },
                    isTrashed: true
                }).select("_id type").lean();

                if (nestedChildren.length > 0) {
                    const nestedChildIds = nestedChildren.map(child => child._id);

                    // Collect for notification cleanup
                    itemIdsToClean.push(...nestedChildIds);

                    // Restore all children
                    await uploadModel.updateMany(
                        { _id: { $in: nestedChildIds } },
                        { $set: { isTrashed: false, trashedAt: null } }
                    );

                    currentLevelParentIds = nestedChildren
                        .filter(child => child.type === "folder")
                        .map(folder => folder._id);
                } else {
                    currentLevelParentIds = [];
                }
            }
        }

        // Helper: find notifications, emit removal to each recipient, then delete
        const deleteAndEmitNotifications = async () => {
            const notifsToDelete = await notificationModel.find({
                type: { $in: ["file_deleted", "folder_deleted"] },
                "metadata.itemId": { $in: itemIdsToClean }
            }).lean();

            if (notifsToDelete.length === 0) return;

            // Group notification IDs by recipient so we emit once per user
            const recipientMap = new Map();
            notifsToDelete.forEach(n => {
                const rid = n.recipient.toString();
                if (!recipientMap.has(rid)) recipientMap.set(rid, []);
                recipientMap.get(rid).push(n._id);
            });

            await notificationModel.deleteMany({
                _id: { $in: notifsToDelete.map(n => n._id) }
            });

            // Emit to each recipient so their UI removes the notifications instantly
            recipientMap.forEach((notifIds, recipientId) => {
                req.emitToUser(recipientId, "notifications_removed", { ids: notifIds });
            });
        };

        if (item.parent) {
            const parentFolder = await uploadModel.findOne({ _id: item.parent })
            const parentPermission = await getUserPermission(owner, item.parent)
            const lostAccess = !parentPermission || !["owner", "editor"].includes(parentPermission)

            if (!parentFolder || isParentEffectivelyTrashed || lostAccess) {
                await uploadModel.updateOne(
                    { _id: id },
                    { $set: { isTrashed: false, trashedAt: null, parent: null } }
                )

                await deleteAndEmitNotifications();

                await notifySharedUsers(id, "item_restored", { itemId: id, parentId: null }, req.emitToUser)
                return res.json({ success: true, restoredToRoot: true })
            }
        }

        await uploadModel.updateOne(
            { _id: id },
            { $set: { isTrashed: false, trashedAt: null } }
        )

        // Restore parent folder size by adding the item's size back
        if (item.parent) {
            const sizeToRestore = item.type === "folder" ? (item.totalSize || 0) : (item.fileSize || 0);
            if (sizeToRestore > 0) {
                await updateFolderSizeTree(item.parent, sizeToRestore);
            }
        }

        if (item.type === "folder" && item.sharedWith?.length > 0) {
            const fileIdsToRestore = item.sharedWith.flatMap(entry => entry.file_ids || []);
            if (fileIdsToRestore.length > 0) {
                await uploadModel.updateMany(
                    { _id: { $in: fileIdsToRestore }, parent: null },
                    { $set: { parent: id } }
                )
            }
        }

        await deleteAndEmitNotifications();

        await notifySharedUsers(id, "item_restored", { itemId: id, parentId: item.parent }, req.emitToUser)
        res.json({ success: true, restoredToRoot: false });

    } catch (error) {
        logger.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}

//  here in trash page get all trashed item here only root level here 
export const getTrashedItems = async (req, res) => {
    try {
        // ------------------------------------------
        // --- STEP - 1 - get user ID and parent folder from request
        // -----------------------------------------
        // userId: get the current logged in user
        const userId = req.user._id;
        // parent: get the folder id if user is inside a folder, otherwise null
        const parent = req.query.parent || null

        // ------------------------------------------
        // --- STEP - 2 - setup sorting parameters
        // -----------------------------------------
        // get sorting field (name, size, modified) from frontend
        const sortBy = req.query.sortBy || "modified"
        // get sort order (asc or desc) from frontend
        const sortOrder = req.query.sortOrder || "desc"
        // convert desc to -1 and asc to 1 for database sorting
        const order = sortOrder === "asc" ? 1 : -1

        // default sorting field in the database
        let sortField = "trashedAt"

        // map the frontend sorting string to actual database columns
        if (sortBy === "name") {
            sortField = "name"
        } else if (sortBy === "size") {
            sortField = "fileSize"
        } else if (sortBy === "modified") {
            sortField = "updatedAt"
        }

        // create the sort array: folders always first, then requested sort, then fallback to createdAt
        const sortArray = [
            ["type", -1],
            [sortField, order],
            ["createdAt", -1]
        ]

        // ------------------------------------------
        // --- STEP - 3 - helper function to fix file paths
        // -----------------------------------------
        // remove the base storage directory from the file path for frontend display
        const isS3 = process.env.STORAGE_PROVIDER === "s3";

        const fixPath = (item) => {
            if (!item.storagePath) return item;

            // --- CloudFront / S3 Full URL Logic (Commented out for Backend Proxy) ---
            // if (isS3) {
            //     return { ...item, storagePath: getFileUrl(item.storagePath) };
            // }
            // ------------------------------------------------------------------------

            return { ...item, storagePath: `/${item.storagePath}` };
        };

        // ------------------------------------------
        // --- STEP - 4 - fetch items if user is inside a trashed folder
        // -----------------------------------------
        if (parent) {
            // make sure the parent folder actually exists and belongs to the user
            const parentFolder = await uploadModel.findOne({ _id: parent, owner: userId })
            if (!parentFolder) {
                return res.status(404).json({ success: false, message: "Folder not found" });
            }

            // fetch all files and folders inside this parent folder
            const items = await uploadModel.find({
                parent,
                owner: userId,
                $or: [{ type: "folder" }, { type: "file", uploadStatus: "completed" }]
            })
                .select("name type fileSize totalSize fileType createdAt updatedAt parent color owner storagePath isTrashed trashedAt")
                .populate("owner", "_id name")
                .sort(sortArray)
                .collation({ locale: "en", strength: 2 }) // makes alphabetical sorting case-insensitive
                .lean()

            // return the items found inside the folder
            return res.json({
                success: true,
                items: items.map(fixPath),
                total: items.length
            });
        }

        // ------------------------------------------
        // --- STEP - 5 - fetch root level trashed items
        // -----------------------------------------

        // 1 ) so now here in trash item here we are doing also nested of fodler is trashed tru flag here 
        // so in getting trash item here i need ot make sure here that if fiitem parent is alsready in trash so dont show here
        const allTrashedItems = await uploadModel.find({
            owner: userId,
            isTrashed: true,
            $or: [{ type: "folder" }, { type: "file", uploadStatus: "completed" }]
        })
            .select("name type fileSize totalSize fileType createdAt updatedAt parent color owner storagePath isTrashed trashedAt")
            .populate("owner", "_id name")
            .sort(sortArray)
            .collation({ locale: "en", strength: 2 })
            .lean();

        // 2. Create a fast list (Set) of all trashed item IDs
        const trashIds = new Set(allTrashedItems.map(item => item._id.toString()))

        //  filter only keep item in the trash root if their parent is not in the trash here
        const rootItems = allTrashedItems.filter(item => {
            if (!item.parent) return true;
            if (!trashIds.has(item.parent.toString())) return true
            return false
        })

        return res.json({
            success: true,
            items: rootItems.map(fixPath),
            total: rootItems.length
        });


    } catch (error) {
        logger.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}


// ----------------------------- PERMANENTLY DELETE FROM TRASH ------------------------------
export const deleteForver = async (req, res) => {
    try {
        // Step 1: Read item IDs to delete from the request body
        let ids = req.body.ids || req.body.id;
        if (!Array.isArray(ids)) {
            ids = [ids];
        }
        const owner = req.user._id;

        // Phase 1: Check permissions and make sure items are actually in trash
        const itemsToProcess = [];
        for (const id of ids) {
            if (!id) continue;

            // Only the owner of the item can permanently delete it
            const permission = await getUserPermission(owner, id);
            if (permission !== "owner") {
                return res.status(403).json({ success: false, message: "Access denied" });
            }

            const item = await uploadModel.findOne({ _id: id });
            if (!item) {
                return res.status(404).json({ success: false, message: "Item not found" });
            }

            // Check if this item or its parent folder is marked as trashed
            let isItemTrashed = item.isTrashed;
            if (!isItemTrashed && item.parent) {
                let curr = await uploadModel.findById(item.parent).select("isTrashed parent");
                while (curr) {
                    if (curr.isTrashed) {
                        isItemTrashed = true;
                        break;
                    }
                    if (!curr.parent) break;
                    curr = await uploadModel.findById(curr.parent).select("isTrashed parent");
                }
            }

            if (!isItemTrashed) {
                return res.status(400).json({ success: false, message: "Item is not in trash" });
            }

            itemsToProcess.push(item);
        }

        // Phase 2: Collect all sub-files and sub-folders inside folders being deleted
        const allMetadataIdsToDelete = [];
        const filesToUnlink = [];

        for (const item of itemsToProcess) {
            // Send socket notification to shared users that item was deleted
            await notifySharedUsers(item.parent || item._id, "item_deleted", { itemId: item._id, parentId: item.parent }, req.emitToUser);

            allMetadataIdsToDelete.push(item._id);

            if (item.type === "file") {
                if (item.storagePath) {
                    filesToUnlink.push({ _id: item._id, storagePath: item.storagePath });
                }
            } else {
                // Folder: loop recursively to collect all nested child files and folders
                let parentIds = [item._id];
                while (parentIds.length > 0) {
                    const children = await uploadModel.find({
                        parent: { $in: parentIds }
                    }).select("_id type storagePath").lean();

                    for (const child of children) {
                        allMetadataIdsToDelete.push(child._id);
                        if (child.type === "file" && child.storagePath) {
                            filesToUnlink.push({ _id: child._id, storagePath: child.storagePath });
                        }
                    }

                    parentIds = children
                        .filter(c => c.type === "folder")
                        .map(c => c._id);
                }
            }
        }

        // Phase 3: Delete notifications linked to these deleted items
        const notifsToDelete = await notificationModel.find({
            type: { $in: ["file_deleted", "folder_deleted"] },
            "metadata.itemId": { $in: allMetadataIdsToDelete }
        }).lean();

        if (notifsToDelete.length > 0) {
            // Group notification IDs by recipient user
            const recipientMap = new Map();
            notifsToDelete.forEach(n => {
                const rid = n.recipient.toString();
                if (!recipientMap.has(rid)) recipientMap.set(rid, []);
                recipientMap.get(rid).push(n._id);
            });

            // Delete notifications from database
            await notificationModel.deleteMany({
                _id: { $in: notifsToDelete.map(n => n._id) }
            });

            // Tell connected users to remove those notifications from UI
            recipientMap.forEach((notifIds, recipientId) => {
                req.emitToUser(recipientId, "notifications_removed", { ids: notifIds });
            });
        }

        // Phase 4: Delete all metadata records from MongoDB in one query
        if (allMetadataIdsToDelete.length > 0) {
            await uploadModel.deleteMany({ _id: { $in: allMetadataIdsToDelete } });
        }

        // Phase 5: Respond to frontend immediately so UI feels fast
        res.status(200).json({ success: true });

        // Phase 6: Asynchronously clean up physical files on S3/Disk in background
        if (filesToUnlink.length > 0) {
            const storage = getStorage();

            (async () => {
                for (const file of filesToUnlink) {
                    if (!file.storagePath) continue;

                    try {
                        // Decrement refCount on any remaining copies
                        await uploadModel.updateMany(
                            { storagePath: file.storagePath },
                            { $inc: { refCount: -1 } }
                        );

                        // Check if any other user copy still references this storagePath
                        const count = await uploadModel.countDocuments({ storagePath: file.storagePath });

                        // Only delete physical file from S3/Disk if no other user copy exists
                        if (count === 0) {
                            await storage.deleteFile(file.storagePath);
                            console.log(`[BACKGROUND DELETE] Deleted physical file: ${file.storagePath}`);
                        }

                    } catch (err) {
                        logger.error(err);
                        console.error(`[BACKGROUND DELETE ERROR] Failed to delete file: ${file.storagePath}`, err.message);
                    }
                }
            })();
        }

    } catch (error) {
        logger.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}