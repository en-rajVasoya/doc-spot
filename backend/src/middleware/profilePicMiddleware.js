//  this is User profile photo create and update middel ware using multer 

import multer from "multer"
import path from "path"
import fs from "fs"


//  first if profile pic directory not exist check 
const PROFILE_PIC_DIR = path.resolve("uploadimage/profilepic")
if(!fs.existsSync(PROFILE_PIC_DIR)){
    fs.mkdirSync("uploadimage/profilepic", {recursive: true})
}


//  Multer storage config - where to save file and what will be the file name
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, PROFILE_PIC_DIR)
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase()
        // unique name will be - profile_ currentTimestep_ random 9digit number
        const uniqueName = `profile_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`
        cb(null, uniqueName)
    }
})


// File config - cheking file MIME type and allowwd only some of files
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|svg|gif/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimeType = allowedTypes.test(file.mimeType)

    if(extname && mimeType){
        cb(null, true)
    } else {
        cb(new Error("Only jpg, jpeg, png, svg, gif files are allowed"), false)
    }
}



//  export multer instance
const profilePicUploadMiddleware = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter
})


export default profilePicUploadMiddleware