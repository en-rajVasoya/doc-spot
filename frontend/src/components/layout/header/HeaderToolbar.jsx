
// import { useEffect } from "react";
// import Tooltip from "../Tooltip";
// import InteractiveIcon from "../InteractiveIcon";
// import { Dropdown } from "react-bootstrap";
// import closeIcon from "@images/icon/close.svg";
// import userPlusIcon from "@images/icon/user-plus.svg";
// import downloadIcon from "@images/icon/download.svg";
// import renameIcon from "@images/icon/rename.svg";
// import colorIcon from "@images/icon/color.svg";
// import copyIcon from "@images/icon/copy.svg";
// import moveIcon from "@images/icon/move.svg";
// import deleteIcon from "@images/icon/trash.svg";
// import searchIconWhite from "@images/icon/search-icon-white.svg";
// import fileInfoIcon from "@images/icon/file-info.svg";
// import { useFileExplorer } from "../../../context/FileExplorerContext";
// import { useDownload } from "../../../context/DownloadContext";
// import { useSearch } from "../../../context/SearchContext";

// function HeaderToolbar({ setModal, searchBarOpen, setSearchBarOpen }) {
//     const { selectedIds, setSelectedIds, items, changeColorApi, isViewerOnly } = useFileExplorer();
//     const { downloadFile, downloadFolder, downloadMultiple } = useDownload();
//     const { isSearchMode, searchResults } = useSearch();

//     // ##################################################
//     // ---- STEP 1: Component Data & Setup --------------
//     // Grab context functions and determine which list of 
//     // items (normal or search results) to display.
//     // ##################################################
//     // decide which items list to use based on search mode
//     const displayItems = isSearchMode ? searchResults : items;

//     // Convert Set of selected IDs to an array for easier array operations
//     const selectedArray = Array.from(selectedIds);

//     // Safely get the first selected item object (used for single-item actions like Rename/Info)
//     const selectedItem = displayItems.find(
//         item => item._id === selectedArray[0]
//     );

//     // Check if ONLY folders are selected (used to enable/disable the Color Change button)
//     const hasFolder =
//         selectedArray.length > 0 &&
//         selectedArray.every(
//             id => displayItems.find(i => i._id === id)?.type === "folder"
//         )

//     // ##################################################
//     // ---- STEP 2: Calculate UI States & Permissions ---
//     // Check if folders are selected, and determine if the 
//     // current user is a 'viewer' (to disable actions).
//     // ##################################################
//     // NEW: Check if ANY selected item is viewer-only, or if the folder is viewer-only
//     const isItemViewerOnly = isViewerOnly || selectedArray.some(id => {
//         const item = displayItems.find(i => i._id === id);
//         return item?.permission === "viewer";
//     });

//     // Global toggle to disable ALL icons if nothing is selected
//     const isDisabled = selectedIds.size === 0;

//     // Automatically close the search bar if a user selects an item
//     useEffect(() => {
//         if (selectedIds && selectedIds.size > 0) {
//             setSearchBarOpen(false);
//         }
//     }, [selectedIds, setSearchBarOpen]);
//     return (
//         <>
//             {!searchBarOpen && (
//                 <div className="toolbar-box d-block" >
//                     <div className="toolbar">
//                         <div className="toolbar-container">
//                             <div className="d-flex align-items-center">
//                                 {/* --- SELECTION COUNTER --- */}
//                                 {/* Shows how many items are currently selected and allows clearing the selection */}
//                                 {selectedIds.size !== 0 && (
//                                     <div className="selection-count">
//                                         <span className="cursor-pointer">
//                                             <InteractiveIcon
//                                                 defaultIcon={closeIcon}
//                                                 width={24}
//                                                 alt=""
//                                                 onClick={() => setSelectedIds(new Set())}
//                                             />
//                                         </span>
//                                         {selectedIds.size} selected
//                                     </div>
//                                 )}

//                                 <ul className="mb-0 tools">

//                                     {/* ################################################## */}
//                                     {/* ---- STEP 3: Action Buttons ---------------------- */}
//                                     {/* All buttons follow the same disabled/opacity logic */}
//                                     {/* ################################################## */}

//                                     {/* 1. SHARE ACTION (Disabled for viewers) */}
//                                     <li className="d-flex align-items-center justify-content-center">
//                                         <Tooltip
//                                             text="Share"
//                                             placement="bottom"
//                                             theme={`${isDisabled || isItemViewerOnly || selectedIds.size !== 1 ? "disabled" : ""}`}>
//                                             <InteractiveIcon
//                                                 defaultIcon={userPlusIcon}
//                                                 alt="Share"
//                                                 className={`${selectedIds.size !== 1 || isItemViewerOnly ? "disabled" : ""}`}
//                                                 onClick={!isDisabled && !isItemViewerOnly && selectedIds.size === 1 ? () => {
//                                                     const selectedItems = displayItems.filter(i => selectedIds.has(i._id.toString()))
//                                                     setModal({ type: "shareUser", data: selectedItems })
//                                                 } : undefined}
//                                             />
//                                         </Tooltip>
//                                     </li>
//                                     <li className="d-flex align-items-center justify-content-center">
//                                         <div className="divider" />
//                                     </li>

//                                     {/* 2. DOWNLOAD ACTION (Available to EVERYONE, including viewers) */}
//                                     <li className="d-flex align-items-center justify-content-center">
//                                         <Tooltip text="Download" placement="bottom" theme={`${isDisabled ? "disabled" : ""}`}>
//                                             <InteractiveIcon
//                                                 defaultIcon={downloadIcon}
//                                                 alt="Download"
//                                                 className={`${selectedIds.size === 0 ? "disabled" : ""}`}
//                                                 onClick={() => {
//                                                     if (isDisabled) return

//                                                     const selectedItems = selectedArray
//                                                         .map(id => displayItems.find(i => i._id === id))
//                                                         .filter(Boolean)
//                                                     if (selectedItems.length === 1) {
//                                                         const item = selectedItems[0]
//                                                         if (item.type === "file") {
//                                                             downloadFile(item)
//                                                         } else {
//                                                             downloadFolder(item)
//                                                         }
//                                                     } else {
//                                                         downloadMultiple(selectedItems)
//                                                     }
//                                                 }}
//                                             />
//                                         </Tooltip>
//                                     </li>
//                                     <li className="d-flex align-items-center justify-content-center">
//                                         <div className="divider" />
//                                     </li>

//                                     {/* 3. RENAME ACTION (Disabled for viewers, disabled for multi-selection) */}
//                                     <li className="d-flex align-items-center justify-content-center">
//                                         <Tooltip text="Rename" placement="bottom" theme={`${isDisabled || isItemViewerOnly ? "disabled" : ""}`}>
//                                             <InteractiveIcon
//                                                 defaultIcon={renameIcon}
//                                                 alt="Rename"
//                                                 className={`${selectedIds.size !== 1 || isItemViewerOnly ? "disabled" : ""}`}
//                                                 onClick={
//                                                     !isDisabled && !isItemViewerOnly && selectedIds.size === 1 ? () => setModal({ type: "RenameModal", data: selectedItem }) : undefined
//                                                 }
//                                             />
//                                         </Tooltip>
//                                     </li>

//                                     <li className="d-flex align-items-center justify-content-center">
//                                         <div className="divider" />
//                                     </li>
//                                     <li className="d-flex align-items-center justify-content-center">
//                                         <Dropdown
//                                             popperConfig={{ strategy: "fixed" }}
//                                             container={document.body}
//                                             show={hasFolder && !isItemViewerOnly ? undefined : false}
//                                         >
//                                             <Dropdown.Toggle className="no-border-btn">
//                                                 <Tooltip
//                                                     text="Change Color"
//                                                     placement="bottom"
//                                                     theme={`${!hasFolder || isItemViewerOnly ? "disabled" : ""}`}
//                                                 >
//                                                     <InteractiveIcon
//                                                         defaultIcon={colorIcon}
//                                                         alt="Change Color"
//                                                         className={`${!hasFolder || isItemViewerOnly ? "disabled" : ""}`}
//                                                     />
//                                                 </Tooltip>
//                                             </Dropdown.Toggle>

//                                             {/* color for folders  */}
//                                             {selectedIds.size !== 0 && hasFolder && (
//                                                 <Dropdown.Menu className="colors-dd" style={{ zIndex: 9999 }}>
//                                                     <p className="title mb-3">Folder Color </p>
//                                                     <div className="d-flex align-items-center flex-wrap color-list">

//                                                         {/* red */}
//                                                         <Dropdown.Item className="cursor-pointer color red"
//                                                             onClick={() => changeColorApi(Array.from(selectedIds), "red")} >
//                                                         </Dropdown.Item>
//                                                         {/* orange */}
//                                                         <Dropdown.Item className="cursor-pointer color orange"
//                                                             onClick={() => changeColorApi(Array.from(selectedIds), "orange")}>
//                                                         </Dropdown.Item>
//                                                         {/* yellow */}
//                                                         <Dropdown.Item className="cursor-pointer color yellow active"
//                                                             onClick={() => changeColorApi(Array.from(selectedIds), "yellow")}>
//                                                         </Dropdown.Item>
//                                                         {/* green */}
//                                                         <Dropdown.Item className="cursor-pointer color green"
//                                                             onClick={() => changeColorApi(Array.from(selectedIds), "green")}>
//                                                         </Dropdown.Item>
//                                                         {/* green - dark */}
//                                                         <Dropdown.Item className="cursor-pointer color green-dark"
//                                                             onClick={() => changeColorApi(Array.from(selectedIds), "green-dark")}>
//                                                         </Dropdown.Item>
//                                                         {/* blue */}
//                                                         <Dropdown.Item className="cursor-pointer color blue"
//                                                             onClick={() => changeColorApi(Array.from(selectedIds), "blue")}>
//                                                         </Dropdown.Item>
//                                                         {/* violet */}
//                                                         <Dropdown.Item className="cursor-pointer color violet"
//                                                             onClick={() => changeColorApi(Array.from(selectedIds), "violet")}>
//                                                         </Dropdown.Item>
//                                                         {/* pink */}
//                                                         <Dropdown.Item className="cursor-pointer color pink"
//                                                             onClick={() => changeColorApi(Array.from(selectedIds), "pink")}>
//                                                         </Dropdown.Item>
//                                                         {/* gray */}
//                                                         <Dropdown.Item className="cursor-pointer color gray"
//                                                             onClick={() => changeColorApi(Array.from(selectedIds), "gray")}>
//                                                         </Dropdown.Item>

//                                                     </div>
//                                                 </Dropdown.Menu>
//                                             )}
//                                         </Dropdown>
//                                     </li>
//                                     <li className="d-flex align-items-center justify-content-center">
//                                         <div className="divider" />
//                                     </li>
//                                     <li className="d-flex align-items-center justify-content-center">
//                                         <Tooltip text="Copy" placement="bottom" theme={`${isDisabled ? "disabled" : ""}`}>
//                                             <InteractiveIcon
//                                                 defaultIcon={copyIcon}
//                                                 className={`${selectedIds.size === 0 ? "disabled" : ""}`}
//                                                 alt="Copy"
//                                                 onClick={!isDisabled ? () => setModal({ type: 'CopyModal', data: Array.from(selectedIds) }) : undefined}
//                                             />
//                                         </Tooltip>
//                                     </li>
//                                     <li className="d-flex align-items-center justify-content-center">
//                                         <div className="divider" />
//                                     </li>

//                                     {/* 6. MOVE ACTION (Disabled for viewers) */}
//                                     <li className="d-flex align-items-center justify-content-center">
//                                         <Tooltip text="Move" placement="bottom" theme={`${isDisabled || isItemViewerOnly ? "disabled" : ""}`}>
//                                             <InteractiveIcon
//                                                 defaultIcon={moveIcon}
//                                                 className={`${selectedIds.size === 0 || isItemViewerOnly ? "disabled" : ""}`}
//                                                 alt="Move"
//                                                 onClick={!isDisabled && !isItemViewerOnly ? () => setModal({ type: 'MoveModal', data: Array.from(selectedIds) }) : undefined}
//                                             />
//                                         </Tooltip>
//                                     </li>
//                                     <li className="d-flex align-items-center justify-content-center">
//                                         <div className="divider" />
//                                     </li>

//                                     {/* 7. ITEM INFO ACTION (Available to EVERYONE, disabled for multi-selection) */}
//                                     <li className="d-flex align-items-center justify-content-center">
//                                         <Tooltip text="Item Info" placement="bottom" theme={`${selectedIds.size !== 1 ? "disabled" : ""}`}>
//                                             <InteractiveIcon
//                                                 defaultIcon={fileInfoIcon}
//                                                 className={`${selectedIds.size !== 1 ? "disabled" : ""}`}
//                                                 alt="Info"
//                                                 onClick={selectedIds.size === 1 ? () => setModal({ type: "ItemInfoModal", data: selectedItem }) : undefined}
//                                             />
//                                         </Tooltip>
//                                     </li>
//                                     <li className="d-flex align-items-center justify-content-center">
//                                         <div className="divider" />
//                                     </li>

//                                     {/* 8. DELETE/TRASH ACTION (Disabled for viewers) */}
//                                     <li className="d-flex align-items-center justify-content-center">
//                                         <Tooltip text="Delete" placement="bottom" theme={`${isDisabled || isItemViewerOnly ? "disabled" : ""}`}>
//                                             <InteractiveIcon
//                                                 defaultIcon={deleteIcon}
//                                                 className={`${selectedIds.size === 0 || isItemViewerOnly ? "disabled" : ""}`}
//                                                 alt="Delete"
//                                                 onClick={!isDisabled && !isItemViewerOnly ? () => setModal({ type: 'DeleteModal', data: Array.from(selectedIds) }) : undefined}
//                                             />
//                                         </Tooltip>
//                                     </li>
//                                     <li className="d-flex align-items-center justify-content-center">
//                                         <div className="divider" />
//                                     </li>
//                                     {/* 9. TOGGLE SEARCH BAR */}
//                                     <li className="d-flex align-items-center justify-content-center">
//                                         <button className="header-search-btn" onClick={(e) => { setSearchBarOpen(prev => !prev); }}>
//                                             <InteractiveIcon
//                                                 defaultIcon={searchIconWhite}
//                                                 alt="Delete"
//                                                 width={24}
//                                                 height={24}
//                                             />
//                                         </button>
//                                     </li>
//                                 </ul>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </>

//     )
// }

// export default HeaderToolbar


















// import { useEffect, useState } from "react";
// import Tooltip from "../Tooltip";
// import InteractiveIcon from "../InteractiveIcon";
// import { Dropdown } from "react-bootstrap";
// import closeIcon from "@images/icon/close.svg";
// import userPlusIcon from "@images/icon/user-plus.svg";
// import downloadIcon from "@images/icon/download.svg";
// import renameIcon from "@images/icon/rename.svg";
// import colorIcon from "@images/icon/color.svg";
// import copyIcon from "@images/icon/copy.svg";
// import moveIcon from "@images/icon/move.svg";
// import deleteIcon from "@images/icon/trash.svg";
// import searchIconWhite from "@images/icon/search-icon-white.svg";
// import fileInfoIcon from "@images/icon/file-info.svg";
// import moreIcon from "@images/icon/more-icon.svg"; //  replace with an actual 3-dot "more" icon when you have one
// import { useFileExplorer } from "../../../context/FileExplorerContext";
// import { useDownload } from "../../../context/DownloadContext";
// import { useSearch } from "../../../context/SearchContext";

// //  --------------------------------------------------------------
// //  shared css class .disabled-action-btn is used instead of inline styles

// function HeaderToolbar({ setModal, searchBarOpen, setSearchBarOpen }) {
//     const { selectedIds, setSelectedIds, items, changeColorApi, isViewerOnly } = useFileExplorer();
//     const { downloadFile, downloadFolder, downloadMultiple } = useDownload();
//     const { isSearchMode, searchResults } = useSearch();

//     // ##################################################
//     // ---- STEP 1: Data setup --------------------------
//     // ##################################################
//     const displayItems = isSearchMode ? searchResults : items;
//     const selectedArray = Array.from(selectedIds);
//     const selectedItem = displayItems.find(item => item._id === selectedArray[0]);

//     const hasFolder =
//         selectedArray.length > 0 &&
//         selectedArray.every(id => displayItems.find(i => i._id === id)?.type === "folder");

//     const isItemViewerOnly = isViewerOnly || selectedArray.some(id => {
//         const item = displayItems.find(i => i._id === id);
//         return item?.permission === "viewer";
//     });

//     const isDisabled = selectedIds.size === 0;

//     useEffect(() => {
//         if (selectedIds && selectedIds.size > 0) {
//             setSearchBarOpen(false);
//         }
//     }, [selectedIds, setSearchBarOpen]);

//     // ##################################################
//     // ---- STEP 2: Responsive breakpoint tracking ------
//     // ##################################################
//     const [screenSize, setScreenSize] = useState("lg");
//     const [isMobileDevice, setIsMobileDevice] = useState(false);

//     useEffect(() => {
//         const checkSize = () => {
//             const w = window.innerWidth;
//             setIsMobileDevice(w < 768);
//             if (w > 1100) setScreenSize("lg");
//             else if (w > 900) setScreenSize("md");
//             else if (w > 700) setScreenSize("sm");
//             else if (w > 500) setScreenSize("xs");
//             else setScreenSize("xxs");
//         };
//         checkSize();
//         window.addEventListener("resize", checkSize);
//         return () => window.removeEventListener("resize", checkSize);
//     }, []);

//     // how many icons show inline before "More" kicks in, per breakpoint
//     const visibleCountMap = { lg: 8, md: 5, sm: 5, xs: 5, xxs: 3 };
//     const visibleCount = visibleCountMap[screenSize];
//     const isDesktop = screenSize === "lg";

//     // ##################################################
//     // ---- STEP 3: Toolbar actions - single source of truth
//     // ##################################################
//     const toolbarActions = [
//         {
//             key: "share",
//             label: "Share",
//             icon: userPlusIcon,
//             disabled: isDisabled || isItemViewerOnly || selectedIds.size !== 1,
//             onClick: () => {
//                 const selItems = displayItems.filter(i => selectedIds.has(i._id.toString()));
//                 setModal({ type: "shareUser", data: selItems });
//             },
//         },
//         {
//             key: "download",
//             label: "Download",
//             icon: downloadIcon,
//             disabled: isDisabled,
//             onClick: () => {
//                 const selItems = selectedArray.map(id => displayItems.find(i => i._id === id)).filter(Boolean);
//                 if (selItems.length === 1) {
//                     const item = selItems[0];
//                     item.type === "file" ? downloadFile(item) : downloadFolder(item);
//                 } else {
//                     downloadMultiple(selItems);
//                 }
//             },
//         },
//         {
//             key: "rename",
//             label: "Rename",
//             icon: renameIcon,
//             disabled: isDisabled || isItemViewerOnly || selectedIds.size !== 1,
//             onClick: () => setModal({ type: "RenameModal", data: selectedItem }),
//         },
//         {
//             key: "color",
//             label: "Change Color",
//             icon: colorIcon,
//             disabled: !hasFolder || isItemViewerOnly,
//             isColorDropdown: true,
//         },
//         {
//             key: "copy",
//             label: "Copy",
//             icon: copyIcon,
//             disabled: isDisabled || isItemViewerOnly,
//             onClick: () => setModal({ type: "CopyModal", data: Array.from(selectedIds) }),
//         },
//         {
//             key: "move",
//             label: "Move",
//             icon: moveIcon,
//             disabled: isDisabled || isItemViewerOnly,
//             onClick: () => setModal({ type: "MoveModal", data: Array.from(selectedIds) }),
//         },
//         {
//             key: "info",
//             label: "Item Info",
//             icon: fileInfoIcon,
//             disabled: selectedIds.size !== 1,
//             onClick: () => setModal({ type: "ItemInfoModal", data: selectedItem }),
//         },
//         {
//             key: "delete",
//             label: "Delete",
//             icon: deleteIcon,
//             disabled: isDisabled || isItemViewerOnly,
//             onClick: () => setModal({ type: "DeleteModal", data: Array.from(selectedIds) }),
//         },
//     ];

//     // ##################################################
//     // ---- STEP 4: Color dropdown renderer -------------
//     // used both inline (desktop/priority icons) and inside "More"
//     // ##################################################
//     const renderColorDropdown = (action, insideMore = false) => (
//         <Dropdown
//             drop={insideMore ? "start" : "down"}
//             popperConfig={{ strategy: "fixed" }}
//             container={document.body}
//             show={hasFolder && !isItemViewerOnly ? undefined : false}
//         >
//             <Dropdown.Toggle bsPrefix="p-0" className={insideMore ? "no-border-btn w-100 text-start" : "no-border-btn"}>
//                 {insideMore ? (
//                     <div
//                         className={`d-flex align-items-center gap-2 ${action.disabled ? "disabled-action-btn" : "enabled-action-text"}`}
//                     >
//                         <InteractiveIcon defaultIcon={action.icon} alt={action.label} width={22} className={!action.disabled ? "enabled-action-icon" : ""} />
//                         <span>{action.label}</span>
//                     </div>
//                 ) : (
//                     <Tooltip text={action.label} placement="bottom" theme={action.disabled ? "disabled" : ""}>
//                         <InteractiveIcon
//                             defaultIcon={action.icon}
//                             alt={action.label}
//                             className={action.disabled ? "disabled-action-btn" : ""}
//                         />
//                     </Tooltip>
//                 )}
//             </Dropdown.Toggle>
//             {selectedIds.size !== 0 && hasFolder && (
//                 <Dropdown.Menu className="colors-dd" style={{ zIndex: 9999 }}>
//                     <p className="title mb-3">Folder Color</p>
//                     <div className="d-flex align-items-center flex-wrap color-list">
//                         {["red", "orange", "yellow", "green", "green-dark", "blue", "violet", "pink", "gray"].map(color => (
//                             <Dropdown.Item
//                                 key={color}
//                                 className={`cursor-pointer color ${color}`}
//                                 onClick={() => changeColorApi(Array.from(selectedIds), color)}
//                             />
//                         ))}
//                     </div>
//                 </Dropdown.Menu>
//             )}
//         </Dropdown>
//     );

//     // ##################################################
//     // ---- STEP 5: Reusable renderer for a single inline icon
//     // ##################################################
//     const renderInlineAction = (action) => (
//         <li key={action.key} className="d-flex align-items-center justify-content-center">
//             {action.isColorDropdown ? (
//                 renderColorDropdown(action)
//             ) : (
//                 <Tooltip text={action.label} placement="bottom" theme={action.disabled ? "disabled" : ""}>
//                     <InteractiveIcon
//                         defaultIcon={action.icon}
//                         alt={action.label}
//                         className={action.disabled ? "disabled-action-btn" : ""}
//                         onClick={!action.disabled ? action.onClick : undefined}
//                     />
//                 </Tooltip>
//             )}
//             <div className="divider" />
//         </li>
//     );

//     // ##################################################
//     // ---- STEP 6: Reusable renderer for a "More" menu item
//     // ##################################################
//     const renderMoreItem = (action) => (
//         action.isColorDropdown ? (
//             <div key={action.key} className="more-dd-item d-flex align-items-center gap-2 dropdown-item">
//                 {renderColorDropdown(action, true)}
//             </div>
//         ) : (
//             <Dropdown.Item
//                 key={action.key}
//                 className={`d-flex align-items-center gap-2 ${action.disabled ? "disabled-action-btn" : "enabled-action-text"}`}
//                 onClick={() => { if (!action.disabled) action.onClick && action.onClick(); }}
//             >
//                 <InteractiveIcon defaultIcon={action.icon} alt={action.label} width={22} className={!action.disabled ? "enabled-action-icon" : ""} />
//                 <span>{action.label}</span>
//             </Dropdown.Item>
//         )
//     );

//     // ##################################################
//     // ---- RETURN ---------------------------------------
//     // ##################################################
//     return (
//         <>
//             {!searchBarOpen && (!isMobileDevice || selectedIds.size > 0) && (
//                 <div className="toolbar-box d-block">
//                     <div className="toolbar">
//                         <div className="toolbar-container">
//                             <div className="d-flex align-items-center">

//                                 {/* selection count - same for both desktop and mobile */}
//                                 {selectedIds.size !== 0 && (
//                                     <div className="selection-count">
//                                         <span className="cursor-pointer">
//                                             <InteractiveIcon defaultIcon={closeIcon} width={24} alt="" onClick={() => setSelectedIds(new Set())} />
//                                         </span>
//                                         {selectedIds.size} selected
//                                     </div>
//                                 )}

//                                 <ul className="mb-0 tools d-flex align-items-center">
//                                     {isDesktop ? (
//                                         // ---------------- DESKTOP: show everything inline, no More menu ----------------
//                                         toolbarActions.map(renderInlineAction)
//                                     ) : (
//                                         // ---------------- MOBILE/TABLET: priority icons + More dropdown ----------------
//                                         (!isMobileDevice || selectedIds.size > 0) ? (
//                                             <>
//                                                 {toolbarActions.slice(0, visibleCount).map(renderInlineAction)}

//                                                 {toolbarActions.slice(visibleCount).length > 0 && (
//                                                     <>
//                                                         <li className="d-flex align-items-center justify-content-center ">
//                                                             <Dropdown popperConfig={{ strategy: "fixed" }} container={document.body} className="toolbar-mobile-dropdown">
//                                                                 <Dropdown.Toggle className="no-border-btn more-toggle">
//                                                                     <Tooltip text="More" placement="bottom">
//                                                                         <span className="btn-only-icon">
//                                                                             <InteractiveIcon defaultIcon={moreIcon} alt="More" width={24} />
//                                                                         </span>
//                                                                     </Tooltip>
//                                                                 </Dropdown.Toggle>
//                                                                 <Dropdown.Menu className="more-dd toolbar-mobile-dropdown-menu " >
//                                                                     {toolbarActions.slice(visibleCount).map(renderMoreItem)}
//                                                                 </Dropdown.Menu>
//                                                             </Dropdown>
//                                                         </li>
//                                                         {!isMobileDevice && (
//                                                             <li className="d-flex align-items-center justify-content-center">
//                                                             <div className="divider" />
//                                                         </li>
//                                                         )}

//                                                     </>
//                                                 )}
//                                             </>
//                                         ) : null
//                                     )}

//                                     {/* SEARCH - only visible on desktop/tablet here */}
//                                     {!isMobileDevice && (
//                                         <li className="d-flex align-items-center justify-content-center">
//                                             <button className="header-search-btn" onClick={() => setSearchBarOpen(prev => !prev)}>
//                                                 <InteractiveIcon defaultIcon={searchIconWhite} alt="Search" width={24} height={24} />
//                                             </button>
//                                         </li>
//                                     )}
//                                 </ul>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </>
//     );
// }

// export default HeaderToolbar;


// import { useEffect, useState, useRef, useLayoutEffect } from "react";
// import Tooltip from "../Tooltip";
// import InteractiveIcon from "../InteractiveIcon";
// import { Dropdown } from "react-bootstrap";
// import closeIcon from "@images/icon/close.svg";
// import userPlusIcon from "@images/icon/user-plus.svg";
// import downloadIcon from "@images/icon/download.svg";
// import renameIcon from "@images/icon/rename.svg";
// import colorIcon from "@images/icon/color.svg";
// import copyIcon from "@images/icon/copy.svg";
// import moveIcon from "@images/icon/move.svg";
// import deleteIcon from "@images/icon/trash.svg";
// import searchIconWhite from "@images/icon/search-icon-white.svg";
// import fileInfoIcon from "@images/icon/file-info.svg";
// import moreIcon from "@images/icon/more-icon.svg";
// import { useFileExplorer } from "../../../context/FileExplorerContext";
// import { useDownload } from "../../../context/DownloadContext";
// import { useSearch } from "../../../context/SearchContext";

// function HeaderToolbar({ setModal, searchBarOpen, setSearchBarOpen }) {
//     const { selectedIds, setSelectedIds, items, changeColorApi, isViewerOnly } = useFileExplorer();
//     const { downloadFile, downloadFolder, downloadMultiple } = useDownload();
//     const { isSearchMode, searchResults } = useSearch();

//     const displayItems = isSearchMode ? searchResults : items;
//     const selectedArray = Array.from(selectedIds);
//     const selectedItem = displayItems.find(item => item._id === selectedArray[0]);

//     const hasFolder =
//         selectedArray.length > 0 &&
//         selectedArray.every(id => displayItems.find(i => i._id === id)?.type === "folder");

//     const isItemViewerOnly = isViewerOnly || selectedArray.some(id => {
//         const item = displayItems.find(i => i._id === id);
//         return item?.permission === "viewer";
//     });

//     const isDisabled = selectedIds.size === 0;

//     useEffect(() => {
//         if (selectedIds && selectedIds.size > 0) {
//             setSearchBarOpen(false);
//         }
//     }, [selectedIds, setSearchBarOpen]);

//     const [screenSize, setScreenSize] = useState("lg");
//     const [isMobileDevice, setIsMobileDevice] = useState(false);

//     useEffect(() => {
//         const checkSize = () => {
//             const w = window.innerWidth;
//             setIsMobileDevice(w < 768);
//             if (w > 1100) setScreenSize("lg");
//             else if (w > 900) setScreenSize("md");
//             else if (w > 700) setScreenSize("sm");
//             else if (w > 500) setScreenSize("xs");
//             else setScreenSize("xxs");
//         };
//         checkSize();
//         window.addEventListener("resize", checkSize);
//         return () => window.removeEventListener("resize", checkSize);
//     }, []);

//     const visibleCountMap = { lg: 8, md: 5, sm: 5, xs: 5, xxs: 3 };
//     const visibleCount = visibleCountMap[screenSize];
//     const isDesktop = screenSize === "lg";

//     // ---- generic clamp-to-viewport hook logic ----
//    const useClampedMenu = () => {
//     const menuRef = useRef(null);
//     const [open, setOpen] = useState(false);
//     const [style, setStyle] = useState({});

//     useLayoutEffect(() => {
//         if (!open || !menuRef.current) return;

//         const menu = menuRef.current;
//         menu.style.transform = "translateX(0px)";
//         const rect = menu.getBoundingClientRect();
//         const margin = 8;

//         let shiftX = 0;

//         if (rect.right > window.innerWidth - margin) {
//             shiftX = (window.innerWidth - margin) - rect.right;
//         }
//         if (rect.left + shiftX < margin) {
//             shiftX = margin - rect.left;
//         }

//         setStyle(shiftX !== 0 ? { transform: `translateX(${shiftX}px)` } : {});
//     }, [open]);

//     return { menuRef, open, setOpen, style };
// };

//     const moreMenu = useClampedMenu();
//     const colorMenu = useClampedMenu();
//     const colorMenuInMore = useClampedMenu();

//     const toolbarActions = [
//         {
//             key: "share",
//             label: "Share",
//             icon: userPlusIcon,
//             disabled: isDisabled || isItemViewerOnly || selectedIds.size !== 1,
//             onClick: () => {
//                 const selItems = displayItems.filter(i => selectedIds.has(i._id.toString()));
//                 setModal({ type: "shareUser", data: selItems });
//             },
//         },
//         {
//             key: "download",
//             label: "Download",
//             icon: downloadIcon,
//             disabled: isDisabled,
//             onClick: () => {
//                 const selItems = selectedArray.map(id => displayItems.find(i => i._id === id)).filter(Boolean);
//                 if (selItems.length === 1) {
//                     const item = selItems[0];
//                     item.type === "file" ? downloadFile(item) : downloadFolder(item);
//                 } else {
//                     downloadMultiple(selItems);
//                 }
//             },
//         },
//         {
//             key: "rename",
//             label: "Rename",
//             icon: renameIcon,
//             disabled: isDisabled || isItemViewerOnly || selectedIds.size !== 1,
//             onClick: () => setModal({ type: "RenameModal", data: selectedItem }),
//         },
//         {
//             key: "color",
//             label: "Change Color",
//             icon: colorIcon,
//             disabled: !hasFolder || isItemViewerOnly,
//             isColorDropdown: true,
//         },
//         {
//             key: "copy",
//             label: "Copy",
//             icon: copyIcon,
//             disabled: isDisabled || isItemViewerOnly,
//             onClick: () => setModal({ type: "CopyModal", data: Array.from(selectedIds) }),
//         },
//         {
//             key: "move",
//             label: "Move",
//             icon: moveIcon,
//             disabled: isDisabled || isItemViewerOnly,
//             onClick: () => setModal({ type: "MoveModal", data: Array.from(selectedIds) }),
//         },
//         {
//             key: "info",
//             label: "Item Info",
//             icon: fileInfoIcon,
//             disabled: selectedIds.size !== 1,
//             onClick: () => setModal({ type: "ItemInfoModal", data: selectedItem }),
//         },
//         {
//             key: "delete",
//             label: "Delete",
//             icon: deleteIcon,
//             disabled: isDisabled || isItemViewerOnly,
//             onClick: () => setModal({ type: "DeleteModal", data: Array.from(selectedIds) }),
//         },
//     ];

//     const renderColorDropdown = (action, insideMore = false) => {
//         const menu = insideMore ? colorMenuInMore : colorMenu;

//         return (
//             <Dropdown
//                 drop={insideMore ? "start" : "down"}
//                 popperConfig={{ strategy: "fixed" }}
//                 container={document.body}
//                 show={hasFolder && !isItemViewerOnly ? undefined : false}
//                 onToggle={(nextShow) => menu.setOpen(nextShow)}
//             >
//                 <Dropdown.Toggle
//                     bsPrefix="p-0"
//                     className={insideMore ? "no-border-btn w-100 text-start" : "no-border-btn"}
//                 >
//                     {insideMore ? (
//                         <div
//                             className={`d-flex align-items-center gap-2 ${action.disabled ? "disabled-action-btn" : "enabled-action-text"}`}
//                         >
//                             <InteractiveIcon defaultIcon={action.icon} alt={action.label} width={22} className={!action.disabled ? "enabled-action-icon" : ""} />
//                             <span>{action.label}</span>
//                         </div>
//                     ) : (
//                         <Tooltip text={action.label} placement="bottom" theme={action.disabled ? "disabled" : ""}>
//                             <InteractiveIcon
//                                 defaultIcon={action.icon}
//                                 alt={action.label}
//                                 className={action.disabled ? "disabled-action-btn" : ""}
//                             />
//                         </Tooltip>
//                     )}
//                 </Dropdown.Toggle>
//                 {selectedIds.size !== 0 && hasFolder && (
//                     <Dropdown.Menu
//                         ref={menu.menuRef}
//                         className="colors-dd"
//                         style={{ zIndex: 9999, ...menu.style }}
//                     >
//                         <p className="title mb-3">Folder Color</p>
//                         <div className="d-flex align-items-center flex-wrap color-list">
//                             {["red", "orange", "yellow", "green", "green-dark", "blue", "violet", "pink", "gray"].map(color => (
//                                 <Dropdown.Item
//                                     key={color}
//                                     className={`cursor-pointer color ${color}`}
//                                     onClick={() => changeColorApi(Array.from(selectedIds), color)}
//                                 />
//                             ))}
//                         </div>
//                     </Dropdown.Menu>
//                 )}
//             </Dropdown>
//         );
//     };

//     const renderInlineAction = (action) => (
//         <li key={action.key} className="d-flex align-items-center justify-content-center">
//             {action.isColorDropdown ? (
//                 renderColorDropdown(action)
//             ) : (
//                 <Tooltip text={action.label} placement="bottom" theme={action.disabled ? "disabled" : ""}>
//                     <InteractiveIcon
//                         defaultIcon={action.icon}
//                         alt={action.label}
//                         className={action.disabled ? "disabled-action-btn" : ""}
//                         onClick={!action.disabled ? action.onClick : undefined}
//                     />
//                 </Tooltip>
//             )}
//             <div className="divider" />
//         </li>
//     );

//     const renderMoreItem = (action) => (
//         action.isColorDropdown ? (
//             <div key={action.key} className="more-dd-item d-flex align-items-center gap-2 dropdown-item">
//                 {renderColorDropdown(action, true)}
//             </div>
//         ) : (
//             <Dropdown.Item
//                 key={action.key}
//                 className={`d-flex align-items-center gap-2 ${action.disabled ? "disabled-action-btn" : "enabled-action-text"}`}
//                 onClick={() => { if (!action.disabled) action.onClick && action.onClick(); }}
//             >
//                 <InteractiveIcon defaultIcon={action.icon} alt={action.label} width={22} className={!action.disabled ? "enabled-action-icon" : ""} />
//                 <span>{action.label}</span>
//             </Dropdown.Item>
//         )
//     );

//     return (
//         <>
//             {!searchBarOpen && (!isMobileDevice || selectedIds.size > 0) && (
//                 <div className="toolbar-box d-block">
//                     <div className="toolbar">
//                         <div className="toolbar-container">
//                             <div className="d-flex align-items-center">

//                                 {selectedIds.size !== 0 && (
//                                     <div className="selection-count">
//                                         <span className="cursor-pointer">
//                                             <InteractiveIcon defaultIcon={closeIcon} width={24} alt="" onClick={() => setSelectedIds(new Set())} />
//                                         </span>
//                                         {selectedIds.size} selected
//                                     </div>
//                                 )}

//                                 <ul className="mb-0 tools d-flex align-items-center">
//                                     {isDesktop ? (
//                                         toolbarActions.map(renderInlineAction)
//                                     ) : (
//                                         (!isMobileDevice || selectedIds.size > 0) ? (
//                                             <>
//                                                 {toolbarActions.slice(0, visibleCount).map(renderInlineAction)}

//                                                 {toolbarActions.slice(visibleCount).length > 0 && (
//                                                     <>
//                                                         <li className="d-flex align-items-center justify-content-center ">
//                                                             <Dropdown
//                                                                 popperConfig={{ strategy: "fixed" }}
//                                                                 container={document.body}
//                                                                 className="toolbar-mobile-dropdown"
//                                                                 onToggle={(nextShow) => moreMenu.setOpen(nextShow)}
//                                                             >
//                                                                 <Dropdown.Toggle className="no-border-btn more-toggle">
//                                                                     <Tooltip text="More" placement="bottom">
//                                                                         <span className="btn-only-icon">
//                                                                             <InteractiveIcon defaultIcon={moreIcon} alt="More" width={24} />
//                                                                         </span>
//                                                                     </Tooltip>
//                                                                 </Dropdown.Toggle>
//                                                                 <Dropdown.Menu
//                                                                     ref={moreMenu.menuRef}
//                                                                     className="more-dd toolbar-mobile-dropdown-menu"
//                                                                     style={moreMenu.style}
//                                                                 >
//                                                                     {toolbarActions.slice(visibleCount).map(renderMoreItem)}
//                                                                 </Dropdown.Menu>
//                                                             </Dropdown>
//                                                         </li>
//                                                         {!isMobileDevice && (
//                                                             <li className="d-flex align-items-center justify-content-center">
//                                                                 <div className="divider" />
//                                                             </li>
//                                                         )}
//                                                     </>
//                                                 )}
//                                             </>
//                                         ) : null
//                                     )}

//                                     {!isMobileDevice && (
//                                         <li className="d-flex align-items-center justify-content-center">
//                                             <button className="header-search-btn" onClick={() => setSearchBarOpen(prev => !prev)}>
//                                                 <InteractiveIcon defaultIcon={searchIconWhite} alt="Search" width={24} height={24} />
//                                             </button>
//                                         </li>
//                                     )}
//                                 </ul>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </>
//     );
// }

// export default HeaderToolbar;





import { useEffect, useState, useRef, useLayoutEffect } from "react";
import Tooltip from "../Tooltip";
import InteractiveIcon from "../InteractiveIcon";
import { Dropdown } from "react-bootstrap";
import closeIcon from "@images/icon/close.svg";
import userPlusIcon from "@images/icon/user-plus.svg";
import downloadIcon from "@images/icon/download.svg";
import renameIcon from "@images/icon/rename.svg";
import colorIcon from "@images/icon/color.svg";
import copyIcon from "@images/icon/copy.svg";
import moveIcon from "@images/icon/move.svg";
import deleteIcon from "@images/icon/trash.svg";
import searchIconWhite from "@images/icon/search-icon-white.svg";
import fileInfoIcon from "@images/icon/file-info.svg";
import moreIcon from "@images/icon/more-icon.svg";
import { useFileExplorer } from "../../../context/FileExplorerContext";
import { useDownload } from "../../../context/DownloadContext";
import { useSearch } from "../../../context/SearchContext";

function HeaderToolbar({ setModal, searchBarOpen, setSearchBarOpen, disableSearch }) {
    const { selectedIds, setSelectedIds, items, changeColorApi, isViewerOnly } = useFileExplorer();
    const { downloadFile, downloadFolder, downloadMultiple } = useDownload();
    const { isSearchMode, searchResults } = useSearch();

    const displayItems = isSearchMode ? searchResults : items;
    const selectedArray = Array.from(selectedIds);
    const selectedItem = displayItems.find(item => item._id === selectedArray[0]);
    const hasFolder =
        selectedArray.length > 0 &&
        selectedArray.every(id => displayItems.find(i => i._id === id)?.type === "folder");

    const isItemViewerOnly = selectedArray.some(id => {
        const item = displayItems.find(i => i._id === id);
        if (!item) return true;

        // If the item has an explicit permission set (e.g., "editor" or "viewer"), use it
        if (item.permission) {
            return item.permission === "viewer";
        }

        // Otherwise, fall back to the current folder's permission
        return isViewerOnly;
    });

    const isDisabled = selectedIds.size === 0;
    const isSelectionTrashed =
        selectedArray.length > 0 &&
        selectedArray.every(id => displayItems.find(i => i._id === id)?.isTrashed);

    useEffect(() => {
        if (selectedIds && selectedIds.size > 0) {
            setSearchBarOpen(false);
        }
    }, [selectedIds, setSearchBarOpen]);

    const [screenSize, setScreenSize] = useState("lg");
    const [isMobileDevice, setIsMobileDevice] = useState(false);
    const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
    const [mobileColorOpen, setMobileColorOpen] = useState(false);

    useEffect(() => {
        const checkSize = () => {
            const w = window.innerWidth;
            setIsMobileDevice(w < 768);
            if (w > 1100) setScreenSize("lg");
            else if (w > 992) setScreenSize("md");
            else if (w > 768) setScreenSize("sm");
            else if (w > 575) setScreenSize("xs");
            else setScreenSize("xxs");
        };
        checkSize();
        window.addEventListener("resize", checkSize);
        return () => window.removeEventListener("resize", checkSize);
    }, []);

    useEffect(() => {
        if (!isMobileDevice) setMobileMoreOpen(false);
    }, [isMobileDevice]);

    useEffect(() => {
        if (!mobileMoreOpen) setMobileColorOpen(false);
    }, [mobileMoreOpen]);

    const visibleCountMap = { lg: 8, md: 5, sm: 4, xs: 5, xxs: 3 };
    const visibleCount = visibleCountMap[screenSize];
    const isDesktop = screenSize === "lg";

    const useClampedMenu = () => {
        const menuRef = useRef(null);
        const [open, setOpen] = useState(false);
        const [style, setStyle] = useState({});

        useLayoutEffect(() => {
            if (!open || !menuRef.current) return;

            if (window.innerWidth < 768) {
                setStyle({});
                return;
            }

            const menu = menuRef.current;
            menu.style.transform = "translateX(0px)";
            const rect = menu.getBoundingClientRect();
            const margin = 8;

            let shiftX = 0;

            if (rect.right > window.innerWidth - margin) {
                shiftX = (window.innerWidth - margin) - rect.right;
            }
            if (rect.left + shiftX < margin) {
                shiftX = margin - rect.left;
            }

            setStyle(shiftX !== 0 ? { transform: `translateX(${shiftX}px)` } : {});
        }, [open]);

        return { menuRef, open, setOpen, style };
    };

    const moreMenu = useClampedMenu();
    const colorMenu = useClampedMenu();

    const toolbarActions = [
        {
            key: "share",
            label: "Share",
            icon: userPlusIcon,
            disabled: isDisabled || isItemViewerOnly || selectedIds.size !== 1 || isSelectionTrashed,
            onClick: () => {
                const selItems = displayItems.filter(i => selectedIds.has(i._id.toString()));
                setModal({ type: "shareUser", data: selItems });
            },
        },
        {
            key: "download",
            label: "Download",
            icon: downloadIcon,
            disabled: isDisabled || isSelectionTrashed,
            onClick: () => {
                const selItems = selectedArray.map(id => displayItems.find(i => i._id === id)).filter(Boolean);
                if (selItems.length === 1) {
                    const item = selItems[0];
                    item.type === "file" ? downloadFile(item) : downloadFolder(item);
                } else {
                    downloadMultiple(selItems);
                }
            },
        },
        {
            key: "rename",
            label: "Rename",
            icon: renameIcon,
            disabled: isDisabled || isItemViewerOnly || selectedIds.size !== 1 || isSelectionTrashed,
            onClick: () => setModal({ type: "RenameModal", data: selectedItem }),
        },
        {
            key: "color",
            label: "Change Color",
            icon: colorIcon,
            disabled: !hasFolder || isItemViewerOnly || isSelectionTrashed,
            isColorDropdown: true,
        },
        {
            key: "copy",
            label: "Copy",
            icon: copyIcon,
            disabled: isDisabled || isItemViewerOnly || isSelectionTrashed,
            onClick: () => setModal({ type: "CopyModal", data: Array.from(selectedIds) }),
        },
        {
            key: "move",
            label: "Move",
            icon: moveIcon,
            disabled: isDisabled || isItemViewerOnly || isSelectionTrashed,
            onClick: () => setModal({ type: "MoveModal", data: Array.from(selectedIds) }),
        },
        {
            key: "info",
            label: "Item Info",
            icon: fileInfoIcon,
            disabled: selectedIds.size !== 1 || isSelectionTrashed,
            onClick: () => setModal({ type: "ItemInfoModal", data: selectedItem }),
        },
        {
            key: "delete",
            label: "Delete",
            icon: deleteIcon,
            disabled: isDisabled || isItemViewerOnly || isSelectionTrashed,
            onClick: () => setModal({ type: "DeleteModal", data: Array.from(selectedIds) }),
        },
    ];

    const renderColorDropdown = (action) => {
        const menu = colorMenu;

        return (
            <Dropdown
                drop="down"
                popperConfig={{ strategy: "fixed" }}
                container={document.body}
                show={hasFolder && !isItemViewerOnly ? undefined : false}
                onToggle={(nextShow) => menu.setOpen(nextShow)}
            >
                <Dropdown.Toggle bsPrefix="p-0" className="no-border-btn">
                    <Tooltip text={action.label} placement="bottom" theme={action.disabled ? "disabled" : ""}>
                        <InteractiveIcon
                            defaultIcon={action.icon}
                            alt={action.label}
                            className={action.disabled ? "disabled-action-btn" : ""}
                        />
                    </Tooltip>
                </Dropdown.Toggle>
                {selectedIds.size !== 0 && hasFolder && (
                    <Dropdown.Menu
                        ref={menu.menuRef}
                        className="colors-dd"
                        style={{ zIndex: 9999, ...menu.style }}
                    >
                        <p className="title mb-3">Folder Color</p>
                        <div className="d-flex align-items-center flex-wrap color-list">
                            {["red", "orange", "yellow", "green", "green-dark", "blue", "violet", "pink", "gray"].map(color => (
                                <Dropdown.Item
                                    key={color}
                                    className={`cursor-pointer color ${color}`}
                                    onClick={() => changeColorApi(Array.from(selectedIds), color)}
                                />
                            ))}
                        </div>
                    </Dropdown.Menu>
                )}
            </Dropdown>
        );
    };

    const renderInlineAction = (action) => (
        <li key={action.key} className="d-flex align-items-center justify-content-center">
            {action.isColorDropdown ? (
                renderColorDropdown(action)
            ) : (
                <Tooltip text={action.label} placement="bottom" theme={action.disabled ? "disabled" : ""}>
                    <InteractiveIcon
                        defaultIcon={action.icon}
                        alt={action.label}
                        className={action.disabled ? "disabled-action-btn" : ""}
                        onClick={!action.disabled ? action.onClick : undefined}
                    />
                </Tooltip>
            )}
            <div className="divider" />
        </li>
    );

    const renderMoreItem = (action) => (
        action.isColorDropdown ? (
            <div key={action.key} className="more-dd-item d-flex align-items-center gap-2 dropdown-item">
                {renderColorDropdown(action)}
            </div>
        ) : (
            <Dropdown.Item
                key={action.key}
                className={`d-flex align-items-center gap-2 ${action.disabled ? "disabled-action-btn" : "enabled-action-text"}`}
                onClick={() => { if (!action.disabled) action.onClick && action.onClick(); }}
            >
                <InteractiveIcon
                    defaultIcon={action.icon}
                    alt={action.label}
                    width={22}
                    className={!action.disabled ? "enabled-action-icon" : ""}
                    customStyle={action.disabled ? { opacity: 1 } : {}}
                />
                <span style={action.disabled ? { opacity: 1, color: "var(--dark-87)" } : {}}>{action.label}</span>
            </Dropdown.Item>
        )
    );

    const renderMobileMoreItem = (action) => {
        if (action.isColorDropdown) {
            return (
                <div key={action.key} className="more-dd-item-wrapper">
                    <div
                        className={`d-flex align-items-center gap-2 dropdown-item ${action.disabled ? "disabled-action-btn" : "enabled-action-text"}`}
                        onClick={() => { if (!action.disabled) setMobileColorOpen(prev => !prev); }}
                    >
                        <InteractiveIcon
                            defaultIcon={action.icon}
                            alt={action.label}
                            width={22}
                            className={!action.disabled ? "enabled-action-icon" : ""}
                            customStyle={action.disabled ? { opacity: 1 } : {}}
                        />
                        <span style={action.disabled ? { opacity: 1, color: "var(--dark-87)" } : {}}>{action.label}</span>
                    </div>

                    {mobileColorOpen && !action.disabled && (
                        <div className="mobile-color-panel">
                            <p className="title mb-3">Folder Color</p>
                            <div className="d-flex align-items-center flex-wrap color-list">
                                {["red", "orange", "yellow", "green", "green-dark", "blue", "violet", "pink", "gray"].map(color => (
                                    <div
                                        key={color}
                                        className={`cursor-pointer color ${color}`}
                                        onClick={() => {
                                            changeColorApi(Array.from(selectedIds), color);
                                            setMobileColorOpen(false);
                                            setMobileMoreOpen(false);
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div
                key={action.key}
                className={`d-flex align-items-center gap-2 dropdown-item ${action.disabled ? "disabled-action-btn" : "enabled-action-text"}`}
                onClick={() => {
                    if (!action.disabled) {
                        action.onClick && action.onClick();
                        setMobileMoreOpen(false);
                    }
                }}
            >
                <InteractiveIcon
                    defaultIcon={action.icon}
                    alt={action.label}
                    width={22}
                    className={!action.disabled ? "enabled-action-icon" : ""}
                    customStyle={action.disabled ? { opacity: 1 } : {}}
                />
                <span style={action.disabled ? { opacity: 1, color: "var(--dark-87)" } : {}}>{action.label}</span>
            </div>
        );
    };

    return (
        <>
            {!searchBarOpen && (!isMobileDevice || selectedIds.size > 0) && (
                <div className="toolbar-box d-block">
                    <div className="toolbar">
                        <div className="toolbar-container">
                            <div className="d-flex align-items-center">

                                {selectedIds.size !== 0 && (
                                    <div className="selection-count">
                                        <span className="cursor-pointer">
                                            <InteractiveIcon defaultIcon={closeIcon} width={24} alt="" onClick={() => setSelectedIds(new Set())} />
                                        </span>
                                        {selectedIds.size} selected
                                    </div>
                                )}

                                <ul className="mb-0 tools d-flex align-items-center">
                                    {isDesktop ? (
                                        toolbarActions.map(renderInlineAction)
                                    ) : (
                                        (!isMobileDevice || selectedIds.size > 0) ? (
                                            <>
                                                {toolbarActions.slice(0, visibleCount).map(renderInlineAction)}

                                                {toolbarActions.slice(visibleCount).length > 0 && (
                                                    <>
                                                        <li className="d-flex align-items-center justify-content-center ">
                                                            {isMobileDevice ? (
                                                                <span className="me-1" onClick={() => setMobileMoreOpen(true)}>
                                                                    <Tooltip text="More" placement="bottom">
                                                                        <InteractiveIcon defaultIcon={moreIcon} alt="More" width={18} height={24} />
                                                                    </Tooltip>
                                                                </span>
                                                            ) : (
                                                                <Dropdown
                                                                    popperConfig={{ strategy: "fixed" }}
                                                                    container={document.body}
                                                                    className="toolbar-mobile-dropdown"
                                                                    onToggle={(nextShow) => moreMenu.setOpen(nextShow)}
                                                                >
                                                                    <Dropdown.Toggle className="no-border-btn more-toggle">
                                                                        <Tooltip text="More" placement="bottom">
                                                                            <span className="btn-only-icon">
                                                                                <InteractiveIcon defaultIcon={moreIcon} alt="More" width={18} height={24} />
                                                                            </span>
                                                                        </Tooltip>
                                                                    </Dropdown.Toggle>
                                                                    <Dropdown.Menu
                                                                        ref={moreMenu.menuRef}
                                                                        className="more-dd toolbar-mobile-dropdown-menu"
                                                                        style={moreMenu.style}
                                                                    >
                                                                        {toolbarActions.slice(visibleCount).map(renderMoreItem)}
                                                                    </Dropdown.Menu>
                                                                </Dropdown>
                                                            )}
                                                        </li>
                                                        {!isMobileDevice && (
                                                            <li className="d-flex align-items-center justify-content-center">
                                                                <div className="divider" />
                                                            </li>
                                                        )}
                                                    </>
                                                )}
                                            </>
                                        ) : null
                                    )}

                                    {!isMobileDevice && (
                                        <li className="d-flex align-items-center justify-content-center">
                                            <button
                                                className={`header-search-btn ${disableSearch ? "disabled-action-btn" : ""}`}
                                                onClick={!disableSearch ? () => setSearchBarOpen(prev => !prev) : undefined}
                                                disabled={disableSearch}
                                            >
                                                <InteractiveIcon
                                                    defaultIcon={searchIconWhite}
                                                    alt="Search"
                                                    width={24}
                                                    height={24}
                                                    className={disableSearch ? "disabled-action-btn" : ""}
                                                />
                                            </button>
                                        </li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isMobileDevice && mobileMoreOpen && (
                <>
                    <div
                        className="mobile-more-overlay"
                        onClick={() => setMobileMoreOpen(false)}
                    />
                    <div className="mobile-more-sheet">
                        {toolbarActions.slice(visibleCount).map(renderMobileMoreItem)}
                    </div>
                </>
            )}
        </>
    );
}

export default HeaderToolbar;