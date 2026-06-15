import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { OverlayTrigger, Tooltip } from "react-bootstrap"
// import FeatherIcon from "feather-icons-react"
import ImageViewer from "../features/filePreview/ImageViewer"
import PdfViewer from "../features/filePreview/PdfViewer"

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

        fetch(`https://192.168.1.213:4001/api/links/access?token=${token}`, {
            credentials: "include"   // 👈 add this
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

    // ✅ File Preview
    if (data.type === "file") {
        const file = data.data
        const fileUrl = data.redirect_url
        const mimeType = file.fileType
        const fileName = file.name

        const isPDF = mimeType === "application/pdf"
        const isImage = mimeType.startsWith("image/")
        const isVideo = mimeType.startsWith("video/")
        const isText = mimeType.startsWith("text/")
        const isOffice = ["sheet", "word", "presentation", "excel", "docx", "xlsx", "pptx"]
            .some(t => mimeType.includes(t))

        const type = isImage ? "image"
            : isPDF ? "pdf"
                : isVideo ? "video"
                    : isText ? "text"
                        : isOffice ? "office"
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
            if (isVideo) return (
                <video controls width="100%">
                    <source src={fileUrl} type={mimeType} />
                    Your browser does not support the video tag.
                </video>
            )
            if (isOffice) return (
                <iframe
                    src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`}
                    title={fileName}
                    width="100%"
                    height="100%"
                    style={{ border: "none" }}
                />
            )
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

    // ✅ Folder Preview
    if (data.type === "folder") {
        return (
            <div>
                <h2>{data.data.name}</h2>
                {data.data.files?.length === 0 ? (
                    <p>This folder is empty.</p>
                ) : (
                    <ul>
                        {data.data.files?.map(file => (
                            <li key={file._id}>
                                <span>{file.name}</span>
                                <a href={file.url} download={file.name}>
                                    <button>Download</button>
                                </a>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        )
    }

    return <p>Unknown shared content.</p>
}

export default SharedPreview