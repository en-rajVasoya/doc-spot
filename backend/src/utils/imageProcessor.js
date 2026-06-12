import sharp from "sharp"
import path from "path"

//  utils
import { logger } from "#utils/logger"



//  this function is used for comprass the user profil image
export const processProfileImage = async (file) => {
    try {
        //  if there is no file then return 
        if(!file) return null

        const localFilePath = file.path;
        const fileDir = path.dirname(localFilePath)
        const baseName = path.parse(file.filename).name


        //  stpe - 1 define the new file names
        const compressedFileName = `compressed-${baseName}.webp`;
        const thumbFileName = `thumb-${baseName}.png`;

        //  spte - 2 define the full paths on the disk 
        const compressedFilePath = path.join(fileDir, compressedFileName)
        const thumbFilePath = path.join(fileDir, thumbFileName)

        //  step - 3 - create comprassed webp (96x96)
        await sharp(localFilePath)
            .resize(96, 96)
            .webp({ quality: 90 })
            .toFile()

    } catch (error) {
        
    }
}