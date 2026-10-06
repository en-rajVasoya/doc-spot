import uploadModel from "#models/uploadModel";


//  this fucntino will help to re parent all editor upaldoed items into thier own root

//  this will use in un share and admin deelte user 



export const sharedItemReperent = async (rootFolderIds, shouldMoveOut) => {
    const bulkOps = [];
    const movedItemsMap = new Map();

    const rootIds = Array.isArray(rootFolderIds) ? [...rootFolderIds] : [rootFolderIds];

    // find ALL descendants of these root folders in ONE query
    const allDescendants = await uploadModel.find({
        ancestorIds: { $in: rootIds },
        isTrashed: { $ne: true }
    }).populate("owner", "_id name profilePic").lean();

    // build a set of ids being moved out, so we can detect
    // "is any ancestor of mine ALSO being moved" (avoid double-processing
    // a subtree whose parent is already leaving)
    const toMoveIds = new Set();
    const toMove = [];

    allDescendants.forEach(child => {
        const childOwnerId = child.owner?._id
            ? child.owner._id.toString()
            : child.owner?.toString();

        if (shouldMoveOut(childOwnerId)) {
            toMove.push(child);
            toMoveIds.add(child._id.toString());
        }
    });

    // only move items whose nearest ancestor-to-be-moved is themselves
    // (skip descendants of an item that's already being moved out —
    // moving the parent already carries them along)
    const itemsToActuallyMove = toMove.filter(child => {
        const hasAncestorAlsoMoving = (child.ancestorIds || []).some(
            a => toMoveIds.has(a.toString())
        );
        return !hasAncestorAlsoMoving;
    });

    itemsToActuallyMove.forEach(child => {
        bulkOps.push({
            updateOne: {
                filter: { _id: child._id },
                update: { $set: { parent: null, ancestorIds: [], isTrashed: false, trashedAt: null } }
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

    // fix ancestorIds for descendants of moved folders (their subtree stays intact,
    // just needs its ancestorIds trimmed since the root moved to [])
    for (const movedFolder of itemsToActuallyMove) {
        if (movedFolder.type !== "folder") continue

        const subDescendants = allDescendants.filter(d =>
            (d.ancestorIds || []).some(a => a.toString() === movedFolder._id.toString())
            && !toMoveIds.has(d._id.toString())
        )

        subDescendants.forEach(sub => {
            const idx = sub.ancestorIds.findIndex(a => a.toString() === movedFolder._id.toString())
            const rebuiltChain = idx >= 0 ? sub.ancestorIds.slice(idx) : []

            bulkOps.push({
                updateOne: {
                    filter: { _id: sub._id },
                    update: { $set: { ancestorIds: rebuiltChain } }
                }
            })
        })
    }

    if (bulkOps.length > 0) {
        await uploadModel.bulkWrite(bulkOps);
    }

    return movedItemsMap;
}