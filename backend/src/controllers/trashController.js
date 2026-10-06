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
import { sharedItemReperent } from "#utils/sharedItemReparent";


import { getStorage } from "../services/storageFactory.js";
import { getFileUrl, deleteFromS3 } from "#config/s3";



// export const trashItem = async (req, res) => {
//     try {
//         let ids = req.body.ids || req.body.id;
//         if (!Array.isArray(ids)) ids = [ids];

//         const deletedBy = req.user._id;
//         const bulkOps = [];
//         const parentsToNotify = new Set();
//         const notificationsToCreate = [];
//         // key: ownerId, value: array of their items trashed by someone else
//         const crossUserItemsMap = new Map();

//         // set of all ids being trashed in this request
//         const idsSet = new Set(ids.filter(Boolean).map(id => id.toString()));


//         // walk up from an item's parent — if any ancestor is ALSO
//         // being trashed in this same request, skip this item's own
//         // size subtraction (the ancestor's total already covers it)
//         const hasAncestorInBatch = async (item) => {
//             let currentParentId = item.parent;
//             while (currentParentId) {
//                 if (idsSet.has(currentParentId.toString())) {
//                     return true;
//                 }

//                 const parentDoc = await uploadModel.findById(currentParentId).select("parent")
//                 if (!parentDoc) break
//                 currentParentId = parentDoc.parent;
//             }

//             return false;
//         }


//         for (const id of ids) {
//             if (!id) continue;

//             const permission = await getUserPermission(deletedBy, id);
//             if (permission !== "owner" && permission !== "editor") {
//                 return res.status(403).json({ success: false, message: "Access denied" });
//             }

//             const item = await uploadModel
//                 .findOne({ _id: id, isTrashed: { $ne: true } })
//                 .populate("owner", "_id name profilePic");

//             if (!item || item.isTrashed) continue;

//             const itemOwnerId = item.owner._id
//                 ? item.owner._id.toString()
//                 : item.owner.toString();

//             const isOwnFile = itemOwnerId === deletedBy.toString();

//             // Always trash under the file's actual owner
//             bulkOps.push({
//                 updateOne: {
//                     filter: { _id: id },
//                     update: { $set: { isTrashed: true, trashedAt: new Date() } }
//                 }
//             });

//             // Update parent folder size by subtracting the trashed item's size
//             if (item.parent) {
//                 const ancestorAlsoTrashed = await hasAncestorInBatch(item);
//                 if (!ancestorAlsoTrashed) {
//                     const sizeToTrash = item.type === "folder" ? (item.totalSize || 0) : (item.fileSize || 0);
//                     if (sizeToTrash > 0) {
//                         await updateFolderSizeTree(item.parent, -sizeToTrash);
//                     }
//                 }
//             }

//             parentsToNotify.add(item.parent ? item.parent.toString() : "root");

//             // If deleted by someone OTHER than file owner → notify the file owner
//             if (!isOwnFile) {
//                 const actorName = req.user.name || "Someone";
//                 const message = `${_.startCase(actorName)} deleted your shared ${item.type} <b>${item.name}</b>`;


//                 notificationsToCreate.push({
//                     recipient: itemOwnerId,
//                     actor: deletedBy,
//                     type: item.type === "folder" ? "folder_deleted" : "file_deleted",
//                     message,
//                     metadata: {
//                         itemId: item._id,
//                         itemName: item.name,
//                         itemType: item.type,
//                         parentId: item.parent,
//                         profilePic: req.user.thumbnail_profile_pic || req.user.profilePic
//                     }
//                 });

//                 if (!crossUserItemsMap.has(itemOwnerId)) {
//                     crossUserItemsMap.set(itemOwnerId, []);
//                 }
//                 crossUserItemsMap.get(itemOwnerId).push({
//                     itemId: item._id,
//                     oldParent: item.parent,
//                     message,
//                     movedItem: {
//                         ...item.toObject(),
//                         isTrashed: true,
//                         trashedAt: new Date(),
//                         owner: {
//                             _id: item.owner._id,
//                             name: item.owner.name,
//                             profilePic: item.owner.profilePic
//                         },
//                         storagePath: item.storagePath ? `/${item.storagePath}` : null
//                     }
//                 });
//             }

//             // Walk nested children if folder
//             // Walk nested children if folder
//             if (item.type === "folder") {
//                 let parentIds = [item._id];

//                 while (parentIds.length > 0) {
//                     const children = await uploadModel
//                         .find({ parent: { $in: parentIds }, isTrashed: { $ne: true } })
//                         .populate("owner", "_id name profilePic")
//                         .lean();

//                     const nextParentIds = [];

//                     for (const child of children) {
//                         const childOwnerId = child.owner._id
//                             ? child.owner._id.toString()
//                             : child.owner.toString();

//                         bulkOps.push({
//                             updateOne: {
//                                 filter: { _id: child._id },
//                                 update: { $set: { isTrashed: true, trashedAt: new Date() } }
//                             }
//                         });

//                         if (child.type === "folder") nextParentIds.push(child._id);
//                     }

//                     parentIds = nextParentIds;
//                 }
//             }
//         }

//         // Bulk write file updates
//         if (bulkOps.length > 0) {
//             await uploadModel.bulkWrite(bulkOps);
//         }

//         // Save all notifications to DB
//         let savedNotifications = [];
//         if (notificationsToCreate.length > 0) {
//             savedNotifications = await notificationModel.insertMany(notificationsToCreate);
//         }

//         // Populate actor info for socket payload
//         const populatedActor = {
//             _id: req.user._id,
//             name: req.user.name,
//             profilePic: req.user.profilePic
//         };

//         // Emit item_trashed + new_notification to each affected file owner
//         crossUserItemsMap.forEach((items, ownerId) => {
//             items.forEach(({ itemId, oldParent, movedItem, message }) => {
//                 // Update the trash view
//                 req.emitToUser(ownerId, "item_trashed", {
//                     itemId,
//                     oldParent,
//                     movedItem
//                 });
//             });

//             // Find and emit all notifications for this owner
//             const ownerNotifs = savedNotifications.filter(
//                 n => n.recipient.toString() === ownerId
//             );
//             ownerNotifs.forEach(notif => {
//                 req.emitToUser(ownerId, "new_notification", {
//                     _id: notif._id,
//                     type: notif.type,
//                     message: notif.message,
//                     metadata: notif.metadata,
//                     actor: populatedActor,
//                     isRead: false,
//                     createdAt: notif.createdAt
//                 });
//             });
//         });

//         for (const pId of parentsToNotify) {
//             const actualParentId = pId === "root" ? null : pId;
//             await notifySharedUsers(
//                 actualParentId || ids[0],
//                 "item_trashed",
//                 { parentId: actualParentId, ids },
//                 req.emitToUser
//             );
//         }


//         //  here when owner moved item  to trash so that shared item notification we will remove here from shared users
//         const trashedNotification = await notificationModel.find({
//             "metadata.itemId": { $in: ids },
//             type: "file_shared"
//         }).select("_id recipient")

//         if (trashedNotification.length > 0) {
//             const idsToDelete = trashedNotification.map(n => n._id)
//             await notificationModel.deleteMany({ _id: { $in: idsToDelete } })

//             const notificationByRecipient = new Map()
//             trashedNotification.forEach(n => {
//                 const recipientId = n.recipient.toString()
//                 if (!notificationByRecipient.has(recipientId)) {
//                     notificationByRecipient.set(recipientId, [])
//                 }
//                 notificationByRecipient.get(recipientId).push(n._id)
//             })

//             notificationByRecipient.forEach((notifyIds, recipientId) => {
//                 req.emitToUser(recipientId, "notifications_removed", { ids: notifyIds })
//             })
//         }

//         res.json({ success: true });
//     } catch (error) {
//         logger.error(error);
//         res.status(500).json({ success: false, message: error.message });
//     }
// };


// helper fucntion to collect all shared with user id form all parent
const getUsersFromParents = async (ancestorIds) => {
    const users = new Set()
    if (!ancestorIds || ancestorIds.length === 0) return users

    const parents = await uploadModel
        .find({ _id: { $in: ancestorIds } })
        .select("sharedWith")
        .lean()

    parents.forEach(p => {
        (p.sharedWith || []).forEach(s => users.add(s.userId?.toString()))
    })

    return users
}

export const trashItem = async (req, res) => {
    try {
        let ids = req.body.ids || req.body.id;

        //  if remvoe id is not in the array so convert it 
        if (!Array.isArray(ids)) ids = [ids];

        const deletedBy = req.user._id;                           // current logged in user
        const actorName = req.user.name || "Someone";             // to display notificato nname
        const bulkOps = [];
        const parentsToNotify = new Map();
        const notificationsToCreate = [];
        const crossUserItemsMap = new Map();
        const idsSet = new Set(ids.filter(Boolean).map(id => id.toString()));


        //synchronous one-liner replacing the slow while loop
        const hasAncestorInBatch = (item) => {
            if (!item.ancestorIds) return false;
            return item.ancestorIds.some(ancestorId => idsSet.has(ancestorId.toString()));
        }


        //  this fucntino will help when if current user deleting his owne fiel so move to trash if some other deleting user ile so move it to root 
        const processItem = async (item, explicitParentOwnerId = null) => {
            const itemOwnerId = (item.owner._id || item.owner).toString()
            const isOwnFile = itemOwnerId === deletedBy.toString()

            // if item is own by current user so move it to trash
            if (isOwnFile) {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: item._id },
                        update: { $set: { isTrashed: true, trashedAt: new Date(), directly_trashed: true } }
                    }
                });
            } else {

                // user who got access from the parent folder
                const allParentIds = [...(item.ancestorIds || []), item.parent].filter(Boolean);
                const parentUsers = await getUsersFromParents(allParentIds)

                //  if fodle ris directly shared with soem user so remain dotn remvoe the users
                const sharesAfterMove = (item.sharedWith || []).filter(
                    s => !parentUsers.has(s.userId?.toString())
                )

                //  if the item is deleting is not belog to current user
                // so first find is this root item of anyone else 
                // or this itme is in he some fodler
                const hasOwnShare =
                    (item.sharedWith || []).some(s => s.userId?.toString() === deletedBy.toString())
                    && !parentUsers.has(deletedBy.toString());

                //  if file is in the root
                //  if file is in the root / directly shared with user
                if (hasOwnShare) {
                    //  only delete the current user from sharedWith
                    const remainingShares = (item.sharedWith || []).filter(
                        s => s.userId.toString() !== deletedBy.toString()
                    );

                    bulkOps.push({
                        updateOne: {
                            filter: { _id: item._id },
                            update: {
                                $pull: { sharedWith: { userId: deletedBy } },
                                $set: { isShared: remainingShares.length > 0 }
                            }
                        }
                    });

                    // if editor removes here the main folder then editor upaldoe ditem will goes to thier root
                    if (item.type === "folder") {
                        const editorItemsMap = await sharedItemReperent(
                            [item._id],
                            (ownerId) => ownerId === deletedBy.toString()
                        );

                        let totalMovedSize = 0;
                        editorItemsMap.forEach((items, editorId) => {
                            items.forEach(({ itemId, oldParent, movedItem }) => {
                                totalMovedSize += (movedItem.type === "folder" ? (movedItem.totalSize || 0) : (movedItem.fileSize || 0));

                                // Add file directly to Editor's root screen
                                req.emitToUser(editorId, "item_moved", {
                                    itemId,
                                    oldParent,
                                    newParent: null,
                                    movedItem,
                                    reason: "removed"
                                });

                                // Remove file from ALL collaborators' folder screens
                                notifySharedUsers(oldParent, "item_moved", {
                                    itemId,
                                    oldParent,
                                    newParent: null,
                                    movedItem,
                                    reason: "removed"
                                }, req.emitToUser);
                            });
                        });

                        if (totalMovedSize > 0) {
                            await updateFolderSizeTree(item._id, -totalMovedSize);
                        }
                    }

                    // Notify the Owner to update the folder icon and share info live
                    req.emitToUser(itemOwnerId, "share_removed", {
                        itemIds: [item._id],
                        accessRevoked: false
                    });

                    return { unsharedOnly: true };
                }
                else {
                    // guest item — different owner than parent folder reparent to its own root
                    const reparentUpdate = {
                        parent: null,
                        ancestorIds: [],
                        sharedWith: sharesAfterMove,
                        isShared: sharesAfterMove.length > 0
                    };
                    if (!item.sharedWith || item.sharedWith.length === 0) {
                        reparentUpdate.isShared = false;
                    }
                    bulkOps.push({
                        updateOne: {
                            filter: { _id: item._id },
                            update: { $set: reparentUpdate }
                        }
                    });
                    // If we pop a folder out to root, we MUST fix the ancestorIds for its entire nested subtree!
                    if (item.type === "folder") {
                        const subDescendants = await uploadModel.find({
                            ancestorIds: item._id
                        }).select("_id ancestorIds sharedWith").lean();

                        for (const sub of subDescendants) {
                            const idx = sub.ancestorIds.findIndex(a => a.toString() === item._id.toString());
                            const rebuiltChain = idx >= 0 ? sub.ancestorIds.slice(idx) : [];

                            const subRemaining = (sub.sharedWith || []).filter(
                                s => !parentUsers.has(s.userId?.toString())
                            );

                            bulkOps.push({
                                updateOne: {
                                    filter: { _id: sub._id },
                                    update: {
                                        $set: {
                                            ancestorIds: rebuiltChain,
                                            sharedWith: subRemaining,
                                            isShared: subRemaining.length > 0
                                        }
                                    }
                                }
                            });
                        }
                    }
                }


                // Create notification & live socket payload
                const message = `${_.startCase(actorName)} removed your shared ${item.type} <b>${item.name}</b> — it's back in your My Docspot`;

                notificationsToCreate.push({
                    recipient: itemOwnerId,
                    actor: deletedBy,
                    type: item.type === "folder" ? "folder_removed" : "file_removed",
                    message,
                    metadata: {
                        itemId: item._id,
                        itemName: item.name,
                        itemType: item.type,
                        parentId: null,
                        profilePic: req.user.thumbnail_profile_pic || req.user.profilePic
                    }
                });

                //  socket 
                if (!crossUserItemsMap.has(itemOwnerId)) crossUserItemsMap.set(itemOwnerId, []);
                crossUserItemsMap.get(itemOwnerId).push({
                    itemId: item._id,
                    oldParent: item.parent,
                    message,
                    movedItem: {
                        ...item,
                        isTrashed: false,
                        parent: null,
                        sharedWith: sharesAfterMove,
                        isShared: sharesAfterMove.length > 0,
                        owner: item.owner._id
                            ? item.owner
                            : { _id: itemOwnerId, name: item.owner.name, profilePic: item.owner.profilePic },
                        storagePath: item.storagePath ? `/${item.storagePath}` : null
                    }
                });

            }
        }


        //  main loop to find all ach item parent adn mvoe to thier root adn for owner move to the trash
        for (const id of ids) {
            if (!id) continue

            const permission = await getUserPermission(deletedBy, id);
            if (permission !== "owner" && permission !== "editor") {
                return res.status(403).json({ success: false, message: "Access denied" });
            }

            const item = await uploadModel.findOne({ _id: id, isTrashed: { $ne: true } }).populate("owner", "_id name profilePic").lean();
            if (!item || item.isTrashed) continue;

            //  give that item to the helper function to find where ot move trash or other user root
            const processResult = await processItem(item);

            if (processResult && processResult.unsharedOnly) {
                // If it was only unshared, it stays in the same folder for the owner.
                // So we MUST NOT reduce the folder size, and we MUST NOT tell the room it was trashed.
                continue;
            }

            //  group trashed item by parent folder or root for socket notifications
            const parentKey = item.parent ? item.parent.toString() : "root";
            if (!parentsToNotify.has(parentKey)) parentsToNotify.set(parentKey, []);
            parentsToNotify.get(parentKey).push(String(item._id));

            //  update the folder size if item is inside a folder
            if (item.parent) {
                const ancestorAlsoTrashed = hasAncestorInBatch(item);
                if (!ancestorAlsoTrashed) {
                    const sizeToTrash = item.type === "folder" ? (item.totalSize || 0) : (item.fileSize || 0);
                    if (sizeToTrash > 0) await updateFolderSizeTree(item.parent, -sizeToTrash);
                }
            }

            // Handle nested items if folder
            if (item.type === "folder") {
                // when folder move to trash add is trashed to every children if not already
                bulkOps.push({
                    updateMany: {
                        filter: {
                            ancestorIds: item._id,
                            owner: deletedBy,
                            isTrashed: { $ne: true }
                        },
                        update: {
                            $set: { isTrashed: true, trashedAt: new Date(), directly_trashed: false }
                        }
                    }
                })

                //  Get ALL descendants in exactly ONE query
                const allDescendants = await uploadModel.find({
                    ancestorIds: item._id,
                    isTrashed: { $ne: true }
                }).populate("owner", "_id name profilePic").lean();

                // 2. Build a quick lookup map for owners (so we know every folder's owner instantly)
                const folderOwnerMap = new Map();
                folderOwnerMap.set(item._id.toString(), (item.owner._id || item.owner).toString());

                for (const desc of allDescendants) {
                    if (desc.type === "folder") {
                        folderOwnerMap.set(desc._id.toString(), (desc.owner._id || desc.owner).toString());
                    }
                }

                // 3. Process any child whose owner is different from its direct parent
                for (const child of allDescendants) {
                    const childOwnerId = (child.owner._id || child.owner).toString();
                    const parentOwnerId = folderOwnerMap.get(child.parent.toString());

                    if (childOwnerId !== parentOwnerId) {
                        await processItem(child, parentOwnerId);
                    }
                }
            }

        }

        //  bulk wirte to b
        if (bulkOps.length > 0) await uploadModel.bulkWrite(bulkOps);


        // Save notifications
        let savedNotifications = [];
        if (notificationsToCreate.length > 0) {
            savedNotifications = await notificationModel.insertMany(notificationsToCreate);
        }

        //  scoket 
        const populatedActor = { _id: req.user._id, name: req.user.name, profilePic: req.user.profilePic, compressed_profile_pic: req.user.compressed_profile_pic, thumbnail_profile_pic: req.user.thumbnail_profile_pic };

        // send notificatino to the user that fiel is moved to its owen root 
        crossUserItemsMap.forEach((items, ownerId) => {
            items.forEach(({ itemId, oldParent, movedItem }) => {
                req.emitToUser(ownerId, "item_moved", { itemId, oldParent, newParent: null, movedItem, reason: "removed" });
            });

            savedNotifications
                .filter(n => n.recipient.toString() === ownerId)
                .forEach(notif => {
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

        // notify al ll toehr users that this file is removed
        for (const [pId, trashedIds] of parentsToNotify) {
            const actualParentId = pId === "root" ? null : pId;
            await notifySharedUsers(
                actualParentId || trashedIds[0],
                "item_trashed",
                { parentId: actualParentId, ids: trashedIds },
                req.emitToUser
            );
        }

        res.json({ success: true, message: "Item moved to trash" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}



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

// ----------------------------- RESTORE FROM TRASH ------------------------------
export const restoreItem = async (req, res) => {
    try {
        let ids = req.body.ids || req.body.id
        const owner = req.user._id

        // if not arrray so convert to array of ids
        if (!Array.isArray(ids)) ids = [ids]
        ids = [...new Set(ids.filter(Boolean).map(String))]

        if (ids.length === 0) {
            return res.status(400).json({ success: false, message: "No items selected" })
        }

        //  parent restore first then all childrean
        // get the item parent fodler first with ancestor id
        const docs = await uploadModel.find({ _id: { $in: ids } }).select("_id ancestorIds").lean()

        //  check how many ancestor depth has this item
        const depthMap = new Map(docs.map(d => [String(d._id), d.ancestorIds?.length || 0]))

        //  parent first then child and then deep child
        ids.sort((a, b) => (depthMap.get(a) ?? 0) - (depthMap.get(b) ?? 0))

        let restored = 0
        let restoredToRoot = 0
        const failed = []

        // if user is selecting multipel files for restoring send one socket not many
        const restoreNotifications = new Map()
        const queueRestoreNotify = (id, parentId) => {
            const key = parentId ? String(parentId) : "root"
            if (!restoreNotifications.has(key)) {
                restoreNotifications.set(key, {
                    anchorId: id,
                    parentId: parentId ? String(parentId) : null,
                    itemIds: []
                })
            }
            restoreNotifications.get(key).itemIds.push(String(id))
        }

        for (const id of ids) {
            try {
                //  item permission chekcing 
                const permission = await getUserPermission(owner, id)
                if (permission !== "owner") {
                    failed.push({ id, message: "Access denied" })
                    continue
                }

                const item = await uploadModel.findOne({ _id: id })
                if (!item) {
                    failed.push({ id, message: "Item not found" })
                    continue
                }

                let isEffectivelyTrashed = item.isTrashed
                let isParentEffectivelyTrashed = false


                if (item.ancestorIds && item.ancestorIds.length > 0) {
                    const trashedAncestor = await uploadModel.findOne({
                        _id: { $in: item.ancestorIds },
                        isTrashed: true
                    }).select("_id")

                    if (trashedAncestor) {
                        isParentEffectivelyTrashed = true
                        isEffectivelyTrashed = true
                    }
                }

                if (!isEffectivelyTrashed) {
                    failed.push({ id, message: "Item is not in trash" })
                    continue
                }

                //  restore the nested children
                if (item.type === "folder") {
                    const nestedChildren = await uploadModel.find({
                        ancestorIds: item._id,
                        isTrashed: true,
                        directly_trashed: false
                    }).select("_id type").lean()

                    if (nestedChildren.length > 0) {
                        await uploadModel.updateMany(
                            { _id: { $in: nestedChildren.map(c => c._id) } },
                            { $set: { isTrashed: false, trashedAt: null } }
                        )
                    }
                }


                //  if item parent fodler is in the root so fiel goes inide the paent fodler but if not then fiel mvoe to the root
                if (item.parent) {
                    const parentFolder = await uploadModel.findOne({ _id: item.parent })
                    const parentPermission = await getUserPermission(owner, item.parent)
                    const lostAccess = !parentPermission || !["owner", "editor"].includes(parentPermission)

                    if (!parentFolder || isParentEffectivelyTrashed || lostAccess) {
                        // restore to root (your existing code, unchanged)
                        if (item.type === "folder") {
                            const subDescendants = await uploadModel.find({ ancestorIds: id }).select("_id ancestorIds").lean()
                            const bulkOps = subDescendants.map(sub => {
                                const idx = sub.ancestorIds.findIndex(a => a.toString() === id.toString())
                                const rebuiltChain = idx >= 0 ? sub.ancestorIds.slice(idx) : []
                                return {
                                    updateOne: {
                                        filter: { _id: sub._id },
                                        update: { $set: { ancestorIds: rebuiltChain } }
                                    }
                                }
                            })
                            if (bulkOps.length > 0) await uploadModel.bulkWrite(bulkOps)
                        }

                        await uploadModel.updateOne(
                            { _id: id },
                            { $set: { isTrashed: false, trashedAt: null, parent: null, ancestorIds: [], directly_trashed: false } }
                        )
                        queueRestoreNotify(id, null)

                        restored++
                        restoredToRoot++
                        continue   // was: return res.json(...)
                    }
                }

                await uploadModel.updateOne(
                    { _id: id },
                    { $set: { isTrashed: false, trashedAt: null, directly_trashed: false } }
                )

                if (item.parent) {
                    const sizeToRestore = item.type === "folder" ? (item.totalSize || 0) : (item.fileSize || 0)
                    if (sizeToRestore > 0) await updateFolderSizeTree(item.parent, sizeToRestore)
                }

                if (item.type === "folder" && item.sharedWith?.length > 0) {
                    const fileIdsToRestore = item.sharedWith.flatMap(entry => entry.file_ids || [])
                    if (fileIdsToRestore.length > 0) {
                        await uploadModel.updateMany(
                            { _id: { $in: fileIdsToRestore }, parent: null },
                            { $set: { parent: id } }
                        )
                    }
                }

                queueRestoreNotify(id, item.parent)
                restored++
            } catch (error) {
                logger.error(error)
                failed.push({ id, message: error.message })
            }
        }


        if (restored === 0 && failed.length > 0) {
            return res.status(failed[0].message === "Access denied" ? 403 : 400)
                .json({ success: false, message: failed[0].message, failed })
        }


        //  notify once here
        for (const { anchorId, parentId, itemIds } of restoreNotifications.values()) {
            await notifySharedUsers(
                anchorId,
                "item_restored",
                { itemId: anchorId, itemIds, parentId },
                req.emitToUser
            )
        }

        return res.json({ success: true, restored, restoredToRoot, failed })

    } catch (error) {
        console.error(error);
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
            directly_trashed: true,
            $or: [{ type: "folder" }, { type: "file", uploadStatus: "completed" }]
        })
            .select("name type fileSize totalSize fileType createdAt updatedAt parent color owner storagePath isTrashed trashedAt")
            .populate("owner", "_id name")
            .sort(sortArray)
            .collation({ locale: "en", strength: 2 })
            .lean();

        return res.json({
            success: true,
            items: allTrashedItems.map(fixPath),
            total: allTrashedItems.length
        });


    } catch (error) {
        logger.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}


// ----------------------------- PERMANENTLY DELETE FROM TRASH ------------------------------
export const deleteForver = async (req, res) => {
    try {
        let ids = req.body.ids || req.body.id;
        if (!Array.isArray(ids)) {
            ids = [ids];
        }
        const owner = req.user._id;

        const itemsToProcess = [];
        for (const id of ids) {
            if (!id) continue;

            const permission = await getUserPermission(owner, id);
            if (permission !== "owner") {
                return res.status(403).json({ success: false, message: "Access denied" });
            }

            const item = await uploadModel.findOne({ _id: id });
            if (!item) {
                return res.status(404).json({ success: false, message: "Item not found" });
            }

            // Check if any ancestor is trashed 
            let isItemTrashed = item.isTrashed;
            if (!isItemTrashed && item.ancestorIds && item.ancestorIds.length > 0) {
                const trashedAncestor = await uploadModel.findOne({
                    _id: { $in: item.ancestorIds },
                    isTrashed: true
                }).select("_id");

                if (trashedAncestor) isItemTrashed = true;
            }

            if (!isItemTrashed) {
                return res.status(400).json({ success: false, message: "Item is not in trash" });
            }

            itemsToProcess.push(item);
        }

        const allMetadataIdsToDelete = [];
        const filesToUnlink = [];

        for (const item of itemsToProcess) {
            await notifySharedUsers(item.parent || item._id, "item_deleted", { itemId: item._id, parentId: item.parent }, req.emitToUser);

            allMetadataIdsToDelete.push(item._id);

            if (item.type === "file") {
                if (item.storagePath) {
                    filesToUnlink.push({ _id: item._id, storagePath: item.storagePath });
                }
            } else {
                //  when user deelte forever so collect all the children that owner is current user
                const children = await uploadModel.find({
                    ancestorIds: item._id,
                    owner: owner
                }).select("_id type storagePath").lean();

                for (const child of children) {
                    allMetadataIdsToDelete.push(child._id)
                    if (child.type === "file" && child.storagePath) {
                        filesToUnlink.push({ _id: child._id, storagePath: child.storagePath });
                    }
                }

                //  every id that is about to deleted
                const deletedIds = new Set([String(item._id), ...children.map(c => String(c._id))]);

                // other users item that need ot change ancestor ids
                const survivors = await uploadModel.find({
                    ancestorIds: item._id,
                    owner: { $ne: owner }
                }).select("_id parent ancestorIds").lean();


                const ops = survivors.map(s => {
                    let lastDeleted = -1;
                    (s.ancestorIds || []).forEach((id, i) => {
                        if (deletedIds.has(String(id))) lastDeleted = i;
                    });

                    const update = { ancestorIds: (s.ancestorIds || []).slice(lastDeleted + 1) };
                    if (s.parent && deletedIds.has(String(s.parent))) update.parent = null;

                    return { updateOne: { filter: { _id: s._id }, update: { $set: update } } };
                });

                if (ops.length > 0) await uploadModel.bulkWrite(ops);

            }
        }

        // Delete notifications linked to these deleted items
        const notifsToDelete = await notificationModel.find({
            type: { $in: ["file_deleted", "folder_deleted"] },
            "metadata.itemId": { $in: allMetadataIdsToDelete }
        }).lean();

        if (notifsToDelete.length > 0) {
            const recipientMap = new Map();
            notifsToDelete.forEach(n => {
                const rid = n.recipient.toString();
                if (!recipientMap.has(rid)) recipientMap.set(rid, []);
                recipientMap.get(rid).push(n._id);
            });

            await notificationModel.deleteMany({
                _id: { $in: notifsToDelete.map(n => n._id) }
            });

            recipientMap.forEach((notifIds, recipientId) => {
                req.emitToUser(recipientId, "notifications_removed", { ids: notifIds });
            });
        }

        // Delete all metadata records from MongoDB in ONE query
        if (allMetadataIdsToDelete.length > 0) {
            await uploadModel.deleteMany({ _id: { $in: allMetadataIdsToDelete } });
        }

        res.status(200).json({ success: true });

        // Clean up physical files on S3/Disk in background
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
                        }

                    } catch (err) {
                        logger.error(err);
                        console.error(`[BACKGROUND DELETE ERROR] Failed to delete file: ${file.storagePath}`, err.message);
                    }
                }
            })();
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}
