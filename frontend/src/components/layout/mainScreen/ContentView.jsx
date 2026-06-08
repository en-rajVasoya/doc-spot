



import InteractiveIcon from "../InteractiveIcon";
import checkboxIcon from "@images/icon/checkbox-check.svg";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useFileExplorer } from "../../../context/FileExplorerContext";
import { useAuth } from "../../../context/AuthContext";
import { useSearch } from "../../../context/SearchContext";
import getFileIcon from "../../../utils/getFileIcon.js";
import getFolderIcon from "../../../utils/getFolderIconColor.js";
import FilePreviewModal from "../../features/filePreview/FilePreviewModal.jsx";
import backIcon from "@images/icon/arrow-left-outline-icon.svg";
import Tooltip from "../Tooltip.jsx";
import renameIcon from "@images/icon/rename.svg";
import userPlus from "@images/icon/user-plus.svg";
import moveIcon from "@images/icon/move.svg";
import copyIcon from "@images/icon/copy.svg";
import trashIcon from "@images/icon/trash.svg";
import downloadIcon from "@images/icon/download.svg";
import { useDownload } from "../../../context/DownloadContext.jsx";
import colorIcon from "@images/icon/color.svg";
import squareArrowDownLinearIcon from "@images/icon/square-arrow-down-linear.svg";
import searchIcon from "@images/icon/search.svg";
import closeIcon from "@images/icon/close-icon.svg";


function ContentView({ view, setSearchBarOpen, searchBarOpen, setModal, onItemRefsReady, dragRootRef, displayError, displayLoading, displayItems }) {
    const [filePreview, setFilePreview] = useState(null)
    const itemRefs = useRef({})


    const { items, loading, error, selectedIds, toggleSelect, setSelectedIds, openFolder, highlightedId, changeColorApi, isViewerOnly, sortBy, setSortBy, sortOrder, setSortOrder } = useFileExplorer()
    const { isSearchMode, searchResults, searchLoading, searchError, clearSearch, searchFilters, loadMore, totalCount, loadingMore, searchApi } = useSearch()
    const { user } = useAuth()
    const { downloadFile, downloadFolder, downloadMultiple } = useDownload()

    //  here this state is used for when user right click on the item box so diffrent menu willopen here
    const [itemContextMenu, setItemContextMenu] = useState({ visible: false, x: 0, y: 0 })
    const [showColorMenu, setShowColorMenu] = useState(false)

    //  hee chich file was last clicked here to see 
    const lastClick = useRef({});

    const anchorIndex = useRef(null)
    const lastCtrlSelectedIds = useRef(new Set())

    //  here when user click on back button in the search result so scroll to top here 
    const scrollRef = useRef(null)


    //  sorting in list view
    // const [sortColumn, setSortColumn] = useState("date");
    // const [sortOrder, setSortOrder] = useState("desc");





    //  drag and seelct with mouse state 
    const [dragStart, setDragStart] = useState(null)
    const [dragRect, setDragRect] = useState(null)
    const isDragSelectingRef = useRef(false)
    const gridContainerRef = useRef(null)

    const handleMouseDown = (e) => {
        // do not start marquee from MainHeader area
        if (e.target.closest(".master-header")) return
        if (e.target.closest(".file-preview-modal")) return;

        // only start drag on empty background not on any item
        if (e.target.closest(".table-row")) return
        if (e.target.closest(".table-header")) return
        if (e.target.closest("button, input, textarea, select, a, .custom-context-menu, .search-suggestion-chip")) return
        if (e.button !== 0) return

        isDragSelectingRef.current = true
        setDragStart({ x: e.clientX, y: e.clientY })
        setDragRect(null)
        setSelectedIds(new Set())
    }

    const handleMouseMove = useCallback((e) => {
        if (!isDragSelectingRef.current || !dragStart) return

        const rect = {
            x: Math.min(e.clientX, dragStart.x),
            y: Math.min(e.clientY, dragStart.y),
            width: Math.abs(e.clientX - dragStart.x),
            height: Math.abs(e.clientY - dragStart.y),
        }

        setDragRect(rect)

        // check which items overlap with drag rectangle
        const newSelected = new Set()
        Object.entries(itemRefs.current).forEach(([id, el]) => {
            if (!el) return
            const itemRect = el.getBoundingClientRect()
            const overlaps =
                itemRect.left < rect.x + rect.width &&
                itemRect.right > rect.x &&
                itemRect.top < rect.y + rect.height &&
                itemRect.bottom > rect.y
            if (overlaps) newSelected.add(id)
        })

        setSelectedIds(newSelected)
    }, [dragStart])

    const handleMouseUp = useCallback(() => {
        isDragSelectingRef.current = false
        setDragStart(null)
        setDragRect(null)
    }, [])
    useEffect(() => {
        onItemRefsReady?.(itemRefs.current)
    })


    useEffect(() => {
        if (!dragStart) return
        window.addEventListener("mousemove", handleMouseMove)
        window.addEventListener("mouseup", handleMouseUp)
        return () => {
            window.removeEventListener("mousemove", handleMouseMove)
            window.removeEventListener("mouseup", handleMouseUp)
        }
    }, [dragStart, handleMouseMove, handleMouseUp])

    useEffect(() => {
        const root = dragRootRef?.current
        if (!root) return
        root.addEventListener("mousedown", handleMouseDown)
        return () => {
            root.removeEventListener("mousedown", handleMouseDown)
        }
    }, [dragRootRef, handleMouseDown])


    //  here this will de select all checkbox selected when usr will press esc key here
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                setSelectedIds(new Set())
                setItemContextMenu({ visible: false })
                setShowColorMenu(false)
            }
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [setSelectedIds])

    //  here after right click here if user click on outside then close this right click menu here
    useEffect(() => {
        const handleCloseRightClickMenu = (e) => {
            if (e.target.closest(".table-row")) {
                return;
            }
            setItemContextMenu({ visible: false })
            setShowColorMenu(false)
        }
        window.addEventListener("click", handleCloseRightClickMenu)
        window.addEventListener("contextmenu", handleCloseRightClickMenu)
        return () => {
            window.removeEventListener("click", handleCloseRightClickMenu)
            window.removeEventListener("contextmenu", handleCloseRightClickMenu)
        }
    })

    //  here whn user hit the bootomRef then this use effect will run to fetch more 



    // Auto-scroll to highlighted item
    useEffect(() => {
        if (highlightedId && itemRefs.current[highlightedId]) {
            itemRefs.current[highlightedId].scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }
    }, [highlightedId]);



    useEffect(() => {
        if (selectedIds.size === 0) {
            lastCtrlSelectedIds.current = new Set()
            anchorIndex.current = null
        }
    }, [selectedIds])

    // Clear selected checkboxes when toggling search mode
    useEffect(() => {
        setSelectedIds(new Set())
    }, [isSearchMode, setSelectedIds])


    //  here if user double click on folder or file then run this 
    const handleItemClick = (item) => {
        const now = Date.now()

        if (item.type === "folder") {
            if (lastClick.current[item._id] && now - lastClick.current[item._id] < 400) {
                clearSearch()
                setSearchBarOpen(false)
                openFolder(item)
            }
            lastClick.current[item._id] = now
            return
        } else if (item.type === "file") {
            if (lastClick.current[item._id] && now - lastClick.current[item._id] < 400) {
                setFilePreview(item)
            }
            lastClick.current[item._id] = now
            return
        }
    }

    // here when user seelcts a main check box like all files then seelctt all files id here so user can deletet that item here
    const handleCheckBoxSelected = () => {
        if (selectedIds.size === displayItems.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(displayItems.map(item => item._id.toString())))
        }
    }


    //  if user seeclt some item using check box with mouse click
    const handleCheckboxOnly = (e, itemId) => {
        e.stopPropagation();

        setItemContextMenu({ visible: false })
        setShowColorMenu(false)

        const currentIndex = displayItems.findIndex(item => item._id === itemId);
        const newSelected = new Set(selectedIds);

        if (newSelected.has(itemId.toString())) {
            newSelected.delete(itemId.toString());
            lastCtrlSelectedIds.current.delete(itemId.toString());
        } else {
            newSelected.add(itemId.toString());
            lastCtrlSelectedIds.current.add(itemId.toString());
        }

        setSelectedIds(newSelected);

        if (newSelected.size === 0) {
            lastCtrlSelectedIds.current = new Set();
            anchorIndex.current = null;
        } else {
            anchorIndex.current = currentIndex;
        }
    };


    //  here fi user will select some item with control and shift
    const handleCheckboxClick = (e, itemId) => {
        e.stopPropagation();
        setItemContextMenu({ visible: false })
        setShowColorMenu(false)

        const currentIndex = displayItems.findIndex(item => item._id === itemId);

        // SHIFT → range from anchor, keep ctrl selected items outside range
        if (e.shiftKey && anchorIndex.current !== null) {
            const start = Math.min(anchorIndex.current, currentIndex);
            const end = Math.max(anchorIndex.current, currentIndex);

            const rangeIds = new Set(
                displayItems
                    .slice(start, end + 1)
                    .map(item => item._id.toString())
            );

            // merge ctrl base with new range
            const newSelected = new Set(lastCtrlSelectedIds.current);
            rangeIds.forEach(id => newSelected.add(id));
            setSelectedIds(newSelected);

        } else if (e.ctrlKey || e.metaKey) {
            const newSelected = new Set(selectedIds);

            if (newSelected.has(itemId.toString())) {
                newSelected.delete(itemId.toString());
                lastCtrlSelectedIds.current.delete(itemId.toString());
            } else {
                newSelected.add(itemId.toString());
                lastCtrlSelectedIds.current.add(itemId.toString());
            }

            setSelectedIds(newSelected);
            anchorIndex.current = currentIndex;

        } else {
            setSelectedIds(new Set([itemId.toString()]));
            lastCtrlSelectedIds.current = new Set([itemId.toString()]);
            anchorIndex.current = currentIndex;
        }
    };



    //  sorting here 
    // sorting
    const handleColumnSort = (column) => {
        if (sortBy === column) {
            setSortOrder(prev => prev === "asc" ? "desc" : "asc")
        } else {
            setSortBy(column)
            setSortOrder("asc")
        }
    }



    //  checking here if user selected all item is folders or no t
    const hasFolder =
        selectedIds.size > 0 &&
        Array.from(selectedIds).every(
            id => displayItems.find(i => i._id === id)?.type === "folder"
        )

    if (displayLoading) return (
        <div className="loader-wrapper-box">
            <div className="cma-messages-are-loader-wrapper">
                <span className="loader"></span>
            </div>
        </div>
    )
    if (displayError) return <div className="position-absolute">{displayError}</div>






    return (
        <>
            {filePreview && (
                <FilePreviewModal file={filePreview} onClose={() => setFilePreview(null)} />
            )}

            {/* SEARCH MODE HEADER */}


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
                    <div
                        style={{
                            position: "fixed",
                            left: dragRect.x,
                            top: dragRect.y,
                            width: dragRect.width,
                            height: dragRect.height,
                            backgroundColor: "rgba(26, 115, 232, 0.1)",
                            border: "1px solid rgba(26, 115, 232, 0.8)",
                            borderRadius: "2px",
                            pointerEvents: "none",
                            zIndex: 9999
                        }}
                    />
                )}
                <section className="content-wrapper">
                    <div className="table row">
                        <div className="table-header">
                            <div className="table-cell">
                                <div className="first-cell-data p-0">
                                    {/* list view name column */}
                                    <div className="form-check-group">
                                        <label htmlFor="allcheck">
                                            <InteractiveIcon defaultIcon={checkboxIcon} alt="" />
                                        </label>
                                        <input
                                            type="checkbox"
                                            className="checkbox"
                                            name=""
                                            id="allcheck"
                                            checked={displayItems.length > 0 && selectedIds.size === displayItems.length}
                                            onChange={handleCheckBoxSelected}
                                        />
                                    </div>

                                    <div
                                        className={`sorting-label-text ${sortBy === "name" ? "sorting-active" : ""}`}
                                        onClick={() => handleColumnSort("name")}
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

                            <div className="table-cell">
                                <div className="sorting-label-text">
                                    Owner
                                </div>
                            </div>

                            <div className="table-cell">
                                <div className="sorting-label-text">
                                    Shared
                                </div>
                            </div>

                            <div className="table-cell" onClick={() => handleColumnSort("size")}>
                                <div className={`sorting-label-text ${sortBy === "size" ? "sorting-active" : ""}`}>
                                    Size
                                    <InteractiveIcon
                                        defaultIcon={squareArrowDownLinearIcon}
                                        width={20}
                                        alt=""
                                        className={`sorting-label-icon ${sortBy === "size" ? "visible" : "invisible"} ${sortBy === "size" && sortOrder === "asc" ? "sorting-label-icon--desc" : ""}`}
                                    />
                                </div>
                            </div>

                            <div className="table-cell" onClick={() => handleColumnSort("modified")}>
                                <div className={`sorting-label-text ${sortBy === "modified" ? "sorting-active" : ""}`}>
                                    Date
                                    <InteractiveIcon
                                        defaultIcon={squareArrowDownLinearIcon}
                                        width={20}
                                        alt=""
                                        className={`sorting-label-icon ${sortBy === "modified" ? "visible" : "invisible"} ${sortBy === "modified" && sortOrder === "asc" ? "sorting-label-icon--desc" : ""}`}
                                    />
                                </div>
                            </div>
                        </div>
                        {displayItems.length === 0 && !displayLoading && (
                            <div className="page-empty-state">
                                {isSearchMode ? "No results found" : ""}
                            </div>
                        )}

                        {displayItems.map((item) => (
                            <div
                                key={item._id}
                                ref={el => itemRefs.current[item._id] = el}
                                className="table-row col-xl-2 col-lg-3 col-md-4 col-sm-6 col-6"
                                onClick={() => handleItemClick(item)}
                                onContextMenu={(e) => {
                                    e.preventDefault()
                                    // e.stopPropagation()

                                    if (!selectedIds.has(item._id.toString())) {
                                        setSelectedIds(new Set([item._id.toString()]))
                                    }
                                    setShowColorMenu(false)
                                    setItemContextMenu({ visible: true, x: e.clientX, y: e.clientY })
                                }}
                            >
                                <div
                                    className={`table-row-inner ${selectedIds.has(item._id.toString()) ? "selected" : ""} ${highlightedId === item._id ? "highlight-pulse" : ""}`}
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
                                                    checked={selectedIds.has(item._id.toString())}
                                                    onChange={() => { }}
                                                    onClick={(e) => handleCheckboxOnly(e, item._id)}
                                                />
                                            </div>

                                            <div className="folder-img">
                                                <span>
                                                    <InteractiveIcon
                                                        defaultIcon={
                                                            item.type === "folder"
                                                                ? getFolderIcon(item.color, "list", item.isSharedWithMe || item.isShared)
                                                                : getFileIcon(item.name)
                                                        }
                                                        className="list-view-img"
                                                        alt=""
                                                        onDoubleClick={(e) => {
                                                            e.stopPropagation();
                                                            if (item.type === "folder" && !isSearchMode) {
                                                                openFolder(item);
                                                            }
                                                        }}
                                                    />
                                                </span>
                                                <span>
                                                    <InteractiveIcon
                                                        defaultIcon={
                                                            item.type === "folder"
                                                                ? getFolderIcon(item.color, "grid", item.isSharedWithMe || item.isShared)
                                                                : getFileIcon(item.name)
                                                        }
                                                        className="grid-view-img"
                                                        alt=""
                                                        onDoubleClick={(e) => {
                                                            e.stopPropagation();
                                                            if (item.type === "folder" && !isSearchMode) {
                                                                openFolder(item);
                                                            }
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
                                        <div className="d-flex align-items-center gap-2">
                                            <img
                                                src={user._id === item.owner._id ? (user.profilePic || "/uploadimage/profilepic/u2.jpg") : (item.owner.profilePic || "/uploadimage/profilepic/u2.jpg")}
                                                alt=""
                                                className="rounded-circle"
                                                style={{ width: "24px", height: "24px", objectFit: "cover" }}
                                            />
                                            <span>{user._id === item.owner._id ? "Me" : item.owner.name}</span>
                                        </div>
                                    </div>


                                    <div className="table-cell">
                                        {isSearchMode ? item.locationPath : (() => {
                                            if (!item.sharedWith || item.sharedWith.length === 0) return "—"
                                            const names = item.sharedWith.map(s => s.userId?.name).filter(Boolean)
                                            if (names.length === 0) return "—"
                                            if (names.length <= 2) return names.join(", ")
                                            const visible = names.slice(0, 2).join(", ")
                                            const remaining = names.length - 2
                                            return `${visible} and ${remaining} other${remaining > 1 ? "s" : ""}`
                                        })()}
                                    </div>

                                    {/*  size list */}
                                    <div className="table-cell">
                                        {item.type === "file" && item.fileSize
                                            ? item.fileSize < 1024
                                                ? `${item.fileSize} B`
                                                : item.fileSize < 1024 * 1024
                                                    ? `${(item.fileSize / 1024).toFixed(1)} KB`
                                                    : item.fileSize < 1024 * 1024 * 1024
                                                        ? `${(item.fileSize / (1024 * 1024)).toFixed(1)} MB`
                                                        : `${(item.fileSize / (1024 * 1024 * 1024)).toFixed(1)} GB`
                                            : "—"
                                        }
                                    </div>

                                    {/* date list */}
                                    <div className="table-cell">
                                        {item.updatedAt || item.createdAt
                                            ? new Date(item.updatedAt || item.createdAt).toLocaleDateString("en-GB").replace(/\//g, "-")
                                            : "—"
                                        }
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/*  SPINNER HERE */}

                    </div>
                </section>
            </div>

            {/*  when user click right so this menu will open here */}
            {itemContextMenu.visible && (
                <div className="custom-context-menu" style={{ position: "fixed", top: itemContextMenu.y, left: itemContextMenu.x, overflow: "visible", zIndex: 99999 }}
                    onClick={() => {
                        setItemContextMenu({ visible: false })
                        setShowColorMenu(false)
                    }}>

                    {/*  all menu */}
                    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>

                        {/* share */}
                        <li
                            style={{ opacity: isViewerOnly ? 0.6 : 1, cursor: isViewerOnly ? "not-allowed" : "pointer" }}
                            onClick={(e) => {
                                if (isViewerOnly) { e.stopPropagation(); return }
                                const item = items.find(i => i._id === Array.from(selectedIds)[0])
                                setModal({ type: "shareUser", data: item })
                            }}
                        >
                            <button className="dropdown-item" style={{ cursor: "inherit" }}>
                                <span className="d-flex align-items-center">
                                    <InteractiveIcon defaultIcon={userPlus} className="me-2" width={20} height={20} alt="" />
                                    Share
                                </span>
                            </button>
                        </li>

                        {/*  dwonload here  */}
                        <li onClick={() => {
                            const selectedItems = Array.from(selectedIds)
                                .map(id => displayItems.find(i => i._id === id))
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
                        }}>
                            <span className="d-flex align-items-center">
                                <InteractiveIcon defaultIcon={downloadIcon} className="me-2" width={20} height={20} alt="" />
                                Download
                            </span>
                        </li>

                        {/* rename */}
                        <li
                            style={{ opacity: isViewerOnly || selectedIds.size > 1 ? 0.6 : 1, cursor: isViewerOnly || selectedIds.size > 1 ? "not-allowed" : "pointer" }}
                            onClick={(e) => {
                                if (isViewerOnly || selectedIds.size > 1) { e.stopPropagation(); return }
                                const selectedItem = displayItems.find(i => i._id === Array.from(selectedIds)[0])
                                if (!selectedItem) return
                                setModal({ type: "RenameModal", data: selectedItem })
                            }}>
                            <button className="dropdown-item" style={{ cursor: "inherit" }}>
                                <span className="d-flex align-items-center">
                                    <InteractiveIcon defaultIcon={renameIcon} className="me-2" width={20} height={20} alt="" />
                                    Rename
                                </span>
                            </button>
                        </li>

                        {/* change color */}
                        <li
                            style={{ position: "relative", opacity: isViewerOnly || !hasFolder ? 0.6 : 1, cursor: isViewerOnly || !hasFolder ? "not-allowed" : "pointer" }}
                            onClick={(e) => {
                                if (isViewerOnly || !hasFolder) { e.stopPropagation(); return }
                                e.stopPropagation()
                                setShowColorMenu(prev => !prev)
                            }}>
                            <button className="dropdown-item" style={{ cursor: "inherit" }}>
                                <span className="d-flex align-items-center">
                                    <InteractiveIcon
                                        defaultIcon={colorIcon}
                                        className="me-2"
                                        width={20}
                                        height={20}
                                        alt=""
                                    />
                                    Change Color
                                </span>
                            </button>

                            {hasFolder && showColorMenu && (
                                <div
                                    className="show position-absolute"
                                    style={{
                                        zIndex: 10000,
                                        left: "100%",
                                        top: 0,
                                        minWidth: "226px",
                                        padding: "20px",
                                        background: "var(--white)",
                                        border: "1px solid var(--secondary)",
                                        borderRadius: "8px",
                                        boxShadow: "0px 4px 24px 0px rgba(0,0,0,0.10)"
                                    }}
                                >
                                    <p className="mb-3">Folder Color</p>
                                    <div className="d-flex align-items-center flex-wrap">
                                        {["red", "orange", "yellow", "green", "green-dark", "blue", "violet", "pink", "gray"].map(color => (
                                            <button
                                                key={color}
                                                className="border-0"
                                                style={{
                                                    width: "24px",
                                                    height: "24px",
                                                    borderRadius: "50%",
                                                    margin: "8px",
                                                    backgroundColor: `var(--${color})`
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    changeColorApi(Array.from(selectedIds), color)
                                                    setItemContextMenu({ visible: false })
                                                    setShowColorMenu(false)
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </li>

                        {/*  copy */}
                        <li
                            onClick={() => setModal({ type: "CopyModal", data: Array.from(selectedIds) })}
                        >
                            <button className="dropdown-item" style={{ cursor: "inherit" }}>
                                <span className="d-flex align-items-center">
                                    <InteractiveIcon defaultIcon={copyIcon} className="me-2" width={20} height={20} alt="" />
                                    Copy
                                </span>
                            </button>
                        </li>

                        {/* move */}
                        <li
                            style={{ opacity: isViewerOnly ? 0.6 : 1, cursor: isViewerOnly ? "not-allowed" : "pointer" }}
                            onClick={(e) => {
                                if (isViewerOnly) { e.stopPropagation(); return }
                                setModal({ type: "MoveModal", data: Array.from(selectedIds) })
                            }}>
                            <button className="dropdown-item" style={{ cursor: "inherit" }}>
                                <span className="d-flex align-items-center">
                                    <InteractiveIcon defaultIcon={moveIcon} className="me-2" width={20} height={20} alt="" />
                                    Move
                                </span>
                            </button>
                        </li>

                        {/*  trash */}
                        <li
                            style={{ opacity: isViewerOnly ? 0.6 : 1, cursor: isViewerOnly ? "not-allowed" : "pointer" }}
                            onClick={(e) => {
                                if (isViewerOnly) { e.stopPropagation(); return }
                                setModal({ type: "DeleteModal", data: Array.from(selectedIds) })
                            }}>
                            <button className="dropdown-item" style={{ cursor: "inherit" }}>
                                <span className="d-flex align-items-center">
                                    <InteractiveIcon defaultIcon={trashIcon} className="me-2" width={20} height={20} alt="" />
                                    Trash
                                </span>
                            </button>
                        </li>

                    </ul>

                </div>
            )}

        </>
    )
}

export default ContentView





