//  this file is used for cron job like every day one time checking like if trashed item 30day tme left or not if yes then auto delete this
import cron from "node-cron"
import Upload from "../models/uploadModel.js"
import fs from "fs"
import { deleteForver } from "../controllers/trashController.js"



export const startTrashCleanup = () => {
    // here cron job will run at 0 miniue, 0 hour (midnight), * daay, * month, * year
    // so it will run at everydat at midnight here 12:00
    cron.schedule("0 0 * * * ", async () => {
        console.log("[Trash cleanup] starting....")
        try {
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)  // this will giveyou date 30days ago

            const expiredItems = await Upload.find({
                isTrashed: true,
                trashedAt: { $lte: thirtyDaysAgo }
            }).select("_id type storagePath")
            
            //  if no expired items
            if(expiredItems.length === 0){
                console.log("[TRASH CLEANUP] No expired items")
                return
            }  

            //  if there any expired item then delete root and all nested here
            for(const item of expiredItems){
                try {
                    await deleteForver(item)
                    console.log(`[trash cleanup] item deleted forever ${item.name}`)
                } catch (error) {
                    console.error(`[TRASH CLEANUP] Failed to delete item ${item._id}: ${error.message}`)
                }
            }

            console.log(`[TRASH CLEANUP] Done — deleted ${expiredItems.length} items`)


        } catch (error) {
            console.error("[TRASH CLEANUP] Error:", error.message)
        }
    })
}