import uploadModel from "#models/uploadModel";

//  util 
import { logger } from "#utils/logger"


// ----------------------------------------------------------
//  helper function for updating the parent folders updatedAt field for sorting 
// -----------------------------------------------------------------

export const updateParentFolderTimestamps = async (parentId) => {
    try {
        // fetch the starting folder's own ancestorIds — no walking needed
        const folder = await uploadModel.findById(parentId).select("ancestorIds");
        if (!folder) return;

        // this folder itself + all its ancestors need their updatedAt bumped
        const idsToUpdate = [...(folder.ancestorIds || []), parentId];

        if (idsToUpdate.length > 0) {
            await uploadModel.updateMany(
                { _id: { $in: idsToUpdate } },
                { $set: { updatedAt: new Date() } }
            );
        }
    } catch (error) {
        logger.error(error)
        console.error("updateParentFolderTimestamps error:", error.message)
    }
}