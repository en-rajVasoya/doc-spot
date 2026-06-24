import sharp from "sharp"
import path from "path"
import fs from "fs"
//  utils
import { logger } from "#utils/logger"

export const processProfileImage = async (file) => {
    try {
        if (!file) return null
        const localFilePath = file.path;
        const baseName = path.parse(localFilePath).name
        const fileDir = path.dirname(localFilePath)

        // step - 1: define sub-folders
        const compressedDir = path.join(fileDir, "compressed")
        const thumbDir = path.join(fileDir, "thumbnail")

        // step - 2: create folders if they don't exist
        fs.mkdirSync(compressedDir, { recursive: true })
        fs.mkdirSync(thumbDir, { recursive: true })

        // step - 3: define the new file names
        const compressedFileName = `compressed-${baseName}.webp`;
        const thumbFileName = `thumb-${baseName}.webp`;

        // step - 4: define the full paths on the disk
        const compressedFilePath = path.join(compressedDir, compressedFileName)
        const thumbFilePath = path.join(thumbDir, thumbFileName)

        // step - 5: create compressed webp (96x96)
        await sharp(localFilePath)
            .resize(96, 96, { fit: "cover", position: "center" })
            .webp({ quality: 90 })
            .toFile(compressedFilePath)

        // step - 6: create thumbnail webp (32x32)
        await sharp(localFilePath)
            .resize(200, 200, { fit: "cover", position: "center" })
            .webp({ quality: 80 })
            .toFile(thumbFilePath)

        logger.info(`Profile image processed: ${baseName}`)

        // step - 7: return all file names so the caller can store them
        return {
            original_url: `${path.relative(process.cwd(), localFilePath).replace(/\\/g, "/")}`,
            compressed_url: `uploadimage/profilepic/compressed/${compressedFileName}`,
            thumbnail_url: `uploadimage/profilepic/thumbnail/${thumbFileName}`,
        }
    } catch (error) {
        logger.error("processProfileImage error:", error)
        return null
    }
}