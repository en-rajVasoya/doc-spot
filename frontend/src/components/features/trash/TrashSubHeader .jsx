import { memo } from "react";
import InteractiveIcon from "../../layout/InteractiveIcon";
import Tooltip from "../../layout/Tooltip";
import menuIcon from "@images/icon/menu.svg";
import gridIcon from "@images/icon/grid.svg";
import Breadcrumbs from "../Breadcrumbs";
import { useTrash } from "../../../context/TrashContext";
import { useNavigate } from "react-router-dom";
import backIcon from "@images/icon/arrow-left-outline-icon.svg";
import { useNotification } from "../../../context/NotificationContext";
import { useDownload } from "../../../context/DownloadContext";
import deleteIcon from "@images/icon/trash.svg";
import useResponsive from "../../../hooks/useResponsive";

const TrashSubHeader = memo(function TrashSubHeader({ view, setView, setModal }) {
    const { trail, navigateTo, items, selectedIds, setSelectedIds, restoreItemApi } = useTrash()
    const { downloadFile, downloadFolder, downloadMultiple } = useDownload()
    const { showNotification } = useNotification()
    const { isMobile } = useResponsive()
    const navigate = useNavigate();

    const selectedArray = Array.from(selectedIds || new Set())

    // ##################################################
    // ---- STEP 1: Empty bin handler -------------------
    // ##################################################
    const handleEmptyBin = () => {
        if (items.length === 0) return
        const allIds = items.map(i => i._id)
        setModal({ type: "DeleteForeverModal", data: allIds })
    }

    // ##################################################
    // ---- STEP 2: Restore selected items --------------
    // ##################################################
    const handleRestore = async (targetFolder) => {
    if (targetFolder) {
        await restoreItemApi(targetFolder.id)
    } else {
        if (selectedArray.length === 0) return
        await restoreItemApi(selectedArray)
    }
}

    // ##################################################
    // ---- STEP 3: Delete items forever ----------------
    // ##################################################
    const handleDeleteForever = (targetFolder) => {
        if (targetFolder) {
            setModal({ type: "DeleteForeverModal", data: [targetFolder.id] })
        } else {
            if (selectedArray.length === 0) return
            setModal({ type: "DeleteForeverModal", data: selectedArray })
        }
    }

    return (
        <>


            <header className="header header-trash">
                {isMobile ? (
                    <>
                        <div className="header-view d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center">
                                <Breadcrumbs
                                    trail={[]}
                                    onNavigate={navigateTo}
                                    onHomeClick={() => navigate("/trash-dashboard")}
                                    maxVisible={1}
                                    rootLabel={
                                        <div className="trash-box-breadcrumb breadcrumb-title">     
                                          <InteractiveIcon defaultIcon={deleteIcon} className="me-2" width={24} />                               
                                            Trash
                                        </div>
                                    }
                                    actions={[]}
                                    selectedIds={selectedIds}
                                    onRestore={handleRestore}
                                    onDeleteForever={handleDeleteForever}
                                    downloadFile={downloadFile}
                                    downloadFolder={downloadFolder}
                                    downloadMultiple={downloadMultiple}
                                    items={items}
                                />
                            </div>
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

                        {trail.length > 0 && (
                            <div className="header-view d-flex align-items-center justify-content-between pt-0 mt-2">
                                <div className="breadcrumb-mobile-row">
                                    <Breadcrumbs
                                        trail={trail}
                                        onNavigate={navigateTo}
                                        onHomeClick={() => navigate("/trash-dashboard")}
                                        maxVisible={1}
                                        rootLabel=""
                                        hideRoot={true}
                                        actions={["restore", "deleteForever"]}
                                        selectedIds={selectedIds}
                                        onRestore={handleRestore}
                                        onDeleteForever={handleDeleteForever}
                                        downloadFile={downloadFile}
                                        downloadFolder={downloadFolder}
                                        downloadMultiple={downloadMultiple}
                                        items={items}
                                        currentFolderId={trail.length > 0 ? trail[trail.length - 1].id : null}
                                        currentFolderMeta={trail.length > 0 ? trail[trail.length - 1] : null}
                                    />
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="header-view d-flex align-items-center justify-content-between">
                        <div className="d-flex align-itmes-cnter">
                            <Breadcrumbs
                                trail={trail}
                                onNavigate={navigateTo}
                                onHomeClick={() => navigate("/trash-dashboard")}
                                maxVisible={2}
                                rootLabel={
                                    <div className="trash-box-breadcrumb breadcrumb-title">     
                                      <InteractiveIcon defaultIcon={deleteIcon} className="me-2" width={24} />                               
                                        Trash
                                    </div>
                                }
                                actions={trail.length === 0 ? [] : ["restore", "deleteForever"]}
                                selectedIds={selectedIds}
                                onRestore={handleRestore}
                                onDeleteForever={handleDeleteForever}
                                downloadFile={downloadFile}
                                downloadFolder={downloadFolder}
                                downloadMultiple={downloadMultiple}
                                items={items}
                                currentFolderId={trail.length > 0 ? trail[trail.length - 1].id : null}
                                currentFolderMeta={trail.length > 0 ? trail[trail.length - 1] : null}
                            />
                        </div>

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
                )}
            </header>
            {/* full width notice bar */}
            {/* {items.length > 0 && (
                <div className="empty-bin-section ">
                    <span>
                        Items in trash are deleted forever after 30 days
                    </span>

                </div>
            )} */}
            <div className="empty-bin-section ">
                    <span>
                        Items in trash are deleted forever after 30 days
                    </span>

                </div>

        </>
    );
})

export default TrashSubHeader;