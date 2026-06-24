import { useEffect, useState, useRef } from "react";
import DownloadPanel from "../download/DownloadPanel.jsx";
import getFileType from "../../../utils/getFileType.js";
import { Tooltip, OverlayTrigger } from "react-bootstrap";
import InteractiveIcon from "../../layout/InteractiveIcon.jsx";
// import FeatherIcon from "feather-icons-react";

import ImageViewer from "../filePreview/ImageViewer";
import VideoViewer from "../filePreview/VideoViewer";
import AudioViewer from "../filePreview/AudioViewer";
import ExcelViewer from "../filePreview/ExcelViewer";
import ZipViewer from "../filePreview/ZipViewer";
import TextViewer from "../filePreview/TextViewer";
import DocViewer from "../filePreview/DocViewer.jsx";
import PdfViewer from "./PdfViewer.jsx";


import downloadIcon from "@images/icon/download.svg";
import closeIcon from "@images/icon/close-icon.svg";
import arrowLeftIcon from "@images/icon/arrow-left.svg";
import fileIcon from "@images/svgs/file.svg";
import { useDownload } from "../../../context/DownloadContext.jsx";
import copyIcon from "@images/icon/copy.svg";
import copiedIcon from "@images/icon/copied-icon.svg";

// Map MIME type to viewer type string
const mimeToType = (mime = "") => {
    const m = mime.toLowerCase();
    if (m.startsWith("image/")) return "image";
    if (m.startsWith("video/")) return "video";
    if (m.startsWith("audio/")) return "audio";
    if (m === "application/pdf") return "pdf";
    if (m === "text/csv" || m.includes("spreadsheet") || m.includes("excel")) return "excel";
    if (m.includes("wordprocessingml") || m === "application/msword") return "doc";
    if (m === "application/zip" || m.includes("zip") || m.includes("compressed")) return "zip";
    if (m.startsWith("text/")) return "text";
    return null;
};

// Resolve viewer type from MIME, filename, or URL
const resolveType = (file) => {
    if (file.file_type) {
        const fromMime = mimeToType(file.file_type);
        if (fromMime) return fromMime;
    }
    if (file.name) {
        const fromExt = getFileType(file.name);
        if (fromExt && fromExt !== "other") return fromExt;
    }
    if (file.url) {
        const fromUrl = getFileType(file.url.split("?")[0]);
        if (fromUrl && fromUrl !== "other") return fromUrl;
    }
    return "other";
};

function FilePreviewModal({ file, onClose }) {
    const { downloadFile } = useDownload();
    const type = resolveType(file);

    const [copied, setCopied] = useState(false);
    const textContentRef = useRef("");

    // Download file to device
    const handleDownload = () => {
        downloadFile(file);
    };

    // Copy text file content to clipboard
    const handleCopy = () => {
        navigator.clipboard.writeText(textContentRef.current).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    // Close modal on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    const renderViewer = () => {
        if (type === "image") return <ImageViewer file={file} />;
        if (type === "video") return <VideoViewer file={file} />;
        if (type === "audio") return <AudioViewer file={file} />;
        if (type === "excel") return <ExcelViewer file={file} />;
        if (type === "zip") return <ZipViewer file={file} />;
        if (type === "text") return <TextViewer file={file} contentRef={textContentRef} />;
        if (type === "pdf") return <PdfViewer file={file} />
        if (type === "doc") return <DocViewer file={file} />;
        if (type === "docx") return <DocViewer file={file} />;
        // Unsupported type — show download prompt
        return (
            <div className="preview-toobig">
                <div className="txt-toobig-icon">
                    <img src={fileIcon} alt="" width={38} />
                </div>
                <p className="preview-toobig-title m-0">{file.name}</p>
                <p className="single-sub-title">
                    A preview of this file is not available. Please download it.
                </p>
                <button className="btn btn-primary mt-2" onClick={handleDownload}>
                    <InteractiveIcon
                        defaultIcon={downloadIcon}
                        width={24}
                    />
                    Download
                </button>
            </div>
        );
    };

    return (
        <div className="file-preview-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="file-preview-modal">

                {/* Header */}
                <div className="file-preview-header">
                    <div className="d-flex align-items-center gap-2">
                        <OverlayTrigger placement="bottom" overlay={<Tooltip>Back</Tooltip>}>
                            <button onClick={onClose} className="btn-hover-gray">
                                <InteractiveIcon
                                    defaultIcon={arrowLeftIcon}
                                    width={24}
                                />
                            </button>
                        </OverlayTrigger>
                        <h3 className="mute-text mb-0">
                            {file.name || "File Preview"}
                        </h3>
                    </div>

                    <div className="file-preview-actions">
                        {/* Copy button — text files only */}
                        {type === "text" && (
                            <OverlayTrigger placement="bottom" overlay={<Tooltip>{copied ? "Copied!" : "Copy"}</Tooltip>}>
                                <button onClick={handleCopy} className="btn-hover-gray">
                                   <InteractiveIcon
                                        defaultIcon={copied ? copiedIcon : copyIcon}
                                        width={24}
                                        alt=""
                                    />
                                </button>
                            </OverlayTrigger>
                        )}

                        <OverlayTrigger placement="bottom" overlay={<Tooltip>Download</Tooltip>}>
                            <button onClick={handleDownload} className="btn-hover-gray">
                                <InteractiveIcon
                                    defaultIcon={downloadIcon}
                                    width={24}
                                    alt=""
                                />
                            </button>
                        </OverlayTrigger>

                        <OverlayTrigger placement="bottom" overlay={<Tooltip>Close</Tooltip>}>
                            <button onClick={onClose} className="btn-hover-gray">
                               <InteractiveIcon
                                    defaultIcon={closeIcon}
                                    width={24}
                                    alt=""
                                />
                            </button>
                        </OverlayTrigger>
                    </div>
                </div>

                {/* Body */}
                <div className="file-preview-body">
                    {renderViewer()}
                </div>

                {/*  download panel */}
                <DownloadPanel />

            </div>
        </div>
    );
}

export default FilePreviewModal;