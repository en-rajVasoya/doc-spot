import uploadModel from "#models/uploadModel";

//  helper function for socket notify all user that some change made
export const notifySharedUsers = async (itemId, event, data, emitToUser) => {
  let current = await uploadModel.findById(itemId).select("sharedWith parent owner")

  while (current) {
    // always notify owner
    if (current.owner) {
      emitToUser(current.owner.toString(), event, data)
    }

    // notify shared users if any
    if (current.sharedWith?.length > 0) {
      current.sharedWith.forEach(s => {
        emitToUser(s.userId.toString(), event, data)
      })
      break
    }

    if (!current.parent) break
    current = await uploadModel.findById(current.parent).select("sharedWith parent owner")
  }
}
