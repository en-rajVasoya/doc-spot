import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { logger } from "#utils/logger";

// this is use for s3 connct 
export const s3Client = new S3Client({
    region: process.env.AWS_REGION  || "ap-south-1"
})


//  export the bucket name 



// ==========================================
// 1. Get File URL (CloudFront or S3 Fallback)
// ==========================================
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN; 

export const getFileUrl = (key) => {
    if(!key) return
    if(CLOUDFRONT_DOMAIN){
        return `https://${CLOUDFRONT_DOMAIN}/${key}`
    }

    return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || "ap-south-1"}.amazonaws.com/${key}`;
}



// ==========================================
// 2. Extract S3 key(path) from the full cloudfront url
// ==========================================
export const getS3KeyFromUrl = (url) => {
    try {
        const parsedUrl = new URL(url);
        // This removes the domain name and the first slash (/) to get the raw key
        return decodeURIComponent(parsedUrl.pathname.substring(1));
    } catch (err) {
        logger.error("Invalid URL:", url);
        return null;
    }
};



// ==========================================
// 3. Delete from S3 using CloudFront URL
// ==========================================


export const deleteFromS3 = async (fileUrl) => {
    const isS3 = process.env.STORAGE_PROVIDER === "s3";
    // Safety check: Only run if we are in S3 mode and the URL is a real web link
    if (!isS3 || !s3Client || !fileUrl?.startsWith("http")){
        logger.error(`deleteFromS3 skipped — isS3:${isS3}, hasClient:${!!s3Client}, fileUrl:${fileUrl}`)
        return
    };
    
    // Use the 2nd function to chop up the URL and find the key
    const key = getS3KeyFromUrl(fileUrl);
    if (!key) return;
    
    try {
        // Send the exact key to AWS to be deleted
        await s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: key
        }));
    } catch (err) {
        logger.error("S3 Delete Error:", err);
    }
};