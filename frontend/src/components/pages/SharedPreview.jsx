import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { OverlayTrigger, Tooltip, Modal, Button } from "react-bootstrap"
// import FeatherIcon from "feather-icons-react"
import ImageViewer from "../features/filePreview/ImageViewer"
import PdfViewer from "../features/filePreview/PdfViewer"
import TextViewer from "../features/filePreview/TextViewer"
import VideoViewer from "../features/filePreview/VideoViewer"
import AudioViewer from "../features/filePreview/AudioViewer"
import ZipViewer from "../features/filePreview/ZipViewer"
import ExcelViewer from "../features/filePreview/ExcelViewer"
import DocViewer from "../features/filePreview/DocViewer"
import FolderViewer from "../features/filePreview/FolderViewer"

function SharedPreview() {
    const [searchParams] = useSearchParams()
    const token = searchParams.get("token")
    const [data, setData] = useState(null)
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(true)
    const [copied, setCopied] = useState(false)

    // Password modal states
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [password, setPassword] = useState("")
    const [passwordError, setPasswordError] = useState("")
    const [verifyingPassword, setVerifyingPassword] = useState(false)
    const [passwordVerified, setPasswordVerified] = useState(false)

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
                if (!res.success) {
                    setError(res.message)
                } else {
                    // If password is required, show modal instead of data
                    if (res.password_required) {
                        setShowPasswordModal(true)
                        setData(res) // Store initial response
                    } else {
                        setData(res)
                    }
                }
            })
            .catch(() => setError("Something went wrong"))
            .finally(() => setLoading(false))
    }, [token])

    // Handle password submission
    const handlePasswordSubmit = async (e) => {
        e.preventDefault()

        if (!password.trim()) {
            setPasswordError("Please enter a password")
            return
        }

        setVerifyingPassword(true)
        setPasswordError("")

        try {
            const response = await fetch(
                `${import.meta.env.VITE_BACKEND_URL}/api/links/verify_password`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        token: token,
                        password: password
                    })
                }
            )

            const result = await response.json()

            if (!result.success) {
                setPasswordError(result.message || "Incorrect password")
            } else {
                // Password verified successfully
                setPasswordVerified(true)
                setData(result) // Update data with file/folder content
                setShowPasswordModal(false)
                setPassword("") // Clear password input
            }
        } catch (err) {
            setPasswordError("Something went wrong. Please try again.")
            console.error("Password verification error:", err)
        } finally {
            setVerifyingPassword(false)
        }
    }

    if (loading) return <p>Loading...</p>
    if (error) return <p>{error}</p>

    // Show password modal if password is required and not yet verified
    if (showPasswordModal && !passwordVerified) {
        return (
            <Modal show={showPasswordModal} onHide={() => { }} centered backdrop="static" keyboard={false}>
                <Modal.Header>
                    <Modal.Title>🔒 Password Protected Link</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <form onSubmit={handlePasswordSubmit}>
                        <div className="mb-3">
                            <label htmlFor="passwordInput" className="form-label">
                                This link is password protected. Please enter the password:
                            </label>
                            <input
                                id="passwordInput"
                                type="password"
                                className={`form-control ${passwordError ? "is-invalid" : ""}`}
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value)
                                    setPasswordError("") // Clear error when user types
                                }}
                                disabled={verifyingPassword}
                                autoFocus
                            />
                            {passwordError && (
                                <div className="invalid-feedback d-block">
                                    {passwordError}
                                </div>
                            )}
                        </div>
                        <div className="d-flex gap-2 justify-content-end mb-1">
                            <Button
                                variant="secondary"
                                onClick={() => window.history.back()}
                                disabled={verifyingPassword}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                type="submit"
                                disabled={verifyingPassword || !password.trim()}
                            >
                                {verifyingPassword ? (
                                    <>
                                        <span
                                            className="spinner-border spinner-border-sm me-2"
                                            role="status"
                                            aria-hidden="true"
                                        />
                                        Verifying...
                                    </>
                                ) : (
                                    "Verify Password"
                                )}
                            </Button>
                        </div>
                    </form>
                </Modal.Body>
            </Modal>
        )
    }

    // File Preview
    if (data?.type === "file") {
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
    if (data?.type === "folder") {
        return (
            <FolderViewer
                folder={data.data}
                contents={data.folder_data}
                isPublic={data.is_public ?? false}
            />
        )
    }

    return <p>Unknown shared content.</p>
}

export default SharedPreview