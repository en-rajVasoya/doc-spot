import notificationModel from "#models/notification";

import { logger } from "#utils/logger";

export const getNotifications = async (req, res) => {
    try {
        const notifications = await notificationModel
            .find({ recipient: req.user._id })
            .populate("actor", "name profilePic")
            .sort({ createdAt: -1 });

        const unreadCount = await notificationModel.countDocuments({
            recipient: req.user._id,
            isRead: false
        });

        res.json({
            success: true,
            notifications,
            unreadCount
        });

    } catch (error) {
        logger.error(error)
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const markAllNotificationsRead = async (req, res) => {
    try {

        await notificationModel.updateMany(
            {
                recipient: req.user._id,
                isRead: false
            },
            {
                $set: {
                    isRead: true
                }
            }
        );

        res.json({
            success: true
        });

    } catch (error) {
        logger.error(error)
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const markNotificationRead = async (req, res) => {
    try {

        await notificationModel.findOneAndUpdate(
            {
                _id: req.params.id,
                recipient: req.user._id
            },
            {
                $set: {
                    isRead: true
                }
            }
        );

        res.json({
            success: true
        });

    } catch (error) {
        logger.error(error)
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const deleteNotifications = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please provide an array of notification IDs"
            });
        }

        const result = await notificationModel.deleteMany({
            _id: { $in: ids },
            recipient: req.user._id  // ensures users can only delete their own
        });

        res.json({
            success: true,
            deletedCount: result.deletedCount
        });

    } catch (error) {
        logger.error(error)
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};