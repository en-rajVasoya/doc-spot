import { useEffect, useState, useRef, useLayoutEffect } from "react";
import Tooltip from "../Tooltip";
import InteractiveIcon from "../InteractiveIcon";
import { Dropdown } from "react-bootstrap";
import closeIcon from "@images/icon/close.svg";
import deleteIcon from "@images/icon/trash.svg";
import searchIconWhite from "@images/icon/search-icon-white.svg";
import editUserIcon from "@images/icon/edit-user-icon.svg";
import viewIcon from "@images/icon/eyes-big-icon.svg";
import moreIcon from "@images/icon/more-icon.svg";
import { useNotification } from "../../../context/NotificationContext";
import { useAdmin } from "../../../context/AdminContext";
import { useAuth } from "../../../context/AuthContext";

function AdminHeaderToolbar({ setModal, searchBarOpen, setSearchBarOpen }) {
    const { showNotification } = useNotification();
    const { selectedIds, setSelectedIds, users } = useAdmin();
    const { user: loggedInUser } = useAuth(); // Get logged-in user

    const selectedArray = Array.from(selectedIds);
    const isDisabled = selectedIds.size === 0;

    //  check if current logged in user ID is in the selected array
    const hasSelfSelected = selectedArray.includes(loggedInUser?._id);
    const isDeleteDisabled = isDisabled || hasSelfSelected;

    //  get the selected user info from then selected id to pass in the edit modal or view modla here
    const selectedUser = users.find(u => u._id === selectedArray[0]);

    //  restore button
    const handleRestore = async () => {
        for (const id of selectedArray) {
            await restoreItemApi(id, true);
        }
        const message = selectedArray.length > 1 ? "Items restored successfully" : "Item restored successfully";
        showNotification(message, "success", "bottom-center");
        setSelectedIds(new Set());
    };

    const [screenSize, setScreenSize] = useState("lg");
    const [isMobileDevice, setIsMobileDevice] = useState(false);
    const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

    useEffect(() => {
        const checkSize = () => {
            const w = window.innerWidth;
            setIsMobileDevice(w < 768);
            if (w > 1100) setScreenSize("lg");
            else if (w > 900) setScreenSize("md");
            else if (w > 700) setScreenSize("sm");
            else if (w > 500) setScreenSize("xs");
            else setScreenSize("xxs");
        };
        checkSize();
        window.addEventListener("resize", checkSize);
        return () => window.removeEventListener("resize", checkSize);
    }, []);

    const visibleCountMap = { lg: 8, md: 5, sm: 5, xs: 5, xxs: 3 };
    const visibleCount = visibleCountMap[screenSize];
    const isDesktop = screenSize === "lg";

    const useClampedMenu = () => {
        const menuRef = useRef(null);
        const [open, setOpen] = useState(false);
        const [style, setStyle] = useState({});

        useLayoutEffect(() => {
            if (!open || !menuRef.current) return;

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

    const toolbarActions = [
        {
            key: "edit",
            label: "Edit User",
            icon: editUserIcon,
            disabled: isDisabled || selectedIds.size > 1,
            onClick: () => setModal({ type: "editAdminModal", data: selectedUser }),
        },
        {
            key: "view",
            label: "View User",
            icon: viewIcon,
            disabled: isDisabled || selectedIds.size > 1,
            onClick: () => setModal({ type: "viewAdminModal", data: selectedUser }),
        },
        {
            key: "delete",
            label: "Delete User",
            icon: deleteIcon,
            disabled: isDeleteDisabled,
            onClick: () => setModal({ type: "adminDeleteUser", data: selectedArray }),
        },
    ];

    const renderInlineAction = (action, index, arr) => (
    <li key={action.key} className="d-flex align-items-center justify-content-center">
        <Tooltip text={action.label} placement="bottom" theme={action.disabled ? "disabled" : ""}>
            <InteractiveIcon
                defaultIcon={action.icon}
                alt={action.label}
                className={action.disabled ? "disabled-action-btn" : ""}
                onClick={!action.disabled ? action.onClick : undefined}
            />
        </Tooltip>
        {index !== arr.length - 1 && <div className="divider" />}
    </li>
);
    const renderMoreItem = (action) => (
        <Dropdown.Item
            key={action.key}
            className={`d-flex align-items-center gap-2 ${action.disabled ? "disabled-action-btn" : "enabled-action-text"}`}
            onClick={() => { if (!action.disabled) action.onClick && action.onClick(); }}
        >
            <InteractiveIcon defaultIcon={action.icon} alt={action.label} width={22} className={!action.disabled ? "enabled-action-icon" : ""} />
            <span>{action.label}</span>
        </Dropdown.Item>
    );

    const renderMobileMoreItem = (action) => (
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
            <InteractiveIcon defaultIcon={action.icon} alt={action.label} width={22} className={!action.disabled ? "enabled-action-icon" : ""} />
            <span>{action.label}</span>
        </div>
    );

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
                                                                <span className="btn-only-icon" onClick={() => setMobileMoreOpen(true)}>
                                                                    <Tooltip text="More" placement="bottom">
                                                                        <InteractiveIcon defaultIcon={moreIcon} alt="More" width={24} />
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
                                                                                <InteractiveIcon defaultIcon={moreIcon} alt="More" width={24} />
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
                                                    </>
                                                )}
                                            </>
                                        ) : null
                                    )}

                                    {!isMobileDevice && (
                                       <>
                                        <li className="d-flex align-items-center justify-content-center">
                                                                <div className="divider" />
                                                            </li>
                                        <li className="d-flex align-items-center justify-content-center">
                                            <button className="header-search-btn" onClick={() => setSearchBarOpen(prev => !prev)}>
                                                <InteractiveIcon defaultIcon={searchIconWhite} alt="Search" width={24} height={24} />
                                            </button>
                                        </li>
                                       </>
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

export default AdminHeaderToolbar;