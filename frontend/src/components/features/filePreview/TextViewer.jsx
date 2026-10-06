// 



import { useEffect, useState } from "react";
import DropdownContext from "react-bootstrap/esm/DropdownContext";
import { Virtuoso } from "react-virtuoso";
import InteractiveIcon from "../../layout/InteractiveIcon";
import txtIcon from "@images/svgs/media/txt-file-icon.svg";
import downloadIcon from "@images/icon/download.svg";
import { useDownload } from "../../../context/DownloadContext.jsx";

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

export default function TextViewer({ file, contentRef }) {
    const { downloadFile } = useDownload();
    const FILE_BASE_URL = import.meta.env.VITE_FILE_BASE_URL || import.meta.env.VITE_API_URL.replace(/\/api$/, "");
    const src = file?.url ||
        (file?.storagePath
            ? `${FILE_BASE_URL}${file.storagePath}`
            : "");

    const currentSize = file?.size || file?.fileSize || 0;
    const isInitiallyTooBig = currentSize > MAX_SIZE;

    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(!isInitiallyTooBig);
    const [error, setError] = useState(null);
    const [tooBig, setTooBig] = useState(isInitiallyTooBig);

    useEffect(() => {
        if (!src) return;

        const currentSize = file?.size || file?.fileSize || 0;
        if (currentSize > MAX_SIZE) {
            setTooBig(true);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        setTooBig(false);

        fetch(src, { credentials: "include" })
            .then(r => {
                if (!r.ok) throw new Error("Failed to fetch");
                const size = Number(r.headers.get("content-length") || 0);
                if (size > MAX_SIZE) {
                    setTooBig(true);
                    setLoading(false);
                    return null;
                }
                return r.text();
            })
            .then(text => {
                if (text === null) return;
                const textBytes = new Blob([text]).size;
                if (textBytes > MAX_SIZE) {
                    setTooBig(true);
                    setLoading(false);
                    return;
                }
                setContent(text);
                // parent ko content do copy ke liye
                if (contentRef) contentRef.current = text;
                setLoading(false);
            })
            .catch(() => {
                setError("Could not load file.");
                setLoading(false);
            });
    }, [src, file]);

    const ext = (file?.name || "").split(".").pop().toUpperCase();
    const fileSizeMB = currentSize
        ? (currentSize / (1024 * 1024)).toFixed(1)
        : null;

    if (loading) return (
        <div className="loader-wrapper-box">
            <div className="cma-messages-are-loader-wrapper">
                <span className="loader"></span>
            </div>
        </div>
    );

    if (error) return (
        <div className="preview-toobig">
            <div className="txt-toobig-icon">
                <InteractiveIcon defaultIcon={txtIcon} width={36} height={42} alt="" />
            </div>
            <p className="preview-toobig-title m-0">Preview not available</p>
            <p className="mute-text">{error}</p>
            <button className="preview-btn preview-btn-text" onClick={() => downloadFile(file)}>
                <InteractiveIcon defaultIcon={downloadIcon} width={24} height={24} alt="" />
                Download
            </button>
        </div>
    );

    if (tooBig) return (
        <div className="preview-toobig">
            <div className="txt-toobig-icon">
                <InteractiveIcon
                    defaultIcon={txtIcon}
                    width={36}
                    height={42}
                    alt=""
                />
            </div>
            <p className="preview-toobig-title m-0">File too large to preview</p>
            <p className="mute-text">
                {fileSizeMB ? `This file is ${fileSizeMB} MB. ` : ""}
                Files larger than 20 MB cannot be previewed.
            </p>
            <button
                className="preview-btn preview-btn-text"
                onClick={() => downloadFile(file)}
            >
                <InteractiveIcon
                    defaultIcon={downloadIcon}
                    width={24}
                    height={24}
                    alt=""
                />
                Download
            </button>
        </div>
    );

    const lines = content.split("\n");

    return (
        <div className="txt-viewer-wrap">
            <div className="txt-viewer-body" style={{ padding: 0, overflow: "hidden" }}>
                <Virtuoso
                    style={{ height: "100%", width: "100%" }}
                    totalCount={lines.length}
                    data={lines}
                    overscan={100}
                    itemContent={(index, line) => (
                        <div className="txt-viewer-line" style={{ padding: "1px 20px" }}>
                            <span className="txt-line-text" style={{ paddingLeft: 0 }}>
                                {line || "\u00A0"}
                            </span>
                        </div>
                    )}
                />
            </div>
        </div>
    );
}