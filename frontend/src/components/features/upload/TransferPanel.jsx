

import { useState, useRef, useEffect } from "react";
import { useUpload } from "../../../context/UploadContext";
import { useDownload } from "../../../context/DownloadContext";
import { useFileExplorer } from "../../../context/FileExplorerContext";
import { useNavigate } from "react-router-dom";
import { Modal } from "react-bootstrap";
import CustomScroll from "../../layout/CustomScroll";
import ConflictModal from "../../modals/ConflictModal";
import Tooltip from "../../layout/Tooltip";
import InteractiveIcon from "../../layout/InteractiveIcon";

import closeIcon from "@images/icon/close-icon.svg";
import doneIcon from "@images/icon/done-icon.svg";
import errorIcon from "@images/icon/error-icon.svg";
import retryIcon from "@images/icon/retry-icon.svg";
import uploadFileIcon from "@images/icon/upload-file-icon.svg";
import fileIcon from "@images/svgs/file.svg";
import listFolder1Icon from "@images/svgs/list/SF1.svg";
import arrowDown from "@images/icon/arrow-down.svg";
import arrowUp from "@images/icon/arrow-up.svg";
import getFileIcon from "../../../utils/getFileIcon";
import uploadstatusIcon from "@images/upload-file-icon.svg";


// Upload icon

const UploadArrowIcon = ({ isAnimating }) => (
    <svg
        width="13"
        height="24"
        viewBox="0 0 13 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ marginRight: 4, flexShrink: 0 }}
    >
        <defs>
            <linearGradient id="shine" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="50%" stopColor="#86EFAC" />
                <stop offset="100%" stopColor="transparent" />
                {isAnimating && (
                    <animateTransform
                        attributeName="gradientTransform"
                        type="translate"
                        from="0 1"
                        to="0 -1"
                        dur="1.2s"
                        repeatCount="indefinite"
                    />
                )}
            </linearGradient>
        </defs>
        {/* Arrow — animated shine while uploading, solid green when done */}
        <path
            d="M6.5 19V5M2 9.71154L6.5 5L11 9.71154"
            stroke={isAnimating ? "url(#shine)" : "#22c55e"}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

// ─── Icons ───────────────────────────────────────────────
const CloseIcon = () => <InteractiveIcon defaultIcon={closeIcon} width={24} />;
const DoneIcon = () => <InteractiveIcon defaultIcon={doneIcon} width={24} />;
const ErrorIcon = () => <InteractiveIcon defaultIcon={errorIcon} width={24} />;
const RetryIcon = () => <InteractiveIcon defaultIcon={retryIcon} width={24} />;
const FolderIcon = () => <InteractiveIcon defaultIcon={listFolder1Icon} alt="" />;
const UploadFolderIcon = () => <InteractiveIcon defaultIcon={uploadFileIcon} alt="" />;
const ArrowDownIcon = () => <InteractiveIcon defaultIcon={arrowDown} width={24} />;
const ArrowUpIcon = () => <InteractiveIcon defaultIcon={arrowUp} width={24} />;


// ─── Progress Circle ──────────────────────────────────────
function ProgressCircle({ percent = 0 }) {
    const radius = 13;
    const stroke = 2.5;
    const normalizedRadius = radius - stroke;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percent / 100) * circumference;
    return (
        <svg height={radius * 2} width={radius * 2} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
            <circle stroke="#BEBEC7" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} />
            <circle
                stroke="#398415" fill="transparent" strokeWidth={stroke}
                strokeDasharray={`${circumference} ${circumference}`}
                style={{ strokeDashoffset, transition: "stroke-dashoffset 0.1s linear" }}
                strokeLinecap="round" r={normalizedRadius} cx={radius} cy={radius}
            />
        </svg>
    );
}


// ─── Confirm Cancel Modal ─────────────────────────────────
function ConfirmCancelModal({ show, onConfirm, onClose, message }) {
    const modalRef = useRef(null);
    return (
        <div onClick={(e) => { if (modalRef.current && !modalRef.current.contains(e.target)) onClose() }}>
            <Modal show={show} backdrop="static" keyboard={false} centered>
                <div ref={modalRef}>
                    <Modal.Header className="border-0">
                        <Modal.Title>Cancel</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>{message}</Modal.Body>
                    <Modal.Footer className="d-flex align-items-center justify-content-between border-0">
                        <button type="button" className="btn-secondary btn-lg m-0" onClick={onClose}>No, keep it</button>
                        <button type="button" className="btn-black btn-lg m-0" onClick={onConfirm}>Yes, cancel</button>
                    </Modal.Footer>
                </div>
            </Modal>
        </div>
    );
}


// ─── Upload Issues Modal ──────────────────────────────────
function UploadIssuesModal({ show, onClose, sessionId }) {
    const { getSessionIssues } = useUpload();
    const issues = sessionId ? getSessionIssues(sessionId) : [];
    return (
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
    );
}


// ─── Upload File Row ──────────────────────────────────────
function UploadFileRow({ file, sessionId, onRetry, onCancelClick }) {
    const { removeFile } = useUpload();
    const { triggerHighlight } = useFileExplorer();
    const navigate = useNavigate();

    const name = file?.file?.name || file?.file?.webkitRelativePath || "Unknown";
    const status = file?.status;
    const progress = file.progress || 0;
    const speed = file.speed || null;

    const isUploading = status === "uploading" || status === "waiting";
    const isDone = status === "done";
    const isSkipped = status === "skipped";
    const isError = status === "error";
    const isBlocked = status === "blocked";

    const formatSpeed = (mbps) => {
        if (!mbps || mbps < 0) return null;
        if (mbps > 1) return `${mbps.toFixed(1)} MB/s`;
    };

    const handleOpenFolder = () => {
        if (file.parentId) navigate(`/dashboard/folder/${file.parentId}`);
        else navigate("/dashboard");
        if (file.id) triggerHighlight(file.id);
    };

    const handleCloseClick = (e) => {
        e.stopPropagation();
        if (isUploading) {
            onCancelClick({ sessionId, filekey: file.filekey, isFolder: false });
        } else {
            removeFile(sessionId, file.filekey);
        }
    };

    return (
        <div className="upload-file-item">
            <div className="upload-file-item-content">
                {/* upload badge */}
                <UploadArrowIcon isAnimating={isUploading} />
                <div className="upload-file-icon">
                    <InteractiveIcon defaultIcon={getFileIcon(file?.file?.name)} alt="" />
                </div>
                <div className="d-flex align-items-center">
                    <div className="upload-file-name">{name}</div>
                    {isUploading && (
                        <div className="upload-file-count mute-text">
                            {progress}%
                            {speed && formatSpeed(speed) && (
                                <span className="mute-text">· {formatSpeed(speed)}</span>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <div className="upload-right-side">
                {isUploading && <ProgressCircle percent={progress} />}
                {isDone && (
                    <>
                        <Tooltip text="File uploaded"><span><DoneIcon /></span></Tooltip>
                        <Tooltip text="Open file"><span className="btn-only-icon" onClick={handleOpenFolder}><UploadFolderIcon /></span></Tooltip>
                    </>
                )}
                {isSkipped && (
                    <Tooltip text="Upload skipped — file is already uploading">
                        <span className="upload-file-count mute-text">Skipped</span>
                    </Tooltip>
                )}
                {isBlocked && (
                    <Tooltip text={file.message || "File not allowed"}><span><ErrorIcon /></span></Tooltip>
                )}
                {isError && (
                    <>
                        <Tooltip text={file.message || "Upload failed"}><span><ErrorIcon /></span></Tooltip>
                        <Tooltip text="Retry">
                            <button type="button" className="btn-only-icon" onClick={() => onRetry(file)}><RetryIcon /></button>
                        </Tooltip>
                    </>
                )}
                <button type="button" className="btn-only-icon" onClick={handleCloseClick}><CloseIcon /></button>
            </div>
        </div>
    );
}


// ─── Upload Folder Row ────────────────────────────────────
function UploadFolderRow({ session, onCancelClick, onViewIssuesClick, onRetryFolder }) {
    const { closeSession } = useUpload();
    const { triggerHighlight } = useFileExplorer();
    const navigate = useNavigate();

    const { id, name, total, done = 0, skipped = 0, error = 0, blocked = 0, prepared = 0, percent = 0 } = session;
    const failed = error + blocked;
    const totalDone = done + skipped;

    let status = "uploading";
    if (prepared < total) status = "preparing";
    else if (totalDone + failed >= total && failed === 0) status = "done";
    else if (totalDone + failed >= total && totalDone === 0) status = "allFailed";
    else if (totalDone + failed >= total && failed > 0) status = "partial";

    const formatSpeed = (mbps) => {
        if (!mbps || mbps <= 0) return null;
        return mbps > 1 ? `${mbps.toFixed(1)} MB/s` : `${(mbps * 1024).toFixed(0)} KB/s`;
    };

    let subLabel = null;
    if (status === "preparing") subLabel = `Preparing ${prepared} of ${total}`;
    else if (status === "uploading") subLabel = `${totalDone} of ${total} · ${percent}%`;
    else if (status === "done") subLabel = `${total} files uploaded`;
    else if (status === "partial") subLabel = `${totalDone} done · ${blocked} blocked · ${error} failed`;
    else if (status === "allFailed") subLabel = `${total} files failed`;

    const isInProgress = status === "preparing" || status === "uploading";

    const handleOpenFolder = () => {
        if (session.parentId) navigate(`/dashboard/folder/${session.parentId}`);
        else navigate("/dashboard");
        if (session.rootId) triggerHighlight(session.rootId);
    };

    const handleCloseClick = (e) => {
        e.stopPropagation();
        if (isInProgress) onCancelClick({ sessionId: id, isFolder: true });
        else closeSession(id);
    };

    return (
        <div className="upload-file-item">
            <div className="d-flex align-items-center">
                {/* upload badge */}
                <UploadArrowIcon isAnimating={isInProgress} />
                <div className="upload-file-icon"><FolderIcon /></div>
                <div className="d-flex align-items-center">
                    <div className="upload-file-name">{name}</div>
                    {subLabel && (
                        <div className="upload-file-count">
                            {subLabel}
                            {status === "uploading" && session.speed > 0 && (
                                <span style={{ marginLeft: "6px", opacity: 0.7 }}>· {formatSpeed(session.speed)}</span>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <div className="upload-right-side">
                {(status === "preparing" || status === "uploading") && <ProgressCircle percent={percent} />}
                {status === "done" && (
                    <>
                        <Tooltip text="Folder uploaded"><span><DoneIcon /></span></Tooltip>
                        <Tooltip text="Open folder"><span className="btn-only-icon" onClick={handleOpenFolder}><UploadFolderIcon /></span></Tooltip>
                    </>
                )}
                {(status === "partial" || status === "allFailed") && (
                    <>
                        {error > 0 && (
                            <Tooltip text="Retry folder">
                                <button type="button" className="btn-only-icon" onClick={(e) => { e.stopPropagation(); onRetryFolder(session.id); }}><RetryIcon /></button>
                            </Tooltip>
                        )}
                        <Tooltip text="View Issues">
                            <button type="button" className="btn-only-icon" onClick={(e) => { e.stopPropagation(); onViewIssuesClick(session.id); }}><ErrorIcon /></button>
                        </Tooltip>
                    </>
                )}
                <button type="button" className="btn-only-icon" onClick={handleCloseClick}><CloseIcon /></button>
            </div>
        </div>
    );
}


// Upload icon
// const DownloadArrowIcon = ({ isAnimating }) => (
//     <svg
//         width="13"
//         height="24"
//         viewBox="0 0 13 24"
//         fill="none"
//         xmlns="http://www.w3.org/2000/svg"
//         style={{
//             flexShrink: 0,
//             transform: "rotate(180deg)",
//             marginRight: 4,
//         }}
//     >
//         <defs>
//             <linearGradient id="shine" x1="0" y1="1" x2="0" y2="0">
//                 <stop offset="0%" stopColor="transparent" />
//                 <stop offset="50%" stopColor="#86EFAC" />
//                 <stop offset="100%" stopColor="transparent" />
//                 {isAnimating && (
//                     <animateTransform
//                         attributeName="gradientTransform"
//                         type="translate"
//                         from="0 1"
//                         to="0 -1"
//                         dur="1.2s"
//                         repeatCount="indefinite"
//                     />
//                 )}
//             </linearGradient>
//         </defs>
//         <path
//             d="M6.5 19V5M2 9.71154L6.5 5L11 9.71154"
//             stroke={isAnimating ? "url(#shine)" : "#22c55e"}
//             strokeWidth="1.5"
//             strokeLinecap="round"
//             strokeLinejoin="round"
//         />
//     </svg>
// );

const DownloadArrowIcon = ({ isAnimating, uid }) => {
    const gradientId = `download-shine-${uid}`;
    return (
        <svg
            width="13"
            height="24"
            viewBox="0 0 13 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
                flexShrink: 0,
                transform: "rotate(180deg)",
                marginRight: 4,
            }}
        >
            <defs>
                <linearGradient id={gradientId} x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="transparent" />
                    <stop offset="50%" stopColor="#86EFAC" />
                    <stop offset="100%" stopColor="transparent" />
                    {isAnimating && (
                        <animateTransform
                            attributeName="gradientTransform"
                            type="translate"
                            from="0 1"
                            to="0 -1"
                            dur="1.2s"
                            repeatCount="indefinite"
                        />
                    )}
                </linearGradient>
            </defs>
            <path
                d="M6.5 19V5M2 9.71154L6.5 5L11 9.71154"
                stroke={isAnimating ? `url(#${gradientId})` : "#22c55e"}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

// ─── Download Row ─────────────────────────────────────────
function DownloadRow({ session, onCancelClick }) {
    const { status, name, progress = 0, speed, zipProgress = 0 } = session;

    const isDownloading = status === "downloading";
    const isCreating = status === "creating";
    const isDone = status === "done";
    const isError = status === "error";
    const isAssembling = status === "assembling";

    //  this is for loading anmation o icon
    const isAnimating = !isDone && !isError;

    const formatSpeed = (mbps) => {
        if (!mbps) return null;
        return mbps > 1 ? `${mbps.toFixed(1)} MB/s` : null;
    };

    const handleCloseClick = (e) => {
        e.stopPropagation();
        onCancelClick(session);
    };




    return (
        <div className="upload-file-item">
            <div className="upload-file-item-content">
                {/* download badge */}
                <DownloadArrowIcon isAnimating={isAnimating} uid={session.id} />
                <div className="upload-file-icon">
                    <InteractiveIcon defaultIcon={getFileIcon(name)} />
                </div>
                <div className="d-flex align-items-center">
                    <div className="upload-file-name">{name}</div>
                    {isCreating && (
                        <div className="upload-file-count">
                            Creating zip... {session.zipProgress > 0 ? `${session.zipProgress}%` : ""}
                        </div>
                    )}
                    {(isDownloading || isAssembling) && (
                        <div className="upload-file-count mute-text">
                            {isAssembling ? "Saving... " : `${progress}%`}
                            {speed && !isAssembling && (
                                <span className="mute-text">· {formatSpeed(speed)}</span>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <div className="upload-right-side">
                {isDownloading && <ProgressCircle percent={progress} />}
                {(isDone || isAssembling) && <Tooltip text="Downloaded"><span><DoneIcon /></span></Tooltip>}
                {isError && <Tooltip text="Failed"><span><ErrorIcon /></span></Tooltip>}
                <button className="btn-only-icon" onClick={handleCloseClick}><CloseIcon /></button>
            </div>
        </div>
    );
}


// ─── Main Transfer Panel ──────────────────────────────────
function TransferPanel() {
    const {
        sessions: uploadSessions,
        isPanelOpen: isUploadOpen,
        isMinimized,
        toggleMinimize,
        closeAllSessions: closeAllUploads,
        cancelFileUpload,
        cancelSessionUpload,
        retryFile,
        retryFolder,
        getSessionIssues
    } = useUpload();

    const {
        sessions: downloadSessions,
        isPanelOpen: isDownloadOpen,
        closeSession: closeDownloadSession,
        closeAllSessions: closeAllDownloads
    } = useDownload();

    const [confirmTarget, setConfirmTarget] = useState(null);
    const [issuesSessionId, setIssuesSessionId] = useState(null);

    useEffect(() => {
        if (downloadSessions.length > 0 && isMinimized) {
            toggleMinimize()
        }
    }, [downloadSessions.length])

    const isOpen = isUploadOpen || isDownloadOpen;
    if (!isOpen) return (
        <>
            <ConflictModal />
        </>
    );

    const hasActiveUploads = uploadSessions.some(session => {
        if (session.isFolder || session.isLarge) {
            const { total = 0, done = 0, skipped = 0, error = 0, blocked = 0 } = session;
            return (done + skipped + error + blocked) < total;
        }
        return session.files?.some(f => f.status === "uploading" || f.status === "waiting");
    });

    const hasActiveDownloads = downloadSessions.some(s => s.status === "downloading" || s.status === "assembling");

    const handleCloseAll = (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (hasActiveUploads || hasActiveDownloads) {
            setConfirmTarget({ isAll: true });
        } else {
            closeAllUploads();
            closeAllDownloads();
        }
    };

    const handleUploadCancelClick = (target) => setConfirmTarget(target);

    const handleDownloadCancelClick = (session) => {
        if (session.status === "done" || session.status === "error") {
            closeDownloadSession(session.id);
        } else {
            setConfirmTarget({ isDownload: true, session });
        }
    };

    const handleConfirmCancel = async () => {
        if (!confirmTarget) return;
        if (confirmTarget.isAll) {
            await closeAllUploads();
            await closeAllDownloads();
        } else if (confirmTarget.isDownload) {
            closeDownloadSession(confirmTarget.session.id);
        } else if (confirmTarget.isFolder) {
            await cancelSessionUpload(confirmTarget.sessionId);
        } else {
            await cancelFileUpload(confirmTarget.sessionId, confirmTarget.filekey);
        }
        setConfirmTarget(null);
    };

    const getConfirmMessage = () => {
        if (confirmTarget?.isAll) return "Are you sure you want to cancel all transfers?";
        if (confirmTarget?.isDownload) return "Are you sure you want to cancel this download?";
        if (confirmTarget?.isFolder) return "Are you sure you want to cancel this folder upload?";
        return "Are you sure you want to cancel this file upload?";
    };

    return (
        <>
            <ConflictModal />
            <UploadIssuesModal
                show={!!issuesSessionId}
                onClose={() => setIssuesSessionId(null)}
                sessionId={issuesSessionId}
            />
            <ConfirmCancelModal
                show={!!confirmTarget}
                onConfirm={handleConfirmCancel}
                onClose={() => setConfirmTarget(null)}
                message={getConfirmMessage()}
            />

            <div className="upload-file-single-box">
                <div className="upload-file-box">
                    <div className={`upload-file-sub-box ${isMinimized ? "upload-file-sub-box-collapse" : ""}`}>

                        {/* Header */}
                        <div className="upload-file-header">
                            <span className="file-name">Transfers</span>
                            <div className="d-flex align-items-center">
                                <button type="button" className="btn-only-icon" onClick={toggleMinimize}>
                                    {isMinimized ? <ArrowUpIcon /> : <ArrowDownIcon />}
                                </button>
                                <button type="button" className="btn-only-icon" onClick={handleCloseAll}>
                                    <CloseIcon />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        {!isMinimized && (
                            <div className="upload-file-body-wrapper">
                                <div className="upload-file-body">
                                    <CustomScroll className="upload-file-ustom-scroll" showBottomBlur={false}>

                                        {/* Upload sessions */}
                                        {uploadSessions.map(session => {
                                            if (session.isFolder || session.isLarge) {
                                                return (
                                                    <UploadFolderRow
                                                        key={session.id}
                                                        session={session}
                                                        onCancelClick={handleUploadCancelClick}
                                                        onViewIssuesClick={(id) => setIssuesSessionId(id)}
                                                        onRetryFolder={retryFolder}
                                                    />
                                                );
                                            }
                                            return session.files?.map(file => (
                                                <UploadFileRow
                                                    key={file.filekey}
                                                    file={file}
                                                    sessionId={session.id}
                                                    onRetry={() => retryFile(session.id, file.filekey)}
                                                    onCancelClick={handleUploadCancelClick}
                                                />
                                            ));
                                        })}

                                        {/* Download sessions */}
                                        {downloadSessions.map(session => (
                                            <DownloadRow
                                                key={session.id}
                                                session={session}
                                                onCancelClick={handleDownloadCancelClick}
                                            />
                                        ))}

                                    </CustomScroll>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </>
    );
}

export default TransferPanel;

