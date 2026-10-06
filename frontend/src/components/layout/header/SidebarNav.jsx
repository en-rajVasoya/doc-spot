import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useSearch } from "../../../context/SearchContext";
import { Dropdown } from "react-bootstrap";
import InteractiveIcon from "../InteractiveIcon";
import enterIcon from "@images/icon/enter-icon.svg";
import navFolderIcon from "@images/icon/nav-folder-icon.svg";
import userPlusIcon from "@images/icon/user-plus.svg";
import sharedWithIcon from "@images/icon/shared-with-me-icon.svg";
import deleteIcon from "@images/icon/trash.svg";
import useResponsive from "../../../hooks/useResponsive";
import { useAuth } from "../../../context/AuthContext";
import UserAvatar from "../UserAvatar.jsx";
import logoIcon from "@images/logo.svg";
import arrowDown from "@images/icon/arrow-down.svg";
import arrowUp from "@images/icon/arrow-up.svg";

// Dropdown Icons
import logOutIcon from "@images/icon/power.svg";
import editUserIcon from "@images/icon/edit-user-icon.svg";
import userManagementIcon from "@images/icon/user-management-icon.svg";
import settingIcon from "@images/icon/setting-icon.svg";

const navItems = [
    { icon: navFolderIcon, label: "My Docspot", to: "/dashboard" },
    { icon: userPlusIcon, label: "Shared", to: "/shared" },
    { icon: sharedWithIcon, label: "Shared with me", to: "/shared-with-me" },
    { icon: deleteIcon, label: "Trash", to: "/trash-dashboard" },
];

export default function SidebarNav({ isSidebarNavOpen, closeSidebar, isAdmin }) {
    const { isSearchMode, clearSearch } = useSearch();
    const { isMobile } = useResponsive();
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/");
            if (closeSidebar) closeSidebar();
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    // ----------------------------------------------------
    // MOBILE SPECIFIC SIDEBAR (75% width sliding drawer)
    // ----------------------------------------------------
    if (isMobile) {
        return (
            <>
                {/* Dark semi-transparent overlay to close sidebar when clicking outside */}
                {isSidebarNavOpen && (
                    <div className="mobile-sidebar-overlay" onClick={closeSidebar}></div>
                )}

                {/* 75% sliding white sidebar */}
                <nav className={`mobile-sidebar ${isSidebarNavOpen ? "open" : ""}`}>

                    {/* Header with Logo */}
                    <div className="mobile-sidebar-header">
                        <img src={logoIcon} alt="Docspot Logo" draggable="false" />
                    </div>

                    {/* Scrollable Nav Links */}
                    <div className="mobile-sidebar-sub">
                        {navItems.map(({ icon, label, to }) => (
                            <NavLink
                                key={to}
                                to={to}
                                className={({ isActive }) =>
                                    `mobile-sidebarItem ${isActive ? "mobile-sidebarItemActive" : ""}`
                                }
                                onClick={() => {
                                    if (isSearchMode) clearSearch();
                                    if (closeSidebar) closeSidebar(); // Auto-close when clicking a link
                                }}
                                draggable="false"
                            >
                                <img src={icon} width={24} alt="" draggable="false" />
                                <div className="mobile-sidebarLabelWrapper">{label}</div>
                            </NavLink>
                        ))}
                    </div>

                    {/* Footer with User Profile */}
                    {user && (
                        <div className="mt-auto w-100  sidebar-profile-dropdown-mobile">


                            {showProfileMenu && (
                                <div className="custom-profile-menu-list">
                                    {user.role === "admin" && (
                                        <>
                                            {isAdmin ? (
                                                <>
                                                    <div
                                                        className="custom-menu-item d-flex align-items-center"
                                                        onClick={() => { navigate("/dashboard"); if (closeSidebar) closeSidebar(); setShowProfileMenu(false); }}
                                                    >
                                                        <InteractiveIcon
                                                            defaultIcon={userManagementIcon}
                                                            width={22}
                                                            height={22}
                                                            alt="Manage Users"
                                                        />
                                                        <span className='item-name'> Redirect to My Docspot </span>
                                                    </div>
                                                    <hr className='custom-menu-divider' />
                                                </>
                                            ) : (
                                                <>
                                                    <div
                                                        className="custom-menu-item d-flex align-items-center"
                                                        onClick={() => { navigate("/admin-dashboard"); if (closeSidebar) closeSidebar(); setShowProfileMenu(false); }}
                                                    >
                                                        <InteractiveIcon
                                                            defaultIcon={userManagementIcon}
                                                            width={22}
                                                            height={22}
                                                            alt="Manage Users"
                                                        />
                                                        <span className='item-name'>Manage Users</span>
                                                    </div>
                                                    <hr className='custom-menu-divider' />
                                                </>
                                            )}
                                        </>
                                    )}

                                    <div
                                        className="custom-menu-item d-flex align-items-center"
                                        onClick={() => { navigate("/profile"); if (closeSidebar) closeSidebar(); setShowProfileMenu(false); }}
                                    >
                                        <InteractiveIcon
                                            defaultIcon={editUserIcon}
                                            width={24}
                                            height={24}
                                            alt="Edit Profile"
                                        />
                                        <span className='item-name'>Edit Profile</span>
                                    </div>

                                    <div
                                        className="custom-menu-item d-flex align-items-center"
                                        onClick={() => { navigate("/settings"); if (closeSidebar) closeSidebar(); setShowProfileMenu(false); }}
                                    >
                                        <InteractiveIcon
                                            defaultIcon={settingIcon}
                                            width={24}
                                            height={24}
                                            alt="Settings"
                                        />
                                        <span className='item-name'>Settings</span>
                                    </div>

                                    <div
                                        className="custom-menu-item d-flex align-items-center"
                                        onClick={() => { handleLogout(); setShowProfileMenu(false); }}
                                    >
                                        <InteractiveIcon
                                            defaultIcon={logOutIcon}
                                            width={24}
                                            height={24}
                                            alt="Logout"
                                        />
                                        <span className='item-name'>Logout</span>
                                    </div>
                                </div>
                            )}
                            <div
                                className="custom-profile-toggle d-flex align-items-center w-100"
                                style={{ gap: "14px", cursor: "pointer" }}
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                            >
                                <div className="profile-single-box m-0">
                                    <UserAvatar user={user} />
                                </div>
                                <div className="mobile-sidebar-user-info text-start flex-grow-1">
                                    <span className="mobile-sidebar-user-name">{user.name}</span>
                                    <span className="mobile-sidebar-user-email">{user.email}</span>
                                </div>
                                <span className="btn-only-icon custom-profile-arrow">
                                    <InteractiveIcon
                                        defaultIcon={showProfileMenu ? arrowUp : arrowDown}
                                        width={16}
                                        alt="Toggle Menu"
                                    />
                                </span>
                            </div>
                        </div>
                    )}
                </nav>
            </>
        );
    }

    // ----------------------------------------------------
    // DESKTOP SPECIFIC SIDEBAR (Original Code)
    // ----------------------------------------------------
    return (
        <nav className={`sidebar2 ${isSidebarNavOpen ? "sidebar2-Mobile" : ""}`}>
            <div className="sidebar2-sub">
                {navItems.map(({ icon, label, to }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                            `sidebar2Item ${isActive ? "sidebar2ItemActive" : ""}`
                        }
                        onClick={() => {
                            if (isSearchMode) clearSearch();
                        }}
                        draggable="false"
                    >
                        <img src={icon} width={24} alt="" draggable="false" />

                        <div className="sidebar2LabelWrapper">{label}</div>
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}