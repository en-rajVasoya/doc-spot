import { localDiskStorage } from "./localDiskStorage.js";
import { s3Storage } from "./s3Storage.js";



export const getStorage = () => {
    // Check if the environment variable is explicitly set to "s3"
    if (process.env.STORAGE_PROVIDER === "s3") {
        return s3Storage;
    }
    
    // Default to local disk for development or if the variable is missing
    return localDiskStorage;
};