const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');

const {
    searchRecipients,
    createFeedback,
    getInbox,
    getSent,
    getUnreadCount,
    markThreadRead,
    replyToThread,
    editMessage,
    deleteMessage,
    deleteThread
} = require('../controllers/feedbackController');

router.post('/', verifyToken, createFeedback);
router.get('/recipients', verifyToken, searchRecipients);
router.get('/inbox', verifyToken, getInbox);
router.get('/sent', verifyToken, getSent);
router.get('/unread-count', verifyToken, getUnreadCount);
router.put('/:id/read', verifyToken, markThreadRead);
router.post('/:id/reply', verifyToken, replyToThread);
router.put('/:threadId/message/:messageId', verifyToken, editMessage);
router.delete('/:threadId/message/:messageId', verifyToken, deleteMessage);
router.delete('/:threadId', verifyToken, deleteThread);

module.exports = router;

