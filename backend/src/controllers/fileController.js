







import fs from "fs";

//  models - schema
import uploadModel from "#models/uploadModel";

//  utils
import { shareItem } from "./shareController.js";
import { getUserPermission } from "#utils/userPermissionUtil";
import { logger } from "#utils/logger";
import { notifySharedUsers } from "#utils/userNotification";
import { updateParentFolderTimestamps } from "#utils/parentFolderTimestamp";




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
    const parentId =
      !req.query.parent || req.query.parent === "null" ? null : req.query.parent

    // 2) getting current logged in user
    const currentUserId = req.user._id

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
    if (parentId) {
      // 1) check permission can user will have permission to view 
      const permission = await getUserPermission(currentUserId, parentId)
      if (!permission) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        })
      }

      // 2) if user have permission so fetch all items inside folder where paent is this folder and not trashed one
      const items = await uploadModel.find({
        parent: parentId,
        isTrashed: { $ne: true },
        //  get the both folder or the file 
        $or: [
          { type: "folder" },
          { type: "file", uploadStatus: "completed" }
        ]
      })
        .select("name type fileSize fileType createdAt parent color isShared owner storagePath sharedWith")
        .populate("owner", "_id name profilePic")
        .sort(sortArray)
        .collation({ locale: "en", strength: 2 })   /// this is for sorting the case insensitive
        .lean()


      // 3) fix storage path here becuse in vite proxy we defined /files already so we modifed here ffiles and remove/files from url here
      const fixPath = (item) => ({
        ...item,
        storagePath: item.storagePath
          ? item.storagePath.split("files")[1]?.replace(/\\/g, "/")
          : null
      })

      // 3) in front end shared folder icon is diffrent so we mark them so rotned know to change this icon here
      const markedItems = items.map(item => ({
        ...fixPath(item),
        permission,
        isSharedWithMe: permission !== "owner"
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
            { owner: currentUserId },    // current user owned items
            { "sharedWith.userId": currentUserId }   // items shared with me
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
            { owner: currentUserId, parent: null },
            { "sharedWith.userId": currentUserId }
          ]
        }
      ]
    })
      .select("name type fileSize fileType createdAt parent color isShared owner storagePath sharedWith")
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
      storagePath: item.storagePath
        ? item.storagePath.split("files")[1]?.replace(/\\/g, "/")
        : null
    })

    // 2) in front end shared folder icon is diffrent so we mark them so rotned know to change this icon here
    const markedItems = allItems.map(item => {
      const isSharedWithMe = item.owner?._id?.toString() !== currentUserId.toString()

      // find permission in shared folder current user is editor or the viewer
      const sharedEntry = item.sharedWith?.find(
        s => s.userId?._id?.toString() === currentUserId.toString()
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
    return res.status(200).json({
      success: true,
      items: markedItems,
      total: markedItems.length
    })

  } catch (error) {
    logger.error(error)
    return res.status(500).json({
      success: false,
      message: error.message
    })
  }

}


// get current folder when user double cliks on the folder
export const getFolderPath = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id

    const trail = [];
    let currentId = id;

    while (currentId) {
      const folder = await uploadModel.findOne({
        _id: currentId,
        type: "folder"
      }).select("_id name parent owner sharedWith").lean();

      if (!folder) break;

      const permission = await getUserPermission(userId, folder._id)
      if (!permission) break;

      trail.unshift({ id: folder._id, name: folder.name })
      currentId = folder.parent
    }

    if (!trail.length) {
      return res.status(404).json({ success: false, message: "Folder not found" });
    }

    // get the permission of the current folder so viewer or editore here 
    const currentPermission = await getUserPermission(userId, id)


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
    const { id, newName } = req.body;

    if (!newName || !newName.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }

    // here for shared folder or file check if owner or editor other wise permission denied
    const permission = await getUserPermission(req.user._id, id)
    if (!permission || !["owner", "editor"].includes(permission)) {
      return res.status(403).json({ success: false, message: "Access denied" })
    }

    //  first find the exact item here
    const item = await uploadModel.findOne({
      _id: id
    })

    if (!item) {
      return res.status(400).json({ success: false, message: "Not Found" })
    }

    //  prevent same name inside current folder
    const exists = await uploadModel.findOne({
      name: newName.trim(),
      parent: item.parent,
      owner: req.user._id,
      _id: { $ne: id },
      isTrashed: { $ne: true }
    })

    if (exists) {
      return res.status(400).json({ message: "Name already exists in this folder" });
    }

    //  rename it
    item.name = newName.trim()
    await item.save()

    // socket evetn to nofify other user here
    await notifySharedUsers(id, "item_renamed", { itemId: id, parentId: item.parent, newName: item.name }, req.emitToUser)


    res.json({ success: true, item });

  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: error.message });
  }
}





//  For delete files and folders
export const deleteItem = async (req, res) => {
  try {
    const { id } = req.body;


    //  here for shared folder or file only owner can delete them
    const permission = await getUserPermission(req.user._id, id)
    if (permission !== "owner") {
      return res.status(403).json({ success: false, message: "Access denied" })
    }

    const item = await uploadModel.findOne({
      _id: id
    });

    if (!item) {
      return res.status(404).json({ message: "Not Found" });
    }


    // socket here for notify all users
    await notifySharedUsers(item.parent || id, "item_deleted", { itemId: id, parentId: item.parent }, req.emitToUser)


    // FILE check here for storage count before deleting from disk
    if (item.type === "file") {
      const count = await uploadModel.countDocuments({ storagePath: item.storagePath })
      if (count === 1 && item.storagePath && fs.existsSync(item.storagePath)) {
        fs.unlinkSync(item.storagePath)
      }
      await uploadModel.deleteOne({ _id: id });
      return res.status(200).json({ success: true, message: "Deleted" });
    }

    // if delete folder delete also nested children recursive delete
    const deleteRecursive = async (parentId) => {
      const children = await uploadModel.find({ parent: parentId });

      for (const child of children) {
        if (child.type === "folder") {
          await deleteRecursive(child._id);
        } else if (child.type === "file") {
          const count = await uploadModel.countDocuments({ storagePath: child.storagePath })
          if (count === 1 && child.storagePath && fs.existsSync(child.storagePath)) {
            fs.unlinkSync(child.storagePath)
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
    const { ids, color } = req.body;

    //  validation - if no folder selection
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "Please select a Folder" })
    }

    //  validation - if no color selected
    if (!color) {
      return res.status(400).json({ success: false, message: "Please select color" })
    }


    //  check here permission here only owner and editor have 
    for (const id of ids) {
      const permission = await getUserPermission(req.user._id, id)
      if (!permission || !["owner", "editor"].includes(permission)) {
        return res.status(403).json({ success: false, message: "Access denied" })
      }
    }

    // only for folder update color
    await uploadModel.updateMany({
      _id: { $in: ids },
      type: "folder"
    },
      {
        $set: { color }
      }
    )


    //  socket event for other uses
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
    const { itemId, destinationId } = req.body;


    //  checking here permission if owner or editor
    const permission = await getUserPermission(req.user._id, itemId)
    console.log("permission", permission)
    if (!permission || !["owner", "editor"].includes(permission)) {
      return res.status(403).json({ success: false, message: "Access denied" })
    }

    const item = await uploadModel.findOne({ _id: itemId })
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" })
    }

    // editor can only move their own items not owenr items 
    if (permission === "editor" && item.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "You can only move items you uploaded" })
    }



    // if folder or file already in that location
    const destIdStr = destinationId ? destinationId.toString() : null
    const currentParentStr = item.parent ? item.parent.toString() : null
    if (currentParentStr === destIdStr) {
      return res.status(400).json({ success: false, message: "item is already in this folder" })
    }

    // can't move into itself
    if (destinationId && item._id.toString() === destinationId.toString()) {
      return res.status(400).json({ success: false, message: "Cannot move a folder into itself" });
    }

    // validation destination folder exists or not
    if (destinationId) {
      const destPermission = await getUserPermission(req.user._id, destinationId)
      if (!destPermission || !["owner", "editor"].includes(destPermission)) {
        return res.status(403).json({ success: false, message: "Access denied" })
      }

      const destination = await uploadModel.findOne({
        _id: destinationId,
        type: "folder"
      })
      if (!destination) {
        return res.status(404).json({ success: false, message: "Destination folder not found" });
      }
      if (destination.isTrashed) {
        return res.status(400).json({ success: false, message: "Cannot move items into a trashed folder" });
      }
    }

    // circular reference check
    if (item.type === "folder" && destinationId) {
      let currentId = destinationId;
      while (currentId) {
        if (currentId.toString() === item._id.toString()) {
          return res.status(400).json({
            message: "Cannot move a folder into its own subfolder"
          });
        }
        const parent = await uploadModel.findOne({ _id: currentId }).select("parent");
        if (!parent) break;
        currentId = parent.parent;
      }
    }

    // shared folder: editor-uploaded items keep editor as owner until someone else moves them
    const targetOwnerId =
      item.owner.toString() !== req.user._id.toString()
        ? req.user._id
        : item.owner

    // name conflict check (scoped to target owner)
    const conflict = await uploadModel.findOne({
      name: item.name,
      parent: destinationId || null,
      owner: targetOwnerId,
      _id: { $ne: itemId },
      isTrashed: { $ne: true }
    })
    if (conflict) {
      return res.status(400).json({
        message: `A ${conflict.type} named "${item.name}" already exists in the destination`
      });
    }

    const oldParent = item.parent
    item.parent = destinationId || null

    // transfer ownership only in shared-folder case (e.g. main owner moving editor upload)
    if (item.owner.toString() !== req.user._id.toString()) {
      item.owner = req.user._id

      if (item.type === "folder") {
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
        await updateOwnerRecursive(item._id, req.user._id)
      }
    }

    await item.save()

    const movedItem = {
      ...item.toObject(),
      storagePath: item.storagePath ? item.storagePath.split("/files")[1]?.replace(/\\/g, "/") : null,
      owner: {
        _id: req.user._id,
        name: req.user.name,
        profilePic: req.user.profilePic
      }
    }


    //  when item moved so this one is for notify user that this item is disspear from screen 
    if (oldParent) {
      await notifySharedUsers(oldParent, "item_moved", { itemId, oldParent, newParent: destinationId || null, movedItem }, req.emitToUser)
    }
    // await notifySharedUsers(itemId, "item_moved", { itemId, oldParent, newParent: destinationId || null, movedItem }, req.emitToUser)

    //  this one is for when user recived item on scrren current folder so notify them here 
    if (destinationId) {
      await notifySharedUsers(destinationId, "item_moved", { itemId, oldParent, newParent: destinationId || null, movedItem }, req.emitToUser)
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
    const { itemId, destinationId } = req.body;


    //  for shared folder and file only owenr and editor
    const permission = await getUserPermission(req.user._id, itemId)
    if (!permission || permission === "viewer") {
      return res.status(403).json({ success: false, message: "Viewers cannot copy items" })
    }

    // ── 1. Fetch item being copied ──────────────────────────────────
    const item = await uploadModel.findOne({ _id: itemId });
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // ── 2. Validate destination exists ─────────────────────────────
    if (destinationId) {
      const destPermission = await getUserPermission(req.user._id, destinationId)
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

    // ── 3. Name conflict check ──────────────────────────────────────
    let copyName = item.name;
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

    // ── 4. Recursive copy function ──────────────────────────────────
    const copyRecursive = async (sourceItem, newParentId, newName) => {
      const newDoc = await uploadModel.create({
        name: newName || sourceItem.name,
        type: sourceItem.type,
        parent: newParentId,
        owner: req.user._id,
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

    // ── 5. Do the copy ──────────────────────────────────────────────
    const newItem = await copyRecursive(item, destinationId || null, copyName);

    const fixedItem = {
      ...newItem.toObject(),
      storagePath: newItem.storagePath
        ? newItem.storagePath.split("files")[1]?.replace(/\\/g, "/")
        : null,
      owner: {
        _id: req.user._id,
        name: req.user.name,
        profilePic: req.user.profilePic
      }
    }


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
    const { name, parentId } = req.body;
    const userId = req.user._id

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Folder name is required" })
    }

    // check permissions and trash status for the parent folder
    if (parentId) {
      const parentFolder = await uploadModel.findById(parentId).select("isTrashed");
      if (parentFolder && parentFolder.isTrashed) {
        return res.status(400).json({
          success: false,
          message: "Cannot create folder in a trashed folder"
        });
      }

      const permission = await getUserPermission(userId, parentId)
      if (!permission || !["owner", "editor"].includes(permission)) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to create folders here"
        })
      }
    }


    // prevent duplicate fodler creation in same parent here
    const exists = await uploadModel.findOne({
      name,
      parent: parentId || null,
      owner: userId,
      type: "folder",
      isTrashed: { $ne: true }
    })

    if (exists) {
      return res.status(400).json({ message: "Folder already exists" })
    }


    // create folder
    const folder = await uploadModel.create({
      name,
      parent: parentId || null,
      owner: userId,
      type: "folder"
    })

    const folderWithOwner = {
      ...folder.toObject(),
      owner: {
        _id: req.user._id,
        name: req.user.name,
        profilePic: req.user.profilePic
      }
    }

    if (parentId) {
      await updateParentFolderTimestamps(parentId);
    }

    if (parentId) {
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


