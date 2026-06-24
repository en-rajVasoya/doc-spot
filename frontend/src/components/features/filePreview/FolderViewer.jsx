import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { useSearchParams } from "react-router-dom";
import DownloadPanel from "../download/DownloadPanel.jsx";

import InteractiveIcon from "../../layout/InteractiveIcon.jsx"
import checkboxIcon from "@images/icon/checkbox-check.svg"
import getFileIcon from "../../../utils/getFileIcon.js"
import getFolderIcon from "../../../utils/getFolderIconColor.js"
import FilePreviewModal from "../../features/filePreview/FilePreviewModal.jsx"
import Tooltip from "../../layout/Tooltip.jsx"
import renameIcon from "@images/icon/rename.svg"
import squareArrowDownLinearIcon from "@images/icon/square-arrow-down-linear.svg"
import userPlus from "@images/icon/user-plus.svg"
import moveIcon from "@images/icon/move.svg"
import copyIcon from "@images/icon/copy.svg"
import logoIcon from "@images/logo.svg"
import trashIcon from "@images/icon/trash.svg"
import downloadIcon from "@images/icon/download.svg"
import colorIcon from "@images/icon/color.svg"
import trashEmptyIcon from "@images/icon/trash-icon.svg"
import fileInfoIcon from "@images/icon/file-info.svg"
import menuIcon from "@images/icon/menu.svg"
import gridIcon from "@images/icon/grid.svg"
import Breadcrumbs from "../../features/Breadcrumbs.jsx"
import ModifiedContent from "../../layout/header/ModifiedContent.jsx"
import noFilesFound from "@images/icon/no-files-found.svg";
import { useDownload } from "../../../context/DownloadContext.jsx"
import closeIcon from "@images/icon/close.svg"

// Available colors for folders
const FOLDER_COLORS = ["red", "orange", "yellow", "green", "green-dark", "blue", "violet", "pink", "gray"]
// Time limit to count two clicks as a "double click" (in milliseconds)
const DOUBLE_CLICK_MS = 400

// Helper function to dig through nested folders and find a specific folder by its ID
function findFolderById(items, id) {
    for (const item of items) {
        if (item._id === id) return item // Found it!
        // If it's a folder with items inside, search inside those items
        if (item.type === "folder" && Array.isArray(item.children)) {
            const found = findFolderById(item.children, id)
            if (found) return found
        }
    }
    return null // Not found
}

// Converts raw bytes (e.g., 1048576) into human readable sizes (e.g., "1.0 MB")
function formatFileSize(bytes) {
    if (!bytes) return "—"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
    return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}

// Formats a raw date string into a clean "DD-MM-YYYY" format
function formatDate(dateStr) {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString("en-GB").replace(/\//g, "-")
}

// A reusable column header component that shows an up/down arrow when sorting by that column
function SortableHeader({ label, column, sortBy, sortOrder, onSort }) {
    const isActive = sortBy === column
    return (
        <div
            className={`sorting-label-text ${isActive ? "sorting-active" : ""}`}
            onClick={() => onSort(column)} // Click to change sort
        >
            {label}
            {/* Show arrow if active, point down if descending */}
            <InteractiveIcon
                defaultIcon={squareArrowDownLinearIcon}
                width={20}
                alt=""
                className={`sorting-label-icon ${isActive ? "visible" : "invisible"} ${isActive && sortOrder === "asc" ? "sorting-label-icon--desc" : ""}`}
            />
        </div>
    )
}

// A simple popup menu that lets the user pick a color for their folder
function ColorPicker({ onSelect }) {
    return (
        <div
            className="show position-absolute"
            style={{
                zIndex: 10000, left: "100%", top: 0, minWidth: 226, padding: 20,
                background: "var(--white)", border: "1px solid var(--secondary)",
                borderRadius: 8, boxShadow: "0px 4px 24px 0px rgba(0,0,0,0.10)",
            }}
        >
            <p className="mb-3">Folder Color</p>
            <div className="d-flex align-items-center flex-wrap">
                {/* Loop through all available colors and create a colored circle button for each */}
                {FOLDER_COLORS.map(color => (
                    <button
                        key={color}
                        className="border-0"
                        style={{ width: 24, height: 24, borderRadius: "50%", margin: 8, backgroundColor: `var(--${color})` }}
                        onClick={(e) => { e.stopPropagation(); onSelect(color) }}
                    />
                ))}
            </div>
        </div>
    )
}

// The main FolderViewer component that displays files and folders
function FolderViewer({ folder, contents = [], isPublic = false, view: viewProp = "grid", setModal }) {
    // Get download functions from context
    const { downloadFile, downloadFolder, downloadMultiple } = useDownload()

    // Grab the security token from the URL if this is a public shared link
    const [searchParams] = useSearchParams()
    const token = searchParams.get("token")

    // State for how the files look (grid vs list view)
    const [view, setView] = useState(viewProp)
    // Tracks the current folder hierarchy (e.g., [folder1_id, folder2_id])
    const [currentPath, setCurrentPath] = useState([])
    // Stores the file the user double-clicked to preview it
    const [filePreview, setFilePreview] = useState(null)
    // Stores the IDs of all currently selected files/folders
    const [selectedIds, setSelectedIds] = useState(new Set())
    // Tracks the position and visibility of the right-click menu
    const [itemContextMenu, setItemContextMenu] = useState({ visible: false, x: 0, y: 0 })
    // Tracks if the "Change Color" menu is open
    const [showColorMenu, setShowColorMenu] = useState(false)
    // Stores where the user first clicked when they started drag-selecting
    const [dragStart, setDragStart] = useState(null)
    // Stores the current size and position of the drag selection box
    const [dragRect, setDragRect] = useState(null)
    // Tracks what column we are sorting by (name, size, date)
    const [sortBy, setSortBy] = useState("modified")
    // Tracks if sorting is A-Z (asc) or Z-A (desc)
    const [sortOrder, setSortOrder] = useState("asc")

    // Refs for handling shift-click selection logic
    const anchorIndex = useRef(null)
    const lastCtrlSelectedIds = useRef(new Set())
    // Tracks the last time an item was clicked to detect double-clicks
    const lastClick = useRef({})
    // Ref to physically measure the right-click menu so it doesn't go off-screen
    const contextMenuRef = useRef(null)
    
    // --- Refs for Drag and Select ---
    const isDragSelectingRef = useRef(false)
    const itemRefs = useRef({}) // Stores the physical HTML element of every file on screen
    const gridContainerRef = useRef(null) // The container holding the files
    const dragWrapperRef = useRef(null) // The outer window that actually scrolls

    // ── Navigation Logic ──
    // Figures out which folder we are currently looking at based on the currentPath
    const getCurrentFolder = () => {
        if (!currentPath.length) return { name: folder?.name || "Shared Folder", items: contents }
        const lastId = currentPath[currentPath.length - 1]
        const found = findFolderById(contents, lastId)
        return { name: found?.name || "Folder", items: found?.children || [] }
    }
    const { items: rawDisplayItems } = getCurrentFolder()

    const displayItems = useMemo(() => {
        const itemsCopy = [...rawDisplayItems]
        itemsCopy.sort((a, b) => {
            // Folders always come first
            if (a.type !== b.type) return a.type === "folder" ? -1 : 1

            let valA, valB
            if (sortBy === "name") {
                valA = a.name.toLowerCase()
                valB = b.name.toLowerCase()
            } else if (sortBy === "size") {
                valA = a.fileSize || 0;
                valB = b.fileSize || 0;
            } else {
                valA = new Date(a.updatedAt || a.createdAt).getTime()
                valB = new Date(b.updatedAt || b.createdAt).getTime()
            }

            if (valA < valB) return sortOrder === "asc" ? -1 : 1
            if (valA > valB) return sortOrder === "asc" ? 1 : -1
            return new Date(b.createdAt) - new Date(a.createdAt)
        })
        return itemsCopy
    }, [rawDisplayItems, sortBy, sortOrder])

    // Helper functions to move around the folder tree
    const openFolder = (id) => setCurrentPath(prev => [...prev, id]) // Go deeper
    const goHome = () => setCurrentPath([]) // Go back to root
    const navigateTo = (depth) => setCurrentPath(prev => prev.slice(0, depth)) // Jump to a specific breadcrumb
    // Builds the breadcrumb trail at the top of the screen
    const trail = currentPath.map(id => {
        const f = findFolderById(contents, id)
        return { _id: id, name: f?.name || "Folder" }
    })

    // ── UseEffects (Background Tasks) ──

    // 1. Keeps the right-click menu inside the screen boundaries
    useEffect(() => {
        if (!itemContextMenu.visible || !contextMenuRef.current) return
        const menu = contextMenuRef.current
        const { width, height } = menu.getBoundingClientRect()
        const x = Math.min(itemContextMenu.x, window.innerWidth - width - 10)
        const y = Math.max(10, Math.min(itemContextMenu.y, window.innerHeight - height - 10))
        menu.style.left = `${x}px`
        menu.style.top = `${y}px`
        menu.style.opacity = "1"
        menu.style.pointerEvents = "auto"
    }, [itemContextMenu.visible, itemContextMenu.x, itemContextMenu.y])

    // 2. Pressing the Escape key clears all selections and closes menus
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key !== "Escape") return
            setSelectedIds(new Set())
            setItemContextMenu({ visible: false })
            setShowColorMenu(false)
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [])

    // 3. Clicking anywhere outside a file closes the right-click menu
    useEffect(() => {
        const close = (e) => {
            if (e.target.closest(".table-row")) return // Don't close if they clicked a file
            setItemContextMenu({ visible: false })
            setShowColorMenu(false)
        }
        window.addEventListener("click", close)
        window.addEventListener("contextmenu", close)
        return () => {
            window.removeEventListener("click", close)
            window.removeEventListener("contextmenu", close)
        }
    })

    // 4. If all items are deselected, reset the shift-click anchor memory
    useEffect(() => {
        if (selectedIds.size === 0) {
            lastCtrlSelectedIds.current = new Set()
            anchorIndex.current = null
        }
    }, [selectedIds])


    // ── Advanced Drag and Select with Auto-Scroll ──
    const lastMousePos = useRef({ clientX: 0, clientY: 0 }) // Remembers where mouse is
    const scrollFrameRef = useRef(null) // Loop timer for smooth scrolling

    // Triggers when user clicks down on an empty space
    const handleMouseDown = useCallback((e) => {
        if (e.button !== 0) return // Only left click
        // Ignore clicks on headers, buttons, menus, or existing files
        if (e.target.closest(".master-header")) return
        if (e.target.closest(".file-preview-modal")) return
        if (e.target.closest(".table-row")) return
        if (e.target.closest(".table-header")) return
        if (e.target.closest("button, input, textarea, select, a, .custom-context-menu")) return

        isDragSelectingRef.current = true // We are now dragging!
        lastMousePos.current = { clientX: e.clientX, clientY: e.clientY } // Save mouse spot

        // Calculate exact start coordinates based on how far we have scrolled
        const containerRect = dragWrapperRef.current.getBoundingClientRect()
        const relativeX = e.clientX - containerRect.left + dragWrapperRef.current.scrollLeft
        const relativeY = e.clientY - containerRect.top + dragWrapperRef.current.scrollTop
        setDragStart({ x: relativeX, y: relativeY })
        setDragRect(null) // Reset visual box
        setSelectedIds(new Set()) // Clear old selections
    }, [])

    // Recalculates what files are currently inside the selection box
    const updateSelection = useCallback(() => {
        if (!isDragSelectingRef.current || !dragStart || !dragWrapperRef.current) return;

        const { clientX, clientY } = lastMousePos.current;
        const container = dragWrapperRef.current;
        const containerRect = container.getBoundingClientRect();

        // Prevent selection box from going into the top header
        const boundedClientY = Math.max(clientY, containerRect.top);

        const currentX = clientX - containerRect.left + container.scrollLeft;
        const currentY = boundedClientY - containerRect.top + container.scrollTop;

        // Draw the math box of the selection
        const containerBox = {
            x: Math.min(currentX, dragStart.x),
            y: Math.min(currentY, dragStart.y),
            width: Math.abs(currentX - dragStart.x),
            height: Math.abs(currentY - dragStart.y),
        };

        // Convert the math box to exact screen pixels
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

        setDragRect(viewportBox); // Update the visual box on screen

        // Check every file to see if it is touching the selection box
        const newSelected = new Set();
        Object.entries(itemRefs.current).forEach(([id, el]) => {
            if (!el) return;
            const itemRect = el.getBoundingClientRect();

            const overlaps =
                itemRect.left < viewportBox.right &&
                itemRect.right > viewportBox.left &&
                itemRect.top < viewportBox.bottom &&
                itemRect.bottom > viewportBox.top;

            if (overlaps) newSelected.add(id); // Select it if touching
        });

        setSelectedIds(newSelected);
    }, [dragStart, setSelectedIds]);

    // Triggers every time the mouse moves
    const handleMouseMove = useCallback((e) => {
        lastMousePos.current = {
            clientX: e.clientX,
            clientY: e.clientY
        };
        updateSelection();
    }, [updateSelection]);

    // Triggers when user lets go of mouse click
    const handleMouseUp = useCallback(() => {
        isDragSelectingRef.current = false // Stop dragging
        setDragStart(null)
        setDragRect(null) // Hide the visual box
    }, [])

    // Attaches the drag listener to the background wrapper
    useEffect(() => {
        const el = dragWrapperRef.current
        if (!el) return
        el.addEventListener("mousedown", handleMouseDown)
        return () => el.removeEventListener("mousedown", handleMouseDown)
    }, [handleMouseDown])

    // Handles scrolling the page if the mouse gets close to the top or bottom edges
    useEffect(() => {
        if (!dragStart) return
        const container = dragWrapperRef.current;
        if (!container) return;

        const autoScroll = () => {
            if (!isDragSelectingRef.current) return;

            const { clientY } = lastMousePos.current;
            const rect = container.getBoundingClientRect();
            const edge = 60; // Start scrolling when mouse is 60px from edge
            const speed = 15; // Scroll speed

            if (clientY > rect.bottom - edge) {
                container.scrollTop += speed; // Scroll down
            } else if (clientY < rect.top + edge) {
                container.scrollTop -= speed; // Scroll up
            }

            // Keep looping this smooth animation
            scrollFrameRef.current = requestAnimationFrame(autoScroll);
        };

        scrollFrameRef.current = requestAnimationFrame(autoScroll);

        const onScroll = () => updateSelection();
        
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


    // ── Click Handlers ──

    // Handles double clicking a file/folder to open it
    const handleItemClick = (item) => {
        const now = Date.now()
        // Check if the time between clicks was fast enough to be a double click
        const isDoubleClick = lastClick.current[item._id] && now - lastClick.current[item._id] < DOUBLE_CLICK_MS
        lastClick.current[item._id] = now
        
        if (!isDoubleClick) return
        
        if (item.type === "folder") openFolder(item._id) // Open folder
        else if (item.type === "file") setFilePreview(item) // Preview file
    }

    // Handles clicking the master checkbox at the top to select all items
    const handleSelectAll = () => {
        setSelectedIds(prev =>
            prev.size === displayItems.length
                ? new Set() // Deselect all if everything is already selected
                : new Set(displayItems.map(i => i._id.toString())) // Select all
        )
    }

    // Handles clicking a single checkbox directly (ignores shift/ctrl modifiers)
    const handleCheckboxOnly = (e, itemId) => {
        e.stopPropagation() // Stop click from triggering row click
        setItemContextMenu({ visible: false })
        setShowColorMenu(false)
        const strId = itemId.toString()
        const idx = displayItems.findIndex(i => i._id === itemId)
        
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(strId)) {
                next.delete(strId) // Deselect if already selected
                lastCtrlSelectedIds.current.delete(strId)
            } else {
                next.add(strId) // Select it
                lastCtrlSelectedIds.current.add(strId)
            }
            if (!next.size) {
                lastCtrlSelectedIds.current = new Set()
                anchorIndex.current = null
            } else {
                anchorIndex.current = idx // Remember this spot for shift-clicking later
            }
            return next
        })
    }

    // Handles Shift-Click and Ctrl-Click complex selections
    const handleCheckboxClick = (e, itemId) => {
        e.stopPropagation()
        setItemContextMenu({ visible: false })
        setShowColorMenu(false)
        const strId = itemId.toString()
        const idx = displayItems.findIndex(i => i._id === itemId)
        
        if (e.shiftKey && anchorIndex.current !== null) {
            // Shift click: Select everything between last click and this click
            const start = Math.min(anchorIndex.current, idx)
            const end = Math.max(anchorIndex.current, idx)
            const rangeIds = displayItems.slice(start, end + 1).map(i => i._id.toString())
            setSelectedIds(() => {
                const next = new Set(lastCtrlSelectedIds.current)
                rangeIds.forEach(id => next.add(id))
                return next
            })
        } else if (e.ctrlKey || e.metaKey) {
            // Ctrl/Command click: Add or remove this single item from current selection
            setSelectedIds(prev => {
                const next = new Set(prev)
                if (next.has(strId)) {
                    next.delete(strId)
                    lastCtrlSelectedIds.current.delete(strId)
                } else {
                    next.add(strId)
                    lastCtrlSelectedIds.current.add(strId)
                }
                return next
            })
            anchorIndex.current = idx
        } else {
            // Normal click: Select ONLY this item
            lastCtrlSelectedIds.current = new Set([strId])
            anchorIndex.current = idx
            setSelectedIds(new Set([strId]))
        }
    }

    // Handles clicking the Name/Size/Date headers to sort the list
    const handleSort = (column) => {
        if (sortBy === column) setSortOrder(prev => prev === "asc" ? "desc" : "asc") // Reverse order
        else { setSortBy(column); setSortOrder("asc") } // Change column, default to asc
    }

    // Handles downloading the currently selected files/folders
    const downloadSelected = () => {
        // Find the actual item objects based on the selected IDs
        const items = Array.from(selectedIds).map(id => displayItems.find(i => i._id === id)).filter(Boolean)
        
        if (items.length === 1) {
            // Download single file or single folder
            items[0].type === "file" ? downloadFile(items[0]) : downloadFolder(items[0])
        } else {
            // Zip and download multiple items
            downloadMultiple(items)
        }
    }

    // Helper checks for the right-click menu options
    const allFoldersSelected = selectedIds.size > 0 &&
        Array.from(selectedIds).every(id => displayItems.find(i => i._id === id)?.type === "folder")
    const singleSelected = selectedIds.size === 1
        ? displayItems.find(i => i._id === Array.from(selectedIds)[0])
        : null

    return (
        <div className="folder-viewer-page">
            {/* Show PDF/Image preview if a file is double clicked */}
            {filePreview && <FilePreviewModal file={filePreview} onClose={() => setFilePreview(null)} />}

            {/* ── Top Header Bar ── */}
            <div className="max-width-base-header">
                <div className="master-header">
                    <div className="d-flex align-items-center justify-content-between">
                        {/* Logo */}
                        <div className="logo-section">
                            <a className="logo" onClick={() => navigate("/dashboard")}>
                                <InteractiveIcon defaultIcon={logoIcon} alt="" />
                            </a>
                        </div>
                        
                        {/* Right side tools (Selection count & Download button) */}
                        <div className="d-flex align-items-center">
                            {/* Shows "X selected" and an X button to clear selection */}
                            {/* {selectedIds.size !== 0 && (
                                <div className="selection-count d-flex align-items-center me-4">
                                    <span className="cursor-pointer me-2" onClick={() => setSelectedIds(new Set())}>
                                        <InteractiveIcon defaultIcon={closeIcon} width={24} alt="Close" />
                                    </span>
                                    {selectedIds.size} selected
                                </div>
                            )} */}
                            {/* The Download Button */}
                            <ul className="mb-0 tools d-flex" style={{ listStyle: "none", padding: 0 }}>
                                <li className="d-flex align-items-center justify-content-center">
                                    <button 
                                        className="preview-btn preview-btn-text m-0 d-flex align-items-center justify-content-center" 
                                        onClick={downloadSelected}
                                        disabled={selectedIds.size === 0}
                                        style={{ height: "40px", padding: "0 16px" }}
                                    >
                                        <InteractiveIcon
                                            defaultIcon={downloadIcon}
                                            alt="Download"
                                            className="me-2"
                                            width={20}
                                        />
                                        Download
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                {/* Secondary Header (Breadcrumbs and View Toggle) */}
                <header className="header">
                    <div className="header-view d-flex align-items-center justify-content-between">
                        {/* Folder path trail (e.g. Shared Folder > Subfolder) */}
                        <Breadcrumbs
                            trail={trail}
                            onNavigate={navigateTo}
                            onHomeClick={goHome}
                            maxVisible={2}
                            rootLabel={folder?.name || "Shared Folder"}
                            setModal={setModal}
                            selectedIds={selectedIds}
                            items={displayItems}
                            currentFolderId={currentPath[currentPath.length - 1] ?? null}
                            downloadFile={downloadFile}
                            downloadFolder={downloadFolder}
                            downloadMultiple={downloadMultiple}
                            isViewerOnly={isPublic}
                        />
                        {/* List/Grid View Toggle Buttons */}
                        <div className="d-flex align-items-center">
                            <ul className="mb-0 d-flex view-btn">
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

                {/* Grid View Sorting Dropdown */}
                {view === "grid" && (
                    <ModifiedContent
                        displayItems={displayItems}
                        sortBy={sortBy}
                        setSortBy={setSortBy}
                        sortOrder={sortOrder}
                        setSortOrder={setSortOrder}
                        selectedIds={selectedIds}
                        setSelectedIds={setSelectedIds}
                    />
                )}
            </div>

            {/* ── Main Content Area ── */}
            {/* The outer div that scrolls and catches drag events */}
            <div className="content-view-wrapper" ref={dragWrapperRef}>
                {/* The inner div that holds the grid/list */}
                <div className="max-width-base" ref={gridContainerRef}>
                    <div
                        className={`grid-single-box ${view === "grid" ? "grid-view" : "list-view"}`}
                        style={{ position: "relative", userSelect: "none" }}
                    >
                        {/* The gray visual drag selection rectangle */}
                        {dragRect?.width > 5 && dragRect?.height > 5 && (
                            <div className="drag-selection-box"
                                style={{
                                    position: "fixed",
                                    zIndex: 9999,
                                    left: dragRect.x,
                                    top: Math.max(dragRect.y, dragRect.containerTop || 0),
                                    width: dragRect.width,
                                    // Math to hide the box if it scrolls under the header
                                    height: dragRect.y < (dragRect.containerTop || 0) 
                                        ? Math.max(0, dragRect.height - ((dragRect.containerTop || 0) - dragRect.y)) 
                                        : dragRect.height,
                                    pointerEvents: "none",
                                }}
                            />
                        )}
                        
                        <section className="content-wrapper">
                            <div className="table row">
                                {/* ── Table Columns Header ── */}
                                <div className="table-header">
                                    <div className="table-cell">
                                        <div className="first-cell-data p-0">
                                            {/* Master Checkbox (Select All) */}
                                            <div className="form-check-group">
                                                <label htmlFor="allcheck">
                                                    <InteractiveIcon defaultIcon={checkboxIcon} alt="" />
                                                </label>
                                                <input
                                                    type="checkbox"
                                                    className="checkbox"
                                                    id="allcheck"
                                                    checked={displayItems.length > 0 && selectedIds.size === displayItems.length}
                                                    onChange={handleSelectAll}
                                                />
                                            </div>
                                            <SortableHeader label="Name" column="name" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                                        </div>
                                    </div>
                                    <div className="table-cell">
                                        <SortableHeader label="Size" column="size" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                                    </div>
                                    <div className="table-cell">
                                        <SortableHeader label="Date" column="modified" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                                    </div>
                                </div>

                                {/* ── Empty Folder State ── */}
                                {displayItems.length === 0 && (
                                    <div className="no-data-found-single-box-wrapper">
                                        <div className="no-data-found-single-box">
                                            <InteractiveIcon defaultIcon={noFilesFound} alt="No items" />
                                            <p className="text-center text-muted py-3 m-0">This folder is empty</p>
                                        </div>
                                    </div>
                                )}

                                {/* ── File/Folder Items ── */}
                                {displayItems.map((item) => {
                                    const strId = item._id.toString()
                                    const isSelected = selectedIds.has(strId)
                                    return (
                                        // The outer box for each item
                                        <div
                                            key={item._id}
                                            ref={el => itemRefs.current[item._id] = el}
                                            className="table-row col-xl-2 col-lg-3 col-md-4 col-sm-6 col-6"
                                            onClick={() => handleItemClick(item)} // Handle double clicks
                                            onContextMenu={(e) => {
                                                // Handle right clicks to open the context menu
                                                e.preventDefault()
                                                if (!selectedIds.has(item._id)) setSelectedIds(new Set([item._id]))
                                                setItemContextMenu({ visible: true, x: e.clientX, y: e.clientY })
                                            }}
                                        >
                                            {/* The inner styled box for each item */}
                                            <div
                                                className={`table-row-inner ${isSelected ? "selected" : ""}`}
                                                onClick={(e) => {
                                                    // Handle Ctrl/Shift clicks directly on the background
                                                    if (e.ctrlKey || e.metaKey || e.shiftKey) handleCheckboxClick(e, item._id)
                                                }}
                                                style={{ userSelect: "none" }}
                                            >
                                                {/* Name and Icon Cell */}
                                                <div className="table-cell">
                                                    <div className="first-cell-data p-0">
                                                        {/* Individual Checkbox */}
                                                        <div className="form-check-group">
                                                            <label htmlFor={`item-${item._id}`}>
                                                                <InteractiveIcon defaultIcon={checkboxIcon} alt="" />
                                                            </label>
                                                            <input
                                                                type="checkbox"
                                                                className="checkbox"
                                                                id={`item-${item._id}`}
                                                                checked={isSelected}
                                                                onChange={() => { }}
                                                                onClick={(e) => handleCheckboxOnly(e, item._id)}
                                                            />
                                                        </div>
                                                        {/* Item Icon (Folder or File icon based on type) */}
                                                        <div className="folder-img">
                                                            {["list", "grid"].map(mode => (
                                                                <span key={mode}>
                                                                    <InteractiveIcon
                                                                        defaultIcon={
                                                                            item.type === "folder"
                                                                                ? getFolderIcon(item.color, mode, item.isSharedWithMe || item.isShared)
                                                                                : getFileIcon(item.name)
                                                                        }
                                                                        className={`${mode}-view-img`}
                                                                        alt=""
                                                                        onDoubleClick={(e) => {
                                                                            // Make sure double-clicking the icon opens the folder too
                                                                            e.stopPropagation()
                                                                            if (item.type === "folder") openFolder(item._id)
                                                                        }}
                                                                    />
                                                                </span>
                                                            ))}
                                                        </div>
                                                        <div className="folder-name">
                                                            <p className="file-name mb-0">{item.name}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Size Cell */}
                                                <div className="table-cell">
                                                    {item.type === "file" ? formatFileSize(item.fileSize) : "—"}
                                                </div>
                                                {/* Date Cell */}
                                                <div className="table-cell">
                                                    {formatDate(item.updatedAt || item.createdAt)}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            {/* ── Right-Click Context Menu ── */}
            {itemContextMenu.visible && (
                <div
                    ref={contextMenuRef}
                    className="custom-context-menu"
                    style={{ position: "fixed", top: itemContextMenu.y, left: itemContextMenu.x, overflow: "visible", zIndex: 99999, opacity: 0, pointerEvents: "none" }}
                    onClick={() => { setItemContextMenu({ visible: false }); setShowColorMenu(false) }}
                >
                    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                        {/* Download Option only for viewer */}
                        <li onClick={downloadSelected}>
                            <button className="dropdown-item">
                                <span className="d-flex align-items-center">
                                    <InteractiveIcon defaultIcon={downloadIcon} className="me-2" width={20} height={20} alt="" />
                                    Download
                                </span>
                            </button>
                        </li>
                        {/* The following options are only visible if the user OWNS the folder (not a public link) */}
                        {!isPublic && (
                            <>
                                <li onClick={() => setModal?.({ type: "shareUser", data: displayItems.filter(i => selectedIds.has(i._id.toString())) })}>
                                    <button className="dropdown-item">
                                        <span className="d-flex align-items-center">
                                            <InteractiveIcon defaultIcon={userPlus} className="me-2" width={20} height={20} alt="" />
                                            Share
                                        </span>
                                    </button>
                                </li>
                                <li
                                    style={{ opacity: !singleSelected ? 0.6 : 1, cursor: !singleSelected ? "not-allowed" : "pointer" }}
                                    onClick={(e) => {
                                        if (!singleSelected) { e.stopPropagation(); return }
                                        setModal?.({ type: "RenameModal", data: singleSelected })
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
                                    style={{ position: "relative", opacity: !allFoldersSelected ? 0.6 : 1, cursor: !allFoldersSelected ? "not-allowed" : "pointer" }}
                                    onClick={(e) => {
                                        if (!allFoldersSelected) { e.stopPropagation(); return }
                                        e.stopPropagation()
                                        setShowColorMenu(prev => !prev) // Toggle color picker submenu
                                    }}
                                >
                                    <button className="dropdown-item" style={{ cursor: "inherit" }}>
                                        <span className="d-flex align-items-center">
                                            <InteractiveIcon defaultIcon={colorIcon} className="me-2" width={20} height={20} alt="" />
                                            Change Color
                                        </span>
                                    </button>
                                    {/* Color Picker Submenu */}
                                    {allFoldersSelected && showColorMenu && (
                                        <ColorPicker onSelect={() => { setItemContextMenu({ visible: false }); setShowColorMenu(false) }} />
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
                                    style={{ opacity: !singleSelected ? 0.6 : 1, cursor: !singleSelected ? "not-allowed" : "pointer" }}
                                    onClick={(e) => {
                                        if (!singleSelected) { e.stopPropagation(); return }
                                        setModal?.({ type: "ItemInfoModal", data: singleSelected })
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
            <DownloadPanel />
        </div>
    )
}

export default FolderViewer