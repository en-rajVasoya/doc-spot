// Media file
import videoFile from "@images/svgs/media/video-file.svg";
import imgFile from "@images/svgs/media/img-file.svg";
import pdfFile from "@images/svgs/media/pdf-file.svg";
import zipFile from "@images/svgs/media/zip-file.svg";
import musicFile from "@images/svgs/media/music-file.svg";


//  defining the file icon whic type of i con i need for main screen

const getFileIcon = (name) => {
    if(!name) return imgFile;

    const lower = name.toLowerCase();

    // if .tar.gz return zip file icon
    if(lower.endsWith(".tar.gz")) {
        return zipFile
    };

    // getting the extension
    const ext = lower.split(".").pop()

    //  if ifle is video
    if(["mp4", "mkv", "avi", "mov", "wmv"].includes(ext)) {
        return videoFile
    };


    //  if file is image
    if([
        "jpg", "jpeg", "png", "gif", "bmp", "tiff", "tif",
        "svg", "webp", "cr2", "nef", "arw", "psd", "heic",
        "eps", "pcx"
    ].includes(ext)){
        return imgFile
    }


    //  if file is archive
    if(["zip", "rar", "iso", "gz", "tar", "exe", "tgz"].includes(ext)){
        return zipFile
    }

     // PDF
    if (ext === "pdf") return pdfFile;

    // Music
    if (["mp3", "wav", "aac"].includes(ext)) {
        return musicFile;
    }


    //  Default icon
    return zipFile

}


export default getFileIcon