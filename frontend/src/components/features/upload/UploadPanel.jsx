

// import { useUpload } from "../../../context/UploadContext";
// import { useFileExplorer } from "../../../context/FileExplorerContext";
// import Tooltip from "../../layout/Tooltip";
// import InteractiveIcon from "../../layout/InteractiveIcon";
// import closeIcon from "@images/icon/close-icon.svg";
// import listFolder1Icon from "@images/svgs/list/SF1.svg";
// import fileIcon from "@images/svgs/file.svg";
// import doneIcon from "@images/icon/done-icon.svg";
// import errorIcon from "@images/icon/error-icon.svg";
// import retryIcon from "@images/icon/retry-icon.svg";
// import uploadFileIcon from "@images/icon/upload-file-icon.svg";
// import getFileIcon from "../../../utils/getFileIcon";
// import { useNavigate } from "react-router-dom";
// import { useRef, useCallback, useEffect, useState } from "react";
// import { Modal } from "react-bootstrap";
// import CustomScroll from "../../layout/CustomScroll"
// import ConflictModal from "../../modals/ConflictModal";
// import arrowDown from "@images/icon/arrow-down.svg"
// import arrowUp from "@images/icon/arrow-up.svg"



// /* Progress Circle */
// function ProgressCircle({ percent = 0 }) {
//     const radius = 13;
//     const stroke = 2.5;
//     const normalizedRadius = radius - stroke;
//     const circumference = normalizedRadius * 2 * Math.PI;
//     const strokeDashoffset = circumference - (percent / 100) * circumference;

//     return (
//         <svg
//             height={radius * 2}
//             width={radius * 2}
//             style={{ transform: "rotate(-90deg)", flexShrink: 0 }}
//         >
//             <circle
//                 stroke="#BEBEC7"
//                 fill="transparent"
//                 strokeWidth={stroke}
//                 r={normalizedRadius}
//                 cx={radius}
//                 cy={radius}
//             />
//             <circle
//                 stroke="#398415"
//                 fill="transparent"
//                 strokeWidth={stroke}
//                 strokeDasharray={`${circumference} ${circumference}`}
//                 style={{
//                     strokeDashoffset,
//                     transition: "stroke-dashoffset 0.1s linear",
//                 }}
//                 strokeLinecap="round"
//                 r={normalizedRadius}
//                 cx={radius}
//                 cy={radius}
//             />
//         </svg>
//     );
// }


// /* Icons */
// const FileIcon = () => <InteractiveIcon defaultIcon={fileIcon} alt="" />;
// const FolderIcon = () => <InteractiveIcon defaultIcon={listFolder1Icon} alt="" />;
// const UploadFolderIcon = () => <InteractiveIcon defaultIcon={uploadFileIcon} alt="" />;
// const DoneIcon = () => <InteractiveIcon defaultIcon={doneIcon} width={24} alt="" />;
// const ErrorIcon = () => <InteractiveIcon defaultIcon={errorIcon} width={24} alt="" />;
// const RetryIcon = () => <InteractiveIcon defaultIcon={retryIcon} width={24} alt="" />;
// const CloseIcon = () => <InteractiveIcon defaultIcon={closeIcon} width={24} alt="" />;


// /* Confirm Cancel Modal */
// function ConfirmCancelModal({ show, onConfirm, onClose, isFolder, isAll }) {
//     const modalRef = useRef(null)

//     const handleOutsideClick = (e) => {
//         if (modalRef.current && !modalRef.current.contains(e.target)) {
//             onClose()
//         }
//     }

//     return (
//         <div onClick={handleOutsideClick}>
//             <Modal
//                 show={show}
//                 backdrop="static"
//                 keyboard={false}
//                 centered
//             >
//                 <div ref={modalRef}>
//                     <Modal.Header className="border-0">
//                         <Modal.Title>Cancel Upload</Modal.Title>
//                     </Modal.Header>

//                     <Modal.Body>
//                         {isAll
//                             ? "Are you sure you want to cancel all uploads? Everything in progress will be removed."
//                             : isFolder
//                                 ? "Are you sure you want to cancel this folder upload? All files in progress will be removed."
//                                 : "Are you sure you want to cancel this file upload?"
//                         }
//                     </Modal.Body>

//                     <Modal.Footer className="d-flex align-items-center justify-content-between border-0">
//                         <button type="button" className="btn-secondary btn-lg m-0" onClick={onClose}>
//                             No, keep it
//                         </button>
//                         <button type="button" className="btn-black btn-lg m-0" onClick={onConfirm}>
//                             Yes, cancel
//                         </button>
//                     </Modal.Footer>
//                 </div>
//             </Modal>
//         </div>
//     )
// }

// /* Upload Issues Modal */
// function UploadIssuesModal({ show, onClose, sessionId }) {
//     const { getSessionIssues } = useUpload()
//     const issues = sessionId ? getSessionIssues(sessionId) : []

//     return (
//         <div onClick={(e) => e.stopPropagation()}>
//             <Modal show={show} onHide={onClose} centered backdrop="static">
//                 <Modal.Header className="border-0 pb-2">
//                     <Modal.Title>Upload Issues</Modal.Title>
//                 </Modal.Header>
//                 <Modal.Body className="pt-0">
//                     <div style={{ maxHeight: "300px", overflowY: "auto", paddingRight: "5px" }}>
//                         {issues.length === 0 && <p className="text-muted">No specific file issues found.</p>}
//                         {issues.map((issue, idx) => (
//                             <div key={idx} className="mb-3 border-bottom pb-2">
//                                 <div style={{ fontWeight: 500, wordBreak: "break-word", fontSize: "0.9rem" }}>
//                                     {issue.path}
//                                 </div>
//                                 <div style={{ color: "#d93025", fontSize: "0.85rem", marginTop: "2px" }}>
//                                     {issue.message || (issue.status === "blocked" ? "File not allowed" : "Upload failed")}
//                                 </div>
//                             </div>
//                         ))}
//                     </div>
//                 </Modal.Body>
//                 <Modal.Footer className="border-0 mt-3">
//                     <button type="button" className="btn-black btn-lg m-0" onClick={onClose}>
//                         Close
//                     </button>
//                 </Modal.Footer>
//             </Modal>
//         </div>
//     )
// }


// /* File Row */
// function FileRow({ file, sessionId, onRetry, onCancelClick }) {
//     const { removeFile } = useUpload()
//     const { triggerHighlight } = useFileExplorer()
//     const navigate = useNavigate()
//     const name = file?.file?.name || file?.file?.webkitRelativePath || "Unknown"
//     const status = file?.status
//     const progress = file.progress || 0;
//     const speed = file.speed || null

//     const isUploading = status === "uploading" || status === "waiting";
//     const isDone = status === "done" || status === "skipped";
//     const isError = status === "error";
//     const isBlocked = status === "blocked"

//     const formatSpeed = (mbps) => {
//         if (!mbps || mbps < 0) return null
//         if (mbps > 1) return `${mbps.toFixed(1)} MB/s`
//     }

//     const handleOpenFolder = () => {
//         const parentId = file.parentId;
//         if (parentId) {
//             navigate(`/dashboard/folder/${parentId}`)
//         } else {
//             navigate("/dashboard")
//         }
//         if (file.id) {
//             triggerHighlight(file.id)
//         }
//     }

//     const handleCloseClick = (e) => {
//         e.stopPropagation();
//         if (isUploading) {
//             // show confirm modal for in-progress file
//             onCancelClick({ sessionId, filekey: file.filekey, isFolder: false })
//         } else {
//             // already done/error/blocked — just remove from panel directly
//             removeFile(sessionId, file.filekey)
//         }
//     }

//     return (
//         <div className="upload-file-item">
//             <div className="upload-file-item-content">
//                 <div className="upload-file-icon">
//                     <InteractiveIcon defaultIcon={getFileIcon(file?.file?.name)} alt="" style={{ height: "30px" }} />
//                 </div>

//                 <div className="d-flex align-items-center">
//                     <div className="upload-file-name">{name}</div>

//                     {isUploading && (
//                         <div className="upload-file-count">
//                             {progress}%
//                             {speed && formatSpeed(speed) && (
//                                 <span style={{ marginLeft: "6px", opacity: 0.7 }}>
//                                     · {formatSpeed(speed)}
//                                 </span>
//                             )}
//                         </div>
//                     )}
//                 </div>
//             </div>

//             <div className="upload-right-side">
//                 {isUploading && <ProgressCircle percent={progress} />}

//                 {isDone && (
//                     <>
//                         <Tooltip text="File uploaded">
//                             <span><DoneIcon /></span>
//                         </Tooltip>
//                         <Tooltip text="Open file">
//                             <span className="btn-only-icon" onClick={handleOpenFolder}><UploadFolderIcon /></span>
//                         </Tooltip>
//                     </>
//                 )}

//                 {isBlocked && (
//                     <Tooltip text={file.message || "File not allowed"}>
//                         <span><ErrorIcon /></span>
//                     </Tooltip>
//                 )}

//                 {isError && (
//                     <>
//                         <Tooltip text={file.message || "Upload failed"}>
//                             <span><ErrorIcon /></span>
//                         </Tooltip>
//                         <Tooltip text="Retry">
//                             <button type="button" className="btn-only-icon" onClick={() => onRetry(file)}>
//                                 <RetryIcon />
//                             </button>
//                         </Tooltip>
//                     </>
//                 )}

//                 <button type="button"
//                     className="btn-only-icon"
//                     onClick={handleCloseClick}
//                 >
//                     <CloseIcon />
//                 </button>
//             </div>
//         </div>
//     )
// }


// /* Folder Row */
// function FolderRow({ session, onCancelClick, onViewIssuesClick, onRetryFolder }) {
//     const { closeSession } = useUpload();
//     const { triggerHighlight } = useFileExplorer();
//     const navigate = useNavigate();

//     const handleOpenFolder = () => {
//         if (session.parentId) {
//             navigate(`/dashboard/folder/${session.parentId}`);
//         } else {
//             navigate("/dashboard");
//         }
//         // Folder uploads usually have a root ID we can highlight
//         if (session.rootId) {
//             triggerHighlight(session.rootId)
//         }
//     };

//     const {
//         id,
//         name,
//         total,
//         done = 0,
//         skipped = 0,
//         error = 0,
//         blocked = 0,
//         prepared = 0,
//         percent = 0,
//     } = session;

//     const failed = error + blocked;
//     const totalDone = done + skipped;

//     let status = "uploading";

//     if (prepared < total) {
//         status = "preparing";
//     } else if (totalDone + failed >= total && failed === 0) {
//         status = "done";
//     } else if (totalDone + failed >= total && totalDone === 0) {
//         status = "allFailed";
//     } else if (totalDone + failed >= total && failed > 0) {
//         status = "partial";
//     }

//     const formatSpeed = (mbps) => {
//         if (!mbps || mbps <= 0) return null;
//         return mbps > 1 ? `${mbps.toFixed(1)} MB/s` : `${(mbps * 1024).toFixed(0)} KB/s`;
//     };

//     let subLabel = null;

//     if (status === "preparing") {
//         subLabel = `Preparing ${prepared} of ${total}`;
//     } else if (status === "uploading") {
//         subLabel = `${totalDone} of ${total} · ${percent}%`;
//     } else if (status === "done") {
//         subLabel = `${total} files uploaded`;
//     } else if (status === "partial") {
//         subLabel = `${totalDone} done · ${blocked} blocked · ${error} failed`;
//     } else if (status === "allFailed") {
//         subLabel = `${total} files failed`;
//     }

//     const isInProgress = status === "preparing" || status === "uploading"

//     const handleCloseClick = (e) => {
//         e.stopPropagation();
//         if (isInProgress) {
//             onCancelClick({ sessionId: id, isFolder: true })
//         } else {
//             closeSession(id)
//         }
//     }

//     return (
//         <div className="upload-file-item">
//             <div className="d-flex align-items-center">
//                 <div className="upload-file-icon">
//                     <FolderIcon />
//                 </div>

//                 <div className="d-flex align-items-center">
//                     <div className="upload-file-name">{name}</div>
//                     {subLabel && (
//                         <div className="upload-file-count">
//                             {subLabel}

//                             {/* Show speed separately with 0.7 opacity just like files */}
//                             {status === "uploading" && session.speed > 0 && (
//                                 <span style={{ marginLeft: "6px", opacity: 0.7 }}>
//                                     · {formatSpeed(session.speed)}
//                                 </span>

//         )}
//                         </div>
//                     )}
//                 </div>
//             </div>

//             <div className="upload-right-side">
//                 {(status === "preparing" || status === "uploading") && (
//                     <ProgressCircle percent={percent} />
//                 )}

//                 {status === "done" && (
//                     <>
//                         <Tooltip text="Folder uploaded">
//                             <span><DoneIcon /></span>
//                         </Tooltip>
//                         <Tooltip text="Open folder">
//                             <span className="btn-only-icon" onClick={handleOpenFolder}>
//                                 <UploadFolderIcon />
//                             </span>
//                         </Tooltip>
//                     </>
//                 )}

//                 {(status === "partial" || status === "allFailed") && (
//                     <>
//                         {/* retry icon for folder */}
//                         {error > 0 && (
//                             <Tooltip text="Retry folder">
//                                 <button type="button" className="btn-only-icon"
//                                     onClick={(e) => {
//                                         e.stopPropagation()
//                                         onRetryFolder(session.id)
//                                     }}><RetryIcon /></button>
//                             </Tooltip>
//                         )}

//                         <Tooltip text="View Issues">
//                             <button type="button" className="btn-only-icon" onClick={(e) => { e.stopPropagation(); onViewIssuesClick(session.id); }}>
//                                 <ErrorIcon />
//                             </button>
//                         </Tooltip>
//                     </>
//                 )}

//                 <button type="button"
//                     className="btn-only-icon"
//                     onClick={handleCloseClick}
//                 >
//                     <CloseIcon />
//                 </button>
//             </div>
//         </div>
//     );
// }


// /* File Session */
// function FileSessionRow({ session, onCancelClick }) {
//     const { retryFile } = useUpload()
//     return (
//         <>
//             {session.files.map(file => (
//                 <FileRow
//                     key={file.filekey}
//                     file={file}
//                     sessionId={session.id}
//                     onRetry={() => retryFile(session.id, file.filekey)}
//                     onCancelClick={onCancelClick}
//                 />
//             ))}
//         </>
//     );
// }


// /* Upload Panel */
// function UploadPanel() {
//     const {
//         sessions,
//         isPanelOpen,
//         isMinimized,
//         toggleMinimize,
//         closeAllSessions,
//         cancelFileUpload,
//         cancelSessionUpload,
//         getSessionIssues,
//         retryFile,
//         retryFolder
//     } = useUpload();

//     // confirm modal state — stores what to cancel
//     const [confirmTarget, setConfirmTarget] = useState(null)
//     const [issuesSessionId, setIssuesSessionId] = useState(null)
//     // { sessionId, filekey?, isFolder }

//     const handleClosePanel = (e) => {
//         e.stopPropagation();
//         e.preventDefault();

//         // Check if any upload is still in progress
//         const hasInProgress = sessions.some(session => {
//             if (session.isFolder || session.isLarge) {
//                 const { total = 0, done = 0, skipped = 0, error = 0, blocked = 0 } = session;
//                 return (done + skipped + error + blocked) < total;
//             } else {
//                 return session.files?.some(f => f.status === "uploading" || f.status === "waiting");
//             }
//         });

//         if (hasInProgress) {
//             // Show confirm modal only if uploads are in progress
//             setConfirmTarget({ isAll: true });
//         } else {
//             // All done — just close the panel directly, no modal needed
//             closeAllSessions();
//         }
//     };

//     // called when any cancel icon is clicked
//     const handleCancelClick = (target) => {
//         setConfirmTarget(target)
//     }

//     // called when user confirms in modal
//     const handleConfirmCancel = async () => {
//         if (!confirmTarget) return

//         if (confirmTarget.isAll) {
//             await closeAllSessions()
//         } else if (confirmTarget.isFolder) {
//             await cancelSessionUpload(confirmTarget.sessionId)
//         } else {
//             await cancelFileUpload(confirmTarget.sessionId, confirmTarget.filekey)
//         }

//         setConfirmTarget(null)
//     }

//     const handleModalClose = () => {
//         setConfirmTarget(null)
//     }

//     return (
//         <>
//             {/* ConflictModal always renders regardless of panel open state */}
//             <ConflictModal />
//             <UploadIssuesModal
//                 show={!!issuesSessionId}
//                 onClose={() => setIssuesSessionId(null)}
//                 sessionId={issuesSessionId}
//             />

//             {isPanelOpen && (
//                 <>
//                     <ConfirmCancelModal
//                         show={!!confirmTarget}
//                         onConfirm={handleConfirmCancel}
//                         onClose={handleModalClose}
//                         isFolder={confirmTarget?.isFolder || false}
//                         isAll={confirmTarget?.isAll || false}
//                     />

//                     <div className="upload-file-single-box">
//                         <div className="upload-file-box">
//                             <div className="upload-file-sub-box">

//                                 <div className="upload-file-header">
//                                     <span className="file-name">Uploads</span>
//                                     <div className="d-flex align-items-center">
//                                         <button type="button" className="btn-only-icon" onClick={toggleMinimize}>
//                                             <InteractiveIcon defaultIcon={isMinimized ? arrowUp : arrowDown} />
//                                         </button>
//                                         <button type="button" className="btn-only-icon" onClick={handleClosePanel}>
//                                             <CloseIcon />
//                                         </button>
//                                     </div>
//                                 </div>

//                                 {!isMinimized && (
//                                     <div className="upload-file-body-wrapper">
//                                         <div className="upload-file-body">
//                                             <CustomScroll className="upload-file-ustom-scroll" showBottomBlur={false}>
//                                                 {sessions.map(session => {
//                                                     if (session.isFolder || session.isLarge) {
//                                                         return (
//                                                             <FolderRow
//                                                                 key={session.id}
//                                                                 session={session}
//                                                                 onCancelClick={handleCancelClick}
//                                                                 onViewIssuesClick={(id) => setIssuesSessionId(id)}
//                                                                 onRetryFolder={retryFolder}
//                                                             />
//                                                         );
//                                                     }
//                                                     return (
//                                                         <FileSessionRow
//                                                             key={session.id}
//                                                             session={session}
//                                                             onCancelClick={handleCancelClick}
//                                                         />
//                                                     );
//                                                 })}
//                                             </CustomScroll>
//                                         </div>
//                                     </div>
//                                 )}

//                             </div>
//                         </div>
//                     </div>
//                 </>
//             )}
//         </>
//     );
// }

// export default UploadPanel;












import { useUpload } from "../../../context/UploadContext";
import { useFileExplorer } from "../../../context/FileExplorerContext";
import Tooltip from "../../layout/Tooltip";
import InteractiveIcon from "../../layout/InteractiveIcon";
import closeIcon from "@images/icon/close-icon.svg";
import listFolder1Icon from "@images/svgs/list/SF1.svg";
import fileIcon from "@images/svgs/file.svg";
import doneIcon from "@images/icon/done-icon.svg";
import errorIcon from "@images/icon/error-icon.svg";
import retryIcon from "@images/icon/retry-icon.svg";
import uploadFileIcon from "@images/icon/upload-file-icon.svg";
import getFileIcon from "../../../utils/getFileIcon";
import { useNavigate } from "react-router-dom";
import { useRef, useCallback, useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import CustomScroll from "../../layout/CustomScroll"
import ConflictModal from "../../modals/ConflictModal";
import arrowDown from "@images/icon/arrow-down.svg"
import arrowUp from "@images/icon/arrow-up.svg"



/* Progress Circle */
function ProgressCircle({ percent = 0 }) {
    const radius = 13;
    const stroke = 2.5;
    const normalizedRadius = radius - stroke;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percent / 100) * circumference;

    return (
        <svg
            height={radius * 2}
            width={radius * 2}
            style={{ transform: "rotate(-90deg)", flexShrink: 0 }}
        >
            <circle
                stroke="#BEBEC7"
                fill="transparent"
                strokeWidth={stroke}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
            />
            <circle
                stroke="#398415"
                fill="transparent"
                strokeWidth={stroke}
                strokeDasharray={`${circumference} ${circumference}`}
                style={{
                    strokeDashoffset,
                    transition: "stroke-dashoffset 0.1s linear",
                }}
                strokeLinecap="round"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
            />
        </svg>
    );
}


/* Icons */
const FileIcon = () => <InteractiveIcon defaultIcon={fileIcon} alt="" />;
const FolderIcon = () => <InteractiveIcon defaultIcon={listFolder1Icon} alt="" />;
const UploadFolderIcon = () => <InteractiveIcon defaultIcon={uploadFileIcon} alt="" />;
const DoneIcon = () => <InteractiveIcon defaultIcon={doneIcon} width={24} alt="" />;
const ErrorIcon = () => <InteractiveIcon defaultIcon={errorIcon} width={24} alt="" />;
const RetryIcon = () => <InteractiveIcon defaultIcon={retryIcon} width={24} alt="" />;
const CloseIcon = () => <InteractiveIcon defaultIcon={closeIcon} width={24} alt="" />;


/* Confirm Cancel Modal */
function ConfirmCancelModal({ show, onConfirm, onClose, isFolder, isAll }) {
    const modalRef = useRef(null)

    const handleOutsideClick = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
            onClose()
        }
    }

    return (
        <div onClick={handleOutsideClick}>
            <Modal
                show={show}
                backdrop="static"
                keyboard={false}
                centered
            >
                <div ref={modalRef}>
                    <Modal.Header className="border-0">
                        <Modal.Title>Cancel Upload</Modal.Title>
                    </Modal.Header>

                    <Modal.Body>
                        {isAll
                            ? "Are you sure you want to cancel all uploads? Everything in progress will be removed."
                            : isFolder
                                ? "Are you sure you want to cancel this folder upload? All files in progress will be removed."
                                : "Are you sure you want to cancel this file upload?"
                        }
                    </Modal.Body>

                    <Modal.Footer className="d-flex align-items-center justify-content-between border-0">
                        <button type="button" className="btn-secondary btn-lg m-0" onClick={onClose}>
                            No, keep it
                        </button>
                        <button type="button" className="btn-black btn-lg m-0" onClick={onConfirm}>
                            Yes, cancel
                        </button>
                    </Modal.Footer>
                </div>
            </Modal>
        </div>
    )
}

/* Upload Issues Modal */
function UploadIssuesModal({ show, onClose, sessionId }) {
    const { getSessionIssues } = useUpload()
    const issues = sessionId ? getSessionIssues(sessionId) : []

    return (
        <div onClick={(e) => e.stopPropagation()}>
            <Modal show={show} onHide={onClose} centered backdrop="static" className="upload-issues-modal">
                <Modal.Header className="border-0 pb-2">
                    <Modal.Title>Upload Issues</Modal.Title>
                </Modal.Header>
                <Modal.Body className="h-modal-lg">
                    <div className="upload-issues-list-box" >
                        {issues.length === 0 && <p className="text-muted">No specific file issues found.</p>}
                        {issues.map((issue, idx) => (
                            <div key={idx} className="upload-issues-items">
                                <div className="file-name ">{issue.path}</div>
                                <div className="file-error-name">
                                    <InteractiveIcon
                                        defaultIcon={errorIcon}
                                        width={16}
                                        height={16}
                                        className="me-2"
                                    />
                                    {issue.message || (issue.status === "blocked" ? "File not allowed" : "Upload failed")}
                                </div>
                            </div>
                        ))}
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <button type="button" className="btn-black btn-lg m-0" onClick={onClose}>Close</button>
                </Modal.Footer>
            </Modal>
        </div>
    )
}


/* File Row */
function FileRow({ file, sessionId, onRetry, onCancelClick }) {
    const { removeFile } = useUpload()
    const { triggerHighlight } = useFileExplorer()
    const navigate = useNavigate()
    const name = file?.file?.name || file?.file?.webkitRelativePath || "Unknown"
    const status = file?.status
    const progress = file.progress || 0;
    const speed = file.speed || null

    const isUploading = status === "uploading" || status === "waiting";
    const isDone = status === "done";
    const isSkipped = status === "skipped";
    const isError = status === "error";
    const isBlocked = status === "blocked"

    const formatSpeed = (mbps) => {
        if (!mbps || mbps < 0) return null
        if (mbps > 1) return `${mbps.toFixed(1)} MB/s`
    }

    const handleOpenFolder = () => {
        const parentId = file.parentId;
        if (parentId) {
            navigate(`/dashboard/folder/${parentId}`)
        } else {
            navigate("/dashboard")
        }
        if (file.id) {
            triggerHighlight(file.id)
        }
    }

    const handleCloseClick = (e) => {
        e.stopPropagation();
        if (isUploading) {
            // show confirm modal for in-progress file
            onCancelClick({ sessionId, filekey: file.filekey, isFolder: false })
        } else {
            // already done/error/blocked — just remove from panel directly
            removeFile(sessionId, file.filekey)
        }
    }

    return (
        <div className="upload-file-item">
            <div className="upload-file-item-content">
                <div className="upload-file-icon">
                    <InteractiveIcon defaultIcon={getFileIcon(file?.file?.name)} alt="" />
                </div>

                <div className="d-flex align-items-center">
                    <div className="upload-file-name">{name}</div>

                    {isUploading && (
                        <div className="upload-file-count">
                            {progress}%
                            {speed && formatSpeed(speed) && (
                                <span style={{ marginLeft: "6px", opacity: 0.7 }}>
                                    · {formatSpeed(speed)}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="upload-right-side">
                {isUploading && <ProgressCircle percent={progress} />}

                {isDone && (
                    <>
                        <Tooltip text="File uploaded">
                            <span><DoneIcon /></span>
                        </Tooltip>
                        <Tooltip text="Open file">
                            <span className="btn-only-icon" onClick={handleOpenFolder}><UploadFolderIcon /></span>
                        </Tooltip>
                    </>
                )}

                {isSkipped && (
                    <Tooltip text="Upload skipped — file is already uploading">
                        <span className="upload-file-count mute-text">Skipped</span>
                    </Tooltip>
                )}

                {isBlocked && (
                    <>
                        <Tooltip text={file.message || "File not allowed"}>
                            <span><ErrorIcon /></span>
                        </Tooltip>
                        <Tooltip text="Retry">
                            <button type="button" className="btn-only-icon" onClick={() => onRetry(file)}>
                                <RetryIcon />
                            </button>
                        </Tooltip>
                    </>

                )}

                {isError && (
                    <>
                        <Tooltip text={file.message || "Upload failed"}>
                            <span><ErrorIcon /></span>
                        </Tooltip>
                        <Tooltip text="Retry">
                            <button type="button" className="btn-only-icon" onClick={() => onRetry(file)}>
                                <RetryIcon />
                            </button>
                        </Tooltip>
                    </>
                )}
                {isUploading && (
                    <Tooltip text="Close">
                        <button type="button"
                            className="btn-only-icon"
                            onClick={handleCloseClick}
                        >
                            <CloseIcon />
                        </button>
                    </Tooltip>
                )}
            </div>
        </div>
    )
}


/* Folder Row */
function FolderRow({ session, onCancelClick, onViewIssuesClick, onRetryFolder }) {
    const { closeSession, cancelScanning } = useUpload();
    const { triggerHighlight } = useFileExplorer();
    const navigate = useNavigate();

    const handleOpenFolder = () => {
        if (session.parentId) {
            navigate(`/dashboard/folder/${session.parentId}`);
        } else {
            navigate("/dashboard");
        }
        // Folder uploads usually have a root ID we can highlight
        if (session.rootId) {
            triggerHighlight(session.rootId)
        }
    };

    const {
        id,
        name,
        total,
        done = 0,
        skipped = 0,
        error = 0,
        blocked = 0,
        prepared = 0,
        percent = 0,
    } = session;

    const failed = error + blocked;
    const totalDone = done + skipped;

    let status = "uploading";

    if (session.isScanning) {
        status = "preparing";
    } else if (prepared < total) {
        status = "preparing";
    } else if (totalDone + failed >= total && failed === 0) {
        status = "done";
    } else if (totalDone + failed >= total && totalDone === 0) {
        status = "allFailed";
    } else if (totalDone + failed >= total && failed > 0) {
        status = "partial";
    }

    const formatSpeed = (mbps) => {
        if (!mbps || mbps <= 0) return null;
        return mbps > 1 ? `${mbps.toFixed(1)} MB/s` : `${(mbps * 1024).toFixed(0)} KB/s`;
    };

    let subLabel = null;

    //  here this is folder status like preparing or how many files uplaoded and how many are fialed and blocked
    if (session.isScanning) {
        subLabel = "Scanning files...";
    } else if (status === "preparing") {
        subLabel = `Preparing ${prepared} of ${total}`;
    } else if (status === "uploading") {
        subLabel = `${totalDone} of ${total} · ${percent}%`;
    } else if (status === "done") {
        subLabel = `${total} files uploaded`;
    } else if (status === "partial") {
        const parts = []
        if (totalDone > 0) parts.push(`${totalDone} ${totalDone === 1 ? "file" : "files"} done`)
        if (blocked > 0) parts.push(`${blocked} ${blocked === 1 ? "file" : "files"} blocked`)
        if (error > 0) parts.push(`${error} ${error === 1 ? "file" : "files"} failed`)
        subLabel = parts.join(" · ")
    } else if (status === "allFailed") {
        if (blocked > 0 && error === 0) {
            subLabel = `${blocked} ${blocked === 1 ? "file" : "files"} blocked`
        } else if (error > 0 && blocked === 0) {
            subLabel = `${error} ${error === 1 ? "file" : "files"} failed`
        } else {
            subLabel = `${blocked} blocked · ${error} failed`
        }
    }

    const isInProgress = status === "preparing" || status === "uploading"

    const handleCloseClick = (e) => {
        e.stopPropagation();
        if (session.isScanning) {
            cancelScanning()
        } else if (isInProgress) {
            onCancelClick({ sessionId: id, isFolder: true })
        } else {
            closeSession(id)
        }
    }

    return (
        <div className="upload-file-item">
            <div className="d-flex align-items-center">
                <div className="upload-file-icon">
                    <FolderIcon />
                </div>

                <div className="d-flex align-items-center">
                    <div className="upload-file-name">{name}</div>
                    {subLabel && (
                        <div className="upload-file-count">
                            {subLabel}

                            {/* Show speed separately with 0.7 opacity just like files */}
                            {status === "uploading" && session.speed > 0 && (
                                <span style={{ marginLeft: "6px", opacity: 0.7 }}>
                                    · {formatSpeed(session.speed)}
                                </span>

                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="upload-right-side">
                {(status === "preparing" || status === "uploading") && (
                    <ProgressCircle percent={percent} />
                )}

                {status === "done" && (
                    <>
                        <Tooltip text="Folder uploaded">
                            <span><DoneIcon /></span>
                        </Tooltip>
                        <Tooltip text="Open folder">
                            <span className="btn-only-icon" onClick={handleOpenFolder}>
                                <UploadFolderIcon />
                            </span>
                        </Tooltip>
                    </>
                )}

                {(status === "partial" || status === "allFailed") && (
                    <>
                        <Tooltip text="View Issues">
                            <span type="button" onClick={(e) => { e.stopPropagation(); onViewIssuesClick(session.id); }}>
                                <ErrorIcon />
                            </span>
                        </Tooltip>

                        {(error > 0 || blocked > 0) && (
                            <Tooltip text="Retry folder">
                                <span type="button" className="btn-only-icon"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onRetryFolder(session.id)
                                    }}><RetryIcon /></span>
                            </Tooltip>
                        )}
                    </>
                )}
                {(status === "preparing" || status === "uploading") && (
                    <Tooltip text="Close">
                        <button type="button"
                            className="btn-only-icon"
                            onClick={handleCloseClick}
                        >
                            <CloseIcon />
                        </button>
                    </Tooltip>
                )}
            </div>
        </div>
    );
}


/* File Session */
function FileSessionRow({ session, onCancelClick }) {
    const { retryFile } = useUpload()
    return (
        <>
            {session.files.map(file => (
                <FileRow
                    key={file.filekey}
                    file={file}
                    sessionId={session.id}
                    onRetry={() => retryFile(session.id, file.filekey)}
                    onCancelClick={onCancelClick}
                />
            ))}
        </>
    );
}


/* Upload Panel */
function UploadPanel() {
    const {
        sessions,
        isPanelOpen,
        isMinimized,
        toggleMinimize,
        closeAllSessions,
        cancelFileUpload,
        cancelSessionUpload,
        getSessionIssues,
        retryFile,
        retryFolder
    } = useUpload();

    // confirm modal state — stores what to cancel
    const [confirmTarget, setConfirmTarget] = useState(null)
    const [issuesSessionId, setIssuesSessionId] = useState(null)
    // { sessionId, filekey?, isFolder }

    const handleClosePanel = (e) => {
        e.stopPropagation();
        e.preventDefault();

        // Check if any upload is still in progress
        const hasInProgress = sessions.some(session => {
            if (session.isFolder || session.isLarge) {
                const { total = 0, done = 0, skipped = 0, error = 0, blocked = 0 } = session;
                return (done + skipped + error + blocked) < total;
            } else {
                return session.files?.some(f => f.status === "uploading" || f.status === "waiting");
            }
        });

        if (hasInProgress) {
            // Show confirm modal only if uploads are in progress
            setConfirmTarget({ isAll: true });
        } else {
            // All done — just close the panel directly, no modal needed
            closeAllSessions();
        }
    };

    // called when any cancel icon is clicked
    const handleCancelClick = (target) => {
        setConfirmTarget(target)
    }

    // called when user confirms in modal
    const handleConfirmCancel = async () => {
        if (!confirmTarget) return

        if (confirmTarget.isAll) {
            await closeAllSessions()
        } else if (confirmTarget.isFolder) {
            await cancelSessionUpload(confirmTarget.sessionId)
        } else {
            await cancelFileUpload(confirmTarget.sessionId, confirmTarget.filekey)
        }

        setConfirmTarget(null)
    }

    const handleModalClose = () => {
        setConfirmTarget(null)
    }

    return (
        <>
            {/* ConflictModal always renders regardless of panel open state */}
            <ConflictModal />
            <UploadIssuesModal
                show={!!issuesSessionId}
                onClose={() => setIssuesSessionId(null)}
                sessionId={issuesSessionId}
            />

            {isPanelOpen && (
                <>
                    <ConfirmCancelModal
                        show={!!confirmTarget}
                        onConfirm={handleConfirmCancel}
                        onClose={handleModalClose}
                        isFolder={confirmTarget?.isFolder || false}
                        isAll={confirmTarget?.isAll || false}
                    />

                    <div className="upload-file-single-box">
                        <div className="upload-file-header">
                            <span className="file-name">Uploads</span>
                            <div className="upload-right-side">
                                <Tooltip text={isMinimized ? "Maximize" : "Minimize"}>
                                    <button type="button" className="btn-only-icon" onClick={toggleMinimize}>
                                        <InteractiveIcon defaultIcon={isMinimized ? arrowUp : arrowDown} />
                                    </button>
                                </Tooltip>
                                <Tooltip text="Close">
                                    <button type="button" className="btn-only-icon" onClick={handleClosePanel}>
                                        <CloseIcon />
                                    </button>
                                </Tooltip>
                            </div>
                        </div>

                        {!isMinimized && (
                            <div className="upload-file-body-wrapper">
                                <div className="upload-file-body">
                                    <CustomScroll className="upload-file-ustom-scroll" showBottomBlur={false} showTopBlur={false}>
                                        {sessions.map(session => {
                                            if (session.isFolder || session.isLarge) {
                                                return (
                                                    <FolderRow
                                                        key={session.id}
                                                        session={session}
                                                        onCancelClick={handleCancelClick}
                                                        onViewIssuesClick={(id) => setIssuesSessionId(id)}
                                                        onRetryFolder={retryFolder}
                                                    />
                                                );
                                            }
                                            return (
                                                <FileSessionRow
                                                    key={session.id}
                                                    session={session}
                                                    onCancelClick={handleCancelClick}
                                                />
                                            );
                                        })}
                                    </CustomScroll>
                                </div>
                            </div>
                        )}

                    </div>

                </>
            )}
        </>
    );
}

export default UploadPanel;










