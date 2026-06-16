import React, { useRef, useState, useEffect, memo } from "react";
import InteractiveIcon from "../layout/InteractiveIcon";
import { Dropdown } from "react-bootstrap";
import arrowRight from "@images/icon/arrow-right.svg";
import folderPlus from "@images/icon/folder-plus.svg";
import userPlus from "@images/icon/user-plus.svg";
import downloadIcon from "@images/icon/download.svg";
import renameIcon from "@images/icon/rename.svg";
import moveIcon from "@images/icon/move.svg";
import trash from "@images/icon/trash.svg";
import menuDotsOutlineIcon from "@images/icon/menu-dots-outline.svg";
import copyIcon from "@images/icon/copy.svg";
import addFileIcon from "@images/icon/file-plus.svg";
import folderUploadIcon from "@images/icon/folder-upload.svg";
import listFolder9Icon from "@images/svgs/list/SF9.svg";

import retryIcon from "@images/icon/retry-icon.svg"
import deleteIcon from "@images/icon/trash.svg"
import colorIcon from "@images/icon/color.svg";
import fileInfoIcon from "@images/icon/file-info.svg";


const Breadcrumbs = memo(function Breadcrumbs({
    trail = [],
    onNavigate,
    onHomeClick,
    maxVisible = 5,
    rootLabel = "Home",
    actions = [],
    setModal,
    selectedIds,
    items,
    currentFolderId,
    addFiles,
    openScanningPanel,
    downloadFile,
    downloadFolder,
    downloadMultiple,
    onNewFolder,
    onRestore,
    onDeleteForever,
    changeColor,
    isViewerOnly,
    currentFolderMeta
}) {

    // ##################################################
    // ---- STEP 1: Component State & References --------
    // ##################################################
    const [showActionDropdown, setShowActionDropdown] = useState(false)
    const [showColorDropdown, setShowColorDropdown] = useState(false)
    const dropdownRef = useRef(null)
    const fileInputRef = useRef(null)
    const folderInputRef = useRef(null)


    // ##################################################
    // ---- STEP 2: Logic Checks & Data Preparation -----
    // ##################################################

    // Convert the Set of selected IDs to an array
    const selectedArray = selectedIds ? Array.from(selectedIds) : [];
    // const selectedItem = items?.find(i => i._id === selectedArray[0])

    // which fodler are we inside get that fodler metadata
    const targetItem = currentFolderId ? currentFolderMeta : null
    const targetIds = currentFolderId ? [currentFolderId] : null


    const hasFolder = selectedArray.length > 0 && selectedArray.every(id => items?.find(i => i._id === id)?.type === "folder")

    // Robust check for both Set and Array
    const selectedCount = selectedIds?.size ?? selectedIds?.length ?? 0;
    const isDisabled = selectedCount === 0;

    // ##################################################
    // ---- STEP 3: Action Handlers ---------------------
    // These functions fire when a user clicks a button 
    // inside the breadcrumb's context dropdown.
    // ##################################################

    // Upload Files
    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length) {
            addFiles(files, currentFolderId, items)
            e.target.value = ""
        }
        setShowActionDropdown(false)
    }

    // when folder upload
    const handleUploadFolder = () => {
        // openScanningPanel?.()  // here panel is opening even if not seelct folder 
        folderInputRef.current.click()
    }
    const handleAddFiles = () => fileInputRef.current.click()


    //  here when user download
    const handleDownload = () => {
        downloadFolder(targetItem)
        setShowActionDropdown(false)
    }



    //  when user creates new folder here
    const handleNewFolder = () => {
        if (onNewFolder) {
            onNewFolder()
        } else {
            setModal({ type: "createNewFolder" })
        }
        setShowActionDropdown(false)
    }


    //  when rename modal
    const handleRename = () => {
        setModal({ type: "RenameModal", data: targetItem })
        setShowActionDropdown(false)
    }


    //  when user share 
    const handleShare = () => {
        setModal({ type: "shareUser", data: targetItem })
        setShowActionDropdown(false)
    }


    //  file folder moving
    const handleMove = () => {
        setModal({ type: "MoveModal", data: targetIds })
        setShowActionDropdown(false)
    }


    //  file folder copy
    const handleCopy = () => {
        setModal({ type: "CopyModal", data: targetIds })
        setShowActionDropdown(false)
    }


    //  file folder delete
    const handleDelete = () => {
        setModal({ type: "DeleteModal", data: targetIds })
        setShowActionDropdown(false)
    }


    // here in trash page restore item 
    const handleRestore = () => {
        onRestore?.(targetItem)
        setShowActionDropdown(false)
    }


    //  trash page delete forever 
    const handleDeleteForever = () => {
        onDeleteForever?.(targetItem)
        setShowActionDropdown(false)
    }


    //  when user click out side of modal close it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowActionDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // reset color dropdown state if parent actions dropdown is closed
    useEffect(() => {
        if (!showActionDropdown) {
            setShowColorDropdown(false);
        }
    }, [showActionDropdown]);



    // 
    const shouldCollapse = trail.length > maxVisible;
    const collapsedItems = shouldCollapse ? trail.slice(0, trail.length - maxVisible) : [];
    const visibleTrail = shouldCollapse ? trail.slice(trail.length - maxVisible) : trail;


    // ##################################################
    // ---- STEP 4: Render Dropdown Menu Items ----------
    // Dynamically builds the dropdown menu using the `actions` 
    // prop (e.g. ['newFolder', 'share', 'info']).
    // Respects `isViewerOnly` to disable destructive items.
    // ##################################################
    const menuItems = actions.length > 0 ? (
        <Dropdown.Menu className="custom-breadcrumb-dropdown" style={{ overflow: "visible" }}>
            {actions.includes("newFolder") && (
                <Dropdown.Item as="button" disabled={isViewerOnly}
                    style={{ opacity: isViewerOnly ? 0.6 : 1, cursor: isViewerOnly ? "not-allowed" : "pointer" }}
                    onClick={!isViewerOnly ? handleNewFolder : undefined}>

                    <span className="d-flex align-items-center">
                        <InteractiveIcon defaultIcon={folderPlus} className="me-2" width={20} />
                        New Folder
                    </span>
                </Dropdown.Item>
            )}

            {/*  Uplaod  folder */}
            {actions.includes("uploadFolder") && (
                <Dropdown.Item as="button"
                    disabled={isViewerOnly}
                    style={{ opacity: isViewerOnly ? 0.6 : 1, cursor: isViewerOnly ? "not-allowed" : "pointer" }}
                    onClick={!isViewerOnly ? handleUploadFolder : undefined}>

                    <span className="d-flex align-items-center">
                        <InteractiveIcon defaultIcon={folderUploadIcon} className="me-2" width={20} />
                        Upload Folder
                    </span>
                </Dropdown.Item>
            )}

            {/*  uplaod a file */}
            {actions.includes("addFiles") && (
                <Dropdown.Item as="button"
                    disabled={isViewerOnly}
                    style={{ opacity: isViewerOnly ? 0.6 : 1, cursor: isViewerOnly ? "not-allowed" : "pointer" }}
                    onClick={!isViewerOnly ? handleAddFiles : undefined}>
                    <span className="d-flex align-items-center">
                        <InteractiveIcon defaultIcon={addFileIcon} className="me-2" width={20} />
                        Add Files
                    </span>
                </Dropdown.Item>
            )}
            {/* share */}
            {actions.includes("share") && (
                <Dropdown.Item as="button"
                    disabled={isViewerOnly}
                    style={{ opacity: isViewerOnly ? 0.6 : 1, cursor: isViewerOnly ? "not-allowed" : "pointer" }}
                    onClick={!isViewerOnly ? handleShare : undefined}>
                    <InteractiveIcon defaultIcon={userPlus} className="me-2" width={20} /> Share
                </Dropdown.Item>
            )}

            {/* download */}
            {actions.includes("download") && (
                <Dropdown.Item as="button" onClick={handleDownload}>
                    <InteractiveIcon defaultIcon={downloadIcon} className="me-2" width={20} /> Download
                </Dropdown.Item>
            )}

            {/* rename */}
            {actions.includes("rename") && (
                <Dropdown.Item as="button"
                    disabled={isViewerOnly}
                    style={{ opacity: isViewerOnly ? 0.6 : 1, cursor: isViewerOnly ? "not-allowed" : "pointer" }}
                    onClick={!isViewerOnly ? handleRename : undefined}>
                    <InteractiveIcon defaultIcon={renameIcon} className="me-2" width={20} /> Rename
                </Dropdown.Item>
            )}

            {/* change color */}
            {actions.includes("changeColor") && (
                <div className="position-relative w-100">
                    <button
                        className="dropdown-item d-flex align-items-center justify-content-between"
                        disabled={isViewerOnly}
                        style={{ opacity: isViewerOnly ? 0.6 : 1, cursor: isViewerOnly ? "not-allowed" : "pointer" }}
                        onClick={(e) => {
                            e.stopPropagation()
                            if (!isViewerOnly) setShowColorDropdown(prev => !prev)
                        }}
                    >
                        <span className="d-flex align-items-center">
                            <InteractiveIcon defaultIcon={colorIcon} className="me-2" width={20} /> Change Color
                        </span>
                    </button>

                    {showColorDropdown && (
                        <div className="show position-absolute" style={{ zIndex: 10000, left: "100%", top: 0, minWidth: "226px", maxWidth: "226px", padding: "20px", background: "var(--white)", border: "1px solid var(--secondary)", borderRadius: "8px", boxShadow: "0px 4px 24px 0px rgba(0, 0, 0, 0.10)" }}>
                            <p className="mb-3" style={{ fontSize: "14px", color: "var(--dark-50)" }}>Folder Color</p>
                            <div className="d-flex align-items-center flex-wrap" style={{ margin: "-8px", marginTop: "-8px" }}>
                                {["red", "orange", "yellow", "green", "green-dark", "blue", "violet", "pink", "gray"].map(color => (
                                    <button key={color} className="border-0"
                                        style={{ position: "relative", display: "block", width: "24px", height: "24px", borderRadius: "50%", margin: "8px", outline: "1px solid var(--dark-20)", outlineOffset: "-1px", padding: 0, cursor: "pointer", backgroundColor: `var(--${color})` }}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            changeColor?.(targetIds, color)
                                            setShowActionDropdown(false)
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* copy */}
            {actions.includes("copy") && (
                <Dropdown.Item as="button" onClick={handleCopy}>
                    <InteractiveIcon defaultIcon={copyIcon} className="me-2" width={20} /> Copy
                </Dropdown.Item>
            )}

            {/* move */}
            {actions.includes("move") && (
                <Dropdown.Item as="button"
                    disabled={isViewerOnly}
                    style={{ opacity: isViewerOnly ? 0.6 : 1, cursor: isViewerOnly ? "not-allowed" : "pointer" }}
                    onClick={!isViewerOnly ? handleMove : undefined}>
                    <InteractiveIcon defaultIcon={moveIcon} className="me-2" width={20} /> Move
                </Dropdown.Item>
            )}

            {/*  item info */}
            {actions.includes("info") && (
                <Dropdown.Item as="button"
                    onClick={() => {
                        setModal({ type: "ItemInfoModal", data: targetItem })
                        setShowActionDropdown(false)
                    }}>
                    <InteractiveIcon defaultIcon={fileInfoIcon} className="me-2" width={20} /> Info
                </Dropdown.Item>
            )}

            {/* trash */}
            {actions.includes("trash") && (
                <Dropdown.Item as="button"
                    disabled={isViewerOnly}
                    style={{ opacity: isViewerOnly ? 0.6 : 1, cursor: isViewerOnly ? "not-allowed" : "pointer" }}
                    onClick={!isViewerOnly ? handleDelete : undefined}>
                    <InteractiveIcon defaultIcon={trash} className="me-2" width={20} /> Trash
                </Dropdown.Item>
            )}

            {/*  here trash page action */}
            {/*  restore */}
            {actions.includes("restore") && (
                <Dropdown.Item as="button" onClick={handleRestore}>
                    <InteractiveIcon defaultIcon={retryIcon} className="me-2" width={20} /> Restore
                </Dropdown.Item>
            )}

            {/* delete forever here */}
            {actions.includes("deleteForever") && (
                <Dropdown.Item as="button" onClick={handleDeleteForever}>
                    <InteractiveIcon defaultIcon={deleteIcon} className="me-2" width={20} /> Delete
                </Dropdown.Item>
            )}




        </Dropdown.Menu>
    ) : null


    // ##################################################
    // ---- STEP 5: Render Breadcrumb Trail -------------
    // Renders the visible path (e.g., Home > Folder 1 > Folder 2).
    // If the path exceeds maxVisible, it collapses the middle items.
    // ##################################################
    return (
        <>
            {/* Hidden file inputs used for triggering system upload dialogs via handleAddFiles / handleUploadFolder */}
            {actions.includes("uploadFolder") || actions.includes("addFiles") ? (
                <>
                    <input type="file" ref={fileInputRef} hidden multiple onChange={handleFileChange} />
                    <input type="file" ref={folderInputRef} hidden webkitdirectory="true" multiple onChange={handleFileChange} />
                </>
            ) : null}

            <ul className="gap-1 breadcrumb mb-0">

                {/* 1. ROOT ITEM (e.g., "My Docspot") */}
                <li className="position-relative" ref={trail.length === 0 ? dropdownRef : null}>
                    <a
                        className={`cursor-pointer ${trail.length === 0 ? "highlight" : ""}`}
                        onClick={() => {
                            if (trail.length === 0 && actions.length > 0) {
                                setShowActionDropdown(prev => !prev)
                            } else {
                                onHomeClick?.();
                                setShowActionDropdown(false)
                            }
                        }}>
                        <span>{rootLabel}</span>
                    </a>
                    {trail.length === 0 && actions.length > 0 && showActionDropdown && (
                        <Dropdown show>{menuItems}</Dropdown>
                    )}
                </li>


                {/* COLLAPSED  */}
                {shouldCollapse && (
                    <>
                        <li className="d-flex align-items-center breadcrumb-indicator">
                            <InteractiveIcon defaultIcon={arrowRight} width={16} height={16} />
                        </li>
                        <li className="d-flex align-items-center">
                            <a className="over-breadcrumb-links-folder p-0">
                                <Dropdown>
                                    <Dropdown.Toggle className="no-border-btn">
                                        <InteractiveIcon defaultIcon={menuDotsOutlineIcon} width={24} />
                                    </Dropdown.Toggle>

                                    {/*  drop down show like all folder name here */}
                                    <Dropdown.Menu>
                                        {collapsedItems.map((folder, index) => (
                                            <Dropdown.Item as="button" key={`${folder.id}-${index}`}
                                                onClick={() => {
                                                    onNavigate?.(trail.indexOf(folder) + 1)
                                                    setShowActionDropdown(false)
                                                }}>
                                                <InteractiveIcon defaultIcon={listFolder9Icon} width={20} className="me-2" />
                                                {folder.name}
                                            </Dropdown.Item>
                                        ))}
                                    </Dropdown.Menu>
                                </Dropdown>
                            </a>
                        </li>
                    </>
                )}


                {/* here viible trail like > foldername > foldername */}
                {visibleTrail.map((folder, index) => {
                    const isLast = index === visibleTrail.length - 1;
                    const actualIndex = shouldCollapse ? collapsedItems.length + index : index

                    return (
                        <React.Fragment key={`${folder.id}-${index}`}>
                            {/*  back arrow icon */}
                            <li className="d-flex align-items-center breadcrumb-indicator">
                                <InteractiveIcon defaultIcon={arrowRight} width={16} height={16} />
                            </li>

                            <li className="position-relative" ref={isLast ? dropdownRef : null} >
                                <a className={`cursor-pointer ${isLast ? "highlight" : ""}`}
                                    onClick={() => {
                                        if (isLast && actions.length > 0) {
                                            setShowActionDropdown(prev => !prev)
                                        } else {
                                            onNavigate?.(actualIndex + 1)
                                            setShowActionDropdown(false)
                                        }
                                    }}>
                                    <span>{folder.name}</span>
                                </a>
                                {isLast && actions.length > 0 && showActionDropdown && (
                                    <Dropdown show>{menuItems}</Dropdown>
                                )}
                            </li>

                        </React.Fragment>
                    )
                })}

            </ul>

        </>
    )
})



export default Breadcrumbs