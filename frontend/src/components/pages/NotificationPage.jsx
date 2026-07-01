// import React, { useState, useEffect, useRef } from "react";
// import { useNavigate } from "react-router-dom";

// // Components
// import MainHeader from "../layout/header/MainHeader";
// import SidebarNav from "../layout/header/SidebarNav";
// import ModalManager from "../modals/ModalManager.jsx";
// import UserAvatar from '../layout/UserAvatar';
// import InteractiveIcon from "../layout/InteractiveIcon";

// // Icons & Context
// import closeIcon from "@images/icon/close-icon.svg";
// import notificationIcon from "@images/icon/notification.svg";

// import { useBellNotification } from "../../context/BellNotificationContext.jsx";
// import { useFileExplorer } from "../../context/FileExplorerContext.jsx";

// function NotificationPage() {
//     const navigate = useNavigate();
//     const { triggerHighlight } = useFileExplorer();

//     const { 
//         notifications, 
//         loading, 
//         markSingleRead, 
//         deleteNotifications 
//     } = useBellNotification();

//     // UI Layout states
//     const [searchBarOpen, setSearchBarOpen] = useState(false);
//     const [modals, setModalsState] = useState([]);
//     const [isSidebarNavOpen, setIsSidebarNavOpen] = useState(false);
//     const headerRef = useRef(null);
//     const [headerHeight, setHeaderHeight] = useState(0);

//     const setModal = (modalData) => {
//         if (modalData === null) {
//             setModalsState(prev => prev.slice(0, -1));
//         } else {
//             setModalsState(prev => [...prev, modalData]);
//         }
//     };

//     useEffect(() => {
//         const handleKeyDown = (e) => {
//             if (e.key === "Escape") {
//                 setModal(null);
//             }
//         };
//         document.addEventListener("keydown", handleKeyDown);
//         return () => document.removeEventListener("keydown", handleKeyDown);
//     }, []);

//     // Calculate main header height
//     useEffect(() => {
//         if (headerRef.current) {
//             setHeaderHeight(headerRef.current.offsetHeight);
//         }
//     }, []);

//     // Clear all notifications
//     const handleClearAll = () => {
//         if (notifications.length === 0) return;
//         const allIds = notifications.map(n => n._id);
//         deleteNotifications(allIds);
//     };

//     // Delete a single notification row
//     const handleDeleteSingle = (e, notificationId) => {
//         e.stopPropagation(); // Prevents click navigation on row
//         deleteNotifications([notificationId]);
//     };

//     // Row Click - handles marking as read and navigating to files/folders/trash
//     const handleNotificationClick = async (notification) => {
//         const metadata = notification.metadata || {};
//         const isTrashNotification = notification.type === "file_deleted" || notification.type === "folder_deleted";

//         // Mark as read if unread
//         if (!notification.isRead) {
//             markSingleRead(notification._id);
//         }

//         // Navigate based on type
//         if (isTrashNotification) {
//             navigate("/trash-dashboard", { state: { highlightId: metadata.itemId } });
//         } else {
//             if (metadata.parentId) {
//                 navigate(`/dashboard/folder/${metadata.parentId}`);
//             } else {
//                 navigate("/dashboard");
//             }
//             if (metadata.itemId) {
//                 triggerHighlight(metadata.itemId);
//             }
//         }
//     };

//     // Helper: Group notifications by Date
//     const getGroupedNotifications = () => {
//         const groups = {
//             today: [],
//             yesterday: [],
//             older: []
//         };

//         const today = new Date();
//         const yesterday = new Date();
//         yesterday.setDate(today.getDate() - 1);

//         notifications.forEach(item => {
//             const itemDate = new Date(item.createdAt);
//             if (itemDate.toDateString() === today.toDateString()) {
//                 groups.today.push(item);
//             } else if (itemDate.toDateString() === yesterday.toDateString()) {
//                 groups.yesterday.push(item);
//             } else {
//                 groups.older.push(item);
//             }
//         });

//         return groups;
//     };

//     const formatNotificationTime = (dateString) => {
//         const date = new Date(dateString);
//         return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " • " + date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
//     };

//     const grouped = getGroupedNotifications();

//     const renderNotificationRow = (notification) => {
//         const isUnread = !notification.isRead;
//         return (
//             <div
//                 key={notification._id}
//                 onClick={() => handleNotificationClick(notification)}
//                 className={`notification-row-premium ${isUnread ? 'unread' : 'read'}`}
//             >
//                 <div className="notification-page-items" style={{ flex: 1, minWidth: 0 }}>
//                     <div style={{ position: "relative" }}>
//                         <UserAvatar user={notification.metadata} />
//                         {isUnread && (
//                             <span className="unread-indicator-dot" />
//                         )}
//                     </div>
//                     <div style={{ flex: 1, minWidth: 0 }}>
//                         <div className="d-flex align-items-center gap-2 mb-1">
//                             <span className="notification-message-name">
//                                 {notification.actor?.name || "System"}
//                             </span>
//                         </div>
//                         <div 
//                             className="notification-message-text"
//                             dangerouslySetInnerHTML={{ __html: notification.message }} 
//                         />
//                         <span className="notification-message-time">
//                             {formatNotificationTime(notification.createdAt)}
//                         </span>
//                     </div>
//                 </div>

//                 <button 
//                     className="btn-only-icon"
//                     onClick={(e) => handleDeleteSingle(e, notification._id)}
//                 >
//                     <InteractiveIcon
//                         defaultIcon={closeIcon}
//                         alt="Delete"
//                         width={20}

//                     />
//                 </button>
//             </div>
//         );
//     };

//     const renderSectionGroup = (title, items) => {
//         if (items.length === 0) return null;
//         return (
//             <>
//                 <div className="section-title-divider-notification">
//                     {title}
//                 </div>
//                 <div>
//                     {items.map(notification => renderNotificationRow(notification))}
//                 </div>
//             </>
//         );
//     };

//     return (
//         <div className="page-wrapper">
//             <div className="content-wrapper-main">
//                 {/* Main Header bar */}
//                 <div className="max-width-base-header" ref={headerRef}>
//                     <MainHeader
//                         setModal={setModal}
//                         searchBarOpen={searchBarOpen}
//                         setSearchBarOpen={setSearchBarOpen}
//                         onMobileSidebarNavclick={() => setIsSidebarNavOpen(prev => !prev)}
//                     />
//                 </div>

//                 {/* Main View Area */}
//                 <div className="content-view-wrapper">
//                     <div className="max-width-base" style={{ height: `calc(100dvh - ${headerHeight}px)` }}>

//                         {/* Full Width Container */}
//                         <div className="notification-wrapper">

//                             {/* Page Header toolbar */}
//                             <div className="notification-page-header">
//                                 <h2 className="page-title-name" >
//                                     <InteractiveIcon defaultIcon={notificationIcon}  className="me-2" />
//                                     Notifications
//                                     </h2>
//                                 {notifications.length > 0 && (
//                                     <button className="clear-btn" onClick={handleClearAll}>
//                                         Clear all
//                                     </button>
//                                 )}
//                             </div>

//                             {/* Main Feed Content */}
//                             {loading ? (
//                                 <div className="bg-white border rounded-3 shadow-sm p-5 d-flex align-items-center justify-content-center" style={{ minHeight: "300px" }}>
//                                     <div className="loader-wrapper-box">
//                                         <div className="cma-messages-are-loader-wrapper">
//                                             <span className="loader"></span>
//                                         </div>
//                                     </div>
//                                 </div>
//                             ) : notifications.length === 0 ? (
//                                 /* GORGEOUS EMPTY STATE */
//                                 <div className="bg-white border rounded-3 shadow-sm p-5 d-flex flex-column align-items-center justify-content-center text-center" style={{ minHeight: "350px", borderRadius: "18px" }}>
//                                     <div style={{ 
//                                         width: "72px", 
//                                         height: "72px", 
//                                         backgroundColor: "#f1f5f9", 
//                                         borderRadius: "50%", 
//                                         display: "flex", 
//                                         alignItems: "center", 
//                                         justifyContent: "center",
//                                         marginBottom: "20px"
//                                     }}>
//                                         <InteractiveIcon defaultIcon={notificationIcon} width={32} height={32} style={{ opacity: 0.5 }} />
//                                     </div>
//                                     <h4 style={{ fontWeight: "600", color: "#1e293b", marginBottom: "8px" }}>All caught up!</h4>
//                                     <p style={{ color: "#64748b", fontSize: "14px", maxWidth: "340px", margin: 0, lineHeight: "1.6" }}>
//                                         No notifications
//                                     </p>
//                                 </div>
//                             ) : (
//                                 <div className="notifications-card-block">
//                                     {renderSectionGroup("Today", grouped.today)}
//                                     {renderSectionGroup("Yesterday", grouped.yesterday)}
//                                     {renderSectionGroup("Earlier", grouped.older)}
//                                 </div>
//                             )}

//                         </div>

//                     </div>
//                 </div>
//             </div>

//             <SidebarNav isSidebarNavOpen={isSidebarNavOpen} />
//             <ModalManager modals={modals} setModal={setModal} />
//         </div>
//     );
// }

// export default NotificationPage;




import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// Components
import MainHeader from "../layout/header/MainHeader";
import SidebarNav from "../layout/header/SidebarNav";
import ModalManager from "../modals/ModalManager.jsx";
import UserAvatar from '../layout/UserAvatar';
import InteractiveIcon from "../layout/InteractiveIcon";

// Icons & Context
import closeIcon from "@images/icon/close-icon.svg";
import notificationIcon from "@images/icon/notification.svg";
import notificationNoFoundImg from "@images/icon/notification-no-found-img.svg"

import { useBellNotification } from "../../context/BellNotificationContext.jsx";
import { useFileExplorer } from "../../context/FileExplorerContext.jsx";

function NotificationPage() {
    const navigate = useNavigate();
    const { triggerHighlight } = useFileExplorer();

    const {
        notifications,
        loading,
        markSingleRead,
        deleteNotifications
    } = useBellNotification();

    // UI Layout states
    const [searchBarOpen, setSearchBarOpen] = useState(false);
    const [modals, setModalsState] = useState([]);
    const [isSidebarNavOpen, setIsSidebarNavOpen] = useState(false);
    const headerRef = useRef(null);
    const [headerHeight, setHeaderHeight] = useState(0);

    const setModal = (modalData) => {
        if (modalData === null) {
            setModalsState(prev => prev.slice(0, -1));
        } else {
            setModalsState(prev => [...prev, modalData]);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                setModal(null);
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Calculate main header height
    useEffect(() => {
        if (headerRef.current) {
            setHeaderHeight(headerRef.current.offsetHeight);
        }
    }, []);

    // Clear all notifications
    const handleClearAll = () => {
        if (notifications.length === 0) return;
        const allIds = notifications.map(n => n._id);
        deleteNotifications(allIds);
    };

    // Delete a single notification row
    const handleDeleteSingle = (e, notificationId) => {
        e.stopPropagation(); // Prevents click navigation on row
        deleteNotifications([notificationId]);
    };

    // Row Click - handles marking as read and navigating to files/folders/trash
    const handleNotificationClick = async (notification) => {
        const metadata = notification.metadata || {};
        const isTrashNotification = notification.type === "file_deleted" || notification.type === "folder_deleted";

        // Mark as read if unread
        if (!notification.isRead) {
            markSingleRead(notification._id);
        }

        // Navigate based on type
        if (isTrashNotification) {
            navigate("/trash-dashboard", { state: { highlightId: metadata.itemId } });
        } else {
            if (metadata.parentId) {
                navigate(`/dashboard/folder/${metadata.parentId}`);
            } else {
                navigate("/dashboard");
            }
            if (metadata.itemId) {
                triggerHighlight(metadata.itemId);
            }
        }
    };

    // Helper: Group notifications by Date
    const getGroupedNotifications = () => {
        const groups = {
            today: [],
            yesterday: [],
            older: []
        };

        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        notifications.forEach(item => {
            const itemDate = new Date(item.createdAt);
            if (itemDate.toDateString() === today.toDateString()) {
                groups.today.push(item);
            } else if (itemDate.toDateString() === yesterday.toDateString()) {
                groups.yesterday.push(item);
            } else {
                groups.older.push(item);
            }
        });

        return groups;
    };

    const formatNotificationTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " • " + date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const grouped = getGroupedNotifications();

    const renderNotificationRow = (notification) => {
        const isUnread = !notification.isRead;
        return (
            <div
                key={notification._id}
                onClick={() => handleNotificationClick(notification)}
                className={`notification-page-item ${isUnread ? 'notification-page-item-unread' : 'notification-page-item-read'}`}
            >
                <div className="notification-page-item-content">
                    <div className="notification-page-avatar-wrap">
                        <UserAvatar user={notification.metadata} />
                        {isUnread && (
                            <span className="notification-page-unread-dot" />
                        )}
                    </div>
                    <div className="notification-page-item-info">
                        <div className="d-flex align-items-center gap-2 mb-1">
                            <span className="notification-page-actor">
                                {notification.actor?.name || "System"}
                            </span>
                        </div>
                        <div
                            className="notification-page-message"
                            dangerouslySetInnerHTML={{ __html: notification.message }}
                        />
                        <span className="notification-page-time">
                            {formatNotificationTime(notification.createdAt)}
                        </span>
                    </div>
                </div>

                <button
                    className="btn-only-icon"
                    onClick={(e) => handleDeleteSingle(e, notification._id)}
                >
                    <InteractiveIcon
                        defaultIcon={closeIcon}
                        alt="Delete"
                        width={20}

                    />
                </button>
            </div>
        );
    };

    const renderSectionGroup = (title, items) => {
        if (items.length === 0) return null;
        return (
            <>
                <div className="notification-page-group-label">
                    {title}
                </div>
                <div>
                    {items.map(notification => renderNotificationRow(notification))}
                </div>
            </>
        );
    };

    return (
        <div className="page-wrapper">
            <div className="content-wrapper-main">
                {/* Main Header bar */}
                <div className="max-width-base-header" ref={headerRef}>
                    <MainHeader
                        setModal={setModal}
                        searchBarOpen={searchBarOpen}
                        setSearchBarOpen={setSearchBarOpen}
                        onMobileSidebarNavclick={() => setIsSidebarNavOpen(prev => !prev)}
                    />
                </div>

                {/* Main View Area */}
                <div className="content-view-wrapper">
                    <div className="max-width-base" style={{ height: `calc(100dvh - ${headerHeight}px)` }}>

                        {/* Full Width Container */}
                        <div className="notification-page">

                            {/* Page Header toolbar */}
                            <div className="notification-page-header">
                                <h2 className="notification-page-title" >
                                    <InteractiveIcon defaultIcon={notificationIcon} className="me-2" />
                                    Notifications
                                </h2>
                                {notifications.length > 0 && (
                                    <button className="clear-btn" onClick={handleClearAll}>
                                        Clear all
                                    </button>
                                )}
                            </div>

                            {/* Main Feed Content */}
                            {loading ? (
                                <div className="bg-white border rounded-3 shadow-sm p-5 d-flex align-items-center justify-content-center notification-page-loading">
                                    <div className="loader-wrapper-box">
                                        <div className="cma-messages-are-loader-wrapper">
                                            <span className="loader"></span>
                                        </div>
                                    </div>
                                </div>
                            ) : notifications.length === 0 ? (
                                /* GORGEOUS EMPTY STATE */
                                <div className="no-data-found-single-box-wrapper">
                                    <div className="no-data-found-single-box">
                                        <InteractiveIcon defaultIcon={notificationNoFoundImg} width={100}  className="notification-page-empty-icon-img" />
                                        <p className="text-center text-muted py-3 m-0">
                                        No notifications
                                    </p>
                                    </div>                                    
                                    
                                </div>
                            ) : (
                                <div className="notification-page-list">
                                    {renderSectionGroup("Today", grouped.today)}
                                    {renderSectionGroup("Yesterday", grouped.yesterday)}
                                    {renderSectionGroup("Earlier", grouped.older)}
                                </div>
                            )}

                        </div>

                    </div>
                </div>
            </div>

            <SidebarNav isSidebarNavOpen={isSidebarNavOpen} />
            <ModalManager modals={modals} setModal={setModal} />
        </div>
    );
}

export default NotificationPage;