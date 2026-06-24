import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosApi from '../utils/api';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

const BellNotificationContext = createContext();


export function BellNotificationProvider({ children }) {
    const { user } = useAuth()
    const { socket } = useSocket()

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);


    // Load initial notifications from the backend
    const loadNotifications = async () => {
        if(!user) return;

        try {
            setLoading(true)
            const res = await axiosApi.get("/notifications")
            setNotifications(res.data.notifications || [])
            setUnreadCount(res.data.unreadCount || 0)
        } catch (error) {
             console.error("Error loading notifications:", error);
        } finally {
            setLoading(false)
        }
    }


    // Load notifications automatically when user logs in, and clean up when they log out
    useEffect(() => {
        if(user){
            loadNotifications()
        } else {
            setNotifications([])
            setUnreadCount(0)
        }
    }, [user])


    // Socket.io real-time event listeners
    useEffect(() => {
        if(!socket || !user) return

        //  listen for live incoming notification
        socket.on("new_notification", (notification) => {
            setNotifications(prev => [notification, ...prev])
            setUnreadCount(prev => prev + 1)
        })


        // listen for remove notification
        socket.on("notifications_removed", ({ ids }) => {
            const removedSet = new Set(ids.map(id => id.toString()));
            setNotifications(prev => {
                const removedUnread = prev.filter(
                    n => removedSet.has(n._id.toString()) && !n.isRead
                ).length;
                setUnreadCount(count => Math.max(0, count - removedUnread));
                return prev.filter(n => !removedSet.has(n._id.toString()));
            });
        });

        return () => {
            socket.off("new_notification");
            socket.off("notifications_removed");
        };

    }, [socket, user])




    // // Mark all notifications as read
    const markAllRead = async () => {
        try {
            if(unreadCount === 0) return
            await axiosApi.post("/notifications/read_all")
            setUnreadCount(0)
            setNotifications(prev => 
                prev.map(item => ({
                    ...item,
                    isRead: true
                }))
            )
        } catch (error) {
            console.error("Error marking all read:", error);
        }
    }


    // Mark a single notification as read (used when clicked)
    const markSingleRead = async (notificationId) => {
        try {
            await axiosApi.put(`/notifications/${notificationId}/read`);
            setNotifications(prev => {
                const wasUnread = prev.find(item => item._id === notificationId && !item.isRead);
                if (wasUnread) {
                    setUnreadCount(count => Math.max(0, count - 1));
                }
                return prev.map(item => 
                    item._id === notificationId ? { ...item, isRead: true } : item
                );
            });
        } catch (err) {
            console.error("Error marking single read:", err);
        }
    };


    // Delete notifications (supports both single ID and multiple IDs)
    const deleteNotifications = async (ids) => {
        try {
            await axiosApi.delete("/notifications/remove_notification", {
                data: { ids }
            });
            const removedSet = new Set(ids.map(id => id.toString()));
            setNotifications(prev => {
                const removedUnread = prev.filter(
                    n => removedSet.has(n._id.toString()) && !n.isRead
                ).length;
                setUnreadCount(count => Math.max(0, count - removedUnread));
                return prev.filter(n => !removedSet.has(n._id.toString()));
            });
        } catch (err) {
            console.error("Error deleting notifications:", err);
        }
    };



    return (
        <BellNotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                loading,
                loadNotifications,
                markAllRead,
                markSingleRead,
                deleteNotifications
            }}
        >
            {children}
        </BellNotificationContext.Provider>
    );
}
export function useBellNotification() {
    const context = useContext(BellNotificationContext);
    if (!context) {
        throw new Error("useBellNotification must be used within a BellNotificationProvider");
    }
    return context;
}