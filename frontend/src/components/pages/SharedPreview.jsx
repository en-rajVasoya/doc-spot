import { useEffect, useState, useRef } from "react"
import { useSearchParams, useNavigate, useLocation } from "react-router-dom"
import { OverlayTrigger, Tooltip, Modal, Form } from "react-bootstrap"
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
import errorIcon from "@images/icon/error-icon.svg"
import { useAuth } from "../../context/AuthContext"
import { useDownload } from "../../context/DownloadContext"
import DownloadPanel from "../features/download/DownloadPanel"
import downloadIcon from "@images/icon/download.svg"
import fileIcon from "@images/svgs/file.svg"
import copyIcon from "@images/icon/copy.svg"
import copiedIcon from "@images/icon/copied-icon.svg"

import { io } from "socket.io-client"
import { getRoute } from "../../utils/getRoutes.js"
import SharedAccessDenied from "./SharedAccessDenied"

// ─── Constants ─────────────────────────────────────────────────────────────────

const API = import.meta.env.DEV ? "" : import.meta.env.VITE_BACKEND_URL;
const SOCKET_URL = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") || "";

const MIME = {
    isPDF: (m) => m === "application/pdf",
    isImage: (m) => m.startsWith("image/"),
    isVideo: (m) => m.startsWith("video/"),
    isAudio: (m) => m.startsWith("audio/"),
    isText: (m) => m.startsWith("text/"),
    isZip: (m) => m === "application/x-zip-compressed",
    isExcel: (m) => ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel", "text/csv"].includes(m),
    isDoc: (m) => ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"].includes(m),
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getFileType(mimeType) {
    if (MIME.isImage(mimeType)) return "image"
    if (MIME.isPDF(mimeType)) return "pdf"
    if (MIME.isVideo(mimeType)) return "video"
    if (MIME.isAudio(mimeType)) return "audio"
    if (MIME.isZip(mimeType)) return "zip"
    if (MIME.isExcel(mimeType)) return "excel"
    if (MIME.isDoc(mimeType)) return "docx"
    if (MIME.isText(mimeType)) return "text"
    return "unknown"
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function PasswordModal({ show, password, setPassword, passwordError, setPasswordError, showPwd, setShowPwd, verifyingPassword, onSubmit }) {
    return (
        <Modal
            show={show}
            onHide={() => { }}
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
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !verifyingPassword && password.trim()) {
                                    e.preventDefault();
                                    onSubmit();
                                }
                            }}
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

function FilePreview({ data, token, copied, setCopied, downloadFile }) {
    const file = data.data;

    // FIX: Ensure storagePath has a leading slash and includes the public share link token
    if (file && file.storagePath) {
        if (!file.storagePath.startsWith('/')) {
            file.storagePath = '/' + file.storagePath;
        }
        if (token && !file.storagePath.includes("token=")) {
            file.storagePath += `?token=${token}`;
        }
    }
    if (file && file.url && token && !file.url.includes("token=")) {
        file.url += (file.url.includes("?") ? "&" : "?") + `token=${token}`;
    }

    const fileUrl = data.redirect_url
    const { name: fileName, fileType: mimeType } = file
    const type = getFileType(mimeType)

    const handleDownload = () => {
        downloadFile(file)
    }

    const handleCopy = async () => {
        try {
            const res = await fetch(fileUrl, { credentials: "include" })
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
            case "image": return <ImageViewer file={file} />
            case "pdf": return <PdfViewer file={file} />
            case "text": return <TextViewer file={file} />
            case "video": return <VideoViewer file={file} />
            case "audio": return <AudioViewer file={file} />
            case "zip": return <ZipViewer file={file} />
            case "docx": return <DocViewer file={file} />
            case "excel": return <ExcelViewer file={file} />
            default:
                return (
                    <div className="preview-toobig">
                        <div className="txt-toobig-icon">
                            <img src={fileIcon} alt="" width={38} />
                        </div>
                        <p className="preview-toobig-title m-0">{fileName}</p>
                        <p className="single-sub-title">A preview of this file is not available. Please download it.</p>
                        <button className="preview-btn preview-btn-text mt-2" onClick={handleDownload}>
                            <InteractiveIcon
                                defaultIcon={downloadIcon}
                                width={20}
                                height={20}
                                alt=""
                            />
                            Download
                        </button>
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
                    </div>
                </div>
                <div className="file-preview-body">{renderViewer()}</div>
                <DownloadPanel />
            </div>
        </div>
    )
}

// ─── Main Component ────────────────────────────────────────────────────────────

function SharedPreview() {
    const [searchParams] = useSearchParams()
    const token = searchParams.get("token")

    const { logout, user } = useAuth()
    const { downloadFile } = useDownload()

    const navigate = useNavigate()
    const location = useLocation()

    const [data, setData] = useState(null)
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(true)
    const [copied, setCopied] = useState(false)
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [password, setPassword] = useState("")
    const [passwordError, setPasswordError] = useState("")
    const [verifyingPassword, setVerifyingPassword] = useState(false)
    const [passwordVerified, setPasswordVerified] = useState(false)
    const [showPwd, setShowPwd] = useState(false)

    const prevHasPasswordRef = useRef(null)

    // Helper to recursively ensure all file storagePaths have a leading slash
    const fixStoragePaths = (res) => {
        if (res.data && res.data.storagePath && !res.data.storagePath.startsWith('/')) {
            res.data.storagePath = '/' + res.data.storagePath;
        }
        if (res.folder_data) {
            const fixRecursive = (items) => {
                if (!Array.isArray(items)) return items;
                return items.map(item => {
                    if (item.storagePath && !item.storagePath.startsWith('/')) {
                        item.storagePath = '/' + item.storagePath;
                    }
                    if (item.children) {
                        item.children = fixRecursive(item.children);
                    }
                    return item;
                });
            };
            res.folder_data = fixRecursive(res.folder_data);
        }
        return res;
    };

    useEffect(() => {
        if (!token) {
            setError("Invalid link")
            setLoading(false)
            return
        }
        fetch(`${API}/api/links/access?token=${token}`, { credentials: "include" })
            .then(async (res) => {
                const data = await res.json();
                data.statusCode = res.status;
                return data;
            })
            .then(res => {
                if (!res.success) {
                    if (res.is_login_required) {
                        const currentPath = location.pathname + location.search
                        navigate(`/?redirect=${encodeURIComponent(currentPath)}`)
                        return;
                    }
                    setError(res)
                    return
                }

                // private link → redirect straight to Shared With Me, skip preview entirely
                if (!res.password_required && res.is_public === false) {
                    const itemId = res.data?._id
                    const parentId = res.type === "folder" ? itemId : res.data?.parent

                    if (parentId) {
                        navigate(`${getRoute.SHARED_WITH_ME}/folder/${parentId}`, {
                            replace: true,
                            state: { highlightId: itemId }
                        })
                    } else {
                        navigate(getRoute.SHARED_WITH_ME, {
                            replace: true,
                            state: { highlightId: itemId }
                        })
                    }
                    return
                }

                if (res.password_required) {
                    prevHasPasswordRef.current = true
                    setShowPasswordModal(true)
                    setData(fixStoragePaths(res))
                } else {
                    prevHasPasswordRef.current = false
                    setData(fixStoragePaths(res))
                }
            })
            .catch(() => setError("Something went wrong"))
            .finally(() => setLoading(false))
    }, [token])



    // so in shared link w are using second socket
    useEffect(() => {
        if (!data || !token) return

        const socket = io(SOCKET_URL, { withCredentials: true })

        socket.emit("join_shared_link", token)

        socket.on("shared_link_updated", (update) => {
            if (update.token !== token) return

            if (update.is_expired) {
                setError({ is_expired: true, message: "This link has expired" })
                setData(null)
                return
            }

            const passwordJustEnabled = update.has_password && prevHasPasswordRef.current !== true
            prevHasPasswordRef.current = update.has_password

            if (update.has_password) {
                if (passwordJustEnabled || update.password_changed) {
                    setShowPasswordModal(true)
                    setPasswordVerified(false)
                    setPassword("")

                }
            } else {
                setShowPasswordModal(false)
                setPasswordVerified(false)

                if (!data?.data && !data?.folder_data) {
                    fetch(`${API}/api/links/access?token=${token}`, { credentials: "include" })
                        .then(res => res.json())
                        .then(res => {
                            if (res.success) setData(fixStoragePaths(res))
                        })
                }
            }

            if (!update.is_public) {
                setError({ message: "This link is no longer public" })
                setData(null)
            }
        })

        return () => {
            socket.emit("leave_shared_link", token)
            socket.disconnect()
        }
    }, [data, token])

    const handlePasswordSubmit = async () => {
        if (!password.trim()) {
            setPasswordError("Please enter a password")
            return
        }
        setVerifyingPassword(true)
        setPasswordError("")
        try {
            const res = await fetch(`${API}/api/links/verify_password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ token, password }),
            })
            const result = await res.json()
            if (!result.success) {
                setPasswordError(result.message || "Incorrect password")
            } else {
                setPasswordVerified(true)
                setData(fixStoragePaths(result))
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

    if (loading) {
        return (
            <div className="file-preview-backdrop d-flex align-items-center justify-content-center">
                <div className="loader-wrapper-box">
                    <div className="cma-messages-are-loader-wrapper">
                        <span className="loader"></span>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <SharedAccessDenied
                error={error}
                user={user}
                onSwitchAccount={async () => {
                    await logout();
                    const currentPath = location.pathname + location.search;
                    navigate(`/?redirect=${encodeURIComponent(currentPath)}`);
                }}
                onGoHome={() => {
                    navigate(user ? "/dashboard" : "/");
                }}
            />
        );
    }


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
        return <FilePreview data={data} token={token} copied={copied} setCopied={setCopied} downloadFile={downloadFile} />
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