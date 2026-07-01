import fs from "fs";

//  models - schema
import uploadModel from "#models/uploadModel";

//  utils
import { shareItem } from "./shareController.js";
import { getUserPermission, checkIsSharedTree  } from "#utils/userPermissionUtil";
import { logger } from "#utils/logger";
import { notifySharedUsers } from "#utils/userNotification";
import { updateParentFolderTimestamps } from "#utils/parentFolderTimestamp";
import { getAbsolutePath } from "#utils/pathHelper";
import { getFolderSizeRecursive } from "#utils/index";

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
          { type: "file", uploadStatus: "completed" }
        ]
      })
        .select("name type fileSize fileType createdAt updatedAt parent color isShared owner storagePath sharedWith")
        .populate("owner", "_id name profilePic")
        .sort(sortArray)
        .collation({ locale: "en", strength: 2 })   /// this is for sorting the case insensitive
        .lean()


      // 3) fix storage path here becuse in vite proxy we defined /files already so we modifed here ffiles and remove/files from url here
      const fixPath = (item) => ({
        ...item,
        storagePath: item.storagePath ? `/${item.storagePath}` : null
      })

      // 3) in front end shared folder icon is diffrent so we mark them so rotned know to change this icon here
      const markedItems = items.map(item => ({
        ...fixPath(item),
        permission,
        isSharedWithMe: permission !== "owner" 
                    || item.isShared 
                    || (item.sharedWith?.length > 0)
                    || isParentShared
      }))

      // --------------------------------------------------------------
      // ---- STEP 3.1: send response when ser insdie the folder
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

    // 1) here form data base we will get owned + shared with me all items in one query
    const allItems = await uploadModel.find({
      isTrashed: { $ne: true },
      $and: [
        {
          $or: [
            { owner: currentUserID },    // current user owned items
            { "sharedWith.userId": currentUserID }   // items shared with me
          ]
        },
        {
          $or: [
            { type: "folder" },
            { type: "file", uploadStatus: "completed" }
          ]
        },
        {
          //  only root level item that i owned
          //  and shared items with me 
          $or: [
            { owner: currentUserID, parent: null },
            { "sharedWith.userId": currentUserID }
          ]
        }
      ]
    })
      .select("name type fileSize fileType createdAt updatedAt parent color isShared owner storagePath sharedWith")
      .populate("owner", "_id name profilePic")
      .populate("sharedWith.userId", "_id name")
      .sort(sortArray)
      .collation({ locale: "en", strength: 2 })     /// this is for sorting the case insensitive
      .lean()

    // ---------------------------------------------------------------
    // ---- STEP 5: Fix storage path and mark shared items
    // ---------------------------------------------------------------

    // 1) fix storage path here becuse in vite proxy we defined /files already so we modifed here ffiles and remove/files from url here
    const fixPath = (item) => ({
      ...item,
      storagePath: item.storagePath ? `/${item.storagePath}` : null
    })

    // 2) in front end shared folder icon is diffrent so we mark them so rotned know to change this icon here
    const markedItems = allItems.map(item => {
      const isSharedWithMe = item.owner?._id?.toString() !== currentUserID.toString()

      // find permission in shared folder current user is editor or the viewer
      const sharedEntry = item.sharedWith?.find(
        s => s.userId?._id?.toString() === currentUserID.toString()
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
export const getFolderPath = async (req, res) => {
  try {
    // ------------------------------------------
    // --- STEP - 1 - retrieve folder ID from params
    // -----------------------------------------
    // id: folder ID from URL
    const { id } = req.params;
    // userId: current logged in user
    const userID = req.user._id

    // ------------------------------------------
    // --- STEP - 2 - build breadcrumb trail loop
    // -----------------------------------------
    const trail = [];
    let currentId = id;

    while (currentId) {
      const folderData = await uploadModel.findOne({
        _id: currentId,
        type: "folder"
      }).select("_id name parent owner sharedWith color isShared").lean();

      if (!folderData) break;

      const permission = await getUserPermission(userID, folderData._id)
      if (!permission) break;

      trail.unshift({ 
        id: folderData._id, 
        name: folderData.name,
        color: folderData.color,
        isShared: folderData.isShared,
        isSharedWithMe: permission !== "owner"
      })
      currentId = folderData.parent
    }

    if (!trail.length) {
      return res.status(404).json({ success: false, message: "Folder not found" });
    }

    // ------------------------------------------
    // --- STEP - 3 - get user permissions for folder
    // -----------------------------------------
    // get the permission of the current folder so viewer or editore here 
    const currentPermission = await getUserPermission(userID, id)

    // ------------------------------------------
    // --- STEP - 4 - fetch current folder details and send response
    // -----------------------------------------
    //  when user will refresh the page in the fodler so return all field so user can see everything here all info 
    const currentFolder = await uploadModel.findById(id).lean()

    res.json({ success: true, trail, currentPermission, currentFolder });

  } catch (error) {
    logger.error(error);
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
    const exists = await uploadModel.findOne({
      name: newName.trim(),
      parent: itemData.parent,
      owner: userID,
      _id: { $ne: id },
      isTrashed: { $ne: true }
    })

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

//  For delete files and folders
export const deleteItem = async (req, res) => {
  try {
    // ------------------------------------------
    // --- STEP - 1 - get item ID from body
    // -----------------------------------------
    const { id } = req.body;
    const userID = req.user._id;

    // ------------------------------------------
    // --- STEP - 2 - verify user is owner
    // -----------------------------------------
    //  here for shared folder or file only owner can delete them
    const permission = await getUserPermission(userID, id)
    if (permission !== "owner") {
      return res.status(403).json({ success: false, message: "Access denied" })
    }

    const itemData = await uploadModel.findOne({ _id: id });

    if (!itemData) {
      return res.status(404).json({ message: "Not Found" });
    }

    // ------------------------------------------
    // --- STEP - 3 - notify users via socket
    // -----------------------------------------
    // tell other users about the deleted item so it disappears from their screen
    await notifySharedUsers(itemData.parent || id, "item_deleted", { itemId: id, parentId: itemData.parent }, req.emitToUser)


    // ------------------------------------------
    // --- STEP - 4 - delete the item from disk and database
    // -----------------------------------------
    // FILE check here for storage count before deleting from disk
    if (itemData.type === "file") {
      const count = await uploadModel.countDocuments({ storagePath: itemData.storagePath })
      const itemAbsPath = getAbsolutePath(itemData.storagePath)
      if (count === 1 && itemAbsPath && fs.existsSync(itemAbsPath)) {
        fs.unlinkSync(itemAbsPath)
      }
      await uploadModel.deleteOne({ _id: id });
      return res.status(200).json({ success: true, message: "Deleted" });
    }

    // if delete folder delete also nested children recursive delete
    const deleteRecursive = async (parentID) => {
      const children = await uploadModel.find({ parent: parentID });

      for (const child of children) {
        if (child.type === "folder") {
          await deleteRecursive(child._id);
        } else if (child.type === "file") {
          const count = await uploadModel.countDocuments({ storagePath: child.storagePath })
          const childAbsPath = getAbsolutePath(child.storagePath)
          if (count === 1 && childAbsPath && fs.existsSync(childAbsPath)) {
            fs.unlinkSync(childAbsPath)
          }
        }
        await uploadModel.deleteOne({ _id: child._id });
      }
    };

    await deleteRecursive(id);
    await uploadModel.deleteOne({ _id: id });

    return res.status(200).json({ success: true, message: "Deleted" });

  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: error.message });
  }
};

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

    return res.status(200).json({ success: true, message: "Color Changed" })

  } catch (error) {
    logger.error(error);
    res.status(500).json({ success: false, message: error.message })
  }
}

//  movine folder or file here 
export const moveItem = async (req, res) => {
  try {
    // ------------------------------------------
    // --- STEP - 1 - get item ID and destination ID
    // -----------------------------------------
    const { itemId: itemID, destinationId: destinationID } = req.body;

    // ------------------------------------------
    // --- STEP - 2 - verify permissions on item
    // -----------------------------------------
    //  checking here permission if owner or editor
    const permission = await getUserPermission(req.user._id, itemID)

    if (!permission || !["owner", "editor"].includes(permission)) {
      return res.status(403).json({ success: false, message: "Access denied" })
    }

    const itemData = await uploadModel.findOne({ _id: itemID })
    if (!itemData) {
      return res.status(404).json({ success: false, message: "Item not found" })
    }

    // editor can only move their own items not owenr items 
    if (permission === "editor" && itemData.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "You can only move items you uploaded" })
    }

    // ------------------------------------------
    // --- STEP - 3 - check if moving to same folder or itself
    // -----------------------------------------
    // if folder or file already in that location
    const destIdStr = destinationID ? destinationID.toString() : null
    const currentParentStr = itemData.parent ? itemData.parent.toString() : null
    if (currentParentStr === destIdStr) {
      return res.status(400).json({ success: false, message: "item is already in this folder" })
    }

    // can't move into itself
    if (destinationID && itemData._id.toString() === destinationID.toString()) {
      return res.status(400).json({ success: false, message: "Cannot move a folder into itself" });
    }

    // ------------------------------------------
    // --- STEP - 4 - verify destination permissions and status
    // -----------------------------------------
    // validation destination folder exists or not
    if (destinationID) {
      const destPermission = await getUserPermission(req.user._id, destinationID)
      if (!destPermission || !["owner", "editor"].includes(destPermission)) {
        return res.status(403).json({ success: false, message: "Access denied" })
      }

      const destination = await uploadModel.findOne({
        _id: destinationID,
        type: "folder"
      })
      if (!destination) {
        return res.status(404).json({ success: false, message: "Destination folder not found" });
      }
      if (destination.isTrashed) {
        return res.status(400).json({ success: false, message: "Cannot move items into a trashed folder" });
      }
    }

    // ------------------------------------------
    // --- STEP - 5 - prevent moving folder into its own subfolder
    // -----------------------------------------
    // circular reference check
    if (itemData.type === "folder" && destinationID) {
      let currentId = destinationID;
      while (currentId) {
        if (currentId.toString() === itemData._id.toString()) {
          return res.status(400).json({
            message: "Cannot move a folder into its own subfolder"
          });
        }
        const parent = await uploadModel.findOne({ _id: currentId }).select("parent");
        if (!parent) break;
        currentId = parent.parent;
      }
    }

    // ------------------------------------------
    // --- STEP - 6 - check for name conflicts in destination
    // -----------------------------------------
    // shared folder: editor-uploaded items keep editor as owner until someone else moves them
    const targetOwnerId =
      itemData.owner.toString() !== req.user._id.toString()
        ? req.user._id
        : itemData.owner

    // name conflict check (scoped to target owner)
    const conflict = await uploadModel.findOne({
      name: itemData.name,
      parent: destinationID || null,
      owner: targetOwnerId,
      _id: { $ne: itemID },
      isTrashed: { $ne: true }
    })
    if (conflict) {
      return res.status(400).json({
        message: `A ${conflict.type} named "${itemData.name}" already exists in the destination`
      });
    }

    const oldParent = itemData.parent
    itemData.parent = destinationID || null

    // ------------------------------------------
    // --- STEP - 7 - transfer ownership if needed and save
    // -----------------------------------------
    // transfer ownership only in shared-folder case (e.g. main owner moving editor upload)
    if (itemData.owner.toString() !== req.user._id.toString()) {
      itemData.owner = req.user._id

      if (itemData.type === "folder") {
        const updateOwnerRecursive = async (parentId, newOwnerId) => {
          const children = await uploadModel.find({ parent: parentId })
          for (const child of children) {
            child.owner = newOwnerId
            await child.save()
            if (child.type === "folder") {
              await updateOwnerRecursive(child._id, newOwnerId)
            }
          }
        }
        await updateOwnerRecursive(itemData._id, req.user._id)
      }
    }

    await itemData.save()

    const movedItem = {
      ...itemData.toObject(),
      storagePath: itemData.storagePath ? `/${itemData.storagePath}` : null,
      owner: {
        _id: req.user._id,
        name: req.user.name,
        profilePic: req.user.profilePic
      }
    }

    // ------------------------------------------
    // --- STEP - 8 - notify users and send response
    // -----------------------------------------
    // tell users in the old folder to remove the item from their screen
    if (oldParent) {
      await notifySharedUsers(oldParent, "item_moved", { itemId: itemID, oldParent, newParent: destinationID || null, movedItem }, req.emitToUser)
    }
    // await notifySharedUsers(itemId, "item_moved", { itemId, oldParent, newParent: destinationID || null, movedItem }, req.emitToUser)

    // tell users in the new folder to show the new item on their screen
    if (destinationID) {
      await notifySharedUsers(destinationID, "item_moved", { itemId: itemID, oldParent, newParent: destinationID || null, movedItem }, req.emitToUser)
    }

    res.json({ success: true, item: movedItem });

  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: error.message });
  }
}

//  copy item here 
export const copyItem = async (req, res) => {
  try {
    // ------------------------------------------
    // --- STEP - 1 - get item ID and destination ID
    // -----------------------------------------
    const { itemId, destinationId } = req.body;
    const userID = req.user._id;
    const userName = req.user.name;
    const userProfilePic = req.user.profilePic;

    // ------------------------------------------
    // --- STEP - 2 - verify permissions to copy
    // -----------------------------------------
    //  for shared folder and file only owenr and editor
    const permission = await getUserPermission(userID, itemId)
    if (!permission || permission === "viewer") {
      return res.status(403).json({ success: false, message: "Viewers cannot copy items" })
    }

    // ------------------------------------------
    // --- STEP - 3 - fetch item being copied
    // -----------------------------------------
    // ── 1. Fetch item being copied ──────────────────────────────────
    const itemData = await uploadModel.findOne({ _id: itemId });
    if (!itemData) {
      return res.status(404).json({ message: "Item not found" });
    }

    // ------------------------------------------
    // --- STEP - 4 - validate destination exists and is writable
    // -----------------------------------------
    // ── 2. Validate destination exists ─────────────────────────────
    if (destinationId) {
      const destPermission = await getUserPermission(userID, destinationId)
      if (!destPermission || !["owner", "editor"].includes(destPermission)) {
        return res.status(403).json({ success: false, message: "Access denied" })
      }

      const destination = await uploadModel.findOne({
        _id: destinationId,
        type: "folder"
      });
      if (!destination) {
        return res.status(404).json({ message: "Destination folder not found" });
      }
      if (destination.isTrashed) {
        return res.status(400).json({ success: false, message: "Cannot copy items into a trashed folder" });
      }
    }

    // ------------------------------------------
    // --- STEP - 5 - handle name conflicts
    // -----------------------------------------
    // ── 3. Name conflict check ──────────────────────────────────────
    let copyName = itemData.name;
    const conflict = await uploadModel.findOne({
      name: copyName,
      parent: destinationId || null,
      isTrashed: { $ne: true }
    });
    if (conflict) {
      // append - Copy to name
      const ext = copyName.includes(".")
        ? "." + copyName.split(".").pop()
        : "";
      const base = copyName.includes(".")
        ? copyName.substring(0, copyName.lastIndexOf("."))
        : copyName;
      copyName = ext ? `${base} - Copy${ext}` : `${base} - Copy`;
    }

    // ------------------------------------------
    // --- STEP - 6 - recursive copy function for folders
    // -----------------------------------------
    // ── 4. Recursive copy function ──────────────────────────────────
    const copyRecursive = async (sourceItem, newParentId, newName) => {
      const newDoc = await uploadModel.create({
        name: newName || sourceItem.name,
        type: sourceItem.type,
        parent: newParentId,
        owner: userID,
        fingerprint: sourceItem.fingerprint,
        fileSize: sourceItem.fileSize,
        fileType: sourceItem.fileType,
        storagePath: sourceItem.storagePath, // same path on disk
        uploadStatus: sourceItem.type === "file" ? "completed" : null,
        color: sourceItem.color,
        uploadId: null,
        totalChunks: sourceItem.totalChunks,
        refCount: 1,
        lastActivity: null,
      });

      // if folder → copy all children recursively
      if (sourceItem.type === "folder") {
        const children = await uploadModel.find({
          parent: sourceItem._id,
          isTrashed: { $ne: true }
        });

        for (const child of children) {
          await copyRecursive(child, newDoc._id, null)
        }
      }

      return newDoc;
    }

    // ------------------------------------------
    // --- STEP - 7 - execute copy, notify users, send response
    // -----------------------------------------
    // ── 5. Do the copy ──────────────────────────────────────────────
    const newItem = await copyRecursive(itemData, destinationId || null, copyName);

    const fixedItem = {
      ...newItem.toObject(),
      storagePath: newItem.storagePath ? `/${newItem.storagePath}` : null,
      owner: {
        _id: userID,
        name: userName,
        profilePic: userProfilePic
      }
    }

    // tell other users about the copied item so it shows on their screen
    await notifySharedUsers(destinationId || null, "item_copied", {
      parentId: destinationId || null,
      newItem: fixedItem
    }, req.emitToUser)

    res.json({ success: true, item: fixedItem });

  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: error.message });
  }
};

//  for creating new empty folde here
export const createFolder = async (req, res) => {
  try {
    // ------------------------------------------
    // --- STEP - 1 - retrieve folder name and parent folder ID from body
    // -----------------------------------------
    // name: name for the new folder
    // parentId: parent directory ID of new folder
    const { name, parentId } = req.body;

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
    if (parentId) {
      // parentFolder: database document of the parent directory
      const parentFolder = await uploadModel.findById(parentId).select("isTrashed");
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
      return res.status(400).json({ message: "Folder already exists" })
    }


    // ------------------------------------------
    // --- STEP - 4 - create the new folder in database
    // -----------------------------------------
    // create folder
    const folder = await uploadModel.create({
      name,
      parent: parentId || null,
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

    if (parentId) {
      await updateParentFolderTimestamps(parentId);
    }

    if (parentId) {
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
    const {id} = req.params;
    
    const currentUserID = req.user._id

    // 1. Verify that the folder actually exists and is a folder
    const folder = await uploadModel.findOne({ _id: id, type: "folder" })
    if(!folder){
      return res.status(404).json({ success: false, message: "Folder not found" });
    }


    // 2. check permission user has access this folder permission or not 
    const permission = await getUserPermission(currentUserID, id)
    if(!permission){
       return res.status(403).json({ success: false, message: "Access denied" });
    }


    // 3. with the helper function calculate the size of fodler - graphlookup 
    const size = await getFolderSizeRecursive(id)

    return res.status(200).json({ success: true, size });

  } catch (error) {
    logger.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
}