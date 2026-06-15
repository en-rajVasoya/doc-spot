import { Modal, InputGroup, Form } from "react-bootstrap";
import { useState, useRef } from "react";
import { useFileExplorer } from "../../context/FileExplorerContext";
import InteractiveIcon from "../layout/InteractiveIcon";
import closeIcon from "@images/icon/close-icon.svg"

function RenameModal({ data, onClose }) {

    // Shake animation
    console.log("data i s", data)

    const [shake, setShake] = useState(false);
    const modalRef = useRef(null);

    const [newName, setNewName] = useState(data?.name || "");

    const { renameItemApi } = useFileExplorer();

    const handleOutsideClick = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
            setShake(true);
            setTimeout(() => setShake(false), 400);
        }
    };

    const handleSubmit = () => {
        if (!newName.trim()) return;

        renameItemApi(data._id, newName);
        onClose();
    };

    return (
        <div onClick={handleOutsideClick}>
            <Modal
                show={true}
                backdrop="static"
                keyboard={false}
                centered
                dialogClassName={`modal-dialog-base ${shake ? 'shake' : ''}`}
            >
                <div ref={modalRef}>
                    <Modal.Header className="border-0">
                        <Modal.Title>Rename</Modal.Title>
                        <button
                            className="btn-only-icon"
                            onClick={onClose}
                        >
                            <InteractiveIcon defaultIcon={closeIcon} width={24} alt="close" />
                        </button>
                    </Modal.Header>

                    <Modal.Body>
                        <InputGroup className="mb-3">
                            <Form.Control
                                type="text"
                                placeholder="Folder name"
                                className="custom-form-control h-38"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleSubmit();
                                    }
                                }}
                            />
                        </InputGroup>
                    </Modal.Body>

                    <Modal.Footer className="d-flex align-items-center justify-content-between border-0">
                        <button className="btn-secondary btn-lg m-0" onClick={onClose}>
                            Cancel
                        </button>

                        {/* connect submit */}
                        <button className="btn-black btn-lg m-0" onClick={handleSubmit}>
                            Ok
                        </button>
                    </Modal.Footer>
                </div>
            </Modal>
        </div>
    );
}

export default RenameModal;