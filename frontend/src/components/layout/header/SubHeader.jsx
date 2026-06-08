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



const SubHeader = memo(function SubHeader({ view, setView, setModal, isSearchMode }) {
    const { trail, selectedIds, items, currentFolderId, navigateTo, changeColorApi, isViewerOnly, currentFolderMeta  } = useFileExplorer();
    const { addFiles, checkAndUpload, openScanningPanel } = useUpload();
    const { downloadFile, downloadFolder, downloadMultiple } = useDownload();
    const navigate = useNavigate()
    const location = useLocation()

    const getPathPrefix = () => {
        if (location.pathname.startsWith(getRoute.SHARED_WITH_ME)) return getRoute.SHARED_WITH_ME;
        if (location.pathname.startsWith(getRoute.SHARED)) return getRoute.SHARED;
        return getRoute.DASHBOARD;
    };

    const getRootLabel = () => {
        if (location.pathname.startsWith(getRoute.SHARED_WITH_ME)) return "Shared with me";
        if (location.pathname.startsWith(getRoute.SHARED)) return "Shared";
        return "Home";
    };

    return (
        <>
            {!isSearchMode && (
                <header className="header">


                    {/*  here breadcumb component here  */}
                    <div className="header-view d-flex align-items-center justify-content-between ">
                        <Breadcrumbs
                            trail={trail}
                            onNavigate={navigateTo}
                            onHomeClick={() => navigate(getPathPrefix())}
                            maxVisible={2}
                            rootLabel={getRootLabel()}
                            actions={["newFolder", "uploadFolder", "addFiles", "share", "download", "rename", "changeColor", "copy", "move", "trash", ]}
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