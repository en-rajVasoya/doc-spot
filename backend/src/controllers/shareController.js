//  models - schema
import uploadModel from "#models/uploadModel";
import userModel from "#models/userModel";

//  utils
import { logger } from "#utils/logger";
import { getUserPermission } from "#utils/userPermissionUtil";

// ------------------------- SHARE FILE AND FOLDER CONTROLLER -------------------------------------

//  1) checking here if user have this current folder or file permsioon t oaccess it or not
// helper function

// 2)  remove user from share 
//  here if owner remove user from shared then all nested files and folder permission will be revoke here
const removeUserFromSubtree = async (parentId, owner, userId) => {
    const children = await uploadModel.find({ parent: parentId, owner })

    //  getting all childrean here of folder
    for (const child of children) {
        const hasDirectShare = child.sharedWith?.some(
            s => s.userId.toString() === userId.toString()
        )

        // if user has permsiion of childrean then remove it 
        if (hasDirectShare) {
            child.sharedWith = child.sharedWith.filter(
                s => s.userId.toString() !== userId.toString()
            )
            child.isShared = child.sharedWith.length > 0
            await child.save()
        }

        //  in childrean if there is a folder then call this function recursively
        if (child.type === "folder") {
            await removeUserFromSubtree(child._id, owner, userId)
        }
    }
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
        //  ------- STEP - 3 - Verify item ownership and verify targeted usr
        //  ##########################################

        //  only share item that current user actually  owns it
        const authorizedItems = await uploadModel.find({
            _id: { $in: itemIdList },   // getting all itmes document
            owner: currentUserId
        }).select("_id")

        //  from array of documents convert array of ids
        const authorizedItemIds = authorizedItems.map(i => i._id)

        // if there is no items found then return 
        if (authorizedItemIds.length === 0) {
            return res.status(404).json({ success: false, message: "No valid items found or you are not the owner" })
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

        //  when sharing if previous permission is there so remove previus permission and add new
        await uploadModel.updateMany(
            { _id: { $in: authorizedItemIds } },   // first get all items
            {
                $pull: {
                    sharedWith: { userId: { $in: targetUserIds } }    // pull will remove userId from array if exist
                }
            }
        )

        //  add user with selected permission and mark item as shared
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

        //  #####################################################################
        //  --- STEP - 5 - send scoket event
        // ######################################################################

        //  send each user socket event 
        targetUserIds.forEach(uid => {
            req.emitToUser(uid.toString(), "share_added", {
                itemIds: authorizedItemIds,
                message: `${authorizedItemIds.length} item(s) shared with you`,
            })
        })

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
        normalizedUserIds.push(currentUserId.toString());

        // #########################################################
        // ── STEP 2: Validate inputs ─────────────────────────────
        // #######################################################
        if (normalizedItemIds.length === 0) {
            return res.status(400).json({ success: false, message: "No items selected" })
        }

        // #########################################################
        // ── STEP 3: Verify ownership ────────────────────────────
        // ########################################################

        // only allow unsharing items that current user actually owns
        const ownedItems = await uploadModel.find({
            _id: { $in: normalizedItemIds },
            owner: currentUserId
        })
        //  if there is no item found or no owner is there so return
        if (ownedItems.length === 0) {
            return res.status(404).json({ success: false, message: "No items found or you are not the owner" });
        }

        //  conver document object into the array 
        const ownedItemIds = ownedItems.map(i => i._id)

        // ########################################################
        // ── STEP 4: Business logic ──────────────────────────
        // #######################################################

        // BFS walk through folders to find editor uploaded items
        // editor uploaded items must be moved to root before access is removed
        const editorItemsBulkOps = []
        const editorItemsMap = new Map()

        for (const item of ownedItems) {
            if (item.type !== "folder") continue

            let currentLevelIds = [item._id]

            while (currentLevelIds.length > 0) {
                const children = await uploadModel.find({
                    parent: { $in: currentLevelIds }
                }).populate("owner", "_id name profilePic").lean()

                // separate children uploaded by editor vs owner
                const editorUploadedChildren = children.filter(c => {
                    const childOwnerId = c.owner._id ? c.owner._id.toString() : c.owner.toString()
                    return normalizedUserIds.includes(childOwnerId)
                })

                //  userId - owner children
                const ownerUploadedChildren = children.filter(c => {
                    const childOwnerId = c.owner._id ? c.owner._id.toString() : c.owner.toString()
                    return !normalizedUserIds.includes(childOwnerId)
                })

                // move editor uploaded items to root so they dont get deleted with folder
                editorUploadedChildren.forEach(child => {
                    editorItemsBulkOps.push({
                        updateOne: {
                            filter: { _id: child._id },
                            update: { $set: { parent: null, isTrashed: false, trashedAt: null } }
                        }
                    })

                    // group moved items by editor for later socket updates
                    const editorId = child.owner._id ? child.owner._id.toString() : child.owner.toString()
                    if (!editorItemsMap.has(editorId)) editorItemsMap.set(editorId, [])
                    editorItemsMap.get(editorId).push({
                        itemId: child._id,
                        oldParent: child.parent,
                        movedItem: {
                            ...child,
                            parent: null,
                            isTrashed: false,
                            owner: {
                                _id: child.owner._id,
                                name: child.owner.name,
                                profilePic: child.owner.profilePic
                            },
                            storagePath: child.storagePath ? `/${child.storagePath}` : null
                        }
                    })
                })

                // only continue BFS through owner uploaded folders
                currentLevelIds = ownerUploadedChildren
                    .filter(c => c.type === "folder")
                    .map(c => c._id)
            }
        }

        // apply bulk move for editor items if any found
        if (editorItemsBulkOps.length > 0) {
            await uploadModel.bulkWrite(editorItemsBulkOps)
        }

        // remove target users from sharedWith on all owned items
        await uploadModel.updateMany(
            { _id: { $in: ownedItemIds } },
            {
                $pull: {
                    sharedWith: { userId: { $in: normalizedUserIds } }
                }
            }
        )

        // reset isShared flag on items that now have no shared users
        await uploadModel.updateMany(
            { _id: { $in: ownedItemIds }, sharedWith: { $size: 0 } },
            { $set: { isShared: false } }
        )

        // remove inherited permissions from all nested children in folder subtree
        for (const item of ownedItems) {
            if (item.type === "folder") {
                for (const userId of normalizedUserIds) {
                    await removeUserFromSubtree(item._id, currentUserId, userId)
                }
            }
        }

        // ##########################################################
        // ── STEP 5: Send each editor socket event ────────────────────────
        // ######################################################### 

        // notify each editor that their uploaded items have been moved to root
        editorItemsMap.forEach((items, editorId) => {
            items.forEach(({ itemId, oldParent, movedItem }) => {
                req.emitToUser(editorId, "item_moved", {
                    itemId,
                    oldParent,
                    newParent: null,
                    movedItem
                })
            })
        })

        // notify target users that their access has been removed
        normalizedUserIds.forEach(uid => {
            req.emitToUser(uid.toString(), "share_removed", { itemIds: ownedItemIds })
        })

        // ── STEP 6: Response ────────────────────────────────────
        res.json({ success: true, message: "Access removed" });

    } catch (error) {
        logger.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}



//  5) owner can see all user with file and folder access in modal
//  5) owner can see all user with file and folder access in modal (including inherited)
export const getSharedUsers = async (req, res) => {
    try {
        // Extract the target file/folder ID from the request URL parameters
        const { itemId } = req.params;
        // Get the ID of the user currently making the request (logged-in user)
        const requesterId = req.user._id;

        // Fetch the specific file or folder from the database, and also fetch the owner's profile details (name, email, profilePic)
        const targetItem = await uploadModel.findById(itemId).populate("owner", "name email profilePic");

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
            profilePic: targetItem.owner.profilePic
        }

        // Create a Map (like a dictionary) to store unique users who have access.
        // Using a Map prevents duplicate users if someone was shared on both a parent folder AND a child file.
        const allSharedUsersMap = new Map();

        // We only reveal the full list of shared users if the person requesting it is the actual "owner"
        if (permission === "owner") {
            // Start checking from the specific item the user clicked on
            let currentId = itemId;

            // Climb the folder tree to grab ALL users (Loops as long as currentId exists)
            while (currentId) {
                // Fetch the current item (file/folder) and populate the profile details of anyone it is shared with
                const currentItem = await uploadModel.findById(currentId)
                    .populate("sharedWith.userId", "name email profilePic");

                // If the item doesn't exist (failsafe), stop climbing the tree
                if (!currentItem) break;

                // Check if this specific item has anyone in its sharedWith array
                if (currentItem.sharedWith && currentItem.sharedWith.length > 0) {
                    // Loop through every user it is shared with
                    for (const s of currentItem.sharedWith) {
                        // If the user exists and we haven't already added them to our Map
                        if (s.userId && !allSharedUsersMap.has(s.userId._id.toString())) {
                            // Add them to the Map with their details
                            allSharedUsersMap.set(s.userId._id.toString(), {
                                userId: s.userId._id,
                                name: s.userId.name,
                                email: s.userId.email,
                                profilePic: s.userId.profilePic,
                                permission: s.permission, // "viewer" or "editor"
                                // Compare the ID of the folder we are currently checking against the original item the user clicked.
                                // If they are different, it means we climbed up the tree, so this access is "inherited".
                                inherited: currentId.toString() !== itemId.toString()
                            });
                        }
                    }
                }
                // Move up the tree: set the current ID to the parent folder's ID to check it in the next loop iteration
                currentId = currentItem.parent;
            }
        }

        // Convert our Map of unique users back into a standard Array
        const sharedWith = Array.from(allSharedUsersMap.values());

        // Send the final response to the frontend containing the owner details and the array of shared users
        res.json({ success: true, owner: ownerData, sharedWith })

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
        }).select("_id name email profilePic").limit(10)

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

        // 1 get the users that current user have shared history here
        const recentSharedUserIds = await uploadModel.distinct("sharedWith.userId", {
            owner: currentUserID
        })

        let suggestedUsers = []

        //  2. Fetch those recent users' details - 10 most
        if (recentSharedUserIds.length > 0) {
            suggestedUsers = await userModel.find({
                _id: { $in: recentSharedUserIds },
                is_active: { $ne: false }
            })
                .select("name email profilePic")
                .limit(10)
        }


        // 3 if we have less then 10 users in the shared user so rest show alphabatically users 
        if (suggestedUsers.length < 10) {
            const limitNeeded = 10 - suggestedUsers.length;

            // collect all ids we already have so we dont fetch this users here
            const existingIds = suggestedUsers.map(u => u._id.toString())

            // also exclude the current logged in user here
            existingIds.push(currentUserID.toString())

            const alphabeticalUsers = await userModel.find({
                _id: { $nin: existingIds },
                is_active: { $ne: false }
            })
                .select("name email profilePic")
                .sort({ name: 1 })
                .limit(limitNeeded)

            // 4. Combine recent users (top) with alphabetical users (bottom)
            suggestedUsers = [...suggestedUsers, ...alphabeticalUsers]
        }

        return res.json({ success: true, users: suggestedUsers })

    } catch (error) {
        logger.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}