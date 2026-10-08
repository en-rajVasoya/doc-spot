import uploadModel from "#models/uploadModel";
import { logger } from "#utils/logger";
import { emitToUser } from "../socket.js";

//  this fucntion is for calculating the folder size adn update when move copy delete and upaldo here
export const updateFolderSizeTree = async (folderId, sizeDifference) => {
    // If there is no size change, don't do anything
    if (!sizeDifference || sizeDifference === 0) return;
    
    // Fetch the folder and its entire history in one go
    const folder = await uploadModel.findById(folderId).select("ancestorIds");
    if (!folder) return; // folder missing/deleted — stop safely
    
    // Combine its history with its own ID to get the complete path
    const allIds = [...(folder.ancestorIds || []), folderId];
    
    // Update the size for EVERY folder in the path in ONE single database call!
    await uploadModel.updateMany(
        { _id: { $in: allIds } },
        { $inc: { totalSize: sizeDifference } }
    );


    //  socket event to users where in fodler some size changes
    try {
        const docs = await uploadModel.find({ _id: { $in: allIds } })
            .select("owner sharedWith.userId totalSize").lean();
        const byId = new Map(docs.map(d => [String(d._id), d]));

        const audience = new Set();
        const perUser = new Map();

        for (const id of allIds) {
            const d = byId.get(String(id));
            if (!d) continue;
            if (d.owner) audience.add(String(d.owner));
            (d.sharedWith || []).forEach(s => s.userId && audience.add(String(s.userId)));
            const update = { folderId: String(d._id), totalSize: d.totalSize };
            audience.forEach(uid => {
                if (!perUser.has(uid)) perUser.set(uid, []);
                perUser.get(uid).push(update);
            });
        }

         // emit one batched event per user
        perUser.forEach((updates, uid) => emitToUser(uid, "folder_size_updated", { updates }));
    } catch (error) {
        logger.error(`[folder_size_updated] emit failed: ${error.message}`);

    }
}
