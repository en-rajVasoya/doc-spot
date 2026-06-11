//  models - schema
import uploadModel from "#models/uploadModel"

// utils - helper
import { getUserPermission } from "#utils/userPermissionUtil";
import { logger } from "#utils/logger"


//  helper functino when user sarc (), [] something here 
const escapeRegex = (string) => {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};


export const searchFiles = async (req, res) => {
    try {
        console.time("⏱️ Total Search Execution"); // Start total timer

        // ##################################################
        // ---- STEP 1: Get query and filter details from request
        // ##################################################
        const { query, fileType, dateFrom, dateTo, ownerFilter, location, folderId, personIds } = req.query
        const userId = req.user._id;

        console.time("⏱️ Shared Folders BFS");

        // ##################################################
        // ---- STEP 2: Find all folders shared with the user
        // ##################################################
        // get folders shared with this user from database
        const sharedFolders = await uploadModel.find({
            "sharedWith.userId": userId,
            type: "folder",
            isTrashed: { $ne: true }
        }).select("_id").lean()

        const sharedFolderIds = sharedFolders.map(f => f._id)
        const allSharedFolderIds = new Set(sharedFolderIds.map(id => id.toString()))

        // go down level by level to find all nested folders inside shared folders
        if (sharedFolderIds.length > 0) {
            let currentLevel = sharedFolderIds
            while (currentLevel.length > 0) {
                const children = await uploadModel.find({
                    parent: { $in: currentLevel },
                    type: "folder",
                    isTrashed: { $ne: true }
                }).select("_id").lean()

                currentLevel = []
                for (const child of children) {
                    allSharedFolderIds.add(child._id.toString())
                    currentLevel.push(child._id)
                }
            }
        }

        console.timeEnd("⏱️ Shared Folders BFS");

        // ##################################################
        // ---- STEP 3: Add folders owned by the user to the list
        // ##################################################
        // const ownedFolders = await uploadModel.find({
        //     owner: userId,
        //     type: "folder",
        //     isTrashed: { $ne: true }
        // }).select("_id").lean();
        // ownedFolders.forEach(f => allSharedFolderIds.add(f._id.toString()));


        // ##################################################
        // ---- STEP 4: Start building the search query filter
        // ##################################################
        const filter = {
            $and: [
                {
                    $or: [
                        { uploadStatus: "completed" },
                        { type: "folder" }
                    ]
                }
            ]
        }

        // ##################################################
        // ---- STEP 5: Filter by search location -----------
        // ##################################################
        if (location === "my-docspot") {
            // search only inside user's own drive
            filter.owner = userId
        } else if (location === "trash") {
            // search only inside user's trash
            filter.owner = userId
        } else if (location === "specific-folder" && folderId) {
            // search inside a specific folder and check permission
            const permission = await getUserPermission(userId, folderId)
            if (!permission) {
                return res.status(403).json({ success: false, message: "Access denied" })
            }

            const allFolderIds = [folderId]
            const queue = [folderId]

            // get all nested folders under this specific folder
            while (queue.length > 0) {
                const currentId = queue.shift()
                const children = await uploadModel.find({
                    parent: currentId,
                    type: "folder"
                }).select("_id")

                children.forEach(c => {
                    allFolderIds.push(c._id)
                    queue.push(c._id)
                })
            }
            filter.parent = { $in: allFolderIds }
            filter.$and.push({
                $or: [
                    { owner: userId },
                    { "sharedWith.userId": userId },
                    { parent: { $in: allFolderIds } }
                ]
            })

        } else {
            // search everywhere (my drive, shared files, or inside shared folders)
            filter.$and.push({
                $or: [
                    { owner: userId },
                    { "sharedWith.userId": userId },
                    { parent: { $in: Array.from(allSharedFolderIds) } }
                ]
            })
        }


        // ##################################################
        // ---- STEP 6: Filter by text search query ---------
        // ##################################################
        if (query && query.trim() !== "") {
            filter.name = { $regex: escapeRegex(query.trim()), $options: "i" }
        }


        // ##################################################
        // ---- STEP 7: Filter by type of file --------------
        // ##################################################
        if (fileType) {
            if (fileType === "Folder") {
                filter.type = "folder"
            } else {
                const typeMap = {
                    "Photo": /^image\//,
                    "PDF": /^application\/pdf/,
                    "Video": /^video\//,
                    "Zip": /^application\/(zip|x-zip)/,
                    "File": /^application\//
                }
                if (typeMap[fileType]) {
                    filter.fileType = typeMap[fileType]
                }
            }

        }


        // ##################################################
        // ---- STEP 8: Filter by date created --------------
        // ##################################################
        if (dateFrom || dateTo) {
            console.log("dateFrom received:", dateFrom)
            console.log("dateTo received:", dateTo)
            filter.createdAt = {}
            if (dateFrom) {
                filter.createdAt.$gte = new Date(dateFrom + "T00:00:00.000Z")
            }

            if (dateTo) {
                filter.createdAt.$lte = new Date(dateTo + "T23:59:59.999Z")
            }

            console.log("file createdAt in db:", "2026-05-06T03:41:29.367+00:00")
            console.log("should be between:", filter.createdAt.$gte, "and", filter.createdAt.$lte)
        }


        // ##################################################
        // ---- STEP 9: Filter by owner --------------------
        // ##################################################
        if (ownerFilter === "owner-by-me") {
            filter.owner = userId
            filter.$and = filter.$and.filter(
                cond => !cond.$or?.some(o => o["sharedWith.userId"])
            )

        } else if (ownerFilter === "not-owner-by-me") {
            filter.owner = { $ne: userId }
            filter.$and = filter.$and.filter(
                cond => !cond.$or?.some(o => o["sharedWith.userId"])
            )
            filter.$and.push({
                $or: [
                    { "sharedWith.userId": userId },
                    { parent: { $in: Array.from(allSharedFolderIds) } }
                ]
            })

        } else if (ownerFilter === "specific-person" && personIds) {
            const ids = JSON.parse(personIds)
            filter.owner = { $in: ids }
            filter.$and = filter.$and.filter(
                cond => !cond.$or?.some(o => o["sharedWith.userId"])
            )
            filter.$and.push({
                $or: [
                    { "sharedWith.userId": userId },
                    { parent: { $in: Array.from(allSharedFolderIds) } }
                ]
            })
        }

        console.time("⏱️ Trashed Folders BFS");
        // ##################################################
        // ---- STEP 10: Find all folders that are in trash -
        // ##################################################
        const trashedFolders = await uploadModel.find({
            owner: userId,
            isTrashed: true,
            type: "folder"
        }).select("_id").lean()

        const trashedFolderIds = trashedFolders.map(f => f._id)
        const allTrashedIds = new Set(trashedFolderIds.map(id => id.toString()))

        // recursively find all sub-items inside trashed folders
        if (trashedFolderIds.length > 0) {
            let currentLevel = trashedFolderIds

            while (currentLevel.length > 0) {
                const children = await uploadModel.find({
                    parent: { $in: currentLevel }
                }).select("_id type").lean()

                currentLevel = []
                for (const child of children) {
                    allTrashedIds.add(child._id.toString())
                    if (child.type === "folder") {
                        currentLevel.push(child._id)
                    }
                }
            }
        }
        console.timeEnd("⏱️ Trashed Folders BFS");

        // ##################################################
        // ---- STEP 11: Apply trash visibility rules ------
        // ##################################################
        if (location === "trash") {
            // show only trashed files and folder items
            filter.$and.push({
                $or: [
                    { isTrashed: true },
                    { _id: { $in: Array.from(allTrashedIds) } }
                ]
            })
        } else {
            // hide all trashed files and folders
            filter.isTrashed = { $ne: true }
            if (allTrashedIds.size > 0) {
                filter.$and.push({
                    _id: { $nin: Array.from(allTrashedIds) }
                })
            }
        }


        // ##################################################
        // ---- STEP 12: Get paginated files and total count -
        // ##################################################
        const page = parseInt(req.query.page) || 1
        const limit = 50
        const skip = (page - 1) * limit
        console.time("⏱️ Database Search & Count");
        const [results, totalCount] = await Promise.all([
            uploadModel.find(filter)
                .select("name type fileSize fileType updatedAt createdAt parent owner storagePath color isShared")
                .populate("owner", "_id name profilePic")
                .populate("sharedWith.userId", "_id name")
                .sort({ type: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            uploadModel.countDocuments(filter)
        ])
        console.timeEnd("⏱️ Database Search & Count");
        console.log("total results found:", results.length)
        console.log("results names:", results.map(r => r.name))

        // ##################################################
        // ---- STEP 13: Fetch folder names for paths -------
        // ##################################################
        console.time("⏱️ Fetching only parent folders");
        const folderCache = {}
        const parentIdsToFetch = new Set()
        results.forEach(item => {
            if (item.parent) {
                parentIdsToFetch.add(item.parent.toString())
            }
        })
        let queue = Array.from(parentIdsToFetch)
        while (queue.length > 0) {
            const folders = await uploadModel.find({
                _id: { $in: queue }
            }).select("_id name parent").lean()
            queue = []
            folders.forEach(f => {
                const idStr = f._id.toString()
                folderCache[idStr] = f
                if (f.parent) {
                    const parentStr = f.parent.toString()
                    if (!folderCache[parentStr] && !queue.includes(parentStr)) {
                        queue.push(parentStr)
                    }
                }
            })
        }
        console.timeEnd("⏱️ Fetching only parent folders");

        // ##################################################
        // ---- STEP 14: Format paths for search results ----
        // ##################################################
        const resultsWithPath = results.map(item => {
            const path = []
            let currentParent = item.parent?.toString()
            let isInsideSharedFolder = false
            while (currentParent && folderCache[currentParent]) {
                if (allSharedFolderIds.has(currentParent)) {
                    isInsideSharedFolder = true
                }
                path.unshift(folderCache[currentParent].name)
                currentParent = folderCache[currentParent].parent?.toString()
            }
            if (item.owner?._id?.toString() !== userId.toString() || isInsideSharedFolder) {
                path.unshift("Shared with me")
            } else {
                path.unshift("My Docspot")
            }
            return {
                ...item,
                storagePath: item.storagePath
                    ? item.storagePath.split("files")[1].replace(/\\/g, "/")
                    : null,
                locationPath: path.join(" / ")
            }
        })
        console.timeEnd("⏱️ Total Search Execution");

        // ##################################################
        // ---- STEP 15: Send the results response ----------
        // ##################################################
        res.json({ success: true, results: resultsWithPath, totalCount, page, limit })

    } catch (error) {
        logger.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}


