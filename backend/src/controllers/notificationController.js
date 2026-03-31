const Notification = require('../models/Notification');

// GET /api/notifications  — fetch notifications for the logged-in user
const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.userId })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(notifications);
    } catch (err) {
        console.error('getNotifications ERROR:', err);
        res.status(500).json({ message: 'Error fetching notifications' });
    }
};

// GET /api/notifications/unread-count  — count of unread notifications
const getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({ recipient: req.userId, isRead: false });
        res.json({ count });
    } catch (err) {
        console.error('getUnreadCount ERROR:', err);
        res.status(500).json({ message: 'Error fetching unread count' });
    }
};

// PUT /api/notifications/:id/read  — mark a single notification as read
const markAsRead = async (req, res) => {
    try {
        await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.userId },
            { isRead: true }
        );
        res.json({ message: 'Notification marked as read' });
    } catch (err) {
        console.error('markAsRead ERROR:', err);
        res.status(500).json({ message: 'Error marking notification as read' });
    }
};

// PUT /api/notifications/mark-all-read  — mark ALL notifications as read
const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.userId, isRead: false },
            { isRead: true }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        console.error('markAllAsRead ERROR:', err);
        res.status(500).json({ message: 'Error marking all notifications as read' });
    }
};

// DELETE /api/notifications/:id  — delete a single notification
const deleteNotification = async (req, res) => {
    try {
        const notificationId = req.params.id;

        // First, find the notification to verify ownership
        const notification = await Notification.findById(notificationId);

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        // Authorization check: Only the recipient can delete their notification
        if (notification.recipient.toString() !== req.userId) {
            return res.status(403).json({ message: 'Unauthorized: You can only delete your own notifications' });
        }

        // Delete the notification from MongoDB
        await Notification.findByIdAndDelete(notificationId);

        console.log(`Notification ${notificationId} deleted by user ${req.userId}`);
        res.json({ message: 'Notification deleted successfully' });
    } catch (err) {
        console.error('deleteNotification ERROR:', err);
        res.status(500).json({ message: 'Error deleting notification' });
    }
};

// DELETE /api/notifications/bulk  — delete multiple notifications by IDs
const deleteMultipleNotifications = async (req, res) => {
    try {
        const { notificationIds } = req.body;

        if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
            return res.status(400).json({ message: 'Please provide an array of notification IDs' });
        }

        // Find all notifications to verify ownership
        const notifications = await Notification.find({ _id: { $in: notificationIds } });

        // Check if all notifications belong to the current user
        const unauthorized = notifications.filter(n => n.recipient.toString() !== req.userId);
        if (unauthorized.length > 0) {
            return res.status(403).json({
                message: 'Unauthorized: You can only delete your own notifications',
                unauthorizedCount: unauthorized.length
            });
        }

        // Delete all authorized notifications
        const result = await Notification.deleteMany({ _id: { $in: notificationIds } });

        console.log(`${result.deletedCount} notifications deleted by user ${req.userId}`);
        res.json({
            message: `${result.deletedCount} notification(s) deleted successfully`,
            deletedCount: result.deletedCount
        });
    } catch (err) {
        console.error('deleteMultipleNotifications ERROR:', err);
        res.status(500).json({ message: 'Error deleting notifications' });
    }
};

// DELETE /api/notifications/clear-all  — delete ALL notifications for the user
const deleteAllNotifications = async (req, res) => {
    try {
        const result = await Notification.deleteMany({ recipient: req.userId });

        console.log(`All ${result.deletedCount} notifications deleted for user ${req.userId}`);
        res.json({
            message: `All ${result.deletedCount} notification(s) deleted successfully`,
            deletedCount: result.deletedCount
        });
    } catch (err) {
        console.error('deleteAllNotifications ERROR:', err);
        res.status(500).json({ message: 'Error clearing notifications' });
    }
};

module.exports = {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteMultipleNotifications,
    deleteAllNotifications
};
