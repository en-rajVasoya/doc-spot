import uploadModel from "#models/uploadModel";


//  this fucntino will help to re parent all editor upaldoed items into thier own root

//  this will use in un share and admin deelte user 

export const sharedItemReperent = async (rootFolderIds, shouldMoveOut) => {
    const bulkOps = [];
    const movedItemsMap = new Map();

    let currentLevelIds = Array.isArray(rootFolderIds) ? [...rootFolderIds] : [rootFolderIds];

    while (currentLevelIds.length > 0) {
        const children = await uploadModel.find({
            parent: { $in: currentLevelIds },
            isTrashed: { $ne: true }
        }).populate("owner", "_id name profilePic").lean();

        const toMove = [];
        const nextLevelIds = [];

        children.forEach(child => {
            const childOwnerId = child.owner?._id
                ? child.owner._id.toString()
                : child.owner?.toString();

            if (shouldMoveOut(childOwnerId)) {
                toMove.push(child);
            } else if (child.type === "folder") {
                // only keep walking into folders that are NOT being moved out
                nextLevelIds.push(child._id);
            }
        });

        toMove.forEach(child => {
            bulkOps.push({
                updateOne: {
                    filter: { _id: child._id },
                    update: { $set: { parent: null, isTrashed: false, trashedAt: null } }
                }
            });

            const ownerId = child.owner?._id
                ? child.owner._id.toString()
                : child.owner?.toString();

            if (!movedItemsMap.has(ownerId)) movedItemsMap.set(ownerId, []);
            movedItemsMap.get(ownerId).push({
                itemId: child._id,
                oldParent: child.parent,
                movedItem: {
                    ...child,
                    parent: null,
                    isTrashed: false,
                    owner: {
                        _id: child.owner._id,
                        name: child.owner.name,
                        profilePic: child.owner.profilePic
                    },
                    storagePath: child.storagePath ? `/${child.storagePath}` : null
                }
            });
        });

        currentLevelIds = nextLevelIds;
    }

    if (bulkOps.length > 0) {
        await uploadModel.bulkWrite(bulkOps);
    }

    return movedItemsMap;


}
