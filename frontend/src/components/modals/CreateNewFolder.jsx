import { Modal, InputGroup, Form } from "react-bootstrap";
import { useState, useRef } from "react";
import { useFileExplorer } from "../../context/FileExplorerContext";
import { useEffect } from "react";
import InteractiveIcon from "../layout/InteractiveIcon";
import closeIcon from "@images/icon/close-icon.svg"

function CreateNewFolder({ onClose }) {
    const [name, setName] = useState("Untitled Folder");
    const [shake, setShake] = useState(false);
    const modalRef = useRef(null);
    const inputRef = useRef(null)

    const { createFolderApi } = useFileExplorer();

    //  here untitle folder will auto select when user opens modal 
    useEffect(() => {
        setTimeout(() => {
            // inputRef.current?.focus()
            inputRef.current?.select()
        }, 0)
    }, [])

    const handleOutsideClick = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
            setShake(true);
            setTimeout(() => setShake(false), 400);
        }
    };

    //  when handle submit here
    const handleSubmit = async () => {
        if (!name.trim()) {
            setShake(true)
            setTimeout(() => setShake(false), 400)
            return;
        }
        await createFolderApi(name.trim())
        onClose()
    }

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
                        <Modal.Title>New Folder</Modal.Title>
                        <button
                            className="btn-only-icon"
                            onClick={onClose}
                        >
                            <InteractiveIcon defaultIcon={closeIcon} width={24} alt="close" />
                        </button>
                    </Modal.Header>

                    <Modal.Body>
                        <InputGroup className="m-0">
                            <Form.Control
                                ref={inputRef}
                                type="text"
                                placeholder="Enter folder name"
                                className="custom-form-control"
                                value={name}
                                autoFocus
                                onChange={(e) => setName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleSubmit();
                                    }
                                }}
                            />
                        </InputGroup>
                    </Modal.Body>

                    <Modal.Footer className="d-flex align-items-center justify-content-between border-0">
                        <button
                            className="btn-secondary btn-lg m-0"
                            onClick={onClose}
                        >
                            Cancel
                        </button>

                        <button
                            className="btn-black btn-lg m-0"
                            onClick={handleSubmit}
                        >
                            Create
                        </button>
                    </Modal.Footer>
                </div>
            </Modal>
        </div>
    )
}

export default CreateNewFolder