//  models - schema
import uploadModel from "#models/uploadModel";
import userModel from "#models/userModel";
import notificationModel from "#models/notification"

//  utils
import { logger } from "#utils/logger";
import { getUserPermission } from "#utils/userPermissionUtil";
import { sharedItemReperent } from "#utils/sharedItemReparent";

// ------------------------- SHARE FILE AND FOLDER CONTROLLER -------------------------------------

//  1) checking here if user have this current folder or file permsioon t oaccess it or not
// helper function

// 2)  remove user from share 
//  here if owner remove user from shared then all nested files and folder permission will be revoke here
const removeUserFromSubtree = async (parentId, userId) => {
    // find ALL descendants at any depth in ONE query
    const descendants = await uploadModel.find({
        ancestorIds: parentId,
        "sharedWith.userId": userId
    }).select("_id sharedWith")

    if (descendants.length === 0) return

    const bulkOps = descendants.map(doc => {
        const remaining = doc.sharedWith.filter(
            s => s.userId.toString() !== userId.toString()
        )
        return {
            updateOne: {
                filter: { _id: doc._id },
                update: {
                    $set: {
                        sharedWith: remaining,
                        isShared: remaining.length > 0
                    }
                }
            }
        }
    })

    await uploadModel.bulkWrite(bulkOps)
}



// 3) share folder or file with other users (Bulk Supported)
export const shareItem = async (req, res) => {
    try {
        // ################################
        // ---- STEP - 1 - Extract the input
        //  ################################

        //  multiple item sharing with multiple users
        let { itemId, itemIds, userIds, permission } = req.body;
        const currentUserId = req.user._id

        //  we are supprting here single item sharing and multipel items sharing 
        const incomingItemIds = itemIds || itemId;

        // convert item ids into Array if not - and userIds conver to array if not
        const itemIdList = Array.isArray(incomingItemIds) ? incomingItemIds : (incomingItemIds ? [incomingItemIds] : []);
        const userIdList = Array.isArray(userIds) ? userIds : [userIds];

        // #####################################
        //  ---- STEP - 2 - validation inputs
        // #####################################

        // if no item is selected 
        if (itemIdList.length === 0) {
            return res.status(400).json({ success: false, message: "No item is selected" })
        }

        // viewer and editor can not share with other users
        if (!["viewer", "editor"].includes(permission)) {
            return res.status(400).json({ success: false, message: "Invalid permission" })
        }

        // ########################################
        //  ------- STEP - 3 - Verify item ownership and verify targeted user
        //  ##########################################

        //  so now here owner and editor can both share items here 
        const itemsToShare = await uploadModel.find({
            _id: { $in: itemIdList }
        }).select("_id name type mimeType parent sharedWith owner")

        //  check permission here for that items owner and editor can share
        const authorizedItems = []
        for (const item of itemsToShare) {
            const permission = await getUserPermission(currentUserId, item._id)
            if (["owner", "editor"].includes(permission)) {
                authorizedItems.push(item)
            }
        }

        //  convert authorized items to the array
        const authorizedItemIds = authorizedItems.map(i => i._id)

        //  return if user is not the owner or editor 
        if (authorizedItemIds.length === 0) {
            return res.status(403).json({ success: false, message: "No valid items found or you don't have permission to share" })
        }


        //  exclude current user form sharing 
        const targetUsers = await userModel.find({
            _id: { $in: userIdList, $ne: currentUserId }
        }).select("_id")

        //  from array of documents convert array of ids
        const targetUserIds = targetUsers.map(u => u._id)

        //  if there is no users found so return
        if (targetUserIds.length === 0) {
            return res.status(400).json({ success: false, message: "No valid users" })
        }

        // ##########################################################
        //  --- STEP - 4 - logic for sharing
        //  ########################################################

        // so when child item permission chnaged so no notification will oges
        const priorAccessMap = new Map()

        for (const item of authorizedItems) {
            for (const uid of targetUserIds) {
                const priorPermission = await getUserPermission(uid, item._id)
                priorAccessMap.set(`${item._id}_${uid}`, priorPermission !== null)
            }
        }

        //  when sahring if is there any previous permision so deelte it
        await uploadModel.updateMany(
            { _id: { $in: authorizedItemIds } },   // first get all items
            {
                $pull: {
                    sharedWith: { userId: { $in: targetUserIds } }    // pull will remove userId from array if exist
                }
            }
        )

        //  after deleting the old permision add a new permission
        await uploadModel.updateMany(
            { _id: { $in: authorizedItemIds } },
            {
                //  if no exist then only add in the addToSet
                $addToSet: {
                    sharedWith: {
                        $each: targetUserIds.map(userId => ({ userId, permission }))
                    }
                },
                $set: { isShared: true }
            }
        )

        //  if owner or editor changes other user permision so that user override any child permision
        if (req.body.applyToChildren) {
            await uploadModel.updateMany(
                { ancestorIds: { $in: authorizedItemIds } },
                { $pull: { sharedWith: { userId: { $in: targetUserIds } } } }
            )

            //  if that item is sahred with is zero so update the flag
            await uploadModel.updateMany(
                { ancestorIds: { $in: authorizedItemIds }, sharedWith: { $size: 0 } },
                { $set: { isShared: false } }
            )
        }

        //  #####################################################################
        //  --- STEP - 4.5 - send notification BEll
        // ######################################################################

        const notificationDocs = [];

        targetUserIds.forEach(uid => {
            authorizedItems.forEach(item => {
                // Check if user already had access to this item
                const hadAccessBefore = priorAccessMap.get(`${item._id}_${uid}`)

                // only send notification if new user previus user will not recive here 
                if (!hadAccessBefore) {
                    const itemTypeName = item.type === "folder" ? "folder" : "file"
                    notificationDocs.push({
                        recipient: uid,
                        actor: currentUserId,
                        type: "file_shared",
                        message: `${req.user.name} shared ${itemTypeName} <b>"${item.name}"</b> with you`,
                        metadata: {
                            itemId: item._id,
                            itemName: item.name,
                            itemType: item.type,
                            parentId: item.parent || null,
                            profilePic: req.user.thumbnail_profile_pic || req.user.profilePic || null
                        }
                    })
                }

            })
        })

        if (notificationDocs.length > 0) {
            // 1. Save all notifications to database
            const savedNotifications = await notificationModel.insertMany(notificationDocs)

            // 2. Prepare actor info for real-time socket payload
            const populatedActor = {
                _id: req.user._id,
                name: req.user.name,
                profilePic: req.user.profilePic,
                compressed_profile_pic: req.user.compressed_profile_pic,
                thumbnail_profile_pic: req.user.thumbnail_profile_pic
            }

            // 3 socket evet to notfication to other users
            savedNotifications.forEach(notify => {
                req.emitToUser(notify.recipient.toString(), "new_notification", {
                    _id: notify._id,
                    type: notify.type,
                    message: notify.message,
                    metadata: notify.metadata,
                    actor: populatedActor,
                    isRead: false,
                    createdAt: notify.createdAt
                })
            })
        }



        //  #####################################################################
        //  --- STEP - 5 - send scoket event
        // ######################################################################

        // notify all users and collaborators that share added
        authorizedItems.forEach(item => {
            const allCollaboratorIds = new Set();
            if (item.owner) allCollaboratorIds.add(item.owner.toString());
            if (Array.isArray(item.sharedWith)) {
                item.sharedWith.forEach(s => {
                    const uid = typeof s === 'object' ? (s.userId?._id || s.userId || s._id) : s;
                    if (uid) allCollaboratorIds.add(uid.toString());
                });
            }
            targetUserIds.forEach(uid => allCollaboratorIds.add(uid.toString()));
            allCollaboratorIds.add(currentUserId.toString());
            allCollaboratorIds.forEach(uid => {
                req.emitToUser(uid, "share_added", {
                    itemIds: [item._id],
                    senderId: currentUserId.toString(),
                    message: `${authorizedItems.length} item(s) shared`,
                });
            });
        });

        // ── STEP 6: Response ────────────────────────────────────
        res.json({ success: true, message: "Shared successfully" })

    } catch (error) {
        logger.error(error);
        res.status(500).json({ success: false, message: error.message })
    }
}

//  4) remove item share acces from users (Bulk Supported)
export const unshareItem = async (req, res) => {
    try {

        // #########################################################
        // ── STEP 1: Extract inputs ────────────────────
        // ########################################################
        let { itemId, itemIds, userIds } = req.body;
        const currentUserId = req.user._id;

        // support both single and bulk unshare from frontend
        const incomingItemIds = itemIds || itemId;
        const normalizedItemIds = Array.isArray(incomingItemIds) ? incomingItemIds : (incomingItemIds ? [incomingItemIds] : []);
        const normalizedUserIds = Array.isArray(userIds) ? userIds : [userIds];

        // #########################################################
        // ── STEP 2: Validate inputs ─────────────────────────────
        // #######################################################
        if (normalizedItemIds.length === 0) {
            return res.status(400).json({ success: false, message: "No items selected" })
        }

        // #########################################################
        // ── STEP 3: Verify ownership ────────────────────────────
        // ########################################################

        //  here owner and editor both can un share items here
        const targetItems = await uploadModel.find({
            _id: { $in: normalizedItemIds }
        }).select("_id owner parent sharedWith type name")


        //  editor and owner only  permiison
        const authorizedItems = []
        for (const item of targetItems) {
            const permission = await getUserPermission(currentUserId, item._id)
            if (["owner", "editor"].includes(permission)) {
                authorizedItems.push(item)
            }
        }

        if (authorizedItems.length === 0) {
            return res.status(403).json({ success: false, message: "No items found or you don't have permission to unshare" })
        }

        const authorizedItemIds = authorizedItems.map(i => i._id)


        //  prevent the editor to unshare owner or themselves
        const safeUserIdsToUnshare = normalizedUserIds.filter(targetUid => {
            const targetStr = targetUid.toString()
            const requesterStr = currentUserId.toString()

            for (const item of authorizedItems) {
                const itemOwnerStr = item.owner ? item.owner.toString() : null

                //  if un shareing user is the editor
                if (requesterStr !== itemOwnerStr) {
                    // prevent removing the owner
                    if (targetStr === itemOwnerStr) return false
                    //  prevent removing themselves
                    if (targetStr === requesterStr) return false

                }
            }
            return true
        })

        if (safeUserIdsToUnshare.length === 0) {
            return res.status(400).json({ success: false, message: "You cannot unshare to this user" })
        }



        // ########################################################
        // ── STEP 4: Business logic ──────────────────────────
        // #######################################################

        // Reparent editor uploaded items to root using sharedItemReperent utility before access is removed
        const editorItemsMap = await sharedItemReperent(
            authorizedItemIds,
            (ownerId) => safeUserIdsToUnshare.includes(ownerId)
        );

        // remove target users from sharedWith on all owned items
        await uploadModel.updateMany(
            { _id: { $in: authorizedItemIds } },
            {
                $pull: {
                    sharedWith: { userId: { $in: safeUserIdsToUnshare } }
                }
            }
        )

        // reset isShared flag on items that now have no shared users
        await uploadModel.updateMany(
            { _id: { $in: authorizedItemIds }, sharedWith: { $size: 0 } },
            { $set: { isShared: false } }
        )

        // remove inherited permissions from all nested children in folder subtree
        for (const item of authorizedItems) {
            if (item.type === "folder") {
                for (const userId of safeUserIdsToUnshare) {
                    await removeUserFromSubtree(item._id, userId)
                }
            }
        }


        // ##########################################################
        // ── STEP 4.5 - remove the notification from the other users ────────────────────────
        // ######################################################### 
        const notificationToDelete = await notificationModel.find({
            recipient: { $in: safeUserIdsToUnshare },
            "metadata.itemId": { $in: authorizedItemIds },
            type: "file_shared"
        }).select("_id recipient")

        if (notificationToDelete.length > 0) {
            const idsToDelete = notificationToDelete.map(n => n._id)
            await notificationModel.deleteMany({ _id: { $in: idsToDelete } })

            //  for live update to all share dusers id
            const notificationByRecipent = new Map()
            notificationToDelete.forEach(n => {
                const recipientId = n.recipient.toString()
                if (!notificationByRecipent.has(recipientId)) {
                    notificationByRecipent.set(recipientId, [])
                }
                notificationByRecipent.get(recipientId).push(n._id)
            })

            //  socket evet live notification to users
            notificationByRecipent.forEach((ids, recipientId) => {
                req.emitToUser(recipientId, "notifications_removed", { ids })
            })
        }


        // // ##########################################################
        // // ── STEP 5: Send each editor socket event ────────────────────────
        // // ######################################################### 

        // // notify each editor that their uploaded items have been moved to root
        // editorItemsMap.forEach((items, editorId) => {
        //     items.forEach(({ itemId, oldParent, movedItem }) => {
        //         req.emitToUser(editorId, "item_moved", {
        //             itemId,
        //             oldParent,
        //             newParent: null,
        //             movedItem
        //         })
        //     })
        // })

        // // notify all collaborators (Owner, Editors, Viewers, and unshared users) with accurate accessRevoked flags
        // authorizedItems.forEach(item => {
        //     const allCollaboratorIds = new Set();
        //     if (item.owner) allCollaboratorIds.add(item.owner.toString());
        //     if (Array.isArray(item.sharedWith)) {
        //         item.sharedWith.forEach(s => {
        //             const uid = typeof s === 'object' ? (s.userId?._id || s.userId || s._id) : s;
        //             if (uid) allCollaboratorIds.add(uid.toString());
        //         });
        //     }
        //     safeUserIdsToUnshare.forEach(uid => allCollaboratorIds.add(uid.toString()));
        //     allCollaboratorIds.add(currentUserId.toString());

        //     const unsharedSet = new Set(safeUserIdsToUnshare.map(id => id.toString()))

        //     allCollaboratorIds.forEach(uid => {
        //         const revoked = unsharedSet.has(uid.toString())
        //         console.log(`[Backend shareController] Emitting share_removed to uid=${uid} | accessRevoked=${revoked} | itemId=${item._id}`)
        //         req.emitToUser(uid, "share_removed", {
        //             itemIds: [item._id],
        //             accessRevoked: revoked
        //         });
        //     });
        // });

        // ##########################################################
        // ── STEP 5: Send each editor socket event ────────────────────────
        // ######################################################### 

        // notify all collaborators (Owner, Editors, Viewers, and unshared users) about reparented items and share removal
        authorizedItems.forEach(item => {
            const allCollaboratorIds = new Set();
            if (item.owner) allCollaboratorIds.add(item.owner.toString());
            if (Array.isArray(item.sharedWith)) {
                item.sharedWith.forEach(s => {
                    const uid = typeof s === 'object' ? (s.userId?._id || s.userId || s._id) : s;
                    if (uid) allCollaboratorIds.add(uid.toString());
                });
            }
            safeUserIdsToUnshare.forEach(uid => allCollaboratorIds.add(uid.toString()));
            allCollaboratorIds.add(currentUserId.toString());

            // 1. Emit item_moved to all collaborators so the file leaves the folder view for everyone
            editorItemsMap.forEach((items) => {
                items.forEach(({ itemId, oldParent, movedItem }) => {
                    allCollaboratorIds.forEach(uid => {
                        req.emitToUser(uid, "item_moved", {
                            itemId,
                            oldParent,
                            newParent: null,
                            movedItem
                        });
                    });
                });
            });

            // 2. Emit share_removed for the folder
            const unsharedSet = new Set(safeUserIdsToUnshare.map(id => id.toString()))

            allCollaboratorIds.forEach(uid => {
                const revoked = unsharedSet.has(uid.toString())
                req.emitToUser(uid, "share_removed", {
                    itemIds: [item._id],
                    accessRevoked: revoked
                });
            });
        });




        // ── STEP 6: Response ────────────────────────────────────
        res.json({ success: true, message: "Access removed" });

    } catch (error) {
        logger.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}




//  5) owner and editor can see all user with file and folder access in modal (including inherited)
export const getSharedUsers = async (req, res) => {
    try {
        // Extract the target file/folder ID from the request URL parameters
        const { itemId } = req.params;
        // Get the ID of the user currently making the request (logged-in user)
        const requesterId = req.user._id;

        // Fetch the specific file or folder from the database, and also fetch the owner's profile details
        const targetItem = await uploadModel.findById(itemId).populate("owner", "name email profilePic thumbnail_profile_pic compressed_profile_pic");

        // If the file or folder does not exist in the database, return a 404 Not Found error
        if (!targetItem) {
            return res.status(404).json({ success: false, message: "No item found" })
        }

        // Check if the current user actually has permission to view this item's details
        const permission = await getUserPermission(requesterId, itemId)

        // If they have no permission, block them with a 403 Access Denied error
        if (!permission) {
            return res.status(403).json({ success: false, message: "Access denied" })
        }

        // Create an object containing only the necessary details of the item's owner to send to the frontend
        const ownerData = {
            userId: targetItem.owner._id,
            name: targetItem.owner.name,
            email: targetItem.owner.email,
            profilePic: targetItem.owner.profilePic,
            thumbnail_profile_pic: targetItem.owner.thumbnail_profile_pic,
            compressed_profile_pic: targetItem.owner.compressed_profile_pic
        }

        // Create a Map (like a dictionary) to store unique users who have access.
        // Using a Map prevents duplicate users if someone was shared on both a parent folder AND a child file.
        const allSharedUsersMap = new Map();
        let inheritedFolderOwner = null;

        // We only reveal the full list of shared users if the person requesting it is the actual "owner"
        if (permission === "owner" || permission === "editor") {
            // fetch item itself + all ancestors in ONE query, closest-to-furthest order
            const chainIds = [itemId, ...(targetItem.ancestorIds || []).slice().reverse()]

            const chainDocs = await uploadModel.find({ _id: { $in: chainIds } })
                .populate("owner", "name email profilePic thumbnail_profile_pic compressed_profile_pic")
                .populate("sharedWith.userId", "name email profilePic thumbnail_profile_pic compressed_profile_pic")

            const chainMap = new Map(chainDocs.map(d => [d._id.toString(), d]))

            // Collect all user IDs who are shared on ANY ancestor folder
            const ancestorSharedUserIds = new Set();
            for (const cid of chainIds) {
                if (cid.toString() === itemId.toString()) continue; // skip the current child item
                const ancestor = chainMap.get(cid.toString());
                if (ancestor?.sharedWith) {
                    ancestor.sharedWith.forEach(s => {
                        const uid = s.userId?._id || s.userId;
                        if (uid) ancestorSharedUserIds.add(uid.toString());
                    });
                }
            }

            // walk closest -> furthest, same order/logic as the old while loop
            for (const cid of chainIds) {
                const currentItem = chainMap.get(cid.toString())
                if (!currentItem) continue

                const isAncestor = cid.toString() !== itemId.toString()

                if (isAncestor) {
                    inheritedFolderOwner = {
                        userId: currentItem.owner._id,
                        name: currentItem.owner.name,
                        email: currentItem.owner.email,
                        profilePic: currentItem.owner.profilePic,
                        thumbnail_profile_pic: currentItem.owner.thumbnail_profile_pic,
                        compressed_profile_pic: currentItem.owner.compressed_profile_pic
                    };
                }

                if (currentItem.sharedWith && currentItem.sharedWith.length > 0) {
                    for (const s of currentItem.sharedWith) {
                        if (s.userId && !allSharedUsersMap.has(s.userId._id.toString())) {
                            allSharedUsersMap.set(s.userId._id.toString(), {
                                userId: s.userId._id,
                                name: s.userId.name,
                                email: s.userId.email,
                                profilePic: s.userId.profilePic,
                                thumbnail_profile_pic: s.userId.thumbnail_profile_pic,
                                compressed_profile_pic: s.userId.compressed_profile_pic,
                                permission: s.permission,
                                inherited: isAncestor,
                                hasParentAccess: ancestorSharedUserIds.has(s.userId._id.toString()),
                                inheritedFolderId: isAncestor ? cid : null,
                                inheritedFolderName: isAncestor ? currentItem.name : null
                            });
                        }
                    }
                }
            }

        } else if (permission === "viewer") {
            // here add the viewers own information to show 
            allSharedUsersMap.set(requesterId.toString(), {
                userId: req.user._id,
                name: req.user.name,
                email: req.user.email,
                permission: "viewer"
            })
        }



        // Convert our Map of unique users back into a standard Array
        const sharedWith = Array.from(allSharedUsersMap.values());

        // Send the final response to the frontend containing the owner details and the array of shared users
        res.json({ success: true, owner: ownerData, inheritedFolderOwner, sharedWith, permission })

    } catch (error) {
        // If any code above crashes, catch the error and return a 500 Server Error
        res.status(500).json({ success: false, message: error.message })
    }
}





export const searchUsers = async (req, res) => {
    try {
        const { query } = req.query
        const owner = req.user._id

        if (!query || query.trim().length < 2) {
            return res.status(400).json({ success: false, message: "Search query too short" })
        }

        const users = await userModel.find({
            _id: { $ne: owner },
            is_active: { $ne: false },
            $or: [
                { name: { $regex: query, $options: "i" } },
                { email: { $regex: query, $options: "i" } }
            ]
        }).select("_id name email profilePic thumbnail_profile_pic compressed_profile_pic").limit(10)

        res.json({ success: true, users })

    } catch (err) {
        logger.error(err);
        res.status(500).json({ success: false, message: err.message })
    }
}


//  permissino check middleware here
export const checkPermission = (...allowedRoles) => {
    return async (req, res, next) => {
        try {
            const itemId = req.params.id || req.params.itemId || req.body.itemId || req.body.id
            const userId = req.user._id

            const permission = await getUserPermission(userId, itemId)

            if (!permission || !allowedRoles.includes(permission)) {
                return res.status(403).json({ success: false, message: "Access denied" })
            }

            req.userPermission = permission
            next()

        } catch (err) {
            logger.error(err);
            res.status(500).json({ success: false, message: err.message })
        }
    }
}




//  when user click on the search input in the share user modal so defautl show this users here 
export const getSuggestedUsers = async (req, res) => {
    try {
        const currentUserID = req.user._id;
        const { itemId } = req.query

        const page = Math.max(parseInt(req.query.page) || 1, 1)
        const limit = Math.min(parseInt(req.query.limit) || 10, 30)
        const skip = (page - 1) * limit
        const needed = limit + 1   // one extra row tells us if there is a next page

        const USER_FIELDS = "name email profilePic thumbnail_profile_pic compressed_profile_pic"


        // 1. users to exclude: me + owner + everyone who already has access (incl. inherited)
        const excludeIds = new Set([currentUserID.toString()])


        if (itemId) {
            const item = await uploadModel.findById(itemId).select("ancestorIds")
            if (item) {
                const chainIds = [itemId, ...(item.ancestorIds || [])]
                const chainDocs = await uploadModel.find({ _id: { $in: chainIds } }).select("owner sharedWith")
                chainDocs.forEach(doc => {
                    if (doc.owner) excludeIds.add(doc.owner.toString())
                    doc.sharedWith?.forEach(s => s.userId && excludeIds.add(s.userId.toString()))
                })
            }
        }


        // 2. "recent" users = people I have shared with before (minus excluded)
        const recentIdsRaw = await uploadModel.distinct("sharedWith.userId", { owner: currentUserID })
        const recentIds = recentIdsRaw.filter(id => !excludeIds.has(id.toString()))

        const recentUsers = recentIds.length
            ? await userModel.find({ _id: { $in: recentIds }, is_active: { $ne: false } })
                .select(USER_FIELDS)
                .sort({ name: 1, _id: 1 })
            : []

        const recentCount = recentUsers.length

        // 3. treat it as ONE list: recent first, then everyone else alphabetically
        let users = recentUsers.slice(skip, skip + needed)

        if (users.length < needed) {
            const alphaSkip = Math.max(skip - recentCount, 0)
            const notIn = [...excludeIds, ...recentUsers.map(u => u._id.toString())]

            const alphabeticalUsers = await userModel.find({
                _id: { $nin: notIn },
                is_active: { $ne: false }
            })
                .select(USER_FIELDS)
                .sort({ name: 1, _id: 1 })
                .skip(alphaSkip)
                .limit(needed - users.length)

            users = [...users, ...alphabeticalUsers]
        }

        // 4. trim the extra row and report hasMore
        const hasMore = users.length > limit
        if (hasMore) users = users.slice(0, limit)

        return res.json({ success: true, users, hasMore, page })
    } catch (error) {
        logger.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}