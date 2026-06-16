



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
import fileInfoIcon from "@images/icon/file-info.svg";
import trashEmptyIcon from "@images/icon/trash-icon.svg";



function ContentView({ view, setSearchBarOpen, searchBarOpen, setModal, onItemRefsReady, dragRootRef, displayError, displayLoading, displayItems }) {
    const [filePreview, setFilePreview] = useState(null)
    const itemRefs = useRef({})


    const { items, loading, error, selectedIds, toggleSelect, setSelectedIds, openFolder, highlightedId, changeColorApi, isViewerOnly, sortBy, setSortBy, sortOrder, setSortOrder } = useFileExplorer()
    const { isSearchMode, searchResults, searchLoading, searchError, clearSearch, searchFilters, loadMore, totalCount, loadingMore, searchApi } = useSearch()
    const { user } = useAuth()
    const { downloadFile, downloadFolder, downloadMultiple } = useDownload()

    // ##################################################
    // ---- STEP 1: Context menu state ------------------
    // ##################################################
    const [itemContextMenu, setItemContextMenu] = useState({ visible: false, x: 0, y: 0, isViewerItem: false })
    const [showColorMenu, setShowColorMenu] = useState(false)

    // ##################################################
    // ---- STEP 2: Context menu boundary ref -----------
    // ##################################################
    const contextMenuRef = useRef(null)

    // ##################################################
    // ---- STEP 3: Dynamic Context Menu Positioning ----
    // ##################################################
    useEffect(() => {
        // If the context menu is not meant to be visible or the ref is missing, do nothing
        if (!itemContextMenu.visible || !contextMenuRef.current) return

        // Get the actual HTML element for the context menu
        const menu = contextMenuRef.current
        // Get the physical dimensions (width, height) of the menu
        const menuRect = menu.getBoundingClientRect()

        // Set the initial intended X and Y positions based on mouse click
        let posX = itemContextMenu.x
        let posY = itemContextMenu.y

        // If the menu would overflow off the right side of the screen, snap it back to the left
        if (posX + menuRect.width > window.innerWidth) {
            posX = window.innerWidth - menuRect.width - 10
        }
        // If the menu would overflow off the bottom of the screen, snap it upwards
        if (posY + menuRect.height > window.innerHeight) {
            posY = window.innerHeight - menuRect.height - 10
        }

        // Apply the corrected X and Y coordinates to the DOM element
        menu.style.left = `${posX}px`
        // Ensure the menu never goes off the top edge of the screen
        menu.style.top = `${Math.max(10, posY)}px`
        // Make the menu visible
        menu.style.opacity = "1"
        // Allow the user to interact with the menu
        menu.style.pointerEvents = "auto"
    }, [itemContextMenu.visible, itemContextMenu.x, itemContextMenu.y])

    // ##################################################
    // ---- STEP 4: Last clicked file reference ---------
    // ##################################################
    const lastClick = useRef({});

    const anchorIndex = useRef(null)
    const lastCtrlSelectedIds = useRef(new Set())

    // ##################################################
    // ---- STEP 5: Scroll reference --------------------
    // ##################################################
    const scrollRef = useRef(null)


    //  sorting in list view
    // const [sortColumn, setSortColumn] = useState("date");
    // const [sortOrder, setSortOrder] = useState("desc");





    // ##################################################
    // ---- STEP 6: Drag and select state ---------------
    // ##################################################
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

        // Mark the drag selection process as currently active
        isDragSelectingRef.current = true
        // Record the exact starting X and Y coordinates of the mouse click
        setDragStart({ x: e.clientX, y: e.clientY })
        // Reset any previous drag rectangle shape
        setDragRect(null)
        // Clear any previously selected items before starting a new drag selection
        setSelectedIds(new Set())
    }

    const handleMouseMove = useCallback((e) => {
        if (!isDragSelectingRef.current || !dragStart) return

        // Calculate the dynamic rectangle shape based on mouse movement
        // Using Math.min and Math.abs allows dragging in any direction (up/down/left/right)
        const rect = {
            x: Math.min(e.clientX, dragStart.x),
            y: Math.min(e.clientY, dragStart.y),
            width: Math.abs(e.clientX - dragStart.x),
            height: Math.abs(e.clientY - dragStart.y),
        }

        // Update the visual rectangle box on the screen
        setDragRect(rect)

        // check which items overlap with drag rectangle
        const newSelected = new Set()
        Object.entries(itemRefs.current).forEach(([id, el]) => {
            if (!el) return

            // Get the bounding box of each individual file/folder item
            const itemRect = el.getBoundingClientRect()

            // Calculate if the item's box intersects with our drag rectangle
            const overlaps =
                itemRect.left < rect.x + rect.width &&
                itemRect.right > rect.x &&
                itemRect.top < rect.y + rect.height &&
                itemRect.bottom > rect.y

            // If it overlaps, add this item's ID to our new selection set
            if (overlaps) newSelected.add(id)
        })

        // Update the global state with all currently overlapping items
        setSelectedIds(newSelected)
    }, [dragStart])

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
        // If dragging hasn't started, don't bind any window events
        if (!dragStart) return

        // Listen for the mouse moving anywhere on the screen to draw the drag rectangle
        window.addEventListener("mousemove", handleMouseMove)
        // Listen for the mouse button being released to stop dragging
        window.addEventListener("mouseup", handleMouseUp)

        // Cleanup function to remove event listeners when the component unmounts or drag finishes
        return () => {
            window.removeEventListener("mousemove", handleMouseMove)
            window.removeEventListener("mouseup", handleMouseUp)
        }
    }, [dragStart, handleMouseMove, handleMouseUp])

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


    // ##################################################
    // ---- STEP 7: Deselect all on escape key ----------
    // ##################################################
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Check if the user specifically pressed the "Escape" key
            if (e.key === "Escape") {
                // Clear all selected files and folders
                setSelectedIds(new Set())
                // Hide any open context menus
                setItemContextMenu({ visible: false })
                // Hide the color selection menu if it's open
                setShowColorMenu(false)
            }
        }
        // Attach the global keydown listener to the entire window
        window.addEventListener("keydown", handleKeyDown)

        // Cleanup function to remove the listener to prevent memory leaks
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [setSelectedIds])

    // ##################################################
    // ---- STEP 8: Close context menu on outside click -
    // ##################################################
    useEffect(() => {
        const handleCloseRightClickMenu = (e) => {
            // If the user clicked inside a table row (an actual file/folder item), do nothing
            if (e.target.closest(".table-row")) {
                return;
            }
            // Otherwise, they clicked in an empty space, so close the context menu
            setItemContextMenu({ visible: false })
            // Also close the folder color menu
            setShowColorMenu(false)
        }

        // Listen for normal left clicks anywhere on the window
        window.addEventListener("click", handleCloseRightClickMenu)
        // Listen for right clicks anywhere on the window
        window.addEventListener("contextmenu", handleCloseRightClickMenu)

        // Cleanup function to remove both listeners when component unmounts
        return () => {
            window.removeEventListener("click", handleCloseRightClickMenu)
            window.removeEventListener("contextmenu", handleCloseRightClickMenu)
        }
    })

    //  here whn user hit the bootomRef then this use effect will run to fetch more 



    // ##################################################
    // ---- STEP 9: Auto-scroll to highlighted item -----
    // ##################################################
    useEffect(() => {
        // If there is an item to highlight, and we have the DOM reference for it
        if (highlightedId && itemRefs.current[highlightedId]) {
            // Smoothly scroll the page so the item appears right in the middle
            itemRefs.current[highlightedId].scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }
    }, [highlightedId]);



    useEffect(() => {
        // If the user clears their selection completely
        if (selectedIds.size === 0) {
            // Reset the internal tracker for CTRL-clicks
            lastCtrlSelectedIds.current = new Set()
            // Reset the anchor point used for SHIFT-clicks
            anchorIndex.current = null
        }
    }, [selectedIds])

    // Clear selected checkboxes when toggling search mode
    useEffect(() => {
        // Whenever the user enters or leaves search mode, clear all selected items
        setSelectedIds(new Set())
    }, [isSearchMode, setSelectedIds])


    // ##################################################
    // ---- STEP 10: Double click handler ---------------
    // ##################################################
    const handleItemClick = (item) => {
        // Get the current timestamp to detect double clicks
        const now = Date.now()

        if (item.type === "folder") {
            // If clicked within 400ms of the last click, it's a double click!
            if (lastClick.current[item._id] && now - lastClick.current[item._id] < 400) {
                // Clear any active search before opening the folder
                clearSearch()
                // Close the search bar UI
                setSearchBarOpen(false)
                // Navigate into the folder
                openFolder(item)
            }
            // Update the last click time for this specific item
            lastClick.current[item._id] = now
            return
        } else if (item.type === "file") {
            // Same double-click logic, but for files to open the preview modal
            if (lastClick.current[item._id] && now - lastClick.current[item._id] < 400) {
                // Open the file preview modal
                setFilePreview(item)
            }
            // Update the last click time for this specific file
            lastClick.current[item._id] = now
            return
        }
    }

    // ##################################################
    // ---- STEP 11: Select all checkbox handler --------
    // ##################################################
    const handleCheckBoxSelected = () => {
        // If every single item is already selected
        if (selectedIds.size === displayItems.length) {
            // Uncheck everything by creating a new empty Set
            setSelectedIds(new Set())
        } else {
            // Otherwise, loop through all displayed items and add their IDs to a new Set
            setSelectedIds(new Set(displayItems.map(item => item._id.toString())))
        }
    }


    // ##################################################
    // ---- STEP 12: Checkbox select handler ------------
    // ##################################################
    const handleCheckboxOnly = (e, itemId) => {
        // Prevent the click from triggering parent elements
        e.stopPropagation();

        // Close any open context menus when interacting with checkboxes
        setItemContextMenu({ visible: false })
        setShowColorMenu(false)

        // Find where this item is located in the current display array
        const currentIndex = displayItems.findIndex(item => item._id === itemId);
        // Create a copy of the currently selected IDs
        const newSelected = new Set(selectedIds);

        // Toggle logic: If it's already selected, remove it. Otherwise, add it.
        if (newSelected.has(itemId.toString())) {
            newSelected.delete(itemId.toString());
            lastCtrlSelectedIds.current.delete(itemId.toString());
        } else {
            newSelected.add(itemId.toString());
            lastCtrlSelectedIds.current.add(itemId.toString());
        }

        // Apply the new selection state
        setSelectedIds(newSelected);

        // Reset the anchor if nothing is selected, otherwise set the anchor to this item
        if (newSelected.size === 0) {
            lastCtrlSelectedIds.current = new Set();
            anchorIndex.current = null;
        } else {
            anchorIndex.current = currentIndex;
        }
    };


    // ##################################################
    // ---- STEP 13: Checkbox multi-select handler ------
    // ##################################################
    const handleCheckboxClick = (e, itemId) => {
        // Prevent click from bubbling up and triggering row click events
        e.stopPropagation();

        // Ensure context menus are closed when making selections
        setItemContextMenu({ visible: false })
        setShowColorMenu(false)

        // Find the precise position of the clicked item in our displayed list
        const currentIndex = displayItems.findIndex(item => item._id === itemId);

        // SHIFT → range from anchor, keep ctrl selected items outside range
        if (e.shiftKey && anchorIndex.current !== null) {
            // Find the lowest index to start the selection range
            const start = Math.min(anchorIndex.current, currentIndex);
            // Find the highest index to end the selection range
            const end = Math.max(anchorIndex.current, currentIndex);

            // Create a set containing all item IDs between the start and end indices
            const rangeIds = new Set(
                displayItems
                    .slice(start, end + 1)
                    .map(item => item._id.toString())
            );

            // merge ctrl base with new range
            const newSelected = new Set(lastCtrlSelectedIds.current);
            // Add all newly ranged items to the current selection
            rangeIds.forEach(id => newSelected.add(id));

            // Apply the new combined selection state
            setSelectedIds(newSelected);

        } else if (e.ctrlKey || e.metaKey) {
            // Create a copy of current selections so we can toggle
            const newSelected = new Set(selectedIds);

            // If the item is already selected, unselect it
            if (newSelected.has(itemId.toString())) {
                newSelected.delete(itemId.toString());
                lastCtrlSelectedIds.current.delete(itemId.toString());
            } else {
                // Otherwise, select it
                newSelected.add(itemId.toString());
                lastCtrlSelectedIds.current.add(itemId.toString());
            }

            // Apply the new selection state
            setSelectedIds(newSelected);
            // Set the new anchor index to this item for future shift-clicks
            anchorIndex.current = currentIndex;

        } else {
            // If neither SHIFT nor CTRL is held down, select ONLY this single item
            setSelectedIds(new Set([itemId.toString()]));
            // Reset the base selection to just this item
            lastCtrlSelectedIds.current = new Set([itemId.toString()]);
            // Update the anchor index to this item
            anchorIndex.current = currentIndex;
        }
    };



    // ##################################################
    // ---- STEP 14: Sorting handler --------------------
    // ##################################################
    const handleColumnSort = (column) => {
        // If the user clicked the column we are already sorting by
        if (sortBy === column) {
            // Simply flip the sorting direction between ascending and descending
            setSortOrder(prev => prev === "asc" ? "desc" : "asc")
        } else {
            // Otherwise, set the new active column for sorting
            setSortBy(column)
            // Default the new column to sort in ascending order
            setSortOrder("asc")
        }
    }



    // ##################################################
    // ---- STEP 15: Check if all selected are folders --
    // ##################################################
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

                        {displayItems.length === 0 && !loading && (
                            <div className="no-data-found-single-box-wrapper">
                                <div className="no-data-found-single-box">
                                    <InteractiveIcon defaultIcon={trashEmptyIcon} alt="No folders" />
                                    <p className="text-center text-muted py-3 m-0">
                                        Trash is empty
                                    </p>
                                </div>
                            </div>
                        )}
                        {displayItems.length === 0 && !displayLoading && (
                            <div className="page-empty-state">
                                {isSearchMode ? "No results found" : ""}
                            </div>
                        )}
                        {(() => { console.log("rendering items count:", displayItems.length, "loading:", displayLoading); return null })()}
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
                                    // 1. Check if the current user is a viewer on this specific item
                                    const currentUserId = user?._id || user?.id;
                                    const isSharedWithMe = item.owner?._id?.toString() !== currentUserId?.toString()
                                    const hasViewerRole = item.sharedWith?.some(share =>
                                        (share.userId?._id?.toString() === currentUserId?.toString() || share.user === currentUserId) && share.permission === "viewer"
                                    );

                                    // 2. It is restricted if the folder is restricted OR the item itself is restricted
                                    const itemIsRestricted = isViewerOnly || (isSharedWithMe && hasViewerRole);
                                    setItemContextMenu({
                                        visible: true,
                                        x: e.clientX,
                                        y: e.clientY,
                                        isViewerItem: itemIsRestricted // Save the result into the state!
                                    })
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
                                        {(() => {
                                            if (!item.sharedWith || item.sharedWith.length === 0) return "—"

                                            const names = item.sharedWith.map(s => s.userId?.name).filter(Boolean)
                                            if (names.length === 0) return "—"

                                            if (names.length <= 2) return names.join(", ")

                                            const visible = names.slice(0, 2).join(", ")
                                            const remaining = names.length - 2

                                            // This now prints "Mihir, Raj +1"
                                            return `${visible} +${remaining}`
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
                    }}>

                    {/*  all menu */}
                    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>

                        {/* share */}
                        <li
                            style={{ opacity: itemContextMenu.isViewerItem ? 0.6 : 1, cursor: itemContextMenu.isViewerItem ? "not-allowed" : "pointer" }}
                            onClick={(e) => {
                                if (itemContextMenu.isViewerItem) { e.stopPropagation(); return }
                                if (isViewerOnly) { e.stopPropagation(); return }
                                const selectedItems = displayItems.filter(i => selectedIds.has(i._id.toString()))
                                setModal({ type: "shareUser", data: selectedItems })
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
                            style={{ opacity: itemContextMenu.isViewerItem || selectedIds.size > 1 ? 0.6 : 1, cursor: itemContextMenu.isViewerItem || selectedIds.size > 1 ? "not-allowed" : "pointer" }}
                            onClick={(e) => {
                                if (itemContextMenu.isViewerItem || selectedIds.size > 1) { e.stopPropagation(); return }
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
                            style={{ position: "relative", opacity: itemContextMenu.isViewerItem || !hasFolder ? 0.6 : 1, cursor: itemContextMenu.isViewerItem || !hasFolder ? "not-allowed" : "pointer" }}
                            onClick={(e) => {
                                if (itemContextMenu.isViewerItem || !hasFolder) { e.stopPropagation(); return }
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
                            style={{ opacity: itemContextMenu.isViewerItem ? 0.6 : 1, cursor: itemContextMenu.isViewerItem ? "not-allowed" : "pointer" }}
                            onClick={(e) => {
                                if (itemContextMenu.isViewerItem) { e.stopPropagation(); return }
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

                        {/*  file info */}
                        <li
                            style={{ opacity: selectedIds.size > 1 ? 0.6 : 1, cursor: selectedIds.size > 1 ? "not-allowed" : "pointer" }}
                            onClick={(e) => {
                                if (selectedIds.size > 1) { e.stopPropagation(); return }
                                const selectedItem = displayItems.find(i => i._id === Array.from(selectedIds)[0])
                                if (!selectedItem) return
                                setModal({ type: "ItemInfoModal", data: selectedItem })
                            }}>
                            <button className="dropdown-item" style={{ cursor: "inherit" }}>
                                <span className="d-flex align-items-center">
                                    <InteractiveIcon defaultIcon={fileInfoIcon} className="me-2" width={20} height={20} alt="" />
                                    Info
                                </span>
                            </button>
                        </li>

                        {/*  trash */}
                        <li
                            style={{ opacity: itemContextMenu.isViewerItem ? 0.6 : 1, cursor: itemContextMenu.isViewerItem ? "not-allowed" : "pointer" }}
                            onClick={(e) => {
                                if (itemContextMenu.isViewerItem) { e.stopPropagation(); return }
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





