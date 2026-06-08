

import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { useDownload } from "../../../context/DownloadContext.jsx";
import getFileType from "../../../utils/getFileType.js";
import InteractiveIcon from "../../layout/InteractiveIcon.jsx";
import { Tooltip, OverlayTrigger } from "react-bootstrap";

import AudioViewer from "./AudioViewer.jsx";
import ImageViewer from "./ImageViewer";
import VideoViewer from "./VideoViewer.jsx";
import ZipViewer from "./ZipViewer.jsx";
import TextViewer from "./TextViewer.jsx";
import ExcelViewer from "./ExcelViewer.jsx";
import DocViewer from "./DocViewer.jsx";

const PdfViewer = lazy(() => import("./PdfViewer.jsx"));

import downloadIcon from "@images/icon/download.svg";
import closeIcon from "@images/icon/close-icon.svg";
import arrowLeftIcon from "@images/icon/arrow-left.svg";
import copyIcon from "@images/icon/copy.svg";
import copiedIcon from "@images/icon/copied-icon.svg";

function FilePreviewModal({ file, onClose }) {
    const { downloadFile } = useDownload();

    const type = getFileType(file.name || "");

    const viewerMap = {
        image: ImageViewer,
        video: VideoViewer,
        audio: AudioViewer,
        zip: ZipViewer,
        text: TextViewer,
        excel: ExcelViewer,
        doc: DocViewer,
    };

    const Viewer = type === "pdf" ? null : viewerMap[type];

    // copy state — sirf text files ke liye
    const [copied, setCopied] = useState(false);
    const textContentRef = useRef("");

    const handleDownload = () => {
        downloadFile(file);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(textContentRef.current).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <div className="file-preview-backdrop">
            <div className="file-preview-modal">

                {/* ── Header ── */}
                <div className="file-preview-header">
                    <div className="d-flex align-items-center">
                        <OverlayTrigger
                                placement="bottom"
                                overlay={<Tooltip>Back</Tooltip>}
                            >
                        <button onClick={onClose} className="btn-hover-gray">
                            <InteractiveIcon
                                defaultIcon={arrowLeftIcon}
                                width={24}
                                alt=""
                            />
                        </button>
                    </OverlayTrigger>
                        <h3 className="mute-text">{file.name}</h3>
                    </div>

                    <div className="file-preview-actions">

                        {/* Copy — sirf text file hone par */}
                        {type === "text" && (
                            <OverlayTrigger
                                placement="bottom"
                                overlay={<Tooltip>Copy</Tooltip>}
                            >
                                <button onClick={handleCopy} className="btn-hover-gray">
                                    <InteractiveIcon
                                        defaultIcon={copied ? copiedIcon : copyIcon}
                                        width={24}
                                        alt=""
                                    />
                                </button>
                            </OverlayTrigger>
                        )}

                        <OverlayTrigger
                            placement="bottom"
                            overlay={<Tooltip>Download</Tooltip>}
                        >
                            <button onClick={handleDownload} className="btn-hover-gray">
                                <InteractiveIcon
                                    defaultIcon={downloadIcon}
                                    width={24}
                                    alt=""
                                />
                            </button>
                        </OverlayTrigger>


                        <OverlayTrigger
                            placement="bottom"
                            overlay={<Tooltip>Close</Tooltip>}
                        >

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

                {/* ── Body ── */}
                <div className="file-preview-body">
                    {Viewer || type === "pdf" ? (
                        type === "pdf" ? (
                            <Suspense fallback={
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--dark-100)" }}>
                                    <div className="spinner-border text-primary mb-3" role="status" style={{ width: "3rem", height: "3rem" }} />
                                    <span style={{ fontWeight: 500 }}>Loading viewer...</span>
                                </div>
                            }>
                                <PdfViewer file={file} />
                            </Suspense>
                        ) : (
                            <Viewer
                                file={file}
                                contentRef={type === "text" ? textContentRef : undefined}
                            />
                        )
                    ) : (
                        <div>File type not supported</div>
                    )}
                </div>

            </div>
        </div>
    );
}

export default FilePreviewModal;