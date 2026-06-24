import { useState, useEffect, useRef } from 'react';
import InteractiveIcon from '../InteractiveIcon';
import logoIcon from "@images/logo.svg";
import searchIcon from "@images/icon/search.svg";
import user1Image from "@images/user/u1.png";
import arrowDownIcon from "@images/icon/arrow-down.svg";
import editIcon from "@images/icon/edit.svg";
import userIcon from "@images/icon/user.svg";
import logOutIcon from "@images/icon/power.svg";
import BrandSmallIcon from "@images/small-logo.svg";
import menuIcon from "@images/icon/menu-icon.svg";
import notificationIcon from "@images/icon/notification.svg";
import HeaderToolbar from './HeaderToolbar';
import { Dropdown } from 'react-bootstrap';
import { useAuth } from '../../../context/AuthContext';
import Tooltip from '../Tooltip.jsx';
import { useNavigate } from "react-router-dom";
import SearchBar from './SearchBar.jsx';
import TrashHeaderToolbar from '../../features/trash/TrashHeaderToolbar.jsx';
import { useFileExplorer } from '../../../context/FileExplorerContext.jsx';
import AdminHeaderToolbar from '../admin/AdminHeaderToolbar .jsx';
import UserAvatar from '../UserAvatar.jsx';
import axiosApi from "../../../utils/api.js";
import { useSocket } from "../../../context/SocketContext.jsx";
import CustomScroll from '../CustomScroll.jsx';
import closeIcon from "@images/icon/close-icon.svg"
import AdminSearchBar from '../admin/AdminSearchBar.jsx';
import enterIcon from "@images/icon/enter-icon.svg";
import { useBellNotification } from '../../../context/BellNotificationContext.jsx';

//  getiing backend url for getting profile pic of user
const BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") || "";

function MainHeader({ setModal, setSearchBarOpen, searchBarOpen, isTrash, onMobileSidebarNavclick, isAdmin }) {


    const { logout, user } = useAuth()
    const navigate = useNavigate()
    const { selectedIds, triggerHighlight } = useFileExplorer()

    const { notifications, unreadCount, markAllRead, deleteNotifications } = useBellNotification();
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const notificationRef = useRef(null);

    // Click outside close the notifications
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setIsNotificationOpen(false);
            }
        };

        if (isNotificationOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isNotificationOpen]);


    // close search bar when an item is selected so toolbar can show
    useEffect(() => {
        if (selectedIds && selectedIds.size > 0) {
            setSearchBarOpen(false);
        }
    }, [selectedIds, setSearchBarOpen]);


    //  for logout user 
    const handleLogout = async () => {
        try {
            await logout();
            navigate("/")
        } catch (error) {
            console.log("Logout error", error.message)
        }
    }

    const handleClearAll = () => {
        if (notifications.length === 0) return;
        const allIds = notifications.map(n => n._id);
        deleteNotifications(allIds);
    };

    const handleDeleteSingle = (e, notificationId) => {
        e.stopPropagation(); // prevent triggering the notification click/navigate
        deleteNotifications([notificationId]);
    };

    const profileImage = user?.profilePic
        ? `${BASE_URL}${user.profilePic}`
        : user1Image;


    return (
        <div className="master-header">
            <div className="d-flex align-items-center justify-content-between">
                {/* Logo */}

                <div className="logo-section">
                    {!isAdmin && (
                        <button className="sidebar2-Mobile-toggle-btn btn-only-icon" onClick={onMobileSidebarNavclick}>
                            <InteractiveIcon
                                defaultIcon={menuIcon}
                                alt=""
                                width={24}
                            />
                        </button>
                    )}

                    <a className="logo" onClick={() => navigate("/dashboard")}>
                        <InteractiveIcon
                            defaultIcon={logoIcon}
                            alt=""
                        />
                    </a>
                </div>

                {/*  SEARCH BAR */}
                {isAdmin ? (
                    <AdminSearchBar searchBarOpen={searchBarOpen} setSearchBarOpen={setSearchBarOpen} />

                ) : (
                    <SearchBar searchBarOpen={searchBarOpen} setSearchBarOpen={setSearchBarOpen} />
                )}

                {/* Toolbar */}
                {isTrash ? (
                    <TrashHeaderToolbar setModal={setModal} searchBarOpen={searchBarOpen} setSearchBarOpen={setSearchBarOpen} />
                ) : isAdmin ? (
                    <AdminHeaderToolbar setModal={setModal} searchBarOpen={searchBarOpen} setSearchBarOpen={setSearchBarOpen} />
                ) : (
                    <HeaderToolbar setModal={setModal} searchBarOpen={searchBarOpen} setSearchBarOpen={setSearchBarOpen} />

                )}

                {/* Profile */}
                <div>
                    <ul className="d-flex align-items-center mb-0">
                        {/* <li>
                            <Tooltip text="Open Seachbar" placement="bottom">
                                <Dropdown
                                    className="notification-dropdown"
                                    onToggle={(isOpen) => {

                                        setIsNotificationOpen(isOpen);

                                        if (isOpen) {
                                            markAllRead();
                                        }
                                    }}
                                >
                                    <Dropdown.Toggle className="no-border-btn position-relative">
                                        <span className="notification-icon-wrapper">
                                            <i className="fas fa-bell"></i>
                                        </span>
                                        {unreadCount > 0 && (
                                            <span className="notification-badge">
                                                {unreadCount > 9 ? "9+" : unreadCount}
                                            </span>
                                        )}
                                    </Dropdown.Toggle>

                                    <Dropdown.Menu
                                        align="end"
                                        className="dropdown-menu-lg"
                                    >

                                        <div className="d-flex justify-content-between px-3 py-2">

                                            <h6 className="mb-0">
                                                Notifications
                                            </h6>

                                        </div>

                                        <Dropdown.Divider />

                                        {notifications.length === 0 ? (

                                            <div className="text-center p-3">
                                                No notifications
                                            </div>

                                        ) : (

                                            notifications.map(notification => (

                                                <Dropdown.Item
                                                    key={notification._id}
                                                    onClick={() => navigate("/trash-dashboard")}
                                                    className={
                                                        !notification.isRead
                                                            ? "bg-light"
                                                            : ""
                                                    }
                                                >
                                                    <div>
                                                        <UserAvatar user={notification.metadata} />
                                                        <strong className="text-capitalize">
                                                            {notification.actor?.name}
                                                        </strong>
                                                    </div>

                                                    <div>
                                                        <div dangerouslySetInnerHTML={{ __html: notification.message }} />
                                                    </div>

                                                    <small>
                                                        {new Date(
                                                            notification.createdAt
                                                        ).toLocaleString()}
                                                    </small>
                                                </Dropdown.Item>

                                            ))

                                        )}

                                    </Dropdown.Menu>

                                </Dropdown>
                            </Tooltip>
                        </li> */}

                        <li className='d-flex'>
                            <div className="notification-wrapper" ref={notificationRef}>

                                {/* Bell Icon */}
                                <div className="notification-bell " onClick={() => {
                                    const next = !isNotificationOpen;
                                    setIsNotificationOpen(next);
                                    if (next) markAllRead();
                                }}>

                                    <Tooltip text="Notification" offset={8}>

                                        <span className='btn-only-icon'>
                                            <InteractiveIcon
                                                defaultIcon={notificationIcon}
                                                alt=""
                                                width={22}
                                            />
                                        </span>
                                    </Tooltip>


                                    {unreadCount > 0 && (
                                        <div className="notification-badge">
                                            <span>{unreadCount > 9 ? "9+" : unreadCount}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Notification Panel */}
                                {isNotificationOpen && (
                                    <div className={`notification-panel ${isNotificationOpen ? "show" : ""}`}>

                                        <div className="notification-header">
                                            <h6 className="notification-title">Notifications</h6>
                                            <button className='clear-btn' onClick={handleClearAll}>Clear all</button>
                                        </div>

                                        <div className="notification-divider" />

                                        <div className='notification-panel-custom-scroll-wrapper'>
                                            <CustomScroll className="notification-panel-custom-scroll" showBottomBlur={false} showTopBlur={true}>
                                                {notifications.length === 0 ? (

                                                    <div className="notification-empty">
                                                        No notifications
                                                    </div>

                                                ) : (

                                                    notifications.slice(0, 5).map(notification => (

                                                        <div
                                                            key={notification._id}
                                                            onClick={() => {
                                                                const metadata = notification.metadata || {};
                                                                const isTrashNotification = notification.type === "file_deleted" || notification.type === "folder_deleted";

                                                                if (isTrashNotification) {
                                                                    navigate("/trash-dashboard", { state: { highlightId: metadata.itemId } });
                                                                } else {
                                                                    // Navigate to specific folder or root
                                                                    if (metadata.parentId) {
                                                                        navigate(`/dashboard/folder/${metadata.parentId}`);
                                                                    } else {
                                                                        navigate("/dashboard");
                                                                    }

                                                                    // Trigger the pulse class highlight on the specific item!
                                                                    if (metadata.itemId) {
                                                                        triggerHighlight(metadata.itemId);
                                                                    }
                                                                }
                                                                setIsNotificationOpen(false); // Close dropdown
                                                            }}
                                                            className={`notification-message ${!notification.isRead ? "notification-message-unread" : ""}`}
                                                        >
                                                            <div className="notification-message-user">
                                                                <UserAvatar user={notification.metadata} />
                                                                <div className='notification-message-content-wrapper'>
                                                                    <div className='notification-message-name-date'>
                                                                        <strong className="notification-message-name">
                                                                            {notification.actor?.name}
                                                                        </strong>
                                                                        <button className='btn-only-icon'
                                                                            onClick={(e) => handleDeleteSingle(e, notification._id)}
                                                                        >
                                                                            <InteractiveIcon
                                                                                defaultIcon={closeIcon}
                                                                                alt=""
                                                                                width={16}
                                                                            />
                                                                        </button>

                                                                    </div>

                                                                    <div className='notification-message-text' dangerouslySetInnerHTML={{ __html: notification.message }} />


                                                                    <small className="notification-message-time">

                                                                        {new Date(notification.createdAt).toLocaleString()}
                                                                    </small>
                                                                </div>
                                                            </div>


                                                        </div>

                                                    ))

                                                )}
                                            </CustomScroll>

                                            {/* see all notification button here */}
                                            {notifications.length > 0 && (
                                                <div className="search-suggestion-footer d-none" style={{ borderTop: "1px solid var(--border-color)", borderRadius: "0 0 16px 16px" }}>
                                                    <button className='search-See-all-btn w-100 justify-content-center'
                                                        onClick={() => {
                                                            setIsNotificationOpen(false)
                                                            navigate("/notifications")
                                                        }}>
                                                        See all notifications
                                                        <span>
                                                            <InteractiveIcon
                                                                defaultIcon={enterIcon}
                                                                alt=""
                                                                width={20}
                                                                height={20}
                                                            />
                                                        </span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                    </div>
                                )}

                            </div>
                        </li>
                        <li>
                            <div className="divider" />
                        </li>



                        <li>
                            <Dropdown className='profile-dropdown'>
                                <Dropdown.Toggle className='no-border-btn'>
                                    <div className="profile-dd">
                                        <div className='profile-single-box'>
                                            {/* {user.thumbnail_profile_pic || user.compressed_profile_pic ? (
                                            <img
                                                src={`${import.meta.env.VITE_BACKEND_URL}/${user.thumbnail_profile_pic || user.compressed_profile_pic}`}
                                                alt=""
                                                className="user-avatar"
                                            />
                                        ) : (
                                            <div className="user-avatar-initials">
                                                {user.name?.trim().charAt(0).toUpperCase() || "?"}
                                            </div>
                                        )} */}
                                            <UserAvatar user={user} />
                                        </div>
                                        <div className="dd_arrow btn-only-icon">
                                            <img src={arrowDownIcon} alt="" width={18} />
                                        </div>
                                    </div>
                                </Dropdown.Toggle>

                                <Dropdown.Menu align="end" className='dropdown-menu-lg'>
                                    <div className='profile-header'>
                                        <InteractiveIcon
                                            defaultIcon={BrandSmallIcon}
                                            width={36}
                                            height={36}
                                            alt=""
                                        />
                                        <div className='profile-logo-box'>
                                            <h4 className='logo-text fwn-d-extrabold'>DOCSPOT <span className='version-status fwn-d-medium'>v1</span></h4>
                                        </div>
                                    </div>
                                    <div className="profile-img-box d-flex justify-content-center">
                                        <div className="position-relative">
                                            <span className="user-profile me-0">
                                                {/* <InteractiveIcon
                                                    defaultIcon={profileImage}
                                                    width={100}
                                                    height={100}
                                                    alt=""
                                                /> */}

                                                <UserAvatar user={user} />
                                            </span>
                                        </div>
                                    </div>
                                    <h4 className="profile-name text-center mb-3 text-capitalize">{user.name}</h4>

                                    {/* if the user is in the admin page then show diffrent menu  */}
                                    {isAdmin ? (
                                        <>
                                            <Dropdown.Item className="dropdown-item d-flex align-items-center" onClick={() => navigate("/dashboard")}>
                                                <InteractiveIcon
                                                    defaultIcon={userIcon}
                                                    width={24}
                                                    height={24}
                                                    alt="My Docspot"
                                                />
                                                <span className='item-name'>Redirect to My Docspot</span>
                                            </Dropdown.Item>
                                            <Dropdown.Divider className='dot' />
                                            <Dropdown.Item className="dropdown-item d-flex align-items-center" onClick={handleLogout}>
                                                <InteractiveIcon
                                                    defaultIcon={logOutIcon}
                                                    width={24}
                                                    height={24}
                                                    alt="Logout"
                                                />
                                                <span className='item-name'>Logout</span>
                                            </Dropdown.Item>
                                        </>
                                    ) : (
                                        <>
                                            {user.role === "admin" && (
                                                <Dropdown.Item className="dropdown-item d-flex align-items-center" onClick={() => navigate("/admin-dashboard")}>
                                                    <InteractiveIcon
                                                        defaultIcon={userIcon}
                                                        width={24}
                                                        height={24}
                                                        alt="Manage Users"
                                                    />
                                                    <span className='item-name'>Manage Users</span>
                                                </Dropdown.Item>
                                            )}
                                            <Dropdown.Divider className='dot' />
                                            <Dropdown.Item className="dropdown-item d-flex align-items-center"
                                                onClick={() => navigate("/profile")}
                                            >
                                                <InteractiveIcon
                                                    defaultIcon={editIcon}
                                                    width={24}
                                                    height={24}
                                                    alt="Edit Profile"
                                                />
                                                <span className='item-name'>Edit Profile</span>
                                            </Dropdown.Item>
                                            <Dropdown.Item className="dropdown-item d-flex align-items-center" onClick={handleLogout}>
                                                <InteractiveIcon
                                                    defaultIcon={logOutIcon}
                                                    width={24}
                                                    height={24}
                                                    alt="Logout"
                                                />
                                                <span className='item-name'>Logout</span>
                                            </Dropdown.Item>
                                        </>
                                    )}

                                </Dropdown.Menu>
                            </Dropdown>
                        </li>
                    </ul>
                </div>
            </div>


        </div>

    )
}

export default MainHeader