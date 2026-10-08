import uploadModel from "#models/uploadModel";

import { updateFolderSizeTree } from "#utils/getFolderSizeHelper";


// Re-parent items when a user leaves or is unshared from a folder
export const sharedItemReperent = async (rootFolderIds, shouldMoveOut) => {
    // Ensure root IDs is an array
    const rootIds = Array.isArray(rootFolderIds) ? [...rootFolderIds] : [rootFolderIds];

    // STEP 1: Fetch the shared root folder(s) (e.g. "Raj 1") and all items inside them
    const roots = await uploadModel.find({ _id: { $in: rootIds } })
        .populate("owner", "_id name profilePic").lean();
    const descendants = await uploadModel.find({
        ancestorIds: { $in: rootIds },
        isTrashed: { $ne: true }
    }).populate("owner", "_id name profilePic").lean();

    // STEP 2: Fast ID lookup map so we can find any item or folder instantly
    const byId = new Map();
    [...roots, ...descendants].forEach(d => byId.set(d._id.toString(), d));

    // Helper: Safely get the owner's user ID as a string
    const ownerOf = (d) => (d.owner?._id || d.owner)?.toString() || "";

    // STEP 3: Store the final position of each root folder (roots never change parent)
    const finalPos = new Map();
    roots.forEach(r => finalPos.set(r._id.toString(), {
        parent: r.parent || null,
        chain: r.ancestorIds || []
    }));

    // STEP 4: Sort items top-to-bottom by depth so parent folders are fixed BEFORE their children
    const sorted = [...descendants].sort(
        (a, b) => (a.ancestorIds?.length || 0) - (b.ancestorIds?.length || 0)
    );

    const bulkOps = [];
    const movedItemsMap = new Map();

    // STEP 5: Process each item and find where it belongs
    for (const item of sorted) {
        // Is this item's owner leaving (true) or staying (false)?
        const mySide = shouldMoveOut(ownerOf(item));

        // Walk UP the folder chain until we find an ancestor owned by the SAME side
        let cursor = byId.get(String(item.parent));
        let newParentDoc = null;
        while (cursor) {
            // Found a parent folder that belongs to my side! (e.g. Raj finds Raj 1, Mihir finds Mihir deep -1)
            if (shouldMoveOut(ownerOf(cursor)) === mySide) {
                newParentDoc = cursor;
                break;
            }
            // Otherwise, keep walking up one level higher
            cursor = byId.get(String(cursor.parent));
        }

        // New parent is the folder we found (or null if moving directly to user's root)
        const newParent = newParentDoc ? newParentDoc._id : null;

        // Build the new clean ancestor chain: copy parent's chain + add parent's ID
        const newChain = newParentDoc
            ? [...finalPos.get(newParentDoc._id.toString()).chain, newParentDoc._id]
            : [];

        // Save this item's new position so any child items inside it can use it
        finalPos.set(item._id.toString(), { parent: newParent, chain: newChain });

        // Skip DB update if parent and ancestors did not change at all
        const sameParent = String(newParent) === String(item.parent);
        const sameChain = JSON.stringify(newChain.map(String)) ===
            JSON.stringify((item.ancestorIds || []).map(String));
        if (sameParent && sameChain) continue;

        // Prepare database update
        const set = { parent: newParent, ancestorIds: newChain };
        if (!newParent) { set.isTrashed = false; set.trashedAt = null; }

        bulkOps.push({ updateOne: { filter: { _id: item._id }, update: { $set: set } } });

        // If an item moved to root (newParent === null), collect it for real-time socket events
        if (!newParent) {
            const oid = ownerOf(item);
            if (!movedItemsMap.has(oid)) movedItemsMap.set(oid, []);
            movedItemsMap.get(oid).push({
                itemId: item._id,
                oldParent: item.parent,
                movedItem: {
                    ...item,
                    parent: null,
                    isTrashed: false,
                    owner: {
                        _id: item.owner?._id || item.owner,
                        name: item.owner?.name,
                        profilePic: item.owner?.profilePic
                    },
                    storagePath: item.storagePath
                        ? (item.storagePath.startsWith('/') ? item.storagePath : `/${item.storagePath}`)
                        : null
                }
            });
        }
    }

    // STEP 6: Execute all updates in a single fast database query
    if (bulkOps.length > 0) await uploadModel.bulkWrite(bulkOps);

    //  for folder size recounting
    const newSizes = new Map()
    for (const item of sorted) {
        if (item.type !== "file" || item.uploadStatus !== "completed" || !item.fileSize) continue;
        (finalPos.get(item._id.toString())?.chain || []).forEach(id => {
            newSizes.set(String(id), (newSizes.get(String(id)) || 0) + item.fileSize);
        })
    }

    const sizeOps = []
    for (const folder of [...roots, ...sorted.filter(d => d.type === "folder")]) {
        const size = newSizes.get(String(folder._id)) || 0
        if (size !== (folder.totalSize || 0)) {
            sizeOps.push({ updateOne: { filter: { _id: folder._id }, update: { $set: { totalSize: size } } } });
        }
    }

    if (sizeOps.length > 0) await uploadModel.bulkWrite(sizeOps);

    // folders above the root only need the difference
    for (const r of roots) {
        const diff = (newSizes.get(String(r._id)) || 0) - (r.totalSize || 0);
        if (r.parent && diff !== 0) await updateFolderSizeTree(r.parent, diff);
    }

    // Return map of items that moved to root (used to emit "item_moved" socket events)
    return movedItemsMap;
};
