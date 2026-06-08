export const BLOCKED_EXTENSIONS = new Set([
    ".exe", ".msi", ".bat", ".cmd",  ".scr", ".pif",
    ".vbs", ".vbe", ".jse", ".wsf", ".wsh", ".ps1", ".ps2", ".sh",
    ".reg", ".inf", ".ins", ".isp",
    ".jar", ".dll", ".sys", ".drv"
])

export const isBlockedFile = (fileName) => {
    if (!fileName) return false
    const ext = "." + fileName.split(".").pop().toLowerCase()
    return BLOCKED_EXTENSIONS.has(ext)
}


// ".com",