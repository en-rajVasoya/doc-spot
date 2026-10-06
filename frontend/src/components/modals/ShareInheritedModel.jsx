import { useState } from "react";
import Modal from "react-bootstrap/Modal";
import Tooltip from "../layout/Tooltip";
import InteractiveIcon from "../layout/InteractiveIcon";
import closeIcon from "@images/icon/close-icon.svg";
import { useFileExplorer } from "../../context/FileExplorerContext";

function ShareInheritedModel({ data, onClose }) {
    const { user, newPermission, folderId, folderName, itemIdsToUpdate } = data;
    const { shareItemApi, unshareItemApi, loadSharedUsers, sharedUsersData } = useFileExplorer();
    const [loading, setLoading] = useState(false);
    console.log("12 -->", data);

    const handleConfirm = async () => {
        setLoading(true)

        try {
            const targetUserId = user.userId?._id || user.userId || user._id;

            if (newPermission === "remove") {
                // Unshare automatically wipes children in the backend
                await unshareItemApi(itemIdsToUpdate || [folderId], [targetUserId]);
            } else {
                // Pass true to wipe children overrides!
                await shareItemApi(itemIdsToUpdate || [folderId], [targetUserId], newPermission, true);
            }

            // refresh the background ShareUserModal
            if (sharedUsersData.itemId) {
                await loadSharedUsers(sharedUsersData.itemId)
            }

            onClose()
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal show={true} centered backdrop="static" dialogClassName="modal-dialog-base">
            <div>
                <Modal.Header className="border-0">
                    <Modal.Title>{newPermission === "remove" ? "Remove access to folder" : "Update access to folder"}</Modal.Title>
                    <Tooltip text="Close" offset={8}>
                        <button className="btn-only-icon" onClick={onClose} disabled={loading}>
                            <InteractiveIcon defaultIcon={closeIcon} width={24} alt="close" />
                        </button>
                    </Tooltip>
                </Modal.Header>
                <Modal.Body>
                    <p className="m-0 message-delete-modal mb-2">
                        <strong>{user.name}</strong> has access through the folder <strong>"{folderName || "folder"}"</strong>.
                    </p>
                    <p className="m-0 text-muted small">
                        {newPermission === "remove"
                            ? `Removing access here will also remove ${user.name} from "${folderName || "folder"}" and everything inside it.`
                            : `Changing permission to ${newPermission} will update their access on "${folderName || "folder"}" and all items inside it..`
                        }
                    </p>
                </Modal.Body>
                <Modal.Footer className="d-flex align-items-center justify-content-between border-0">
                    <button className="btn-secondary btn-lg m-0" onClick={onClose} disabled={loading}>
                        Cancel
                    </button>
                    <button className="btn-black btn-lg m-0" onClick={handleConfirm} disabled={loading}>
                        {loading ? "Updating..." : "Update"}
                    </button>
                </Modal.Footer>
            </div>
        </Modal>
    );
}

export default ShareInheritedModel;
