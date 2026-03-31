const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const adminOnly = require('../middleware/admin');
const { getStats, getUsers, getComplaints, updateComplaint, getActivities, deleteActivity, getVolunteerAnalytics, getComplaintsLastSevenDays, getRegistrationsLastThirtyDays } = require('../controllers/adminController');

// All admin routes are protected by token verification AND admin role check
router.use(verifyToken, adminOnly);

router.get('/stats', getStats);
router.get('/users', getUsers);
router.get('/complaints', getComplaints);
router.put('/complaints/:id', updateComplaint);
router.get('/activities', getActivities);
router.delete('/activities/:id', deleteActivity);
router.get('/volunteer-analytics', getVolunteerAnalytics);
router.get('/complaints-last-7-days', getComplaintsLastSevenDays);
router.get('/registrations-last-30-days', getRegistrationsLastThirtyDays);

module.exports = router;
