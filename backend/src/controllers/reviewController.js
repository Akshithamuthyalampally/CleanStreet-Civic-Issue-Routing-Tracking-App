const Review = require('../models/Review');
const User = require('../models/User');

// POST /api/reviews - create a new review/feedback
const createReview = async (req, res) => {
    try {
        const {
            citizenName,
            citizenId,
            complaintType,
            overallRating,
            serviceQuality,
            responseTime,
            volunteerProfessionalism,
            comments,
            type,         // 'general' or 'issue_based'
            volunteerId,
            issueId
        } = req.body;

        if (!citizenName || !citizenId || !complaintType || !overallRating) {
            return res.status(400).json({ message: 'Missing required review fields' });
        }

        const reviewData = {
            citizenName,
            citizenId,
            complaintType,
            overallRating,
            serviceQuality,
            responseTime,
            volunteerProfessionalism,
            comments,
            type: type || 'general',
            volunteerId: volunteerId || null,
            issueId: issueId || null
        };

        const review = await Review.create(reviewData);
        res.status(201).json(review);
    } catch (err) {
        console.error('createReview ERROR:', err);
        res.status(500).json({ message: 'Error submitting review' });
    }
};

// --- ADMIN FUNCTIONS ---

// GET /api/reviews - get all general reviews (for Admin)
const getReviews = async (req, res) => {
    try {
        // Admins see general feedback. They could also see issue_based if needed, 
        // but user asked to keep general feedback to Admin only.
        const reviews = await Review.find({ type: 'general' }).sort({ createdAt: -1 });
        res.json(reviews);
    } catch (err) {
        console.error('getReviews ERROR:', err);
        res.status(500).json({ message: 'Error fetching reviews' });
    }
};

// GET /api/reviews/unread-count - count of unread general reviews (Admin only)
const getUnreadReviewCount = async (req, res) => {
    try {
        const count = await Review.countDocuments({ type: 'general', isReadByAdmin: false });
        res.json({ count });
    } catch (err) {
        console.error('getUnreadReviewCount ERROR:', err);
        res.status(500).json({ message: 'Error fetching unread review count' });
    }
};

// PUT /api/reviews/mark-all-read - mark ALL general reviews as read
const markAllReviewsRead = async (req, res) => {
    try {
        await Review.updateMany({ type: 'general', isReadByAdmin: false }, { isReadByAdmin: true });
        res.json({ message: 'All admin reviews marked as read' });
    } catch (err) {
        console.error('markAllReviewsRead ERROR:', err);
        res.status(500).json({ message: 'Error marking all reviews as read' });
    }
};

// PUT /api/reviews/:id/read - mark single review as read (Admin)
const markReviewRead = async (req, res) => {
    try {
        const review = await Review.findByIdAndUpdate(
            req.params.id,
            { isReadByAdmin: true },
            { new: true }
        );
        res.json(review);
    } catch (err) {
        res.status(500).json({ message: 'Error marking review as read' });
    }
};

// --- VOLUNTEER FUNCTIONS ---

// GET /api/reviews/volunteer/stats - get performance stats for logged-in volunteer
const getVolunteerStats = async (req, res) => {
    try {
        const volunteerId = req.userId;
        const reviews = await Review.find({ volunteerId, type: 'issue_based' });

        const total = reviews.length;
        const avg = total > 0 ? (reviews.reduce((acc, r) => acc + r.overallRating, 0) / total).toFixed(1) : 0;
        
        // Breakdown: 1-5 stars
        const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach(r => {
            if (breakdown[r.overallRating] !== undefined) breakdown[r.overallRating]++;
        });

        res.json({
            totalFeedback: total,
            averageRating: parseFloat(avg),
            breakdown
        });
    } catch (err) {
        console.error('getVolunteerStats ERROR:', err);
        res.status(500).json({ message: 'Error fetching volunteer stats' });
    }
};

// GET /api/reviews/volunteer/list - get all issue-based reviews for logged-in volunteer
const getVolunteerReviews = async (req, res) => {
    try {
        const volunteerId = req.userId;
        const reviews = await Review.find({ volunteerId, type: 'issue_based' })
            .populate('issueId', 'title category')
            .sort({ createdAt: -1 });
        res.json(reviews);
    } catch (err) {
        console.error('getVolunteerReviews ERROR:', err);
        res.status(500).json({ message: 'Error fetching volunteer reviews' });
    }
};

// GET /api/reviews/volunteer/unread-count - unread feedback for volunteer
const getUnreadVolunteerReviewCount = async (req, res) => {
    try {
        const volunteerId = req.userId;
        const count = await Review.countDocuments({ volunteerId, type: 'issue_based', isReadByVolunteer: false });
        res.json({ count });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching volunteer unread count' });
    }
};

// PUT /api/reviews/volunteer/mark-all-read - mark all as read for volunteer
const markVolunteerReviewsRead = async (req, res) => {
    try {
        const volunteerId = req.userId;
        await Review.updateMany(
            { volunteerId, type: 'issue_based', isReadByVolunteer: false },
            { isReadByVolunteer: true }
        );
        res.json({ message: 'All volunteer ratings marked as read' });
    } catch (err) {
        res.status(500).json({ message: 'Error marking reviews read' });
    }
};

// GET /api/reviews/all-issue-feedback - get all issue-based feedback for Admin
const getAllIssueFeedback = async (req, res) => {
    try {
        const reviews = await Review.find({ type: 'issue_based' })
            .populate('volunteerId', 'name volunteerId email')
            .populate('issueId', 'title category fullAddress status')
            .sort({ createdAt: -1 });

        const formattedReviews = reviews.map(r => ({
            _id: r._id,
            citizenName: r.citizenName,
            citizenId: r.citizenId,
            volunteerName: r.volunteerId?.name || 'Unknown',
            volunteerUniqueId: r.volunteerId?.volunteerId || 'N/A',
            volunteerEmail: r.volunteerId?.email || 'N/A',
            issueTitle: r.issueId?.title || 'Deleted Issue',
            issueCategory: r.issueId?.category || 'N/A',
            issueLocation: r.issueId?.fullAddress || 'N/A',
            issueStatus: r.issueId?.status || 'N/A',
            overallRating: r.overallRating,
            serviceQuality: r.serviceQuality,
            responseTime: r.responseTime,
            volunteerProfessionalism: r.volunteerProfessionalism,
            comments: r.comments,
            date: r.createdAt,
            isReadByAdmin: r.isReadByAdmin
        }));

        res.json(formattedReviews);
    } catch (err) {
        console.error('getAllIssueFeedback ERROR:', err);
        res.status(500).json({ message: 'Error fetching issue feedback' });
    }
};

module.exports = {
    createReview,
    getReviews,
    getUnreadReviewCount,
    markReviewRead,
    markAllReviewsRead,
    getVolunteerStats,
    getVolunteerReviews,
    getUnreadVolunteerReviewCount,
    markVolunteerReviewsRead,
    getAllIssueFeedback
};

