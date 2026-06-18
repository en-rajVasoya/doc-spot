import InteractiveIcon from "../../layout/InteractiveIcon.jsx";
import checkboxIcon from "@images/icon/checkbox-check.svg";
import squareArrowDownLinearIcon from "@images/icon/square-arrow-down-linear.svg";
import { useEffect, useRef, useState } from "react";
import { useTrash } from "../../../context/TrashContext.jsx";
import { useAuth } from "../../../context/AuthContext.jsx"
import getFileIcon from "../../../utils/getFileIcon.js";
import getFolderIcon from "../../../utils/getFolderIconColor.js";
import FilePreviewModal from "../filePreview/FilePreviewModal.jsx";
import trashEmptyIcon from "@images/icon/trash-icon.svg";

import downloadIcon from "@images/icon/download.svg"
import retryIcon from "@images/icon/retry-icon.svg"
import deleteIcon from "@images/icon/trash.svg"
import { useDownload } from "../../../context/DownloadContext.jsx";
import { useNotification } from "../../../context/NotificationContext.jsx";


function TrashContentView({ view, setModal, onItemRefsReady, dragRootRef }) {
    const [filePreview, setFilePreview] = useState(null)
    const { downloadFile, downloadFolder, downloadMultiple } = useDownload()
    const { showNotification } = useNotification()

    const [itemContextMenu, setItemContextMenu] = useState({ visible: false, x: 0, y: 0 })

    const { sortedItems: items, sortBy, setSortBy, sortOrder, setSortOrder, loading, error, selectedIds, setSelectedIds, openFolder, restoreItemApi } = useTrash()

    const { user } = useAuth()

    const lastClick = useRef({});
    const anchorIndex = useRef(null)
    const lastCtrlSelectedIds = useRef(new Set())

    // -------------------------------------------------------------------
    // 1. VARIABLES TO TRACK THE DRAG BOX
    // -------------------------------------------------------------------
    const itemRefs = useRef({}) // Keeps track of where every file is on the screen
    const [dragStart, setDragStart] = useState(null) // Saves the exact X,Y coordinates where you clicked
    const [dragRect, setDragRect] = useState(null) // Saves the width and height of the blue box
    const isDragSelectingRef = useRef(false) // Tells us if you are currently dragging or not

    // -------------------------------------------------------------------
    // 2. WHEN YOU CLICK THE MOUSE DOWN (Start Dragging & Deselect)
    // -------------------------------------------------------------------
    const handleMouseDown = (e) => {
        // Stop the drag box if you click on the header or preview modal
        if (e.target.closest(".master-header")) return
        if (e.target.closest(".file-preview-modal")) return;

        // Stop the drag box if you click directly on a file, header, button, or warning message
        if (e.target.closest(".table-row")) return
        if (e.target.closest(".table-header")) return
        if (e.target.closest("button, input, textarea, select, a, .custom-context-menu, .search-suggestion-chip, .empty-bin-section")) return
        
        // Only allow Left-Click  to start dragging
        if (e.button !== 0) return

        // Okay, it's safe to start! Turn on the drag mode and save where you clicked
        isDragSelectingRef.current = true
        setDragStart({ x: e.clientX, y: e.clientY })
        setDragRect(null)

        // THIS is what deselects all files when you click on the empty background!
        setSelectedIds(new Set())
    }

    // -------------------------------------------------------------------
    // 3. WHEN YOU MOVE THE MOUSE AROUND (Draw Box & Select Items)
    // -------------------------------------------------------------------
    const handleMouseMove = (e) => {
        // If you haven't clicked down yet, do nothing
        if (!isDragSelectingRef.current || !dragStart) return

        // Do the math to calculate how big the blue box should be based on where your mouse moved
        const rect = {
            x: Math.min(e.clientX, dragStart.x),
            y: Math.min(e.clientY, dragStart.y),
            width: Math.abs(e.clientX - dragStart.x),
            height: Math.abs(e.clientY - dragStart.y),
        }

        // Draw the box on the screen
        setDragRect(rect)

        // Loop through every single file to see if the blue box is touching it
        const newSelected = new Set()
        Object.entries(itemRefs.current).forEach(([id, el]) => {
            if (!el) return
            const itemRect = el.getBoundingClientRect() // Get file's GPS location on screen
            
            // Is the blue box overlapping this file?
            const overlaps =
                itemRect.left < rect.x + rect.width &&
                itemRect.right > rect.x &&
                itemRect.top < rect.y + rect.height &&
                itemRect.bottom > rect.y
            
            // If yes, select the file!
            if (overlaps) newSelected.add(id)
        })

        // Update the checkboxes!
        setSelectedIds(newSelected)
    }

    // -------------------------------------------------------------------
    // 4. WHEN YOU LET GO OF THE MOUSE (Stop Dragging)
    // -------------------------------------------------------------------
    const handleMouseUp = () => {
        isDragSelectingRef.current = false // Turn off drag mode
        setDragStart(null) // Clear starting point
        setDragRect(null) // Hide the blue box
    }

    // -------------------------------------------------------------------
    // 5. EVENT LISTENERS (Telling the browser to pay attention)
    // -------------------------------------------------------------------
    
    // Sends the file locations back to the Dashboard
    useEffect(() => {
        onItemRefsReady?.(itemRefs.current)
    })

    // Tells the browser to listen to your mouse movements only when you start dragging
    useEffect(() => {
        if (!dragStart) return
        window.addEventListener("mousemove", handleMouseMove)
        window.addEventListener("mouseup", handleMouseUp)
        return () => {
            window.removeEventListener("mousemove", handleMouseMove)
            window.removeEventListener("mouseup", handleMouseUp)
        }
    }, [dragStart])

    // Tells the browser to listen for when you click down on the background
    useEffect(() => {
        const root = dragRootRef?.current
        if (!root) return
        root.addEventListener("mousedown", handleMouseDown)
        return () => {
            root.removeEventListener("mousedown", handleMouseDown)
        }
    }, [dragRootRef])

    //  close the menu on outside click
    useEffect(() => {
        const handleCloseRightClickMenu = () => setItemContextMenu({ visible: false })
        window.addEventListener("click", handleCloseRightClickMenu)
        return () => window.removeEventListener("click", handleCloseRightClickMenu)
    })

    useEffect(() => {
        if (selectedIds.size === 0) {
            lastCtrlSelectedIds.current = new Set()
            anchorIndex.current = null
        }
    }, [selectedIds])



    //  for sorting in the list view here same sorting so icon flip here 
     const handleColumnSort = (column) => {
        if (sortBy === column) {
            setSortOrder(prev => prev === "asc" ? "desc" : "asc")
        } else {
            setSortBy(column)
            setSortOrder("asc")
        }
    }

    const handleItemClick = (item) => {
        const now = Date.now()

        if (item.type === "folder") {
            if (lastClick.current[item._id] && now - lastClick.current[item._id] < 400) {
                openFolder(item)
            }
            lastClick.current[item._id] = now
            return
        }
        //  in future if we wan tto do preview in the trash page
        // else if (item.type === "file") {
        //     if (lastClick.current[item._id] && now - lastClick.current[item._id] < 400) {
        //         setFilePreview(item)
        //     }
        //     lastClick.current[item._id] = now
        //     return
        // }
    }

    const handleCheckBoxSelected = () => {
        if (selectedIds.size === items.length) {
            setSelectedIds(new Set())
        } else {
            const allIds = items.map(item => item._id)
            setSelectedIds(new Set(allIds))
        }
    }

    const handleCheckboxOnly = (e, itemId) => {
        e.stopPropagation();
        const currentIndex = items.findIndex(item => item._id === itemId);
        const newSelected = new Set(selectedIds);

        if (newSelected.has(itemId)) {
            newSelected.delete(itemId);
            lastCtrlSelectedIds.current.delete(itemId);
        } else {
            newSelected.add(itemId);
            lastCtrlSelectedIds.current.add(itemId);
        }

        setSelectedIds(newSelected);

        if (newSelected.size === 0) {
            lastCtrlSelectedIds.current = new Set();
            anchorIndex.current = null;
        } else {
            anchorIndex.current = currentIndex;
        }
    };

    const handleCheckboxClick = (e, itemId) => {
        e.stopPropagation();
        const currentIndex = items.findIndex(item => item._id === itemId);

        if (e.shiftKey && anchorIndex.current !== null) {
            const start = Math.min(anchorIndex.current, currentIndex);
            const end = Math.max(anchorIndex.current, currentIndex);
            const rangeIds = new Set(
                items.slice(start, end + 1).map(item => item._id)
            );
            const newSelected = new Set(lastCtrlSelectedIds.current);
            rangeIds.forEach(id => newSelected.add(id));
            setSelectedIds(newSelected);

        } else if (e.ctrlKey || e.metaKey) {
            const newSelected = new Set(selectedIds);
            if (newSelected.has(itemId)) {
                newSelected.delete(itemId);
                lastCtrlSelectedIds.current.delete(itemId);
            } else {
                newSelected.add(itemId);
                lastCtrlSelectedIds.current.add(itemId);
            }
            setSelectedIds(newSelected);
            anchorIndex.current = currentIndex;

        } else {
            setSelectedIds(new Set([itemId]));
            lastCtrlSelectedIds.current = new Set([itemId]);
            anchorIndex.current = currentIndex;
        }
    };

    // format trashedAt date
    const formatTrashedAt = (date) => {
        if (!date) return "—"
        const d = new Date(date)
        const now = new Date()
        const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24))
        const daysLeft = 30 - diffDays
        return `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`
    }

    if (loading) return (
        <div className="loader-wrapper-box">
            <div class="cma-messages-are-loader-wrapper">
                <span class="loader"></span>
            </div>
        </div>
    )
    if (error) return <div className="position-absolute">{error}</div>

    return (
        <>
            {filePreview && (
                <FilePreviewModal file={filePreview} onClose={() => setFilePreview(null)} />
            )}

            <div className={`grid-single-box ${view === "grid" ? "grid-view" : "list-view"}`} >
                <section className="content-wrapper">
                    <div className="table row">
                        <div className="table-header">
                            <div className="table-cell">
                                <div className="first-cell-data p-0">
                                    <div className="form-check-group">
                                        <label htmlFor="allcheck">
                                            <InteractiveIcon defaultIcon={checkboxIcon} alt="" />
                                        </label>
                                        <input
                                            type="checkbox"
                                            className="checkbox"
                                            name=""
                                            id="allcheck"
                                            checked={items.length > 0 && selectedIds.size === items.length}
                                            onChange={handleCheckBoxSelected}
                                        />
                                    </div>
                                    <div
                                        className={`sorting-label-text ${sortBy === "name" ? "sorting-active" : ""}`}
                                        onClick={() => handleColumnSort("name")}
                                        style={{ cursor: "pointer", marginLeft: "15px" }}
                                    >
                                        Name
                                        <InteractiveIcon
                                            defaultIcon={squareArrowDownLinearIcon}
                                            width={20}
                                            alt=""
                                            className={`sorting-label-icon ${sortBy === "name" ? "visible" : "invisible"} ${sortBy === "name" && sortOrder === "asc" ? "sorting-label-icon--desc" : ""}`}
                                        />
                                    </div>
                                </div>
                            </div>
                            {/* <div className="table-cell">
                                <div className="text-badge">Owner</div>
                            </div> */}
                            <div className="table-cell" onClick={() => handleColumnSort("modified")} style={{ cursor: "pointer" }}>
                                <div className={`sorting-label-text ${sortBy === "modified" ? "sorting-active" : ""}`}>
                                    Days Left
                                    <InteractiveIcon
                                        defaultIcon={squareArrowDownLinearIcon}
                                        width={20}
                                        alt=""
                                        className={`sorting-label-icon ${sortBy === "modified" ? "visible" : "invisible"} ${sortBy === "modified" && sortOrder === "asc" ? "sorting-label-icon--desc" : ""}`}
                                    />
                                </div>
                            </div>
                        </div>

                        {items.length === 0 && !loading && (
                            <div className="no-data-found-single-box-wrapper">
                                <div className="no-data-found-single-box">
                                    <InteractiveIcon defaultIcon={trashEmptyIcon} alt="No folders" />
                                    <p className="text-center text-muted py-3 m-0">
                                        Trash is empty
                                    </p>
                                </div>
                            </div>
                        )}

                        {items.map((item) => (
                            <div
                                key={item._id}
                                ref={(el) => (itemRefs.current[item._id] = el)}
                                className="table-row col-xl-2 col-lg-3 col-md-4 col-sm-6 col-6"
                                onClick={() => handleItemClick(item)}
                                onContextMenu={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    if (!selectedIds.has(item._id)) {
                                        setSelectedIds(new Set([item._id]))
                                    }
                                    setItemContextMenu({ visible: true, x: e.clientX, y: e.clientY })
                                }}
                            >
                                <div
                                    className={`table-row-inner ${selectedIds.has(item._id) ? "selected" : ""}`}
                                    onClick={(e) => {
                                        if (e.ctrlKey || e.metaKey || e.shiftKey) {
                                            handleCheckboxClick(e, item._id)
                                        }
                                    }}
                                    style={{ userSelect: "none" }}
                                >
                                    <div className="table-cell">
                                        <div className="first-cell-data p-0">
                                            <div className="form-check-group">
                                                <label htmlFor={`item-${item._id}`}>
                                                    <InteractiveIcon defaultIcon={checkboxIcon} alt="" />
                                                </label>
                                                <input
                                                    type="checkbox"
                                                    className="checkbox"
                                                    id={`item-${item._id}`}
                                                    checked={selectedIds.has(item._id)}
                                                    onChange={() => { }}
                                                    onClick={(e) => handleCheckboxOnly(e, item._id)}
                                                />
                                            </div>

                                            <div className="folder-img">
                                                <span>
                                                    <InteractiveIcon
                                                        defaultIcon={
                                                            item.type === "folder"
                                                                ? getFolderIcon(item.color, "list", false)
                                                                : getFileIcon(item.name)
                                                        }
                                                        className="list-view-img"
                                                        alt=""
                                                        onDoubleClick={(e) => {
                                                            e.stopPropagation();
                                                            if (item.type === "folder") openFolder(item)
                                                        }}
                                                    />
                                                </span>
                                                <span>
                                                    <InteractiveIcon
                                                        defaultIcon={
                                                            item.type === "folder"
                                                                ? getFolderIcon(item.color, "grid", false)
                                                                : getFileIcon(item.name)
                                                        }
                                                        className="grid-view-img"
                                                        alt=""
                                                        onDoubleClick={(e) => {
                                                            e.stopPropagation();
                                                            if (item.type === "folder") openFolder(item)
                                                        }}
                                                    />
                                                </span>
                                            </div>

                                            <div className="folder-name">
                                                <p className="file-name mb-0">{item.name}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* <div className="table-cell">
                                        {user._id === item.owner._id ? "Me" : item.owner.name}
                                    </div> */}

                                    <div className="table-cell">
                                        {item.isTrashed ? formatTrashedAt(item.trashedAt) : "—"}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {dragRect && (
                            <div
                                className="drag-selection-box"
                                style={{
                                    left: dragRect.x,
                                    top: dragRect.y,
                                    width: dragRect.width,
                                    height: dragRect.height,
                                }}
                            />
                        )}
                    </div>
                </section>
            </div>


            {/*  here this is context menu when user right click on item  */}
            {itemContextMenu.visible && (
                <div className="custom-context-menu" style={{ position: "fixed", top: itemContextMenu.y, left: itemContextMenu.x }}
                    onClick={() => setItemContextMenu({ visible: false })}>

                    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>

                        {/*  download  */}
                        {/* <li onClick={() => {
                            const selectedItems = Array.from(selectedIds)
                                .map(id => items.find(i => i._id === id))
                                .filter(Boolean)

                            if (selectedItems.length === 1) {
                                const item = selectedItems[0]
                                if (item.type === "file") {
                                    downloadFile(item)
                                } else {
                                    downloadFolder(item)
                                }
                            } else {
                                downloadMultiple(selectedItems)
                            }
                            setItemContextMenu({ visible: false })
                        }}>
                            <button className="dropdown-item">
                                <span className="d-flex align-items-center">
                                    <InteractiveIcon defaultIcon={downloadIcon} className="me-2" width={20} height={20} alt="" />
                                    Download
                                </span>
                            </button>
                        </li> */}


                        {/* restore */}
                        <li onClick={async () => {
                            const selectedArray = Array.from(selectedIds)
                            for (const id of selectedArray) {
                                await restoreItemApi(id, true)
                            }
                            const message = selectedArray.length > 1 ? "Items restored successfully" : "Item restored successfully"
                            showNotification(message, "success", "bottom-center")
                            setSelectedIds(new Set())
                            setItemContextMenu({ visible: false })
                        }}>
                            <button className="dropdown-item">
                                <span className="d-flex align-items-center">
                                    <InteractiveIcon defaultIcon={retryIcon} className="me-2" width={20} height={20} alt="" />
                                    Restore
                                </span>
                            </button>
                        </li>

                        {/*  delete forever  */}
                        <li onClick={() => {
                            setModal({ type: "DeleteForeverModal", data: Array.from(selectedIds) })
                            setItemContextMenu({ visible: false })
                        }}>
                            <button className="dropdown-item">
                                <span className="d-flex align-items-center">
                                    <InteractiveIcon defaultIcon={deleteIcon} className="me-2" width={20} height={20} alt="" />
                                    Delete Forever
                                </span>
                            </button>
                        </li>

                    </ul>

                </div>
            )}

        </>
    )
}

export default TrashContentView