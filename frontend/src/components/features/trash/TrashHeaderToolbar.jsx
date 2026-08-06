import React, { useState, useEffect } from "react";
import Tooltip from "../../layout/Tooltip";
import InteractiveIcon from "../../layout/InteractiveIcon";
import closeIcon from "@images/icon/close.svg";
import retryAddIcon from "@images/icon/retry-add-icon.svg";
import deleteIcon from "@images/icon/trash.svg";
import searchIconWhite from "@images/icon/search-icon-white.svg";
import { useTrash } from "../../../context/TrashContext";
import { useNotification } from "../../../context/NotificationContext";

function TrashHeaderToolbar({ setModal, searchBarOpen, setSearchBarOpen }) {
    const { selectedIds, setSelectedIds, restoreItemApi } = useTrash();
    const { showNotification } = useNotification()

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

    // ##################################################
    // ---- STEP 2: Responsive breakpoint tracking ------
    // ##################################################
    const [isMobileDevice, setIsMobileDevice] = useState(false);

    useEffect(() => {
        const checkSize = () => {
            setIsMobileDevice(window.innerWidth < 768);
        };
        checkSize();
        window.addEventListener("resize", checkSize);
        return () => window.removeEventListener("resize", checkSize);
    }, []);

    // ##################################################
    // ---- STEP 3: Toolbar actions - single source of truth
    // ##################################################
    const toolbarActions = [
        {
            key: "restore",
            label: "Restore",
            icon: retryAddIcon,
            disabled: isDisabled,
            onClick: handleRestore,
        },
        {
            key: "deleteForever",
            label: "Delete Forever",
            icon: deleteIcon,
            disabled: isDisabled,
            onClick: () => setModal({ type: "DeleteForeverModal", data: selectedArray }),
        },
    ];

    // ##################################################
    // ---- STEP 5: Reusable renderer for a single inline icon
    // ##################################################
    const renderInlineAction = (action, index) => {
        const isLastItem = index === toolbarActions.length - 1;
        const showDivider = !isLastItem || !isMobileDevice;

        return (
            <li key={action.key} className="d-flex align-items-center justify-content-center">
                <Tooltip text={action.label} placement="bottom" theme={action.disabled ? "disabled" : ""}>
                    <InteractiveIcon
                        defaultIcon={action.icon}
                        alt={action.label}
                        className={action.disabled ? "disabled-action-btn" : ""}
                        onClick={!action.disabled ? action.onClick : undefined}
                    />
                </Tooltip>

                {showDivider && <div className="divider" />}
            </li>
        );
    };



    // ##################################################
    // ---- RETURN ---------------------------------------
    // ##################################################
    return (
        <>
            {!searchBarOpen && (!isMobileDevice || selectedIds.size > 0) && (
                <div className="trash-header-toolbar toolbar-box d-block">
                    <div className="toolbar">
                        <div className="toolbar-container">
                            <div className="d-flex align-items-center">

                                {/* selection count - same for both desktop and mobile */}
                                {selectedIds.size !== 0 && (
                                    <div className="selection-count">
                                        <span className="cursor-pointer">
                                            <InteractiveIcon defaultIcon={closeIcon} width={24} alt="" onClick={() => setSelectedIds(new Set())} />
                                        </span>
                                        {selectedIds.size} selected
                                    </div>
                                )}

                                <ul className="mb-0 tools d-flex align-items-center">
                                    {toolbarActions.map(renderInlineAction)}

                                    {/* SEARCH - only visible on desktop/tablet here */}
                                    {!isMobileDevice && (
                                        <li className="d-flex align-items-center justify-content-center">
                                            <button className="header-search-btn" onClick={() => setSearchBarOpen(prev => !prev)}>
                                                <InteractiveIcon defaultIcon={searchIconWhite} alt="Search" width={24} height={24} />
                                            </button>
                                        </li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default TrashHeaderToolbar;