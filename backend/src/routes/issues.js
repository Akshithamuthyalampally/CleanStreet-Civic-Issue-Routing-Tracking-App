const express = require('express');
const router = express.Router();
const { createIssue, getAllIssues, getMyIssues, updateIssue, deleteIssue, upvoteIssue, downvoteIssue, addComment, getNearbyIssues, acceptIssue, rejectIssue } = require('../controllers/issueController');
const verifyToken = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/', verifyToken, upload.array('images', 5), createIssue);
router.get('/', verifyToken, getAllIssues);
router.get('/my', verifyToken, getMyIssues);
router.get('/nearby', verifyToken, getNearbyIssues);
router.put('/:id', verifyToken, upload.array('images', 5), updateIssue);
router.delete('/:id', verifyToken, deleteIssue);

router.post('/:id/upvote', verifyToken, upvoteIssue);
router.post('/:id/downvote', verifyToken, downvoteIssue);
router.post('/:id/comment', verifyToken, addComment);
router.post('/:id/accept', verifyToken, acceptIssue);
router.post('/:id/reject', verifyToken, rejectIssue);

module.exports = router;
