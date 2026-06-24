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

/**
 * Checks magic bytes to verify if the file is a valid ZIP archive (PK\x03\x04).
 */
export const isRealZip = async (file) => {
    if (!file || file.size < 4) return false;
    try {
        const buffer = await file.slice(0, 4).arrayBuffer();
        const bytes = new Uint8Array(buffer);
        return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
    } catch (e) {
        console.error("Failed to check ZIP magic bytes:", e);
        return false;
    }
};

/**
 * Scans the first-level contents of a ZIP file using slicing to read its index.
 * Does not decompress or extract nested ZIPs.
 * Safe for large files up to 100GB+.
 */
export const checkZipContainsBlocked = async (file) => {
    if (!file) return false;
    const claimsToBeZip = file.name?.endsWith(".zip") || file.type === "application/zip";
    if (!claimsToBeZip) return false;

    // Verify magic bytes (PK\x03\x04) to make sure it is a real ZIP file
    const isZip = await isRealZip(file);
    if (!isZip) {
        // If it's not a real ZIP, we cannot scan it. We let the upload proceed.
        return false; 
    }

    try {
        const size = file.size;

        // 1. Read EOCD (End of Central Directory) at the end of the file
        const eocdReadLength = Math.min(size, 65558);
        const eocdStart = size - eocdReadLength;
        const eocdSlice = file.slice(eocdStart, size);
        const eocdBuffer = await eocdSlice.arrayBuffer();
        const eocdView = new DataView(eocdBuffer);

        let eocdOffset = -1;
        for (let i = eocdBuffer.byteLength - 22; i >= 0; i--) {
            if (eocdView.getUint32(i, true) === 0x06054b50) { // Signature: PK\x05\x06
                eocdOffset = i;
                break;
            }
        }
        if (eocdOffset === -1) return false;

        let cdSize = eocdView.getUint32(eocdOffset + 12, true);
        let cdOffset = eocdView.getUint32(eocdOffset + 16, true);

        // ZIP64 support for files larger than 4GB
        if (cdOffset === 0xffffffff || cdSize === 0xffffffff) {
            const locatorOffset = eocdOffset - 20;
            if (locatorOffset >= 0 && eocdView.getUint32(locatorOffset, true) === 0x07064b50) { // Signature: PK\x06\x07
                const zip64EocdOffset = Number(eocdView.getBigUint64(locatorOffset + 8, true));
                const zip64Slice = file.slice(zip64EocdOffset, zip64EocdOffset + 56);
                const zip64Buffer = await zip64Slice.arrayBuffer();
                const zip64View = new DataView(zip64Buffer);
                if (zip64View.getUint32(0, true) === 0x06064b50) { // Signature: PK\x06\x06
                    cdSize = Number(zip64View.getBigUint64(40, true));
                    cdOffset = Number(zip64View.getBigUint64(48, true));
                }
            }
        }

        // 2. Read ONLY the Central Directory slice
        const cdSlice = file.slice(cdOffset, cdOffset + cdSize);
        const cdBuffer = await cdSlice.arrayBuffer();
        const cdView = new DataView(cdBuffer);
        const decoder = new TextDecoder("utf-8");

        let offset = 0;
        while (offset < cdBuffer.byteLength) {
            if (cdView.getUint32(offset, true) !== 0x02014b50) { // Signature: PK\x01\x02
                break; 
            }

            const fileNameLength = cdView.getUint16(offset + 28, true);
            const extraFieldLength = cdView.getUint16(offset + 30, true);
            const fileCommentLength = cdView.getUint16(offset + 32, true);

            const nameBuffer = new Uint8Array(cdBuffer, offset + 46, fileNameLength);
            const fileName = decoder.decode(nameBuffer);

            // Check if the filename itself is blocked
            if (isBlockedFile(fileName)) {
                return true;
            }

            offset += 46 + fileNameLength + extraFieldLength + fileCommentLength;
        }
    } catch (e) {
        console.error("Failed to read zip contents:", e);
    }
    return false;
};