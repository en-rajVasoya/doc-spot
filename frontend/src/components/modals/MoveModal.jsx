import { Modal } from "react-bootstrap";
import { useState, useRef, useEffect, useCallback } from "react";
import { useFileExplorer } from "../../context/FileExplorerContext";
import axiosApi from "../../utils/api.js";
import InteractiveIcon from "../layout/InteractiveIcon";
import Breadcrumbs from "../features/Breadcrumbs";
import { Form } from "react-bootstrap";
import getFolderIcon from "../../utils/getFolderIconColor.js";
import noFilesFound from "@images/icon/no-files-found.svg";
import { useNotification } from "../../context/NotificationContext.jsx";
import arrowRightIcon from "@images/icon/arrow-right.svg";
import addFileIcon from "@images/icon/plus.svg";
import CustomScroll from "../layout/CustomScroll.jsx";

function MoveModal({ data, onClose }) {
    const { moveItemApi, currentFolderId, refetch } = useFileExplorer();
    const { showNotification } = useNotification()

    const [shake, setShake] = useState(false);
    const modalRef = useRef(null);
    const lastClick = useRef({});

    const [trail, setTrail] = useState([]);
    const [folders, setFolders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedDestination, setSelectedDestination] = useState(null);

    const [folderCreated, setFolderCreated] = useState(false);
    const [newFolderMode, setNewFolderMode] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");

    const browseFolderId = trail.length ? trail[trail.length - 1].id : null;

    const handleOutsideClick = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
            setShake(true);
            setTimeout(() => setShake(false), 400);
        }
    };

    const fetchFolders = useCallback(async () => {
        setLoading(true);
        try {
            const { data: res } = await axiosApi.get("/file/get-files", {
                params: { parent: browseFolderId ?? "null" }
            });
            setFolders(res.items.filter(item => item.type === "folder"));
        } catch (err) {
            console.log(err.message);
        } finally {
            setLoading(false);
        }
    }, [browseFolderId]);

    useEffect(() => {
        fetchFolders();

        if (browseFolderId === null) {
            setSelectedDestination(currentFolderId === null ? undefined : null);
        } else {
            setSelectedDestination(browseFolderId);
        }
    }, [fetchFolders, browseFolderId]);

    const handleFolderClick = (folder) => {
        if (data.includes(folder._id)) return;

        const now = Date.now();

        if (lastClick.current[folder._id] && now - lastClick.current[folder._id] < 400) {
            setTrail(prev => [...prev, { id: folder._id, name: folder.name }]);
        } else {
            if (folder._id !== currentFolderId) {
                setSelectedDestination(folder._id);
            }
        }

        lastClick.current[folder._id] = now;
    };

    const handleNavigate = (depth) => {
        setTrail(prev => prev.slice(0, depth));
    };

    const handleClose = () => {
        if (folderCreated) refetch();
        onClose();
    };

    const handleMove = async (destinationId) => {
        const destination = destinationId ?? selectedDestination ?? null
        let allSuccess = true
        for (const itemId of data) {
            try {
                await moveItemApi(itemId, destination, true)
            } catch (error) {
                allSuccess = false
                showNotification(error.response?.data?.message || "Access denied", "error", "bottom-center")
                break
            }
        }
        if (allSuccess) {
            const message = data.length > 1 ? "Items moved successfully" : "Item moved successfully"
            showNotification(message, "success", "bottom-center")
        }
        handleClose()
    }

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;

        try {
            await axiosApi.post("/file/create-folder", {
                name: newFolderName.trim(),
                parentId: browseFolderId || null
            });

            setNewFolderName("");
            setNewFolderMode(false);
            setFolderCreated(true);
            fetchFolders();
        } catch (err) {
            console.log(err.message);
        }
    };

    return (
        <div onClick={handleOutsideClick}>
            <Modal
                show={true}
                backdrop="static"
                keyboard={false}
                centered
                dialogClassName={`modal-dialog-md ${shake ? "shake" : ""}`}
                className="move-modal"
            >
                <div ref={modalRef} className="position-relative">

                    <Modal.Header className="border-0">
                        <Modal.Title>Move to</Modal.Title>
                    </Modal.Header>

                    {/* Breadcrumb */}
                    <div className="header pb-0 border-bottom">
                        <div className="header-view">
                            <Breadcrumbs
                                trail={trail}
                                onNavigate={handleNavigate}
                                onHomeClick={() => setTrail([])}
                                maxVisible={3}
                                rootLabel="Home"
                                actions={["newFolder"]}
                                onNewFolder={() => setNewFolderMode(true)}
                            />
                        </div>
                    </div>

                    <Modal.Body className="h-modal-lg p-0">
                        <CustomScroll className="move-modal-body" showBottomBlur={false} showTopBlur={false}>


                            {/* Folder List */}
                            <div className="share-user-container share-user-container-move-box">
                                {loading && <p className="text-center py-3">Loading...</p>}

                                {!loading && folders.length === 0 && (
                                    <div className="no-data-found-single-box">
                                        <InteractiveIcon defaultIcon={noFilesFound} alt="No folders" />
                                        <p className="text-center text-muted py-3 m-0">
                                            No folders here
                                        </p>
                                    </div>
                                )}

                                {!loading && folders.map(folder => {
                                    const isBeingMoved = data.includes(folder._id);
                                    const isSelected = selectedDestination === folder._id;
                                    const isCurrentDestination = folder._id === currentFolderId;

                                    return (
                                        <ul className="folder-single-list" key={folder._id}>
                                            <li
                                                className={`folder-items
                                                ${isBeingMoved ? "opacity-50" : "cursor-pointer"}
                                                ${isSelected ? "selected" : ""}
                                            `}
                                                onClick={() => handleFolderClick(folder)}
                                            >
                                                <div className="d-flex align-items-center">
                                                    <InteractiveIcon
                                                        defaultIcon={getFolderIcon(folder.color, "list", folder.isShared)}
                                                        width={28}
                                                        height={24}
                                                    />
                                                    <div className="ms-2 ps-1">
                                                        <p className="file-name m-0">{folder.name}</p>
                                                    </div>
                                                </div>
                                                {/* {isCurrentDestination && (
                                                <span className="text-muted">Current</span>
                                            )} */}
                                                <div className="move-btn-group">
                                                    <button className="btn move-btn m-0"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleMove(folder._id)
                                                        }}>
                                                        Move
                                                    </button>
                                                    <button className="btn-only-icon"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setTrail(prev => [...prev, { id: folder._id, name: folder.name }])
                                                        }}>
                                                        <InteractiveIcon
                                                            defaultIcon={arrowRightIcon}
                                                            width={20}
                                                            height={20}
                                                        />
                                                    </button>
                                                </div>
                                            </li>
                                        </ul>
                                    );
                                })}
                            </div>
                        </CustomScroll>
                    </Modal.Body>

                    {/* FIXED FOOTER */}
                    <Modal.Footer>
                        <button className="modal-add-new-btn">
                            <InteractiveIcon defaultIcon={addFileIcon} width={24} alt="add" />
                            New Folder
                        </button>
                        <div className="modal-footer-btn-group">
                            <button className="btn-secondary btn-lg m-0" onClick={handleClose}>
                                Cancel
                            </button>

                            <button className="btn-black btn-lg m-0" onClick={() => handleMove()} disabled={browseFolderId === currentFolderId}>
                                Move
                            </button>
                        </div>
                    </Modal.Footer>

                    {/* NEW FOLDER */}
                    <div className={`create-new-file-in-modal ${newFolderMode ? "show" : ""}`}>
                        <div className="create-new-file-in-modal-wrapper">
                            <Form.Group controlId="formName" className="mb-4">
                                <Form.Label>New Folder</Form.Label>
                                <Form.Control
                                    type="text"
                                    className="custom-form-control form-control mb-2"
                                    placeholder="Folder name"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                                />
                            </Form.Group>
                            <div className="d-flex justify-content-between">


                                <button
                                    className="btn-secondary btn-lg m-0"
                                    onClick={() => {
                                        setNewFolderMode(false);
                                        setNewFolderName("");
                                    }}
                                >
                                    Cancel
                                </button>

                                <button
                                    className="btn-black btn-lg m-0"
                                    onClick={handleCreateFolder}
                                >
                                    Create
                                </button>

                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default MoveModal;