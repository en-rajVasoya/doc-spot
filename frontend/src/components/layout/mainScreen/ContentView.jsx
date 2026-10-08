
import InteractiveIcon from "../InteractiveIcon";
import UserAvatar from "../../layout/UserAvatar.jsx";
import checkboxIcon from "@images/icon/checkbox-check.svg";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useFileExplorer } from "../../../context/FileExplorerContext";
import { useAuth } from "../../../context/AuthContext";
import { useSearch } from "../../../context/SearchContext";
import getFileIcon from "../../../utils/getFileIcon.js";
import getFolderIcon from "../../../utils/getFolderIconColor.js";
import FilePreviewModal from "../../features/filePreview/FilePreviewModal.jsx";
import { useDragSelect } from "../../../hooks/useDragSelect";
import Breadcrumbs from "../../features/Breadcrumbs.jsx";
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
import noFilesFound from "@images/icon/no-files-found.svg";
import { useNavigate, useLocation } from "react-router-dom";
import axiosApi from "../../../utils/api.js";
import useResponsive from "../../../hooks/useResponsive";


function ContentView({ view, setSearchBarOpen, searchBarOpen, setModal, onItemRefsReady, dragRootRef, displayError, displayLoading, displayItems }) {
    const [filePreview, setFilePreview] = useState(null)
    const itemRefs = useRef({})
    const lastHandledKeyRef = useRef(null)

    const { items, loading, error, selectedIds, toggleSelect, setSelectedIds, openFolder, highlightedId, setHighlightedId, changeColorApi, isViewerOnly, sortBy, setSortBy, sortOrder, setSortOrder, triggerHighlight, prepareNavigation, fetchItems } = useFileExplorer()
    const { isSearchMode, searchResults, searchLoading, searchError, clearSearch, searchFilters, loadMore, totalCount, loadingMore, searchApi } = useSearch()
    const { user } = useAuth()
    const { downloadFile, downloadFolder, downloadMultiple } = useDownload()
    const { isMobile } = useResponsive()

    const navigate = useNavigate()
    const location = useLocation()
    const [searchItemTrail, setSearchItemTrail] = useState([])
    const [searchItemRootLabel, setSearchItemRootLabel] = useState("My Docspot")
    const [loadingSearchTrail, setLoadingSearchTrail] = useState(false)

    const loadMoreObserverRef = useRef(null)
    const [scrollContainer, setScrollContainer] = useState(null)

    useEffect(() => {
        if (displayLoading) return;
        setSelectedIds(prev => {
            if (prev.size === 0) return prev
            const validIds = new Set(displayItems.map(item => item._id.toString()))
            const next = new Set([...prev].filter(id => validIds.has(id)))
            return next.size === prev.size ? prev : next
        })
    }, [displayItems, displayLoading, setSelectedIds])


    useEffect(() => {
        if (!scrollContainer) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && isSearchMode && loadMore) {
                loadMore();
            }
        }, {
            root: scrollContainer,
            rootMargin: "300px"
        });

        if (loadMoreObserverRef.current) {
            observer.observe(loadMoreObserverRef.current);
        }

        return () => observer.disconnect();
    }, [isSearchMode, loadMore, scrollContainer]);

    const [showSpinner, setShowSpinner] = useState(false);
    useEffect(() => {
        let timer;
        if (displayLoading) {
            timer = setTimeout(() => setShowSpinner(true), 150)
        } else {
            setShowSpinner(false)
        }
        return () => clearTimeout(timer)
    }, [displayLoading])


    useEffect(() => {
        if (!isSearchMode || selectedIds.size !== 1) {
            setSearchItemTrail([])
            return
        }

        const selectedId = Array.from(selectedIds)[0]
        const selectedItem = displayItems.find(item => item._id?.toString() === selectedId?.toString())

        if (!selectedItem) {
            setSearchItemTrail([])
            return
        }

        const parentId = selectedItem.parent
        const currentUserId = user?._id || user?.id

        const isOwn = selectedItem.owner?._id?.toString() === currentUserId?.toString()
        let rootLabel = "My Docspot"
        if (selectedItem.isTrashed) {
            rootLabel = "Trash"
        } else if (selectedItem.locationPath) {
            if (selectedItem.locationPath.startsWith("Trash")) {
                rootLabel = "Trash"
            } else if (selectedItem.locationPath.startsWith("Shared with me")) {
                rootLabel = "Shared with me"
            } else if (selectedItem.locationPath.startsWith("Shared")) {
                rootLabel = "Shared"
            }
        } else if (!isOwn) {
            rootLabel = "Shared with me"
        }

        setSearchItemRootLabel(rootLabel)

        if (!parentId) {
            if (selectedItem.type === "folder") {
                setSearchItemTrail([{
                    id: selectedItem._id,
                    name: selectedItem.name,
                    color: selectedItem.color,
                    isShared: selectedItem.isShared,
                    isSharedWithMe: selectedItem.owner?._id?.toString() !== currentUserId?.toString()
                }])
            } else {
                setSearchItemTrail([])
            }
            return
        }

        setLoadingSearchTrail(true)
        axiosApi.get(`/file/folder/${parentId}`)
            .then(({ data }) => {
                const fetchedTrail = data.trail.map(t => ({
                    id: t.id,
                    name: t.name,
                    color: t.color,
                    isShared: t.isShared,
                    isSharedWithMe: t.isSharedWithMe
                }))
                if (selectedItem.type === "folder") {
                    fetchedTrail.push({
                        id: selectedItem._id,
                        name: selectedItem.name,
                        color: selectedItem.color,
                        isShared: selectedItem.isShared,
                        isSharedWithMe: selectedItem.owner?._id?.toString() !== currentUserId?.toString()
                    })
                }
                setSearchItemTrail(fetchedTrail)
            })
            .catch(err => {
                setSearchItemTrail([])
            })
            .finally(() => {
                setLoadingSearchTrail(false)
            })
    }, [selectedIds, isSearchMode, displayItems, user])

    const handleHomeClick = useCallback(() => {
        const selectedId = Array.from(selectedIds)[0]
        const selectedItem = displayItems.find(item => item._id?.toString() === selectedId?.toString())
        if (!selectedItem) return
        const currentUserId = user?._id || user?.id
        const isOwn = selectedItem.owner?._id?.toString() === currentUserId?.toString()
        let targetRoute = "/dashboard"
        if (selectedItem.isTrashed) {
            targetRoute = "/trash-dashboard"
        } else if (selectedItem.locationPath) {
            if (selectedItem.locationPath.startsWith("Trash")) {
                targetRoute = "/trash-dashboard"
            } else if (selectedItem.locationPath.startsWith("Shared with me")) {
                targetRoute = "/shared-with-me"
            } else if (selectedItem.locationPath.startsWith("Shared")) {
                targetRoute = "/shared"
            }
        } else if (!isOwn) {
            targetRoute = "/shared-with-me"
        }

        if (searchItemTrail.length > 0) {
            triggerHighlight(searchItemTrail[0].id)
        } else {
            triggerHighlight(selectedItem._id)
        }

        clearSearch()
        setSearchBarOpen(false)

        if (window.location.pathname === targetRoute) {
            fetchItems()
        } else {
            prepareNavigation()
            navigate(targetRoute, { state: { highlightId: selectedItem._id } })
        }
    }, [selectedIds, displayItems, user, navigate, clearSearch, setSearchBarOpen, searchItemTrail, triggerHighlight, prepareNavigation, fetchItems])


    const handleNavigate = useCallback((depth) => {
        const folder = searchItemTrail[depth - 1]
        if (!folder) return

        const selectedId = Array.from(selectedIds)[0]
        const selectedItem = displayItems.find(item => item._id?.toString() === selectedId?.toString())
        if (!selectedItem) return

        if (selectedItem.type === "folder" && folder.id?.toString() === selectedItem._id?.toString()) {
            triggerHighlight(selectedItem._id)

            prepareNavigation()
            clearSearch()
            setSearchBarOpen(false)

            const currentUserId = user?._id || user?.id
            const isOwn = selectedItem.owner?._id?.toString() === currentUserId?.toString()
            let targetRoute = "/dashboard"
            if (selectedItem.isTrashed) {
                targetRoute = "/trash-dashboard"
            } else if (selectedItem.locationPath) {
                if (selectedItem.locationPath.startsWith("Trash")) {
                    targetRoute = "/trash-dashboard"
                } else if (selectedItem.locationPath.startsWith("Shared with me")) {
                    targetRoute = "/shared-with-me"
                } else if (selectedItem.locationPath.startsWith("Shared")) {
                    targetRoute = "/shared"
                }
            } else if (!isOwn) {
                targetRoute = "/shared-with-me"
            }
            if (selectedItem.parent) {
                navigate(`${targetRoute}/folder/${selectedItem.parent}`, { state: { highlightId: selectedItem._id } })
            } else {
                navigate(targetRoute, { state: { highlightId: selectedItem._id } })
            }
            return
        }

        const childToHighlight = searchItemTrail[depth]
        if (childToHighlight) {
            triggerHighlight(childToHighlight.id)
        } else {
            triggerHighlight(selectedItem._id)
        }

        const currentUserId = user?._id || user?.id
        const isOwn = selectedItem.owner?._id?.toString() === currentUserId?.toString()
        let targetRoute = "/dashboard"
        if (selectedItem.isTrashed) {
            targetRoute = "/trash-dashboard"
        } else if (selectedItem.locationPath) {
            if (selectedItem.locationPath.startsWith("Trash")) {
                targetRoute = "/trash-dashboard"
            } else if (selectedItem.locationPath.startsWith("Shared with me")) {
                targetRoute = "/shared-with-me"
            } else if (selectedItem.locationPath.startsWith("Shared")) {
                targetRoute = "/shared"
            }
        } else if (!isOwn) {
            targetRoute = "/shared-with-me"
        }

        prepareNavigation()
        clearSearch()
        setSearchBarOpen(false)
        navigate(`${targetRoute}/folder/${folder.id}`, { state: { highlightId: childToHighlight ? childToHighlight.id : selectedItem._id } })
    }, [searchItemTrail, selectedIds, displayItems, user, navigate, clearSearch, setSearchBarOpen, triggerHighlight, prepareNavigation])


    // ##################################################
    // ---- STEP 1: Context menu state ------------------
    // ##################################################
    const [itemContextMenu, setItemContextMenu] = useState({ visible: false, x: 0, y: 0 })
    const [showColorMenu, setShowColorMenu] = useState(false)

    // ---- Derived live permission check (NOT frozen state) ----
    const isViewerItem = (() => {
        if (selectedIds.size === 0) return false
        const currentUserId = String(user?._id || user?.id)

        return Array.from(selectedIds).some(id => {
            const item = displayItems.find(i => i._id === id);
            if (!item) return true;

            // 1. If the current user OWNS this item, they always have full permissions on it!
            if (String(item.owner?._id || item.owner) === currentUserId) {
                return false;
            }

            // 2. Check if the current user has an explicit permission on this specific item
            const userPermission = item.sharedWith?.find(
                s => String(s.userId?._id || s.userId || s) === currentUserId
            );
            if (userPermission) {
                return userPermission.permission === "viewer";
            }
            // 3. If no explicit permission on the item, fall back to the folder's permission
            return isViewerOnly;
        });
    })()



    // ##################################################
    // ---- STEP 2: Context menu boundary ref -----------
    // ##################################################
    const contextMenuRef = useRef(null)

    // ##################################################
    // ---- STEP 3: Dynamic Context Menu Positioning ----
    // ##################################################
    useEffect(() => {
        if (!itemContextMenu.visible || !contextMenuRef.current) return

        const menu = contextMenuRef.current
        const menuRect = menu.getBoundingClientRect()

        let posX = itemContextMenu.x
        let posY = itemContextMenu.y

        if (posX + menuRect.width > window.innerWidth) {
            posX = window.innerWidth - menuRect.width - 10
        }
        if (posY + menuRect.height > window.innerHeight) {
            posY = window.innerHeight - menuRect.height - 10
        }

        menu.style.left = `${posX}px`
        menu.style.top = `${Math.max(10, posY)}px`
        menu.style.opacity = "1"
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
    const autoScrollRef = useRef(null);

    // ##################################################
    // ---- STEP 6: Drag and select state ---------------
    // ##################################################
    const { dragRect, handleMouseDown, gridContainerRef } = useDragSelect({
        dragRootRef,
        displayItems,
        selectedIds,
        setSelectedIds,
        itemRefs,
        onItemRefsReady
    })


    // ##################################################
    // ---- STEP 7: Deselect all on escape key ----------
    // ##################################################
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




    // ##################################################
    // ---- STEP 8: Close context menu on outside click -
    // ##################################################
    useEffect(() => {
        const handleCloseRightClickMenu = (e) => {
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

    //  if other user un share item adn when currnt user open thsi context menu so auto close this 
    useEffect(() => {
        if (!itemContextMenu) return

        const stillExists = Array.from(selectedIds).some(id =>
            displayItems.some(item => item._id?.toString() === id?.toString())
        )

        if (selectedIds.size === 0 || !stillExists) {
            setItemContextMenu({ visible: false })
            setShowColorMenu(false)
        }
    }, [displayItems, selectedIds, itemContextMenu.visible])

    // ##################################################
    // ---- STEP 9: Auto-scroll to highlighted item -----
    // ##################################################
    useEffect(() => {
        if (highlightedId && itemRefs.current[highlightedId] && scrollRef.current) {
            const container = scrollRef.current;
            const element = itemRefs.current[highlightedId];
            // Calculate element position relative ONLY to the inner scroll container
            const containerRect = container.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            const relativeTop = elementRect.top - containerRect.top;
            const targetScrollTop = container.scrollTop + relativeTop - (container.clientHeight / 2) + (elementRect.height / 2);
            // Scroll ONLY the inner files container
            container.scrollTo({
                top: Math.max(0, targetScrollTop),
                behavior: "smooth"
            });
            // Lock window to top so the header space can NEVER shift
            window.scrollTo(0, 0);
            const timer = setTimeout(() => {
                setHighlightedId(null);
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [highlightedId, displayItems, setHighlightedId]);

    // Listen for highlightId passed through router navigation (from notifications, search, upload panel)
    useEffect(() => {
        const targetId = location.state?.highlightId;
        if (!targetId || displayLoading) return;
        if (lastHandledKeyRef.current === location.key) return;
        const exists = displayItems?.some(item => item._id?.toString() === targetId.toString());
        if (exists) {
            lastHandledKeyRef.current = location.key;
            triggerHighlight(targetId);
            window.history.replaceState({}, document.title);
        }
    }, [location.state?.highlightId, location.key, displayLoading, displayItems, triggerHighlight]);

    useEffect(() => {
        if (selectedIds.size === 0) {
            lastCtrlSelectedIds.current = new Set()
            anchorIndex.current = null
        }
    }, [selectedIds])

    useEffect(() => {
        setSelectedIds(new Set())
    }, [isSearchMode, setSelectedIds])


    // ##################################################
    // ---- STEP 10: Double click handler ---------------
    // ##################################################
    const handleItemClick = (item) => {
        if (item.isTrashed) return;
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

    // ##################################################
    // ---- STEP 11: Select all checkbox handler --------
    // ##################################################
    const handleCheckBoxSelected = () => {
        if (selectedIds.size === displayItems.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(displayItems.map(item => item._id.toString())))
        }
    }

    // ##################################################
    // ---- STEP 12: Checkbox select handler ------------
    // ##################################################
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

    // ##################################################
    // ---- STEP 13: Checkbox multi-select handler ------
    // ##################################################
    const handleCheckboxClick = (e, itemId) => {
        e.stopPropagation();

        setItemContextMenu({ visible: false })
        setShowColorMenu(false)

        const currentIndex = displayItems.findIndex(item => item._id === itemId);

        if (e.shiftKey && anchorIndex.current !== null) {
            const start = Math.min(anchorIndex.current, currentIndex);
            const end = Math.max(anchorIndex.current, currentIndex);

            const rangeIds = new Set(
                displayItems
                    .slice(start, end + 1)
                    .map(item => item._id.toString())
            );

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


    // ##################################################
    // ---- STEP 14: Sorting handler --------------------
    // ##################################################
    const handleColumnSort = (column) => {
        if (sortBy === column) {
            setSortOrder(prev => prev === "asc" ? "desc" : "asc")
        } else {
            setSortBy(column)
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

    const isSelectionTrashed =
        selectedIds.size > 0 &&
        Array.from(selectedIds).every(
            id => displayItems.find(i => i._id === id)?.isTrashed
        )

    if (showSpinner) return (
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

            <div
                key={isSearchMode ? "search-view" : "folder-view"}
                ref={(el) => {
                    scrollRef.current = el
                    gridContainerRef.current = el
                    if (el && el !== scrollContainer) {
                        setScrollContainer(el);
                    }
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
                <section className={`content-wrapper ${isMobile && selectedIds.size > 0 ? "has-selection" : ""}`}>
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
                                    <InteractiveIcon defaultIcon={noFilesFound} alt="No folders" />
                                    <p className="text-center text-muted py-3 m-0">
                                        No items found
                                    </p>
                                </div>
                            </div>
                        )}
                        {displayItems.length === 0 && !displayLoading && (
                            <div className="page-empty-state">
                                {isSearchMode ? "" : ""}
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
                                    e.stopPropagation()
                                    window.dispatchEvent(new Event("close-global-menu"));


                                    if (!selectedIds.has(item._id)) {
                                        setSelectedIds(new Set([item._id]))
                                    }

                                    if (isMobile) return;

                                    setItemContextMenu({
                                        visible: true,
                                        x: e.clientX,
                                        y: e.clientY
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

                                    <div className="table-cell">
                                        <div className="folder-name-single-box">
                                            <div className='profile-single-box'>
                                                <UserAvatar user={item.owner?._id?.toString() === (user?._id || user?.id)?.toString() ? user : item.owner} />
                                            </div>
                                            <span>{item.owner?._id?.toString() === (user?._id || user?.id)?.toString() ? "Me" : item.owner.name}</span>
                                        </div>
                                    </div>


                                    <div className="table-cell">
                                        {(() => {
                                            if (!item.sharedWith || item.sharedWith.length === 0) return "—"

                                            const names = item.sharedWith.map(s => s.userId?.name || s.name).filter(Boolean)
                                            if (names.length === 0) return "—"

                                            if (names.length <= 2) return names.join(", ")

                                            const visible = names.slice(0, 2).join(", ")
                                            const remaining = names.length - 2

                                            return `${visible} +${remaining}`
                                        })()}
                                    </div>

                                    <div className="table-cell">
                                        {(() => {
                                            const size = item.type === "folder" ? (item.totalSize || 0) : item.fileSize;
                                            if (size === undefined || size === null) return "—";
                                            if (size < 1024) return `${size} B`;
                                            if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
                                            if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
                                            return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
                                        })()}
                                    </div>

                                    <div className="table-cell">
                                        {item.updatedAt || item.createdAt
                                            ? new Date(item.updatedAt || item.createdAt).toLocaleDateString("en-GB").replace(/\//g, "-")
                                            : "—"
                                        }
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div
                            ref={loadMoreObserverRef}
                            style={{
                                gridColumn: '1 / -1',
                                width: '100%',
                                height: '10px'
                            }}
                        />

                        {loadingMore && (
                            <div
                                className="loader-wrapper-box"
                                style={{
                                    gridColumn: '1 / -1',
                                    width: '100%',
                                    position: 'relative',
                                    top: 'auto',
                                    left: 'auto',
                                    transform: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '20px 0'
                                }}
                            >
                                <div className="cma-messages-are-loader-wrapper">
                                    <span className="loader"></span>
                                </div>
                            </div>
                        )}

                    </div>
                </section>
            </div>

            {itemContextMenu.visible && (() => {
                return (
                    <div
                        ref={contextMenuRef}
                        className="custom-context-menu"
                        style={{
                            top: itemContextMenu.y,
                            left: itemContextMenu.x,
                        }}
                        onClick={() => {
                            setItemContextMenu({ visible: false })
                            setShowColorMenu(false)
                        }}>

                        <ul>
                            {/* share */}
                            <li
                                style={{
                                    opacity: isViewerItem || selectedIds.size > 1 || isSelectionTrashed ? 0.6 : 1,
                                    cursor: isViewerItem || selectedIds.size > 1 || isSelectionTrashed ? "not-allowed" : "pointer"
                                }}
                                onClick={(e) => {
                                    if (isViewerItem || selectedIds.size > 1 || isSelectionTrashed) { e.stopPropagation(); return }

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

                            {/* download */}
                            <li
                                style={{
                                    opacity: isSelectionTrashed ? 0.6 : 1,
                                    cursor: isSelectionTrashed ? "not-allowed" : "pointer"
                                }}
                                onClick={(e) => {
                                    if (isSelectionTrashed) { e.stopPropagation(); return }
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
                                }}
                            >
                                <span className="d-flex align-items-center">
                                    <InteractiveIcon defaultIcon={downloadIcon} className="me-2" width={20} height={20} alt="" />
                                    Download
                                </span>
                            </li>

                            {/* rename */}
                            <li
                                style={{
                                    opacity: isViewerItem || selectedIds.size > 1 || isSelectionTrashed ? 0.6 : 1,
                                    cursor: isViewerItem || selectedIds.size > 1 || isSelectionTrashed ? "not-allowed" : "pointer"
                                }}
                                onClick={(e) => {
                                    if (isViewerItem || selectedIds.size > 1 || isSelectionTrashed) { e.stopPropagation(); return }
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
                                style={{
                                    position: "relative",
                                    opacity: isViewerItem || !hasFolder || isSelectionTrashed ? 0.6 : 1,
                                    cursor: isViewerItem || !hasFolder || isSelectionTrashed ? "not-allowed" : "pointer"
                                }}
                                onClick={(e) => {
                                    if (isViewerItem || !hasFolder || isSelectionTrashed) { e.stopPropagation(); return }
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
                                            minWidth: "175px",
                                            padding: "12px",
                                            background: "var(--white)",
                                            border: "1px solid var(--secondary)",
                                            borderRadius: "8px",
                                            boxShadow: "0px 4px 24px 0px rgba(0,0,0,0.10)"
                                        }}
                                    >
                                        <p className="mb-2 text-nowrap" style={{ fontSize: "12px", color: "var(--dark-50)", textAlign: "left" }}>
                                            Folder Color
                                        </p>
                                        <div
                                            style={{
                                                display: "grid",
                                                gridTemplateColumns: "repeat(5, 1fr)",
                                                gap: "8px",
                                                justifyItems: "center"
                                            }}
                                        >
                                            {["red", "orange", "yellow", "green", "green-dark", "blue", "violet", "pink", "gray"].map(color => (
                                                <button
                                                    key={color}
                                                    className="border-0"
                                                    style={{
                                                        position: "relative",
                                                        display: "block",
                                                        width: "24px",
                                                        height: "24px",
                                                        borderRadius: "50%",
                                                        outline: "1px solid var(--dark-20)",
                                                        outlineOffset: "-1px",
                                                        padding: 0,
                                                        cursor: "pointer",
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

                            {/* copy */}
                            <li
                                style={{
                                    opacity: isViewerItem || isSelectionTrashed ? 0.6 : 1,
                                    cursor: isViewerItem || isSelectionTrashed ? "not-allowed" : "pointer"
                                }}
                                onClick={(e) => {
                                    if (isViewerItem || isSelectionTrashed) { e.stopPropagation(); return }
                                    setModal({ type: "CopyModal", data: Array.from(selectedIds) })
                                }}>
                                <button className="dropdown-item" style={{ cursor: "inherit" }}>
                                    <span className="d-flex align-items-center">
                                        <InteractiveIcon defaultIcon={copyIcon} className="me-2" width={20} height={20} alt="" />
                                        Copy
                                    </span>
                                </button>
                            </li>

                            {/* move */}
                            <li
                                style={{
                                    opacity: isViewerItem || isSelectionTrashed ? 0.6 : 1,
                                    cursor: isViewerItem || isSelectionTrashed ? "not-allowed" : "pointer"
                                }}
                                onClick={(e) => {
                                    if (isViewerItem || isSelectionTrashed) { e.stopPropagation(); return }
                                    setModal({ type: "MoveModal", data: Array.from(selectedIds) })
                                }}>
                                <button className="dropdown-item" style={{ cursor: "inherit" }}>
                                    <span className="d-flex align-items-center">
                                        <InteractiveIcon defaultIcon={moveIcon} className="me-2" width={20} height={20} alt="" />
                                        Move
                                    </span>
                                </button>
                            </li>

                            {/* file info */}
                            <li
                                style={{
                                    opacity: selectedIds.size > 1 || isSelectionTrashed ? 0.6 : 1,
                                    cursor: selectedIds.size > 1 || isSelectionTrashed ? "not-allowed" : "pointer"
                                }}
                                onClick={(e) => {
                                    if (selectedIds.size > 1 || isSelectionTrashed) { e.stopPropagation(); return }
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

                            {/* trash */}
                            <li
                                style={{
                                    opacity: isViewerItem || isSelectionTrashed ? 0.6 : 1,
                                    cursor: isViewerItem || isSelectionTrashed ? "not-allowed" : "pointer"
                                }}
                                onClick={(e) => {
                                    if (isViewerItem || isSelectionTrashed) { e.stopPropagation(); return }
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
                );
            })()}

            {isSearchMode && selectedIds.size === 1 && (
                <div className="header pb-0 mt-3 search-location-breadcrumbs" style={{ zIndex: 10 }}>
                    <div className="header-view">
                        <Breadcrumbs
                            trail={searchItemTrail}
                            onNavigate={handleNavigate}
                            onHomeClick={handleHomeClick}
                            rootLabel={searchItemRootLabel}
                            maxVisible={2}
                            actions={[]}
                        />
                    </div>
                </div>
            )}

        </>
    )
}

export default ContentView