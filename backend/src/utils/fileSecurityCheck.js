import { fileTypeFromBuffer } from "file-type"


//  all blocked extension here
const BLOCKED_EXTENSIONS = new Set([
    ".exe", ".msi", ".bat", ".cmd", ".scr", ".pif",
    ".vbs", ".vbe", ".jse", ".wsf", ".wsh", ".ps1", ".ps2", ".sh",
    ".reg", ".inf", ".ins", ".isp",
    ".jar", ".dll", ".sys", ".drv"
])


//  ".com",



//  all BLOCKED MIME TPYE here
const BLOCKED_MIMES = new Set([
    "application/x-msdownload",
    "application/x-executable",
    "application/x-msdos-program",
    "application/x-msi",
    "application/java-archive",
    "application/x-sh",
    "application/x-bat",
    "application/x-dosexec"
])




//  here we are doing security check 
export const checkFileSecurity = async (fileName, fileHeader) => {
    //  extension check first 
    if (fileName) {
        const ext = "." + fileName.split(".").pop().toLowerCase()
        if (BLOCKED_EXTENSIONS.has(ext)) {
            return { safe: false, reason: "File type not allowed" }
        }
    }

    //  MIME type check here from reading data of file
    if (fileHeader) {
        try {
            const buffer = Buffer.isBuffer(fileHeader) ? fileHeader : Buffer.from(fileHeader, "base64")
            const result = await fileTypeFromBuffer(buffer)
            if (result && BLOCKED_MIMES.has(result.mime)) {
                return { safe: false, reason: "Dangerous file detected" }
            }
        } catch (_) { }
    }

    return { safe: true }

}