import Modal from "react-bootstrap/Modal";
import { useState, useRef } from "react";
import { useAdmin } from "../../context/AdminContext";
import InteractiveIcon from "../layout/InteractiveIcon";
import Tooltip from "../layout/Tooltip";
import closeIcon from "@images/icon/close-icon.svg"
import useResponsive from "../../hooks/useResponsive";

function DeleteUserModal({ data, onClose }) {
    const { deleteUsers, users } = useAdmin();
    // Shake animation
    const [shake, setShake] = useState(false);
    const modalRef = useRef(null);

    const { isMobile } = useResponsive();

    // Get selected users from the context list
    const selectedUsers = users.filter(u => data.includes(u._id));

    let deleteMessage = `${selectedUsers.length} users, along with all their uploaded files and folders, will be permanently deleted. This action cannot be undone.`;

    if (selectedUsers.length === 1) {
        deleteMessage = `Are you sure you want to permanently delete "${selectedUsers[0].name}"? All files and folders they uploaded will also be permanently deleted. This action cannot be undone.`;
    }
    const handleOutsideClick = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
            if (isMobile) {
                onClose()
            } else {
                setShake(true);
                setTimeout(() => setShake(false), 400);
            }

        }
    };

    const handleDelete = async () => {
        try {
            await deleteUsers(data);
            onClose();
        } catch (error) {
            onClose();
        }
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
                        <Modal.Title>Delete User</Modal.Title>
                        <Tooltip text="Close" offset={8}>
                            <button
                                className="btn-only-icon"
                                onClick={onClose}
                            >
                                <InteractiveIcon defaultIcon={closeIcon} width={24} alt="close" />
                            </button>
                        </Tooltip>
                    </Modal.Header>
                    <Modal.Body>
                        <p className="m-0 message-delete-modal">
                            {deleteMessage}
                        </p>
                    </Modal.Body>
                    <Modal.Footer className="d-flex align-items-center justify-content-between border-0">
                        <button className="btn-secondary btn-lg m-0" onClick={onClose}>Cancel</button>
                        <button className="btn-black btn-lg m-0" onClick={handleDelete}>Delete</button>
                    </Modal.Footer>
                </div>
            </Modal>
        </div>
    )
}

export default DeleteUserModal;
