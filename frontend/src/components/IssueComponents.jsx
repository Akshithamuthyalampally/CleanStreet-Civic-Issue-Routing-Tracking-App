import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { statusBadge, ManualMap } from './SharedComponents';

// Custom hook for issue permissions
export const useIssuePermissions = (issue, user) => {
    if (!issue || !user) {
        return {
            isOwner: false,
            isVolunteer: false,
            isAssigned: false,
            isAdmin: false,
            canEditDetails: false,
            canUpdateStatus: false,
            canEdit: false,
            canDelete: false
        };
    }

    const userId = user.id || user._id;
    const issueOwnerId = issue.userId?._id || issue.userId;
    const assignedVolId = issue.assignedVolunteer?._id || issue.assignedVolunteer;

    const isOwner = userId === issueOwnerId;
    const isVolunteer = user.role === 'volunteer';
    const isAssigned = isVolunteer && userId === assignedVolId;
    const isAdmin = user.role === 'admin';

    const canEditDetails = (isOwner && user.role === 'citizen') || isAdmin;
    const canUpdateStatus = (isVolunteer && isAssigned) || isAdmin;
    const canEdit = canEditDetails || canUpdateStatus;
    const canDelete = isOwner || isAdmin;

    return {
        isOwner,
        isVolunteer,
        isAssigned,
        isAdmin,
        canEditDetails,
        canUpdateStatus,
        canEdit,
        canDelete
    };
};

// Image Gallery Component
export const IssueImageGallery = ({ images, editable, onAdd, onRemove, existingImages, newPhotos }) => {
    const [currentMainImage, setCurrentMainImage] = useState(null);

    const allImages = images || [];
    const mainView = currentMainImage || allImages[0];

    const handleAddPhotos = (e) => {
        const files = Array.from(e.target.files);
        if (onAdd && files.length > 0) {
            onAdd(files);
            setCurrentMainImage(URL.createObjectURL(files[0]));
        }
    };

    const handleRemove = (index, isExisting) => {
        if (onRemove) {
            onRemove(index, isExisting);
        }
        if (currentMainImage === allImages[index]) {
            setCurrentMainImage(null);
        }
    };

    return (
        <div className="space-y-4">
            {/* Main Image Display */}
            <div className="aspect-video rounded-2xl overflow-hidden border bg-black/5 relative group" style={{ borderColor: 'var(--card-border)' }}>
                {mainView ? (
                    <img src={mainView} className="w-full h-full object-cover" alt="Issue" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-10 text-6xl">📸</div>
                )}
            </div>

            {/* Thumbnail Grid */}
            <div className="grid grid-cols-5 gap-2">
                {allImages.map((img, i) => (
                    <div
                        key={i}
                        className={`aspect-square rounded-lg overflow-hidden border cursor-pointer relative group ${mainView === img ? 'ring-2 ring-civic-green' : ''}`}
                        onClick={() => setCurrentMainImage(img)}
                    >
                        <img src={img} className="w-full h-full object-cover" alt="" />
                        {editable && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const isExisting = i < (existingImages?.length || 0);
                                    handleRemove(i, isExisting);
                                }}
                                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            >
                                ×
                            </button>
                        )}
                    </div>
                ))}

                {/* Add Photo Button */}
                {editable && allImages.length < 5 && (
                    <label className="aspect-square rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer opacity-40 hover:opacity-100 hover:border-civic-green transition-all">
                        <span className="text-2xl">+</span>
                        <input type="file" multiple accept="image/*" className="hidden" onChange={handleAddPhotos} />
                    </label>
                )}
            </div>
        </div>
    );
};

// Edit Form for Citizens
export const IssueEditForm = ({ formData, onChange, disabled }) => {
    return (
        <div className="card p-6 space-y-4">
            <h3 className="text-xs uppercase font-black opacity-40 mb-4">Edit Details</h3>

            {/* Description */}
            <div>
                <label className="block text-xs font-bold opacity-60 mb-2">Description</label>
                <textarea
                    className="w-full bg-black/5 dark:bg-white/5 border rounded-xl p-4 text-sm min-h-[100px]"
                    style={{ borderColor: 'var(--card-border)', color: 'var(--text-color)' }}
                    value={formData.description || ''}
                    onChange={(e) => onChange({ ...formData, description: e.target.value })}
                    disabled={disabled}
                    placeholder="Describe the issue..."
                />
            </div>

            {/* Category and Priority */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold opacity-60 mb-2">Category</label>
                    <select
                        className="w-full bg-black/5 dark:bg-white/5 rounded-xl p-3 text-sm"
                        style={{ borderColor: 'var(--card-border)', color: 'var(--text-color)' }}
                        value={formData.category || 'Other'}
                        onChange={(e) => onChange({ ...formData, category: e.target.value })}
                        disabled={disabled}
                    >
                        {['Road Damage', 'Garbage', 'Water Supply', 'Electricity', 'Sewage', 'Street Light', 'Park', 'Other'].map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold opacity-60 mb-2">Priority</label>
                    <select
                        className="w-full bg-black/5 dark:bg-white/5 rounded-xl p-3 text-sm"
                        style={{ borderColor: 'var(--card-border)', color: 'var(--text-color)' }}
                        value={formData.urgency || 'Low'}
                        onChange={(e) => onChange({ ...formData, urgency: e.target.value })}
                        disabled={disabled}
                    >
                        {['Low', 'Medium', 'High'].map(u => (
                            <option key={u} value={u}>{u}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Location Fields */}
            <div>
                <label className="block text-xs font-bold opacity-60 mb-2">Address</label>
                <input
                    type="text"
                    className="w-full bg-black/5 dark:bg-white/5 border rounded-xl p-3 text-sm"
                    style={{ borderColor: 'var(--card-border)', color: 'var(--text-color)' }}
                    value={formData.fullAddress || ''}
                    onChange={(e) => onChange({ ...formData, fullAddress: e.target.value })}
                    disabled={disabled}
                    placeholder="Full address"
                />
            </div>

            <div>
                <label className="block text-xs font-bold opacity-60 mb-2">Landmark (Optional)</label>
                <input
                    type="text"
                    className="w-full bg-black/5 dark:bg-white/5 border rounded-xl p-3 text-sm"
                    style={{ borderColor: 'var(--card-border)', color: 'var(--text-color)' }}
                    value={formData.landmark || ''}
                    onChange={(e) => onChange({ ...formData, landmark: e.target.value })}
                    disabled={disabled}
                    placeholder="Nearby landmark"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold opacity-60 mb-2">Latitude</label>
                    <input
                        type="number"
                        step="any"
                        className="w-full bg-black/5 dark:bg-white/5 border rounded-xl p-3 text-sm"
                        style={{ borderColor: 'var(--card-border)', color: 'var(--text-color)' }}
                        value={formData.latitude || ''}
                        onChange={(e) => onChange({ ...formData, latitude: parseFloat(e.target.value) })}
                        disabled={disabled}
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold opacity-60 mb-2">Longitude</label>
                    <input
                        type="number"
                        step="any"
                        className="w-full bg-black/5 dark:bg-white/5 border rounded-xl p-3 text-sm"
                        style={{ borderColor: 'var(--card-border)', color: 'var(--text-color)' }}
                        value={formData.longitude || ''}
                        onChange={(e) => onChange({ ...formData, longitude: parseFloat(e.target.value) })}
                        disabled={disabled}
                    />
                </div>
            </div>
        </div>
    );
};

// Status Form for Volunteers
export const IssueStatusForm = ({ status, onChange, disabled }) => {
    return (
        <div className="card p-6">
            <h3 className="text-xs uppercase font-black opacity-40 mb-4">Manage Status</h3>
            <div>
                <label className="block text-xs font-bold opacity-60 mb-2">Issue Status</label>
                <select
                    className="w-full bg-black/5 dark:bg-white/5 rounded-xl p-3 text-sm border-2 border-civic-green/40"
                    style={{ color: 'var(--text-color)' }}
                    value={status || 'Pending'}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                >
                    {['Pending', 'In Progress', 'Resolved'].map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
                <p className="text-xs opacity-40 mt-2">Update the current status of this issue</p>
            </div>
        </div>
    );
};

// Read-only Details Card
export const IssueDetailsCard = ({ issue }) => {
    const navigate = useNavigate();
    const { user } = useAuth();

    return (
        <div className="card p-6">
            <h3 className="text-xs uppercase font-black opacity-40 mb-4">Details</h3>
            <div className="space-y-4">
                {/* Description */}
                <p className="text-sm opacity-60 italic" style={{ color: 'var(--text-color)' }}>
                    "{issue.description}"
                </p>

                {/* Status Badges */}
                <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest">
                    <span className={`px-3 py-1 rounded-full ${statusBadge(issue.status)}`}>
                        {issue.status}
                    </span>
                    <span className="px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-800">
                        {issue.urgency}
                    </span>
                    <span className="px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-800">
                        {issue.category}
                    </span>
                </div>

                {/* Assigned Volunteer Info */}
                {issue.assignedVolunteer ? (
                    <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-xl">
                                🛡️
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                                        {issue.assignedBy ? 'Assigned by Admin' : 'Mission Hero'}
                                    </p>
                                    <span className="px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[8px] font-black uppercase border border-blue-500/20">
                                        Verified Hero
                                    </span>
                                </div>
                                <p className="text-sm font-bold" style={{ color: 'var(--text-color)' }}>
                                    {issue.assignedVolunteer?.name}
                                    {typeof issue.assignedVolunteer === 'object' ? (
                                        <span className="ml-2 opacity-40 font-black tracking-tighter">
                                            (ID: {issue.assignedVolunteer.volunteerId || 'N/A'})
                                        </span>
                                    ) : (
                                        <span className="ml-2 opacity-40 font-black tracking-tighter">
                                            (ID: N/A)
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Give Feedback Button for Resolved Issues */}
                        {user?.role === 'citizen' && issue.status?.toLowerCase() === 'resolved' && (
                            <motion.button
                                whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)' }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate(`/issue/${issue._id}/feedback`)}
                                className="px-4 py-2 bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                            >
                                <span>Give Feedback</span>
                                <span className="text-xs">✨</span>
                            </motion.button>
                        )}
                    </div>
                ) : (
                    <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-xl">
                            ⏳
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">
                                Mission Status
                            </p>
                            <p className="text-sm font-bold" style={{ color: 'var(--text-color)' }}>
                                Awaiting volunteer acceptance
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Comments Component
export const IssueComments = ({ comments, onAddComment, userName }) => {
    const [commentText, setCommentText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!commentText.trim()) return;

        setIsSubmitting(true);
        try {
            await onAddComment(commentText.trim());
            setCommentText('');
        } catch (err) {
            console.error('Comment submission failed', err);
            alert('Failed to post comment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="card p-6">
            <h3 className="text-xs uppercase font-black opacity-40 mb-4">
                Discussion ({comments?.length || 0})
            </h3>

            {/* Comment Input */}
            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    className="flex-1 bg-black/5 dark:bg-white/5 rounded-lg px-4 py-2 text-sm"
                    style={{ color: 'var(--text-color)' }}
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isSubmitting}
                />
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !commentText.trim()}
                    className="px-4 py-2 bg-civic-green text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? 'Posting...' : 'Post'}
                </button>
            </div>

            {/* Comments List */}
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {(comments || []).slice().reverse().map((c, i) => (
                    <div key={i} className="flex gap-2">
                        <div className="w-8 h-8 rounded bg-civic-green/10 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {c.userName?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 bg-black/5 dark:bg-white/5 rounded-lg p-3">
                            <p className="text-[10px] font-bold opacity-60" style={{ color: 'var(--text-color)' }}>
                                {c.userName}
                            </p>
                            <p className="text-sm" style={{ color: 'var(--text-color)' }}>
                                {c.content || c.text}
                            </p>
                            {c.createdAt && (
                                <p className="text-[9px] opacity-40 mt-1">
                                    {new Date(c.createdAt).toLocaleString()}
                                </p>
                            )}
                        </div>
                    </div>
                ))}

                {(!comments || comments.length === 0) && (
                    <p className="text-center text-sm opacity-40 py-8">No comments yet. Be the first to comment!</p>
                )}
            </div>
        </div>
    );
};
