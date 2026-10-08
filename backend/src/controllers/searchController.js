// //  models - schema
// import uploadModel from "#models/uploadModel"

// // utils - helper
// import { getUserPermission } from "#utils/userPermissionUtil";
// import { logger } from "#utils/logger"
// import { getFileUrl } from "#config/s3";

// //  helper functino when user sarc (), [] something here 
// const escapeRegex = (string) => {
//     return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
// };

// export const searchFiles = async (req, res) => {
//     try {
//         const logMemory = (step) => {
//             const memoryUsage = process.memoryUsage();
//             const rss = (memoryUsage.rss / 1024 / 1024).toFixed(2);
//             const heapTotal = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2);
//             const heapUsed = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
//             console.log(`[MEMORY] searchFiles - ${step} | RSS: ${rss}MB | Heap Total: ${heapTotal}MB | Heap Used: ${heapUsed}MB`);
//         };

//         logMemory("Start of search");

//         // ##################################################
//         // ---- STEP 1: Get query and filter details from request
//         // ##################################################
//         const { query, fileType, dateFrom, dateTo, ownerFilter, location, folderId, personIds } = req.query
//         const userID = req.user._id;


//         // ##################################################
//         // ---- STEP 2: Find all folders shared with the user
//         // ##################################################
//         const sharedFolders = await uploadModel.find({
//             "sharedWith.userId": userID,
//             type: "folder",
//             isTrashed: { $ne: true }
//         }).select("_id").lean()

//         const sharedFolderIds = sharedFolders.map(f => f._id)
//         const allSharedFolderIds = new Set(sharedFolderIds.map(id => id.toString()))

//         // ##################################################
//         // ---- STEP 3: Add folders owned by the user to the list
//         // ##################################################
//         const ownedFolders = await uploadModel.find({
//             owner: userID,
//             type: "folder",
//             isShared: true, // Only deep-traverse SHARED owned folders to prevent OOM
//             isTrashed: { $ne: true }
//         }).select("_id").lean();

//         const ownedFolderIds = ownedFolders.map(f => f._id);
//         const allAccessibleFolderIds = new Set([...allSharedFolderIds, ...ownedFolderIds.map(id => id.toString())]);

//         // ##################################################
//         // ---- STEP 3.5: Traverse all nested children for ALL folders
//         // ##################################################
//         let currentLevel = [...sharedFolderIds, ...ownedFolderIds];

//         while (currentLevel.length > 0) {
//             const children = await uploadModel.find({
//                 parent: { $in: currentLevel },
//                 type: "folder",
//                 isTrashed: { $ne: true }
//             }).select("_id parent").lean()

//             currentLevel = []
//             for (const child of children) {
//                 // If parent is from shared tree, add child to shared tree
//                 if (allSharedFolderIds.has(child.parent.toString())) {
//                     allSharedFolderIds.add(child._id.toString())
//                 }

//                 // Add to total accessible list
//                 if (!allAccessibleFolderIds.has(child._id.toString())) {
//                     allAccessibleFolderIds.add(child._id.toString())
//                     currentLevel.push(child._id)
//                 }
//             }
//         }

//         logMemory("After Traversal (Step 3.5)");

//         // ##################################################
//         // ---- STEP 4: Start building the search query filter
//         // ##################################################
//         const filter = {
//             $and: [
//                 {
//                     $or: [
//                         { uploadStatus: "completed" },
//                         { type: "folder" }
//                     ]
//                 }
//             ]
//         }

//         // ##################################################
//         // ---- STEP 5: Filter by search location -----------
//         // ##################################################
//         if (location === "my-docspot") {
//             // search only inside user's own drive
//             filter.owner = userID
//         } else if (location === "trash") {
//             // search only inside user's trash
//             filter.owner = userID
//         } else if (location === "shared") {
//             // search only inside the shared - user sahred item with others
//             filter.owner = userID
//             filter.isShared = true
//         } else if (location === "shared-with-me") {
//             // search only items shared with the current user
//             filter.$and.push({
//                 // atlease one of this condition must be true
//                 $or: [
//                     { "sharedWith.userId": userID },   // the item is shared with current user
//                     { parent: { $in: Array.from(allSharedFolderIds) } }
//                 ]
//             })
//             // exclude the items owend by user so we can only show shared with me 
//             filter.owner = { $ne: userID }
//         } else if (location === "specific-folder" && folderId) {
//             // search inside a specific folder and check permission
//             const permission = await getUserPermission(userID, folderId)
//             if (!permission) {
//                 return res.status(403).json({ success: false, message: "Access denied" })
//             }

//             const allFolderIds = [folderId]
//             const queue = [folderId]

//             // get all nested folders under this specific folder
//             while (queue.length > 0) {
//                 const currentId = queue.shift()
//                 const children = await uploadModel.find({
//                     parent: currentId,
//                     type: "folder"
//                 }).select("_id")

//                 children.forEach(c => {
//                     allFolderIds.push(c._id)
//                     queue.push(c._id)
//                 })
//             }
//             filter.parent = { $in: allFolderIds }
//             filter.$and.push({
//                 $or: [
//                     { owner: userID },
//                     { "sharedWith.userId": userID },
//                     { parent: { $in: allFolderIds } }
//                 ]
//             })
//         } else {
//             // search everywhere (my drive, shared files, or inside shared folders)
//             filter.$and.push({
//                 $or: [
//                     { owner: userID },
//                     { "sharedWith.userId": userID },
//                     { parent: { $in: Array.from(allAccessibleFolderIds) } }
//                 ]
//             })
//         }

//         // ##################################################
//         // ---- STEP 6: Filter by text search query ---------
//         // ##################################################
//         if (query && query.trim() !== "") {
//             filter.name = { $regex: escapeRegex(query.trim()), $options: "i" }
//         }

//         // ##################################################
//         // ---- STEP 7: Filter by type of file --------------
//         // ##################################################
//         if (fileType) {
//             if (fileType === "Folder") {
//                 filter.type = "folder"
//             } else {
//                 const typeMap = {
//                     "Photo": /^image\//,
//                     "PDF": /^application\/pdf/,
//                     "Video": /^video\//,
//                     "Zip": /^application\/(zip|x-zip)/,
//                     "File": /^application\//
//                 }
//                 if (typeMap[fileType]) {
//                     filter.fileType = typeMap[fileType]
//                 }
//             }

//         }

//         // ##################################################
//         // ---- STEP 8: Filter by date created --------------
//         // ##################################################
//         if (dateFrom || dateTo) {
//             filter.createdAt = {}
//             if (dateFrom) {
//                 filter.createdAt.$gte = new Date(dateFrom + "T00:00:00.000Z")
//             }

//             if (dateTo) {
//                 filter.createdAt.$lte = new Date(dateTo + "T23:59:59.999Z")
//             }
//         }

//         // ##################################################
//         // ---- STEP 9: Filter by owner --------------------
//         // ##################################################
//         if (ownerFilter === "owner-by-me") {
//             filter.owner = userID
//             filter.$and = filter.$and.filter(
//                 cond => !cond.$or?.some(o => o["sharedWith.userId"])
//             )
//         } else if (ownerFilter === "not-owner-by-me") {
//             filter.owner = { $ne: userID }
//             filter.$and = filter.$and.filter(
//                 cond => !cond.$or?.some(o => o["sharedWith.userId"])
//             )
//             filter.$and.push({
//                 $or: [
//                     { "sharedWith.userId": userID },
//                     { parent: { $in: Array.from(allAccessibleFolderIds) } }
//                 ]
//             })
//         } else if (ownerFilter === "specific-person" && personIds) {
//             const ids = JSON.parse(personIds)
//             filter.owner = { $in: ids }
//             filter.$and = filter.$and.filter(
//                 cond => !cond.$or?.some(o => o["sharedWith.userId"])
//             )
//             filter.$and.push({
//                 $or: [
//                     { "sharedWith.userId": userID },
//                     { parent: { $in: Array.from(allAccessibleFolderIds) } }
//                 ]
//             })
//         }

//         // ##################################################
//         // ---- STEP 10: Find all folders that are in trash -
//         // ##################################################
//         const trashedFolders = await uploadModel.find({
//             owner: userID,
//             isTrashed: true,
//             type: "folder"
//         }).select("_id").lean()

//         const trashedFolderIds = trashedFolders.map(f => f._id)
//         const allTrashedIds = new Set(trashedFolderIds.map(id => id.toString()))

//         // recursively find all sub-items inside trashed folders
//         if (trashedFolderIds.length > 0) {
//             let currentLevel = trashedFolderIds

//             while (currentLevel.length > 0) {
//                 const children = await uploadModel.find({
//                     parent: { $in: currentLevel }
//                 }).select("_id type").lean()

//                 currentLevel = []
//                 for (const child of children) {
//                     allTrashedIds.add(child._id.toString())
//                     if (child.type === "folder") {
//                         currentLevel.push(child._id)
//                     }
//                 }
//             }
//         }

//         // ##################################################
//         // ---- STEP 11: Apply trash visibility rules ------
//         // ##################################################
//         if (location === "trash") {
//             // show only trashed files and folder items
//             filter.$and.push({
//                 $or: [
//                     { isTrashed: true },
//                     { _id: { $in: Array.from(allTrashedIds) } }
//                 ]
//             })
//         } else {
//             // hide all trashed files and folders
//             filter.isTrashed = { $ne: true }
//             if (allTrashedIds.size > 0) {
//                 filter.$and.push({
//                     _id: { $nin: Array.from(allTrashedIds) }
//                 })
//             }
//         }

//         // ##################################################
//         // ---- STEP 12: Get paginated files and total count -
//         // ##################################################
//         const page = parseInt(req.query.page) || 1
//         const limit = 50
//         const skip = (page - 1) * limit
//         const [results, totalCount] = await Promise.all([
//             uploadModel.find(filter)
//                 .select("name type fileSize fileType updatedAt createdAt parent owner storagePath color isShared")
//                 .populate("owner", "_id name profilePic")
//                 .populate("sharedWith.userId", "_id name")
//                 .sort({ type: -1, createdAt: -1 })
//                 .skip(skip)
//                 .limit(limit)
//                 .lean(),
//             uploadModel.countDocuments(filter)
//         ])

//         // ##################################################
//         // ---- STEP 13: Fetch folder names for paths -------
//         // ##################################################
//         const folderCache = {}
//         const parentIdsToFetch = new Set()
//         results.forEach(item => {
//             if (item.parent) {
//                 parentIdsToFetch.add(item.parent.toString())
//             }
//         })

//         let queue = Array.from(parentIdsToFetch)
//         while (queue.length > 0) {
//             const folders = await uploadModel.find({
//                 _id: { $in: queue }
//             }).select("_id name parent owner isShared").lean()
//             queue = []
//             folders.forEach(f => {
//                 const idStr = f._id.toString()
//                 folderCache[idStr] = f
//                 if (f.parent) {
//                     const parentStr = f.parent.toString()
//                     if (!folderCache[parentStr] && !queue.includes(parentStr)) {
//                         queue.push(parentStr)
//                     }
//                 }
//             })
//         }

//         // ##################################################
//         // ---- STEP 14: Format paths for search results ----
//         // ##################################################
//         const isS3 = process.env.STORAGE_PROVIDER === "s3";

//         const resultsWithPath = results.map(item => {
//             const path = []
//             let currentParent = item.parent?.toString()
//             let rootFolder = null
//             let isParentShared = false

//             while (currentParent && folderCache[currentParent]) {
//                 rootFolder = folderCache[currentParent]
//                 if (rootFolder.isShared) {
//                     isParentShared = true
//                 }
//                 path.unshift(rootFolder.name)
//                 currentParent = rootFolder.parent?.toString()
//             }

//             let prefix = "My Docspot"

//             if (item.parent) {
//                 if (rootFolder) {
//                     const rootOwnerId = rootFolder.owner?._id?.toString() || rootFolder.owner?.toString()
//                     if (rootOwnerId !== userID.toString()) {
//                         prefix = "Shared with me"
//                     } else if (rootFolder.isShared || isParentShared) {
//                         prefix = "Shared"
//                     }
//                 }
//             } else {
//                 const itemOwnerId = item.owner?._id?.toString() || item.owner?.toString()
//                 if (itemOwnerId !== userID.toString()) {
//                     prefix = "Shared with me"
//                 } else if (item.isShared) {
//                     prefix = "Shared"
//                 }
//             }

//             path.unshift(prefix)
//             return {
//                 ...item,
//                 isShared: item.isShared || isParentShared || prefix === "Shared",
//                 isSharedWithMe: prefix === "Shared with me",
//                 // --- CloudFront / S3 Full URL Logic (Commented out for Backend Proxy) ---
//                 // storagePath: item.storagePath
//                 //     ? (isS3 ? getFileUrl(item.storagePath) : `/${item.storagePath}`)
//                 //     : null,
//                 // ------------------------------------------------------------------------
//                 storagePath: item.storagePath ? `/${item.storagePath}` : null,
//                 locationPath: path.join(" / ")
//             }
//         })

//         // ##################################################
//         // ---- STEP 15: Send the results response ----------
//         // ##################################################
//         logMemory("End of search (Response sent)");
//         res.json({ success: true, results: resultsWithPath, totalCount, page, limit })
//     } catch (error) {
//         logger.error(error)
//         res.status(500).json({ success: false, message: error.message })
//     }
// }













// //  models - schema
// import mongoose from "mongoose"
// import uploadModel from "#models/uploadModel"

// // utils - helper
// import { getUserPermission } from "#utils/userPermissionUtil";
// import { logger } from "#utils/logger"
// import { getFileUrl } from "#config/s3";

// // ##################################################
// // ---- CHANGES IN THIS VERSION ----
// // 1. Regex name search -> $text search (uses the "name" text index,
// //    no more full collection scan for every search).
// // 2. A hard $limit is placed BEFORE $graphLookup so its cost is bounded
// //    by (candidate count * depth) with candidate count capped, instead
// //    of being fully unbounded. This does NOT cap folder depth (depth
// //    can still be 2 or 40 per user) — it caps how many documents are
// //    allowed to enter the expensive traversal stage at all.
// // 3. totalCount is now computed from the SAME capped candidate set
// //    (cheap, same pipeline) rather than a full second pass over every
// //    match — so it's accurate up to the cap and free of extra cost.
// //    If you need an exact count beyond the cap, see the note below
// //    STEP 7.
// //
// // ---- STRUCTURAL FIX FOR LATER (removes $graphLookup entirely) ----
// // Store `ancestorIds: [ObjectId]` and `ancestorNames: [String]` directly
// // on each document, maintained on create/move (cheap, infrequent writes)
// // instead of computed on every search (expensive, frequent reads). Once
// // that exists, replace the $graphLookup + postLookupMatch block with a
// // plain indexed $match against ancestorIds — permission checks and path
// // building both become index lookups instead of graph traversals, and
// // this file gets meaningfully shorter. Flagged inline below with TODO.
// // ##################################################

// // kept as a fallback for exact substring matching if you still need it
// // anywhere else, but no longer used for the main name search below.
// const escapeRegex = (string) => {
//     return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
// };

// // Tunable: max candidate documents allowed into $graphLookup per search.
// // Keep this well below what would exhaust available disk under N
// // concurrent searches. 300 is a reasonable starting point — measure
// // with .explain() / mongostat under load and adjust.
// const GRAPHLOOKUP_CANDIDATE_CAP = 300

// export const searchFiles = async (req, res) => {
//     try {

//         // ##################################################
//         // ---- STEP 1: Get query and filter details from request
//         // ##################################################
//         const { query, fileType, dateFrom, dateTo, ownerFilter, location, folderId, personIds } = req.query
//         const userID = req.user._id
//         const userIdStr = userID.toString()

//         // ##################################################
//         // ---- STEP 2: Get folders DIRECTLY shared with user
//         // ##################################################
//         const sharedFolders = await uploadModel.find({
//             "sharedWith.userId": userID,
//             type: "folder",
//             isTrashed: { $ne: true }
//         }).select("_id").lean()

//         const sharedRootFolderIds = sharedFolders.map(f => f._id)

//         // ##################################################
//         // ---- STEP 3: Permission check for "specific-folder" location
//         // ##################################################
//         let folderObjectId = null
//         if (location === "specific-folder" && folderId) {
//             const permission = await getUserPermission(userID, folderId)
//             if (!permission) {
//                 return res.status(403).json({ success: false, message: "Access denied" })
//             }
//             folderObjectId = new mongoose.Types.ObjectId(folderId)
//         }

//         // ##################################################
//         // ---- STEP 4: Build the base $match (cheap + indexed) ----
//         // ##################################################
//         const baseMatch = {
//             $and: [
//                 { $or: [{ uploadStatus: "completed" }, { type: "folder" }] }
//             ]
//         }

//         // CHANGED: $text instead of $regex. Requires:
//         //   uploadModel.schema.index({ name: "text" })
//         // $text uses the index (no scan) and tokenizes the query, so it
//         // matches whole/partial words but not arbitrary substrings the
//         // way regex did. If you need true substring/fuzzy matching, that
//         // is a genuine MongoDB limitation — move search to Meilisearch/
//         // Typesense and keep Mongo as the metadata/permissions source of
//         // truth. $text also requires at least one text-index field
//         // present in $match to use $meta: "textScore" later for sorting
//         // by relevance, if you want that.
//         let usingTextSearch = false
//         if (query && query.trim() !== "") {
//             const trimmed = query.trim()

//             // Full regex substring search
//             baseMatch.$and.push({
//                 name: { $regex: escapeRegex(trimmed), $options: "i" }
//             })

//             // ---- COMMENTED OUT FOR FUTURE USE ($text index search) ----
//             // const TEXT_SEARCH_MIN_LENGTH = 4
//             // if (trimmed.length < TEXT_SEARCH_MIN_LENGTH) {
//             //     baseMatch.$and.push({
//             //         name: { $regex: `^${escapeRegex(trimmed)}`, $options: "i" }
//             //     })
//             // } else {
//             //     baseMatch.$and.push({ $text: { $search: trimmed } })
//             //     usingTextSearch = true
//             // }
//         }

//         if (fileType) {
//             if (fileType === "Folder") {
//                 baseMatch.$and.push({ type: "folder" })
//             } else {
//                 const typeMap = {
//                     "Photo": /^image\//,
//                     "PDF": /^application\/pdf/,
//                     "Video": /^video\//,
//                     "Zip": /^application\/(zip|x-zip)/,
//                     "Documents": /^(application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|application\/vnd\.oasis\.opendocument\.text|text\/plain|application\/rtf|text\/markdown)/,
//                     "Spreadsheets": /^(application\/vnd\.ms-excel|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|application\/vnd\.oasis\.opendocument\.spreadsheet|text\/csv)/
//                 }
//                 if (typeMap[fileType]) {
//                     baseMatch.$and.push({ fileType: typeMap[fileType] })
//                 }
//             }
//         }

//         if (dateFrom || dateTo) {
//             const createdAt = {}
//             if (dateFrom) createdAt.$gte = new Date(dateFrom + "T00:00:00.000Z")
//             if (dateTo) createdAt.$lte = new Date(dateTo + "T23:59:59.999Z")
//             baseMatch.$and.push({ createdAt })
//         }

//         if (location === "my-docspot") {
//             baseMatch.$and.push({ owner: userID })
//         } else if (location === "trash") {
//             baseMatch.$and.push({ owner: userID })
//         } else if (location === "shared") {
//             baseMatch.$and.push({ owner: userID, isShared: true })
//         } else if (location === "shared-with-me") {
//             baseMatch.$and.push({ owner: { $ne: userID } })
//         }

//         if (ownerFilter === "owner-by-me") {
//             baseMatch.$and.push({ owner: userID })
//         } else if (ownerFilter === "not-owner-by-me") {
//             baseMatch.$and.push({ owner: { $ne: userID } })
//         } else if (ownerFilter === "specific-person" && personIds) {
//             const ids = JSON.parse(personIds).map(id => new mongoose.Types.ObjectId(id))
//             baseMatch.$and.push({ owner: { $in: ids } })
//         }

//         if (location !== "trash") {
//             baseMatch.$and.push({ isTrashed: { $ne: true } })
//         }

//         // ##################################################
//         // ---- STEP 5: Ancestor-dependent permission / trash match ----
//         // ##################################################
//         // TODO (structural fix): once ancestorIds/ancestorNames are
//         // denormalized onto each document, this whole block + the
//         // $graphLookup stage in STEP 7 collapse into a single indexed
//         // $match on ancestorIds appended directly to baseMatch — no
//         // separate post-lookup pass needed at all.
//         const permissionOr = [
//             { owner: userID },
//             { "sharedWith.userId": userID },
//             { "ancestors._id": { $in: sharedRootFolderIds } },
//             { "ancestors.owner": userID }
//         ]

//         let postLookupMatch = { $and: [] }

//         if (location === "specific-folder") {
//             postLookupMatch.$and.push({ "ancestors._id": folderObjectId })
//         } else if (location === "shared-with-me") {
//             postLookupMatch.$and.push({
//                 $or: [
//                     { "sharedWith.userId": userID },
//                     { "ancestors._id": { $in: sharedRootFolderIds } }
//                 ]
//             })
//         } else if (location === "trash") {
//             postLookupMatch.$and.push({
//                 $or: [
//                     { isTrashed: true },
//                     { "ancestors.isTrashed": true }
//                 ]
//             })
//         } else if (ownerFilter === "not-owner-by-me" || ownerFilter === "specific-person") {
//             postLookupMatch.$and.push({
//                 $or: [
//                     { "sharedWith.userId": userID },
//                     { "ancestors._id": { $in: sharedRootFolderIds } }
//                 ]
//             })
//         } else if (location !== "my-docspot" && location !== "shared") {
//             postLookupMatch.$and.push({ $or: permissionOr })
//         }

//         if (location !== "trash") {
//             postLookupMatch.$and.push({ "ancestors.isTrashed": { $ne: true } })
//         }

//         if (postLookupMatch.$and.length === 0) {
//             postLookupMatch = {}
//         }

//         // ##################################################
//         // ---- STEP 6: Pagination params ----
//         // ##################################################
//         const page = parseInt(req.query.page) || 1
//         const limit = 50
//         const skip = (page - 1) * limit

//         // ##################################################
//         // ---- STEP 7: Run the aggregation ----
//         // ##################################################
//         // CHANGED: added $sort + $limit BEFORE $graphLookup. This bounds
//         // graphLookup's input to GRAPHLOOKUP_CANDIDATE_CAP documents
//         // regardless of how deep any individual folder tree goes, which
//         // is what actually controls disk/memory spill risk under
//         // concurrent load — not maxDepth (which we deliberately do NOT
//         // set, since real folder depth is user-driven and unbounded).
//         //
//         // Trade-off: if a search matches more than GRAPHLOOKUP_CANDIDATE_CAP
//         // documents, only the most recent N are considered — results
//         // beyond the cap won't surface. For a search UI this is usually
//         // an acceptable trade for guaranteed bounded resource use. If you
//         // need exhaustive results beyond the cap, that's the strongest
//         // signal to do the ancestorIds denormalization (TODO above),
//         // which removes the need for this cap entirely.
//         const pipeline = [
//             { $match: baseMatch },
//             ...(usingTextSearch
//                 ? [{ $addFields: { score: { $meta: "textScore" } } }]
//                 : []
//             ),
//             {
//                 $sort: usingTextSearch
//                     ? { score: -1 }
//                     : { createdAt: -1 }
//             },
//             // { $limit: GRAPHLOOKUP_CANDIDATE_CAP },
//             {
//                 $graphLookup: {
//                     from: uploadModel.collection.name,
//                     startWith: "$parent",
//                     connectFromField: "parent",
//                     connectToField: "_id",
//                     as: "ancestors",
//                     depthField: "depth"
//                 }
//             },
//             { $match: postLookupMatch },
//             { $sort: { type: -1, createdAt: -1 } },
//             {
//                 $facet: {
//                     results: [
//                         { $skip: skip },
//                         { $limit: limit },
//                         {
//                             $lookup: {
//                                 from: "users",
//                                 localField: "owner",
//                                 foreignField: "_id",
//                                 as: "owner",
//                                 pipeline: [{ $project: { _id: 1, name: 1, email: 1, profilePic: 1 } }]
//                             }
//                         },
//                         { $unwind: { path: "$owner", preserveNullAndEmptyArrays: true } },
//                         {
//                             $lookup: {
//                                 from: "users",
//                                 localField: "sharedWith.userId",
//                                 foreignField: "_id",
//                                 as: "sharedWithUsers",
//                                 pipeline: [{ $project: { _id: 1, name: 1, email: 1, profilePic: 1 } }]
//                             }
//                         },
//                         {
//                             $project: {
//                                 name: 1, type: 1, fileSize: 1, totalSize: 1, fileType: 1,
//                                 updatedAt: 1, createdAt: 1, parent: 1, owner: 1,
//                                 storagePath: 1, color: 1, isShared: 1,
//                                 sharedWithUsers: 1,
//                                 sharedWith: 1,
//                                 isTrashed: 1,
//                                 ancestors: {
//                                     $map: {
//                                         input: "$ancestors",
//                                         as: "a",
//                                         in: { _id: "$$a._id", name: "$$a.name", depth: "$$a.depth" }
//                                     }
//                                 }
//                             }
//                         }
//                     ],
//                     // CHANGED: totalCount now comes from the same capped
//                     // set (cheap - no second full pass). Accurate up to
//                     // GRAPHLOOKUP_CANDIDATE_CAP; beyond that it reports
//                     // the cap. If exact counts beyond the cap matter to
//                     // your UI, do the ancestorIds denormalization instead
//                     // of raising the cap.
//                     totalCount: [{ $count: "count" }]
//                 }
//             }
//         ]

//         const [aggResult] = await uploadModel.aggregate(pipeline)
//         const results = aggResult?.results ?? []
//         const totalCount = aggResult?.totalCount?.[0]?.count ?? 0

//         // ##################################################
//         // ---- STEP 8: Build display paths from the ancestors we
//         // already fetched in $graphLookup (no extra DB round trips) ----
//         // ##################################################
//         const isS3 = process.env.STORAGE_PROVIDER === "s3"

//         const resultsWithPath = results.map(item => {
//             const sortedAncestors = [...(item.ancestors || [])].sort((a, b) => b.depth - a.depth)

//             const isInsideSharedFolder = sortedAncestors.some(a =>
//                 sharedRootFolderIds.some(id => id.toString() === a._id.toString())
//             )

//             const path = sortedAncestors.map(a => a.name)

//             if (item.owner?._id?.toString() !== userIdStr || isInsideSharedFolder) {
//                 path.unshift("Shared with me")
//             } else if (item.isShared) {
//                 path.unshift("Shared")
//             } else {
//                 path.unshift("My Docspot")
//             }

//             if (item.sharedWith && item.sharedWithUsers) {
//                 item.sharedWith = item.sharedWith.map(share => {
//                     const userDetails = item.sharedWithUsers.find(
//                         u => u._id.toString() === share.userId?.toString()
//                     );
//                     return {
//                         ...share,
//                         userId: userDetails || share.userId
//                     };
//                 });
//             }

//             return {
//                 ...item,
//                 isShared: item.isShared || isInsideSharedFolder || path[0] === "Shared",
//                 isSharedWithMe: path[0] === "Shared with me",
//                 storagePath: item.storagePath ? `/${item.storagePath}` : null,
//                 locationPath: path.join(" / "),
//                 ancestors: undefined
//             }
//         })

//         // ##################################################
//         // ---- STEP 9: Send the results response ----
//         // ##################################################
//         res.json({
//             success: true,
//             results: resultsWithPath,
//             totalCount,
//             totalCountCapped: totalCount >= GRAPHLOOKUP_CANDIDATE_CAP,
//             page,
//             limit
//         })
//     } catch (error) {
//         logger.error(error)
//         res.status(500).json({ success: false, message: error.message })
//     }
// }










//  models - schema
import mongoose from "mongoose"
import uploadModel from "#models/uploadModel"

// utils - helper
import { getUserPermission } from "#utils/userPermissionUtil";
import { logger } from "#utils/logger"
import { getFileUrl } from "#config/s3";


const escapeRegex = (string) => {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

export const searchFiles = async (req, res) => {
    try {

        // ##################################################
        // ---- STEP 1: Get query and filter details from request
        // ##################################################
        const { query, fileType, dateFrom, dateTo, ownerFilter, location, folderId, personIds } = req.query
        const userID = req.user._id
        const userIdStr = userID.toString()

        // ##################################################
        // ---- STEP 2: Get folders DIRECTLY shared with user
        // 
        // ##################################################

        const sharedFolders = await uploadModel.find({
            "sharedWith.userId": userID,
            type: "folder",
            isTrashed: { $ne: true }
        }).select("_id").lean()

        const sharedRootFolderIds = sharedFolders.map(f => f._id)

        // folders OWNED by this user
        // We need this so you can search for files that collaborators uploaded into YOUR folders.
        const ownedFolders = await uploadModel.find({
            owner: userID,
            type: "folder",
            isTrashed: { $ne: true }
        }).select("_id").lean()

        const ownedFolderIds = ownedFolders.map(f => f._id)

        const accessibleAncestorIds = [...sharedRootFolderIds, ...ownedFolderIds]

        // folders owned by the user that are currently trashed — used to
        // const trashedFolders = await uploadModel.find({
        //     owner: userID,
        //     isTrashed: true,
        //     type: "folder"
        // }).select("_id").lean()

        // const trashedFolderIds = trashedFolders.map(f => f._id)

        // ##################################################
        // ---- STEP 3: Permission check for specific-folder location
        // ##################################################
        let folderObjectId = null
        if (location === "specific-folder" && folderId) {
            const permission = await getUserPermission(userID, folderId)
            if (!permission) {
                return res.status(403).json({ success: false, message: "Access denied" })
            }
            folderObjectId = new mongoose.Types.ObjectId(folderId)
        }

        // ##################################################
        // ---- STEP 4: Build the ONE flat $match (indexed, no graph walk)
        // ##################################################
        const filter = {
            $and: [
                { $or: [{ uploadStatus: "completed", scanStatus: { $ne: "scanning" } }, { type: "folder" }] }
            ]
        }

        // ---- text search (regex kept as requested) ----
        if (query && query.trim() !== "") {
            filter.$and.push({
                name: { $regex: escapeRegex(query.trim()), $options: "i" }
            })
        }

        // ---- file type filter ----
        if (fileType) {
            if (fileType === "Folder") {
                filter.$and.push({ type: "folder" })
            } else {
                const typeMap = {
                    "Photo": /^image\//,
                    "PDF": /^application\/pdf/,
                    "Video": /^video\//,
                    "Zip": /^application\/(zip|x-zip)/,
                    "Documents": /^(application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|application\/vnd\.oasis\.opendocument\.text|text\/plain|application\/rtf|text\/markdown)/,
                    "Spreadsheets": /^(application\/vnd\.ms-excel|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|application\/vnd\.oasis\.opendocument\.spreadsheet|text\/csv)/
                }
                if (typeMap[fileType]) {
                    filter.$and.push({ fileType: typeMap[fileType] })
                }
            }
        }

        // ---- date range filter ----
        if (dateFrom || dateTo) {
            const createdAt = {}
            if (dateFrom) createdAt.$gte = new Date(dateFrom + "T00:00:00.000Z")
            if (dateTo) createdAt.$lte = new Date(dateTo + "T23:59:59.999Z")
            filter.$and.push({ createdAt })
        }

        // ---- location filter ----
        if (location === "my-docspot") {
            filter.$and.push({ owner: userID })
        } else if (location === "trash") {
            filter.$and.push({ owner: userID })
        } else if (location === "shared") {
            // Find folders owned by the user that are actually shared
            const ownedSharedFolders = await uploadModel.find({
                owner: userID,
                type: "folder",
                isShared: true,
                isTrashed: { $ne: true }
            }).select("_id").lean();
            const ownedSharedFolderIds = ownedSharedFolders.map(f => f._id);

            filter.$and.push({
                owner: userID,
                $or: [
                    { isShared: true },
                    { ancestorIds: { $in: ownedSharedFolderIds } }
                ]
            })
        } else if (location === "shared-with-me") {
            filter.$and.push({ owner: { $ne: userID } })
            filter.$and.push({
                $or: [
                    { "sharedWith.userId": userID },
                    { ancestorIds: { $in: sharedRootFolderIds } }
                ]
            })
        } else if (location === "specific-folder" && folderObjectId) {
            // item must live somewhere under folderId — flat indexed check,
            // works no matter how deep, no manual recursion needed
            filter.$and.push({ ancestorIds: folderObjectId })
        } else {
            // default "search everywhere" — owned, directly shared, or
            // nested inside a folder shared with me OR nested in my own folder
            filter.$and.push({
                $or: [
                    { owner: userID },
                    { "sharedWith.userId": userID },
                    { ancestorIds: { $in: accessibleAncestorIds } }
                ]
            })
        }

        // ---- owner filter ----
        if (ownerFilter === "owner-by-me") {
            filter.$and.push({ owner: userID })
        } else if (ownerFilter === "not-owner-by-me") {
            filter.$and.push({ owner: { $ne: userID } })
            filter.$and.push({
                $or: [
                    { "sharedWith.userId": userID },
                    { ancestorIds: { $in: accessibleAncestorIds } }
                ]
            })
        } else if (ownerFilter === "specific-person" && personIds) {
            const ids = JSON.parse(personIds).map(id => new mongoose.Types.ObjectId(id))
            filter.$and.push({ owner: { $in: ids } })
            filter.$and.push({
                $or: [
                    { "sharedWith.userId": userID },
                    { ancestorIds: { $in: accessibleAncestorIds } }
                ]
            })
        }

        // ---- trash visibility rules ----
        if (location === "trash") {
            filter.$and.push({ isTrashed: true })
        } else {
            filter.$and.push({ isTrashed: { $ne: true } })
        }

        // ##################################################
        // ---- STEP 5: Pagination params ----
        // ##################################################
        const page = parseInt(req.query.page) || 1
        const limit = 50
        const skip = (page - 1) * limit

        // ##################################################
        // ---- STEP 6: Run the query 
        // ##################################################
        // console.log("[QUERY ARRAY SIZES]", {
        //     sharedRootFolderIds: sharedRootFolderIds.length,
        //     accessibleAncestorIds: accessibleAncestorIds.length
        // });
        const [results, totalCount] = await Promise.all([
            uploadModel.find(filter)
                .select("name type fileSize totalSize fileType updatedAt createdAt parent ancestorIds owner storagePath color isShared sharedWith isTrashed")
                .populate("owner", "_id name email profilePic")
                .populate("sharedWith.userId", "_id name email profilePic")
                .sort({ type: -1, createdAt: -1, _id: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            uploadModel.countDocuments(filter)
        ])

        // ##################################################
        // ---- STEP 7: Build display paths using ancestorIds
        // ##################################################
        const allAncestorIds = new Set()
        results.forEach(item => {
            // console.log(`[ANCESTOR DEPTH] ${item.name} -> depth: ${(item.ancestorIds || []).length}`);
            (item.ancestorIds || []).forEach(id => allAncestorIds.add(id.toString()))
        })

        const nameMap = new Map()
        const ancestorSharedSet = new Set()
        if (allAncestorIds.size > 0) {
            const ancestorDocs = await uploadModel.find({
                _id: { $in: Array.from(allAncestorIds) }
            }).select("_id name isShared").lean()

            ancestorDocs.forEach(doc => {
                nameMap.set(doc._id.toString(), doc.name)
            })

            // track which ancestor folders are shared (owned by user but shared with others)
            ancestorDocs.forEach(doc => {
                if (doc.isShared) ancestorSharedSet.add(doc._id.toString())
            })
        }

        const isS3 = process.env.STORAGE_PROVIDER === "s3"

        const resultsWithPath = results.map(item => {
            // ancestorIds is already stored root -> leaf order (see
            // created), so we can map it directly without re-sorting
            const path = (item.ancestorIds || [])
                .map(id => nameMap.get(id.toString()))
                .filter(Boolean)

            const isInsideSharedFolder = (item.ancestorIds || []).some(id =>
                sharedRootFolderIds.some(sharedId => sharedId.toString() === id.toString())
            )

            // ancestor is an owned folder that has been shared with others
            const isInsideOwnedSharedFolder = (item.ancestorIds || []).some(id =>
                ancestorSharedSet.has(id.toString())
            )

            if (item.isTrashed) {
                path.unshift("Trash")
            } else if (isInsideSharedFolder) {
                // The parent folder was shared WITH me
                path.unshift("Shared with me")
            } else if (isInsideOwnedSharedFolder) {
                // I own the parent folder, and I shared it with others
                path.unshift("Shared")
            } else if (item.owner?._id?.toString() !== userIdStr) {
                // It's a direct file share TO me (not inside any folder)
                path.unshift("Shared with me")
            } else if (item.isShared) {
                // I own the file directly, and I shared it with others
                path.unshift("Shared")
            } else {
                // I own the file, and it's completely private
                path.unshift("My Docspot")
            }

            return {
                ...item,
                isShared: item.isShared || isInsideSharedFolder || isInsideOwnedSharedFolder,
                isSharedWithMe: path[0] === "Shared with me",
                storagePath: item.storagePath ? `/${item.storagePath}` : null,
                locationPath: path.join(" / "),
                ancestorIds: undefined  // internal only, don't leak raw ids to client
            }
        })

        // ##################################################
        // ---- STEP 8: Send the results response ----
        // ##################################################
        res.json({
            success: true,
            results: resultsWithPath,
            totalCount,
            page,
            limit
        })

    } catch (error) {
        logger.error(error)
        res.status(500).json({ success: false, message: error.message })
    }
}
