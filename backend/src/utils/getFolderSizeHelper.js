import uploadModel from "#models/uploadModel";
import { logger } from "#utils/logger";

//  this fucntion is for calculating the folder size adn update when move copy delete and upaldo here
export const updateFolderSizeTree = async (folderId, sizeDifference) =>{
    const visited = new Set();
    const ancestorIds = [];

    let currentId = folderId;

    // STEP 1: Walk up the parent chain, collecting all ancestor IDs
    // (in memory, just reading — no writes yet)

    while(currentId){
        const idStr = currentId.toString();

        // if we've already seen this ID, it's a circular reference — stop
        if (visited.has(idStr)) {
            logger.error(`Circular folder reference detected while updating size, starting at folder ${folderId}`);
            break;
        }

        visited.add(idStr);
        ancestorIds.push(currentId);

        // fetch just the parent field — lightweight read
        const folder = await uploadModel.findById(currentId).select("parent");

        if (!folder) break; // folder missing/deleted — stop safely
        currentId = folder.parent;
    }


    // STEP 2: if we found any fodler, update all of them  in ONE databases call
    if (ancestorIds.length > 0) {
        await uploadModel.updateMany(
            { _id: { $in: ancestorIds } },
            { $inc: { totalSize: sizeDifference } }
        );
    }
}