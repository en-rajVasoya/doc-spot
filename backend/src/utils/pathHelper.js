import path from "path";

/**
 * Converts a relative storagePath (stored in MongoDB) to an absolute disk path.
 * Example: "/files/76/uuid.pdf" → "D:\Mihir\docspotV2\backend\files\76\uuid.pdf"
 * 
 * Works on both Windows and Linux.
 */
export const getAbsolutePath = (storagePath) => {
    if (!storagePath) return null;
    // Remove leading slash so path.join works correctly on all OS
    const cleanPath = storagePath.startsWith("/") ? storagePath.slice(1) : storagePath;
    return path.join(process.cwd(), cleanPath);
};
