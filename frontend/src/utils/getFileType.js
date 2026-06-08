
//  here when user click on file detet first what file is this then we can open modal here

const getFileType = (name = "") => {
    const lower = name.toLowerCase()

    // special case here
    if (lower.endsWith(".tar.gz")) return "zip";

    const ext = lower.split(".").pop()


    //  if image
    if (["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "heic"].includes(ext)) return "image";


    // video
    if (["mp4", "mkv", "avi", "mov", "wmv", "mpeg"].includes(ext)) return "video"


    // AUDIO
    if (["mp3", "wav", "aac", "ogg"].includes(ext)) return "audio"



    // // PDF
    if (ext === "pdf") return "pdf"

    //  txt and md files here
    if (["txt", "md", "json", "xml", "yaml", "yml", "env", "log"].includes(ext)) return "text"


    // zip / archive
    if (["zip", "rar", "gz", "tar", "tgz", "7z"].includes(ext)) return "zip"


    // Excel
    if (["xlsx", "xls", "csv"].includes(ext)) return "excel"

    // Word
    if (["doc", "docx"].includes(ext)) return "doc"


    return "other"

}


export default getFileType