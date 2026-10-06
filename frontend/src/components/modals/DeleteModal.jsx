import Modal from "react-bootstrap/Modal";
import { useState, useRef } from "react";
import { useFileExplorer } from "../../context/FileExplorerContext";
import { useAuth } from "../../context/AuthContext.jsx";
import InteractiveIcon from "../layout/InteractiveIcon";
import Tooltip from "../layout/Tooltip";
import closeIcon from "@images/icon/close-icon.svg"
import useResponsive from "../../hooks/useResponsive";

function DeleteModal({ data, onClose }) {
    const { deleteItemApi, items, currentFolderId, currentFolderMeta } = useFileExplorer();
    const { user } = useAuth();
    // Shake animation
    const [shake, setShake] = useState(false);
    const modalRef = useRef(null);
    const { isMobile } = useResponsive();

    // Get selected items from explorer list
    const selectedItems = items.filter(i => data.includes(i._id));

    // Split items into owned by current user vs owned by other collaborators
    const ownItems = selectedItems.filter(item => {
        const itemOwnerId = (item.owner?._id || item.owner)?.toString();
        return !itemOwnerId || itemOwnerId === user?._id?.toString();
    });
    const foreignItems = selectedItems.filter(item => {
        const itemOwnerId = (item.owner?._id || item.owner)?.toString();
        return itemOwnerId && itemOwnerId !== user?._id?.toString();
    });

    const isAllForeign = foreignItems.length > 0 && ownItems.length === 0;
    const isMixed = foreignItems.length > 0 && ownItems.length > 0;

    let modalTitle = "Move to trash?";
    let deleteMessage = `${data.length} items will be moved to trash and deleted forever after 30 days.`;

    if (isAllForeign) {
        const isAtRoot = !currentFolderId;
        const singleItem = foreignItems[0];
        const isFolder = singleItem?.type === "folder";

        // Dynamic Title: "Remove shared folder?" or "Remove shared file?"
        modalTitle = isAtRoot
            ? (isFolder ? "Remove shared folder?" : "Remove shared file?")
            : "Remove from shared folder?";

        if (foreignItems.length === 1) {
            if (isAtRoot) {
                deleteMessage = isFolder
                    ? `"${singleItem.name}" will be removed from your Docspot. You will lose access to this folder, and any files you uploaded inside will be returned to your root drive.`
                    : `"${singleItem.name}" will be removed from your Docspot. You will lose access to this file.`;
            } else {
                deleteMessage = `"${singleItem.name}" will be removed from this shared folder.`;
            }
        } else {
            deleteMessage = isAtRoot
                ? `${foreignItems.length} shared items will be removed from your Docspot.`
                : `${foreignItems.length} items will be removed from this shared folder.`;
        }
    } else if (isMixed) {
        modalTitle = "Remove & move to trash?";
        deleteMessage = `${ownItems.length} item(s) will be moved to your trash. ${foreignItems.length} shared item(s) will be removed and returned to their owners' root directory.`;

    } else {
        // All items owned by current user (or breadcrumb folder delete fallback)
        if (selectedItems.length === 1) {
            deleteMessage = `"${selectedItems[0].name}" will be moved to trash and deleted forever after 30 days.`;
        } else if (selectedItems.length > 1) {
            deleteMessage = `${selectedItems.length} items will be moved to trash and deleted forever after 30 days.`;
        } else if (data.length === 1 && data[0] === currentFolderId && currentFolderMeta) {
            const folderOwnerId = (currentFolderMeta.owner?._id || currentFolderMeta.owner)?.toString();
            const isFolderForeign = folderOwnerId && folderOwnerId !== user?._id?.toString();
            if (isFolderForeign) {
                modalTitle = "Remove from shared folder?";
                deleteMessage = `"${currentFolderMeta.name}" will be removed from this shared folder.`;
            } else {
                deleteMessage = `"${currentFolderMeta.name}" will be moved to trash and deleted forever after 30 days.`;
            }
        }
    }

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

    // Delete / Remove action
    const handleDelete = () => {
        // No toast notification when removing foreign shared items; "Moved to trash" for own files
        const toastMsg = isAllForeign ? null : "Moved to trash";
        deleteItemApi(data, toastMsg);
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
                        <Modal.Title>{modalTitle}</Modal.Title>
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
                        <button className="btn-black btn-lg m-0" onClick={handleDelete}>
                            {isAllForeign ? "Remove" : "Ok"}
                        </button>
                    </Modal.Footer>
                </div>
            </Modal>
        </div>
    );
}

export default DeleteModal