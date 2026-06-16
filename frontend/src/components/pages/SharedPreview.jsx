import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { OverlayTrigger, Tooltip } from "react-bootstrap"
// import FeatherIcon from "feather-icons-react"
import ImageViewer from "../features/filePreview/ImageViewer"
import PdfViewer from "../features/filePreview/PdfViewer"
import TextViewer from "../features/filePreview/TextViewer"
import VideoViewer from "../features/filePreview/VideoViewer"
import AudioViewer from "../features/filePreview/AudioViewer"
import ZipViewer from "../features/filePreview/ZipViewer"
import ExcelViewer from "../features/filePreview/ExcelViewer"
import DocViewer from "../features/filePreview/DocViewer"

function SharedPreview() {
    const [searchParams] = useSearchParams()
    const token = searchParams.get("token")

    const [data, setData] = useState(null)
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(true)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (!token) {
            setError("Invalid link")
            setLoading(false)
            return
        }

        fetch(`${import.meta.env.VITE_BACKEND_URL}/api/links/access?token=${token}`, {
            credentials: "include"
        })
            .then(res => res.json())
            .then(res => {
                if (!res.success) setError(res.message)
                else setData(res)
            })
            .catch(() => setError("Something went wrong"))
            .finally(() => setLoading(false))
    }, [token])

    if (loading) return <p>Loading...</p>
    if (error) return <p>{error}</p>

    //File Preview
    if (data.type === "file") {
        const file = data.data
        const fileUrl = data.redirect_url
        const mimeType = file.fileType
        const fileName = file.name

        const isPDF = mimeType === "application/pdf"
        const isImage = mimeType.startsWith("image/")
        const isVideo = mimeType.startsWith("video/")
        const isExcel = mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
            mimeType === "application/vnd.ms-excel" || mimeType === "text/csv"
        const isText = mimeType.startsWith("text/") && !isExcel
        const isAudio = mimeType.startsWith("audio/")
        const isZip = mimeType === "application/x-zip-compressed"
        const isDoc = mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            mimeType === "application/msword"


        const type = isImage ? "image"
            : isPDF ? "pdf"
                : isVideo ? "video"
                    : isText ? "text"
                        : isAudio ? "audio"
                            : isZip ? "zip"
                                : isExcel ? "excel"
                                    : isDoc ? "docx"
                                        : "unknown"

        const handleDownload = () => {
            const a = document.createElement("a")
            a.href = fileUrl
            a.download = fileName
            a.click()
        }

        const handleCopy = async () => {
            try {
                const res = await fetch(fileUrl)
                const text = await res.text()
                await navigator.clipboard.writeText(text)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
            } catch {
                alert("Failed to copy")
            }
        }

        // no-op since there's no modal to close on a standalone page
        const onClose = () => { }

        const renderViewer = () => {
            if (isImage) return <ImageViewer file={file} />
            if (isPDF) return <PdfViewer file={file} />
            if (isText) return <TextViewer file={file} />
            if (isVideo) return <VideoViewer file={file} />
            if (isAudio) return <AudioViewer file={file} />
            if (isZip) return <ZipViewer file={file} />
            if (isDoc) return <DocViewer file={file} />
            if (isExcel) return <ExcelViewer file={file} />
            // Fallback
            return (
                <div className="preview-toobig">
                    <p className="preview-toobig-title m-0">{fileName}</p>
                    <p className="single-sub-title">
                        A preview of this file is not available. Please download it.
                    </p>
                    <button className="btn btn-primary mt-2" onClick={handleDownload}>
                        {/* <FeatherIcon icon="download" size={16} className="me-2" /> */}
                        Download
                    </button>
                </div>
            )
        }

        return (
            <div className="file-preview-backdrop">
                <div className="file-preview-modal">
                    {/* Header */}
                    <div className="file-preview-header">
                        <div className="d-flex align-items-center gap-2">
                            <h3 className="mute-text mb-0">
                                {fileName || "File Preview"}
                            </h3>
                        </div>
                        <div className="file-preview-actions">
                            {/* Copy button — text files only */}
                            {type === "text" && (
                                <OverlayTrigger placement="bottom" overlay={<Tooltip>{copied ? "Copied!" : "Copy"}</Tooltip>}>
                                    <button onClick={handleCopy} className="btn icon-hover">
                                        {/* <FeatherIcon icon="copy" size={20} /> */}
                                    </button>
                                </OverlayTrigger>
                            )}
                            <OverlayTrigger placement="bottom" overlay={<Tooltip>Download</Tooltip>}>
                                <button onClick={handleDownload} className="btn icon-hover">
                                    {/* <FeatherIcon icon="download" size={20} /> */}
                                    Download
                                </button>
                            </OverlayTrigger>
                        </div>
                    </div>
                    {/* Body */}
                    <div className="file-preview-body">
                        {renderViewer()}
                    </div>
                </div>
            </div>
        )
    }

    // Folder Preview
    if (data.type === "folder") {
    }

    return <p>Unknown shared content.</p>
}

export default SharedPreview