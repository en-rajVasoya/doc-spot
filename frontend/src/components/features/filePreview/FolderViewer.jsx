import { useState, useRef, useEffect, useCallback } from "react"
import InteractiveIcon from "../../layout/InteractiveIcon.jsx";
import checkboxIcon from "@images/icon/checkbox-check.svg";
import getFileIcon from "../../../utils/getFileIcon.js";
import getFolderIcon from "../../../utils/getFolderIconColor.js";
import FilePreviewModal from "../../features/filePreview/FilePreviewModal.jsx";
import Tooltip from "../../layout/Tooltip.jsx";
import renameIcon from "@images/icon/rename.svg";
import userPlus from "@images/icon/user-plus.svg";
import moveIcon from "@images/icon/move.svg";
import copyIcon from "@images/icon/copy.svg";
import trashIcon from "@images/icon/trash.svg";
import downloadIcon from "@images/icon/download.svg";
import { useDownload } from "../../../context/DownloadContext.jsx";
import colorIcon from "@images/icon/color.svg";
import squareArrowDownLinearIcon from "@images/icon/square-arrow-down-linear.svg";
import trashEmptyIcon from "@images/icon/trash-icon.svg";
import fileInfoIcon from "@images/icon/file-info.svg";
import menuIcon from "@images/icon/menu.svg";
import gridIcon from "@images/icon/grid.svg";
import Breadcrumbs from "../../features/Breadcrumbs.jsx";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function findFolderById(items, id) {
    for (const item of items) {
        if (item._id === id) return item
        if (item.type === "folder" && Array.isArray(item.children)) {
            const found = findFolderById(item.children, id)
            if (found) return found
        }
    }
    return null
}

function collectFiles(items, APP_URL) {
    const files = []
    for (const item of items) {
        if (item.type !== "folder" && item.storagePath) {
            files.push({ url: `${APP_URL}/${item.storagePath}`, name: item.name })
        }
        if (item.children?.length) {
            files.push(...collectFiles(item.children, APP_URL))
        }
    }
    return files
}

// ─── Main FolderViewer ────────────────────────────────────────────────────────
function FolderViewer({ folder, contents = [], isPublic = false, view: viewProp = "grid", setModal }) {
    const APP_URL = import.meta.env.VITE_BACKEND_URL || ""

    // ── View state (internal, driven by header toggle) ──
    const [view, setView] = useState(viewProp)

    // ── Navigation state ──
    const [currentPath, setCurrentPath] = useState([])

    // ── File preview ──
    const [filePreview, setFilePreview] = useState(null)

    // ── Selection state ──
    const [selectedIds, setSelectedIds] = useState(new Set())
    const anchorIndex = useRef(null)
    const lastCtrlSelectedIds = useRef(new Set())
    const lastClick = useRef({})

    // ── Context menu state ──
    const [itemContextMenu, setItemContextMenu] = useState({ visible: false, x: 0, y: 0, isViewerItem: false })
    const [showColorMenu, setShowColorMenu] = useState(false)
    const contextMenuRef = useRef(null)

    // ── Drag select state ──
    const [dragStart, setDragStart] = useState(null)
    const [dragRect, setDragRect] = useState(null)
    const isDragSelectingRef = useRef(false)
    const itemRefs = useRef({})
    const gridContainerRef = useRef(null)

    // ── Sorting state ──
    const [sortBy, setSortBy] = useState("name")
    const [sortOrder, setSortOrder] = useState("asc")

    const { downloadFile, downloadFolder, downloadMultiple } = useDownload()

    // ── Get current folder contents ──
    const getCurrentFolder = () => {
        if (currentPath.length === 0) {
            return { name: folder?.name || "Shared Folder", items: contents }
        }
        const lastFolderId = currentPath[currentPath.length - 1]
        const foundFolder = findFolderById(contents, lastFolderId)
        return { name: foundFolder?.name || "Folder", items: foundFolder?.children || [] }
    }

    const currentFolder = getCurrentFolder()
    const displayItems = currentFolder.items

    // ── Navigation handlers ──
    const openFolderNav = (folderId) => setCurrentPath([...currentPath, folderId])
    const goHome = () => setCurrentPath([])

    // ── Build trail array for <Breadcrumbs> (same shape SubHeader uses) ──
    // trail = array of { _id, name } for each visited folder, excluding root
    const trail = currentPath.map((pathId) => {
        const folderObj = findFolderById(contents, pathId)
        return { _id: pathId, name: folderObj?.name || "Folder" }
    })

    // navigateTo(index): jump to that position in the trail
    const navigateTo = (index) => {
        setCurrentPath(currentPath.slice(0, index + 1))
    }

    // ── Context menu positioning ──
    useEffect(() => {
        if (!itemContextMenu.visible || !contextMenuRef.current) return
        const menu = contextMenuRef.current
        const menuRect = menu.getBoundingClientRect()
        let posX = itemContextMenu.x
        let posY = itemContextMenu.y
        if (posX + menuRect.width > window.innerWidth) posX = window.innerWidth - menuRect.width - 10
        if (posY + menuRect.height > window.innerHeight) posY = window.innerHeight - menuRect.height - 10
        menu.style.left = `${posX}px`
        menu.style.top = `${Math.max(10, posY)}px`
        menu.style.opacity = "1"
        menu.style.pointerEvents = "auto"
    }, [itemContextMenu.visible, itemContextMenu.x, itemContextMenu.y])

    // ── Escape key ──
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
    }, [])

    // ── Close context menu on outside click ──
    useEffect(() => {
        const handleClose = (e) => {
            if (e.target.closest(".table-row")) return
            setItemContextMenu({ visible: false })
            setShowColorMenu(false)
        }
        window.addEventListener("click", handleClose)
        window.addEventListener("contextmenu", handleClose)
        return () => {
            window.removeEventListener("click", handleClose)
            window.removeEventListener("contextmenu", handleClose)
        }
    })

    // ── Reset anchor on deselect ──
    useEffect(() => {
        if (selectedIds.size === 0) {
            lastCtrlSelectedIds.current = new Set()
            anchorIndex.current = null
        }
    }, [selectedIds])

    // ── Drag select ──
    const handleMouseDown = (e) => {
        if (e.target.closest(".file-preview-modal")) return
        if (e.target.closest(".table-row")) return
        if (e.target.closest(".table-header")) return
        if (e.target.closest("button, input, textarea, select, a, .custom-context-menu")) return
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
        if (!dragStart) return
        window.addEventListener("mousemove", handleMouseMove)
        window.addEventListener("mouseup", handleMouseUp)
        return () => {
            window.removeEventListener("mousemove", handleMouseMove)
            window.removeEventListener("mouseup", handleMouseUp)
        }
    }, [dragStart, handleMouseMove, handleMouseUp])

    // ── Double click to open ──
    const handleItemClick = (item) => {
        const now = Date.now()
        if (item.type === "folder") {
            if (lastClick.current[item._id] && now - lastClick.current[item._id] < 400) {
                openFolderNav(item._id)
            }
            lastClick.current[item._id] = now
        } else if (item.type === "file") {
            if (lastClick.current[item._id] && now - lastClick.current[item._id] < 400) {
                setFilePreview(item)
            }
            lastClick.current[item._id] = now
        }
    }

    // ── Select all ──
    const handleCheckBoxSelected = () => {
        if (selectedIds.size === displayItems.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(displayItems.map(item => item._id.toString())))
        }
    }

    // ── Single checkbox toggle ──
    const handleCheckboxOnly = (e, itemId) => {
        e.stopPropagation()
        setItemContextMenu({ visible: false })
        setShowColorMenu(false)
        const currentIndex = displayItems.findIndex(item => item._id === itemId)
        const newSelected = new Set(selectedIds)
        if (newSelected.has(itemId.toString())) {
            newSelected.delete(itemId.toString())
            lastCtrlSelectedIds.current.delete(itemId.toString())
        } else {
            newSelected.add(itemId.toString())
            lastCtrlSelectedIds.current.add(itemId.toString())
        }
        setSelectedIds(newSelected)
        if (newSelected.size === 0) {
            lastCtrlSelectedIds.current = new Set()
            anchorIndex.current = null
        } else {
            anchorIndex.current = currentIndex
        }
    }

    // ── Shift/ctrl checkbox ──
    const handleCheckboxClick = (e, itemId) => {
        e.stopPropagation()
        setItemContextMenu({ visible: false })
        setShowColorMenu(false)
        const currentIndex = displayItems.findIndex(item => item._id === itemId)
        if (e.shiftKey && anchorIndex.current !== null) {
            const start = Math.min(anchorIndex.current, currentIndex)
            const end = Math.max(anchorIndex.current, currentIndex)
            const rangeIds = new Set(displayItems.slice(start, end + 1).map(item => item._id.toString()))
            const newSelected = new Set(lastCtrlSelectedIds.current)
            rangeIds.forEach(id => newSelected.add(id))
            setSelectedIds(newSelected)
        } else if (e.ctrlKey || e.metaKey) {
            const newSelected = new Set(selectedIds)
            if (newSelected.has(itemId.toString())) {
                newSelected.delete(itemId.toString())
                lastCtrlSelectedIds.current.delete(itemId.toString())
            } else {
                newSelected.add(itemId.toString())
                lastCtrlSelectedIds.current.add(itemId.toString())
            }
            setSelectedIds(newSelected)
            anchorIndex.current = currentIndex
        } else {
            setSelectedIds(new Set([itemId.toString()]))
            lastCtrlSelectedIds.current = new Set([itemId.toString()])
            anchorIndex.current = currentIndex
        }
    }

    // ── Sorting ──
    const handleColumnSort = (column) => {
        if (sortBy === column) {
            setSortOrder(prev => prev === "asc" ? "desc" : "asc")
        } else {
            setSortBy(column)
            setSortOrder("asc")
        }
    }

    const hasFolder =
        selectedIds.size > 0 &&
        Array.from(selectedIds).every(id => displayItems.find(i => i._id === id)?.type === "folder")

    // ── Breadcrumb actions (download only for public; all actions for private) ──
    const actionsList = isPublic ? ["download"] : ["download", "share", "rename", "changeColor", "copy", "move", "info", "trash"]

    return (
        <>
            {filePreview && (
                <FilePreviewModal file={filePreview} onClose={() => setFilePreview(null)} />
            )}

            {/* ── Header ── */}
            <header className="header">
                <div className="header-view d-flex align-items-center justify-content-between">

                    {/* ── Left: Your Breadcrumbs component ── */}
                    <Breadcrumbs
                        trail={trail}
                        onNavigate={navigateTo}
                        onHomeClick={goHome}
                        maxVisible={2}
                        rootLabel={folder?.name || "Shared Folder"}
                        actions={actionsList}
                        setModal={setModal}
                        selectedIds={selectedIds}
                        items={displayItems}
                        currentFolderId={currentPath[currentPath.length - 1] ?? null}
                        downloadFile={downloadFile}
                        downloadFolder={downloadFolder}
                        downloadMultiple={downloadMultiple}
                        isViewerOnly={isPublic}
                    />

                    {/* ── Right: View Toggle ── */}
                    <div className="d-flex align-items-center">
                        <ul className="mb-0 d-flex view-btn">
                            {/* List View Toggle */}
                            <li>
                                <Tooltip text="List View">
                                    <button
                                        className={`btn btn-icon rounded-end-0 ${view === "list" ? "view-active" : ""}`}
                                        onClick={() => setView("list")}
                                    >
                                        <InteractiveIcon defaultIcon={menuIcon} width={20} />
                                    </button>
                                </Tooltip>
                            </li>
                            {/* Grid View Toggle */}
                            <li>
                                <Tooltip text="Grid View">
                                    <button
                                        className={`btn btn-icon rounded-start-0 ${view === "grid" ? "view-active" : ""}`}
                                        onClick={() => setView("grid")}
                                    >
                                        <InteractiveIcon defaultIcon={gridIcon} width={20} />
                                    </button>
                                </Tooltip>
                            </li>
                        </ul>
                    </div>

                </div>
            </header>

            {/* ── Content ── */}
            <div
                ref={gridContainerRef}
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
                                    <div className="form-check-group">
                                        <label htmlFor="allcheck">
                                            <InteractiveIcon defaultIcon={checkboxIcon} alt="" />
                                        </label>
                                        <input
                                            type="checkbox"
                                            className="checkbox"
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
                                <div className="sorting-label-text">Owner</div>
                            </div>
                            <div className="table-cell">
                                <div className="sorting-label-text">Shared</div>
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

                        {displayItems.length === 0 && (
                            <div className="no-data-found-single-box-wrapper">
                                <div className="no-data-found-single-box">
                                    <InteractiveIcon defaultIcon={trashEmptyIcon} alt="No items" />
                                    <p className="text-center text-muted py-3 m-0">This folder is empty</p>
                                </div>
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
                                    if (!selectedIds.has(item._id)) {
                                        setSelectedIds(new Set([item._id]))
                                    }
                                    setItemContextMenu({
                                        visible: true,
                                        x: e.clientX,
                                        y: e.clientY,
                                        isViewerItem: isPublic
                                    })
                                }}
                            >
                                <div
                                    className={`table-row-inner ${selectedIds.has(item._id.toString()) ? "selected" : ""}`}
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
                                                    onChange={() => {}}
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
                                                            e.stopPropagation()
                                                            if (item.type === "folder") openFolderNav(item._id)
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
                                                            e.stopPropagation()
                                                            if (item.type === "folder") openFolderNav(item._id)
                                                        }}
                                                    />
                                                </span>
                                            </div>
                                            <div className="folder-name">
                                                <p className="file-name mb-0">{item.name}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Owner */}
                                    <div className="table-cell">
                                        {isPublic ? (
                                            <span style={{ color: "#5f6368", fontSize: 13 }}>Hidden</span>
                                        ) : (
                                            <div className="d-flex align-items-center gap-2">
                                                <img
                                                    src={item.owner?.profilePic || "/uploadimage/profilepic/u2.jpg"}
                                                    alt=""
                                                    className="rounded-circle"
                                                    style={{ width: "24px", height: "24px", objectFit: "cover" }}
                                                />
                                                <span>{item.owner?.name || "—"}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Shared */}
                                    <div className="table-cell">
                                        {(() => {
                                            if (!item.sharedWith || item.sharedWith.length === 0) return "—"
                                            const names = item.sharedWith.map(s => s.userId?.name).filter(Boolean)
                                            if (names.length === 0) return "—"
                                            if (names.length <= 2) return names.join(", ")
                                            return `${names.slice(0, 2).join(", ")} +${names.length - 2}`
                                        })()}
                                    </div>

                                    {/* Size */}
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

                                    {/* Date */}
                                    <div className="table-cell">
                                        {item.updatedAt || item.createdAt
                                            ? new Date(item.updatedAt || item.createdAt).toLocaleDateString("en-GB").replace(/\//g, "-")
                                            : "—"
                                        }
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {/* ── Context Menu ── */}
            {itemContextMenu.visible && (
                <div
                    ref={contextMenuRef}
                    className="custom-context-menu"
                    style={{
                        position: "fixed",
                        top: itemContextMenu.y,
                        left: itemContextMenu.x,
                        overflow: "visible",
                        zIndex: 99999,
                        opacity: 0,
                        pointerEvents: "none"
                    }}
                    onClick={() => {
                        setItemContextMenu({ visible: false })
                        setShowColorMenu(false)
                    }}
                >
                    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                        {/* Download — always available */}
                        <li onClick={() => {
                            const selectedItems = Array.from(selectedIds)
                                .map(id => displayItems.find(i => i._id === id))
                                .filter(Boolean)
                            if (selectedItems.length === 1) {
                                selectedItems[0].type === "file"
                                    ? downloadFile(selectedItems[0])
                                    : downloadFolder(selectedItems[0])
                            } else {
                                downloadMultiple(selectedItems)
                            }
                        }}>
                            <button className="dropdown-item">
                                <span className="d-flex align-items-center">
                                    <InteractiveIcon defaultIcon={downloadIcon} className="me-2" width={20} height={20} alt="" />
                                    Download
                                </span>
                            </button>
                        </li>

                        {/* Actions hidden for public / viewer-only */}
                        {!isPublic && (
                            <>
                                <li onClick={() => {
                                    const selectedItems = displayItems.filter(i => selectedIds.has(i._id.toString()))
                                    setModal?.({ type: "shareUser", data: selectedItems })
                                }}>
                                    <button className="dropdown-item">
                                        <span className="d-flex align-items-center">
                                            <InteractiveIcon defaultIcon={userPlus} className="me-2" width={20} height={20} alt="" />
                                            Share
                                        </span>
                                    </button>
                                </li>

                                <li
                                    style={{ opacity: selectedIds.size > 1 ? 0.6 : 1, cursor: selectedIds.size > 1 ? "not-allowed" : "pointer" }}
                                    onClick={(e) => {
                                        if (selectedIds.size > 1) { e.stopPropagation(); return }
                                        const selectedItem = displayItems.find(i => i._id === Array.from(selectedIds)[0])
                                        if (!selectedItem) return
                                        setModal?.({ type: "RenameModal", data: selectedItem })
                                    }}
                                >
                                    <button className="dropdown-item" style={{ cursor: "inherit" }}>
                                        <span className="d-flex align-items-center">
                                            <InteractiveIcon defaultIcon={renameIcon} className="me-2" width={20} height={20} alt="" />
                                            Rename
                                        </span>
                                    </button>
                                </li>

                                <li
                                    style={{ position: "relative", opacity: !hasFolder ? 0.6 : 1, cursor: !hasFolder ? "not-allowed" : "pointer" }}
                                    onClick={(e) => {
                                        if (!hasFolder) { e.stopPropagation(); return }
                                        e.stopPropagation()
                                        setShowColorMenu(prev => !prev)
                                    }}
                                >
                                    <button className="dropdown-item" style={{ cursor: "inherit" }}>
                                        <span className="d-flex align-items-center">
                                            <InteractiveIcon defaultIcon={colorIcon} className="me-2" width={20} height={20} alt="" />
                                            Change Color
                                        </span>
                                    </button>
                                    {hasFolder && showColorMenu && (
                                        <div className="show position-absolute" style={{
                                            zIndex: 10000, left: "100%", top: 0, minWidth: "226px",
                                            padding: "20px", background: "var(--white)",
                                            border: "1px solid var(--secondary)", borderRadius: "8px",
                                            boxShadow: "0px 4px 24px 0px rgba(0,0,0,0.10)"
                                        }}>
                                            <p className="mb-3">Folder Color</p>
                                            <div className="d-flex align-items-center flex-wrap">
                                                {["red", "orange", "yellow", "green", "green-dark", "blue", "violet", "pink", "gray"].map(color => (
                                                    <button
                                                        key={color}
                                                        className="border-0"
                                                        style={{ width: "24px", height: "24px", borderRadius: "50%", margin: "8px", backgroundColor: `var(--${color})` }}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setItemContextMenu({ visible: false })
                                                            setShowColorMenu(false)
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </li>

                                <li onClick={() => setModal?.({ type: "CopyModal", data: Array.from(selectedIds) })}>
                                    <button className="dropdown-item">
                                        <span className="d-flex align-items-center">
                                            <InteractiveIcon defaultIcon={copyIcon} className="me-2" width={20} height={20} alt="" />
                                            Copy
                                        </span>
                                    </button>
                                </li>

                                <li onClick={() => setModal?.({ type: "MoveModal", data: Array.from(selectedIds) })}>
                                    <button className="dropdown-item">
                                        <span className="d-flex align-items-center">
                                            <InteractiveIcon defaultIcon={moveIcon} className="me-2" width={20} height={20} alt="" />
                                            Move
                                        </span>
                                    </button>
                                </li>

                                <li
                                    style={{ opacity: selectedIds.size > 1 ? 0.6 : 1, cursor: selectedIds.size > 1 ? "not-allowed" : "pointer" }}
                                    onClick={(e) => {
                                        if (selectedIds.size > 1) { e.stopPropagation(); return }
                                        const selectedItem = displayItems.find(i => i._id === Array.from(selectedIds)[0])
                                        if (!selectedItem) return
                                        setModal?.({ type: "ItemInfoModal", data: selectedItem })
                                    }}
                                >
                                    <button className="dropdown-item" style={{ cursor: "inherit" }}>
                                        <span className="d-flex align-items-center">
                                            <InteractiveIcon defaultIcon={fileInfoIcon} className="me-2" width={20} height={20} alt="" />
                                            Info
                                        </span>
                                    </button>
                                </li>

                                <li onClick={() => setModal?.({ type: "DeleteModal", data: Array.from(selectedIds) })}>
                                    <button className="dropdown-item">
                                        <span className="d-flex align-items-center">
                                            <InteractiveIcon defaultIcon={trashIcon} className="me-2" width={20} height={20} alt="" />
                                            Trash
                                        </span>
                                    </button>
                                </li>
                            </>
                        )}
                    </ul>
                </div>
            )}
        </>
    )
}

export default FolderViewer