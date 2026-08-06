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
        const isShareNotification = notification.type === "file_shared"

        // Mark as read if unread
        if (!notification.isRead) {
            markSingleRead(notification._id);
        }

        // Navigate based on type
        if (isTrashNotification) {
            navigate("/trash-dashboard", { state: { highlightId: metadata.itemId } });
        } else {
            const targetRoute = metadata.parentId
                ? `/dashboard/folder/${metadata.parentId}`
                : (isShareNotification ? "/shared-with-me" : "/dashboard");

            navigate(targetRoute)
            if (metadata.itemId) {
                triggerHighlight(metadata.itemId)
            }
        }
    };

    // Helper: Group notifications by Date
    const getGroupedNotifications = () => {
        const groups = {
            today: [],
            yesterday: [],
            thisWeek: [],
            thisMonth: [],
            older: []
        };

        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        notifications.forEach(item => {
            const itemDate = new Date(item.createdAt);

            if (itemDate.toDateString() === today.toDateString()) {
                groups.today.push(item);
            } else if (itemDate.toDateString() === yesterday.toDateString()) {
                groups.yesterday.push(item);
            } else if (itemDate >= sevenDaysAgo) {
                groups.thisWeek.push(item);
            } else if (itemDate >= startOfMonth) {
                groups.thisMonth.push(item);
            } else {
                groups.older.push(item);
            }
        });

        return groups;
    };

    const formatNotificationTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) + " • " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
                        <UserAvatar user={notification.actor} />
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
                                <div className="d-flex align-items-center justify-content-center notification-page-loading" >
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
                                        <InteractiveIcon defaultIcon={notificationNoFoundImg} width={100} className="notification-page-empty-icon-img" />
                                        <p className="text-center text-muted py-3 m-0">
                                            No notifications
                                        </p>
                                    </div>

                                </div>
                            ) : (
                                <div className="notification-page-list">
                                    {renderSectionGroup("Today", grouped.today)}
                                    {renderSectionGroup("Yesterday", grouped.yesterday)}
                                    {renderSectionGroup("This Week", grouped.thisWeek)}
                                    {renderSectionGroup("This Month", grouped.thisMonth)}
                                    {renderSectionGroup("Older", grouped.older)}
                                </div>
                            )}

                        </div>

                    </div>
                </div>
            </div>

            <SidebarNav isSidebarNavOpen={isSidebarNavOpen} closeSidebar={() => setIsSidebarNavOpen(false)} />
            <ModalManager modals={modals} setModal={setModal} />
        </div>
    );
}

export default NotificationPage;