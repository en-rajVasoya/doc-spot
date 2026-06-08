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