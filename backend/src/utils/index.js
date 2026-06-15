// search optimization function
export const searchOptimize = (searchQuery) => {
    return { $regex: searchQuery, $options: "i" }
}

// function which always return bool value 
export const getBoolVal = (value) => {
    if (value === true || value === "true" || value === "True") return true;
    if (value === false || value === "false" || value === "False") return false;

    return false; // undefined, null, or anything else
};

export const getFolderContentsRecursive = async (parentId, depth = 0, maxDepth = 10) => {
    if (depth >= maxDepth) return [];

    const items = await uploadModel.find({ parent: parentId });

    const result = await Promise.all(items.map(async (item) => {
        if (item.type === "folder") {
            const children = await getFolderContentsRecursive(item._id, depth + 1, maxDepth);
            return { ...item.toObject(), children };
        }
        return item.toObject();
    }));

    return result;
};