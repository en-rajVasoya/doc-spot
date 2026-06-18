import Modal from "react-bootstrap/Modal";
import { useState, useRef } from "react";
import { useFileExplorer } from "../../context/FileExplorerContext";
import InteractiveIcon from "../layout/InteractiveIcon";
import Tooltip from "../layout/Tooltip";
import closeIcon from "@images/icon/close-icon.svg"


function DeleteModal({ data, onClose }) {
    const { deleteItemApi, items, currentFolderId, currentFolderMeta } = useFileExplorer()
    // Shake animation
    const [shake, setShake] = useState(false);
    const modalRef = useRef(null);

    //  get item name here 
    const selectedItems = items.filter(i => data.includes(i._id))


    //  here if one item then display name here 
    // if two item then dispaly 2 items will be move  
    // if this action is from the breadcrumb then show here current folder name
    let deleteMessage = `${data.length} items will be moved to trash and deleted forever after 30 days.`;
    if (selectedItems.length === 1) {
        deleteMessage = `"${selectedItems[0].name}" will be moved to trash and deleted forever after 30 days.`;
    } else if (selectedItems.length > 1) {
        deleteMessage = `${selectedItems.length} items will be moved to trash and deleted forever after 30 days.`;
    } else if (data.length === 1 && data[0] === currentFolderId && currentFolderMeta) {
        // Fallback for when deleting the parent breadcrumb folder itself
        deleteMessage = `"${currentFolderMeta.name}" will be moved to trash and deleted forever after 30 days.`;
    }

    const handleOutsideClick = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
            setShake(true);
            setTimeout(() => setShake(false), 400);
        }
    };


    // delete 
    const handleDelete = () => {
        deleteItemApi(data)
        onClose();
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
                        <Modal.Title>Move to trash?</Modal.Title>
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
                        <button className="btn-black btn-lg m-0" onClick={handleDelete}>Ok</button>
                    </Modal.Footer>
                </div>
            </Modal>
        </div>
    )
}

export default DeleteModal