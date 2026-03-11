const User = require('../models/User');
const Issue = require('../models/Issue');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');

// GET /api/admin/stats
const getStats = async (req, res) => {
    try {
        console.log('--- ADMIN STATS REQUEST ---');
        console.log('User ID:', req.userId);
        console.log('User Role:', req.userRole);

        const totalUsers = await User.countDocuments();
        const totalCitizens = await User.countDocuments({ role: 'citizen' });
        const totalVolunteers = await User.countDocuments({ role: 'volunteer' });

        console.log('User counts:', { totalUsers, totalCitizens, totalVolunteers });

        // MongoDB stores these as "Pending", "In Progress", "Resolved" as per Issue schema
        const totalComplaints = await Issue.countDocuments();
        const pendingComplaints = await Issue.countDocuments({ status: 'Pending' });
        const resolvedComplaints = await Issue.countDocuments({ status: 'Resolved' });
        const inProgressComplaints = await Issue.countDocuments({ status: 'In Progress' });

        console.log('Issue counts:', { totalComplaints, pendingComplaints, resolvedComplaints, inProgressComplaints });

        // Aggregate counts by role for charts
        const userRolesDistribution = await User.aggregate([
            { $group: { _id: "$role", count: { $sum: 1 } } }
        ]);

        // Aggregate counts by status for charts
        const statusDistribution = await Issue.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        console.log('Status Dist:', statusDistribution);

        // Aggregate counts by category for charts (schema uses 'category', not 'type')
        const typeDistribution = await Issue.aggregate([
            { $group: { _id: "$category", count: { $sum: 1 } } }
        ]);

        console.log('Type Dist:', typeDistribution);

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

        console.log('Monthly Trends:', monthlyTrends);

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
        console.log('--- ADMIN USERS REQUEST ---');
        const { role, location } = req.query;
        let query = {};
        if (role) query.role = role.toLowerCase();
        if (location) query.location = new RegExp(location, 'i');

        console.log('User Query:', query);
        const users = await User.find(query).select('-password').sort({ createdAt: -1 });
        console.log('Users found:', users.length);
        res.json(users);
    } catch (err) {
        console.error('getUsers ERROR:', err);
        res.status(500).json({ message: 'Error fetching users' });
    }
};

// GET /api/admin/complaints
const getComplaints = async (req, res) => {
    try {
        console.log('--- ADMIN COMPLAINTS REQUEST ---');
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

        console.log('Complaint Query:', query);
        const complaints = await Issue.find(query)
            .populate('userId', 'name email')
            .populate('assignedVolunteer', 'name volunteerId email')
            .populate('assignedBy', 'name role')
            .sort({ createdAt: -1 })
            .lean(); // Use lean for faster, plain JS objects

        console.log('Complaints found:', complaints.length);

        // Map fields for frontend consistency
        const mappedComplaints = complaints.map(c => ({
            ...c,
            location: c.fullAddress,
            type: c.category,
            assignedTo: c.assignedVolunteer?._id || c.assignedVolunteer || null,
            citizenName: c.userId?.name || 'Anonymous',
            volunteerName: c.assignedVolunteer?.name || null,
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
        console.log('PURGE REQUEST:', req.params.id);
        const activity = await Activity.findByIdAndDelete(req.params.id);
        if (!activity) {
            console.log('PURGE FAILED: Activity not found');
            return res.status(404).json({ message: 'Activity not found' });
        }
        console.log('PURGE SUCCESS');
        res.json({ message: 'Activity record purged' });
    } catch (err) {
        console.error('deleteActivity ERROR:', err);
        res.status(500).json({ message: 'Error purging activity' });
    }
};

module.exports = { getStats, getUsers, getComplaints, updateComplaint, getActivities, deleteActivity };
