
import { useEffect, useState, useRef } from "react";
import InteractiveIcon from "../layout/InteractiveIcon";
import deleteIcon from "@images/icon/trash.svg";
import folderPlusIcon from "@images/icon/folder-plus.svg";
import folderUploadIcon from "@images/icon/folder-upload.svg";
import addFileIcon from "@images/icon/file-plus.svg";
import plusIcon from "@images/icon/plus.svg";
import Tooltip from "../layout/Tooltip";

//  upload auth
import { useUpload } from "../../context/UploadContext";
import { useFileExplorer } from "../../context/FileExplorerContext";
import { useNavigate, useLocation } from "react-router-dom";
import homeIcon from "@images/icon/home-icon.svg";
import { useSearch } from "../../context/SearchContext";

function GlobalContextMenu({ setModal, disableContextMenu = false }) {

    const { currentFolderId, items, isViewerOnly } = useFileExplorer()
    const { isSearchMode } = useSearch()
    const navigate = useNavigate()
    const location = useLocation()
    const isTrashPage = location.pathname.startsWith("/trash")
    const isSharedPage = location.pathname === "/shared" || location.pathname === "/shared-with-me"

    // using uploadContext
    const { addFiles, checkAndUpload, openScanningPanel, cancelScanning, isScanningCancelled } = useUpload()
    const fileInputRef = useRef(null);
    const folderInputRef = useRef(null);

    const [menu, setMenu] = useState({
        visible: false,
        top: 0,
        left: null,
        right: null
    });

    const openMenu = ({ x, y, type = "cursor" }) => {
        const menuWidth = 220;
        const menuHeight = 140;
        const margin = 0;

        let position = {
            top: y,
            left: null,
            right: null
        };

        if (type === "button") {
            //  Always open above button
            position.top = y - menuHeight - 10;

            //  Keep inside screen horizontally
            if (x + menuWidth > window.innerWidth - margin) {
                position.left = window.innerWidth - menuWidth - margin;
            } else {
                position.left = Math.max(x, margin);
            }
        } else {
            //  Normal right-click behavior
            if (x + menuWidth + margin > window.innerWidth) {
                position.right = window.innerWidth - x + margin;
            } else {
                position.left = Math.max(x, margin);
            }

            if (y + menuHeight + margin > window.innerHeight) {
                position.top = window.innerHeight - menuHeight - margin;
            }
        }

        if (position.top < margin) position.top = margin;

        setMenu({
            visible: true,
            ...position
        });
    };

    useEffect(() => {
    const handleRightClick = (e) => {
        e.preventDefault()

        if (disableContextMenu || isSearchMode || isSharedPage) return;

        if (e.target.closest(".table-row")) {
            setMenu((prev => ({ ...prev, visible: false })))
            return
        }

        if (!e.target.closest(".content-view-wrapper")) {
            setMenu((prev) => ({ ...prev, visible: false }));
            return;
        }

        openMenu({
            x: e.clientX,
            y: e.clientY
        });
    };

    const handleClick = () => {
        setMenu((prev) => ({
            ...prev,
            visible: false
        }));
    };

    window.addEventListener("contextmenu", handleRightClick);
    window.addEventListener("click", handleClick);

    return () => {
        window.removeEventListener("contextmenu", handleRightClick);
        window.removeEventListener("click", handleClick);
    };
}, [disableContextMenu, isSearchMode, isSharedPage]);

    const isActionDisabled = isViewerOnly || isSharedPage;

    const handleNewButtonClick = (e) => {
        e.stopPropagation();

        setMenu({
            visible: true,
            top: null,
            bottom: 60,
            left: null,
            right: 13
        });
    };


    // fileInput change handler
    const handleFileChange = (e) => {
        const selected = Array.from(e.target.files);
        if (selected.length > 0) {
            checkAndUpload(selected, currentFolderId, items);
            e.target.value = ""
        }
    }

    // Actions when user click on new folder
    const handleNewFolder = () => {
        setModal({ type: "createNewFolder" })
    };


    // recursively collect all files from directory handle
    const collectFilesFromDir = async (dirHandle, path = "") => {
        const files = []
        let hasEntries = false
        const promises = []

        for await (const entry of dirHandle.values()) {
            hasEntries = true
            if (entry.kind === "file") {
                promises.push(
                    entry.getFile().then(file => {
                        Object.defineProperty(file, "webkitRelativePath", {
                            value: path ? `${path}/${file.name}` : `${dirHandle.name}/${file.name}`,
                            writable: false
                        })
                        files.push(file)
                    })
                )
            } else if (entry.kind === "directory") {
                const subPath = path ? `${path}/${entry.name}` : `${dirHandle.name}/${entry.name}`
                promises.push(
                    collectFilesFromDir(entry, subPath).then(subFiles => {
                        files.push(...subFiles)
                    })
                )
            }
        }

        await Promise.all(promises)

        // if folder is empty — create a placeholder file so path is tracked
        if (!hasEntries) {
            const emptyPath = path ? path : dirHandle.name
            const placeholder = new File([""], ".keep", { type: "text/plain" })
            Object.defineProperty(placeholder, "webkitRelativePath", {
                value: `${emptyPath}/.keep`,
                writable: false
            })
            placeholder._isPlaceholder = true
            files.push(placeholder)
        }

        return files
    }

    const handleUploadFolder = async () => {
        // modern browsers — no freeze
        if (window.showDirectoryPicker) {
            try {
                const dirHandle = await window.showDirectoryPicker()
                openScanningPanel(dirHandle.name)
                const files = await collectFilesFromDir(dirHandle)
                if (files.length > 0 && !isScanningCancelled()) {
                    checkAndUpload(files, currentFolderId, items)
                }
            } catch (err) {
                // user cancelled picker
                if (err.name !== "AbortError") console.error(err)
            }
        } else {
            // fallback for Firefox
            openScanningPanel()
            folderInputRef.current.click()
        }
    }

    const handleAddFile = () => {
        fileInputRef.current.click();
    };

    return (
        <>

            {/*  hidden file input using useRef */}
            {!disableContextMenu && (
                <>
                    <input type="file" ref={fileInputRef} style={{ display: "none" }} multiple onChange={handleFileChange} />
                    <input type="file" ref={folderInputRef} style={{ display: "none" }} webkitdirectory="true" multiple onChange={handleFileChange} />
                </>
            )}

            {/*  Context Menu */}
            {!disableContextMenu && menu.visible && (
                <div
                    className="custom-context-menu"
                    style={{
                        position: "fixed",
                        top: menu.top ?? "auto",
                        bottom: menu.bottom ?? "auto",
                        left: menu.left ?? "auto",
                        right: menu.right ?? "auto",
                    }}
                >
                    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                        {/*  new folder create in shared fodler viewer can not create a new folder so disbaled all there  */}
                        <li onClick={(e) => {
                            if (isActionDisabled) {
                                e.stopPropagation()
                                return
                            }
                            handleNewFolder()
                        }}
                            style={{ opacity: isActionDisabled ? 0.7 : 1, cursor: isActionDisabled ? "not-allowed" : "pointer" }}>
                            <button className="dropdown-item">
                                <span className="d-flex align-items-center" style={{ opacity: isActionDisabled ? 0.7 : 1, cursor: isActionDisabled ? "not-allowed" : "pointer" }}>
                                    <InteractiveIcon
                                        defaultIcon={folderPlusIcon}
                                        className="me-2"
                                        width={20}
                                        height={20}
                                        alt=""
                                        style={{ opacity: isActionDisabled ? 0.7 : 1, cursor: isActionDisabled ? "not-allowed" : "pointer" }}
                                    />
                                    New Folder
                                </span>
                            </button>
                        </li>

                        {/*  folder uplaod in shared folder viewer can not uplaod a folder so disabled it  */}
                        <li onClick={(e) => {
                            if (isActionDisabled) {
                                e.stopPropagation()
                                return
                            }
                            handleUploadFolder()
                        }} style={{ opacity: isActionDisabled ? 0.7 : 1, cursor: isActionDisabled ? "not-allowed" : "pointer" }} >
                            <button className="dropdown-item" style={{ opacity: isActionDisabled ? 0.7 : 1, cursor: isActionDisabled ? "not-allowed" : "pointer" }}>
                                <span className="d-flex align-items-center">
                                    <InteractiveIcon
                                        defaultIcon={folderUploadIcon}
                                        className="me-2"
                                        width={20}
                                        height={20}
                                        alt=""
                                        style={{ opacity: isActionDisabled ? 0.7 : 1, cursor: isActionDisabled ? "not-allowed" : "pointer" }}
                                    />
                                    Upload Folder
                                </span>
                            </button>
                        </li>

                        <li  onClick={(e) => {
                            if (isActionDisabled) {
                                e.stopPropagation()
                                return
                            }
                            handleAddFile()
                        }} style={{ opacity: isActionDisabled ? 0.7 : 1, cursor: isActionDisabled ? "not-allowed" : "pointer" }}>
                            <button className="dropdown-item" style={{ opacity: isActionDisabled ? 0.7 : 1, cursor: isActionDisabled ? "not-allowed" : "pointer" }}>
                                <span className="d-flex align-items-center">
                                    <InteractiveIcon
                                        defaultIcon={addFileIcon}
                                        className="me-2"
                                        width={20}
                                        height={20}
                                        alt=""
                                        style={{ opacity: isActionDisabled ? 0.7 : 1, cursor: isActionDisabled ? "not-allowed" : "pointer" }}
                                    />
                                    Add Files
                                </span>
                            </button>
                        </li>
                    </ul>
                </div>
            )}

            {/*  Floating New Button */}
            {!disableContextMenu && !isSearchMode && (
                <button className="new-btn" onClick={handleNewButtonClick}>
                    <InteractiveIcon
                        defaultIcon={plusIcon}
                        className="me-2"
                        width={22}
                        height={22}
                        alt=""
                    />
                    New
                </button>
            )}

            {/* <button className="trash-new-btn" onClick={() => navigate(isTrashPage ? "/dashboard" : "/trash-dashboard")}>
                <InteractiveIcon
                    defaultIcon={isTrashPage ? homeIcon : deleteIcon}
                    width={24}
                    height={24}
                    alt=""
                />
            </button> */}
            {/* {!isTrashPage && (
                <button className="trash-new-btn" onClick={() => navigate("/trash-dashboard")}>
                    <Tooltip text="Trash Page" >
                        <InteractiveIcon
                            defaultIcon={deleteIcon}
                            width={24}
                            height={24}
                            alt=""
                        />
                    </Tooltip>
                </button>
            )} */}
        </>
    );
}

export default GlobalContextMenu;



