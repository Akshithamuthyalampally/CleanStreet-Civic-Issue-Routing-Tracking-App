const User = require('../models/User');
const Issue = require('../models/Issue');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');

// GET /api/admin/stats
const getStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalCitizens = await User.countDocuments({ role: 'citizen' });
        const totalVolunteers = await User.countDocuments({ role: 'volunteer' });

        // MongoDB stores these as "Pending", "In Progress", "Resolved" as per Issue schema
        const totalComplaints = await Issue.countDocuments();
        const pendingComplaints = await Issue.countDocuments({ status: 'Pending' });
        const resolvedComplaints = await Issue.countDocuments({ status: 'Resolved' });
        const inProgressComplaints = await Issue.countDocuments({ status: 'In Progress' });

        // Aggregate counts by role for charts
        const userRolesDistribution = await User.aggregate([
            { $group: { _id: "$role", count: { $sum: 1 } } }
        ]);

        // Aggregate counts by status for charts
        const statusDistribution = await Issue.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        // Aggregate counts by category for charts (schema uses 'category', not 'type')
        const typeDistribution = await Issue.aggregate([
            { $group: { _id: "$category", count: { $sum: 1 } } }
        ]);

        // Monthly trends (simplified: last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const monthlyTrends = await Issue.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        res.json({
            summary: {
                totalUsers,
                totalCitizens,
                totalVolunteers,
                totalComplaints,
                pendingComplaints,
                resolvedComplaints,
                inProgressComplaints
            },
            userRolesDistribution,
            statusDistribution,
            typeDistribution,
            monthlyTrends
        });
    } catch (err) {
        console.error('getStats ERROR:', err);
        res.status(500).json({ message: 'Error fetching stats: ' + err.message });
    }
};

// GET /api/admin/users
const getUsers = async (req, res) => {
    try {
        const { role, location } = req.query;
        let query = {};
        if (role) query.role = role.toLowerCase();
        if (location) query.location = new RegExp(location, 'i');

        const users = await User.find(query).select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        console.error('getUsers ERROR:', err);
        res.status(500).json({ message: 'Error fetching users' });
    }
};

// GET /api/admin/complaints
const getComplaints = async (req, res) => {
    try {
        const { status, type, location } = req.query;
        let query = {};
        if (status) {
            const statusMap = {
                'pending': 'Pending',
                'in progress': 'In Progress',
                'resolved': 'Resolved'
            };
            query.status = statusMap[status.toLowerCase()] || status;
        }
        if (type) query.category = type;
        if (location) query.fullAddress = new RegExp(location, 'i');

        const complaints = await Issue.find(query)
            .populate('userId', 'name email')
            .populate('assignedVolunteer', 'name volunteerId email')
            .populate('assignedBy', 'name role')
            .sort({ createdAt: -1 })
            .lean(); // Use lean for faster, plain JS objects

        // Map fields for frontend consistency
        const mappedComplaints = complaints.map(c => ({
            ...c,
            location: c.fullAddress,
            type: c.category,
            assignedTo: c.assignedVolunteer?._id || c.assignedVolunteer || null,
            citizenName: c.userId?.name || 'Anonymous',
            volunteerName: c.assignedVolunteer?.name || null,
            volunteerId: c.assignedVolunteer?.volunteerId || null,
            assignedByRole: c.assignedBy?.role || null,
            createdAt: c.createdAt // Ensure timestamp is preserved
        }));

        res.json(mappedComplaints);
    } catch (err) {
        console.error('getComplaints ERROR:', err);
        res.status(500).json({ message: 'Error fetching complaints' });
    }
};

// PUT /api/admin/complaints/:id
const updateComplaint = async (req, res) => {
    try {
        const { status, assignedTo } = req.body;
        const issue = await Issue.findById(req.params.id);
        if (!issue) return res.status(404).json({ message: 'Issue not found' });

        const oldStatus = issue.status;
        if (status) {
            const statusMap = {
                'pending': 'Pending',
                'in progress': 'In Progress',
                'resolved': 'Resolved'
            };
            issue.status = statusMap[status.toLowerCase()] || status;
        }
        if (assignedTo) {
            const volunteer = await User.findById(assignedTo);
            if (!volunteer || volunteer.role !== 'volunteer') {
                return res.status(400).json({ message: 'Can only assign issues to volunteers' });
            }
            issue.assignedVolunteer = assignedTo;
            issue.assignedBy = req.userId; // Store the admin who assigned it
        }

        await issue.save();

        let logMsg = `Updated complaint "${issue.title}"`;
        if (status && issue.status !== oldStatus) logMsg += ` status from ${oldStatus} to ${issue.status}`;

        if (assignedTo) {
            const assignedUser = await User.findById(assignedTo);
            logMsg += ` assigned to user ${assignedUser?.name || 'Unknown'} (ID: ${assignedTo})`;
        }

        const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        logMsg += ` - ${now}`;

        await Activity.create({
            user: req.userId,
            type: status ? 'STATUS_UPDATE' : 'ASSIGNMENT',
            details: logMsg,
            targetId: issue._id
        });

        const updatedIssue = await Issue.findById(issue._id)
            .populate('userId', 'name')
            .populate('assignedVolunteer', 'name volunteerId')
            .populate('assignedBy', 'name role');

        // --- Notifications ---
        try {
            const notifs = [];
            const dateTimeStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

            if (assignedTo) {
                // Notify the volunteer who was assigned
                notifs.push({
                    recipient: assignedTo,
                    type: 'ISSUE_ASSIGNED',
                    message: `Admin assigned you the issue "${updatedIssue.title}" at ${updatedIssue.fullAddress} on ${dateTimeStr}.`,
                    issueId: updatedIssue._id
                });
                // Notify the citizen who created the issue
                if (updatedIssue.userId) {
                    notifs.push({
                        recipient: updatedIssue.userId._id,
                        type: 'STATUS_CHANGED',
                        message: `A volunteer has been assigned to your issue "${updatedIssue.title}" by the admin on ${dateTimeStr}.`,
                        issueId: updatedIssue._id
                    });
                }
            }

            if (status && issue.status !== oldStatus) {
                // Notify the citizen
                if (updatedIssue.userId) {
                    notifs.push({
                        recipient: updatedIssue.userId._id,
                        type: 'STATUS_CHANGED',
                        message: `Your issue "${updatedIssue.title}" status was updated from "${oldStatus}" to "${updatedIssue.status}" by admin on ${dateTimeStr}.`,
                        issueId: updatedIssue._id
                    });
                }
            }

            if (notifs.length > 0) await Notification.insertMany(notifs);
        } catch (notifErr) {
            console.error('Notification error on admin updateComplaint:', notifErr);
        }

        res.json({ message: 'Complaint updated', issue: updatedIssue });
    } catch (err) {
        console.error('updateComplaint ERROR:', err);
        res.status(500).json({ message: 'Error updating complaint' });
    }
};

// GET /api/admin/activities
const getActivities = async (req, res) => {
    try {
        const activities = await Activity.find()
            .populate('user', 'name')
            .sort({ timestamp: -1 })
            .limit(50);
        res.json(activities);
    } catch (err) {
        console.error('getActivities ERROR:', err);
        res.status(500).json({ message: 'Error fetching activities' });
    }
};

// DELETE /api/admin/activities/:id
const deleteActivity = async (req, res) => {
    try {
        const activity = await Activity.findByIdAndDelete(req.params.id);
        if (!activity) {
            return res.status(404).json({ message: 'Activity not found' });
        }
        res.json({ message: 'Activity record purged' });
    } catch (err) {
        console.error('deleteActivity ERROR:', err);
        res.status(500).json({ message: 'Error purging activity' });
    }
};

// GET /api/admin/complaints-last-7-days - Complaints histogram for last 7 days
const getComplaintsLastSevenDays = async (req, res) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const dailyComplaints = await Issue.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        day: { $dayOfMonth: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
        ]);

        // Format for chart
        const formattedData = dailyComplaints.map(d => {
            const date = new Date(d._id.year, d._id.month - 1, d._id.day);
            return {
                date: date.toISOString().split('T')[0],
                count: d.count
            };
        });

        res.json(formattedData);
    } catch (err) {
        console.error('getComplaintsLastSevenDays ERROR:', err);
        res.status(500).json({ message: 'Error fetching last 7 days complaints' });
    }
};

// GET /api/admin/registrations-last-30-days - User registrations line chart for last 30 days
const getRegistrationsLastThirtyDays = async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const dailyRegistrations = await User.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        day: { $dayOfMonth: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
        ]);

        // Format for chart
        const formattedData = dailyRegistrations.map(d => {
            const date = new Date(d._id.year, d._id.month - 1, d._id.day);
            return {
                date: date.toISOString().split('T')[0],
                count: d.count
            };
        });

        res.json(formattedData);
    } catch (err) {
        console.error('getRegistrationsLastThirtyDays ERROR:', err);
        res.status(500).json({ message: 'Error fetching last 30 days registrations' });
    }
};

// GET /api/admin/volunteer-analytics - Get comprehensive volunteer analytics
const getVolunteerAnalytics = async (req, res) => {
    try {
        const Review = require('../models/Review');

        // Get all volunteers with their stats
        const volunteers = await User.find({ role: 'volunteer' })
            .select('name volunteerId email location createdAt')
            .lean();

        // Get issue stats for each volunteer
        const volunteerStats = await Promise.all(volunteers.map(async (volunteer) => {
            const assignedIssues = await Issue.countDocuments({ assignedVolunteer: volunteer._id });
            const completedIssues = await Issue.countDocuments({
                assignedVolunteer: volunteer._id,
                status: 'Resolved'
            });
            const inProgressIssues = await Issue.countDocuments({
                assignedVolunteer: volunteer._id,
                status: 'In Progress'
            });
            const pendingIssues = await Issue.countDocuments({
                assignedVolunteer: volunteer._id,
                status: 'Pending'
            });

            // Get ratings for this volunteer
            const reviews = await Review.find({
                volunteerId: volunteer._id,
                type: 'issue_based'
            });

            const totalReviews = reviews.length;
            const avgRating = totalReviews > 0
                ? (reviews.reduce((acc, r) => acc + r.overallRating, 0) / totalReviews).toFixed(2)
                : 0;

            const avgServiceQuality = totalReviews > 0
                ? (reviews.reduce((acc, r) => acc + (r.serviceQuality || 0), 0) / totalReviews).toFixed(2)
                : 0;

            const avgResponseTime = totalReviews > 0
                ? (reviews.reduce((acc, r) => acc + (r.responseTime || 0), 0) / totalReviews).toFixed(2)
                : 0;

            const avgProfessionalism = totalReviews > 0
                ? (reviews.reduce((acc, r) => acc + (r.volunteerProfessionalism || 0), 0) / totalReviews).toFixed(2)
                : 0;

            // Calculate completion rate
            const completionRate = assignedIssues > 0
                ? ((completedIssues / assignedIssues) * 100).toFixed(1)
                : 0;

            // Get recent issues
            const recentIssues = await Issue.find({ assignedVolunteer: volunteer._id })
                .sort({ updatedAt: -1 })
                .limit(5)
                .select('title status category createdAt updatedAt');

            return {
                ...volunteer,
                stats: {
                    totalAssigned: assignedIssues,
                    completed: completedIssues,
                    inProgress: inProgressIssues,
                    pending: pendingIssues,
                    completionRate: parseFloat(completionRate),
                    totalReviews,
                    avgRating: parseFloat(avgRating),
                    avgServiceQuality: parseFloat(avgServiceQuality),
                    avgResponseTime: parseFloat(avgResponseTime),
                    avgProfessionalism: parseFloat(avgProfessionalism)
                },
                recentIssues
            };
        }));

        // Overall volunteer statistics
        const totalVolunteers = volunteers.length;
        const activeVolunteers = await User.countDocuments({
            role: 'volunteer',
            _id: { $in: await Issue.distinct('assignedVolunteer') }
        });

        const totalAssignedIssues = await Issue.countDocuments({
            assignedVolunteer: { $ne: null }
        });

        const totalCompletedByVolunteers = await Issue.countDocuments({
            assignedVolunteer: { $ne: null },
            status: 'Resolved'
        });

        // Top performers
        const topPerformers = volunteerStats
            .filter(v => v.stats.totalAssigned > 0)
            .sort((a, b) => b.stats.completed - a.stats.completed)
            .slice(0, 5);

        // Category distribution for volunteers
        const categoryStats = await Issue.aggregate([
            { $match: { assignedVolunteer: { $ne: null } } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        res.json({
            summary: {
                totalVolunteers,
                activeVolunteers,
                totalAssignedIssues,
                totalCompletedByVolunteers,
                overallCompletionRate: totalAssignedIssues > 0
                    ? ((totalCompletedByVolunteers / totalAssignedIssues) * 100).toFixed(1)
                    : 0
            },
            volunteers: volunteerStats,
            topPerformers,
            categoryStats
        });
    } catch (err) {
        console.error('getVolunteerAnalytics ERROR:', err);
        res.status(500).json({ message: 'Error fetching volunteer analytics' });
    }
};

module.exports = { getStats, getUsers, getComplaints, updateComplaint, getActivities, deleteActivity, getVolunteerAnalytics, getComplaintsLastSevenDays, getRegistrationsLastThirtyDays };
