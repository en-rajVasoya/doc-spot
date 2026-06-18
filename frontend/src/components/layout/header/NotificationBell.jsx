import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../../context/SocketContext"; // adjust path
import bellIcon from "@images/icon/bell.svg"; // add a bell icon

function NotificationBell() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const { socket } = useSocket(); // adjust to however you access socket

    // Fetch existing notifications on mount
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const res = await fetch("/api/notifications", {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}` // adjust to your auth
                    }
                });
                const data = await res.json();
                if (data.success) {
                    setNotifications(data.notifications);
                    setUnreadCount(data.unreadCount);
                }
            } catch (err) {
                console.error("Failed to fetch notifications", err);
            }
        };

        fetchNotifications();
    }, []);

    // Listen for real-time notifications — prepend to top
    useEffect(() => {
        if (!socket) return;

        socket.on("new_notification", (notification) => {
            setNotifications(prev => [notification, ...prev]); // newest on top
            setUnreadCount(prev => prev + 1);
        });

        return () => socket.off("new_notification");
    }, [socket]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleOpen = () => {
        setIsOpen(prev => !prev);
    };

    const handleMarkAllRead = async () => {
        try {
            await fetch("/api/notifications/read", {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (err) {
            console.error(err);
        }
    };

    const handleNotificationClick = async (notif) => {
        // Mark single as read
        if (!notif.isRead) {
            try {
                await fetch(`/api/notifications/${notif._id}/read`, {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`
                    }
                });
                setNotifications(prev =>
                    prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n)
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
            } catch (err) {
                console.error(err);
            }
        }
        setIsOpen(false);
        navigate("/trash-dashboard");
    };

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHr = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHr / 24);

        if (diffMin < 1) return "Just now";
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHr < 24) return `${diffHr}h ago`;
        return `${diffDay}d ago`;
    };

    return (
        <div className="notification-bell-wrapper" ref={dropdownRef}>
            {/* Bell button with red dot */}
            <button
                className="notification-bell-btn"
                onClick={handleOpen}
                aria-label="Notifications"
            >
                <img src={bellIcon} alt="Notifications" width={22} height={22} />
                {unreadCount > 0 && (
                    <span className="notification-red-dot">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="notification-dropdown">
                    {/* Header */}
                    <div className="notification-dropdown-header">
                        <span className="notification-title">Notifications</span>
                        {unreadCount > 0 && (
                            <button
                                className="mark-all-read-btn"
                                onClick={handleMarkAllRead}
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="notification-list">
                        {notifications.length === 0 ? (
                            <div className="notification-empty">
                                No notifications yet
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div
                                    key={notif._id}
                                    className={`notification-item ${!notif.isRead ? "unread" : ""}`}
                                    onClick={() => handleNotificationClick(notif)}
                                >
                                    {/* Unread indicator dot */}
                                    {!notif.isRead && (
                                        <span className="unread-dot" />
                                    )}

                                    {/* Actor avatar */}
                                    <div className="notif-avatar">
                                        {notif.actor?.profilePic ? (
                                            <img
                                                src={notif.actor.profilePic}
                                                alt={notif.actor.name}
                                            />
                                        ) : (
                                            <span className="notif-avatar-initials">
                                                {notif.actor?.name?.[0]?.toUpperCase() || "?"}
                                            </span>
                                        )}
                                    </div>

                                    {/* Message + time */}
                                    <div className="notif-content">
                                        <p className="notif-message">{notif.message}</p>
                                        <span className="notif-time">
                                            {formatTime(notif.createdAt)}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default NotificationBell;