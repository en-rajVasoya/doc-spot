import uploadModel from "#models/uploadModel";

//  1) checking here if user have this current folder or file permsioon t oaccess it or not
// helper function
export const getUserPermission = async (userId, itemId) => {
    let current = await uploadModel.findById(itemId)
        .select("owner parent sharedWith")

    while (current) {
        //  owner has always full access
        if (current.owner.toString() === userId.toString()) return "owner"

        //  if not owner then find the userId
        const match = current.sharedWith?.find(
            s => s.userId.toString() === userId.toString()
        )

        //  return permission 
        if (match) return match.permission

        //  if this file is parent then stop here
        if (!current.parent) break

        //  if file or folder has a parent then return that folder permission
        current = await uploadModel.findById(current.parent)
            .select("owner parent sharedWith")
    }
    return null
}






//  this fucntion is for when ser shared oen folder so all insdie the folder icon will change here in front end 
export const checkIsSharedTree = async (itemId) => {
    let current = await uploadModel.findById(itemId).select("parent isShared sharedWith");
    while (current) {
        // If this specific folder is shared, the whole tree inside it is shared
        if (current.isShared || (current.sharedWith && current.sharedWith.length > 0)) {
            return true;
        }
        // Stop if we reach the root
        if (!current.parent) break;
        // Move up to the next parent
        current = await uploadModel.findById(current.parent).select("parent isShared sharedWith");
    }
    return false;
}