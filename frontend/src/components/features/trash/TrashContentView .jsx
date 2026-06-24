import InteractiveIcon from "../../layout/InteractiveIcon.jsx";
import checkboxIcon from "@images/icon/checkbox-check.svg";
import squareArrowDownLinearIcon from "@images/icon/square-arrow-down-linear.svg";
import { useEffect, useRef, useState, useCallback } from "react";
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
import { useLocation } from "react-router-dom";


function TrashContentView({ view, setModal, onItemRefsReady, dragRootRef }) {
    const location = useLocation()
    const [highlightedId, setHighlightedId] = useState(null)
    
    useEffect(() => {
        if (location.state?.highlightId) {
            setHighlightedId(location.state.highlightId);
            setTimeout(() => setHighlightedId(null), 2000);
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // Auto-scroll to highlighted item
    useEffect(() => {
        if (highlightedId && itemRefs.current[highlightedId]) {
            itemRefs.current[highlightedId].scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }
    }, [highlightedId]);

    const [filePreview, setFilePreview] = useState(null)
    const { downloadFile, downloadFolder, downloadMultiple } = useDownload()
    const { showNotification } = useNotification()

    const [itemContextMenu, setItemContextMenu] = useState({ visible: false, x: 0, y: 0 })

    const { sortedItems: items, sortBy, setSortBy, sortOrder, setSortOrder, loading, error, selectedIds, setSelectedIds, openFolder, restoreItemApi } = useTrash()

    const { user } = useAuth()

    const lastClick = useRef({});
    const anchorIndex = useRef(null)
    const lastCtrlSelectedIds = useRef(new Set())

    // ##################################################
    // ---- STEP 6: Drag and select state ---------------
    // ##################################################
    const itemRefs = useRef({})
    const [dragStart, setDragStart] = useState(null)
    const [dragRect, setDragRect] = useState(null)
    const isDragSelectingRef = useRef(false)
    const gridContainerRef = useRef(null)
    const scrollRef = useRef(null)

    const lastMousePos = useRef({ clientX: 0, clientY: 0 })

    const handleMouseDown = (e) => {
        if (e.target.closest(".master-header")) return
        if (e.target.closest(".file-preview-modal")) return;
        if (e.target.closest(".table-row")) return
        if (e.target.closest(".table-header")) return
        if (e.target.closest("button, input, textarea, select, a, .custom-context-menu, .search-suggestion-chip, .empty-bin-section")) return
        if (e.button !== 0) return
        isDragSelectingRef.current = true

        // 1. Save the exact physical mouse position
        lastMousePos.current = { clientX: e.clientX, clientY: e.clientY }
        // 2. Calculate drag start relative to the scroll container's content
        const containerRect = gridContainerRef.current.getBoundingClientRect()
        const relativeX = e.clientX - containerRect.left + gridContainerRef.current.scrollLeft
        const relativeY = e.clientY - containerRect.top + gridContainerRef.current.scrollTop
        setDragStart({ x: relativeX, y: relativeY })
        setDragRect(null)
        setSelectedIds(new Set())
    }

    const updateSelection = useCallback(() => {
        if (!isDragSelectingRef.current || !dragStart || !gridContainerRef.current) return;

        const { clientX, clientY } = lastMousePos.current;
        const container = gridContainerRef.current;
        const containerRect = container.getBoundingClientRect();

        // 1. Calculate current mouse position relative to the container
        // Constrain the mouse Y position so it cannot go above the container (into the headers)
        const boundedClientY = Math.max(clientY, containerRect.top);

        const currentX = clientX - containerRect.left + container.scrollLeft;
        const currentY = boundedClientY - containerRect.top + container.scrollTop;

        // 2. Calculate the abstract rectangle in container coordinates
        const containerBox = {
            x: Math.min(currentX, dragStart.x),
            y: Math.min(currentY, dragStart.y),
            width: Math.abs(currentX - dragStart.x),
            height: Math.abs(currentY - dragStart.y),
        };

        // 3. Convert the rectangle BACK to viewport coordinates for collision checking
        const viewportBox = {
            x: containerBox.x + containerRect.left - container.scrollLeft,
            y: containerBox.y + containerRect.top - container.scrollTop,
            width: containerBox.width,
            height: containerBox.height,
            left: containerBox.x + containerRect.left - container.scrollLeft,
            top: containerBox.y + containerRect.top - container.scrollTop,
            right: containerBox.x + containerBox.width + containerRect.left - container.scrollLeft,
            bottom: containerBox.y + containerBox.height + containerRect.top - container.scrollTop,
            containerTop: containerRect.top,
        };

        // Render using fixed viewport coordinates so it doesn't get cropped by the container!
        setDragRect(viewportBox);

        const newSelected = new Set();
        Object.entries(itemRefs.current).forEach(([id, el]) => {
            if (!el) return;
            const itemRect = el.getBoundingClientRect();

            const overlaps =
                itemRect.left < viewportBox.right &&
                itemRect.right > viewportBox.left &&
                itemRect.top < viewportBox.bottom &&
                itemRect.bottom > viewportBox.top;

            if (overlaps) newSelected.add(id);
        });

        setSelectedIds(newSelected);
    }, [dragStart, setSelectedIds]);

    const scrollFrameRef = useRef(null);

    const handleMouseMove = useCallback((e) => {
        lastMousePos.current = {
            clientX: e.clientX,
            clientY: e.clientY
        };
        updateSelection();
    }, [updateSelection]);

    const handleMouseUp = useCallback(() => {
        // Stop the drag selection process
        isDragSelectingRef.current = false
        // Clear the starting coordinates
        setDragStart(null)
        // Remove the visual rectangle box from the screen
        setDragRect(null)
    }, [])
    useEffect(() => {
        onItemRefsReady?.(itemRefs.current)
    })

    useEffect(() => {
        if (!dragStart) return
        const container = gridContainerRef.current;
        if (!container) return;

        const autoScroll = () => {
            if (!isDragSelectingRef.current) return;

            const { clientY } = lastMousePos.current;
            const rect = container.getBoundingClientRect();
            const edge = 60;
            const speed = 15;

            if (clientY > rect.bottom - edge) {
                container.scrollTop += speed;
            } else if (clientY < rect.top + edge) {
                container.scrollTop -= speed;
            }

            scrollFrameRef.current = requestAnimationFrame(autoScroll);
        };

        scrollFrameRef.current = requestAnimationFrame(autoScroll);

        // When the container scrolls, update the selection using the last known mouse position
        const onScroll = () => {
            updateSelection();
        };
        
        window.addEventListener("mousemove", handleMouseMove)
        window.addEventListener("mouseup", handleMouseUp)
        container.addEventListener("scroll", onScroll)
        
        return () => {
            if (scrollFrameRef.current) cancelAnimationFrame(scrollFrameRef.current);
            window.removeEventListener("mousemove", handleMouseMove)
            window.removeEventListener("mouseup", handleMouseUp)
            container.removeEventListener("scroll", onScroll)
        }
    }, [dragStart, handleMouseMove, handleMouseUp, updateSelection])

    useEffect(() => {
        // Grab the container element for the main content area
        const root = dragRootRef?.current
        // If the container doesn't exist yet, do nothing
        if (!root) return

        // Listen for mouse click inside the container to start the drag selection
        root.addEventListener("mousedown", handleMouseDown)

        // Cleanup function to remove the listener when the component unmounts
        return () => {
            root.removeEventListener("mousedown", handleMouseDown)
        }
    }, [dragRootRef, handleMouseDown])

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

            <div
                ref={(el) => {
                    scrollRef.current = el
                    gridContainerRef.current = el
                }}
                onMouseDown={handleMouseDown}
                className={`grid-single-box ${view === "grid" ? "grid-view" : "list-view"}`}
                style={{ position: "relative", userSelect: "none" }}
            >
                {dragRect && dragRect.width > 5 && dragRect.height > 5 && (
                    <div className="drag-selection-box"
                        style={{
                            position: "fixed",
                            zIndex: 10,
                            left: dragRect.x,
                            top: Math.max(dragRect.y, dragRect.containerTop || 0),
                            width: dragRect.width,
                            height: dragRect.y < (dragRect.containerTop || 0) 
                                ? Math.max(0, dragRect.height - ((dragRect.containerTop || 0) - dragRect.y)) 
                                : dragRect.height,
                        }}
                    />
                )}
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
                                    className={`table-row-inner ${selectedIds.has(item._id) ? "selected" : ""} ${highlightedId === item._id ? "highlight-pulse" : ""}`}
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