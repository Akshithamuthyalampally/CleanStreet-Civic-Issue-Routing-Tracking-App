import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { ManualMap } from '../components/SharedComponents';
import {
    useIssuePermissions,
    IssueImageGallery,
    IssueEditForm,
    IssueStatusForm,
    IssueDetailsCard,
    IssueComments
} from '../components/IssueComponents';

const IssueDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // State management
    const [issue, setIssue] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [existingImages, setExistingImages] = useState([]);
    const [newPhotos, setNewPhotos] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [error, setError] = useState(null);

    // Permission logic
    const permissions = useIssuePermissions(issue, user);

    // Fetch issue data
    useEffect(() => {
        const fetchIssue = async () => {
            try {
                setLoading(true);
                setError(null);
                console.log('Fetching issue with ID:', id);
                const { data } = await api.get(`/issues/${id}`);
                console.log('Issue data received:', data);
                setIssue(data);
                setEditForm({ status: 'Pending', ...data });
                setExistingImages(data.images || []);
            } catch (err) {
                console.error('Error fetching issue:', err);
                console.error('Error response:', err.response);
                setError(err.response?.status === 404
                    ? 'Issue not found'
                    : 'Failed to load issue details');
            } finally {
                setLoading(false);
            }
        };
        fetchIssue();
    }, [id]);

    // Update handler
    const handleUpdate = async () => {
        setSubmitting(true);
        try {
            const formData = new FormData();

            // Add fields based on role
            if (permissions.canEditDetails) {
                // Citizens can edit these
                formData.append('title', editForm.title);
                formData.append('description', editForm.description);
                formData.append('category', editForm.category);
                formData.append('urgency', editForm.urgency);
                formData.append('fullAddress', editForm.fullAddress);
                formData.append('landmark', editForm.landmark || '');
                formData.append('latitude', editForm.latitude);
                formData.append('longitude', editForm.longitude);
                existingImages.forEach(img => formData.append('existingImages', img));
                newPhotos.forEach(file => formData.append('images', file));
            }

            if (permissions.canUpdateStatus) {
                // Volunteers can only edit status
                formData.append('status', editForm.status);
            }

            const { data } = await api.put(`/issues/${id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setIssue({ ...data.issue, userName: issue.userName });
            setEditForm({ ...data.issue });
            setExistingImages(data.issue.images || []);
            setIsEditing(false);
            setNewPhotos([]);
            alert('Issue updated successfully!');
        } catch (err) {
            console.error('Update failed', err);
            alert(err.response?.data?.message || 'Failed to update issue');
        } finally {
            setSubmitting(false);
        }
    };

    // Delete handler
    const handleDelete = async () => {
        setSubmitting(true);
        try {
            await api.delete(`/issues/${id}`);
            navigate('/my-complaints');
        } catch (err) {
            console.error('Delete failed', err);
            alert('Failed to delete issue');
            setSubmitting(false);
        }
    };

    // Comment handler
    const handleAddComment = async (commentText) => {
        try {
            const { data } = await api.post(`/issues/${id}/comment`, {
                text: commentText,
                userName: user?.name || 'Anonymous'
            });
            setIssue(prev => ({ ...prev, comments: data.comments }));
        } catch (err) {
            console.error('Comment failed', err);
            throw err;
        }
    };

    // Cancel edit
    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditForm({ status: 'Pending', ...issue });
        setExistingImages(issue.images || []);
        setNewPhotos([]);
    };

    // Handle photo addition
    const handleAddPhotos = (files) => {
        setNewPhotos(prev => [...prev, ...files]);
    };

    // Handle photo removal
    const handleRemovePhoto = (index, isExisting) => {
        if (isExisting) {
            setExistingImages(prev => prev.filter((_, i) => i !== index));
        } else {
            const newIndex = index - existingImages.length;
            setNewPhotos(prev => prev.filter((_, i) => i !== newIndex));
        }
    };

    // Combine images for display
    const allImages = [...existingImages, ...newPhotos.map(p => URL.createObjectURL(p))];

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-civic-green border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-500 mb-4" style={{ color: 'var(--text-color)' }}>
                        {error}
                    </h2>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-3 bg-civic-green text-black rounded-xl font-black uppercase tracking-widest hover:scale-105 transition-all"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    // No issue found (safety check)
    if (!loading && !issue) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-color)' }}>
                        Issue not found
                    </h2>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-3 bg-civic-green text-black rounded-xl font-black uppercase tracking-widest hover:scale-105 transition-all"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <AnimatePresence mode="wait">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-6"
                >
                    {/* Header with Back Button + Action Buttons */}
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all"
                            style={{ color: 'var(--text-color)' }}
                        >
                            <span className="text-xl">←</span>
                            <span className="font-bold">Back</span>
                        </button>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            {permissions.canEdit && !deleteConfirm && (
                                <>
                                    {isEditing ? (
                                        <>
                                            <button
                                                onClick={handleUpdate}
                                                disabled={submitting}
                                                className="px-6 py-3 bg-civic-green text-black rounded-xl font-black uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-civic-green/20"
                                            >
                                                {submitting ? 'Saving...' : 'Save Changes'}
                                            </button>
                                            <button
                                                onClick={handleCancelEdit}
                                                disabled={submitting}
                                                className="px-6 py-3 bg-black/5 dark:bg-white/5 rounded-xl font-black uppercase tracking-widest hover:bg-black/10 dark:hover:bg-white/10 transition-all"
                                                style={{ color: 'var(--text-color)' }}
                                            >
                                                Cancel
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => setIsEditing(true)}
                                                className="px-6 py-3 bg-civic-green/10 text-civic-green border border-civic-green/20 rounded-xl font-black uppercase tracking-widest hover:bg-civic-green hover:text-black transition-all"
                                            >
                                                {permissions.canUpdateStatus && !permissions.canEditDetails ? 'Update Status' : 'Edit Issue'}
                                            </button>
                                            {permissions.canDelete && (
                                                <button
                                                    onClick={() => setDeleteConfirm(true)}
                                                    className="px-6 py-3 rounded-xl font-black uppercase tracking-widest text-red-500 bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Delete Confirmation */}
                    {deleteConfirm ? (
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="card p-12 text-center"
                        >
                            <h3 className="text-3xl font-black mb-4" style={{ color: 'var(--text-color)' }}>
                                Delete this issue?
                            </h3>
                            <p className="text-sm opacity-60 mb-8">
                                This action cannot be undone.
                            </p>
                            <div className="flex gap-4 justify-center">
                                <button
                                    onClick={handleDelete}
                                    disabled={submitting}
                                    className="px-8 py-3 rounded-xl bg-red-600 text-white font-bold uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? 'Deleting...' : 'Confirm Delete'}
                                </button>
                                <button
                                    onClick={() => setDeleteConfirm(false)}
                                    disabled={submitting}
                                    className="px-8 py-3 rounded-xl bg-black/5 dark:bg-white/5 font-bold uppercase tracking-widest hover:bg-black/10 dark:hover:bg-white/10 transition-all"
                                    style={{ color: 'var(--text-color)' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Left Column: Title + Images + Details */}
                            <div className="space-y-6">
                                {/* Title */}
                                {isEditing && permissions.canEditDetails ? (
                                    <input
                                        type="text"
                                        className="w-full text-4xl font-black tracking-tight bg-transparent border-b-2 border-civic-green pb-2 focus:outline-none"
                                        style={{ color: 'var(--text-color)' }}
                                        value={editForm.title}
                                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                        placeholder="Issue title"
                                    />
                                ) : (
                                    <h1 className="text-4xl font-black tracking-tight" style={{ color: 'var(--text-color)' }}>
                                        {issue.title}
                                    </h1>
                                )}

                                {/* Submitted By */}
                                <div className="flex items-center gap-2 text-sm opacity-60">
                                    <span>Reported by</span>
                                    <span className="font-bold">{issue.userName || 'Unknown'}</span>
                                    <span>•</span>
                                    <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                                </div>

                                {/* Image Gallery */}
                                <IssueImageGallery
                                    images={allImages}
                                    editable={isEditing && permissions.canEditDetails}
                                    onAdd={handleAddPhotos}
                                    onRemove={handleRemovePhoto}
                                    existingImages={existingImages}
                                    newPhotos={newPhotos}
                                />

                                {/* Details / Edit Form */}
                                {isEditing ? (
                                    permissions.canEditDetails ? (
                                        <IssueEditForm
                                            formData={editForm}
                                            onChange={setEditForm}
                                            disabled={submitting}
                                        />
                                    ) : (
                                        <IssueStatusForm
                                            status={editForm.status}
                                            onChange={(status) => setEditForm({ ...editForm, status })}
                                            disabled={submitting}
                                        />
                                    )
                                ) : (
                                    <IssueDetailsCard issue={issue} />
                                )}
                            </div>

                            {/* Right Column: Map + Location + Comments */}
                            <div className="space-y-6">
                                {/* Map */}
                                {issue.latitude && issue.longitude ? (
                                    <div className="h-96 rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--card-border)' }}>
                                        <ManualMap
                                            center={[issue.latitude, issue.longitude]}
                                            markerPos={[issue.latitude, issue.longitude]}
                                        />
                                    </div>
                                ) : (
                                    <div className="h-96 rounded-2xl overflow-hidden border bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center" style={{ borderColor: 'var(--card-border)' }}>
                                        <p className="text-sm opacity-40">Location data not available</p>
                                    </div>
                                )}

                                {/* Location Details */}
                                <div className="card p-6">
                                    <h3 className="text-xs uppercase font-black opacity-40 mb-4">Location</h3>
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium" style={{ color: 'var(--text-color)' }}>
                                            {issue.fullAddress}
                                        </p>
                                        {issue.landmark && (
                                            <p className="text-xs opacity-60" style={{ color: 'var(--text-color)' }}>
                                                📍 Near: {issue.landmark}
                                            </p>
                                        )}
                                        <p className="text-xs opacity-40">
                                            Coordinates: {issue.latitude?.toFixed(6) || 'N/A'}, {issue.longitude?.toFixed(6) || 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                {/* Voting Section */}
                                <div className="card p-6">
                                    <h3 className="text-xs uppercase font-black opacity-40 mb-4">Community Support</h3>
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">👍</span>
                                            <span className="text-xl font-bold text-civic-green">
                                                {issue.upvotes?.length || 0}
                                            </span>
                                            <span className="text-xs opacity-60">Upvotes</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">👎</span>
                                            <span className="text-xl font-bold text-red-500">
                                                {issue.downvotes?.length || 0}
                                            </span>
                                            <span className="text-xs opacity-60">Downvotes</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Comments */}
                                <IssueComments
                                    comments={issue.comments || []}
                                    onAddComment={handleAddComment}
                                    userName={user?.name}
                                />
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default IssueDetail;
