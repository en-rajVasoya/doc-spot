import Modal from "react-bootstrap/Modal";
import { useState, useRef } from "react";
import { useFileExplorer } from "../../context/FileExplorerContext";


function DeleteModal({ data, onClose }) {
    const { deleteItemApi, items } = useFileExplorer()
    // Shake animation
    const [shake, setShake] = useState(false);
    const modalRef = useRef(null);

    //  get item name here 
    const selectedItems = items.filter(i => data.includes(i._id))

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
                    </Modal.Header>
                    <Modal.Body>
                        {selectedItems.length === 1 ? (
                            <p className="m-0 message">
                                "{selectedItems[0].name}" will be moved to trash and deleted forever after 30 days.
                            </p>
                        ) : (
                            <p className="m-0 message">
                                {selectedItems.length} items will be moved to trash and deleted forever after 30 days.
                            </p>
                        )}
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