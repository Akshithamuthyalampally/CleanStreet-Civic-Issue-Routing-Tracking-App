const mongoose = require('mongoose');
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Issue = require('../models/Issue');

const populateConfig = [
    { path: 'sender', select: 'name email role volunteerId' },
    { path: 'recipients', select: 'name email role volunteerId' },
    { path: 'issueId', select: 'title status assignedVolunteer userId' },
    { path: 'messages.sender', select: 'name email role volunteerId' },
];

const filterVanishedMessages = (thread, userId) => {
    if (!thread) return null;
    const threadObj = thread.toObject ? thread.toObject() : thread;
    threadObj.messages = (threadObj.messages || []).filter(m => 
        !m.isDeleted && 
        !m.deletedFor?.some(id => (id._id || id).toString() === userId.toString())
    );
    return threadObj;
};

// GET /api/feedback/recipients?role=citizen|volunteer|admin&query=... — search recipients by role + name (for UI autocomplete)
const searchRecipients = async (req, res) => {
    try {
        const query = (req.query.query || '').toString().trim();
        const targetRole = (req.query.role || '').toString().toLowerCase();
        const senderRole = req.userRole;
        const senderId = req.userId;

        let allowedUserIds = null; // null means no ID restriction (for Admins)

        // --- Role-Based Restriction Logic ---
        if (senderRole === 'citizen') {
            // Citizens can message:
            // 1. Admins (always)
            // 2. The Volunteer assigned to their issue
            if (targetRole === 'volunteer') {
                const myIssues = await Issue.find({ userId: senderId }).select('assignedVolunteer');
                allowedUserIds = myIssues.map(i => i.assignedVolunteer).filter(v => v);
            } else if (targetRole === 'citizen') {
                // Citizens cannot message other citizens
                return res.json([]);
            }
        } else if (senderRole === 'volunteer') {
            // Volunteers can message:
            // 1. Admins (always)
            // 2. The Citizens whose issues they accepted
            if (targetRole === 'citizen') {
                const myAssignedIssues = await Issue.find({ assignedVolunteer: senderId }).select('userId');
                allowedUserIds = myAssignedIssues.map(i => i.userId).filter(c => c);
            } else if (targetRole === 'volunteer') {
                // Volunteers cannot message other volunteers
                return res.json([]);
            }
        }

        // --- Build DB Filter ---
        const filter = {};
        
        // Filter by target role if specified
        if (targetRole) {
            filter.role = targetRole;
        }

        // Apply ID restrictions from assignment logic
        if (allowedUserIds !== null) {
            filter._id = { $in: allowedUserIds };
        }

        // Admin override: If target is admin, they are always allowed regardless of assignments
        if (targetRole === 'admin') {
            delete filter._id; // Admins don't need to be in allowedUserIds
            filter.role = 'admin';
        }

        // Apply search query (name/ID)
        if (query) {
            filter.$or = [
                { name: { $regex: query, $options: 'i' } },
                { volunteerId: { $regex: query, $options: 'i' } },
                { citizenId: { $regex: query, $options: 'i' } }
            ];
        }

        const users = await User.find(filter)
            .select('_id name volunteerId role citizenId email')
            .limit(50);

        res.json(users);
    } catch (err) {
        console.error('searchRecipients ERROR:', err);
        res.status(500).json({ message: 'Error searching recipients' });
    }
};

// POST /api/feedback  — create a feedback thread
// body: { recipientType: 'admin'|'volunteer'|'citizen', message: string, issueId?: string, recipientId?: string }
const createFeedback = async (req, res) => {
    try {
        const { recipientType, message, issueId, recipientId } = req.body;
        if (!recipientType || !message?.trim()) {
            return res.status(400).json({ message: 'recipientType and message are required' });
        }

        let recipients = [];
        let resolvedIssueId = issueId || null;

        // --- Role-Based Messaging Enforcement ---
        const senderId = req.userId;
        const senderRole = req.userRole;

        if (recipientType === 'admin') {
            if (recipientId) {
                const admin = await User.findOne({ _id: recipientId, role: 'admin' }).select('_id');
                if (!admin) return res.status(404).json({ message: 'Selected Admin not found' });
                recipients = [admin._id];
            } else {
                const admins = await User.find({ role: 'admin' }).select('_id');
                recipients = admins.map(a => a._id);
                if (recipients.length === 0) return res.status(404).json({ message: 'No admin users found' });
            }
        } else if (recipientType === 'volunteer' || recipientType === 'citizen') {
            let targetUserId = recipientId || null;

            // If no recipientId but issueId is provided for volunteer type, auto-resolve to assigned volunteer
            if (!targetUserId && recipientType === 'volunteer' && issueId) {
                const issue = await Issue.findById(issueId).select('assignedVolunteer');
                targetUserId = issue?.assignedVolunteer || null;
            }

            if (!targetUserId) {
                return res.status(400).json({ message: 'Please select a recipient user.' });
            }

            // --- Enforcement Check ---
            if (senderRole === 'citizen') {
                if (recipientType === 'citizen') {
                    return res.status(403).json({ message: 'Citizens cannot message other citizens.' });
                }
                if (recipientType === 'volunteer') {
                    const isAssigned = await Issue.exists({ userId: senderId, assignedVolunteer: targetUserId });
                    if (!isAssigned) {
                        return res.status(403).json({ message: 'You can only message the volunteer assigned to your issue.' });
                    }
                }
            } else if (senderRole === 'volunteer') {
                if (recipientType === 'volunteer') {
                    return res.status(403).json({ message: 'Volunteers cannot message other volunteers.' });
                }
                if (recipientType === 'citizen') {
                    const isAssigned = await Issue.exists({ assignedVolunteer: senderId, userId: targetUserId });
                    if (!isAssigned) {
                        return res.status(403).json({ message: 'You can only message citizens whose issues you have accepted.' });
                    }
                }
            }

            const user = await User.findById(targetUserId).select('_id role');
            if (!user || user.role !== recipientType) {
                return res.status(404).json({ message: 'Recipient not found for selected role' });
            }
            recipients = [user._id];
        } else {
            return res.status(400).json({ message: 'Invalid recipientType. Use admin, volunteer, or citizen.' });
        }

        const thread = await Feedback.create({
            sender: req.userId,
            recipients,
            issueId: resolvedIssueId,
            messages: [{ sender: req.userId, message: message.trim() }],
            unreadFor: recipients,
        });

        // --- Notifications ---
        try {
            const sender = await User.findById(req.userId).select('name');
            const notifs = recipients.map(rId => ({
                recipient: rId,
                type: 'FEEDBACK_RECEIVED',
                message: `New feedback from ${sender?.name || 'User'}: "${message.substring(0, 40)}${message.length > 40 ? '...' : ''}"`,
                issueId: resolvedIssueId
            }));
            await Notification.insertMany(notifs);
        } catch (notifErr) {
            console.error('Error creating feedback notifications:', notifErr);
        }

        const populated = await Feedback.findById(thread._id).populate(populateConfig);
        res.status(201).json(filterVanishedMessages(populated, req.userId));
    } catch (err) {
        console.error('createFeedback ERROR:', err);
        res.status(500).json({ message: 'Error creating feedback' });
    }
};

// GET /api/feedback/inbox — threads where user has unread messages or received something new
const getInbox = async (req, res) => {
    try {
        const uId = new mongoose.Types.ObjectId(req.userId);
        
        // Find threads where:
        // (User is a participant) AND (User is in unreadFor OR last message is from someone else)
        // Note: Finding "last message sender" in a single query is tricky with subdocuments, 
        // so we'll fetch participant threads and filter efficiently.
        const threads = await Feedback.find({
            $or: [{ sender: uId }, { recipients: uId }]
        })
        .sort({ updatedAt: -1 })
        .limit(50)
        .populate(populateConfig);

        const inboxThreads = threads.map(t => filterVanishedMessages(t, req.userId))
        .filter(t => {
            // Priority 1: Specifically marked as unread for this user
            const isUnread = t.unreadFor?.some(id => id.toString() === req.userId || id._id?.toString() === req.userId);
            if (isUnread) return true;

            // Priority 2: Last message is from someone else (meaning there's something to read/reply to)
            if (t.messages && t.messages.length > 0) {
                const lastMsg = t.messages[t.messages.length - 1];
                const lastSender = lastMsg.sender?._id?.toString() || lastMsg.sender?.toString();
                return lastSender !== req.userId;
            }
            return false;
        }).filter(t => t.messages.length > 0); // Hide threads that become empty after filtering

        res.json(inboxThreads);
    } catch (err) {
        console.error('getInbox ERROR:', err);
        res.status(500).json({ message: 'Error fetching inbox feedback' });
    }
};

// GET /api/feedback/sent — threads created by user
const getSent = async (req, res) => {
    try {
        const threads = await Feedback.find({ sender: req.userId })
            .sort({ updatedAt: -1 })
            .limit(100)
            .populate(populateConfig);

        const sentThreads = threads.map(t => filterVanishedMessages(t, req.userId))
            .filter(t => t.messages.length > 0);
        
        res.json(sentThreads);
    } catch (err) {
        console.error('getSent ERROR:', err);
        res.status(500).json({ message: 'Error fetching sent feedback' });
    }
};

// GET /api/feedback/unread-count — count of threads with unread messages for user
const getUnreadCount = async (req, res) => {
    try {
        const count = await Feedback.countDocuments({ unreadFor: req.userId });
        res.json({ count });
    } catch (err) {
        console.error('getUnreadCount ERROR:', err);
        res.status(500).json({ message: 'Error fetching feedback unread count' });
    }
};

// PUT /api/feedback/:id/read — mark thread as read for user
const markThreadRead = async (req, res) => {
    try {
        const thread = await Feedback.findById(req.params.id).select('sender recipients unreadFor');
        if (!thread) return res.status(404).json({ message: 'Feedback thread not found' });

        const participants = [thread.sender.toString(), ...thread.recipients.map(r => r.toString())];
        if (!participants.includes(req.userId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        await Feedback.updateOne(
            { _id: thread._id },
            { $pull: { unreadFor: req.userId } }
        );
        res.json({ message: 'Marked as read' });
    } catch (err) {
        console.error('markThreadRead ERROR:', err);
        res.status(500).json({ message: 'Error marking feedback as read' });
    }
};

// POST /api/feedback/:id/reply — reply in thread
// body: { message: string }
const replyToThread = async (req, res) => {
    try {
        console.log('\n=== REPLY REQUEST START ===');
        console.log('Request params:', req.params);
        console.log('Request body:', req.body);
        console.log('Request user ID:', req.userId);
        console.log('Request user role:', req.userRole);
        console.log('Thread ID from params:', req.params.id);
        console.log('Message from body:', req.body.message);
        
        const { message } = req.body;
        if (!message?.trim()) {
            console.log('ERROR: Empty message');
            return res.status(400).json({ message: 'message is required' });
        }

        console.log('Attempting to find thread...');
        const thread = await Feedback.findById(req.params.id)
            .select('sender recipients')
            .populate('sender', 'name email role')
            .populate('recipients', 'name email role');
        
        console.log('Thread query result:', thread ? 'Found' : 'Not found');
        if (!thread) {
            console.log('ERROR: Thread not found in database');
            return res.status(404).json({ message: 'Feedback thread not found' });
        }
        console.log('Thread _id:', thread._id);
        console.log('Thread sender object:', thread.sender);
        console.log('Thread recipients array:', thread.recipients);
        console.log('Thread sender _id:', thread.sender?._id);
        console.log('Thread recipient IDs:', thread.recipients?.map(r => r?._id));

        // Safely convert to strings with null checks
        const senderId = thread.sender?._id ? thread.sender._id.toString() : null;
        const recipientIds = thread.recipients 
            ? thread.recipients.map(r => r?._id?.toString()).filter(id => id)
            : [];
        
        console.log('Extracted senderId:', senderId);
        console.log('Extracted recipientIds:', recipientIds);
        
        const participantIds = [senderId, ...recipientIds].filter(id => id);
        console.log('Combined participantIds:', participantIds);
        console.log('Current user ID (req.userId):', req.userId);
        console.log('User ID type:', typeof req.userId);
        console.log('Participant IDs type:', typeof participantIds[0]);
        
        if (!participantIds.includes(req.userId)) {
            console.log('ERROR: User not a participant');
            console.log('User ID checked:', req.userId);
            console.log('Participant IDs list:', participantIds);
            console.log('Includes check result:', participantIds.includes(req.userId));
            return res.status(403).json({ message: 'Access denied' });
        }
        console.log('User IS a participant ✓');

        const others = participantIds.filter(id => id !== req.userId);
        console.log('Marking as unread for:', others);
        
        console.log('Executing update...');
        
        // First, add the new message
        await Feedback.updateOne(
            { _id: thread._id },
            {
                $push: { messages: { sender: req.userId, message: message.trim() } }
            }
        );
        console.log('Message added ✓');
        
        // Then handle unreadFor separately to avoid conflict
        // Remove current user from unreadFor
        await Feedback.updateOne(
            { _id: thread._id },
            {
                $pull: { unreadFor: req.userId }
            }
        );
        console.log('Current user removed from unreadFor ✓');
        
        // Add others to unreadFor (mark as unread for them)
        if (others.length > 0) {
            await Feedback.updateOne(
                { _id: thread._id },
                {
                    $addToSet: { unreadFor: { $each: others } }
                }
            );
            console.log('Others marked as unread ✓');
            
            // --- ADDED: Feedback Reply Notification ---
            try {
                const sender = await User.findById(req.userId).select('name');
                const notifs = others.map(rId => ({
                    recipient: rId,
                    type: 'FEEDBACK_RECEIVED',
                    message: `New reply from ${sender?.name || 'User'} in feedback thread.`,
                    issueId: thread.issueId
                }));
                await Notification.insertMany(notifs);
                console.log('Feedback reply notifications created ✓');
            } catch (notifErr) {
                console.error('Error creating feedback reply notifications:', notifErr);
            }
        }
        
        console.log('All updates successful ✓');

        console.log('Fetching populated thread...');
        const populated = await Feedback.findById(thread._id).populate(populateConfig);
        console.log('Populated thread fetched ✓');
        console.log('=== REPLY SUCCESS ===\n');
        res.json(filterVanishedMessages(populated, req.userId));
    } catch (err) {
        console.error('\n=== REPLY ERROR ===');
        console.error('replyToThread ERROR:', err);
        console.error('Error stack:', err.stack);
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        console.log('=== REPLY ERROR END ===\n');
        res.status(500).json({ message: err.message || 'Error replying to feedback' });
    }
};

// PUT /api/feedback/:threadId/message/:messageId — edit a message
const editMessage = async (req, res) => {
    try {
        const { threadId, messageId } = req.params;
        const { message } = req.body;

        if (!message?.trim()) return res.status(400).json({ message: 'Message content required' });

        const thread = await Feedback.findById(threadId);
        if (!thread) return res.status(404).json({ message: 'Thread not found' });

        const msgIndex = thread.messages.findIndex(m => m._id.toString() === messageId);
        if (msgIndex === -1) return res.status(404).json({ message: 'Message not found' });

        // Check ownership
        if (thread.messages[msgIndex].sender.toString() !== req.userId) {
            return res.status(403).json({ message: 'You can only edit your own messages' });
        }

        if (thread.messages[msgIndex].isDeleted) {
            return res.status(400).json({ message: 'Cannot edit a deleted message' });
        }

        thread.messages[msgIndex].message = message.trim();
        thread.messages[msgIndex].isEdited = true;
        thread.messages[msgIndex].editedAt = new Date();
        
        await thread.save();

        const populated = await Feedback.findById(thread._id).populate(populateConfig);
        res.json(filterVanishedMessages(populated, req.userId));
    } catch (err) {
        console.error('editMessage ERROR:', err);
        res.status(500).json({ message: 'Error editing message' });
    }
};

// DELETE /api/feedback/:threadId/message/:messageId — delete a message
const deleteMessage = async (req, res) => {
    try {
        const { threadId, messageId } = req.params;
        const { mode } = req.query; // 'everyone' or 'me'

        const thread = await Feedback.findById(threadId);
        if (!thread) return res.status(404).json({ message: 'Thread not found' });

        const msgIndex = thread.messages.findIndex(m => m._id.toString() === messageId);
        if (msgIndex === -1) return res.status(404).json({ message: 'Message not found' });

        const isSender = thread.messages[msgIndex].sender.toString() === req.userId;

        if (mode === 'everyone') {
            // Check if user is a participant (sender or one of recipients)
            const isParticipant = isSender || thread.recipients.some(r => r.toString() === req.userId);
            if (!isParticipant) {
                return res.status(403).json({ message: 'Access denied: You are not a participant in this thread' });
            }
            thread.messages[msgIndex].isDeleted = true;
            thread.messages[msgIndex].message = "This message was deleted";
        } else {
            // Mode 'me' or default
            if (!thread.messages[msgIndex].deletedFor.includes(req.userId)) {
                thread.messages[msgIndex].deletedFor.push(req.userId);
            }
        }

        await thread.save();

        const populated = await Feedback.findById(thread._id).populate(populateConfig);
        res.json(filterVanishedMessages(populated, req.userId));
    } catch (err) {
        console.error('deleteMessage ERROR:', err);
        res.status(500).json({ message: 'Error deleting message' });
    }
};

// DELETE /api/feedback/:threadId — delete an entire feedback thread
const deleteThread = async (req, res) => {
    try {
        const { threadId } = req.params;

        const thread = await Feedback.findById(threadId);
        if (!thread) {
            return res.status(404).json({ message: 'Thread not found' });
        }

        // Authorization check: only sender or participants (recipients) can delete
        const isSender = thread.sender.toString() === req.userId;
        const isRecipient = thread.recipients.some(r => r.toString() === req.userId);

        if (!isSender && !isRecipient) {
            return res.status(403).json({ message: 'Unauthorized: You are not a participant in this thread' });
        }

        // Delete the thread from MongoDB
        await Feedback.findByIdAndDelete(threadId);

        console.log(`Feedback thread ${threadId} deleted by user ${req.userId}`);
        res.json({ message: 'Feedback thread deleted successfully' });
    } catch (err) {
        console.error('deleteThread ERROR:', err);
        res.status(500).json({ message: 'Error deleting feedback thread' });
    }
};

module.exports = {
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
};

