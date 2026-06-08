import uploadModel from "#models/uploadModel";

//  util 
import {logger} from "#utils/logger"


// ----------------------------------------------------------
//  helper function for updateing the parent folders updatedAt field for sorting 
// -----------------------------------------------------------------

export const updateParentFolderTimestamps = async (parentId) => {
    try {
        let currentId = parentId;

        while (currentId) {
            const parentFolder = await uploadModel.findByIdAndUpdate(
                currentId,
                { $set: { updatedAt: new Date() } },
                { new: true }
            ).select("parent")

            if (!parentFolder) break
            currentId = parentFolder.parent
        }
    } catch (error) {
        logger.error(error)
        console.error("updateParentFolderTimestamps error:", error.message)
    }
}