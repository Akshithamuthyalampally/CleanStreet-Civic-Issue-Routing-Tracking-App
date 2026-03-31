const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Vote = require('../models/Vote');
const Comment = require('../models/Comment');
const AdminLog = require('../models/AdminLog');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const { isVolunteer } = require('../middleware/auth');
const Feedback = require("../models/Feedback");
const PlatformFeedback = require("../models/PlatformFeedback");

const router = express.Router();

// ─── Helper: log activity (fire-and-forget, never throws) ─────
const logActivity = (data) => {
  AdminLog.create(data).catch(err => console.error('ActivityLog error:', err));
};

// ─── Helper: create notification (fire-and-forget, never throws) ────
const createNotification = (userId, complaintId, message, type, metadata) => {
  const doc = { user: userId, message, type };
  if (complaintId) doc.complaint = complaintId;
  if (metadata) doc.metadata = metadata;
  Notification.create(doc).catch(err => console.error('Notification error:', err));
};

// ─── Notifications: Get all for current user ──────────────────
router.get('/notifications', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .populate('complaint', 'title')
      .sort({ createdAt: -1 });
    return res.json({ success: true, notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── Notifications: Mark as read ─────────────────────────────
router.patch('/notifications/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    return res.json({ success: true, notification });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── Notifications: Mark all as read ─────────────────────────
router.patch('/notifications/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );
    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── Notifications: Delete a notification ────────────────────
router.delete('/notifications/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    return res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

const isValidEmail = (email = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPassword = (password = '') => typeof password === 'string' && password.length >= 6;
const allowedRoles = ['user', 'volunteer', 'admin'];

const createToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

// ─── Health check ─────────────────────────────────────────────
router.get('/', (req, res) => {
  res.json({ message: 'Clean Street API is running' });
});

// ─── Auth: Register ───────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, location, role, profilePhoto } = req.body || {};
    const errors = {};
    if (!name?.trim()) errors.name = 'Name is required';
    if (!email?.trim()) errors.email = 'Email is required';
    else if (!isValidEmail(email)) errors.email = 'Email is not valid';
    if (!password) errors.password = 'Password is required';
    else if (!isValidPassword(password)) errors.password = 'Password must be at least 6 characters';
    if (role && !allowedRoles.includes(role)) errors.role = 'Invalid role';

    if (Object.keys(errors).length > 0)
      return res.status(400).json({ success: false, message: 'Validation failed', errors });

    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing)
      return res.status(409).json({ success: false, message: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      location: location?.trim(),
      role: allowedRoles.includes(role) ? role : 'user',
      profilePhoto: profilePhoto?.trim(),
    });

    const token = createToken(user);
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, profilePhoto: user.profilePhoto || null },
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── Auth: Login ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const errors = {};
    if (!email?.trim()) errors.email = 'Email is required';
    else if (!isValidEmail(email)) errors.email = 'Email is not valid';
    if (!password) errors.password = 'Password is required';

    if (Object.keys(errors).length > 0)
      return res.status(400).json({ success: false, message: 'Validation failed', errors });

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = createToken(user);
    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, profilePhoto: user.profilePhoto || null },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── Auth: Get current user ───────────────────────────────────
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('name email role location profilePhoto');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, user });
  } catch (error) {
    console.error('Me endpoint error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── Auth: Update profile ─────────────────────────────────────
router.patch('/me', auth, async (req, res) => {
  try {
    const { name, email, location, profilePhoto } = req.body || {};
    const updates = {};
    if (name?.trim()) updates.name = name.trim();
    if (email?.trim()) {
      if (!isValidEmail(email)) return res.status(400).json({ success: false, message: 'Invalid email' });
      // Check email not taken by someone else
      const existing = await User.findOne({ email: email.trim().toLowerCase(), _id: { $ne: req.user.id } });
      if (existing) return res.status(409).json({ success: false, message: 'Email already in use' });
      updates.email = email.trim().toLowerCase();
    }
    if (location !== undefined) updates.location = location?.trim();
    if (profilePhoto?.trim()) updates.profilePhoto = profilePhoto.trim();

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('name email role location profilePhoto');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Return updated token so frontend stays in sync
    const token = createToken(user);
    return res.json({ success: true, message: 'Profile updated', user, token });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── Auth: Change password ────────────────────────────────────
router.patch('/me/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: 'Both passwords are required' });
    if (!isValidPassword(newPassword))
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── Admin: Get all users ─────────────────────────────
router.get('/users', auth, async (req, res) => {
  try {

    // Only admin can access
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const users = await User.find().select('name email role location createdAt');

    res.json({
      success: true,
      users
    });

  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ─── Admin: Update user role ──────────────────────────────────
router.patch('/users/:id/role', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Access denied' });

    const { role } = req.body || {};
    if (!allowedRoles.includes(role))
      return res.status(400).json({ success: false, message: 'Invalid role' });

    const prevUser = await User.findById(req.params.id).select('name role');
    if (!prevUser) return res.status(404).json({ success: false, message: 'User not found' });

    // ── Guard 0: protect admins ────────────────────────────────
    if (prevUser.role === 'admin') {
      return res.status(400).json({
        success: false,
        blocked: true,
        reason: 'is_admin',
        message: 'Admin role cannot be changed. Admins can only be managed directly.',
      });
    }


    // ── Guard 1: user → volunteer  ─────────────────────────────
    // Block if this user has filed complaints (they would then have dual identity as reporter + volunteer)
    if (prevUser.role === 'user' && role === 'volunteer') {
      const complaintCount = await Complaint.countDocuments({ user: req.params.id });
      if (complaintCount > 0) {
        return res.status(400).json({
          success: false,
          blocked: true,
          reason: 'has_complaints',
          count: complaintCount,
          message: `Cannot promote to Volunteer: this user has ${complaintCount} reported complaint${complaintCount > 1 ? 's' : ''}. Delete those complaints first.`,
        });
      }
    }

    // ── Guard 2: volunteer → user  ─────────────────────────────
    // Block if volunteer is still assigned to active (non-resolved) complaints
    if (prevUser.role === 'volunteer' && role === 'user') {
      const assignedCount = await Complaint.countDocuments({
        assignedTo: req.params.id,
        status: { $in: ['in_review'] },
      });
      if (assignedCount > 0) {
        return res.status(400).json({
          success: false,
          blocked: true,
          reason: 'is_assigned',
          count: assignedCount,
          message: `Cannot demote to User: this volunteer is assigned to ${assignedCount} active complaint${assignedCount > 1 ? 's' : ''}. Reassign or resolve those complaints first.`,
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('name email role location createdAt');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    logActivity({
      activityType: 'role_changed',
      actorId: req.user.id,
      actorName: req.user.name,
      targetId: user._id,
      targetName: user.name,
      details: `${prevUser?.role || '?'} → ${role}`,
    });

    return res.json({ success: true, user });
  } catch (error) {
    console.error('Update role error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});


// ─── Admin: Delete user ───────────────────────────────────────
router.delete('/users/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Access denied' });

    if (req.params.id === req.user.id)
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    logActivity({
      activityType: 'user_deleted',
      actorId: req.user.id,
      actorName: req.user.name,
      targetId: user._id,
      targetName: user.name,
      details: `Email: ${user.email}`,
    });

    return res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── Admin: Assign / Unassign volunteer to complaint ──────────
router.patch('/complaints/:id/assign', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Access denied' });

    const { volunteerId } = req.body || {};

    // ── UNASSIGN: empty volunteerId clears the assignment ──────
    if (!volunteerId) {
      const complaint = await Complaint.findByIdAndUpdate(
        req.params.id,
        { assignedTo: null, status: 'received' },
        { new: true }
      )
        .populate('user', 'name email')
        .populate('assignedTo', 'name email profilePhoto');

      if (!complaint)
        return res.status(404).json({ success: false, message: 'Complaint not found' });

      logActivity({
        activityType: 'volunteer_assigned',
        actorId: req.user.id,
        actorName: req.user.name,
        targetId: complaint._id,
        targetName: complaint.title,
        details: 'Volunteer unassigned → back to Pending',
      });

      createNotification(complaint.user._id, complaint._id, `Your complaint "${complaint.title}" is back to Pending. Admin has unassigned the volunteer.`, 'status_update');

      return res.json({ success: true, complaint });
    }

    // ── ASSIGN: set a specific volunteer ───────────────────────
    const volunteer = await User.findById(volunteerId);
    if (!volunteer)
      return res.status(404).json({ success: false, message: 'Volunteer not found' });

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { assignedTo: volunteerId, status: 'in_review' },
      { new: true }
    )
      .populate('user', 'name email')
      .populate('assignedTo', 'name email profilePhoto');

    if (!complaint)
      return res.status(404).json({ success: false, message: 'Complaint not found' });

    logActivity({
      activityType: 'volunteer_assigned',
      actorId: req.user.id,
      actorName: req.user.name,
      targetId: complaint._id,
      targetName: complaint.title,
      details: `Assigned to ${volunteer.name}`,
    });

    createNotification(complaint.user._id, complaint._id, `Your complaint "${complaint.title}" has been assigned to a volunteer.`, 'assignment');
    createNotification(volunteerId, complaint._id, `Admin has assigned you to a new complaint: "${complaint.title}".`, 'assignment');

    return res.json({ success: true, complaint });
  } catch (error) {
    console.error('Assign volunteer error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── Complaints: Get all ─────────────────────────────────────
router.get('/complaints', auth, async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate('user', 'name email')
      .populate('assignedTo', 'name email profilePhoto')
      .sort({ createdAt: -1 });

    // Attach vote counts + current user's vote for each complaint
    const complaintIds = complaints.map(c => c._id);
    const votes = await Vote.find({ complaint: { $in: complaintIds } });

    const countMap = {};
    const userVoteMap = {};
    votes.forEach(v => {
      const cid = v.complaint.toString();
      if (!countMap[cid]) countMap[cid] = { upvotes: 0, downvotes: 0 };
      if (v.voteType === 'upvote') countMap[cid].upvotes++;
      else countMap[cid].downvotes++;
      if (v.user.toString() === req.user.id) userVoteMap[cid] = v.voteType;
    });

    const enriched = complaints.map(c => ({
      ...c.toObject(),
      likes: countMap[c._id.toString()]?.upvotes || 0,
      dislikes: countMap[c._id.toString()]?.downvotes || 0,
      userVote: userVoteMap[c._id.toString()] || null,
    }));

    return res.json({ success: true, complaints: enriched });
  } catch (error) {
    console.error('Get complaints error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── Complaints: Get mine ─────────────────────────────────────
router.get('/complaints/mine', auth, async (req, res) => {
  try {
    const complaints = await Complaint.find({ user: req.user.id })
      .populate('user', 'name email')
      .populate('assignedTo', 'name email profilePhoto')
      .sort({ createdAt: -1 });

    const complaintIds = complaints.map(c => c._id);
    const votes = await Vote.find({ complaint: { $in: complaintIds } });

    const countMap = {};
    votes.forEach(v => {
      const cid = v.complaint.toString();
      if (!countMap[cid]) countMap[cid] = { upvotes: 0, downvotes: 0 };
      if (v.voteType === 'upvote') countMap[cid].upvotes++;
      else countMap[cid].downvotes++;
    });

    const enriched = complaints.map(c => ({
      ...c.toObject(),
      likes: countMap[c._id.toString()]?.upvotes || 0,
      dislikes: countMap[c._id.toString()]?.downvotes || 0,
      // For own complaints, include user's own vote
      userVote: votes.find(v => v.complaint.toString() === c._id.toString() && v.user.toString() === req.user.id)?.voteType || null,
    }));

    return res.json({ success: true, complaints: enriched });
  } catch (error) {
    console.error('Get my complaints error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── Complaints: Create ───────────────────────────────────────
router.post('/complaints', auth, async (req, res) => {
  try {
    const { title, description, address, locationCoords, photo, type, priority } = req.body || {};
    if (!title?.trim()) return res.status(400).json({ success: false, message: 'Title is required' });
    if (!description?.trim()) return res.status(400).json({ success: false, message: 'Description is required' });

    const complaint = await Complaint.create({
      user: req.user.id,
      title: title.trim(),
      description: description.trim(),
      address: address?.trim(),
      photo: photo?.trim(),
      locationCoords: locationCoords || undefined,
      status: 'received',
      priority: priority,
      type: type,
    });

    logActivity({
      activityType: 'complaint_created',
      actorId: req.user.id,
      actorName: req.user.name,
      targetId: complaint._id,
      targetName: complaint.title,
      details: `Type: ${type || 'N/A'} · Priority: ${priority || 'Medium'}`,
    });

    return res.status(201).json({ success: true, message: 'Complaint created', complaint });
  } catch (error) {
    console.error('Create complaint error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── Complaints: Get by ID ────────────────────────────────────
router.get('/complaints/:id', auth, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate('user', 'name email');
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    return res.json({ success: true, complaint });
  } catch (error) {
    console.error('Get complaint error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── Complaints: Update status ────────────────────────────────
router.patch('/complaints/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body || {};
    const allowed = ['received', 'in_review', 'resolved'];
    if (!allowed.includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status' });

    const prev = await Complaint.findById(req.params.id).select('title status');
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    const statusLabels = { received: 'Pending', in_review: 'In Review', resolved: 'Resolved' };
    logActivity({
      activityType: 'status_changed',
      actorId: req.user.id,
      actorName: req.user.name,
      targetId: complaint._id,
      targetName: complaint.title,
      details: `${statusLabels[prev?.status] || prev?.status} → ${statusLabels[status] || status}`,
    });

    if (complaint.user) {
      createNotification(complaint.user, complaint._id, `Status of your complaint "${complaint.title}" updated to ${statusLabels[status] || status}.`, 'status_update');
    }

    return res.json({ success: true, complaint });
  } catch (error) {
    console.error('Update status error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── Admin: Get activity logs ─────────────────────────────────
router.get('/admin/activity-logs', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Access denied' });

    const { limit } = req.query;
    let query = AdminLog.find().sort({ timestamp: -1 });
    if (limit && limit !== 'all') {
      const n = parseInt(limit, 10);
      if (!isNaN(n) && n > 0) query = query.limit(n);
    }
    const logs = await query.exec();
    return res.json({ success: true, logs });
  } catch (error) {
    console.error('Activity logs error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;

// ─── Complaints: Delete ───────────────────────────────────────
router.delete('/complaints/:id', auth, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint)
      return res.status(404).json({ success: false, message: 'Complaint not found' });

    // only owner or admin can delete
    if (
      complaint.user.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const title = complaint.title;
    const targetId = complaint._id;
    await complaint.deleteOne();

    logActivity({
      activityType: 'complaint_deleted',
      actorId: req.user.id,
      actorName: req.user.name,
      targetId,
      targetName: title,
      details: `Deleted by ${req.user.role}`,
    });

    return res.json({ success: true, message: 'Complaint deleted' });
  } catch (error) {
    console.error('Delete complaint error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── Complaints: Update (Edit) ────────────────────────────────
router.put('/complaints/:id', auth, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint)
      return res.status(404).json({ success: false, message: 'Complaint not found' });

    if (
      complaint.user.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { title, description, address, photo } = req.body;

    if (title) complaint.title = title.trim();
    if (description) complaint.description = description.trim();
    if (address) complaint.address = address.trim();
    if (photo) complaint.photo = photo.trim();

    await complaint.save();

    logActivity({
      activityType: 'complaint_edited',
      actorId: req.user.id,
      actorName: req.user.name,
      targetId: complaint._id,
      targetName: complaint.title,
      details: `Edited by ${req.user.role}`,
    });

    return res.json({ success: true, complaint });
  } catch (error) {
    console.error('Edit complaint error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── Complaints: Vote (upvote / downvote with toggle) ─────────
router.post('/complaints/:id/vote', auth, async (req, res) => {
  try {
    const { voteType } = req.body || {};
    if (!['upvote', 'downvote'].includes(voteType))
      return res.status(400).json({ success: false, message: 'Invalid voteType' });

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    const existing = await Vote.findOne({ user: req.user.id, complaint: req.params.id });

    if (existing) {
      if (existing.voteType === voteType) {
        // Toggle off (remove vote)
        await existing.deleteOne();
      } else {
        // Switch vote type
        existing.voteType = voteType;
        await existing.save();
      }
    } else {
      await Vote.create({ user: req.user.id, complaint: req.params.id, voteType });
    }

    // Return updated counts
    const upvotes = await Vote.countDocuments({ complaint: req.params.id, voteType: 'upvote' });
    const downvotes = await Vote.countDocuments({ complaint: req.params.id, voteType: 'downvote' });
    const myVote = await Vote.findOne({ user: req.user.id, complaint: req.params.id });

    return res.json({ success: true, likes: upvotes, dislikes: downvotes, userVote: myVote?.voteType || null });
  } catch (error) {
    console.error('Vote error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── Comments: Get all for a complaint ─────────────────────
router.get('/complaints/:id/comments', auth, async (req, res) => {
  try {
    const comments = await Comment.find({ complaint: req.params.id })
      .populate('user', 'name profilePhoto')
      .sort({ createdAt: 1 });
    return res.json({ success: true, comments });
  } catch (error) {
    console.error('Get comments error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── Comments: Add a comment ────────────────────────────────
router.post('/complaints/:id/comments', auth, async (req, res) => {
  try {
    const { content } = req.body || {};
    if (!content?.trim()) return res.status(400).json({ success: false, message: 'Comment cannot be empty' });

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    const comment = await Comment.create({
      user: req.user.id,
      complaint: req.params.id,
      content: content.trim(),
    });

    await comment.populate('user', 'name profilePhoto');
    return res.status(201).json({ success: true, comment });
  } catch (error) {
    console.error('Add comment error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── Comments: Delete a comment ────────────────────────────
router.delete('/comments/:commentId', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    // Only the comment author or an admin can delete
    if (comment.user.toString() !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Not authorized' });

    await comment.deleteOne();
    return res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    console.error('Delete comment error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ════════════════════════════════════════════════════════════════
// ─── VOLUNTEER ROUTES ────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════

// ─── Volunteer: Get all complaints ────────────────────────────
// Optionally filter by ?status=received|in_review|resolved
router.get('/volunteer/complaints', auth, isVolunteer, async (req, res) => {
  try {
    console.log(`[Volunteer:GET /volunteer/complaints] volunteer=${req.user.email} status-filter="${req.query.status || 'none'}"`);

    const filter = {};
    const { status } = req.query;
    const allowedStatuses = ['received', 'in_review', 'resolved'];
    if (status && allowedStatuses.includes(status)) filter.status = status;

    const complaints = await Complaint.find(filter)
      .populate('user', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    // Attach vote counts
    const complaintIds = complaints.map(c => c._id);
    const votes = await Vote.find({ complaint: { $in: complaintIds } });

    const countMap = {};
    votes.forEach(v => {
      const cid = v.complaint.toString();
      if (!countMap[cid]) countMap[cid] = { upvotes: 0, downvotes: 0 };
      if (v.voteType === 'upvote') countMap[cid].upvotes++;
      else countMap[cid].downvotes++;
    });

    const enriched = complaints.map(c => ({
      ...c.toObject(),
      likes: countMap[c._id.toString()]?.upvotes || 0,
      dislikes: countMap[c._id.toString()]?.downvotes || 0,
    }));

    console.log(`[Volunteer:GET /volunteer/complaints] returning ${enriched.length} complaints`);
    return res.json({ success: true, complaints: enriched });
  } catch (error) {
    console.error('[Volunteer:GET /volunteer/complaints] error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── Volunteer: Get nearby complaints ──────────────────────────
// Query: ?lat=<lat>&lng=<lng>&radius=<km, default 10>
router.get('/volunteer/complaints/nearby', auth, isVolunteer, async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;
    console.log(`[Volunteer:GET /volunteer/complaints/nearby] volunteer=${req.user.email} lat=${lat} lng=${lng} radius=${radius}km`);

    if (!lat || !lng) {
      console.warn('[Volunteer:GET /volunteer/complaints/nearby] Missing lat or lng');
      return res.status(400).json({ success: false, message: 'lat and lng query params are required' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusInMeters = parseFloat(radius) * 1000;

    if (isNaN(latitude) || isNaN(longitude) || isNaN(radiusInMeters)) {
      console.warn('[Volunteer:GET /volunteer/complaints/nearby] Invalid coords');
      return res.status(400).json({ success: false, message: 'Invalid lat, lng or radius values' });
    }

    const complaints = await Complaint.find({
      locationCoords: {
        $near: {
          $geometry: { type: 'Point', coordinates: [longitude, latitude] },
          $maxDistance: radiusInMeters,
        },
      },
    })
      .populate('user', 'name email')
      .populate('assignedTo', 'name email profilePhoto');

    console.log(`[Volunteer:GET /volunteer/complaints/nearby] found ${complaints.length} complaints within ${radius}km`);
    return res.json({ success: true, complaints });
  } catch (error) {
    console.error('[Volunteer:GET /volunteer/complaints/nearby] error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── Volunteer: Accept a complaint ────────────────────────────
// Status: received → in_review, assignedTo = this volunteer
router.post('/complaints/:id/accept', auth, isVolunteer, async (req, res) => {
  try {
    console.log(`[Volunteer:POST /complaints/${req.params.id}/accept] volunteer=${req.user.email}`);

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      console.warn(`[Volunteer:Accept] Complaint ${req.params.id} not found`);
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    if (complaint.status !== 'received') {
      console.warn(`[Volunteer:Accept] Cannot accept — current status is "${complaint.status}"`);
      return res.status(400).json({
        success: false,
        message: `Complaint is not available to accept (current status: ${complaint.status})`,
      });
    }

    complaint.status = 'in_review';
    complaint.assignedTo = req.user.id;
    await complaint.save();
    await complaint.populate('assignedTo', 'name email profilePhoto');
    await complaint.populate('user', 'name email');

    logActivity({
      activityType: 'volunteer_accepted',
      actorId: req.user.id,
      actorName: req.user.name,
      targetId: complaint._id,
      targetName: complaint.title,
      details: `Accepted by volunteer ${req.user.name}`,
    });

    createNotification(complaint.user._id, complaint._id, `Volunteer ${req.user.name} has accepted your complaint "${complaint.title}".`, 'assignment');

    console.log(`[Volunteer:Accept] ✅ Complaint "${complaint.title}" accepted by ${req.user.email} → status: in_review`);
    return res.json({ success: true, message: 'Complaint accepted and is now In Review', complaint });
  } catch (error) {
    console.error('[Volunteer:Accept] error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── Volunteer: Reject / Unassign a complaint ────────────────
// Status: in_review → received, clears assignedTo
// Only the volunteer who accepted it can reject
router.post('/complaints/:id/reject', auth, isVolunteer, async (req, res) => {
  try {
    console.log(`[Volunteer:POST /complaints/${req.params.id}/reject] volunteer=${req.user.email}`);

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      console.warn(`[Volunteer:Reject] Complaint ${req.params.id} not found`);
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    if (complaint.status !== 'in_review') {
      console.warn(`[Volunteer:Reject] Cannot reject — current status is "${complaint.status}"`);
      return res.status(400).json({
        success: false,
        message: `Only in_review complaints can be rejected (current status: ${complaint.status})`,
      });
    }

    if (complaint.assignedTo?.toString() !== req.user.id) {
      console.warn(`[Volunteer:Reject] DENIED — volunteer ${req.user.email} did not accept this complaint`);
      return res.status(403).json({ success: false, message: 'You can only reject complaints you accepted' });
    }

    complaint.status = 'received';
    complaint.assignedTo = null;
    await complaint.save();
    await complaint.populate('user', 'name email');

    logActivity({
      activityType: 'volunteer_rejected',
      actorId: req.user.id,
      actorName: req.user.name,
      targetId: complaint._id,
      targetName: complaint.title,
      details: `Rejected by volunteer ${req.user.name} → back to Pending`,
    });

    createNotification(complaint.user._id, complaint._id, `Your complaint "${complaint.title}" is back to Pending as the volunteer unassigned themselves.`, 'status_update');

    console.log(`[Volunteer:Reject] ✅ Complaint "${complaint.title}" rejected by ${req.user.email} → status: received`);
    return res.json({ success: true, message: 'Complaint rejected and returned to received', complaint });
  } catch (error) {
    console.error('[Volunteer:Reject] error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── Volunteer: Resolve a complaint ──────────────────────────
// Status: in_review → resolved
// Only the volunteer who accepted it can resolve
router.patch('/complaints/:id/resolve', auth, isVolunteer, async (req, res) => {
  try {
    console.log(`[Volunteer:PATCH /complaints/${req.params.id}/resolve] volunteer=${req.user.email}`);

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      console.warn(`[Volunteer:Resolve] Complaint ${req.params.id} not found`);
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    if (complaint.status !== 'in_review') {
      console.warn(`[Volunteer:Resolve] Cannot resolve — current status is "${complaint.status}"`);
      return res.status(400).json({
        success: false,
        message: `Only in_review complaints can be resolved (current status: ${complaint.status})`,
      });
    }

    if (complaint.assignedTo?.toString() !== req.user.id) {
      console.warn(`[Volunteer:Resolve] DENIED — volunteer ${req.user.email} did not accept this complaint`);
      return res.status(403).json({ success: false, message: 'You can only resolve complaints you accepted' });
    }

    complaint.status = 'resolved';
    await complaint.save();
    await complaint.populate('assignedTo', 'name email profilePhoto');
    await complaint.populate('user', 'name email');

    logActivity({
      activityType: 'complaint_resolved',
      actorId: req.user.id,
      actorName: req.user.name,
      targetId: complaint._id,
      targetName: complaint.title,
      details: `Resolved by volunteer ${req.user.name}`,
    });

    createNotification(complaint.user._id, complaint._id, `Your complaint "${complaint.title}" has been marked as resolved by volunteer ${req.user.name}.`, 'status_update');

    console.log(`[Volunteer:Resolve] ✅ Complaint "${complaint.title}" resolved by ${req.user.email}`);
    return res.json({ success: true, message: 'Complaint marked as Resolved', complaint });
  } catch (error) {
    console.error('[Volunteer:Resolve] error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ─── Volunteer: My stats ──────────────────────────────────────
// Returns how many complaints this volunteer has accepted, resolved, and total
router.get('/volunteer/stats', auth, isVolunteer, async (req, res) => {
  try {
    console.log(`[Volunteer:GET /volunteer/stats] volunteer=${req.user.email}`);

    const [accepted, resolved] = await Promise.all([
      Complaint.countDocuments({ assignedTo: req.user.id, status: 'in_review' }),
      Complaint.countDocuments({ assignedTo: req.user.id, status: 'resolved' }),
    ]);

    const stats = { accepted, resolved, total: accepted + resolved };
    console.log(`[Volunteer:Stats] ${req.user.email} → accepted=${accepted} resolved=${resolved} total=${stats.total}`);
    return res.json({ success: true, stats });
  } catch (error) {
    console.error('[Volunteer:Stats] error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ════════════════════════════════════════════════════════════════
// ─── FEEDBACK ROUTES ──────────────────────────────────────────
// ════════════════════════════════════════════════════════════════

// ─── Service Feedback: Submit (User rates volunteer for a complaint) ──
router.post("/feedback", auth, async (req, res) => {
  try {
    const {
      complaintId,
      rating,
      serviceQuality,
      responseTime,
      professionalism,
      comment,
    } = req.body;

    if (!complaintId || !rating) {
      return res.status(400).json({ success: false, message: "Complaint and rating are required" });
    }

    const complaint = await Complaint.findById(complaintId).populate('user', 'name').populate('assignedTo', 'name');
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    // Check for duplicate feedback
    const existing = await Feedback.findOne({ complaintId, userId: req.user.id });
    if (existing) {
      return res.status(400).json({ success: false, message: "You have already submitted feedback for this complaint" });
    }

    const feedback = await Feedback.create({
      complaintId,
      userId: req.user.id,
      volunteerId: complaint.assignedTo?._id || null,
      rating,
      serviceQuality,
      responseTime,
      professionalism,
      comment,
    });

    // Notify the volunteer about the rating
    if (complaint.assignedTo) {
      const starText = '★'.repeat(rating) + '☆'.repeat(5 - rating);
      createNotification(
        complaint.assignedTo._id,
        complaint._id,
        `${complaint.user?.name || 'A user'} rated your work on "${complaint.title}" — ${starText} (${rating}/5)${comment ? ': "' + comment.slice(0, 80) + '"' : ''}`,
        'feedback_rating',
        { rating, complaintTitle: complaint.title }
      );
    }

    res.json({ success: true, feedback });
  } catch (err) {
    console.error('Service feedback error:', err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── Service Feedback: Get all (Admin) ──────────────────────────
router.get("/feedback", auth, async (req, res) => {
  try {
    const feedbacks = await Feedback.find()
      .populate("complaintId", "title")
      .populate("userId", "name")
      .populate("volunteerId", "name profilePhoto")
      .sort({ createdAt: -1 });

    res.json({ success: true, feedbacks });
  } catch (err) {
    console.error('Get feedback error:', err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── Platform Feedback: Submit (User or Volunteer) ────────────────
router.post("/feedback/platform", auth, async (req, res) => {
  try {
    const { rating, queries, suggestions, issues } = req.body;

    if (!rating) {
      return res.status(400).json({ success: false, message: "Rating is required" });
    }

    const userRole = req.user.role;
    if (userRole !== 'user' && userRole !== 'volunteer') {
      return res.status(403).json({ success: false, message: "Only users and volunteers can submit platform feedback" });
    }

    const feedback = await PlatformFeedback.create({
      userId: req.user.id,
      userRole,
      rating,
      queries: queries || '',
      suggestions: suggestions || '',
      issues: issues || '',
    });

    // Notify all admins about the platform feedback
    const admins = await User.find({ role: 'admin' }).select('_id');
    const starText = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    admins.forEach(admin => {
      createNotification(
        admin._id,
        null,
        `${req.user.name} (${userRole}) submitted platform feedback — ${starText} (${rating}/5)`,
        'platform_feedback',
        { rating, userRole, userName: req.user.name }
      );
    });

    res.json({ success: true, feedback });
  } catch (err) {
    console.error('Platform feedback error:', err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── Volunteer: Get my received ratings ───────────────────────────
router.get("/feedback/volunteer/my-ratings", auth, async (req, res) => {
  try {
    if (req.user.role !== 'volunteer') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const ratings = await Feedback.find({ volunteerId: req.user.id })
      .populate('complaintId', 'title')
      .populate('userId', 'name profilePhoto')
      .sort({ createdAt: -1 });

    // Calculate stats
    const totalReviews = ratings.length;
    const avgRating = totalReviews > 0
      ? (ratings.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
      : 0;

    // Star distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach(r => { if (r.rating >= 1 && r.rating <= 5) distribution[r.rating]++; });

    res.json({ success: true, ratings, stats: { totalReviews, avgRating: parseFloat(avgRating), distribution } });
  } catch (err) {
    console.error('Get volunteer ratings error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Admin: Get all platform feedback ─────────────────────────────
router.get("/admin/feedback/platform", auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const feedbacks = await PlatformFeedback.find()
      .populate('userId', 'name email profilePhoto')
      .sort({ createdAt: -1 });

    // Calculate overall stats
    const totalFeedbacks = feedbacks.length;
    const avgRating = totalFeedbacks > 0
      ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / totalFeedbacks).toFixed(1)
      : 0;

    res.json({ success: true, feedbacks, stats: { totalFeedbacks, avgRating: parseFloat(avgRating) } });
  } catch (err) {
    console.error('Admin get platform feedback error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Admin: Get volunteer ratings overview ────────────────────────
router.get("/admin/feedback/volunteer-ratings", auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Get all volunteers
    const volunteers = await User.find({ role: 'volunteer' }).select('name email profilePhoto');

    // Get all service feedback
    const allFeedback = await Feedback.find()
      .populate('complaintId', 'title')
      .populate('userId', 'name')
      .sort({ createdAt: -1 });

    // Group by volunteer
    const volunteerRatings = volunteers.map(vol => {
      const feedbacks = allFeedback.filter(f => f.volunteerId?.toString() === vol._id.toString());
      const totalReviews = feedbacks.length;
      const avgRating = totalReviews > 0
        ? parseFloat((feedbacks.reduce((sum, f) => sum + f.rating, 0) / totalReviews).toFixed(1))
        : null;

      return {
        volunteer: vol,
        totalReviews,
        avgRating,
        isLowRated: avgRating !== null && avgRating <= 2,
        feedbacks,
      };
    });

    // Sort: low-rated first, then by total reviews desc
    volunteerRatings.sort((a, b) => {
      if (a.isLowRated && !b.isLowRated) return -1;
      if (!a.isLowRated && b.isLowRated) return 1;
      return b.totalReviews - a.totalReviews;
    });

    res.json({ success: true, volunteerRatings });
  } catch (err) {
    console.error('Admin volunteer ratings error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Admin: Rate a volunteer ──────────────────────────────────────
router.post("/admin/feedback/rate-volunteer", auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { volunteerId, rating, comment } = req.body;
    if (!volunteerId || !rating) {
      return res.status(400).json({ success: false, message: 'Volunteer and rating are required' });
    }

    const volunteer = await User.findById(volunteerId);
    if (!volunteer || volunteer.role !== 'volunteer') {
      return res.status(404).json({ success: false, message: 'Volunteer not found' });
    }

    // Create a feedback entry (admin-originated, no complaint ref)
    const feedback = await Feedback.create({
      complaintId: null,
      userId: req.user.id,
      volunteerId,
      rating,
      comment: comment || '',
      serviceQuality: 'Admin Review',
    });

    // Notify the volunteer
    const starText = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    createNotification(
      volunteerId,
      null,
      `Admin ${req.user.name} rated your overall performance — ${starText} (${rating}/5)${comment ? ': "' + comment.slice(0, 80) + '"' : ''}`,
      'feedback_rating',
      { rating, fromAdmin: true }
    );

    res.json({ success: true, feedback });
  } catch (err) {
    console.error('Admin rate volunteer error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});