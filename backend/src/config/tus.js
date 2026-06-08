import { Server } from "@tus/server";
import { FileStore } from "@tus/file-store";
import path from "path";
import fs from "fs";

import Upload from "../models/uploadModel.js"
import getUserIdFromReq from "../utils/getTokenForTus.js";

// remove jwt import — not needed without auth

const uploadDir = path.resolve("./files")

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("base directory created")
}

// remove getUserIdFromReq — not needed without auth

export const tusServer = new Server({
  path: "/uploads",
  datastore: new FileStore({ directory: uploadDir }),


  onUploadCreate: async (req, upload) => {
    console.log("---onUploadCreate------")
    console.log("Upload Metadata - ", upload.metadata)

    //  first getting which user is uploading
    const userId = getUserIdFromReq(req);
    if (!userId) {
      console.log("Unauthorized user trying to upload")
      throw { status_code: 401, body: "Unauthorized" }
    }

    const filename = upload.metadata?.filename;
    const fingerprint = upload.metadata?.fingerprint;
    const type = upload.metadata?.type || "file";

    let parent = upload.metadata?.parent;
    if (!parent || parent === "null" || parent === "") parent = null;

    console.log("Parent", parent, "Type", type)

    let shouldThrow = null;
    let tusError = null;

    try {
      if (type === "folder") {
        await Upload.create({
          name: filename,
          type: "folder",
          parent,
          owner: userId,
          uploadStatus: null
        })
        console.log("Folder creating")
      }

      else {
        //  if type is file then getting file information
        const existing = await Upload.findOne({ fingerprint, owner: userId, parent })

        // if file is not uploaded yet then create new uploading 
        if (!existing) {
          await Upload.create({
            name: filename,
            type: "file",
            parent,
            owner: userId,
            fingerprint,
            tusFileId: upload.id,
            fileSize: upload.size,
            fileType: upload.metadata?.fileType,
            storagePath: path.resolve(`./files/${userId}/${upload.id}`),
            offset: 0,
            uploadStatus: "uploading",
            lastActivity: new Date()
          })
          console.log("new file record created")
        }

        // else if (existing.uploadStatus === "uploading") {
        //   await Upload.updateOne(
        //     { fingerprint, owner: userId, parent },
        //     {
        //       tusFileId: upload.id,  // ← update to new tusFileId after restart
        //       storagePath: path.resolve(`./files/${userId}/${upload.id}`),
        //       lastActivity: new Date(),
        //       offset: 0  // ← reset offset since tus lost its state
        //     }
        //   )
        // }
        else if (existing.uploadStatus === "uploading") {
          tusError = { status_code: 409, body: JSON.stringify({ tusFileId: existing.tusFileId }) }
        }

        else if (existing.uploadStatus === "completed") {
         tusError = { status_code: 409, body: JSON.stringify({ status: "completed" }) };

          console.log("File Already Completed", filename)
        }
      }

    } catch (error) {
      console.error("Mongo error:", error)
    }

    if (tusError) throw tusError;

    return {}
  },

  onUploadFinish: async (req, upload) => {
    console.log("---- onUploadFinish ----");

    //  first getting current user
    const userId = getUserIdFromReq(req);
    if (!userId) {
      console.log("Unauthorized userid on finish")
      throw { status_code: 409, body: "Unauthorized" }
    }

    const filename = upload.metadata?.filename;
    console.log("Upload finish for", filename)

    try {
      const record = await Upload.findOne({ tusFileId: upload.id, owner: userId });

      if (!record) {
        console.log("No mongo record found for", upload.id)
        return {}   // fix: was crashing on record.type
      }

      //  here for saving file we are creating 
      if (record.type === "file") {

        // here if userId folder is not there so we can make one folder
        const userDir = path.resolve(`./files/${userId}`)
        if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });

        //  here we want to save file with name_uniqueString .extName in userId folder
        const ext = filename?.includes(".") ? "." + filename.split(".").pop() : "";
        const baseName = filename?.includes(".") ? filename.substring(0, filename.lastIndexOf(".")) : filename
        const oldPath = path.resolve(`./files/${upload.id}`);
        const newPath = path.resolve(`./files/${userId}/${baseName}_${upload.id}${ext}`)

        console.log("Moving file from:", oldPath, "to:", newPath);

        if (fs.existsSync(oldPath)) fs.renameSync(oldPath, newPath)

        const jsonFile = path.resolve(`./files/${upload.id}.json`);
        if (fs.existsSync(jsonFile)) fs.unlinkSync(jsonFile);

        await Upload.updateOne(
          { tusFileId: upload.id, owner: userId },
          { storagePath: newPath, offset: upload.size, uploadStatus: "completed" }
        )
        console.log("✅ File Mongo record updated:", filename);

      } else {
        console.log("Folder upload finished:", filename);
      }

    } catch (error) {
      console.error("Finish error:", error);
    }

    return {};
  }
})