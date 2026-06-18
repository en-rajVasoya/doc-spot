import notificationModel from "#models/notification";

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
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};