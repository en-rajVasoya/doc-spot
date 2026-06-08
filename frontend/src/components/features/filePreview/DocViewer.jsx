import { useEffect, useRef, useState } from "react"
import { renderAsync } from "docx-preview"
import { useDownload } from "../../../context/DownloadContext"
import InteractiveIcon from "../../layout/InteractiveIcon"
import plusIcon from "@images/icon/plus.svg"
import nagativIcon from "@images/icon/negativ-icon.svg"
import magnificationIcon from "@images/icon/magnification-icon.svg"

const MAX_FILE_SIZE = 55 * 1024 * 1024

function DocViewer({ file }) {
    const { downloadFile } = useDownload()
    const fileUrl = `/files${file.storagePath}`

    const containerRef = useRef(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [isLegacyDoc, setIsLegacyDoc] = useState(false)
    const [scale, setScale] = useState(1)

    useEffect(() => {
        const fileExtension = file.name?.split(".").pop()?.toLowerCase()
        if (fileExtension === "doc") {
            setIsLegacyDoc(true)
            setLoading(false)
            return
        }

        const loadDoc = async () => {
            try {
                if (file.fileSize > MAX_FILE_SIZE) {
                    setError("File is too large to preview. Maximum size is 40MB.")
                    setLoading(false)
                    return
                }

                const res = await fetch(fileUrl, { credentials: "include" })
                if (!res.ok) {
                    throw new Error(`Server returned status: ${res.status}`)
                }
                const blob = await res.blob()

                if (containerRef.current) {
                    containerRef.current.innerHTML = ""
                    await renderAsync(blob, containerRef.current, null, {
                        className: "docx-preview",
                        inWrapper: true,
                        ignoreWidth: false,
                        ignoreHeight: false,
                        ignoreFonts: false,
                        breakPages: true,
                        ignoreLastRenderedPageBreak: true,
                        experimental: false,
                        trimXmlDeclaration: true,
                        useBase64URL: true,
                        renderChanges: false,
                        renderHeaders: true,
                        renderFooters: true,
                        renderFootnotes: true,
                        renderEndnotes: true,
                    })
                }
            } catch (err) {
                console.error("docx-preview error:", err)
                setError("Failed to load document preview.")
            } finally {
                setLoading(false)
            }
        }

        loadDoc()
    }, [file, fileUrl])

    const clampScale = (v) => Math.min(Math.max(v, 0.5), 3)
    const zoomIn = () => setScale((prev) => clampScale(Math.round((prev + 0.2) * 10) / 10))
    const zoomOut = () => setScale((prev) => clampScale(Math.round((prev - 0.2) * 10) / 10))
    const resetZoom = () => setScale(1)

    if (isLegacyDoc) {
        return (
            <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                width: "100%",
                color: "var(--dark-100)",
                padding: "40px",
                textAlign: "center",
                gap: "16px",
            }}>
                <span style={{ fontWeight: 600, fontSize: "16px" }}>Legacy .doc files cannot be previewed</span>
                <p style={{ margin: 0, opacity: 0.75, maxWidth: "420px", fontSize: "14px" }}>
                    For security, legacy Word documents are not opened in the browser. Download the file to open it in MS Word or LibreOffice.
                </p>
                <button
                    type="button"
                    className="preview-btn"
                    onClick={() => downloadFile(file)}
                >
                    Download File
                </button>
            </div>
        )
    }

    if (error) {
        return (
            <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                width: "100%",
                color: "var(--red)",
                padding: "40px",
                textAlign: "center",
                gap: "16px",
            }}>
                <span>{error}</span>
                <button
                    type="button"
                    className="preview-btn"
                    onClick={() => downloadFile(file)}
                >
                    Download File
                </button>
            </div>
        )
    }

    return (
        <div style={{
            display: "flex",
            flexDirection: "row",
            height: "100%",
            width: "100%",
            position: "relative",
            overflow: "hidden",
            paddingTop: "60px",
        }}>
            <style>{`
                .docx-preview-container section.docx {
                    margin: 0 !important;
                    box-shadow: none !important;
                    border: none !important;
                    border-radius: 0 !important;
                    background: #ffffff !important;
                }
            `}</style>

            {loading && (
                <div style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 10,
                    backgroundColor: "var(--dark-06)",
                    color: "var(--dark-100)",
                }}>
                    <div className="spinner-border text-primary mb-3" role="status" style={{ width: "3rem", height: "3rem" }} />
                    <span style={{ fontWeight: 500 }}>Loading Document...</span>
                </div>
            )}

            {/* Main viewer — same layout as PdfViewer */}
            <div style={{
                flex: 1,
                height: "100%",
                backgroundColor: "var(--dark-06)",
                position: "relative",
                overflowY: "auto",
                overflowX: "hidden",
                visibility: loading ? "hidden" : "visible",
            }}>
                <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
                    <div style={{
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        background: "#fff",
                        transform: `scale(${scale})`,
                        transformOrigin: "top center",
                    }}>
                        <div
                            ref={containerRef}
                            className="docx-preview-container"
                        />
                    </div>
                </div>
            </div>

            {/* Controls — same bar as PdfViewer */}
            {!loading && (
                <div className="image-preview-bar" style={{ zIndex: 1001 }}>
                    <div className="new-preview-zoom-controls-sub after-line-horizontal" style={{ padding: "0 10px", gap: "8px", minWidth: "120px" }}>
                        <button
                            type="button"
                            className="image-preview-btn"
                            onClick={zoomOut}
                            disabled={scale <= 0.5}
                            style={{ opacity: scale <= 0.5 ? 0.35 : 1 }}
                        >
                            <InteractiveIcon
                                defaultIcon={nagativIcon}
                                width={24}
                                alt="Zoom Out"
                                customStyle={{ cursor: scale <= 0.5 ? "not-allowed" : "pointer" }}
                            />
                        </button>
                        <span className="image-preview-pct" style={{ minWidth: "45px" }}>{Math.round(scale * 100)}%</span>
                        <button
                            type="button"
                            className="image-preview-btn"
                            onClick={zoomIn}
                            disabled={scale >= 3}
                            style={{ opacity: scale >= 3 ? 0.35 : 1 }}
                        >
                            <InteractiveIcon
                                defaultIcon={plusIcon}
                                width={24}
                                alt="Zoom In"
                                customStyle={{ cursor: scale >= 3 ? "not-allowed" : "pointer" }}
                            />
                        </button>
                    </div>

                    <div className="new-preview-zoom-controls-sub">
                        <button type="button" className="image-preview-btn" onClick={resetZoom} title="Reset Zoom">
                            <InteractiveIcon defaultIcon={magnificationIcon} width={24} alt="Reset Zoom" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default DocViewer
