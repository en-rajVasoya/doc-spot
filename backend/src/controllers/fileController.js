






import fs from "fs";

//  models - schema
import uploadModel from "#models/uploadModel";

import mongoose from "mongoose";

//  services 
import { getStorage } from "../services/storageFactory.js";

//  configs 
import { getFileUrl } from "#config/s3";

//  utils
import { shareItem } from "./shareController.js";
import { getUserPermission, checkIsSharedTree } from "#utils/userPermissionUtil";
import { logger } from "#utils/logger";
import { notifySharedUsers } from "#utils/userNotification";
import { updateParentFolderTimestamps } from "#utils/parentFolderTimestamp";
import { getAbsolutePath } from "#utils/pathHelper";
import { getFolderSizeRecursive } from "#utils/index";
import { updateFolderSizeTree } from "#utils/getFolderSizeHelper";

//  helper function for socket notify all user that some change made

// ------------------- CONTROLERS FOR FILE MANAGEMENT ----------------------------

// NOTE - this function is with the Lazzy loading here for future
// export const getUserFiles = async (req, res) => {
//   try {

//     //  ---------------------------------------------------------------------
//     // --- STEP - 1 - Getting input parament here
//     // ---------------------------------------------------------------------

//     // if front end sends a parent here so user is isnde a specific folder or parent is null so user is in the main Root leel 
//     const parent =
//       !req.query.parent || req.query.parent === "null"
//         ? null
//         : req.query.parent

//     const userId = req.user._id


//     //  ---------------------------------------------------------------------
//     // --- STEP - 2 - Lazy scrolling value
//     // ---------------------------------------------------------------------
//     const limit = parseInt(req.query.limit) || 50
//     const skip = parseInt(req.query.skip) || 0



//     //  ---------------------------------------------------------------------
//     // --- STEP - 3 - At root level how many folder and files is there 
//     // ---------------------------------------------------------------------
//     if (!parent) {
//       // this will return all items in root level owner is current_user, not trashed  and parent is null
//       const ownCount = await uploadModel.countDocuments({
//         owner: userId,
//         parent: null,
//         isTrashed: { $ne: true },
//         $or: [
//           { type: "folder" },
//           { type: "file", uploadStatus: "completed" }
//         ]
//       })

//       //  ---------------------------------------------------------------------
//       // --- STEP - 4 - At root level owner item and shared item display 
//       // ---------------------------------------------------------------------
//       /*
//         at root level owne item and shared item fetch from db 
//         this calulation will split the pagination 
//         first owner folder then shared fodler then files in this order folder always comes first 
//       */
//       const ownSkip = Math.min(skip, ownCount)
//       const ownLimit = Math.min(limit, ownCount - ownSkip)

//       const sharedSkip = Math.max(0, skip - ownCount)
//       const sharedLimit = Math.max(0, limit - ownLimit)



//       //  ---------------------------------------------------------------------
//       // --- STEP - 4 - Owned item fetch 
//       // ---------------------------------------------------------------------
//       // thsi fucntion will return current user owne all files and folder counts for pagination 
//       const ownItems = await uploadModel.find({
//         owner: userId,
//         parent: null,
//         isTrashed: { $ne: true },
//         $or: [
//           { type: "folder" },
//           { type: "file", uploadStatus: "completed" }
//         ]
//       })
//         .select(
//           "name type fileSize fileType createdAt parent color isShared owner storagePath sharedWith"
//         )
//         .populate("owner", "_id name profilePic")
//         .populate("sharedWith.userId", "_id name")
//         .sort({ type: -1, createdAt: -1 })
//         .skip(ownSkip)
//         .limit(ownLimit)
//         .lean()


//       //  ---------------------------------------------------------------------
//       // --- STEP - 4 - Fech all shared item that have sahred with me
//       // ---------------------------------------------------------------------
//       const sharedItems = await uploadModel.find({
//         "sharedWith.userId": userId,
//         isTrashed: { $ne: true },
//         $or: [
//           { type: "folder" },
//           { type: "file", uploadStatus: "completed" }
//         ]
//       })
//         .select(
//           "name type fileSize fileType createdAt parent color isShared owner storagePath sharedWith"
//         )
//         .populate("owner", "_id name profilePic")
//         .populate("sharedWith.userId", "_id name")
//         .sort({ type: -1, createdAt: -1 })
//         .skip(sharedSkip)
//         .limit(sharedLimit)
//         .lean()

//       // here we are doing owne items and shared items count
//       const sharedCount = await uploadModel.countDocuments({
//         "sharedWith.userId": userId,
//         isTrashed: { $ne: true },
//         $or: [
//           { type: "folder" },
//           { type: "file", uploadStatus: "completed" }
//         ]
//       })

//       const total = ownCount + sharedCount

//       // only first request send all ids
//       let allIds = []

//       if (skip === 0) {
//         const [ownIds, sharedIds] = await Promise.all([
//           uploadModel.find({
//             owner: userId,
//             parent: null,
//             isTrashed: { $ne: true },
//             $or: [
//               { type: "folder" },
//               { type: "file", uploadStatus: "completed" }
//             ]
//           })
//             .select("_id")
//             .lean(),

//           uploadModel.find({
//             "sharedWith.userId": userId,
//             isTrashed: { $ne: true },
//             $or: [
//               { type: "folder" },
//               { type: "file", uploadStatus: "completed" }
//             ]
//           })
//             .select("_id")
//             .lean()
//         ])

//         allIds = [
//           ...ownIds.map(i => i._id),
//           ...sharedIds.map(i => i._id)
//         ]
//       }

//       // fix storage path
//       const fixPath = (item) => ({
//         ...item,
//         storagePath: item.storagePath
//           ? item.storagePath.split("files")[1]?.replace(/\\/g, "/")
//           : null
//       })

//       // mark shared items
//       const markedSharedItems = sharedItems.map(item => ({
//         ...fixPath(item),
//         isSharedWithMe: true,
//         permission:
//           item.sharedWith.find(
//             s => s.userId?._id?.toString() === userId.toString()
//           )?.permission || null
//       }))

//       //  here sorting here all folders with shared and non shared
//       const allItems = [
//         ...ownItems.map(fixPath),
//         ...markedSharedItems
//       ]

//       allItems.sort((a, b) => {
//         if (a.type !== b.type) return a.type === "folder" ? -1 : 1
//         return new Date(b.createdAt) - new Date(a.createdAt)
//       })

//       return res.status(200).json({
//         success: true,
//         items: allItems,
//         allIds,
//         total,
//         hasMore:
//           skip + (ownItems.length + sharedItems.length) < total
//       })
//     }

//     // INSIDE FOLDER

//     // permission check
//     const permission = await getUserPermission(userId, parent)

//     if (!permission) {
//       return res.status(403).json({
//         success: false,
//         message: "Access denied"
//       })
//     }

//     // folder items
//     const items = await uploadModel.find({
//       parent,
//       isTrashed: { $ne: true },
//       $or: [
//         { type: "folder" },
//         { type: "file", uploadStatus: "completed" }
//       ]
//     })
//       .select(
//         "name type fileSize fileType createdAt parent color isShared owner storagePath sharedWith"
//       )
//       .populate("owner", "_id name profilePic")
//       .populate("sharedWith.userId", "_id name")
//       .sort({ type: -1, createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean()

//     // total
//     const total = await uploadModel.countDocuments({
//       parent,
//       isTrashed: { $ne: true },
//       $or: [
//         { type: "folder" },
//         { type: "file", uploadStatus: "completed" }
//       ]
//     })

//     // all ids only first request
//     let allIds = []

//     if (skip === 0) {
//       const idDocs = await uploadModel.find({
//         parent,
//         isTrashed: { $ne: true },
//         $or: [
//           { type: "folder" },
//           { type: "file", uploadStatus: "completed" }
//         ]
//       })
//         .select("_id")
//         .lean()

//       allIds = idDocs.map(i => i._id)
//     }

//     // fix path
//     const fixPath = (item) => ({
//       ...item,
//       storagePath: item.storagePath
//         ? item.storagePath.split("files")[1]?.replace(/\\/g, "/")
//         : null
//     })

//     const markedItems = items.map(item => ({
//       ...fixPath(item),
//       permission,
//       isSharedWithMe: permission !== "owner"
//     }))

//     return res.status(200).json({
//       success: true,
//       items: markedItems,
//       allIds,
//       total,
//       hasMore: skip + items.length < total
//     })

//   } catch (error) {
//     logger.error(error);
//     return res.status(500).json({
//       success: false,
//       message: error.message
//     })
//   }
// }



// Get user files and folder
export const getUserFiles = async (req, res) => {
  try {
    // --------------------------------------------------------------
    // ---- STEP 1: Get query params
    // --------------------------------------------------------------

    // 1) if front end sends a parent here so user is isnde a specific folder or parent is null so user is in the main Root leel 
    const parentID =
      !req.query.parent || req.query.parent === "null" ? null : req.query.parent

    // 2) getting current logged in user
    const currentUserID = req.user._id

    // 3) get sorting parament from front end
    const sortBy = req.query.sortBy || "modified"     // default sorting by the modified
    const sortOrder = req.query.sortOrder || "desc"   // default is descending order
    const order = sortOrder === "asc" ? 1 : -1

    // --------------------------------------------------------------
    // ---- STEP 2: Build sort object
    // --------------------------------------------------------------

    // folders always comes first then all files
    let sortField = "createdAt"

    if (sortBy === "name") {
      sortField = "name"
    } else if (sortBy === "size") {
      sortField = "fileSize"
    } else if (sortBy === "modified") {
      sortField = "updatedAt"
    }

    // creating array of sort and type -1 folder always comes first then file
    const sortArray = [
      ["type", -1],
      [sortField, order],
      ["createdAt", -1]    // if we have two same name item so newest one will appear first 
    ]

    // --------------------------------------------------------------
    // ---- STEP 3: User is browesing inside the folder so validation
    // ---------------------------------------------------------------
    if (parentID) {
      // 1) check permission can user will have permission to view 
      const permission = await getUserPermission(currentUserID, parentID)
      if (!permission) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        })
      }

      const isParentShared = await checkIsSharedTree(parentID);

      // 2) if user have permission so fetch all items inside folder where paent is this folder and not trashed one
      const items = await uploadModel.find({
        parent: parentID,
        isTrashed: { $ne: true },
        //  get the both folder or the file 
        $or: [
          { type: "folder" },
          { type: "file", uploadStatus: "completed", scanStatus: { $ne: "scanning" } }
        ]
      })
        .select("name type fileSize totalSize fileType createdAt updatedAt parent color isShared owner storagePath sharedWith isTrashed")
        .populate("owner", "_id name profilePic")
        .populate("sharedWith.userId", "_id name")
        .sort(sortArray)
        .collation({ locale: "en", strength: 2 })   /// this is for sorting the case insensitive
        .lean()


      //  for inside the folder to show user in list view shared field
      const parentDoc = await uploadModel.findById(parentID).select("ancestorIds sharedWith").lean()
      const chainIds = parentDoc ? [parentID, ...(parentDoc.ancestorIds || []).slice().reverse()] : [parentID]

      const chainDocs = await uploadModel.find({ _id: { $in: chainIds } })
        .select("_id sharedWith")
        .populate("sharedWith.userId", "_id name")
        .lean()

      const chainMap = new Map(chainDocs.map(d => [d._id.toString(), d]))

      let inheritedSharedWith = []
      for (const id of chainIds) {
        const doc = chainMap.get(id.toString())
        if (doc?.sharedWith?.length > 0) {
          inheritedSharedWith = doc.sharedWith
          break   // closest ancestor with a non-empty sharedWith wins
        }
      }

      // 3) fix storage path here becuse in vite proxy we defined /files already so we modifed here ffiles and remove/files from url here
      const isS3 = process.env.STORAGE_PROVIDER === "s3";
      const fixPath = (item) => {
        if (!item.storagePath) return item
        return { ...item, storagePath: `/${item.storagePath}` };
      }

      // 3) in front end shared folder icon is diffrent so we mark them so rotned know to change this icon here 
      const markedItems = items.map(item => {
        const ownOverride = item.sharedWith?.find(s => {
          const sUid = s.userId?._id ? s.userId._id.toString() : s.userId?.toString()
          return sUid === currentUserID.toString()
        })


        const effectivePermission = ownOverride ? ownOverride.permission : permission

        // this item's own explicit share list wins if it has one, else inherit from nearest ancestor
        const displaySharedWith = (item.sharedWith && item.sharedWith.length > 0)
          ? item.sharedWith
          : inheritedSharedWith

        return {
          ...fixPath(item),
          permission: effectivePermission,
          sharedWith: displaySharedWith,
          isSharedWithMe: effectivePermission !== "owner"
            || item.isShared
            || (item.sharedWith?.length > 0)
            || isParentShared
        }
      })

      // --------------------------------------------------------------
      // ---- STEP 3.1: send response when user inside the folder
      // ---------------------------------------------------------------
      return res.status(200).json({
        success: true,
        items: markedItems,
        total: markedItems.length
      })
    }

    // ---------------------------------------------------------------
    // ---- STEP 4: Root level - fetch owned + shared together
    // ---------------------------------------------------------------

    // 1) first find the every item from data base where thsi user shared with array 
    const allSharedMatches = await uploadModel.find({
      "sharedWith.userId": currentUserID,
      isTrashed: { $ne: true }
    }).select("_id ancestorIds").lean()

    const sharedIdSet = new Set(allSharedMatches.map(i => i._id.toString()))

    //  keep show only items that parent is not shared with the same user
    const topLevelSharedIds = allSharedMatches
      .filter(item => !(item.ancestorIds || []).some(a => sharedIdSet.has(a.toString())))
      .map(item => item._id)

    //  keep only ones where no ancestor is shared
    const allItems = await uploadModel.find({
      isTrashed: { $ne: true },
      $and: [
        {
          $or: [
            { owner: currentUserID },    // current user owned items
            { _id: { $in: topLevelSharedIds } }
          ]
        },
        {
          $or: [
            { type: "folder" },
            { type: "file", uploadStatus: "completed", scanStatus: { $ne: "scanning" } }
          ]
        },
        {
          //  only root level item that i owned
          //  and shared items with me 
          $or: [
            { owner: currentUserID, parent: null },
            { _id: { $in: topLevelSharedIds } }
          ]
        }
      ]
    })
      .select("name type fileSize totalSize fileType createdAt updatedAt parent color isShared owner storagePath sharedWith isTrashed")
      .populate("owner", "_id name profilePic")
      .populate("sharedWith.userId", "_id name")
      .sort(sortArray)
      .collation({ locale: "en", strength: 2 })     /// this is for sorting the case insensitive
      .lean()

    // ---------------------------------------------------------------
    // ---- STEP 5: Fix storage path and mark shared items
    // ---------------------------------------------------------------

    // 1) fix storage path here becuse in vite proxy we defined /files already so we modifed here ffiles and remove/files from url here
    const isS3 = process.env.STORAGE_PROVIDER === "s3";

    const fixPath = (item) => {
      if (!item.storagePath) return item;

      // --- CloudFront / S3 Full URL Logic (Commented out for Backend Proxy) ---
      // if (isS3) {
      //   return { ...item, storagePath: getFileUrl(item.storagePath) };
      // }
      // ------------------------------------------------------------------------

      return { ...item, storagePath: `/${item.storagePath}` };
    };

    // 2) in front end shared folder icon is diffrent so we mark them so rotned know to change this icon here
    const markedItems = allItems.map(item => {
      const isSharedWithMe = item.owner?._id?.toString() !== currentUserID.toString()

      // find permission in shared folder current user is editor or the viewer
      const sharedEntry = item.sharedWith?.find(
        s => {
          const uid = s.userId?._id ? s.userId._id.toString() : s.userId?.toString();
          return uid === currentUserID.toString();
        }
      )

      return {
        ...fixPath(item),
        isSharedWithMe,
        permission: isSharedWithMe ? (sharedEntry?.permission || null) : "owner"
      }
    })

    // ---------------------------------------------------------
    // ---- STEP 6: Send response
    // ---------------------------------------------------------
    return res.status(200).json({ success: true, items: markedItems, total: markedItems.length })

  } catch (error) {
    logger.error(error)
    return res.status(500).json({ success: false, message: error.message })
  }

}

// get current folder when user double cliks on the folder
// get current folder when user double cliks on the folder
export const getFolderPath = async (req, res) => {
  try {
    // ------------------------------------------
    // --- STEP - 1 - retrieve folder ID and user
    // -----------------------------------------
    const { id } = req.params;
    const userID = req.user._id

    // ------------------------------------------
    // --- STEP - 2 - fetch current folder details 
    // -----------------------------------------
    // We fetch this first so we know the ancestorIds history right away
    const currentFolder = await uploadModel.findById(id).lean()
    if (!currentFolder) {
      return res.status(404).json({ success: false, message: "Folder not found" });
    }

    // ------------------------------------------
    // --- STEP - 3 - build breadcrumb trail instantly
    // -----------------------------------------
    const trail = [];

    // Combine history + current folder into one array
    const lineageIds = [...(currentFolder.ancestorIds || []), id];

    // Fetch every single folder in the breadcrumb path in ONE query
    const lineageFolders = await uploadModel.find({
      _id: { $in: lineageIds },
      type: "folder"
    }).select("_id name owner sharedWith color isShared").lean();

    // Iterate backwards (bottom-up) exactly like your old while loop did!
    for (let i = lineageIds.length - 1; i >= 0; i--) {
      const folderId = lineageIds[i].toString();
      const folderData = lineageFolders.find(f => f._id.toString() === folderId);

      if (!folderData) break;

      // Check if the user has permission for this level
      const permission = await getUserPermission(userID, folderData._id)

      // If they are a shared user and hit a folder they weren't invited to, stop building!
      if (!permission) break;

      trail.unshift({
        id: folderData._id,
        name: folderData.name,
        color: folderData.color,
        isShared: folderData.isShared,
        isSharedWithMe: permission !== "owner"
      })
    }

    if (!trail.length) {
      return res.status(404).json({ success: false, message: "Folder not found or access denied" });
    }

    // ------------------------------------------
    // --- STEP - 4 - get user permissions for folder
    // -----------------------------------------
    const currentPermission = await getUserPermission(userID, id)

    res.json({ success: true, trail, currentPermission, currentFolder });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
}


//  rename file and folders
export const renameItem = async (req, res) => {
  try {
    // ------------------------------------------
    // --- STEP - 1 - get ID and new name from body
    // -----------------------------------------
    // id: item ID
    // newName: new name to set
    const { id, newName } = req.body;
    const userID = req.user._id;

    if (!newName || !newName.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }

    // ------------------------------------------
    // --- STEP - 2 - check permissions
    // -----------------------------------------
    // here for shared folder or file check if owner or editor other wise permission denied
    const permission = await getUserPermission(userID, id)
    if (!permission || !["owner", "editor"].includes(permission)) {
      return res.status(403).json({ success: false, message: "Access denied" })
    }

    // ------------------------------------------
    // --- STEP - 3 - find the item in database
    // -----------------------------------------
    //  first find the exact item here
    const itemData = await uploadModel.findOne({ _id: id })

    if (!itemData) {
      return res.status(400).json({ success: false, message: "Not Found" })
    }

    // ------------------------------------------
    // --- STEP - 4 - prevent duplicate names in same folder
    // -----------------------------------------
    //  prevent same name inside current folder
    const conflictQuery = {
      name: newName.trim(),
      parent: itemData.parent,
      _id: { $ne: id },
      isTrashed: { $ne: true }
    };

    if (!itemData.parent) {
      conflictQuery.owner = userID;
    }

    const exists = await uploadModel.findOne(conflictQuery);

    if (exists) {
      return res.status(400).json({ message: "Name already exists in this folder" });
    }

    // ------------------------------------------
    // --- STEP - 5 - update name and save
    // -----------------------------------------
    //  rename it
    itemData.name = newName.trim()
    await itemData.save()

    // ------------------------------------------
    // --- STEP - 6 - notify others and send response
    // -----------------------------------------
    // tell other users about the renamed item so their screen updates automatically
    await notifySharedUsers(id, "item_renamed", { itemId: id, parentId: itemData.parent, newName: itemData.name }, req.emitToUser)


    res.json({ success: true, item: itemData });

  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: error.message });
  }
}



//  here user can change folder color like red green yellow
export const changeItemColor = async (req, res) => {
  try {
    // ------------------------------------------
    // --- STEP - 1 - get folder IDs and color from body
    // -----------------------------------------
    const { ids, color } = req.body;
    const userID = req.user._id;

    //  validation - if no folder selection
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "Please select a Folder" })
    }

    //  validation - if no color selected
    if (!color) {
      return res.status(400).json({ success: false, message: "Please select color" })
    }

    // ------------------------------------------
    // --- STEP - 2 - verify permissions for all items
    // -----------------------------------------
    //  check here permission here only owner and editor have 
    for (const id of ids) {
      const permission = await getUserPermission(userID, id)
      if (!permission || !["owner", "editor"].includes(permission)) {
        return res.status(403).json({ success: false, message: "Access denied" })
      }
    }

    // ------------------------------------------
    // --- STEP - 3 - update color in database
    // -----------------------------------------
    // only for folder update color
    await uploadModel.updateMany({
      _id: { $in: ids },
      type: "folder"
    },
      {
        $set: { color }
      }
    );

    // ------------------------------------------
    // --- STEP - 4 - notify users via socket
    // -----------------------------------------
    // tell other users about the color change so their screen updates automatically
    for (const id of ids) {
      await notifySharedUsers(id, "item_color_changed", { itemId: id, color }, req.emitToUser)
    }

    return res.status(200).json({ success: true, message: "Folder Color Changed" })

  } catch (error) {
    logger.error(error);
    res.status(500).json({ success: false, message: error.message })
  }
}

//  movine folder or file here 
export const moveItem = async (req, res) => {
  try {
    const { itemId: itemID, destinationId: destinationID } = req.body;

    // ── 1. Verify permissions on item ────────────────────────────────
    const permission = await getUserPermission(req.user._id, itemID)
    if (!permission || !["owner", "editor"].includes(permission)) {
      return res.status(403).json({ success: false, message: "Access denied" })
    }

    const itemData = await uploadModel.findOne({ _id: itemID })
    if (!itemData) {
      return res.status(404).json({ success: false, message: "Item not found" })
    }

    // editor can only move their own items not owner items 
    if (permission === "editor" && itemData.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "You can only move items you uploaded" })
    }

    // ── 2. Check if moving to same folder or itself ──────────────────
    const destIdStr = destinationID ? destinationID.toString() : null
    const currentParentStr = itemData.parent ? itemData.parent.toString() : null
    if (currentParentStr === destIdStr) {
      return res.status(400).json({ success: false, message: "item is already in this folder" })
    }

    if (destinationID && itemData._id.toString() === destinationID.toString()) {
      return res.status(400).json({ success: false, message: "Cannot move a folder into itself" });
    }

    // ── 3. Verify destination permissions and status ─────────────────
    let destination = null;
    if (destinationID) {
      const destPermission = await getUserPermission(req.user._id, destinationID)
      if (!destPermission || !["owner", "editor"].includes(destPermission)) {
        return res.status(403).json({ success: false, message: "Access denied" })
      }

      // We select ancestorIds here so we can instantly check the history
      destination = await uploadModel.findOne({
        _id: destinationID,
        type: "folder"
      }).select("isTrashed ancestorIds");

      if (!destination) {
        return res.status(404).json({ success: false, message: "Destination folder not found" });
      }
      if (destination.isTrashed) {
        return res.status(400).json({ success: false, message: "Cannot move items into a trashed folder" });
      }
    }

    // ── 4. Prevent moving folder into its own subfolder ─────────────
    if (itemData.type === "folder" && destinationID) {
      // Instant array check replaces the slow while loop!
      if (destination && destination.ancestorIds && destination.ancestorIds.some(id => id.toString() === itemData._id.toString())) {
        return res.status(400).json({
          message: "Cannot move a folder into its own subfolder"
        });
      }
    }

    // ── 5. Check for name conflicts ──────────────────────────────────
    const targetOwnerId =
      itemData.owner.toString() !== req.user._id.toString()
        ? req.user._id
        : itemData.owner

    const conflictQuery = {
      name: itemData.name,
      parent: destinationID || null,
      _id: { $ne: itemID },
      isTrashed: { $ne: true }
    };

    if (!destinationID) {
      conflictQuery.owner = targetOwnerId;
    }

    const conflict = await uploadModel.findOne(conflictQuery);
    if (conflict) {
      return res.status(400).json({
        message: `A ${conflict.type} named "${itemData.name}" already exists in the destination`
      });
    }

    const oldParent = itemData.parent
    itemData.parent = destinationID || null

    // ── 6. Transfer ownership and apply flattened bulk update ─────────

    // 1) Rebuild the ancestors array for the moved item itself
    let newAncestors = [];
    if (destinationID && destination) {
      newAncestors = [...(destination.ancestorIds || []), destinationID];
    }
    itemData.ancestorIds = newAncestors;

    if (itemData.owner.toString() !== req.user._id.toString()) {
      itemData.owner = req.user._id
    }

    await itemData.save()

    // 2) Update ALL children's ancestors (and ownership) 
    if (itemData.type === "folder") {
      const children = await uploadModel.find({ ancestorIds: itemData._id }).select("ancestorIds owner");

      if (children.length > 0) {
        const bulkOps = children.map(child => {
          // Find where the moved folder is in the child's lineage
          const idx = child.ancestorIds.findIndex(id => id.toString() === itemData._id.toString());

          // Slice out everything below the moved folder (the internal subtree structure)
          const subtreeAncestors = child.ancestorIds.slice(idx);

          return {
            updateOne: {
              filter: { _id: child._id },
              update: {
                $set: {
                  // Prepend the new location to the internal structure
                  ancestorIds: [...newAncestors, ...subtreeAncestors],
                  owner: req.user._id
                }
              }
            }
          }
        });

        //  single bulkWrite 
        await uploadModel.bulkWrite(bulkOps, { ordered: false });
      }
    }

    // ── 7. Update folder sizes ────────────────────────────────────────
    const sizeToMove = itemData.type === "folder" ? itemData.totalSize : itemData.fileSize

    if (sizeToMove) {
      if (oldParent) {
        await updateFolderSizeTree(oldParent, -sizeToMove)
      }
      if (destinationID) {
        await updateFolderSizeTree(destinationID, sizeToMove)
      }
    }

    // ── 8. Real-time Notifications ────────────────────────────────────
    const isDestShared = destinationID ? await checkIsSharedTree(destinationID) : false

    const movedItem = {
      ...itemData.toObject(),
      isShared: isDestShared || Boolean(itemData.isShared) || (itemData.sharedWith?.length > 0),
      isSharedWithMe: isDestShared || Boolean(itemData.isShared) || (itemData.sharedWith?.length > 0),
      storagePath: itemData.storagePath ? `/${itemData.storagePath}` : null,
      owner: {
        _id: req.user._id,
        name: req.user.name,
        profilePic: req.user.profilePic
      }
    }

    if (oldParent) {
      await notifySharedUsers(oldParent, "item_moved", { itemId: itemID, oldParent, newParent: destinationID || null, movedItem }, req.emitToUser)
    }

    if (destinationID) {
      await notifySharedUsers(destinationID, "item_moved", { itemId: itemID, oldParent, newParent: destinationID || null, movedItem }, req.emitToUser)
    }

    res.json({ success: true, item: movedItem });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}


//  copy item here 
// export const copyItem = async (req, res) => {
//   req.setTimeout(10 * 60 * 1000); // 10 minutes
//   res.setTimeout(10 * 60 * 1000);
//   try {
//     const { itemId, destinationId } = req.body;
//     const userID = req.user._id;
//     const userName = req.user.name;
//     const userProfilePic = req.user.profilePic;

//     // ── 1. Verify permissions ──────────────────────────────────
//     const permission = await getUserPermission(userID, itemId)
//     if (!permission || permission === "viewer") {
//       return res.status(403).json({ success: false, message: "Viewers cannot copy items" })
//     }

//     // ── 2. Fetch item being copied ──────────────────────────────────
//     const itemData = await uploadModel.findOne({ _id: itemId });
//     if (!itemData) {
//       return res.status(404).json({ message: "Item not found" });
//     }

//     // ── 3. Validate destination exists & check circular logic ──────────
//     let destination = null;
//     if (destinationId) {
//       const destPermission = await getUserPermission(userID, destinationId)
//       if (!destPermission || !["owner", "editor"].includes(destPermission)) {
//         return res.status(403).json({ success: false, message: "Access denied" })
//       }

//       // We select ancestorIds here so we can instantly check the history
//       destination = await uploadModel.findOne({ _id: destinationId, type: "folder" }).select("isTrashed ancestorIds");

//       if (!destination) {
//         return res.status(404).json({ message: "Destination folder not found" });
//       }
//       if (destination.isTrashed) {
//         return res.status(400).json({ success: false, message: "Cannot copy items into a trashed folder" });
//       }
//     }

//     // No more slow while-loop! Just check the array instantly.
//     if (itemData.type === "folder" && destinationId) {
//       if (destination && destination.ancestorIds && destination.ancestorIds.some(id => id.toString() === itemData._id.toString())) {
//         return res.status(400).json({
//           success: false,
//           message: "Cannot copy a folder into itself or its own subfolder"
//         });
//       }
//     }

//     // ── 4. Handle name conflicts ──────────────────────────────────
//     let copyName = itemData.name;
//     const conflict = await uploadModel.findOne({
//       name: copyName,
//       parent: destinationId || null,
//       isTrashed: { $ne: true }
//     });

//     if (conflict) {
//       const ext = copyName.includes(".") ? "." + copyName.split(".").pop() : "";
//       const base = copyName.includes(".") ? copyName.substring(0, copyName.lastIndexOf(".")) : copyName;
//       let counter = 1;
//       let newName = `${base} - Copy${ext}`;
//       while (await uploadModel.findOne({
//         name: newName,
//         parent: destinationId || null,
//         isTrashed: { $ne: true }
//       })) {
//         counter++;
//         newName = `${base} - Copy (${counter})${ext}`;
//       }
//       copyName = newName;
//     }

//     // ── 5. Claude's Safe Recursive Copy ──────────────────────────────────
//     const copyRecursive = async (sourceItem, newParentId, newName, newParentAncestors = []) => {
//       let currentRefCount = 1

//       if (sourceItem.type === "file" && sourceItem.storagePath) {
//         await uploadModel.updateMany(
//           { storagePath: sourceItem.storagePath },
//           { $inc: { refCount: 1 } }
//         )
//         const updatedSource = await uploadModel.findOne({ _id: sourceItem._id }).select("refCount")
//         currentRefCount = updatedSource?.refCount || 1
//       }

//       const newDoc = await uploadModel.create({
//         name: newName || sourceItem.name,
//         type: sourceItem.type,
//         parent: newParentId,
//         ancestorIds: newParentAncestors,
//         owner: userID,
//         fingerprint: sourceItem.fingerprint,
//         fileSize: sourceItem.fileSize,
//         fileType: sourceItem.fileType,
//         storagePath: sourceItem.storagePath,
//         uploadStatus: sourceItem.type === "file" ? "completed" : null,
//         color: sourceItem.color,
//         uploadId: null,
//         totalChunks: sourceItem.totalChunks,
//         refCount: sourceItem.type === "file" ? currentRefCount : 1,
//         lastActivity: null,
//       });

//       if (sourceItem.type === "folder") {
//         const children = await uploadModel.find({
//           parent: sourceItem._id,
//           isTrashed: { $ne: true }
//         });

//         // children's ancestorIds = this new folder's ancestorIds + this new folder's own id
//         const childAncestors = [...newParentAncestors, newDoc._id]

//         for (const child of children) {
//           await copyRecursive(child, newDoc._id, null, childAncestors)
//         }
//       }

//       return newDoc;
//     }

//     // Calculate destination ancestors and call Claude's version
//     const destinationAncestors = destination ? [...(destination.ancestorIds || []), destinationId] : [];
//     const newItem = await copyRecursive(itemData, destinationId || null, copyName, destinationAncestors);

//     // ── 6. Size updates & notifications ──────────────────────────────────
//     const sizeToAdd = newItem.type === "folder" ? newItem.totalSize : newItem.fileSize;
//     if (sizeToAdd && destinationId) {
//       await updateFolderSizeTree(destinationId, sizeToAdd);
//     }

//     const isDestShared = destinationId ? await checkIsSharedTree(destinationId) : false;

//     const fixedItem = {
//       ...newItem.toObject(),
//       isShared: isDestShared || Boolean(newItem.isShared) || (newItem.sharedWith?.length > 0),
//       isSharedWithMe: isDestShared || Boolean(newItem.isShared) || (newItem.sharedWith?.length > 0),
//       storagePath: newItem.storagePath ? `/${newItem.storagePath}` : null,
//       owner: {
//         _id: userID,
//         name: userName,
//         profilePic: userProfilePic
//       }
//     }

//     if (destinationId) {
//       await notifySharedUsers(destinationId, "item_copied", {
//         parentId: destinationId,
//         newItem: fixedItem
//       }, req.emitToUser);
//     } else {
//       req.emitToUser(userID.toString(), "item_copied", {
//         parentId: null,
//         newItem: fixedItem
//       });
//     }

//     res.json({ success: true, item: fixedItem });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// }


export const copyItem = async (req, res) => {
  try {
    // ------------------------------------------
    // --- STEP - 1 - retrieve info from body
    // -----------------------------------------
    const { itemId, destinationId } = req.body;
    const userID = req.user._id;
    const userName = req.user.name;
    const userProfilePic = req.user.profilePic;

    //  permision check does user have permision to copy item there
    const permission = await getUserPermission(userID, itemId)
    if (!permission || permission === "viewer") {
      return res.status(403).json({ success: false, message: "Viewers cannot copy items" })
    }

    //  find that item if exist or not
    const itemData = await uploadModel.findOne({ _id: itemId });
    if (!itemData) {
      return res.status(404).json({ message: "Item not found" });
    }


    // -----------------------------------------------------
    // --- STEP - 2 - validation on the destination folder
    // -----------------------------------------------------
    let destination = null
    if (destinationId) {
      const destPermission = await getUserPermission(userID, destinationId)

      // viewer cannot copy 
      if (!destPermission || !["owner", "editor"].includes(destPermission)) {
        return res.status(403).json({ success: false, message: "Access denied" })
      }

      // trash and destibnatino not found
      destination = await uploadModel.findOne({ _id: destinationId, type: "folder" }).select("isTrashed ancestorIds")

      // destination not found
      if (!destination) {
        return res.status(404).json({ message: "Destination folder not found" });
      }

      //  if trash fodler
      if (destination.isTrashed) {
        return res.status(400).json({ success: false, message: "Cannot copy items into a trashed folder" });
      }

    }


    // if user try to make copy on its folder or sub folder
    if (itemData.type === "folder" && destinationId) {
      if (destination && destination.ancestorIds && destination.ancestorIds.some(id => id.toString() === itemData._id.toString())) {
        return res.status(400).json({
          success: false,
          message: "Cannot copy a folder into itself or its own subfolder"
        });

      }
    }


    // -----------------------------------------------------
    // --- STEP - 3 - Handle name conflict - if same name of item exist change name to (1) (2) (3)
    // -----------------------------------------------------
    let copyName = itemData.name;
    const conflict = await uploadModel.findOne({
      name: copyName,
      parent: destinationId || null,
      isTrashed: { $ne: true }
    });

    if (conflict) {
      const ext = copyName.includes(".") ? "." + copyName.split(".").pop() : "";
      const base = copyName.includes(".") ? copyName.substring(0, copyName.lastIndexOf(".")) : copyName;
      let counter = 1;
      let newName = `${base} - Copy${ext}`;
      while (await uploadModel.findOne({
        name: newName,
        parent: destinationId || null,
        isTrashed: { $ne: true }
      })) {
        counter++;
        newName = `${base} - Copy (${counter})${ext}`;
      }
      copyName = newName;
    }


    //  here we are fetching all the destination folder ancestor in on array [id1, id2, id3] when copy happens so quick assign
    const destinationAncestors = destination ? [...(destination.ancestorIds || []), destinationId] : []


    // -----------------------------------------------------
    // --- STEP - 3 - If folder so getting all the child item data 
    // -----------------------------------------------------
    const descendants = itemData.type === "folder"
      ? await uploadModel.find({
        ancestorIds: itemData._id,
        isTrashed: { $ne: true }
      }).lean()
      : []

    //  here we are combining the root folder and child fodler in to the list 
    const allSourceDocs = [itemData.toObject(), ...descendants]

    //  here we are assing all new documents new mongo id in the memory 
    const idMap = new Map()
    allSourceDocs.forEach(doc => {
      idMap.set(doc._id.toString(), new mongoose.Types.ObjectId())
    })

    // here if cpy item is the file so increnet that refCount
    const filePaths = [...new Set(
      allSourceDocs
        .filter(d => d.type === "file" && d.storagePath)
        .map(d => d.storagePath)
    )]

    let refCountMap = new Map()
    if (filePaths.length > 0) {
      await uploadModel.updateMany(
        { storagePath: { $in: filePaths } },
        { $inc: { refCount: 1 } }
      )

      //  getting the new refCount so when copy happens so we can assign thsi ref count in the new doucment 
      const updatedCounts = await uploadModel.find({
        storagePath: { $in: filePaths }
      }).select("storagePath refCount").lean()

      updatedCounts.forEach(doc => {
        const current = refCountMap.get(doc.storagePath) || 0
        if (doc.refCount > current) refCountMap.set(doc.storagePath, doc.refCount)
      })
    }

    // -----------------------------------------------------
    // --- STEP - 4 - copy all documents
    // -----------------------------------------------------
    const newDocs = allSourceDocs.map(doc => {
      //  get all the new ID
      const newId = idMap.get(doc._id.toString())
      //  to knwo which is the root fodler of being copy here
      const isRoot = doc._id.toString() === itemData._id.toString()

      let newParent;
      let newAncestorIds;

      if (isRoot) {
        newParent = destinationId || null
        newAncestorIds = destinationAncestors

      } else {
        newParent = idMap.get(doc.parent?.toString()) || null

        // every item and child we need to asing new ancestor id here or update it every document
        const rootIdx = doc.ancestorIds.findIndex(id => id.toString() === itemData._id.toString())
        const subtreeOldAncestors = doc.ancestorIds.slice(rootIdx)
        const mappedSubtreeAncestors = subtreeOldAncestors.map(id => idMap.get(id.toString()))
        newAncestorIds = [...destinationAncestors, ...mappedSubtreeAncestors]
      }

      const newRefCount = doc.type === "file" && doc.storagePath
        ? (refCountMap.get(doc.storagePath) || 1)
        : 1


      return {
        _id: newId,
        name: isRoot ? copyName : doc.name,
        type: doc.type,
        parent: newParent,
        ancestorIds: newAncestorIds,
        owner: userID,
        fingerprint: doc.fingerprint || null,
        fileSize: doc.fileSize || null,
        fileType: doc.fileType || null,
        storagePath: doc.storagePath || null,
        uploadStatus: doc.type === "file" ? "completed" : null,
        color: doc.color,
        uploadId: null,
        totalChunks: doc.totalChunks || null,
        refCount: newRefCount,
        lastActivity: null,
        totalSize: doc.type === "folder" ? (doc.totalSize || 0) : 0
      }
    })


    // -----------------------------------------------------
    // --- STEP - 4 - Insert everything in the one operation
    // -----------------------------------------------------
    const insertedDocs = await uploadModel.insertMany(newDocs)
    const newItem = insertedDocs.find(d => d._id.toString() === idMap.get(itemData._id.toString()).toString())


    //  size update and send notification
    const sizeToAdd = newItem.type === "folder" ? newItem.totalSize : newItem.fileSize;
    if (sizeToAdd && destinationId) {
      await updateFolderSizeTree(destinationId, sizeToAdd);
    }

    const isDestShared = destinationId ? await checkIsSharedTree(destinationId) : false;

    const fixedItem = {
      ...newItem.toObject ? newItem.toObject() : newItem,
      isShared: isDestShared || Boolean(newItem.isShared) || (newItem.sharedWith?.length > 0),
      isSharedWithMe: isDestShared || Boolean(newItem.isShared) || (newItem.sharedWith?.length > 0),
      storagePath: newItem.storagePath ? `/${newItem.storagePath}` : null,
      owner: {
        _id: userID,
        name: userName,
        profilePic: userProfilePic
      }
    }

    if (destinationId) {
      await notifySharedUsers(destinationId, "item_copied", {
        parentId: destinationId,
        newItem: fixedItem
      }, req.emitToUser);

    } else {
      req.emitToUser(userID.toString(), "item_copied", {
        parentId: null,
        newItem: fixedItem
      });
    }

    res.json({ success: true, item: fixedItem });



  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });

  }
}


//  for creating new empty folde here
export const createFolder = async (req, res) => {
  try {
    // ------------------------------------------
    // --- STEP - 1 - retrieve folder name and parent folder ID from body
    // -----------------------------------------
    // name: name for the new folder
    // parentId: parent directory ID of new folder
    if (req.body.name) req.body.name = req.body.name.trim();
    let { name, parentId } = req.body;
    
    // Fix string "null" from frontend form data
    if (parentId === "null" || parentId === "undefined") {
        parentId = null;
    }

    // userId: authorized user ID from auth middleware
    const userID = req.user._id;
    const userName = req.user.name;
    const userProfilePic = req.user.profilePic;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Folder name is required" })
    }

    // ------------------------------------------
    // --- STEP - 2 - verify parent directory is valid and writable
    // -----------------------------------------
    // check permissions and trash status for the parent folder
    let parentFolder = null
    if (parentId) {
      // parentFolder: database document of the parent directory
      parentFolder = await uploadModel.findById(parentId).select("isTrashed ancestorIds");
      if (parentFolder && parentFolder.isTrashed) {
        return res.status(400).json({
          success: false,
          message: "Cannot create folder in a trashed folder"
        });
      }

      // permission: permission level of current user on parent folder
      const permission = await getUserPermission(userID, parentId)
      if (!permission || !["owner", "editor"].includes(permission)) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to create folders here"
        })
      }
    }


    // ------------------------------------------
    // --- STEP - 3 - check for duplicate folder name inside parent directory
    // -----------------------------------------
    // exists: check if folder with same name exists
    const exists = await uploadModel.findOne({
      name,
      parent: parentId || null,
      owner: userID,
      type: "folder",
      isTrashed: { $ne: true }
    })

    if (exists) {
      return res.status(400).json({ message: "Folder name already exists" })
    }

    //  if item has any parent so save all ancestore id in to the array otherwise empty array
    const parentObjId = parentId && mongoose.Types.ObjectId.isValid(parentId) ? new mongoose.Types.ObjectId(parentId) : parentId;
    const ancestorIds = parentFolder
      ? [...(parentFolder.ancestorIds || []), parentObjId]
      : [];
    // ------------------------------------------
    // --- STEP - 4 - create the new folder in database
    // -----------------------------------------
    // create folder
    const folder = await uploadModel.create({
      name,
      parent: parentId || null,
      ancestorIds,
      owner: userID,
      type: "folder"
    })

    // ------------------------------------------
    // --- STEP - 5 - notify shared users and send response
    // -----------------------------------------
    const isParentShared = await checkIsSharedTree(parentId)
    const folderWithOwner = {
      ...folder.toObject(),
      isShared: isParentShared,
      owner: {
        _id: userID,
        name: userName,
        profilePic: userProfilePic
      }
    }

    // if (parentId) {
    //   await updateParentFolderTimestamps(parentId);
    // }

    if (parentId) {
      await updateParentFolderTimestamps(parentId);
      // tell other users about the new folder so it shows on their screen
      await notifySharedUsers(parentId, "item_folder_created", {
        parentId: String(parentId),
        newFolder: folderWithOwner
      }, req.emitToUser)
    }

    res.status(201).json({ folder: folderWithOwner })

  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: "Failed to create folder" })
  }
}






//  this unction is used for calculating the folder total size
export const getFolderSize = async (req, res) => {
  try {
    const { id } = req.params;

    const currentUserID = req.user._id

    // 1. Verify that the folder actually exists and is a folder
    const folder = await uploadModel.findOne({ _id: id, type: "folder" })
    if (!folder) {
      return res.status(404).json({ success: false, message: "Folder not found" });
    }


    // 2. check permission user has access this folder permission or not 
    const permission = await getUserPermission(currentUserID, id)
    if (!permission) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }


    // 3. Return latest stored totalSize directly from DB (O(1) fast lookup)
    const size = folder.totalSize || 0;


    //  so thsi is for the folder child count how many file and folder inside
    const itemCount = await uploadModel.aggregate([
      {
        $match: {
          ancestorIds: folder._id,
          isTrashed: { $ne: true },
          $or: [
            { type: "folder" },
            { type: "file", uploadStatus: "completed" }
          ]
        }
      },
      { $group: { _id: "$type", count: { $sum: 1 } } }
    ]);


    // Extract the numbers from the result
    let folderCount = 0;
    let fileCount = 0;


    itemCount.forEach(stat => {
      if (stat._id === "folder") folderCount = stat.count;
      if (stat._id === "file") fileCount = stat.count;
    });

    const contentsString = `${folderCount} Folders, ${fileCount} Files`;

    return res.status(200).json({ success: true, size, contentsString });

  } catch (error) {
    logger.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

