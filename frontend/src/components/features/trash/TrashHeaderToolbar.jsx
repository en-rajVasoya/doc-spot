import Tooltip from "../../layout/Tooltip";
import InteractiveIcon from "../../layout/InteractiveIcon";
import closeIcon from "@images/icon/close.svg";
import downloadIcon from "@images/icon/download.svg";
import retryAddIcon from "@images/icon/retry-add-icon.svg";
import deleteIcon from "@images/icon/trash.svg";
import searchIconWhite from "@images/icon/search-icon-white.svg";
import { useTrash } from "../../../context/TrashContext";
import { useDownload } from "../../../context/DownloadContext";
import { useNotification } from "../../../context/NotificationContext";

function TrashHeaderToolbar({ setModal, searchBarOpen, setSearchBarOpen }) {
    const { selectedIds, setSelectedIds, items, restoreItemApi } = useTrash();
    const { showNotification } = useNotification()
    const { downloadFile, downloadFolder, downloadMultiple } = useDownload();

    const selectedArray = Array.from(selectedIds);
    const isDisabled = selectedIds.size === 0;

    //  restore button
    const handleRestore = async () => {
        for (const id of selectedArray) {
            await restoreItemApi(id, true)
        }
        const message = selectedArray.length > 1 ? "Items restored successfully" : "Item restored successfully"
        showNotification(message, "success", "bottom-center")
        setSelectedIds(new Set())
    }

    return (
        <>
            {!searchBarOpen && (
                <div className="trash-header-toolbar toolbar-box d-block">
                    <div className="toolbar">
                        <div className="toolbar-container">
                            <div className="d-flex align-items-center">
                                {selectedIds.size !== 0 && (
                                    <div className="selection-count">
                                        <span className="cursor-pointer">
                                            <InteractiveIcon
                                                defaultIcon={closeIcon}
                                                width={24}
                                                alt=""
                                                onClick={() => setSelectedIds(new Set())}
                                            />
                                        </span>
                                        {selectedIds.size} selected
                                    </div>
                                )}

                                <ul className="mb-0 tools">

                                    {/* DOWNLOAD */}
                                    {/* <li className="d-flex align-items-center justify-content-center">
                                <Tooltip text="Download" placement="bottom" theme={`${isDisabled ? "disabled" : ""}`}>
                                    <InteractiveIcon
                                        defaultIcon={downloadIcon}
                                        alt="Download"
                                        className={`${isDisabled ? "disabled" : ""}`}
                                        onClick={() => {
                                            if(isDisabled) return
                                            const selectedItems = selectedArray
                                                .map(id => items.find(i => i._id === id))
                                                .filter(Boolean)
                                            if(selectedArray.length === 1){
                                                const item = selectedItems[0]
                                                if(item.type === "file"){
                                                    downloadFile(item)
                                                } else {
                                                    downloadFolder(item)
                                                }
                                            } else {
                                                downloadMultiple(selectedItems)
                                            }
                                        }}
                                    />
                                </Tooltip>
                            </li>

                            <li className="d-flex align-items-center justify-content-center">
                                <div className="divider" />
                            </li> */}

                                    {/* RESTORE */}
                                    <li className="d-flex align-items-center justify-content-center">
                                        <Tooltip text="Restore" placement="bottom" theme={`${isDisabled ? "disabled" : ""}`}>
                                            <InteractiveIcon
                                                defaultIcon={retryAddIcon}
                                                alt="Restore"
                                                className={`${isDisabled ? "disabled" : ""}`}
                                                onClick={!isDisabled ? handleRestore : undefined}
                                            />
                                        </Tooltip>
                                    </li>

                                    <li className="d-flex align-items-center justify-content-center">
                                        <div className="divider" />
                                    </li>

                                    {/* DELETE FOREVER */}
                                    <li className="d-flex align-items-center justify-content-center">
                                        <Tooltip text="Delete Forever" placement="bottom" theme={`${isDisabled ? "disabled" : ""}`}>
                                            <InteractiveIcon
                                                defaultIcon={deleteIcon}
                                                alt="Delete Forever"
                                                className={`${isDisabled ? "disabled" : ""}`}
                                                onClick={!isDisabled ? () => setModal({ type: "DeleteForeverModal", data: selectedArray }) : undefined}
                                            />
                                        </Tooltip>
                                    </li>
                                    <li className="d-flex align-items-center justify-content-center">
                                        <div className="divider" />
                                    </li>
                                    <li className="d-flex align-items-center justify-content-center">
                                        <button className="header-search-btn" onClick={(e) => { setSearchBarOpen(prev => !prev); }}>
                                            <InteractiveIcon
                                                defaultIcon={searchIconWhite}
                                                alt="Delete"
                                                width={24}
                                                height={24}
                                            />
                                        </button>
                                    </li>

                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default TrashHeaderToolbar