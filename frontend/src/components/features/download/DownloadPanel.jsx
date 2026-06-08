// import { useDownload } from "../../../context/DownloadContext";
// import Tooltip from "../../layout/Tooltip";
// import InteractiveIcon from "../../layout/InteractiveIcon";
// import closeIcon from "@images/icon/close-icon.svg";
// import doneIcon from "@images/icon/done-icon.svg";
// import errorIcon from "@images/icon/error-icon.svg";
// import arrowDown from "@images/icon/arrow-down.svg"
// import arrowUp from "@images/icon/arrow-up.svg"
// import fileIcon from "@images/svgs/file.svg";
// import { useState, useRef } from "react";
// import { Modal } from "react-bootstrap";
// import CustomScroll from "../../layout/CustomScroll";
// import getFileIcon from "../../../utils/getFileIcon";


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
//             <Modal show={show} backdrop="static" keyboard={false} centered>
//                 <div ref={modalRef}>
//                     <Modal.Header className="border-0">
//                         <Modal.Title>Cancel Download</Modal.Title>
//                     </Modal.Header>
//                     <Modal.Body>
//                         {isAll
//                             ? "Are you sure you want to cancel all downloads? All saved data will be deleted."
//                             : isFolder
//                                 ? "Are you sure you want to cancel this folder download?"
//                                 : "Are you sure you want to cancel this file download? All saved data will be deleted."
//                         }
//                     </Modal.Body>
//                     <Modal.Footer className="d-flex align-items-center justify-content-between border-0">
//                         <button type="button" className="btn-secondary btn-lg m-0" onClick={onClose}>No, keep it</button>
//                         <button type="button" className="btn-black btn-lg m-0" onClick={onConfirm}>Yes, cancel</button>
//                     </Modal.Footer>
//                 </div>
//             </Modal>
//         </div>
//     )
// }


// /* Progress Circle */
// function ProgressCircle({ percent = 0 }) {
//     const radius = 13;
//     const stroke = 2.5;
//     const normalizedRadius = radius - stroke;
//     const circumference = normalizedRadius * 2 * Math.PI;
//     const strokeDashoffset = circumference - (percent / 100) * circumference;

//     return (
//         <svg height={radius * 2} width={radius * 2} style={{ transform: "rotate(-90deg)" }}>
//             <circle stroke="#BEBEC7" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} />
//             <circle
//                 stroke="#398415" fill="transparent" strokeWidth={stroke}
//                 strokeDasharray={`${circumference} ${circumference}`}
//                 style={{ strokeDashoffset }}
//                 strokeLinecap="round" r={normalizedRadius} cx={radius} cy={radius}
//             />
//         </svg>
//     );
// }

// const CloseIcon = () => <InteractiveIcon defaultIcon={closeIcon} width={24} />;
// const DoneIcon = () => <InteractiveIcon defaultIcon={doneIcon} width={24} />;
// const ErrorIcon = () => <InteractiveIcon defaultIcon={errorIcon} width={24} />;
// const ArrowDownIcon = () => <InteractiveIcon defaultIcon={arrowDown} width={24} />;
// const ArrowUpIcon = () => <InteractiveIcon defaultIcon={arrowUp} width={24} />;


// /* Row */
// function DownloadRow({ session, onCancel }) {
//     const { status, name, progress = 0, speed } = session;

//     const isDownloading = status === "downloading";
//     const isCreating = status === "creating";
//     const isDone = status === "done";
//     const isError = status === "error";
//     const isAssembling = status === "assembling";

//     const formatSpeed = (mbps) => {
//         if (!mbps) return null;
//         return mbps > 1 ? `${mbps.toFixed(1)} MB/s` : null;
//     };

//     return (
//         <div className="upload-file-item">
//             <div className="upload-file-item-content">
//                 <div className="upload-file-icon">
//                     <InteractiveIcon defaultIcon={getFileIcon(name)} />
//                 </div>
//                 <div className="d-flex align-items-center">
//                     <div className="upload-file-name">{name}</div>
//                     {isCreating && <div className="upload-file-count">Creating zip...</div>}
//                     {(isDownloading || isAssembling) && (
//                         <div className="upload-file-count mute-text">
//                             {isAssembling ? "Saving... " : `${progress}%`}
//                             {speed && !isAssembling && (
//                                 <span className="mute-text">· {formatSpeed(speed)}</span>
//                             )}
//                         </div>
//                     )}
//                 </div>
//             </div>
//             <div className="upload-right-side">
//                 {isDownloading && <ProgressCircle percent={progress} />}
//                 {(isDone || isAssembling) && <Tooltip text="Downloaded"><span><DoneIcon /></span></Tooltip>}
//                 {isError && <Tooltip text="Failed"><span><ErrorIcon /></span></Tooltip>}
//                 <button className="btn-only-icon" onClick={() => onCancel(session)}><CloseIcon /></button>
//             </div>
//         </div>
//     );
// }


// /* Panel */
// function DownloadPanel() {
//     const {
//         sessions,
//         isPanelOpen,
//         isMinimized,
//         toggleMinimized,
//         closeSession,
//         closeAllSessions
//     } = useDownload();

//     const [cancelModal, setCancelModal] = useState({ show: false, session: null, isAll: false });

//     if (!isPanelOpen) return null;

//     const handleCancelClick = (session) => {
//         if (session.status === "done" || session.status === "error") {
//             closeSession(session.id);
//         } else {
//             setCancelModal({ show: true, session, isAll: false });
//         }
//     };

//     const handleCancelAllClick = () => {
//         const hasActive = sessions.some(s => s.status === "downloading" || s.status === "assembling");
//         if (hasActive) {
//             setCancelModal({ show: true, session: null, isAll: true });
//         } else {
//             closeAllSessions();
//         }
//     };

//     const confirmCancel = () => {
//         if (cancelModal.isAll) {
//             closeAllSessions();
//         } else if (cancelModal.session) {
//             closeSession(cancelModal.session.id);
//         }
//         setCancelModal({ show: false, session: null, isAll: false });
//     };

//     return (
//         <div className="download-panel-box">
//             <div className="upload-file-box">
//                 <div className="upload-file-sub-box">

//                     <div className="upload-file-header">
//                         <span className="file-name">Downloads</span>
//                         <div className="d-flex align-items-center">
//                             <button className="btn-only-icon" onClick={toggleMinimized}>
//                                 {isMinimized ? <ArrowUpIcon /> : <ArrowDownIcon />}
//                             </button>
//                             <button className="btn-only-icon" onClick={handleCancelAllClick}>
//                                 <CloseIcon />
//                             </button>
//                         </div>
//                     </div>

//                     {!isMinimized && (
//                         <div className="upload-file-body-wrapper">
//                             <div className="upload-file-body">
//                                 <CustomScroll className="upload-file-ustom-scroll" showBottomBlur={false}>
//                                     {sessions.map(session => (
//                                         <DownloadRow
//                                             key={session.id}
//                                             session={session}
//                                             onCancel={handleCancelClick}
//                                         />
//                                     ))}
//                                 </CustomScroll>
//                             </div>
//                         </div>
//                     )}

//                 </div>
//             </div>

//             <ConfirmCancelModal
//                 show={cancelModal.show}
//                 isAll={cancelModal.isAll}
//                 isFolder={cancelModal.session?.isFolder}
//                 onConfirm={confirmCancel}
//                 onClose={() => setCancelModal({ show: false, session: null, isAll: false })}
//             />
//         </div>
//     );
// }

// export default DownloadPanel;





import { useDownload } from "../../../context/DownloadContext";
import Tooltip from "../../layout/Tooltip";
import InteractiveIcon from "../../layout/InteractiveIcon";
import closeIcon from "@images/icon/close-icon.svg";
import doneIcon from "@images/icon/done-icon.svg";
import errorIcon from "@images/icon/error-icon.svg";
import arrowDown from "@images/icon/arrow-down.svg"
import arrowUp from "@images/icon/arrow-up.svg"

import { useState, useRef, useEffect } from "react";
import { Modal } from "react-bootstrap";
import CustomScroll from "../../layout/CustomScroll";
import getFileIcon from "../../../utils/getFileIcon";


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
                        <Modal.Title>Cancel Download</Modal.Title>
                    </Modal.Header>

                    <Modal.Body>
                        {isAll
                            ? "Are you sure you want to cancel all downloads? All saved data will be deleted."
                            : isFolder
                                ? "Are you sure you want to cancel this folder download?"
                                : "Are you sure you want to cancel this file download? All saved data will be deleted."
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


/* Progress Circle */
function ProgressCircle({ percent = 0 }) {
    const radius = 13;
    const stroke = 2.5;
    const normalizedRadius = radius - stroke;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percent / 100) * circumference;

    return (
        <svg height={radius * 2} width={radius * 2} style={{ transform: "rotate(-90deg)" }}>
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
                style={{ strokeDashoffset }}
                strokeLinecap="round"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
            />
        </svg>
    );
}

const CloseIcon = () => <InteractiveIcon defaultIcon={closeIcon} width={24} />;
const DoneIcon = () => <InteractiveIcon defaultIcon={doneIcon} width={24} />;
const ErrorIcon = () => <InteractiveIcon defaultIcon={errorIcon} width={24} />;
const ArrowDownIcon = () => <InteractiveIcon defaultIcon={arrowDown} width={24} />;
const ArrowUpIcon = () => <InteractiveIcon defaultIcon={arrowUp} width={24} />;


/* Row */
function DownloadRow({ session, onCancel }) {
    const {
        fileId,
        name,
        status,
        progress = 0,
        speed,
        isFolder
    } = session;

    const isDownloading = status === "downloading";
    const isCreating = status === "creating"
    const isDone = status === "done";
    const isError = status === "error";
    const isAssembling = status === "assembling";

    const formatSpeed = (mbps) => {
        if (!mbps) return null;
        return mbps > 1 ? `${mbps.toFixed(1)} MB/s` : null;
    };

    return (
        <div className="upload-file-item">
            <div className="upload-file-item-content">
                <div className="upload-file-icon">
                    <InteractiveIcon defaultIcon={getFileIcon(name)} />
                </div>

                <div className="d-flex align-items-center">
                    <div className="upload-file-name">{name}</div>
                    {(isCreating) && (
                        <div className="upload-file-count">
                            Creating zip...
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
                {(isDownloading || isAssembling) && <ProgressCircle percent={progress} />}

                {isDone && (
                    <Tooltip text="Downloaded">
                        <span><DoneIcon /></span>
                    </Tooltip>
                )}

                {isError && (
                    <Tooltip text="Failed">
                        <span><ErrorIcon /></span>
                    </Tooltip>
                )}
                {!isDone && (
                    <Tooltip text="Close">
                        <button className="btn-only-icon" onClick={() => onCancel(session)}>
                            <CloseIcon />
                        </button>
                    </Tooltip>
                )}
            </div>
        </div>
    );
}


/* Panel */
function DownloadPanel() {
    const {
        sessions,
        isPanelOpen,
        isMinimized,
        toggleMinimized,
        closeSession,
        closeAllSessions
    } = useDownload();

    const [cancelModal, setCancelModal] = useState({ show: false, session: null, isAll: false });


    //  this use efect will close the download panel auto  after 4 second after all dwonload is completed
    useEffect(() => {
        if (!sessions.length) return

        const allDone = sessions.every(s => s.status === "done")
        if (!allDone) return

        const timer = setTimeout(() => {
            closeAllSessions()
        }, 5000)

        return () => clearTimeout(timer)
    }, [sessions, closeAllSessions])


    if (!isPanelOpen) return null;

    const handleCancelClick = (session) => {
        // If download is already done or errored, just close without modal
        if (session.status === "done" || session.status === "error") {
            closeSession(session.id);
        } else {
            setCancelModal({ show: true, session, isAll: false });
        }
    };

    const handleCancelAllClick = () => {
        // Only show modal if there are active downloads
        const hasActive = sessions.some(s => s.status === "downloading" || s.status === "assembling");
        if (hasActive) {
            setCancelModal({ show: true, session: null, isAll: true });
        } else {
            closeAllSessions();
        }
    };

    const confirmCancel = () => {
        if (cancelModal.isAll) {
            closeAllSessions();
        } else if (cancelModal.session) {
            closeSession(cancelModal.session.id);
        }
        setCancelModal({ show: false, session: null, isAll: false });
    };

    return (
        <div className="download-panel-box">
            <div className="upload-file-box">
                <div className="upload-file-sub-box">

                    {/* Header */}
                    <div className="upload-file-header">
                        <span>Downloads</span>
                        <div className="upload-right-side">
                            <Tooltip text={isMinimized ? "Maximize" : "Minimize"}>
                                <button className="btn-only-icon" onClick={toggleMinimized}>
                                    {isMinimized ? <ArrowUpIcon /> : <ArrowDownIcon />}
                                </button>
                            </Tooltip>
                            <Tooltip text="Close">
                                <button className="btn-only-icon" onClick={handleCancelAllClick}>
                                    <CloseIcon />
                                </button>
                            </Tooltip>
                        </div>
                    </div>

                    {/* Body */}
                    {!isMinimized && (
                        <div className="upload-file-body-wrapper">
                            <div className="upload-file-body">
                                <CustomScroll className="upload-file-ustom-scroll" showBottomBlur={false} showTopBlur={false}>
                                    {sessions.map(session => (
                                        <DownloadRow
                                            key={session.fileId}
                                            session={session}
                                            onCancel={handleCancelClick}
                                        />
                                    ))}
                                </CustomScroll>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            <ConfirmCancelModal
                show={cancelModal.show}
                isAll={cancelModal.isAll}
                isFolder={cancelModal.session?.isFolder}
                onConfirm={confirmCancel}
                onClose={() => setCancelModal({ show: false, session: null, isAll: false })}
            />
        </div>
    );
}

export default DownloadPanel;