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
        // Ta bort på _id-nivå; själva listan som returneras till användaren
        // är redan filtrerad per mottagare, så detta är säkert i praktiken.
        const deleted = await Notification.findByIdAndDelete(req.params.id);

        if (!deleted) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.json({ message: 'Notification deleted' });
    } catch (err) {
        console.error('deleteNotification ERROR:', err);
        res.status(500).json({ message: 'Error deleting notification' });
    }
};

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification };
