
import fs from "fs";
import path from "path"
import multer from "multer"
import { v4 as uuidv4 } from "uuid";

//  mongodb Schemas
import mongoose from "mongoose";
import uploadModel from "#models/uploadModel";
import chunkModel from "#models/chunkModel";

// helper 
// import { releaseFd } from "../middleware/chunkUploadMiddleware.js";
import { getUserPermission } from "#utils/userPermissionUtil";
import { cleanupUploadResources } from "../middleware/chunkUploadMiddleware.js";
import { checkFileSecurity } from "../utils/fileSecurityCheck.js";

import { addToScanQueue } from "../virusTotal/scanQueue.js";
import { scanFileWithVirusTotal } from "../virusTotal/virusTotalWorker.js";
import { scanFileWithClamAV } from "../virusTotal/clamAVWorker.js";

//  utils - helper
import { logger } from "#utils/logger";
import { updateParentFolderTimestamps } from "#utils/parentFolderTimestamp";


//  first create out /file folder if not exist here
// const FILES_DIR = path.resolve("./files")
// if (!fs.existsSync(FILES_DIR)) {
//   fs.mkdirSync(FILES_DIR, { recursive: true })
// }


// small files still use memory - fine for small files under 1MB
export const smallUpload = multer({ storage: multer.memoryStorage() })

// create temp folder if not exist
const TEMP_DIR = path.resolve("./temp")
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true })
}

// here helper function of getting first 2 char of upload id to make folder here
const getBucketPath = (uploadId) => {
  const bucket = uploadId.substring(0, 2)
  const bucketDir = path.resolve(`./files/${bucket}`)
  if (!fs.existsSync(bucketDir)) {
    fs.mkdirSync(bucketDir, { recursive: true })
  }
  return bucketDir
}

// Init Uplaod controller
// Note - it will only runs when file size is greter then 1MB - otherwise uploadSmallBAtch will run 
export const initUpload = async (req, res) => {
  try {
    //  ---------------------------------------------
    // --- STEP -1 - get infor from body
    // ---------------------------------------------
    const { fileName, fingerprint, fileSize, fileType, totalChunks, parent, fileHeader, replacesFileId } = req.body;
    const owner = req.user._id;

    // if user upladoa empty folder
    if (req.body.fileName === ".keep") {
      return res.json({ success: true, status: "skipped" });
    }

    //  ---------------------------------------------------------------------
    // --- STEP - 2 - Chck permission if user is uploading item inside folder
    // ---------------------------------------------------------------------

    // if that parent folder is not there so return
    if (parent) {
      const parentFolder = await uploadModel.findById(parent).select("isTrashed sharedWith owner parent")
      if (!parentFolder) {
        return res.status(404).json({ success: false, message: "Parent folder not found" });
      }

      //  if user is uploading inside trash return it
      if (parentFolder.isTrashed) {
        return res.status(400).json({
          success: false,
          message: "Cannot upload to a trashed folder",
          blocked: true
        });
      }

      // here for share fodler if user is a viewer so dont allow it
      const permission = await getUserPermission(owner, parent)
      if (!permission || !["owner", "editor"].includes(permission)) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to upload to this folder",
          blocked: true
        })
      }
    }

    //  --------------------------------------------------------------------------
    // --- STEP - 3 - Check security .exe adn mime type block with helper function
    // ---------------------------------------------------------------------------
    const security = await checkFileSecurity(fileName, fileHeader)
    if (!security.safe) {
      return res.status(400).json({ success: false, message: security.reason, blocked: true })
    }

    //  -----------------------------------------------
    // --- STEP - 4 - Item status check already uploded or not
    // ---------------------------------------------

    const existing = await uploadModel.findOne({
      fingerprint,
      owner,
      parent: parent || null,
      isTrashed: { $ne: true }
    })

    // if item is uploaded skip that file
    if (existing?.uploadStatus === "completed") {
      return res.status(200).json({ success: true, status: "completed", message: "Completed" })
    }

    //  if uplaod statues is still uploading here
    if (existing?.uploadStatus === "uploading") {
      //  verify if temp file still exist on disk or not 
      if (!existing.storagePath || !fs.existsSync(existing.storagePath)) {
        //  file is gone so - delete broken record and start fresh upload here
        await uploadModel.deleteOne({ _id: existing._id })
        await chunkModel.deleteMany({ uploadId: existing.uploadId })   // chunk schema all dleete that chunks here
        //  below we are creating new uplaod fresh
      } else {
        //  if item is resumeble - send uplaodId and already uplaoded chunk in resposne
        const uploadedChunks = await chunkModel.find({ uploadId: existing.uploadId }).select("chunkIndex -_id")
        return res.json({
          success: true,
          status: "resumable",
          uploadId: existing.uploadId,
          uploadedChunks: uploadedChunks.map(c => c.chunkIndex)
        })
      }
    }

    //  --------------------------------------------------------------------------
    // --- STEP - 5 - Item is a new upload so fresh start
    // ---------------------------------------------------------------------------

    //  generate the ne uplaod id to give
    const uploadId = uuidv4()

    //  her this is fodler creation with the userId - in future you want to shift to this approch here
    // const userDir = path.join(FILES_DIR, String(owner))
    // if (!fs.existsSync(userDir)) {
    //   fs.mkdirSync(userDir, { recursive: true })
    // }
    // const storagePath = path.join(userDir, `${uploadId}.tmp`)

    // get storage path here
    const bucketDir = getBucketPath(uploadId)
    const storagePath = path.join(bucketDir, `${uploadId}.tmp`)

    //  now here main point we are doin glike when first user upload a file here wo we are pre-alocating full file size to the disk
    //  so when random index chunks arrive here we can write at the position here
    const fd = fs.openSync(storagePath, "w")
    fs.ftruncateSync(fd, fileSize)
    fs.closeSync(fd)    //after allocation file close that file

    //  --------------------------------------------------------------------------
    // --- STEP - 6 - Create new fresh record in mongo db with all field
    // ---------------------------------------------------------------------------
    let fileData = await uploadModel.create({
      name: fileName,
      type: "file",
      parent: parent || null,
      owner,
      fingerprint,
      uploadId,
      fileSize,
      fileType,
      storagePath,
      totalChunks,
      uploadStatus: "uploading",
      lastActivity: new Date(),
      replacesFileId: replacesFileId || null
      // uploadedChunks removed — using chunkModel collection now
    })

    //  here we are saving  the item id in the database liek with sahred ids if file is shared or not 
    const result = await uploadModel.updateOne(
      {
        _id: parent,
        "sharedWith.userId": owner
      },
      {
        $addToSet: {
          "sharedWith.$.file_ids": fileData._id
        }
      }
    )

    //  --------------------------------------------------------------------------
    // --- STEP - 7 - Send response
    // ---------------------------------------------------------------------------
    res.json({ success: true, status: "new", uploadId })

  } catch (error) {
    logger.error(error);
    res.status(500).json({ success: false, message: error.message })

  }
}

// POST - upload/chunk
//  here we are using indexes and starts becuase if we recive multiple random batch at same time so this will help us to write any chunk at correct position
export const uploadChunk = async (req, res) => {
  try {
    const { received, uploadId } = req.chunkResults
    return res.json({ success: true, received })
  } catch (error) {
    logger.error(error);
    return res.status(500).json({ success: false, message: error.message })
  }
}

//  STEP - 3 after uploading all chunk save it
export const completeUpload = async (req, res) => {
  try {
    //  --------------------------------------------------------------------------
    // --- STEP - 1 - Getting input from the body and current useer
    // ---------------------------------------------------------------------------
    const { uploadId } = req.body;
    const owner = req.user._id

    //  --------------------------------------------------------------------------
    // --- STEP - 2 - Check the item record in DB
    // ---------------------------------------------------------------------------
    const record = await uploadModel.findOne({ uploadId, owner })
    if (!record) return res.status(404).json({ success: false, message: "uploadModel not found" })

    //  --------------------------------------------------------------------------
    // --- STEP - 3 - Get all chunk uplaoded count with uplaod id and match with original count 
    // ---------------------------------------------------------------------------
    const uploadedCount = await chunkModel.countDocuments({ uploadId })
    console.log(`[COMPLETE DEBUG]`, {
      fileName: record.name,
      uploadId: uploadId,
      expectedChunks: record.totalChunks,
      foundChunks: uploadedCount,
      mismatch: uploadedCount !== record.totalChunks,
      missingCount: record.totalChunks - uploadedCount
    })

    //  here we are finding the totoal chunks from the main Upload Modal and total chunks uplaoded in chunks modal 
    if (uploadedCount !== record.totalChunks) {
      console.error(`[COMPLETE ERROR] Mismatch for ${record.name}. id: ...${uploadId.slice(-6)} | Found: ${uploadedCount}, Expected: ${record.totalChunks}`);
      return res.status(400).json({ success: false, message: "Missing chunks" })
    }

    //  --------------------------------------------------------------------------
    // --- STEP - 3 - Chunk middleware clear caching after uplaod complete 
    // ---------------------------------------------------------------------------
    await cleanupUploadResources(uploadId)
    // release fd and clear cache BEFORE renameSync
    // releaseFd(uploadId)
    // clearUploadCache(uploadId)
    // clearWriteQueue(uploadId)

    //  --------------------------------------------------------------------------
    // --- STEP - 4 - FIle Renaming replace .tmp with actual item extension
    // ---------------------------------------------------------------------------
    //  here we are replacing the file name 
    const ext = record.name?.includes(".") ? "." + record.name.split(".").pop() : ""
    const bucketDir = getBucketPath(uploadId)
    const oldPath = record.storagePath
    const newPath = path.join(bucketDir, `${uploadId}${ext}`)

    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath)
    }

    //  --------------------------------------------------------------------------
    // --- STEP - 5 - Update mongo record for item form uploading to completed
    // ---------------------------------------------------------------------------

    //  update here status after complete upload 
    await uploadModel.updateOne(
      { uploadId, owner },
      {
        uploadStatus: "completed",
        storagePath: newPath,
        lastActivity: new Date()
      }
    )

    //  --------------------------------------------------------------------------
    // --- STEP - 6 - Replace Old item data with new item 
    // ---------------------------------------------------------------------------
    /* when user uplaod a item and click on replace old item with new item 
       so we are repalcing old item all data like shared with if folder so color of that folder to new item here
       in init we are saving repalce file id and in uplaodComplete we are reaplce all data and after success delete old file 
    */

    if (record.replacesFileId) {
      //  find that old record by replace id
      const oldRecord = await uploadModel.findById(record.replacesFileId)    // here finding that old record becuase eplace file id is same _id as old record id

      if (oldRecord) {
        //  here trasnfer all data to new one
        await uploadModel.updateOne(
          { uploadId, owner },
          {
            sharedWith: oldRecord.sharedWith,
            isShared: oldRecord.isShared,
            color: oldRecord.color,
          }
        )

        // delete the old file reord from disk
        if (oldRecord.storagePath && fs.existsSync(oldRecord.storagePath)) {
          try {
            fs.unlinkSync(oldRecord.storagePath)
          } catch (error) {
            logger.error(error);
            console.log("Old file record ")
          }
        }

        // delete the record from mongodb
        await uploadModel.deleteOne({ _id: record.replacesFileId })

      }
    }

    //  --------------------------------------------------------------------------
    // --- STEP - 7 - send socket to users owner + shared people
    // ---------------------------------------------------------------------------

    /* wehn someone uplaoded a file inside deep shared folder so we need to notify shared user that file is uplaoded inside deep nested folder
      so while loop goes bottom to top to find parent folder that how many user has a sharing access to this folder.
    */

    //  if file is uploaded inside the folder - so parent willbe there
    if (record.parent) {
      // Update parent folder modified timestamps recursively so in sorting this will help
      await updateParentFolderTimestamps(record.parent);

      //  find that parent folder info like shared with info 
      let currentParent = await uploadModel.findById(record.parent).select("sharedWith parent owner")

      //  now goes to bottom to top to find main pretn folder and shared with info
      while (currentParent) {
        if (currentParent.owner) {
          //  socket event for owner screen
          req.emitToUser(currentParent.owner.toString(), "item_uploaded", { folderId: record.parent })
        }
        if (currentParent.sharedWith?.length > 0) {
          //  socket event for shared people 
          currentParent.sharedWith.forEach(s => {
            req.emitToUser(s.userId.toString(), "item_uploaded", { folderId: record.parent })
          })
          break
        }
        //  if no ither parent find so this is root break the loop here
        if (!currentParent.parent) break
        currentParent = await uploadModel.findById(currentParent.parent).select("sharedWith parent owner")
      }
    }

    //  --------------------------------------------------------------------------
    // --- STEP - 7 - After item uplaoded completed so delete that specific item chunk schema
    // ---------------------------------------------------------------------------
    await chunkModel.deleteMany({ uploadId })
    res.json({ success: true, id: record._id })

    //  --------------------------------------------------------------------------
    // --- STEP - 8 - Scanning the file with CalmAv and virus total
    // ---------------------------------------------------------------------------

    //  here after upload done now add that file to quque and scan the file here
    // setImmediate(() => {
    //   addToScanQueue(record._id.toString(), () => scanFileWithVirusTotal(record._id, newPath, record.fileSize, owner.toString()))
    // })

    // clam av here
    // setImmediate(() => {
    //   addToScanQueue(record._id.toString(), () => scanFileWithClamAV(record._id, newPath, record.fileSize, owner.toString()))
    // })

  } catch (error) {
    logger.error(error);
    res.status(500).json({ success: false, message: error.message })
  }
}


// NOTE - not using this function now 
// export const getUploadStatus = async (req, res) => {
//   try {
//     const { uploadId } = req.params;
//     const owner = req.user._id;

//     const record = await uploadModel.findOne({ uploadId, owner })
//       .select("uploadedChunks totalChunks uploadStatus")

//     if (!record) return res.status(404).json({ success: false, message: "Not found" })


//     res.json({
//       success: true,
//       uploadedChunks: record.uploadedChunks,
//       totalChunks: record.totalChunks,
//       uploadStatus: record.uploadStatus
//     })

//   } catch (error) {
//     logger.error(error);
//     res.status(500).json({ success: false, message: error.message })
//   }
// }


// NOTE - this function will run when user will upload a sall files like under 1-MB
// For small files we are not using busboy we directly saving file to disk here 
export const uploadSmallBatch = async (req, res) => {
  try {
    //  --------------------------------------------------------------------------
    // --- STEP - 1 - Getting input from the body and current useer
    // ---------------------------------------------------------------------------
    const owner = req.user._id;
    const metadata = JSON.parse(req.body.metadata);
    const parentId = metadata[0]?.parentId || null;

    //  ---------------------------------------------------------------------
    // --- STEP - 2 - Chck permission if user is uploading item inside folder
    // ---------------------------------------------------------------------

    // 1) if user uploading inside the folder so check permission is this trash or not 
    if (parentId) {
      const parentFolder = await uploadModel.findById(parentId).select("isTrashed");
      if (parentFolder && parentFolder.isTrashed) {
        return res.status(400).json({
          success: false,
          message: "Cannot upload to a trashed folder"
        });
      }

      //  2) Viewer can not upload a file isnide the shared fodler
      const permission = await getUserPermission(owner, parentId)
      if (!permission || !["owner", "editor"].includes(permission)) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to upload to this folder"
        })
      }
    }

    const results = [];

    //  ---------------------------------------------------------------------
    // --- STEP - 3 - Getting fingerprint 
    // ---------------------------------------------------------------------
    const fingerprints = metadata.map(m => m.fingerprint);

    //  ---------------------------------------------------------------------
    // --- STEP - 4 - DB check current user_id have already this fingerprints in db 
    // ---------------------------------------------------------------------
    const existingFiles = await uploadModel.find({
      fingerprint: { $in: fingerprints },
      owner,
      type: "file",
      isTrashed: { $ne: true }
    }).select("fingerprint parent uploadStatus _id");

    //  ---------------------------------------------------------------------
    // --- STEP - 5 - saveing all exsiting files unique key into the Map
    // ---------------------------------------------------------------------
    const existingMap = new Map();
    existingFiles.forEach(f => {
      const key = `${f.fingerprint}_${f.parent || "null"}`;
      existingMap.set(key, f);
    });

    //  ---------------------------------------------------------------------
    // --- STEP - 6 - Queues to hold files and database tasks to run in parallel
    // ---------------------------------------------------------------------

    // Instead of saving files and updating the database one-by-one (which is slow),
    // we collect all tasks in these temporary list  to process them together at the end.
    const pendingDbRecords = [];    // file records waiting to be saved to database
    const pendingDiskWrites = [];   // files waiting to be saved to disk
    const pendingReplacements = []; // files that need to replace an existing file

    //  ---------------------------------------------------------------------
    // --- STEP - 7 - Check small files security and block un secured file liek .exe
    // ---------------------------------------------------------------------
    /*
      So from front end we are sending batch files like in one request send 50 small files
      so all files here will go to the security check at same time in this.
      MIME type chekcing we are reading first 4100 bytes of every file and checking
      and we are sending in formData all fiels 
     */
    const securityChecks = await Promise.all(req.files.map(async (file) => {
      const fileIndex = parseInt(file.fieldname.split("_")[1]);
      const meta = metadata[fileIndex];
      if (meta.fileName === ".keep") return { safe: true };
      return checkFileSecurity(meta.fileName, file.buffer.slice(0, 4100));
    }));

    //  ---------------------------------------------------------------------
    // --- STEP - 8 - Loop through all files and uplaod
    // ---------------------------------------------------------------------
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const fileIndex = parseInt(file.fieldname.split("_")[1]);
      const meta = metadata[fileIndex];
      if (meta.fileName === ".keep") {
        continue;
      }

      //  1) first security check if file is dangoures so block the uplaod
      const security = securityChecks[i];
      if (!security.safe) {
        results.push({ fingerprint: meta.fingerprint, status: "blocked", message: security.reason })
        continue
      }

      /* 2)
        here we are checking if file is already uploaded or not with unique key
        we are checking with liek this abc123_folderAId - filename + parent folder name  
      */
      const key = `${meta.fingerprint}_${meta.parentId || "null"}`;
      const existing = existingMap.get(key);
      //  if file is aready exisit send response that already uplaoded
      if (existing?.uploadStatus === "completed") {
        results.push({ fingerprint: meta.fingerprint, status: "completed", id: existing._id });
        continue;
      }

      //  ---------------------------------------------------------------------
      // --- STEP - 9 - Write file in disk
      // ---------------------------------------------------------------------

      //  1) for every single file we are creating a new unique id
      const uploadId = uuidv4();

      // 2) we are generating mongo id for all files here so frontend dont nned to wait here
      const fileId = new mongoose.Types.ObjectId();

      // 3) getting the file extension name
      const ext = meta.fileName?.includes(".")
        ? "." + meta.fileName.split(".").pop()
        : "";
      const bucketDir = getBucketPath(uploadId)
      const storagePath = path.join(bucketDir, `${uploadId}${ext}`)

      // 4) write file to disk storage path - all 50 files will write at same time 
      //  all file will write at same time and we are pushing here refresh of that file into array to know when it will be done
      pendingDiskWrites.push(
        fs.promises.writeFile(storagePath, file.buffer)
      );

      //  5) We are pushing object in to array when all complet so we can bult write to the mongodb
      pendingDbRecords.push({
        insertOne: {
          document: {
            _id: fileId,
            name: meta.fileName,
            type: "file",
            parent: meta.parentId || null,
            owner,
            fingerprint: meta.fingerprint,
            uploadId,
            fileSize: meta.fileSize,
            fileType: meta.fileType,
            storagePath,
            totalChunks: 1,
            uploadStatus: "completed",
            replacesFileId: meta.replacesFileId || null  // add replacesFileId here
          }
        }
      });

      //  ---------------------------------------------------------------------
      // --- STEP - 10 - If same file is there so we are replacing the original file 
      // ---------------------------------------------------------------------
      if (meta.replacesFileId) {
        pendingReplacements.push({
          fingerprint: meta.fingerprint,
          parentId: meta.parentId,
          replacesFileId: meta.replacesFileId,
          storagePath,
          newRecordId: fileId
        })
      }

      //  in result we are sending resposne that thsi file is already uplaoded
      results.push({ fingerprint: meta.fingerprint, status: "completed", id: fileId });
    }

    //  ---------------------------------------------------------------------
    // --- STEP - 11 - Disk write and mongo record create for 50 files
    // ---------------------------------------------------------------------
    //  if there is any pending record that need to write in the db so rite it 
    const dbPromise = pendingDbRecords.length > 0 ? uploadModel.bulkWrite(pendingDbRecords) : Promise.resolve();

    //  wait for the all preocess to complete disk write + database write
    await Promise.all([...pendingDiskWrites, dbPromise]);
    
    //  update the all parents time stmap for sorting here
    if (parentId) {
      await updateParentFolderTimestamps(parentId);
    }

    //  ---------------------------------------------------------------------
    // --- STEP - 12 - if any new item is repalce it with old item so repalce and trasnfer data here
    // ---------------------------------------------------------------------
    for (const replaceTask of pendingReplacements) {
      const oldRecord = await uploadModel.findById(replaceTask.replacesFileId)
      if (!oldRecord) continue

      // Use the pre-generated ID directly instead of querying for the new record
      if (replaceTask.newRecordId) {
        // transfer sharing and color from old file to new file
        await uploadModel.updateOne(
          { _id: replaceTask.newRecordId },
          {
            //  trasnfer old data to new item
            sharedWith: oldRecord.sharedWith,
            isShared: oldRecord.isShared,
            color: oldRecord.color
          }
        )
      }

      // delete old file from disk
      if (oldRecord.storagePath && fs.existsSync(oldRecord.storagePath)) {
        try {
          fs.unlinkSync(oldRecord.storagePath)
        } catch (err) {
          logger.error(err);
          console.error("Old file delete failed:", err.message)
        }
      }

      // delete old record from mongodb
      await uploadModel.deleteOne({ _id: replaceTask.replacesFileId })
    }

    //  socket notification moved to frontend — emit once at end of session instead of per batch
    // if (parentId) {
    //   let currentParent = await uploadModel.findById(parentId).select("sharedWith parent owner")

    //   while (currentParent) {
    //     if (currentParent.owner) {
    //       req.emitToUser(currentParent.owner.toString(), "item_uploaded", { folderId: String(parentId) })
    //     }
    //     if (currentParent.sharedWith.length > 0) {
    //       currentParent.sharedWith.forEach(s => {
    //         req.emitToUser(s.userId.toString(), "item_uploaded", { folderId: String(parentId) })
    //       })
    //       break
    //     }
    //     if (!currentParent.parent) break
    //     currentParent = await uploadModel.findById(currentParent.parent).select("sharedWith parent owner")

    //   }
    // }

    //  ---------------------------------------------------------------------
    // --- STEP - 13 - Send resposne
    // ---------------------------------------------------------------------
    res.json({ success: true, results });

    //  ---------------------------------------------------------------------
    // --- STEP - 14 - File scanning 
    // ---------------------------------------------------------------------

    //  here after upload all smae files here addd files to queue to scan 
    // setImmediate(() => {
    //   finalResults.forEach(async (result) => {
    //     if(result.status === "completed" && result.id){
    //       const record = await uploadModel.findById(result.id).select("storagePath fileSize owner")
    //       if(record){
    //         addToScanQueue(result.id.toString(), () => scanFileWithVirusTotal(result.id, record.storagePath, record.fileSize, owner.toString()))
    //       }
    //     }
    //   })
    // })

    //  clamav 
    // setImmediate(() => {
    //   finalResults.forEach(async (result) => {
    //     if(result.status === "completed" && result.id){
    //       const record = await uploadModel.findById(result.id).select("storagePath fileSize owner")
    //       if(record){
    //         // Using ClamAV for fast local scanning
    //         addToScanQueue(result.id.toString(), () => scanFileWithClamAV(result.id, record.storagePath, record.fileSize, owner.toString()))
    //       }

    //     }
    //   })
    // })

  } catch (error) {
    logger.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};


//  check bulk file here 
//  here when user upload folder so first create all folder in mongodb in one http request
export const createFoldersBulk = async (req, res) => {
  try {
    const { folders, parentId, replacesFileId } = req.body
    const owner = req.user._id;

    // check permissions and trash status for the parent folder
    if (parentId) {
      const parentFolder = await uploadModel.findById(parentId).select("isTrashed");
      if (parentFolder && parentFolder.isTrashed) {
        return res.status(400).json({
          success: false,
          message: "Cannot create folders in a trashed folder"
        });
      }

      const permission = await getUserPermission(owner, parentId)
      if (!permission || !["owner", "editor"].includes(permission)) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to create folders here"
        })
      }
    }

    const pathToId = {};

    // group folders by depth level
    const levels = {}
    folders.forEach(folder => {
      const depth = folder.folderPath.split("/").length
      if (!levels[depth]) levels[depth] = []
      levels[depth].push(folder)
    })

    // get sorted depth levels — shallow first
    const depthKeys = Object.keys(levels).map(Number).sort((a, b) => a - b)

    // this is for the if replace file id is there then create new record here for root folder only
    if (replacesFileId) {
      const rootFolder = folders.find(f => f.folderPath.split("/").length === 1)
      const newRootFolder = await uploadModel.create({
        name: rootFolder.name,
        type: "folder",
        parent: parentId || null,
        owner: req.user._id,
        uploadStatus: null,
        replacesFileId: replacesFileId
      })
      // save root folder id to pathToId so nested folders can reference it as parent
      pathToId[rootFolder.folderPath] = newRootFolder._id
    }

    for (const depth of depthKeys) {
      const levelFolders = levels[depth]

      // skip root folder in bulkWrite if replacesFileId exists because we already created it above
      const foldersToProcess = replacesFileId
        ? levelFolders.filter(f => f.folderPath.split("/").length !== 1)
        : levelFolders

      // build bulkWrite ops for this level
      const bulkOps = foldersToProcess.map(folder => {
        const parentObjectId = folder.parentPath
          ? pathToId[folder.parentPath] || null
          : parentId || null

        //  here checking like is this root folder or not
        const isRootFolder = folder.folderPath.split("/").length === 1

        return {
          updateOne: {
            filter: {
              name: folder.name,
              type: "folder",
              parent: parentObjectId,
              owner: req.user._id,
              isTrashed: { $ne: true }
            },
            update: {
              $setOnInsert: {
                name: folder.name,
                type: "folder",
                parent: parentObjectId,
                owner: req.user._id,
                uploadStatus: null,
                replacesFileId: isRootFolder ? replacesFileId || null : null
              }
            },
            upsert: true
          }
        }
      })

      // only run bulkWrite if there are folders to process
      if (bulkOps.length > 0) {
        // execute all folders at this depth level in one bulkWrite
        await uploadModel.bulkWrite(bulkOps, { ordered: false })
      }

      // now fetch the IDs of all folders we just created at this level
      const createdFolders = await uploadModel.find({
        owner: req.user._id,
        type: "folder",
        isTrashed: { $ne: true },
        name: { $in: levelFolders.map(f => f.name) },
        parent: {
          $in: levelFolders.map(f =>
            f.parentPath ? pathToId[f.parentPath] || null : parentId || null
          )
        }
      }).select("name parent")

      // build pathToId for this level so children can reference parents
      createdFolders.forEach(created => {
        const match = levelFolders.find(f => {
          const expectedParent = f.parentPath
            ? pathToId[f.parentPath] || null
            : parentId || null
          return f.name === created.name &&
            String(created.parent) === String(expectedParent)
        })
        if (match) {
          pathToId[match.folderPath] = created._id
        }
      })
    }

     // Update parent folder modified timestamps recursively
    if (parentId) {
      await updateParentFolderTimestamps(parentId);
    }

    res.json({ success: true, pathToId });

  } catch (error) {
    logger.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export const checkFilesBulk = async (req, res) => {
  try {
    const { files } = req.body
    const owner = req.user._id

    const conditions = files.map(f => ({
      fingerprint: f.fingerprint,
      parent: f.parentId || null
    }))

    const existingFiles = await uploadModel.find({
      $or: conditions,
      owner,
      type: "file",
      isTrashed: { $ne: true }
    })

    const uploadingFiles = existingFiles.filter(f => f.uploadStatus === "uploading" && f.uploadId)
    const uploadIds = uploadingFiles.map(f => f.uploadId)

    const chunksByUploadId = new Map()
    if (uploadIds.length > 0) {
      const chunks = await chunkModel.find({ uploadId: { $in: uploadIds } }).select("uploadId chunkIndex -_id")
      chunks.forEach(c => {
        if (!chunksByUploadId.has(c.uploadId)) chunksByUploadId.set(c.uploadId, [])
        chunksByUploadId.get(c.uploadId).push(c.chunkIndex)
      })
    }

    const statusMap = {}

    existingFiles.forEach(file => {
      if (file.uploadStatus === "completed") {
        statusMap[file.fingerprint + "_" + file.parent] = {
          status: "completed"
        }
      } else if (file.uploadStatus === "uploading" && file.uploadId) {
        statusMap[file.fingerprint + "_" + file.parent] = {
          status: "resumable",
          uploadId: file.uploadId,
          uploadedChunks: chunksByUploadId.get(file.uploadId) || []
        }
      }
      // if uploadId is null/undefined — treat as new upload, don't add to statusMap
    })

    res.json({ success: true, statuses: statusMap })

  } catch (error) {
    logger.error(error);
    res.status(500).json({ success: false, message: error.message })
  }
}

export const cancelUpload = async (req, res) => {
  try {
    const { uploadId } = req.params;
    const owner = req.user._id;

    const record = await uploadModel.findOne({
      uploadId,
      owner,
      uploadStatus: { $ne: "completed" } // Safety: don't cancel completed files
    })
    if (!record) {
      return res.status(404).json({ success: false, message: "uploadModel not found or already completed" })
    }

    // release fd and clear cache first
    // releaseFd(uploadId)
    // clearUploadCache(uploadId)
    // clearWriteQueue(uploadId)
    await cleanupUploadResources(uploadId)

    // delete physical file if exists
    if (record.storagePath && fs.existsSync(record.storagePath)) {
      try {
        fs.unlinkSync(record.storagePath)
      } catch (err) {
        logger.error(err);
        console.error("File delete failed:", err.message)
      }
    }

    await Promise.all([
      chunkModel.deleteMany({ uploadId }),
      uploadModel.deleteOne({ uploadId, owner })
    ])

    res.json({ success: true })

  } catch (error) {
    logger.error(error);
    console.error("cancelUpload error:", error)
    res.status(500).json({ success: false, message: error.message })
  }
}

export const cancelFolderUpload = async (req, res) => {
  try {
    const { uploadIds, folderIds, rootFolderId } = req.body
    const owner = req.user._id

    // STEP 1 — release and delete in-progress files
    if (uploadIds?.length) {
      const records = await uploadModel.find({
        uploadId: { $in: uploadIds },
        owner,
        uploadStatus: { $ne: "completed" } // Safety: only cleanup in-progress files
      })

      records.forEach(record => {
        releaseFd(record.uploadId)
        clearUploadCache(record.uploadId)
        clearWriteQueue(record.uploadId)
      })

      await Promise.all(
        records
          .filter(r => r.storagePath && fs.existsSync(r.storagePath))
          .map(r =>
            fs.promises.unlink(r.storagePath).catch(err =>
              console.error(`File delete failed for ${r.uploadId}:`, err.message)
            )
          )
      )

      const verifiedUploadIds = records.map(r => r.uploadId)
      await Promise.all([
        chunkModel.deleteMany({ uploadId: { $in: verifiedUploadIds } }),
        uploadModel.deleteMany({ uploadId: { $in: verifiedUploadIds }, owner })
      ])
    }

    // STEP 2 — recursively delete everything under rootFolderId
    if (rootFolderId) {
      const toDelete = []
      const queue = [rootFolderId]

      // BFS to collect all nested folder and file IDs
      while (queue.length > 0) {
        const currentParent = queue.shift()
        const children = await uploadModel.find({ parent: currentParent, owner }).select("_id type uploadId storagePath")

        for (const child of children) {
          toDelete.push(child)
          if (child.type === "folder") {
            queue.push(child._id)
          }
        }
      }

      // delete physical files
      await Promise.all(
        toDelete
          .filter(r => r.storagePath && fs.existsSync(r.storagePath))
          .map(r =>
            fs.promises.unlink(r.storagePath).catch(err =>
              console.error(`File delete failed:`, err.message)
            )
          )
      )

      const allIds = toDelete.map(r => r._id)
      const allUploadIds = toDelete.filter(r => r.uploadId).map(r => r.uploadId)

      // Fetch the root folder first to get its parent for the socket event
      const rootFolder = await uploadModel.findById(rootFolderId).select("parent")

      // delete chunks, all records, and root folder itself in parallel
      await Promise.all([
        chunkModel.deleteMany({ uploadId: { $in: allUploadIds } }),
        uploadModel.deleteMany({ _id: { $in: allIds }, owner }),
        uploadModel.deleteOne({ _id: rootFolderId, owner })  // delete root folder itself
      ])

      if (rootFolder && req.emitToUser) {
        req.emitToUser(owner.toString(), "item_deleted", { parentId: rootFolder.parent })
      }
    }

    res.json({ success: true })

  } catch (error) {
    logger.error(error);
    console.error("cancelFolderUpload error:", error)
    res.status(500).json({ success: false, message: error.message })
  }
}

//  here this controller here is for the when user upload a same name folder and user select replace this folder with new this will run
//  and we are moveing all info like shared with and coloer from old folder to new folder here
export const completeFolderReplace = async (req, res) => {
  try {
    const { newFolderId, replacesFileId } = req.body;
    const owner = req.user._id;

    //  first find the older folder here
    const oldFolder = await uploadModel.findOne({ _id: replacesFileId, owner });
    if (!oldFolder) {
      return res.status(404).json({ success: false, message: "Old folder not found" })
    }

    //  find the new root folder here
    const newFolder = await uploadModel.findOne({ _id: newFolderId, owner })
    if (!newFolder) {
      return res.status(404).json({ success: false, message: "New folder not found" })
    }

    //  now trasnfer all shared data from old folder to new folder here
    await uploadModel.updateOne(
      { _id: newFolderId },
      {
        sharedWith: oldFolder.sharedWith,
        isShared: oldFolder.isShared,
        color: oldFolder.color
      }
    )

    // Update parent folder modified timestamps recursively
    if (newFolder.parent) {
      await updateParentFolderTimestamps(newFolder.parent);
    }

    // now after upload done of new folder delete whole old folder here
    const deleteRecursive = async (parentId) => {
      const children = await uploadModel.find({ parent: parentId, owner })
      for (const child of children) {
        if (child.type === "folder") {
          await deleteRecursive(child._id)
        } else if (child.type === "file") {
          // delete file from disk
          if (child.storagePath && fs.existsSync(child.storagePath)) {
            try {
              fs.unlinkSync(child.storagePath)
            } catch (err) {
              logger.error(err);
              console.error("File delete failed:", err.message)
            }
          }
        }
        await uploadModel.deleteOne({ _id: child._id })
      }
    }

    //  delete all nested containes of folder
    await deleteRecursive(replacesFileId)

    //  now delete root levl folder here
    await uploadModel.deleteOne({ _id: replacesFileId, owner })

    res.json({ success: true })

  } catch (error) {
    logger.error(error);
    res.status(500).json({ success: false, message: error.message })
  }
}

export const notifyUploadComplete = async (req, res) => {
  try {
    const { parentId } = req.body
    if (!parentId) return res.json({ success: true })

    let currentParent = await uploadModel.findById(parentId).select("sharedWith parent owner")

    while (currentParent) {
      if (currentParent.owner) {
        req.emitToUser(currentParent.owner.toString(), "item_uploaded", { folderId: String(parentId) })
      }
      if (currentParent.sharedWith?.length > 0) {
        currentParent.sharedWith.forEach(s => {
          req.emitToUser(s.userId.toString(), "item_uploaded", { folderId: String(parentId) })
        })
        break
      }
      if (!currentParent.parent) break
      currentParent = await uploadModel.findById(currentParent.parent).select("sharedWith parent owner")
    }

    res.json({ success: true })
  } catch (error) {
    logger.error(error);
    res.status(500).json({ success: false, message: error.message })
  }
}