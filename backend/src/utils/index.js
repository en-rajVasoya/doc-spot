import path from "path"
import fs from "fs"

import { getAbsolutePath } from "#utils/pathHelper";
import { logger } from "#utils/logger";

import uploadModel from "#models/uploadModel";

// search optimization function
export const searchOptimize = (searchQuery) => {
    return { $regex: searchQuery, $options: "i" }
}

// function which always return bool value 
export const getBoolVal = (value) => {
    if (value === true || value === "true" || value === "True") return true;
    if (value === false || value === "false" || value === "False") return false;

    return false; // undefined, null, or anything else
};

export const getFolderContentsRecursive = async (parentId, depth = 0, maxDepth = 10) => {
    if (depth >= maxDepth) return [];

    const items = await uploadModel.find({ parent: parentId, isTrashed: false });

    const result = await Promise.all(items.map(async (item) => {
        if (item.type === "folder") {
            const children = await getFolderContentsRecursive(item._id, depth + 1, maxDepth);
            return { ...item.toObject(), children };
        }
        return item.toObject();
    }));

    return result;
};

// NEW: Utility function for cron (doesn't need req/res)
export const deleteItemPermanently = async (item) => {
    const allMetadataIdsToDelete = []
    const filesToUnlink = []

    allMetadataIdsToDelete.push(item._id)

    if (item.type === "file") {
        if (item.storagePath) {
            filesToUnlink.push({ _id: item._id, storagePath: item.storagePath })
        }
    } else {
        // Recursively delete folder contents
        let parentIds = [item._id]
        while (parentIds.length > 0) {
            const children = await uploadModel.find({
                parent: { $in: parentIds }
            }).select("_id type storagePath").lean()

            for (const child of children) {
                allMetadataIdsToDelete.push(child._id)
                if (child.type === "file" && child.storagePath) {
                    filesToUnlink.push({ _id: child._id, storagePath: child.storagePath })
                }
            }

            parentIds = children
                .filter(c => c.type === "folder")
                .map(c => c._id)
        }
    }

    // Delete metadata
    if (allMetadataIdsToDelete.length > 0) {
        await uploadModel.deleteMany({ _id: { $in: allMetadataIdsToDelete } })
    }

    // Delete files asynchronously
    if (filesToUnlink.length > 0) {
        (async () => {
            for (const file of filesToUnlink) {
                try {
                    const count = await uploadModel.countDocuments({ storagePath: file.storagePath })
                    const absPath = getAbsolutePath(file.storagePath)

                    if (count === 0 && absPath && fs.existsSync(absPath)) {
                        await fs.promises.unlink(absPath)
                        logger.infp(`[BACKGROUND DELETE] Unlinked: ${absPath}`)
                    }
                } catch (err) {
                    logger.error(`[BACKGROUND DELETE ERROR] ${file.storagePath}:`, err.message)
                }
            }
        })()
    }
}
