import uploadModel from "#models/uploadModel";

// 1) check user's permission on an item — owner/editor/viewer, or null
//    "closest ancestor wins" — item itself is closest, root is furthest
export const getUserPermission = async (userId, itemId) => {
    const item = await uploadModel.findById(itemId).select("owner parent ancestorIds sharedWith")
    if (!item) return null

    // build the chain from closest to furthest: [itemId, ...ancestorsId reversed]
    const chain = [item._id, ...[...(item.ancestorIds || [])].reverse()]

    // Fetch item and all ancestors in a single query
    const candidates = await uploadModel.find({
        _id: { $in: chain }
    }).select("_id owner sharedWith").lean()

    // map for quick lookup by id
    const candidateMap = new Map(candidates.map(c => [c._id.toString(), c]))

    // Check permissions from closest item to root
    for (const id of chain) {
        const doc = candidateMap.get(id.toString())
        if (!doc) continue

        if (doc.owner.toString() === userId.toString()) return "owner"

        const match = doc.sharedWith?.find(
            s => s.userId.toString() === userId.toString()
        )
        if (match) return match.permission
    }

    return null
}


// 2) check if item is inside any shared tree (for frontend shared icon)
export const checkIsSharedTree = async (itemId) => {
    const item = await uploadModel.findById(itemId).select("isShared sharedWith ancestorIds")
    if (!item) return false

    // Return true if item itself is shared
    if (item.isShared || (item.sharedWith && item.sharedWith.length > 0)) {
        return true
    }

    // no ancestors — nothing above to check
    if (!item.ancestorIds || item.ancestorIds.length === 0) return false

    // Check if any ancestor folder is shared
    const sharedAncestor = await uploadModel.findOne({
        _id: { $in: item.ancestorIds },
        $or: [
            { isShared: true },
            { "sharedWith.0": { $exists: true } }
        ]
    }).select("_id")

    return Boolean(sharedAncestor)
}