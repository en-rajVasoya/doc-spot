// import { useEffect, useState } from "react"
// import { useSearchParams } from "react-router-dom"
// import { OverlayTrigger, Tooltip, Modal, Button } from "react-bootstrap"
// // import FeatherIcon from "feather-icons-react"
// import ImageViewer from "../features/filePreview/ImageViewer"
// import PdfViewer from "../features/filePreview/PdfViewer"
// import TextViewer from "../features/filePreview/TextViewer"
// import VideoViewer from "../features/filePreview/VideoViewer"
// import AudioViewer from "../features/filePreview/AudioViewer"
// import ZipViewer from "../features/filePreview/ZipViewer"
// import ExcelViewer from "../features/filePreview/ExcelViewer"
// import DocViewer from "../features/filePreview/DocViewer"
// import FolderViewer from "../features/filePreview/FolderViewer"
// import { Form } from "react-bootstrap"
// import InteractiveIcon from "../layout/InteractiveIcon"
// import passwordIcon from "@images/icon/password.svg";
// import viewIcon from "@images/icon/view.svg"
// import viewHideIcon from "@images/icon/view-hide.svg"

// function SharedPreview() {
//     const [searchParams] = useSearchParams()
//     const token = searchParams.get("token")
//     const [data, setData] = useState(null)
//     const [error, setError] = useState(null)
//     const [loading, setLoading] = useState(true)
//     const [copied, setCopied] = useState(false)

//     // Password modal states
//     const [showPasswordModal, setShowPasswordModal] = useState(false)
//     const [password, setPassword] = useState("")
//     const [passwordError, setPasswordError] = useState("")
//     const [verifyingPassword, setVerifyingPassword] = useState(false)
//     const [passwordVerified, setPasswordVerified] = useState(false)
//     const [showPwd, setShowPwd] = useState(false)

//     useEffect(() => {
//         if (!token) {
//             setError("Invalid link")
//             setLoading(false)
//             return
//         }
//         fetch(`${import.meta.env.VITE_BACKEND_URL}/api/links/access?token=${token}`, {
//             credentials: "include"
//         })
//             .then(res => res.json())
//             .then(res => {
//                 if (!res.success) {
//                     setError(res.message)
//                 } else {
//                     // If password is required, show modal instead of data
//                     if (res.password_required) {
//                         setShowPasswordModal(true)
//                         setData(res) // Store initial response
//                     } else {
//                         setData(res)
//                     }
//                 }
//             })
//             .catch(() => setError("Something went wrong"))
//             .finally(() => setLoading(false))
//     }, [token])

//     // Handle password submission
//     const handlePasswordSubmit = async (e) => {
//         e.preventDefault()

//         if (!password.trim()) {
//             setPasswordError("Please enter a password")
//             return
//         }

//         setVerifyingPassword(true)
//         setPasswordError("")

//         try {
//             const response = await fetch(
//                 `${import.meta.env.VITE_BACKEND_URL}/api/links/verify_password`,
//                 {
//                     method: "POST",
//                     headers: {
//                         "Content-Type": "application/json"
//                     },
//                     credentials: "include",
//                     body: JSON.stringify({
//                         token: token,
//                         password: password
//                     })
//                 }
//             )

//             const result = await response.json()

//             if (!result.success) {
//                 setPasswordError(result.message || "Incorrect password")
//             } else {
//                 // Password verified successfully
//                 setPasswordVerified(true)
//                 setData(result) // Update data with file/folder content
//                 setShowPasswordModal(false)
//                 setPassword("") // Clear password input
//             }
//         } catch (err) {
//             setPasswordError("Something went wrong. Please try again.")
//             console.error("Password verification error:", err)
//         } finally {
//             setVerifyingPassword(false)
//         }
//     }

//     if (loading) return <p>Loading...</p>
//     if (error) return <p>{error}</p>

//     // Show password modal if password is required and not yet verified
//     if (showPasswordModal && !passwordVerified) {
//         return (
//             <Modal
//                 show={showPasswordModal}
//                 onHide={() => { }}
//                 centered
//                 backdrop="static"
//                 keyboard={false}
//                 dialogClassName="modal-dialog-sm"
//                 className="add-user-admin-modal"
//             >
//                 <Modal.Header className="border-0">
//                     <Modal.Title>Password Protected Link</Modal.Title>
//                 </Modal.Header>

//                 <Modal.Body>
//                     <p className="text-muted mb-3" style={{ fontSize: 14 }}>
//                         This link is password protected. Please enter the password to continue.
//                     </p>

//                     <Form.Group className="mb-3" controlId="passwordInput">
//                         <Form.Label className="required-star">Password</Form.Label>
//                         <div className={`form-control-single-icon${passwordError ? " has-error" : ""}`}>
//                             <InteractiveIcon
//                                 defaultIcon={passwordIcon}
//                                 alt=""
//                                 className="form-left-icon"
//                                 width={20}
//                             />
//                             <InteractiveIcon
//                                 defaultIcon={showPwd ? viewIcon : viewHideIcon}
//                                 alt=""
//                                 className="form-right-icon"
//                                 width={24}
//                                 onClick={() => setShowPwd(p => !p)}
//                             />
//                             <Form.Control
//                                 type={showPwd ? "text" : "password"}
//                                 placeholder="Enter password"
//                                 autoFocus
//                                 autoComplete="off"
//                                 className={`custom-form-control h-34${passwordError ? " is-invalid" : ""}`}
//                                 value={password}
//                                 onChange={(e) => { setPassword(e.target.value); setPasswordError("") }}
//                                 disabled={verifyingPassword}
//                             />
//                         </div>
//                         {passwordError && (
//                             <div className="invalid-feedback d-block">{passwordError}</div>
//                         )}
//                     </Form.Group>
//                 </Modal.Body>

//                 <Modal.Footer className="d-flex align-items-center justify-content-between border-0">
//                     <button
//                         className="btn-secondary btn-lg m-0"
//                         onClick={() => window.history.back()}
//                         disabled={verifyingPassword}
//                     >
//                         Cancel
//                     </button>
//                     <button
//                         className="btn-black btn-lg m-0"
//                         onClick={handlePasswordSubmit}
//                         disabled={verifyingPassword || !password.trim()}
//                     >
//                         Verify Password
//                     </button>
//                 </Modal.Footer>
//             </Modal>
//         )
//     }

//     // File Preview
//     if (data?.type === "file") {
//         const file = data.data
//         const fileUrl = data.redirect_url
//         const mimeType = file.fileType
//         const fileName = file.name
//         const isPDF = mimeType === "application/pdf"
//         const isImage = mimeType.startsWith("image/")
//         const isVideo = mimeType.startsWith("video/")
//         const isExcel = mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
//             mimeType === "application/vnd.ms-excel" || mimeType === "text/csv"
//         const isText = mimeType.startsWith("text/") && !isExcel
//         const isAudio = mimeType.startsWith("audio/")
//         const isZip = mimeType === "application/x-zip-compressed"
//         const isDoc = mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
//             mimeType === "application/msword"
//         const type = isImage ? "image"
//             : isPDF ? "pdf"
//                 : isVideo ? "video"
//                     : isText ? "text"
//                         : isAudio ? "audio"
//                             : isZip ? "zip"
//                                 : isExcel ? "excel"
//                                     : isDoc ? "docx"
//                                         : "unknown"

//         const handleDownload = () => {
//             const a = document.createElement("a")
//             a.href = fileUrl
//             a.download = fileName
//             a.click()
//         }

//         const handleCopy = async () => {
//             try {
//                 const res = await fetch(fileUrl)
//                 const text = await res.text()
//                 await navigator.clipboard.writeText(text)
//                 setCopied(true)
//                 setTimeout(() => setCopied(false), 2000)
//             } catch {
//                 alert("Failed to copy")
//             }
//         }

//         const onClose = () => { }

//         const renderViewer = () => {
//             if (isImage) return <ImageViewer file={file} />
//             if (isPDF) return <PdfViewer file={file} />
//             if (isText) return <TextViewer file={file} />
//             if (isVideo) return <VideoViewer file={file} />
//             if (isAudio) return <AudioViewer file={file} />
//             if (isZip) return <ZipViewer file={file} />
//             if (isDoc) return <DocViewer file={file} />
//             if (isExcel) return <ExcelViewer file={file} />
//             // Fallback
//             return (
//                 <div className="preview-toobig">
//                     <p className="preview-toobig-title m-0">{fileName}</p>
//                     <p className="single-sub-title">
//                         A preview of this file is not available. Please download it.
//                     </p>
//                     <button className="btn btn-primary mt-2" onClick={handleDownload}>
//                         {/* <FeatherIcon icon="download" size={16} className="me-2" /> */}
//                         Download
//                     </button>
//                 </div>
//             )
//         }

//         return (
//             <div className="file-preview-backdrop">
//                 <div className="file-preview-modal">
//                     {/* Header */}
//                     <div className="file-preview-header">
//                         <div className="d-flex align-items-center gap-2">
//                             <h3 className="mute-text mb-0">
//                                 {fileName || "File Preview"}
//                             </h3>
//                         </div>
//                         <div className="file-preview-actions">
//                             {/* Copy button — text files only */}
//                             {type === "text" && (
//                                 <OverlayTrigger placement="bottom" overlay={<Tooltip>{copied ? "Copied!" : "Copy"}</Tooltip>}>
//                                     <button onClick={handleCopy} className="btn icon-hover">
//                                         {/* <FeatherIcon icon="copy" size={20} /> */}
//                                     </button>
//                                 </OverlayTrigger>
//                             )}
//                             <OverlayTrigger placement="bottom" overlay={<Tooltip>Download</Tooltip>}>
//                                 <button onClick={handleDownload} className="btn icon-hover">
//                                     {/* <FeatherIcon icon="download" size={20} /> */}
//                                     Download
//                                 </button>
//                             </OverlayTrigger>
//                         </div>
//                     </div>
//                     {/* Body */}
//                     <div className="file-preview-body">
//                         {renderViewer()}
//                     </div>
//                 </div>
//             </div>
//         )
//     }

//     // Folder Preview
//     if (data?.type === "folder") {
//         return (
//             <FolderViewer
//                 folder={data.data}
//                 contents={data.folder_data}
//                 isPublic={data.is_public ?? false}
//             />
//         )
//     }

//     return <p>Unknown shared content.</p>
// }

// export default SharedPreview




import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { OverlayTrigger, Tooltip, Modal } from "react-bootstrap"
import { Form } from "react-bootstrap"
import ImageViewer from "../features/filePreview/ImageViewer"
import PdfViewer from "../features/filePreview/PdfViewer"
import TextViewer from "../features/filePreview/TextViewer"
import VideoViewer from "../features/filePreview/VideoViewer"
import AudioViewer from "../features/filePreview/AudioViewer"
import ZipViewer from "../features/filePreview/ZipViewer"
import ExcelViewer from "../features/filePreview/ExcelViewer"
import DocViewer from "../features/filePreview/DocViewer"
import FolderViewer from "../features/filePreview/FolderViewer"
import InteractiveIcon from "../layout/InteractiveIcon"
import passwordIcon from "@images/icon/password.svg"
import viewIcon from "@images/icon/view.svg"
import viewHideIcon from "@images/icon/view-hide.svg"

// ─── Constants ─────────────────────────────────────────────────────────────────

const API = import.meta.env.VITE_BACKEND_URL

const MIME = {
    isPDF:   (m) => m === "application/pdf",
    isImage: (m) => m.startsWith("image/"),
    isVideo: (m) => m.startsWith("video/"),
    isAudio: (m) => m.startsWith("audio/"),
    isText:  (m) => m.startsWith("text/"),
    isZip:   (m) => m === "application/x-zip-compressed",
    isExcel: (m) => ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel", "text/csv"].includes(m),
    isDoc:   (m) => ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"].includes(m),
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getFileType(mimeType) {
    if (MIME.isImage(mimeType))  return "image"
    if (MIME.isPDF(mimeType))    return "pdf"
    if (MIME.isVideo(mimeType))  return "video"
    if (MIME.isAudio(mimeType))  return "audio"
    if (MIME.isZip(mimeType))    return "zip"
    if (MIME.isExcel(mimeType))  return "excel"
    if (MIME.isDoc(mimeType))    return "docx"
    if (MIME.isText(mimeType))   return "text"
    return "unknown"
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function PasswordModal({ show, password, setPassword, passwordError, setPasswordError, showPwd, setShowPwd, verifyingPassword, onSubmit }) {
    return (
        <Modal
            show={show}
            onHide={() => {}}
            centered
            backdrop="static"
            keyboard={false}
            dialogClassName="modal-dialog-sm"
            className="add-user-admin-modal"
        >
            <Modal.Header className="border-0">
                <Modal.Title>Password Protected Link</Modal.Title>
            </Modal.Header>

            <Modal.Body>
                <p className="text-muted mb-3" style={{ fontSize: 14 }}>
                    This link is password protected. Please enter the password to continue.
                </p>

                <Form.Group className="mb-3" controlId="passwordInput">
                    <Form.Label className="required-star">Password</Form.Label>
                    <div className={`form-control-single-icon${passwordError ? " has-error" : ""}`}>
                        <InteractiveIcon defaultIcon={passwordIcon} alt="" className="form-left-icon" width={20} />
                        <InteractiveIcon
                            defaultIcon={showPwd ? viewIcon : viewHideIcon}
                            alt=""
                            className="form-right-icon"
                            width={24}
                            onClick={() => setShowPwd(p => !p)}
                        />
                        <Form.Control
                            type={showPwd ? "text" : "password"}
                            placeholder="Enter password"
                            autoFocus
                            autoComplete="off"
                            className={`custom-form-control h-34${passwordError ? " is-invalid" : ""}`}
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setPasswordError("") }}
                            disabled={verifyingPassword}
                        />
                    </div>
                    {passwordError && <div className="invalid-feedback d-block">{passwordError}</div>}
                </Form.Group>
            </Modal.Body>

            <Modal.Footer className="d-flex align-items-center justify-content-between border-0">
                <button
                    className="btn-secondary btn-lg m-0"
                    onClick={() => window.history.back()}
                    disabled={verifyingPassword}
                >
                    Cancel
                </button>
                <button
                    className="btn-black btn-lg m-0"
                    onClick={onSubmit}
                    disabled={verifyingPassword || !password.trim()}
                >
                    {verifyingPassword ? (
                        <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                            Verifying...
                        </>
                    ) : "Verify Password"}
                </button>
            </Modal.Footer>
        </Modal>
    )
}

function FilePreview({ data, copied, setCopied }) {
    const file    = data.data
    const fileUrl = data.redirect_url
    const { name: fileName, fileType: mimeType } = file
    const type = getFileType(mimeType)

    const handleDownload = () => {
        const a = document.createElement("a")
        a.href = fileUrl
        a.download = fileName
        a.click()
    }

    const handleCopy = async () => {
        try {
            const res  = await fetch(fileUrl)
            const text = await res.text()
            await navigator.clipboard.writeText(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            alert("Failed to copy")
        }
    }

    const renderViewer = () => {
        switch (type) {
            case "image":  return <ImageViewer file={file} />
            case "pdf":    return <PdfViewer file={file} />
            case "text":   return <TextViewer file={file} />
            case "video":  return <VideoViewer file={file} />
            case "audio":  return <AudioViewer file={file} />
            case "zip":    return <ZipViewer file={file} />
            case "docx":   return <DocViewer file={file} />
            case "excel":  return <ExcelViewer file={file} />
            default:
                return (
                    <div className="preview-toobig">
                        <p className="preview-toobig-title m-0">{fileName}</p>
                        <p className="single-sub-title">A preview of this file is not available. Please download it.</p>
                        <button className="btn btn-primary mt-2" onClick={handleDownload}>Download</button>
                    </div>
                )
        }
    }

    return (
        <div className="file-preview-backdrop">
            <div className="file-preview-modal">
                <div className="file-preview-header">
                    <div className="d-flex align-items-center gap-2">
                        <h3 className="mute-text mb-0">{fileName || "File Preview"}</h3>
                    </div>
                    <div className="file-preview-actions">
                        {type === "text" && (
                            <OverlayTrigger placement="bottom" overlay={<Tooltip>{copied ? "Copied!" : "Copy"}</Tooltip>}>
                                <button onClick={handleCopy} className="btn icon-hover" />
                            </OverlayTrigger>
                        )}
                        <OverlayTrigger placement="bottom" overlay={<Tooltip>Download</Tooltip>}>
                            <button onClick={handleDownload} className="btn icon-hover">Download</button>
                        </OverlayTrigger>
                    </div>
                </div>
                <div className="file-preview-body">{renderViewer()}</div>
            </div>
        </div>
    )
}

// ─── Main Component ────────────────────────────────────────────────────────────

function SharedPreview() {
    const [searchParams] = useSearchParams()
    const token = searchParams.get("token")

    const [data,             setData]             = useState(null)
    const [error,            setError]            = useState(null)
    const [loading,          setLoading]          = useState(true)
    const [copied,           setCopied]           = useState(false)
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [password,         setPassword]         = useState("")
    const [passwordError,    setPasswordError]    = useState("")
    const [verifyingPassword, setVerifyingPassword] = useState(false)
    const [passwordVerified, setPasswordVerified] = useState(false)
    const [showPwd,          setShowPwd]          = useState(false)

    useEffect(() => {
        if (!token) {
            setError("Invalid link")
            setLoading(false)
            return
        }
        fetch(`${API}/api/links/access?token=${token}`, { credentials: "include" })
            .then(res => res.json())
            .then(res => {
                if (!res.success) {
                    setError(res.message)
                } else if (res.password_required) {
                    setShowPasswordModal(true)
                    setData(res)
                } else {
                    setData(res)
                }
            })
            .catch(() => setError("Something went wrong"))
            .finally(() => setLoading(false))
    }, [token])

    const handlePasswordSubmit = async () => {
        if (!password.trim()) {
            setPasswordError("Please enter a password")
            return
        }
        setVerifyingPassword(true)
        setPasswordError("")
        try {
            const res    = await fetch(`${API}/api/links/verify_password`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ token, password }),
            })
            const result = await res.json()
            if (!result.success) {
                setPasswordError(result.message || "Incorrect password")
            } else {
                setPasswordVerified(true)
                setData(result)
                setShowPasswordModal(false)
                setPassword("")
            }
        } catch (err) {
            setPasswordError("Something went wrong. Please try again.")
            console.error("Password verification error:", err)
        } finally {
            setVerifyingPassword(false)
        }
    }

    if (loading) return <p>Loading...</p>
    if (error)   return <p>{error}</p>

    if (showPasswordModal && !passwordVerified) {
        return (
            <PasswordModal
                show={showPasswordModal}
                password={password}
                setPassword={setPassword}
                passwordError={passwordError}
                setPasswordError={setPasswordError}
                showPwd={showPwd}
                setShowPwd={setShowPwd}
                verifyingPassword={verifyingPassword}
                onSubmit={handlePasswordSubmit}
            />
        )
    }

    if (data?.type === "file") {
        return <FilePreview data={data} copied={copied} setCopied={setCopied} />
    }

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