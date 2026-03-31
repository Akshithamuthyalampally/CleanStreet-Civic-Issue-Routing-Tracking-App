const Issue = require('../models/Issue');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Feedback = require('../models/Feedback');

// POST /api/issues
const createIssue = async (req, res) => {
    try {
        const { title, description, category, fullAddress, landmark, latitude, longitude, urgency } = req.body;

        if (!title || !description || !category || !fullAddress || !latitude || !longitude) {
            return res.status(400).json({ message: 'Title, description, category, address, and coordinates are required' });
        }

        // Check if images are local or Cloudinary
        const images = req.files ? req.files.map(file => {
            if (file.path.startsWith('http')) return file.path;
            // Local fallback URL construction
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            return `${baseUrl}/${file.path.replace(/\\/g, '/')}`;
        }) : [];

        const issue = await Issue.create({
            userId: req.userId,
            title,
            description,
            category,
            fullAddress,
            landmark,
            latitude: Number(latitude),
            longitude: Number(longitude),
            urgency: urgency || 'Low',
            images
        });

        // --- Notifications: new issue created ---
        try {
            // Notify all volunteers about the new issue
            const volunteers = await User.find({ role: 'volunteer' }).select('_id');
            const volunteerNotifs = volunteers.map(v => ({
                recipient: v._id,
                type: 'NEW_ISSUE',
                message: `New issue reported: "${issue.title}" at ${issue.fullAddress}.`,
                issueId: issue._id
            }));
            // Notify all admins
            const admins = await User.find({ role: 'admin' }).select('_id');
            const adminNotifs = admins.map(a => ({
                recipient: a._id,
                type: 'ADMIN_NEW_ISSUE',
                message: `New issue created: "${issue.title}" (${issue.category}) at ${issue.fullAddress}.`,
                issueId: issue._id
            }));
            await Notification.insertMany([...volunteerNotifs, ...adminNotifs]);
        } catch (notifErr) {
            console.error('Notification error on createIssue:', notifErr);
        }

        res.status(201).json({ message: 'Issue submitted successfully', issue });
    } catch (err) {
        console.error('Error creating issue:', err);
        res.status(500).json({ message: 'Server error while creating issue' });
    }
};

// PUT /api/issues/:id
const updateIssue = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, category, fullAddress, landmark, latitude, longitude, urgency, status, existingImages } = req.body;

        const issue = await Issue.findById(id);

        if (!issue) {
            return res.status(404).json({ message: 'Issue not found' });
        }

        let preservedImages = [];
        if (existingImages) {
            preservedImages = Array.isArray(existingImages) ? existingImages : [existingImages];
        } else {
            preservedImages = issue.images;
        }

        const updateFields = {};

        if (req.userRole === 'citizen') {
            // Citizen: Can edit only their own issues
            if (issue.userId.toString() !== req.userId) {
                return res.status(403).json({ message: 'Unauthorized: You can only edit your own reports.' });
            }
            // Citizen: Cannot edit status
            if (status && status !== issue.status) {
                return res.status(403).json({ message: 'Unauthorized: Citizens cannot modify issue status.' });
            }

            updateFields.title = title || issue.title;
            updateFields.description = description || issue.description;
            updateFields.category = category || issue.category;
            updateFields.fullAddress = fullAddress || issue.fullAddress;
            updateFields.landmark = landmark || issue.landmark;
            updateFields.latitude = latitude ? Number(latitude) : issue.latitude;
            updateFields.longitude = longitude ? Number(longitude) : issue.longitude;
            updateFields.urgency = urgency || issue.urgency;
            updateFields.images = preservedImages;

            if (req.files && req.files.length > 0) {
                const newImages = req.files.map(file => {
                    if (file.path.startsWith('http')) return file.path;
                    const baseUrl = `${req.protocol}://${req.get('host')}`;
                    return `${baseUrl}/${file.path.replace(/\\/g, '/')}`;
                });
                updateFields.images = [...preservedImages, ...newImages];
            }
        } else if (req.userRole === 'volunteer' || req.userRole === 'admin') {
            // Volunteer/Admin: Only allowed to edit status, and MUST be the assigned volunteer
            if (issue.assignedVolunteer && issue.assignedVolunteer.toString() !== req.userId && req.userRole !== 'admin') {
                return res.status(403).json({ message: 'Unauthorized: This issue is assigned to another volunteer.' });
            }

            if (!issue.assignedVolunteer && req.userRole !== 'admin') {
                return res.status(403).json({ message: 'Unauthorized: You must accept this issue before updating its status.' });
            }

            updateFields.status = status || issue.status;
            // Ensure other fields are NOT modified
            updateFields.title = issue.title;
            updateFields.description = issue.description;
            updateFields.images = issue.images;
        } else {
            return res.status(403).json({ message: 'Unauthorized: Role not recognized.' });
        }

        const oldStatus = issue.status;
        const updatedIssue = await Issue.findByIdAndUpdate(id, updateFields, { new: true })
            .populate('userId', 'name')
            .populate('assignedVolunteer', 'name volunteerId')
            .populate('assignedBy', 'name role');

        // --- Notifications: status changed ---
        if (updateFields.status && updateFields.status !== oldStatus) {
            try {
                const notifs = [];
                // Notify the citizen who created the issue
                notifs.push({
                    recipient: updatedIssue.userId._id,
                    type: 'STATUS_CHANGED',
                    message: `Your issue "${updatedIssue.title}" status changed from "${oldStatus}" to "${updatedIssue.status}".`,
                    issueId: updatedIssue._id
                });
                // Notify all admins
                const admins = await User.find({ role: 'admin' }).select('_id');
                admins.forEach(a => notifs.push({
                    recipient: a._id,
                    type: 'ADMIN_STATUS_UPDATE',
                    message: `Issue "${updatedIssue.title}" status updated from "${oldStatus}" to "${updatedIssue.status}".`,
                    issueId: updatedIssue._id
                }));
                await Notification.insertMany(notifs);
            } catch (notifErr) {
                console.error('Notification error on updateIssue:', notifErr);
            }
        }

        res.json({
            message: `Update successful. Status is: ${updatedIssue.status}`,
            issue: {
                ...updatedIssue._doc,
                userName: updatedIssue.userId?.name || 'Anonymous'
            }
        });
    } catch (err) {
        console.error('Error updating issue:', err);
        res.status(500).json({ message: 'Server error while updating issue' });
    }
};

// GET /api/issues
const getAllIssues = async (req, res) => {
    try {
        const { status, priority } = req.query;
        const query = {};

        if (status && status !== 'All') {
            const cleanStatus = status.trim();
            query.status = { $regex: new RegExp(`^\\s*${cleanStatus}\\s*$`, 'i') };
        }

        if (priority && priority !== 'All') {
            const cleanPriority = priority.trim();
            query.urgency = { $regex: new RegExp(`^\\s*${cleanPriority}\\s*$`, 'i') };
        }

        const issues = await Issue.find(query)
            .populate('userId', 'name')
            .populate('assignedVolunteer', 'name volunteerId')
            .populate('assignedBy', 'name role')
            .sort({ createdAt: -1 });
        // Map to include userName directly for easier frontend access
        const mappedIssues = issues.map(issue => ({
            ...issue._doc,
            userName: issue.userId?.name || 'Anonymous'
        }));
        res.json(mappedIssues);
    } catch (err) {
        console.error('Error fetching all issues:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// GET /api/issues/my
const getMyIssues = async (req, res) => {
    try {
        const { status, priority } = req.query;
        const query = { userId: req.userId };

        if (status && status !== 'All') {
            const cleanStatus = status.trim();
            query.status = { $regex: new RegExp(`^\\s*${cleanStatus}\\s*$`, 'i') };
        }

        if (priority && priority !== 'All') {
            const cleanPriority = priority.trim();
            query.urgency = { $regex: new RegExp(`^\\s*${cleanPriority}\\s*$`, 'i') };
        }

        const issues = await Issue.find(query)
            .populate('userId', 'name')
            .populate('assignedVolunteer', 'name volunteerId')
            .populate('assignedBy', 'name role')
            .sort({ createdAt: -1 });

        const mappedIssues = issues.map(issue => ({
            ...issue._doc,
            userName: issue.userId?.name || 'Anonymous'
        }));

        res.json(mappedIssues);
    } catch (err) {
        console.error('Error fetching my issues:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// GET /api/issues/:id
const getIssueById = async (req, res) => {
    try {
        const { id } = req.params;
        const issue = await Issue.findById(id)
            .populate('userId', 'name')
            .populate('assignedVolunteer', 'name volunteerId')
            .populate('assignedBy', 'name role');

        if (!issue) {
            return res.status(404).json({ message: 'Issue not found' });
        }

        const mappedIssue = {
            ...issue._doc,
            userName: issue.userId?.name || 'Anonymous'
        };

        res.json(mappedIssue);
    } catch (err) {
        console.error('Error fetching issue by ID:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// DELETE /api/issues/:id
const deleteIssue = async (req, res) => {
    try {
        const { id } = req.params;
        const issue = await Issue.findById(id);

        if (!issue) {
            return res.status(404).json({ message: 'Issue not found' });
        }

        // Authorization: Only citizen (issue creator) can delete, or admin
        if (issue.userId.toString() !== req.userId && req.userRole !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized to delete this issue' });
        }

        // Cascade delete: Delete all notifications related to this issue
        await Notification.deleteMany({ issueId: id });
        console.log(`Deleted notifications for issue ${id}`);

        // Cascade delete: Delete all feedback threads related to this issue
        await Feedback.deleteMany({ issueId: id });
        console.log(`Deleted feedback threads for issue ${id}`);

        // Delete the issue itself
        const deletedIssue = await Issue.findByIdAndDelete(id);

        console.log(`Issue ${id} deleted by user ${req.userId}`);
        res.json({ message: 'Issue deleted successfully along with all associated notifications and feedback' });
    } catch (err) {
        console.error('Error deleting issue:', err);
        res.status(500).json({ message: 'Server error while deleting issue' });
    }
};

// POST /api/issues/:id/upvote
const upvoteIssue = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        let issue = await Issue.findById(id);

        if (!issue) return res.status(404).json({ message: 'Issue not found' });

        if (!issue.upvotes) issue.upvotes = [];
        if (!issue.downvotes) issue.downvotes = [];

        const upvoteIndex = issue.upvotes.indexOf(userId);
        const downvoteIndex = issue.downvotes.indexOf(userId);

        if (upvoteIndex > -1) {
            issue.upvotes.splice(upvoteIndex, 1);
        } else {
            issue.upvotes.push(userId);
            if (downvoteIndex > -1) issue.downvotes.splice(downvoteIndex, 1);
        }

        await issue.save();

        // Return with userName for frontend consistency
        const savedIssue = await Issue.findById(id).populate('userId', 'name');
        const mappedIssue = {
            ...savedIssue._doc,
            userName: savedIssue.userId?.name || 'Anonymous'
        };

        res.json({ upvotes: mappedIssue.upvotes.length, downvotes: mappedIssue.downvotes.length, issue: mappedIssue });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// POST /api/issues/:id/downvote
const downvoteIssue = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        let issue = await Issue.findById(id);

        if (!issue) return res.status(404).json({ message: 'Issue not found' });

        if (!issue.upvotes) issue.upvotes = [];
        if (!issue.downvotes) issue.downvotes = [];

        const upvoteIndex = issue.upvotes.indexOf(userId);
        const downvoteIndex = issue.downvotes.indexOf(userId);

        if (downvoteIndex > -1) {
            issue.downvotes.splice(downvoteIndex, 1);
        } else {
            issue.downvotes.push(userId);
            if (upvoteIndex > -1) issue.upvotes.splice(upvoteIndex, 1);
        }

        await issue.save();

        const savedIssue = await Issue.findById(id).populate('userId', 'name');
        const mappedIssue = {
            ...savedIssue._doc,
            userName: savedIssue.userId?.name || 'Anonymous'
        };

        res.json({ upvotes: mappedIssue.upvotes.length, downvotes: mappedIssue.downvotes.length, issue: mappedIssue });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// GET /api/issues/nearby?lat=...&lng=...&radius=...
const getNearbyIssues = async (req, res) => {
    try {
        if (req.userRole === 'citizen') {
            return res.status(403).json({ message: 'Access denied. Nearby issues are restricted to volunteers.' });
        }
        const { lat, lng, radius, status, priority } = req.query;
        if (!lat || !lng) {
            console.error('Nearby fetch failed: Missing coordinates', { lat, lng });
            return res.status(400).json({ message: 'Latitude and longitude are required' });
        }

        const centreLat = Number(lat);
        const centreLng = Number(lng);

        if (isNaN(centreLat) || isNaN(centreLng)) {
            console.error('Nearby fetch failed: Invalid coordinates', { lat, lng });
            return res.status(400).json({ message: 'Invalid latitude or longitude' });
        }
        const searchRadius = Number(radius) || 30; // Radius from frontend, default 30km

        const query = {};
        if (status && status !== 'All') {
            const cleanStatus = status.trim();
            query.status = { $regex: new RegExp(`^\\s*${cleanStatus}\\s*$`, 'i') };
        }

        if (priority && priority !== 'All') {
            const cleanPriority = priority.trim();
            query.urgency = { $regex: new RegExp(`^\\s*${cleanPriority}\\s*$`, 'i') };
        }

        const issues = await Issue.find(query)
            .populate('userId', 'name')
            .populate('assignedVolunteer', 'name volunteerId')
            .populate('assignedBy', 'name role')
            .sort({ createdAt: -1 });

        // Simple Haversine distance filtering (in km)
        const getDistance = (lat1, lon1, lat2, lon2) => {
            const R = 6371; // km
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        };

        const nearbyIssues = issues.filter(issue => {
            const distance = getDistance(centreLat, centreLng, issue.latitude, issue.longitude);
            return distance <= searchRadius;
        }).map(issue => ({
            ...issue._doc,
            userName: issue.userId?.name || 'Anonymous'
        }));

        res.json(nearbyIssues);
    } catch (err) {
        console.error('Error fetching nearby issues:', err);
        res.status(500).json({ message: `Server error: ${err.message}` });
    }
};

// POST /api/issues/:id/comment
const addComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { text, userName } = req.body;
        const userId = req.userId;

        if (!text || text.trim() === '') return res.status(400).json({ message: 'Comment text is required' });

        const issue = await Issue.findById(id);
        if (!issue) return res.status(404).json({ message: 'Issue not found' });

        if (!issue.comments) issue.comments = [];

        const newComment = {
            user_id: userId,
            userName: userName || 'User',
            complaint_id: id,
            content: text.trim(),
            timestamp: new Date()
        };

        issue.comments.push(newComment);
        await issue.save();

        res.json({ message: 'Comment added', comments: issue.comments, issue });
    } catch (err) {
        console.error('Error adding comment:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// POST /api/issues/:id/accept
const acceptIssue = async (req, res) => {
    try {
        if (req.userRole !== 'volunteer' && req.userRole !== 'admin') {
            return res.status(403).json({ message: 'Only volunteers can accept issues' });
        }

        const issue = await Issue.findById(req.params.id);
        if (!issue) return res.status(404).json({ message: 'Issue not found' });

        if (issue.assignedVolunteer) {
            return res.status(400).json({ message: 'this issue is already handling by another volunteer, kindly solve the other issues' });
        }

        issue.assignedVolunteer = req.userId;
        await issue.save();

        const updatedIssue = await Issue.findById(req.params.id)
            .populate('userId', 'name')
            .populate('assignedVolunteer', 'name volunteerId')
            .populate('assignedBy', 'name role');

        // --- Notifications: volunteer accepted the issue ---
        try {
            const volunteer = await User.findById(req.userId).select('name');
            const now = new Date();
            const dateTimeStr = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
            const notifs = [
                // Notify the citizen
                {
                    recipient: updatedIssue.userId._id,
                    type: 'ISSUE_ACCEPTED',
                    message: `Your issue "${updatedIssue.title}" has been accepted by volunteer ${volunteer?.name || 'Unknown'} on ${dateTimeStr}.`,
                    issueId: updatedIssue._id
                }
            ];
            // Notify all admins
            const admins = await User.find({ role: 'admin' }).select('_id');
            admins.forEach(a => notifs.push({
                recipient: a._id,
                type: 'ADMIN_STATUS_UPDATE',
                message: `Issue "${updatedIssue.title}" was accepted by volunteer ${volunteer?.name || 'Unknown'} on ${dateTimeStr}.`,
                issueId: updatedIssue._id
            }));
            await Notification.insertMany(notifs);
        } catch (notifErr) {
            console.error('Notification error on acceptIssue:', notifErr);
        }

        res.json({ message: 'Issue accepted', issue: updatedIssue });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// POST /api/issues/:id/reject
const rejectIssue = async (req, res) => {
    try {
        if (req.userRole !== 'volunteer' && req.userRole !== 'admin') {
            return res.status(403).json({ message: 'Only volunteers can reject issues' });
        }

        const issue = await Issue.findById(req.params.id);
        if (!issue) return res.status(404).json({ message: 'Issue not found' });

        if (issue.assignedVolunteer?.toString() !== req.userId && req.userRole !== 'admin') {
            return res.status(403).json({ message: 'You are not assigned to this issue' });
        }

        issue.assignedVolunteer = null;
        await issue.save();

        const updatedIssue = await Issue.findById(req.params.id)
            .populate('userId', 'name')
            .populate('assignedVolunteer', 'name volunteerId')
            .populate('assignedBy', 'name role');

        // --- Notification: Issue Rejected ---
        try {
            const volunteer = await User.findById(req.userId);
            const dateStr = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
            const timeStr = new Date().toLocaleTimeString('en-IN', { 
                timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' 
            });

            await Notification.create({
                recipient: updatedIssue.userId._id, // notify the citizen
                type: 'ISSUE_REJECTED',
                message: `Your issue "${updatedIssue.title}" was dropped by volunteer ${volunteer?.name || 'Unknown'} on ${dateStr} at ${timeStr}.`,
                issueId: updatedIssue._id
            });
        } catch (notifErr) {
            console.error('Notification error on rejectIssue:', notifErr);
        }

        res.json({ message: 'Issue rejected', issue: updatedIssue });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { createIssue, getAllIssues, getMyIssues, getIssueById, updateIssue, deleteIssue, upvoteIssue, downvoteIssue, addComment, getNearbyIssues, acceptIssue, rejectIssue };
