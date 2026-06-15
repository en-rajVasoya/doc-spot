//  here this function will generate here the link fo r sharing 

export const generateShareLinks = (items) => {
    //  this will insure that items in the array if not convert in to it
    const itemsToProcess = Array.isArray(items) ? items : [items]

   
    //  generate link for each item and give the new array 
    return itemsToProcess.map(item => ({
        link: `${import.meta.env.VITE_SHARED_LINK_URL}/share?token=${crypto.randomUUID().replace(/-/g, "").substring(0, 7)}`,
        type: item.type,
        item_id: item._id
    }))
}