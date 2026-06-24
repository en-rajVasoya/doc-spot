import Tooltip from "../Tooltip";
import InteractiveIcon from "../InteractiveIcon";
import closeIcon from "@images/icon/close.svg";
import downloadIcon from "@images/icon/download.svg";
import retryAddIcon from "@images/icon/retry-add-icon.svg";
import deleteIcon from "@images/icon/trash.svg";
import searchIconWhite from "@images/icon/search-icon-white.svg";
import editIcon from "@images/icon/edit-icon.svg";
import viewIcon from "@images/icon/view.svg";
import { useNotification } from "../../../context/NotificationContext";
import { useAdmin } from "../../../context/AdminContext";


function AdminHeaderToolbar({ setModal, searchBarOpen, setSearchBarOpen }) {

    const { showNotification } = useNotification()
    const { selectedIds, setSelectedIds, users } = useAdmin();
    const selectedArray = Array.from(selectedIds);
    const isDisabled = selectedIds.size === 0;


    //  get the selected user info from then selected id to pass in the edit modal or view modla here
    const selectedUser = users.find(u => u._id === selectedArray[0])

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
                <div className="toolbar-box d-block">
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

                                    {/* Edit user */}
                                    <li className="d-flex align-items-center justify-content-center">
                                        <Tooltip text="Edit User" placement="bottom" theme={`${isDisabled || selectedIds.size > 1 ? "disabled" : ""}`}>
                                            <InteractiveIcon
                                                defaultIcon={editIcon}
                                                alt="View"
                                                className={`${isDisabled || selectedIds.size > 1 ? "disabled" : ""}`}
                                                onClick={!isDisabled && selectedIds.size === 1 ? () => setModal({ type: "editAdminModal", data: selectedUser }) : undefined}
                                            />
                                        </Tooltip>
                                    </li>
                                    <li className="d-flex align-items-center justify-content-center">
                                        <div className="divider" />
                                    </li>

                                    {/* View USER */}
                                    <li className="d-flex align-items-center justify-content-center">
                                        <Tooltip text="view" placement="bottom" theme={`${isDisabled || selectedIds.size > 1 ? "disabled" : ""}`}>
                                            <InteractiveIcon
                                                defaultIcon={viewIcon}
                                                alt="Edit"
                                                width={24}
                                                className={`${isDisabled || selectedIds.size > 1 ? "disabled" : ""}`}
                                                onClick={!isDisabled && selectedIds.size === 1 ? () => setModal({ type: "viewAdminModal", data: selectedUser }) : undefined}
                                            />
                                        </Tooltip>
                                    </li>
                                    <li className="d-flex align-items-center justify-content-center">
                                        <div className="divider" />
                                    </li>

                                    {/* DELETE USER */}
                                    <li className="d-flex align-items-center justify-content-center">
                                        <Tooltip text="Delete User" placement="bottom" theme={`${isDisabled ? "disabled" : ""}`}>
                                            <InteractiveIcon
                                                defaultIcon={deleteIcon}
                                                alt="Delete"
                                                className={`${isDisabled ? "disabled" : ""}`}
                                                onClick={!isDisabled ? () => setModal({ type: "adminDeleteUser", data: selectedArray }) : undefined}
                                            />
                                        </Tooltip>
                                    </li>

                                    <li className="d-flex align-items-center justify-content-center">
                                        <div className="divider" />
                                    </li>

                                    {/*  search bar  */}
                                    <li className="d-flex align-items-center justify-content-center">
                                        <button className="header-search-btn" onClick={() => setSearchBarOpen(prev => !prev)}>
                                            <InteractiveIcon defaultIcon={searchIconWhite} width={24} height={24} />
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

export default AdminHeaderToolbar