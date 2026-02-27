const Issue = require('../models/Issue');

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

        if (issue.userId.toString() !== req.userId) {
            return res.status(403).json({ message: 'Unauthorized to update this issue' });
        }

        // Parse existing images if they come as a JSON string or stay as array
        let preservedImages = [];
        if (existingImages) {
            preservedImages = Array.isArray(existingImages) ? existingImages : [existingImages];
        }

        const updateFields = {
            title: title || issue.title,
            description: description || issue.description,
            category: category || issue.category,
            fullAddress: fullAddress || issue.fullAddress,
            landmark: landmark || issue.landmark,
            latitude: latitude ? Number(latitude) : issue.latitude,
            longitude: longitude ? Number(longitude) : issue.longitude,
            images: preservedImages,
            urgency: urgency || issue.urgency,
            status: status || issue.status
        };

        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => {
                if (file.path.startsWith('http')) return file.path;
                const baseUrl = `${req.protocol}://${req.get('host')}`;
                return `${baseUrl}/${file.path.replace(/\\/g, '/')}`;
            });
            updateFields.images = [...preservedImages, ...newImages];
        }

        const updatedIssue = await Issue.findByIdAndUpdate(id, updateFields, { new: true }).populate('userId', 'name');

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
        const { status } = req.query;
        const query = {};

        if (status && status !== 'All') {
            const cleanStatus = status.trim();
            // Case-insensitive match that handles optional leading/trailing whitespace
            query.status = { $regex: new RegExp(`^\\s*${cleanStatus}\\s*$`, 'i') };
        }

        const issues = await Issue.find(query).populate('userId', 'name').sort({ createdAt: -1 });
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
        const { status } = req.query;
        const query = { userId: req.userId };

        if (status && status !== 'All') {
            const cleanStatus = status.trim();
            query.status = { $regex: new RegExp(`^\\s*${cleanStatus}\\s*$`, 'i') };
        }

        const issues = await Issue.find(query).populate('userId', 'name').sort({ createdAt: -1 });
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

// DELETE /api/issues/:id
const deleteIssue = async (req, res) => {
    try {
        const { id } = req.params;
        const issue = await Issue.findById(id);

        if (!issue) {
            return res.status(404).json({ message: 'Issue not found' });
        }

        if (issue.userId.toString() !== req.userId) {
            return res.status(403).json({ message: 'Unauthorized to delete this issue' });
        }

        await Issue.findByIdAndDelete(id);
        res.json({ message: 'Issue deleted successfully' });
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
        const { lat, lng, radius, status } = req.query;
        if (!lat || !lng) {
            return res.status(400).json({ message: 'Latitude and longitude are required' });
        }

        const centerLat = Number(lat);
        const centerLng = Number(lng);
        const searchRadius = Number(radius) || 30; // Radius from frontend, default 30km

        const query = {};
        if (status && status !== 'All') {
            const cleanStatus = status.trim();
            query.status = { $regex: new RegExp(`^\\s*${cleanStatus}\\s*$`, 'i') };
        }

        const issues = await Issue.find(query).populate('userId', 'name').sort({ createdAt: -1 });

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
            const distance = getDistance(centerLat, centerLng, issue.latitude, issue.longitude);
            return distance <= searchRadius;
        }).map(issue => ({
            ...issue._doc,
            userName: issue.userId?.name || 'Anonymous'
        }));

        res.json(nearbyIssues);
    } catch (err) {
        console.error('Error fetching nearby issues:', err);
        res.status(500).json({ message: 'Server error' });
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

module.exports = { createIssue, getAllIssues, getMyIssues, updateIssue, deleteIssue, upvoteIssue, downvoteIssue, addComment, getNearbyIssues };
