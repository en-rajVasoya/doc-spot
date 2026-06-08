import { Modal } from "react-bootstrap";
import { useRef, useState } from "react";
import InteractiveIcon from "../layout/InteractiveIcon";
import getFileIcon from "../../utils/getFileIcon";
import colorIcon from "@images/icon/color.svg";

function UploadIssuesModal({ data, onClose }) {
    const issues = data || [];
    const [shake, setShake] = useState(false);
    const modalRef = useRef(null);

    const handleOutsideClick = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
            setShake(true);
            setTimeout(() => setShake(false), 400);
        }
    };

    return (
        <div onClick={handleOutsideClick}>
            <Modal
                show={true}
                onHide={onClose}
                backdrop="static"
                keyboard={false}
                centered
                dialogClassName={`modal-dialog-md ${shake ? "shake" : ""}`}
            >
                <div ref={modalRef} className="position-relative">
                    <Modal.Header className="border-0">
                        <Modal.Title>Upload Issues</Modal.Title>
                    </Modal.Header>

                    <Modal.Body className="h-modal-lg p-0">
                        <div className="share-user-container share-user-container-move-box px-4">
                            {issues.length === 0 && (
                                <div className="no-data-found-single-box">
                                    <InteractiveIcon defaultIcon={colorIcon} alt="No issues" />
                                    <p className="text-center text-muted py-3 m-0">
                                        No issues found
                                    </p>
                                </div>
                            )}

                            {issues.map((issue, index) => (
                                <ul className="folder-single-list" key={index}>
                                    <li className="folder-items no-cursor border-0 mb-1">
                                        <div className="d-flex align-items-center w-100 text-start">
                                            {/* File Icon */}
                                            <InteractiveIcon
                                                defaultIcon={getFileIcon(issue.name || issue.path)}
                                                width={28}
                                                height={24}
                                            />
                                            {/* FULL PATH and Error Message */}
                                            <div className="ms-2 ps-1 flex-grow-1 overflow-hidden">
                                                {/* Re-added the full path here */}
                                                <p className="file-name m-0 text-truncate" style={{ fontWeight: '500', fontSize: '13px' }}>
                                                    {issue.path || issue.name}
                                                </p>
                                                <p className="m-0 text-truncate" style={{ fontSize: '12px', color: '#dc3545' }}>
                                                    {issue.message || (issue.status === "blocked" ? "File not allowed" : "Upload failed")}
                                                </p>
                                            </div>
                                            {/* Status Badge */}
                                            <div className="ms-2">
                                                <span 
                                                    className={`badge ${issue.status === 'blocked' ? 'bg-warning text-dark' : 'bg-danger'}`} 
                                                    style={{ fontSize: '10px', textTransform: 'uppercase', padding: '4px 8px', borderRadius: '4px' }}
                                                >
                                                    {issue.status}
                                                </span>
                                            </div>
                                        </div>
                                    </li>
                                </ul>
                            ))}
                        </div>
                    </Modal.Body>

                    <Modal.Footer>
                        <button className="btn-black btn-lg w-100 m-0" onClick={onClose}>
                            Close
                        </button>
                    </Modal.Footer>
                </div>
            </Modal>
        </div>
    );
}

export default UploadIssuesModal;
