// 



import { useEffect, useState } from "react";
import DropdownContext from "react-bootstrap/esm/DropdownContext";
import { Virtuoso } from "react-virtuoso";
import InteractiveIcon from "../../layout/InteractiveIcon";
import txtIcon from "@images/svgs/media/txt-file-icon.svg";
import downloadIcon from "@images/icon/download.svg";

const MAX_SIZE = 51 * 1024 * 1024; // 20 MB

export default function TextViewer({ file, contentRef }) {
    const src = file?.url ||
        (file?.storagePath
            ? `/files${file.storagePath}`
            : "");

    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tooBig, setTooBig] = useState(false);

    useEffect(() => {
        if (!src) return;
        setLoading(true);
        setError(null);
        setTooBig(false);

        fetch(src)
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
                setContent(text);
                // parent ko content do copy ke liye
                if (contentRef) contentRef.current = text;
                setLoading(false);
            })
            .catch(() => {
                setError("Could not load file.");
                setLoading(false);
            });
    }, [src]);

    const ext = (file?.name || "").split(".").pop().toUpperCase();
    const fileSizeMB = file?.size
        ? (file.size / (1024 * 1024)).toFixed(1)
        : null;

    if (loading) return (
        <div className="loader-wrapper-box">
            <div className="cma-messages-are-loader-wrapper">
                <span className="loader"></span>
            </div>
        </div>
    );

    if (error) return (
        <div className="preview-error">{error}</div>
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