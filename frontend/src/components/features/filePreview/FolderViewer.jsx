// import { useState, useRef, useEffect, useCallback } from "react"
// import InteractiveIcon from "../../layout/InteractiveIcon.jsx"
// import checkboxIcon from "@images/icon/checkbox-check.svg"
// import getFileIcon from "../../../utils/getFileIcon.js"
// import getFolderIcon from "../../../utils/getFolderIconColor.js"
// import FilePreviewModal from "../../features/filePreview/FilePreviewModal.jsx"
// import Tooltip from "../../layout/Tooltip.jsx"
// import renameIcon from "@images/icon/rename.svg"
// import squareArrowDownLinearIcon from "@images/icon/square-arrow-down-linear.svg"
// import userPlus from "@images/icon/user-plus.svg"
// import moveIcon from "@images/icon/move.svg"
// import copyIcon from "@images/icon/copy.svg"
// import logoIcon from "@images/logo.svg"
// import trashIcon from "@images/icon/trash.svg"
// import downloadIcon from "@images/icon/download.svg"
// import colorIcon from "@images/icon/color.svg"
// import trashEmptyIcon from "@images/icon/trash-icon.svg"
// import fileInfoIcon from "@images/icon/file-info.svg"
// import menuIcon from "@images/icon/menu.svg"
// import gridIcon from "@images/icon/grid.svg"
// import Breadcrumbs from "../../features/Breadcrumbs.jsx"
// import { useDownload } from "../../../context/DownloadContext.jsx"

// // ─── Constants ─────────────────────────────────────────────────────────────────

// const FOLDER_COLORS = ["red", "orange", "yellow", "green", "green-dark", "blue", "violet", "pink", "gray"]
// const DOUBLE_CLICK_MS = 400

// // ─── Helpers ───────────────────────────────────────────────────────────────────

// function findFolderById(items, id) {
//     for (const item of items) {
//         if (item._id === id) return item
//         if (item.type === "folder" && Array.isArray(item.children)) {
//             const found = findFolderById(item.children, id)
//             if (found) return found
//         }
//     }
//     return null
// }

// function formatFileSize(bytes) {
//     if (!bytes) return "—"
//     if (bytes < 1024) return `${bytes} B`
//     if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
//     if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
//     return `${(bytes / 1024 ** 3).toFixed(1)} GB`
// }

// function formatDate(dateStr) {
//     if (!dateStr) return "—"
//     return new Date(dateStr).toLocaleDateString("en-GB").replace(/\//g, "-")
// }

// function formatSharedWith(sharedWith) {
//     if (!sharedWith?.length) return "—"
//     const names = sharedWith.map(s => s.userId?.name).filter(Boolean)
//     if (!names.length) return "—"
//     if (names.length <= 2) return names.join(", ")
//     return `${names.slice(0, 2).join(", ")} +${names.length - 2}`
// }

// // ─── Sub-components ────────────────────────────────────────────────────────────

// function SortableHeader({ label, column, sortBy, sortOrder, onSort }) {
//     const isActive = sortBy === column
//     return (
//         <div
//             className={`sorting-label-text ${isActive ? "sorting-active" : ""}`}
//             onClick={() => onSort(column)}
//         >
//             {label}
//             <InteractiveIcon
//                 defaultIcon={squareArrowDownLinearIcon}
//                 width={20}
//                 alt=""
//                 className={`sorting-label-icon ${isActive ? "visible" : "invisible"} ${isActive && sortOrder === "asc" ? "sorting-label-icon--desc" : ""}`}
//             />
//         </div>
//     )
// }

// function OwnerCell({ item, isPublic }) {
//     if (isPublic) return <span style={{ color: "#5f6368", fontSize: 13 }}>Hidden</span>
//     return (
//         <div className="d-flex align-items-center gap-2">
//             <img
//                 src={item.owner?.profilePic || "/uploadimage/profilepic/u2.jpg"}
//                 alt=""
//                 className="rounded-circle"
//                 style={{ width: 24, height: 24, objectFit: "cover" }}
//             />
//             <span>{item.owner?.name || "—"}</span>
//         </div>
//     )
// }

// function ColorPicker({ onSelect }) {
//     return (
//         <div
//             className="show position-absolute"
//             style={{
//                 zIndex: 10000,
//                 left: "100%",
//                 top: 0,
//                 minWidth: 226,
//                 padding: 20,
//                 background: "var(--white)",
//                 border: "1px solid var(--secondary)",
//                 borderRadius: 8,
//                 boxShadow: "0px 4px 24px 0px rgba(0,0,0,0.10)",
//             }}
//         >
//             <p className="mb-3">Folder Color</p>
//             <div className="d-flex align-items-center flex-wrap">
//                 {FOLDER_COLORS.map(color => (
//                     <button
//                         key={color}
//                         className="border-0"
//                         style={{
//                             width: 24,
//                             height: 24,
//                             borderRadius: "50%",
//                             margin: 8,
//                             backgroundColor: `var(--${color})`,
//                         }}
//                         onClick={(e) => { e.stopPropagation(); onSelect(color) }}
//                     />
//                 ))}
//             </div>
//         </div>
//     )
// }

// // ─── Main Component ────────────────────────────────────────────────────────────

// function FolderViewer({ folder, contents = [], isPublic = false, view: viewProp = "grid", setModal }) {
//     const APP_URL = import.meta.env.VITE_BACKEND_URL || ""
//     const { downloadFile, downloadFolder, downloadMultiple } = useDownload()

//     // ── State ──
//     const [view, setView] = useState(viewProp)
//     const [currentPath, setCurrentPath] = useState([])
//     const [filePreview, setFilePreview] = useState(null)
//     const [selectedIds, setSelectedIds] = useState(new Set())
//     const [itemContextMenu, setItemContextMenu] = useState({ visible: false, x: 0, y: 0 })
//     const [showColorMenu, setShowColorMenu] = useState(false)
//     const [dragStart, setDragStart] = useState(null)
//     const [dragRect, setDragRect] = useState(null)
//     const [sortBy, setSortBy] = useState("name")
//     const [sortOrder, setSortOrder] = useState("asc")

//     // ── Refs ──
//     const anchorIndex = useRef(null)
//     const lastCtrlSelectedIds = useRef(new Set())
//     const lastClick = useRef({})
//     const contextMenuRef = useRef(null)
//     const isDragSelectingRef = useRef(false)
//     const itemRefs = useRef({})
//     const gridContainerRef = useRef(null)

//     // ── Navigation ──
//     const getCurrentFolder = () => {
//         if (!currentPath.length) return { name: folder?.name || "Shared Folder", items: contents }
//         const lastId = currentPath[currentPath.length - 1]
//         const found = findFolderById(contents, lastId)
//         return { name: found?.name || "Folder", items: found?.children || [] }
//     }

//     const { name: currentFolderName, items: displayItems } = getCurrentFolder()

//     const openFolder = (id) => setCurrentPath(prev => [...prev, id])
//     const goHome = () => setCurrentPath([])
//     const navigateTo = (index) => setCurrentPath(prev => prev.slice(0, index + 1))

//     const trail = currentPath.map(id => {
//         const f = findFolderById(contents, id)
//         return { _id: id, name: f?.name || "Folder" }
//     })

//     // ── Context menu positioning ──
//     useEffect(() => {
//         if (!itemContextMenu.visible || !contextMenuRef.current) return
//         const menu = contextMenuRef.current
//         const { width, height } = menu.getBoundingClientRect()
//         let x = Math.min(itemContextMenu.x, window.innerWidth - width - 10)
//         let y = Math.max(10, Math.min(itemContextMenu.y, window.innerHeight - height - 10))
//         menu.style.left = `${x}px`
//         menu.style.top = `${y}px`
//         menu.style.opacity = "1"
//         menu.style.pointerEvents = "auto"
//     }, [itemContextMenu.visible, itemContextMenu.x, itemContextMenu.y])

//     // ── Global keyboard handler ──
//     useEffect(() => {
//         const onKeyDown = (e) => {
//             if (e.key !== "Escape") return
//             setSelectedIds(new Set())
//             setItemContextMenu({ visible: false })
//             setShowColorMenu(false)
//         }
//         window.addEventListener("keydown", onKeyDown)
//         return () => window.removeEventListener("keydown", onKeyDown)
//     }, [])

//     // ── Close context menu on outside click ──
//     useEffect(() => {
//         const close = (e) => {
//             if (e.target.closest(".table-row")) return
//             setItemContextMenu({ visible: false })
//             setShowColorMenu(false)
//         }
//         window.addEventListener("click", close)
//         window.addEventListener("contextmenu", close)
//         return () => {
//             window.removeEventListener("click", close)
//             window.removeEventListener("contextmenu", close)
//         }
//     })

//     // ── Reset selection anchor on deselect ──
//     useEffect(() => {
//         if (selectedIds.size === 0) {
//             lastCtrlSelectedIds.current = new Set()
//             anchorIndex.current = null
//         }
//     }, [selectedIds])

//     // ── Drag selection ──
//     const handleMouseDown = (e) => {
//         if (e.button !== 0) return
//         if (e.target.closest(".file-preview-modal, .table-row, .table-header, button, input, textarea, select, a, .custom-context-menu")) return
//         isDragSelectingRef.current = true
//         setDragStart({ x: e.clientX, y: e.clientY })
//         setDragRect(null)
//         setSelectedIds(new Set())
//     }

//     const handleMouseMove = useCallback((e) => {
//         if (!isDragSelectingRef.current || !dragStart) return
//         const rect = {
//             x: Math.min(e.clientX, dragStart.x),
//             y: Math.min(e.clientY, dragStart.y),
//             width: Math.abs(e.clientX - dragStart.x),
//             height: Math.abs(e.clientY - dragStart.y),
//         }
//         setDragRect(rect)
//         const newSelected = new Set()
//         Object.entries(itemRefs.current).forEach(([id, el]) => {
//             if (!el) return
//             const r = el.getBoundingClientRect()
//             const overlaps = r.left < rect.x + rect.width && r.right > rect.x && r.top < rect.y + rect.height && r.bottom > rect.y
//             if (overlaps) newSelected.add(id)
//         })
//         setSelectedIds(newSelected)
//     }, [dragStart])

//     const handleMouseUp = useCallback(() => {
//         isDragSelectingRef.current = false
//         setDragStart(null)
//         setDragRect(null)
//     }, [])

//     useEffect(() => {
//         if (!dragStart) return
//         window.addEventListener("mousemove", handleMouseMove)
//         window.addEventListener("mouseup", handleMouseUp)
//         return () => {
//             window.removeEventListener("mousemove", handleMouseMove)
//             window.removeEventListener("mouseup", handleMouseUp)
//         }
//     }, [dragStart, handleMouseMove, handleMouseUp])

//     // ── Double-click to open ──
//     const handleItemClick = (item) => {
//         const now = Date.now()
//         const isDoubleClick = lastClick.current[item._id] && now - lastClick.current[item._id] < DOUBLE_CLICK_MS
//         lastClick.current[item._id] = now
//         if (!isDoubleClick) return
//         if (item.type === "folder") openFolder(item._id)
//         else if (item.type === "file") setFilePreview(item)
//     }

//     // ── Select all toggle ──
//     const handleSelectAll = () => {
//         setSelectedIds(prev =>
//             prev.size === displayItems.length
//                 ? new Set()
//                 : new Set(displayItems.map(i => i._id.toString()))
//         )
//     }

//     // ── Single checkbox (no shift/ctrl) ──
//     const handleCheckboxOnly = (e, itemId) => {
//         e.stopPropagation()
//         setItemContextMenu({ visible: false })
//         setShowColorMenu(false)
//         const strId = itemId.toString()
//         const idx = displayItems.findIndex(i => i._id === itemId)
//         setSelectedIds(prev => {
//             const next = new Set(prev)
//             if (next.has(strId)) {
//                 next.delete(strId)
//                 lastCtrlSelectedIds.current.delete(strId)
//             } else {
//                 next.add(strId)
//                 lastCtrlSelectedIds.current.add(strId)
//             }
//             if (!next.size) {
//                 lastCtrlSelectedIds.current = new Set()
//                 anchorIndex.current = null
//             } else {
//                 anchorIndex.current = idx
//             }
//             return next
//         })
//     }

//     // ── Shift/ctrl click ──
//     const handleCheckboxClick = (e, itemId) => {
//         e.stopPropagation()
//         setItemContextMenu({ visible: false })
//         setShowColorMenu(false)
//         const strId = itemId.toString()
//         const idx = displayItems.findIndex(i => i._id === itemId)

//         if (e.shiftKey && anchorIndex.current !== null) {
//             const start = Math.min(anchorIndex.current, idx)
//             const end = Math.max(anchorIndex.current, idx)
//             const rangeIds = displayItems.slice(start, end + 1).map(i => i._id.toString())
//             setSelectedIds(() => {
//                 const next = new Set(lastCtrlSelectedIds.current)
//                 rangeIds.forEach(id => next.add(id))
//                 return next
//             })
//         } else if (e.ctrlKey || e.metaKey) {
//             setSelectedIds(prev => {
//                 const next = new Set(prev)
//                 if (next.has(strId)) {
//                     next.delete(strId)
//                     lastCtrlSelectedIds.current.delete(strId)
//                 } else {
//                     next.add(strId)
//                     lastCtrlSelectedIds.current.add(strId)
//                 }
//                 return next
//             })
//             anchorIndex.current = idx
//         } else {
//             lastCtrlSelectedIds.current = new Set([strId])
//             anchorIndex.current = idx
//             setSelectedIds(new Set([strId]))
//         }
//     }

//     // ── Sorting ──
//     const handleSort = (column) => {
//         if (sortBy === column) setSortOrder(prev => prev === "asc" ? "desc" : "asc")
//         else { setSortBy(column); setSortOrder("asc") }
//     }

//     // ── Download helpers ──
//     const downloadSelected = () => {
//         const items = Array.from(selectedIds).map(id => displayItems.find(i => i._id === id)).filter(Boolean)
//         if (items.length === 1) {
//             items[0].type === "file" ? downloadFile(items[0]) : downloadFolder(items[0])
//         } else {
//             downloadMultiple(items)
//         }
//     }

//     // ── Derived ──
//     const allFoldersSelected = selectedIds.size > 0 && Array.from(selectedIds).every(id => displayItems.find(i => i._id === id)?.type === "folder")
//     const singleSelected = selectedIds.size === 1 ? displayItems.find(i => i._id === Array.from(selectedIds)[0]) : null

//     return (
//         <div className="folder-viewer-page">
//             {filePreview && <FilePreviewModal file={filePreview} onClose={() => setFilePreview(null)} />}

//             {/* ── Header ── */}
//             <div className="max-width-base-header">
//                 <div className="master-header">
//                     <div className="d-flex align-items-center justify-content-between">
//                         <div className="logo-section">
//                             <a className="logo" onClick={() => navigate("/dashboard")}>
//                                 <InteractiveIcon defaultIcon={logoIcon} alt="" />
//                             </a>
//                         </div>
//                         <button className="btn-black btn-lg m-0">
//                             Sign In
//                         </button>
//                     </div>
//                 </div>

//                 <header className="header">
//                     <div className="header-view d-flex align-items-center justify-content-between">
//                         <Breadcrumbs
//                             trail={trail}
//                             onNavigate={navigateTo}
//                             onHomeClick={goHome}
//                             maxVisible={2}
//                             rootLabel={folder?.name || "Shared Folder"}
//                             setModal={setModal}
//                             selectedIds={selectedIds}
//                             items={displayItems}
//                             currentFolderId={currentPath[currentPath.length - 1] ?? null}
//                             downloadFile={downloadFile}
//                             downloadFolder={downloadFolder}
//                             downloadMultiple={downloadMultiple}
//                             isViewerOnly={isPublic}
//                         />
//                         <div className="d-flex align-items-center">
//                             <ul className="mb-0 d-flex view-btn">
//                                 <li>
//                                     <Tooltip text="List View">
//                                         <button
//                                             className={`btn btn-icon rounded-end-0 ${view === "list" ? "view-active" : ""}`}
//                                             onClick={() => setView("list")}
//                                         >
//                                             <InteractiveIcon defaultIcon={menuIcon} width={20} />
//                                         </button>
//                                     </Tooltip>
//                                 </li>
//                                 <li>
//                                     <Tooltip text="Grid View">
//                                         <button
//                                             className={`btn btn-icon rounded-start-0 ${view === "grid" ? "view-active" : ""}`}
//                                             onClick={() => setView("grid")}
//                                         >
//                                             <InteractiveIcon defaultIcon={gridIcon} width={20} />
//                                         </button>
//                                     </Tooltip>
//                                 </li>
//                             </ul>
//                         </div>
//                     </div>
//                 </header>
//             </div>

//             {/* ── Content ── */}
//             <div className="content-view-wrapper">
//                 <div className="max-width-base">
//                     <div
//                         ref={gridContainerRef}
//                         onMouseDown={handleMouseDown}
//                         className={`grid-single-box ${view === "grid" ? "grid-view" : "list-view"}`}
//                         style={{ position: "relative", userSelect: "none" }}
//                     >
//                         {/* Drag selection rect */}
//                         {dragRect?.width > 5 && dragRect?.height > 5 && (
//                             <div
//                                 style={{
//                                     position: "fixed",
//                                     left: dragRect.x,
//                                     top: dragRect.y,
//                                     width: dragRect.width,
//                                     height: dragRect.height,
//                                     backgroundColor: "rgba(26, 115, 232, 0.1)",
//                                     border: "1px solid rgba(26, 115, 232, 0.8)",
//                                     borderRadius: 2,
//                                     pointerEvents: "none",
//                                     zIndex: 9999,
//                                 }}
//                             />
//                         )}

//                         <section className="content-wrapper">
//                             <div className="table row">

//                                 {/* Table Header */}
//                                 <div className="table-header">
//                                     <div className="table-cell">
//                                         <div className="first-cell-data p-0">
//                                             <div className="form-check-group">
//                                                 <label htmlFor="allcheck">
//                                                     <InteractiveIcon defaultIcon={checkboxIcon} alt="" />
//                                                 </label>
//                                                 <input
//                                                     type="checkbox"
//                                                     className="checkbox"
//                                                     id="allcheck"
//                                                     checked={displayItems.length > 0 && selectedIds.size === displayItems.length}
//                                                     onChange={handleSelectAll}
//                                                 />
//                                             </div>
//                                             <SortableHeader label="Name" column="name" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
//                                         </div>
//                                     </div>
//                                     <div className="table-cell">
//                                         <div className="sorting-label-text">Owner</div>
//                                     </div>
//                                     <div className="table-cell">
//                                         <div className="sorting-label-text">Shared</div>
//                                     </div>
//                                     <div className="table-cell">
//                                         <SortableHeader label="Size" column="size" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
//                                     </div>
//                                     <div className="table-cell">
//                                         <SortableHeader label="Date" column="modified" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
//                                     </div>
//                                 </div>

//                                 {/* Empty state */}
//                                 {displayItems.length === 0 && (
//                                     <div className="no-data-found-single-box-wrapper">
//                                         <div className="no-data-found-single-box">
//                                             <InteractiveIcon defaultIcon={trashEmptyIcon} alt="No items" />
//                                             <p className="text-center text-muted py-3 m-0">This folder is empty</p>
//                                         </div>
//                                     </div>
//                                 )}

//                                 {/* Items */}
//                                 {displayItems.map((item) => {
//                                     const strId = item._id.toString()
//                                     const isSelected = selectedIds.has(strId)

//                                     return (
//                                         <div
//                                             key={item._id}
//                                             ref={el => itemRefs.current[item._id] = el}
//                                             className="table-row col-xl-2 col-lg-3 col-md-4 col-sm-6 col-6"
//                                             onClick={() => handleItemClick(item)}
//                                             onContextMenu={(e) => {
//                                                 e.preventDefault()
//                                                 if (!selectedIds.has(item._id)) setSelectedIds(new Set([item._id]))
//                                                 setItemContextMenu({ visible: true, x: e.clientX, y: e.clientY })
//                                             }}
//                                         >
//                                             <div
//                                                 className={`table-row-inner ${isSelected ? "selected" : ""}`}
//                                                 onClick={(e) => {
//                                                     if (e.ctrlKey || e.metaKey || e.shiftKey) handleCheckboxClick(e, item._id)
//                                                 }}
//                                                 style={{ userSelect: "none" }}
//                                             >
//                                                 {/* Name cell */}
//                                                 <div className="table-cell">
//                                                     <div className="first-cell-data p-0">
//                                                         <div className="form-check-group">
//                                                             <label htmlFor={`item-${item._id}`}>
//                                                                 <InteractiveIcon defaultIcon={checkboxIcon} alt="" />
//                                                             </label>
//                                                             <input
//                                                                 type="checkbox"
//                                                                 className="checkbox"
//                                                                 id={`item-${item._id}`}
//                                                                 checked={isSelected}
//                                                                 onChange={() => { }}
//                                                                 onClick={(e) => handleCheckboxOnly(e, item._id)}
//                                                             />
//                                                         </div>
//                                                         <div className="folder-img">
//                                                             {["list", "grid"].map(mode => (
//                                                                 <span key={mode}>
//                                                                     <InteractiveIcon
//                                                                         defaultIcon={
//                                                                             item.type === "folder"
//                                                                                 ? getFolderIcon(item.color, mode, item.isSharedWithMe || item.isShared)
//                                                                                 : getFileIcon(item.name)
//                                                                         }
//                                                                         className={`${mode}-view-img`}
//                                                                         alt=""
//                                                                         onDoubleClick={(e) => {
//                                                                             e.stopPropagation()
//                                                                             if (item.type === "folder") openFolder(item._id)
//                                                                         }}
//                                                                     />
//                                                                 </span>
//                                                             ))}
//                                                         </div>
//                                                         <div className="folder-name">
//                                                             <p className="file-name mb-0">{item.name}</p>
//                                                         </div>
//                                                     </div>
//                                                 </div>

//                                                 {/* Owner cell */}
//                                                 <div className="table-cell">
//                                                     <OwnerCell item={item} isPublic={isPublic} />
//                                                 </div>

//                                                 {/* Shared cell */}
//                                                 <div className="table-cell">{formatSharedWith(item.sharedWith)}</div>

//                                                 {/* Size cell */}
//                                                 <div className="table-cell">
//                                                     {item.type === "file" ? formatFileSize(item.fileSize) : "—"}
//                                                 </div>

//                                                 {/* Date cell */}
//                                                 <div className="table-cell">
//                                                     {formatDate(item.updatedAt || item.createdAt)}
//                                                 </div>
//                                             </div>
//                                         </div>
//                                     )
//                                 })}
//                             </div>
//                         </section>
//                     </div>
//                 </div>
//             </div>

//             {/* ── Context Menu ── */}
//             {itemContextMenu.visible && (
//                 <div
//                     ref={contextMenuRef}
//                     className="custom-context-menu"
//                     style={{ position: "fixed", top: itemContextMenu.y, left: itemContextMenu.x, overflow: "visible", zIndex: 99999, opacity: 0, pointerEvents: "none" }}
//                     onClick={() => { setItemContextMenu({ visible: false }); setShowColorMenu(false) }}
//                 >
//                     <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>

//                         {/* Download — always visible */}
//                         <li onClick={downloadSelected}>
//                             <button className="dropdown-item">
//                                 <span className="d-flex align-items-center">
//                                     <InteractiveIcon defaultIcon={downloadIcon} className="me-2" width={20} height={20} alt="" />
//                                     Download
//                                 </span>
//                             </button>
//                         </li>

//                         {/* Private-only actions */}
//                         {!isPublic && (
//                             <>
//                                 <li onClick={() => setModal?.({ type: "shareUser", data: displayItems.filter(i => selectedIds.has(i._id.toString())) })}>
//                                     <button className="dropdown-item">
//                                         <span className="d-flex align-items-center">
//                                             <InteractiveIcon defaultIcon={userPlus} className="me-2" width={20} height={20} alt="" />
//                                             Share
//                                         </span>
//                                     </button>
//                                 </li>

//                                 <li
//                                     style={{ opacity: !singleSelected ? 0.6 : 1, cursor: !singleSelected ? "not-allowed" : "pointer" }}
//                                     onClick={(e) => {
//                                         if (!singleSelected) { e.stopPropagation(); return }
//                                         setModal?.({ type: "RenameModal", data: singleSelected })
//                                     }}
//                                 >
//                                     <button className="dropdown-item" style={{ cursor: "inherit" }}>
//                                         <span className="d-flex align-items-center">
//                                             <InteractiveIcon defaultIcon={renameIcon} className="me-2" width={20} height={20} alt="" />
//                                             Rename
//                                         </span>
//                                     </button>
//                                 </li>

//                                 <li
//                                     style={{ position: "relative", opacity: !allFoldersSelected ? 0.6 : 1, cursor: !allFoldersSelected ? "not-allowed" : "pointer" }}
//                                     onClick={(e) => {
//                                         if (!allFoldersSelected) { e.stopPropagation(); return }
//                                         e.stopPropagation()
//                                         setShowColorMenu(prev => !prev)
//                                     }}
//                                 >
//                                     <button className="dropdown-item" style={{ cursor: "inherit" }}>
//                                         <span className="d-flex align-items-center">
//                                             <InteractiveIcon defaultIcon={colorIcon} className="me-2" width={20} height={20} alt="" />
//                                             Change Color
//                                         </span>
//                                     </button>
//                                     {allFoldersSelected && showColorMenu && (
//                                         <ColorPicker onSelect={() => { setItemContextMenu({ visible: false }); setShowColorMenu(false) }} />
//                                     )}
//                                 </li>

//                                 <li onClick={() => setModal?.({ type: "CopyModal", data: Array.from(selectedIds) })}>
//                                     <button className="dropdown-item">
//                                         <span className="d-flex align-items-center">
//                                             <InteractiveIcon defaultIcon={copyIcon} className="me-2" width={20} height={20} alt="" />
//                                             Copy
//                                         </span>
//                                     </button>
//                                 </li>

//                                 <li onClick={() => setModal?.({ type: "MoveModal", data: Array.from(selectedIds) })}>
//                                     <button className="dropdown-item">
//                                         <span className="d-flex align-items-center">
//                                             <InteractiveIcon defaultIcon={moveIcon} className="me-2" width={20} height={20} alt="" />
//                                             Move
//                                         </span>
//                                     </button>
//                                 </li>

//                                 <li
//                                     style={{ opacity: !singleSelected ? 0.6 : 1, cursor: !singleSelected ? "not-allowed" : "pointer" }}
//                                     onClick={(e) => {
//                                         if (!singleSelected) { e.stopPropagation(); return }
//                                         setModal?.({ type: "ItemInfoModal", data: singleSelected })
//                                     }}
//                                 >
//                                     <button className="dropdown-item" style={{ cursor: "inherit" }}>
//                                         <span className="d-flex align-items-center">
//                                             <InteractiveIcon defaultIcon={fileInfoIcon} className="me-2" width={20} height={20} alt="" />
//                                             Info
//                                         </span>
//                                     </button>
//                                 </li>

//                                 <li onClick={() => setModal?.({ type: "DeleteModal", data: Array.from(selectedIds) })}>
//                                     <button className="dropdown-item">
//                                         <span className="d-flex align-items-center">
//                                             <InteractiveIcon defaultIcon={trashIcon} className="me-2" width={20} height={20} alt="" />
//                                             Trash
//                                         </span>
//                                     </button>
//                                 </li>
//                             </>
//                         )}
//                     </ul>
//                 </div>
//             )}
//         </div>
//     )
// }

// export default FolderViewer

import { useState, useRef, useEffect, useCallback } from "react"
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
import { useDownload } from "../../../context/DownloadContext.jsx"

const FOLDER_COLORS = ["red", "orange", "yellow", "green", "green-dark", "blue", "violet", "pink", "gray"]
const DOUBLE_CLICK_MS = 400

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

function formatFileSize(bytes) {
    if (!bytes) return "—"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
    return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}

function formatDate(dateStr) {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString("en-GB").replace(/\//g, "-")
}

function SortableHeader({ label, column, sortBy, sortOrder, onSort }) {
    const isActive = sortBy === column
    return (
        <div
            className={`sorting-label-text ${isActive ? "sorting-active" : ""}`}
            onClick={() => onSort(column)}
        >
            {label}
            <InteractiveIcon
                defaultIcon={squareArrowDownLinearIcon}
                width={20}
                alt=""
                className={`sorting-label-icon ${isActive ? "visible" : "invisible"} ${isActive && sortOrder === "asc" ? "sorting-label-icon--desc" : ""}`}
            />
        </div>
    )
}

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

function FolderViewer({ folder, contents = [], isPublic = false, view: viewProp = "grid", setModal }) {
    const { downloadFile, downloadFolder, downloadMultiple } = useDownload()

    const [view, setView] = useState(viewProp)
    const [currentPath, setCurrentPath] = useState([])
    const [filePreview, setFilePreview] = useState(null)
    const [selectedIds, setSelectedIds] = useState(new Set())
    const [itemContextMenu, setItemContextMenu] = useState({ visible: false, x: 0, y: 0 })
    const [showColorMenu, setShowColorMenu] = useState(false)
    const [dragStart, setDragStart] = useState(null)
    const [dragRect, setDragRect] = useState(null)
    const [sortBy, setSortBy] = useState("name")
    const [sortOrder, setSortOrder] = useState("asc")

    const anchorIndex = useRef(null)
    const lastCtrlSelectedIds = useRef(new Set())
    const lastClick = useRef({})
    const contextMenuRef = useRef(null)
    const isDragSelectingRef = useRef(false)
    const itemRefs = useRef({})
    const gridContainerRef = useRef(null)
    // ↓ This is the key ref — mirrors dragRootRef from Dashboard (the outer scroll wrapper)
    const dragWrapperRef = useRef(null)

    // ── Navigation ──
    const getCurrentFolder = () => {
        if (!currentPath.length) return { name: folder?.name || "Shared Folder", items: contents }
        const lastId = currentPath[currentPath.length - 1]
        const found = findFolderById(contents, lastId)
        return { name: found?.name || "Folder", items: found?.children || [] }
    }
    const { items: displayItems } = getCurrentFolder()
    const openFolder = (id) => setCurrentPath(prev => [...prev, id])
    const goHome = () => setCurrentPath([])
    const navigateTo = (index) => setCurrentPath(prev => prev.slice(0, index + 1))
    const trail = currentPath.map(id => {
        const f = findFolderById(contents, id)
        return { _id: id, name: f?.name || "Folder" }
    })

    // ── Context menu positioning ──
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

    // ── Escape key ──
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

    // ── Close context menu on outside click ──
    useEffect(() => {
        const close = (e) => {
            if (e.target.closest(".table-row")) return
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

    // ── Reset anchor on deselect ──
    useEffect(() => {
        if (selectedIds.size === 0) {
            lastCtrlSelectedIds.current = new Set()
            anchorIndex.current = null
        }
    }, [selectedIds])

    // ── Drag selection mousedown — attached to dragWrapperRef (outer scroll div) ──
    const handleMouseDown = useCallback((e) => {
        if (e.button !== 0) return
        if (e.target.closest(".master-header")) return
        if (e.target.closest(".file-preview-modal")) return
        if (e.target.closest(".table-row")) return
        if (e.target.closest(".table-header")) return
        if (e.target.closest("button, input, textarea, select, a, .custom-context-menu")) return

        isDragSelectingRef.current = true
        setDragStart({ x: e.clientX, y: e.clientY })
        setDragRect(null)
        setSelectedIds(new Set())
    }, [])

    // Attach to outer wrapper (dragWrapperRef), exactly like Dashboard attaches to dragAndSelectRef
    useEffect(() => {
        const el = dragWrapperRef.current
        if (!el) return
        el.addEventListener("mousedown", handleMouseDown)
        return () => el.removeEventListener("mousedown", handleMouseDown)
    }, [handleMouseDown])

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
            const r = el.getBoundingClientRect()
            const overlaps =
                r.left < rect.x + rect.width &&
                r.right > rect.x &&
                r.top < rect.y + rect.height &&
                r.bottom > rect.y
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

    // ── Double-click to open ──
    const handleItemClick = (item) => {
        const now = Date.now()
        const isDoubleClick = lastClick.current[item._id] && now - lastClick.current[item._id] < DOUBLE_CLICK_MS
        lastClick.current[item._id] = now
        if (!isDoubleClick) return
        if (item.type === "folder") openFolder(item._id)
        else if (item.type === "file") setFilePreview(item)
    }

    // ── Select all ──
    const handleSelectAll = () => {
        setSelectedIds(prev =>
            prev.size === displayItems.length
                ? new Set()
                : new Set(displayItems.map(i => i._id.toString()))
        )
    }

    // ── Single checkbox ──
    const handleCheckboxOnly = (e, itemId) => {
        e.stopPropagation()
        setItemContextMenu({ visible: false })
        setShowColorMenu(false)
        const strId = itemId.toString()
        const idx = displayItems.findIndex(i => i._id === itemId)
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(strId)) {
                next.delete(strId)
                lastCtrlSelectedIds.current.delete(strId)
            } else {
                next.add(strId)
                lastCtrlSelectedIds.current.add(strId)
            }
            if (!next.size) {
                lastCtrlSelectedIds.current = new Set()
                anchorIndex.current = null
            } else {
                anchorIndex.current = idx
            }
            return next
        })
    }

    // ── Shift/Ctrl click ──
    const handleCheckboxClick = (e, itemId) => {
        e.stopPropagation()
        setItemContextMenu({ visible: false })
        setShowColorMenu(false)
        const strId = itemId.toString()
        const idx = displayItems.findIndex(i => i._id === itemId)
        if (e.shiftKey && anchorIndex.current !== null) {
            const start = Math.min(anchorIndex.current, idx)
            const end = Math.max(anchorIndex.current, idx)
            const rangeIds = displayItems.slice(start, end + 1).map(i => i._id.toString())
            setSelectedIds(() => {
                const next = new Set(lastCtrlSelectedIds.current)
                rangeIds.forEach(id => next.add(id))
                return next
            })
        } else if (e.ctrlKey || e.metaKey) {
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
            lastCtrlSelectedIds.current = new Set([strId])
            anchorIndex.current = idx
            setSelectedIds(new Set([strId]))
        }
    }

    // ── Sorting ──
    const handleSort = (column) => {
        if (sortBy === column) setSortOrder(prev => prev === "asc" ? "desc" : "asc")
        else { setSortBy(column); setSortOrder("asc") }
    }

    // ── Download ──
    const downloadSelected = () => {
        const items = Array.from(selectedIds).map(id => displayItems.find(i => i._id === id)).filter(Boolean)
        if (items.length === 1) {
            items[0].type === "file" ? downloadFile(items[0]) : downloadFolder(items[0])
        } else {
            downloadMultiple(items)
        }
    }

    const allFoldersSelected = selectedIds.size > 0 &&
        Array.from(selectedIds).every(id => displayItems.find(i => i._id === id)?.type === "folder")
    const singleSelected = selectedIds.size === 1
        ? displayItems.find(i => i._id === Array.from(selectedIds)[0])
        : null

    return (
        <div className="folder-viewer-page">
            {filePreview && <FilePreviewModal file={filePreview} onClose={() => setFilePreview(null)} />}

            {/* ── Header ── */}
            <div className="max-width-base-header">
                <div className="master-header">
                    <div className="d-flex align-items-center justify-content-between">
                        <div className="logo-section">
                            <a className="logo" onClick={() => navigate("/dashboard")}>
                                <InteractiveIcon defaultIcon={logoIcon} alt="" />
                            </a>
                        </div>
                        <button className="btn-black btn-lg m-0">Sign In</button>
                    </div>
                </div>
                <header className="header">
                    <div className="header-view d-flex align-items-center justify-content-between">
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
            </div>

            {/* ── Content: dragWrapperRef goes on the outer scroll div, same as dragAndSelectRef in Dashboard ── */}
            <div className="content-view-wrapper" ref={dragWrapperRef}>
                <div className="max-width-base" ref={gridContainerRef}>
                    <div
                        className={`grid-single-box ${view === "grid" ? "grid-view" : "list-view"}`}
                        style={{ position: "relative", userSelect: "none" }}
                    >
                        {/* Drag selection rect */}
                        {dragRect?.width > 5 && dragRect?.height > 5 && (
                            <div
                                style={{
                                    position: "fixed",
                                    left: dragRect.x,
                                    top: dragRect.y,
                                    width: dragRect.width,
                                    height: dragRect.height,
                                    backgroundColor: "rgba(26, 115, 232, 0.1)",
                                    border: "1px solid rgba(26, 115, 232, 0.8)",
                                    borderRadius: 2,
                                    pointerEvents: "none",
                                    zIndex: 9999,
                                }}
                            />
                        )}
                        <section className="content-wrapper">
                            <div className="table row">
                                {/* Table Header */}
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

                                {/* Empty state */}
                                {displayItems.length === 0 && (
                                    <div className="no-data-found-single-box-wrapper">
                                        <div className="no-data-found-single-box">
                                            <InteractiveIcon defaultIcon={trashEmptyIcon} alt="No items" />
                                            <p className="text-center text-muted py-3 m-0">This folder is empty</p>
                                        </div>
                                    </div>
                                )}

                                {/* Items */}
                                {displayItems.map((item) => {
                                    const strId = item._id.toString()
                                    const isSelected = selectedIds.has(strId)
                                    return (
                                        <div
                                            key={item._id}
                                            ref={el => itemRefs.current[item._id] = el}
                                            className="table-row col-xl-2 col-lg-3 col-md-4 col-sm-6 col-6"
                                            onClick={() => handleItemClick(item)}
                                            onContextMenu={(e) => {
                                                e.preventDefault()
                                                if (!selectedIds.has(item._id)) setSelectedIds(new Set([item._id]))
                                                setItemContextMenu({ visible: true, x: e.clientX, y: e.clientY })
                                            }}
                                        >
                                            <div
                                                className={`table-row-inner ${isSelected ? "selected" : ""}`}
                                                onClick={(e) => {
                                                    if (e.ctrlKey || e.metaKey || e.shiftKey) handleCheckboxClick(e, item._id)
                                                }}
                                                style={{ userSelect: "none" }}
                                            >
                                                {/* Name cell */}
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
                                                                checked={isSelected}
                                                                onChange={() => { }}
                                                                onClick={(e) => handleCheckboxOnly(e, item._id)}
                                                            />
                                                        </div>
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
                                                {/* Size cell */}
                                                <div className="table-cell">
                                                    {item.type === "file" ? formatFileSize(item.fileSize) : "—"}
                                                </div>
                                                {/* Date cell */}
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

            {/* ── Context Menu ── */}
            {itemContextMenu.visible && (
                <div
                    ref={contextMenuRef}
                    className="custom-context-menu"
                    style={{ position: "fixed", top: itemContextMenu.y, left: itemContextMenu.x, overflow: "visible", zIndex: 99999, opacity: 0, pointerEvents: "none" }}
                    onClick={() => { setItemContextMenu({ visible: false }); setShowColorMenu(false) }}
                >
                    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                        <li onClick={downloadSelected}>
                            <button className="dropdown-item">
                                <span className="d-flex align-items-center">
                                    <InteractiveIcon defaultIcon={downloadIcon} className="me-2" width={20} height={20} alt="" />
                                    Download
                                </span>
                            </button>
                        </li>
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
                                        setShowColorMenu(prev => !prev)
                                    }}
                                >
                                    <button className="dropdown-item" style={{ cursor: "inherit" }}>
                                        <span className="d-flex align-items-center">
                                            <InteractiveIcon defaultIcon={colorIcon} className="me-2" width={20} height={20} alt="" />
                                            Change Color
                                        </span>
                                    </button>
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
        </div>
    )
}

export default FolderViewer