const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteMultipleNotifications,
    deleteAllNotifications
} = require('../controllers/notificationController');

router.get('/', verifyToken, getNotifications);
router.get('/unread-count', verifyToken, getUnreadCount);
router.put('/mark-all-read', verifyToken, markAllAsRead);
router.put('/:id/read', verifyToken, markAsRead);
router.delete('/:id', verifyToken, deleteNotification);
router.delete('/bulk/delete', verifyToken, deleteMultipleNotifications);
router.delete('/clear/all', verifyToken, deleteAllNotifications);

module.exports = router;
