import React, { memo, useRef } from "react";
import InteractiveIcon from "../InteractiveIcon";
import Tooltip from "../Tooltip";
import menuIcon from "@images/icon/menu.svg";
import gridIcon from "@images/icon/grid.svg";
import addFileIcon from "@images/icon/file-plus.svg";
import { useFileExplorer } from "../../../context/FileExplorerContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useUpload } from "../../../context/UploadContext";
import { useDownload } from "../../../context/DownloadContext";
import Breadcrumbs from "../../features/Breadcrumbs";
import { getRoute } from "../../../utils/getRoutes.js";
import sharedWithIcon from "@images/icon/shared-with-me-icon.svg";
import userPlusIcon from "@images/icon/user-plus.svg";


// ---- SubHeader Component -------------------------
// This component renders the secondary navigation bar 
// which includes the breadcrumbs and the list/grid view toggle.

const SubHeader = memo(function SubHeader({ view, setView, setModal, isSearchMode }) {
    // 1. Pull necessary state and functions from Contexts
    const { trail, selectedIds, items, currentFolderId, navigateTo, changeColorApi, isViewerOnly, currentFolderMeta } = useFileExplorer();
    const { addFiles, checkAndUpload, openScanningPanel } = useUpload();
    const { downloadFile, downloadFolder, downloadMultiple } = useDownload();

    // 2. Setup routing hooks for navigation
    const navigate = useNavigate()
    const location = useLocation()

    
    // ---- STEP 1: Determine Route Prefix --------------
    // Checks the current URL path to figure out which 
    // root dashboard the user is currently browsing.
    
    const getPathPrefix = () => {
        if (location.pathname.startsWith(getRoute.SHARED_WITH_ME)) return getRoute.SHARED_WITH_ME;
        if (location.pathname.startsWith(getRoute.SHARED)) return getRoute.SHARED;
        return getRoute.DASHBOARD;
    };

    
    // ---- STEP 2: Determine Root Label ----------------
    // Sets the very first breadcrumb label (e.g. "My Docspot") 
    // depending on the active route.
    
    const getRootLabel = () => {
        if (location.pathname.startsWith(getRoute.SHARED_WITH_ME)) return (
            <div className="share-with-me breadcrumb-title">
                <InteractiveIcon defaultIcon={sharedWithIcon} className="me-2" width={24} />
                Share with me 
            </div>
        );
        if (location.pathname.startsWith(getRoute.SHARED)) return (
            <div className="share-with-me breadcrumb-title">
                <InteractiveIcon defaultIcon={userPlusIcon} className="me-2" width={24} />
                Shared
            </div>
        );
        return "My Docspot";
    };

    
    // ---- STEP 3: Permission Logic & Breadcrumb Actions
    // Calculates what options should be available inside 
    // the breadcrumb dropdown based on the folder level.
    

    // Check if user is at the root of a Shared folder (trail is empty)
    const isSharedRoot = (location.pathname.startsWith(getRoute.SHARED_WITH_ME) || location.pathname.startsWith(getRoute.SHARED)) && trail.length === 0;

    let actionsList = [];

    if (isSharedRoot) {
        // SCENARIO 1: Shared Root -> No menu opens, purely read-only structural view
        actionsList = [];
    } else if (trail.length === 0) {
        // SCENARIO 2: My Docspot Root -> User is at home, only allow creation actions
        actionsList = ["newFolder", "uploadFolder", "addFiles"];
    } else {
        // SCENARIO 3: Inside ANY Folder -> Show all context actions (including info, share, trash)
        actionsList = ["newFolder", "uploadFolder", "addFiles", "share", "download", "rename", "changeColor", "copy", "move", "info", "trash"];
    }

    return (
        <>
            {/* Only display the subheader if the user is NOT actively searching */}
            {!isSearchMode && (
                <header className="header">

                    {/* ################################################## */}
                    {/* ---- MAIN HEADER ROW ----------------------------- */}
                    {/* ################################################## */}
                    <div className="header-view d-flex align-items-center justify-content-between ">

                        {/* --- BREADCRUMBS COMPONENT --- */}
                        {/* Passes all calculated navigation and permission data to the breadcrumb renderer */}
                        <Breadcrumbs
                            trail={trail}
                            onNavigate={navigateTo}
                            onHomeClick={() => navigate(getPathPrefix())}
                            maxVisible={2}
                            rootLabel={getRootLabel()}
                            actions={actionsList}
                            setModal={setModal}
                            selectedIds={selectedIds}
                            items={items}
                            currentFolderId={currentFolderId}
                            addFiles={checkAndUpload}
                            openScanningPanel={openScanningPanel}
                            downloadFile={downloadFile}
                            downloadFolder={downloadFolder}
                            downloadMultiple={downloadMultiple}
                            changeColor={changeColorApi}
                            isViewerOnly={isViewerOnly}
                            currentFolderMeta={currentFolderMeta}
                        />

                        {/* --- VIEW TOGGLE BUTTONS --- */}
                        {/* Allows switching between List and Grid layouts */}
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
                                            className={`btn btn-icon rounded-start-0  ${view === "grid" ? "view-active" : ""}`}
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
            )}
        </>
    );
})

export default SubHeader;