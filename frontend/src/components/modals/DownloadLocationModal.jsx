import { Modal } from "react-bootstrap";
import { useState, useRef } from "react";
import InteractiveIcon from "../layout/InteractiveIcon";
import Tooltip from "../layout/Tooltip";
import closeIcon from "@images/icon/close-icon.svg";
import warningIcon from "@images/icon/warning-icon.svg";
import useResponsive from "../../hooks/useResponsive";

function DownloadLocationModal({ show, onConfirm, onClose }) {
    const modalRef = useRef(null);
    const [shake, setShake] = useState(false);
    const { isMobile } = useResponsive();

    if (!show) return null;

    const handleOutsideClick = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
            if (isMobile) {
                onClose();
            } else {
                setShake(true);
                setTimeout(() => setShake(false), 400);
            }
        }
    };

    return (
        <div onClick={handleOutsideClick}>
            <Modal
                show={show}
                backdrop="static"
                keyboard={false}
                centered
                dialogClassName={`modal-dialog-base ${shake ? "shake" : ""}`}
            >
                <div ref={modalRef}>
                    <Modal.Header className="border-0">
                        <Modal.Title>Choose Download Location</Modal.Title>
                        <Tooltip text="Close" offset={8}>
                            <button
                                type="button"
                                className="btn-only-icon"
                                onClick={onClose}
                            >
                                <InteractiveIcon defaultIcon={closeIcon} width={24} alt="close" />
                            </button>
                        </Tooltip>
                    </Modal.Header>

                    <Modal.Body>
                        <p className="m-0 mb-3" style={{ color: "var(--dark-80)", fontSize: "14px", lineHeight: "20px" }}>
                            To support resuming large file downloads, DocSpot needs a separate folder to save your files.
                        </p>

                        <div class="alter-mag-box">
                            
                                <div class="alter-mag-box-icon">
                                    <svg width="20" height="20" viewBox="0 0 28 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M3.69657 25.3794H24.308C26.5851 25.3794 28.0046 23.7451 28.0046 21.6829C28.0046 21.0669 27.844 20.4371 27.5091 19.8617L17.1834 1.87486C16.4863 0.656 15.268 0 14.0091 0C12.7634 0 11.5314 0.656 10.8211 1.87486L0.495429 19.8749C0.17224 20.4227 0.00120445 21.0468 0 21.6829C0 23.7457 1.43314 25.3794 3.69657 25.3794ZM3.72343 23.2766C2.78571 23.2766 2.16914 22.5131 2.16914 21.6829C2.16914 21.4417 2.20971 21.1606 2.344 20.8794L12.656 2.89257C12.9509 2.384 13.4869 2.14286 14.0091 2.14286C14.5314 2.14286 15.04 2.37029 15.3349 2.89257L25.6474 20.8926C25.7811 21.1611 25.848 21.4417 25.848 21.6829C25.848 22.5131 25.2051 23.2771 24.2811 23.2771L3.72343 23.2766ZM14.0091 16.3526C14.652 16.3526 15.0263 15.9777 15.04 15.2811L15.2274 8.22343C15.2411 7.54 14.7051 7.03143 13.9954 7.03143C13.2726 7.03143 12.7634 7.52686 12.7766 8.20971L12.9509 15.2811C12.964 15.9646 13.3394 16.3526 14.0091 16.3526ZM14.0091 20.7051C14.7857 20.7051 15.4549 20.0891 15.4549 19.3126C15.4549 18.5223 14.7989 17.9194 14.0091 17.9194C13.2189 17.9194 12.5623 18.5354 12.5623 19.3126C12.5623 20.076 13.232 20.7051 14.0091 20.7051Z" fill="#FFC70F" />
                                    </svg>
                                </div>
                                <div class="alter-mag-sub">
                                    <div class="title">
                                        Browser Notice:
                                    </div>                                   
                                    
                                    <p className="m-0">
                                        Browsers do not permit direct access to the root <b>Downloads</b> or <b>Desktop</b> folder. Please select or create a subfolder (e.g., <b>DocSpot Downloads</b>).
                                    </p>
                        
                                </div>
                            
                        </div>
                    </Modal.Body>

                    <Modal.Footer className="d-flex align-items-center justify-content-between border-0">
                        <button
                            type="button"
                            className="btn-secondary btn-lg m-0"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn-black btn-lg m-0"
                            onClick={onConfirm}
                        >
                            Continue
                        </button>
                    </Modal.Footer>
                </div>
            </Modal>
        </div>
    );
}

export default DownloadLocationModal;
