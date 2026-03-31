const express = require('express');
const router = express.Router();
const { 
    createReview, 
    getReviews, 
    getUnreadReviewCount, 
    markReviewRead, 
    markAllReviewsRead,
    getVolunteerStats,
    getVolunteerReviews,
    getUnreadVolunteerReviewCount,
    markVolunteerReviewsRead
} = require('../controllers/reviewController');
const verifyToken = require('../middleware/auth');

// Public/Citizen routes
router.post('/', verifyToken, createReview);

// Admin routes
router.get('/', verifyToken, getReviews);
router.get('/unread-count', verifyToken, getUnreadReviewCount);
router.put('/mark-all-read', verifyToken, markAllReviewsRead);
router.put('/:id/read', verifyToken, markReviewRead);

// Volunteer routes (Specific to the logged-in volunteer)
router.get('/volunteer/stats', verifyToken, getVolunteerStats);
router.get('/volunteer/list', verifyToken, getVolunteerReviews);
router.get('/volunteer/unread-count', verifyToken, getUnreadVolunteerReviewCount);
router.put('/volunteer/mark-all-read', verifyToken, markVolunteerReviewsRead);

module.exports = router;
