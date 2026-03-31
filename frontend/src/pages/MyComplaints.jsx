import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { statusBadge, ManualMap } from '../components/SharedComponents'

// statusBadge and ManualMap moved to SharedComponents

const ThumbsUp = ({ active }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12" /><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" /></svg>
);

const ThumbsDown = ({ active }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 14V2" /><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" /></svg>
);

const MessageCircle = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>
);

const ImageCarousel = ({ images, title }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (!images || images.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % images.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [images.length]);

    if (!images || images.length === 0) {
        return <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">📸</div>;
    }

    if (images.length === 1) {
        return <img src={images[0]} alt={title} className="w-full h-full object-cover" />;
    }

    return (
        <div className="relative w-full h-full">
            <AnimatePresence mode="wait">
                <motion.img
                    key={currentIndex}
                    src={images[currentIndex]}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full h-full object-cover"
                />
            </AnimatePresence>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-all"
            >
                ‹
            </button>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(prev => (prev + 1) % images.length);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-all"
            >
                ›
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {images.map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentIndex ? 'bg-civic-green w-3' : 'bg-white/50'}`} />
                ))}
            </div>
        </div>
    );
};

const ComplaintCard = ({ complaint, onClick, onDelete, onUpdate, currentUser, onAction }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const progress = complaint.status === 'Resolved' ? 100 : complaint.status === 'In Progress' ? 50 : 10;
    const isOwner = currentUser && (
        (currentUser.id || currentUser._id) === complaint.userId ||
        (currentUser.id || currentUser._id) === (complaint.userId?._id || complaint.userId)
    );

    const hasUpvoted = complaint.upvotes?.includes(currentUser?.id || currentUser?._id);
    const hasDownvoted = complaint.downvotes?.includes(currentUser?.id || currentUser?._id);

    const handleAddComment = async (e) => {
        e.stopPropagation();
        if (!commentText.trim()) return;

        setIsSubmitting(true);
        try {
            await onUpdate(complaint, 'comment', commentText);
            setCommentText('');
        } catch (err) {
            console.error('Comment failed', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div
            layout
            className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 hover:shadow-2xl hover:shadow-civic-green/10 transition-all duration-500 group flex flex-col"
            whileHover={{ y: -8 }}
        >
            <div className="p-6 cursor-pointer" onClick={() => onClick(complaint)}>
                <div className="flex justify-between items-center mb-6">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusBadge(complaint.status)}`}>
                        {complaint.status}
                    </span>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[11px] font-black border border-zinc-200 dark:border-zinc-700">
                            {complaint.userName?.split(' ').map(n => n[0]).join('') || 'U'}
                        </div>
                        <div className="text-right">
                            <p className="text-[11px] font-black leading-none" style={{ color: 'var(--text-color)' }}>{complaint.userName || 'User'}</p>
                            <p className="text-[9px] opacity-40 uppercase tracking-tighter mt-1">
                                {new Date(complaint.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border dark:border-zinc-800 relative mb-6 shadow-sm">
                    <ImageCarousel images={complaint.images} title={complaint.title} />
                </div>

                <div className="mb-6">
                    <h3 className="font-black text-xl tracking-tight mb-2 line-clamp-1" style={{ color: 'var(--text-color)' }}>{complaint.title}</h3>
                    <p className="text-sm opacity-60 line-clamp-2 leading-relaxed h-10 italic">"{complaint.description}"</p>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-bold opacity-60 mb-2 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <span className="text-civic-green text-base">📍</span>
                    <span className="line-clamp-1">{complaint.fullAddress}</span>
                </div>

                {complaint.assignedVolunteer ? (
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-500/5 p-3 rounded-xl border border-blue-500/10 mb-6 group-hover:bg-blue-500/10 transition-colors">
                        <span className="text-sm">🛡️</span>
                        <span>
                            {complaint.assignedBy ? (
                                <>
                                    <span className="text-blue-600 dark:text-blue-400">Assigned by Admin: </span>
                                    <span className="text-blue-600 dark:text-blue-400 ml-1">{complaint.assignedVolunteer.name}</span>
                                    <span className="opacity-50 ml-1">(ID: {complaint.assignedVolunteer.volunteerId || 'N/A'})</span>
                                </>
                            ) : (
                                <>
                                    Accepted by: <span className="text-blue-600 dark:text-blue-400 ml-1">{complaint.assignedVolunteer.name}</span>
                                    <span className="opacity-50 ml-1">(ID: {complaint.assignedVolunteer.volunteerId || 'N/A'})</span>
                                </>
                            )}
                        </span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-orange-500 bg-orange-500/5 p-3 rounded-xl border border-orange-500/10 mb-6 transition-colors">
                        <span className="text-sm">⏳</span>
                        <span>Awaiting volunteer acceptance</span>
                    </div>
                )}

                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-y-4">
                    <div className="flex gap-2">
                        <button
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${hasUpvoted
                                ? 'bg-civic-green text-black border-civic-green'
                                : 'bg-zinc-100 dark:bg-zinc-800 border-transparent opacity-60 hover:opacity-100'
                                }`}
                            onClick={e => {
                                e.stopPropagation();
                                onClick(complaint, 'upvote');
                            }}
                        >
                            <ThumbsUp active={hasUpvoted} />
                            <span className="text-xs font-black">{complaint.upvotes?.length || 0}</span>
                        </button>
                        <button
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${hasDownvoted
                                ? 'bg-red-500 text-white border-red-500'
                                : 'bg-zinc-100 dark:bg-zinc-800 border-transparent opacity-60 hover:opacity-100'
                                }`}
                            onClick={e => {
                                e.stopPropagation();
                                onClick(complaint, 'downvote');
                            }}
                        >
                            <ThumbsDown active={hasDownvoted} />
                            <span className="text-xs font-black">{complaint.downvotes?.length || 0}</span>
                        </button>
                        <button
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${showComments ? 'bg-zinc-200 dark:bg-zinc-700 opacity-100' : 'bg-zinc-100 dark:bg-zinc-800 border-transparent opacity-60'}`}
                            onClick={e => {
                                e.stopPropagation();
                                setShowComments(!showComments);
                            }}
                        >
                            <MessageCircle />
                            <span className="text-xs font-black">{complaint.comments?.length || 0}</span>
                        </button>
                    </div>
                    {(isOwner || currentUser?.role === 'volunteer') && (
                        <div className="flex flex-col items-end gap-2">
                            {currentUser?.role === 'volunteer' && (
                                <div className="flex gap-3 items-center">
                                    {!complaint.assignedVolunteer ? (
                                        <button
                                            onClick={e => {
                                                e.stopPropagation();
                                                onAction(complaint._id, 'accept');
                                            }}
                                            className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:scale-105 transition-transform bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20"
                                        >
                                            Accept Mission
                                        </button>
                                    ) : (complaint.assignedVolunteer?._id === (currentUser?.id || currentUser?._id) || complaint.assignedVolunteer === (currentUser?.id || currentUser?._id)) ? (
                                        <>
                                            <button
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    onAction(complaint._id, 'reject');
                                                }}
                                                className="text-[10px] font-black uppercase tracking-widest text-orange-500 hover:scale-105 transition-transform bg-orange-500/10 px-3 py-1 rounded-lg border border-orange-500/20"
                                            >
                                                Reject
                                            </button>
                                            <button
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    onClick(complaint, 'status');
                                                }}
                                                className="text-[10px] font-black uppercase tracking-widest text-civic-green hover:scale-105 transition-transform bg-civic-green/10 px-3 py-1 rounded-lg border border-civic-green/20"
                                            >
                                                Update Status
                                            </button>
                                        </>
                                    ) : (
                                        <span className="text-[9px] font-bold opacity-30 uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-lg">Occupied</span>
                                    )}
                                </div>
                            )}
                            <div className="flex items-center gap-2 self-end">
                                {isOwner && (
                                    <button
                                        onClick={e => {
                                            e.stopPropagation();
                                            onDelete(complaint);
                                        }}
                                        className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:scale-105 transition-transform bg-red-500/10 px-3 py-1 rounded-lg border border-red-500/20"
                                    >
                                        Purge Record
                                    </button>
                                )}
                                {currentUser?.role === 'citizen' && complaint.status === 'Resolved' && complaint.assignedVolunteer && (
                                    <button
                                        onClick={e => {
                                            e.stopPropagation();
                                            navigate(`/issue/${complaint._id}/feedback`);
                                        }}
                                        className="text-[10px] font-black uppercase tracking-widest text-civic-green hover:scale-105 transition-transform bg-civic-green/10 px-3 py-1 rounded-lg border border-civic-green/20 flex items-center gap-2"
                                    >
                                        <span className="text-xs">⭐</span>
                                        Give Feedback
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Comments Section */}
            <AnimatePresence>
                {showComments && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30"
                    >
                        <div className="p-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4">Comments</h4>

                            <div className="space-y-4 mb-4 max-h-[200px] overflow-y-auto custom-scrollbar">
                                {complaint.comments?.length > 0 ? (
                                    complaint.comments.map((comment, i) => (
                                        <div key={i} className="flex gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 flex items-center justify-center text-[10px] font-bold">
                                                {comment.userName?.[0] || 'U'}
                                            </div>
                                            <div className="flex-1 bg-white dark:bg-zinc-800/50 rounded-2xl p-3 border border-zinc-100 dark:border-zinc-700">
                                                <div className="flex justify-between items-center mb-1">
                                                    <p className="font-bold text-[11px]" style={{ color: 'var(--text-color)' }}>{comment.userName}</p>
                                                    <p className="text-[9px] opacity-40">{new Date(comment.timestamp || comment.createdAt).toLocaleDateString()}</p>
                                                </div>
                                                <p className="text-xs opacity-70 leading-relaxed">{comment.content || comment.text}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-[10px] italic opacity-40 text-center py-2">No comments yet.</p>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={commentText}
                                    onChange={e => setCommentText(e.target.value)}
                                    placeholder="Write a comment..."
                                    className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-civic-green transition-all"
                                    onClick={e => e.stopPropagation()}
                                    onKeyDown={e => e.key === 'Enter' && handleAddComment(e)}
                                />
                                <button
                                    onClick={handleAddComment}
                                    disabled={isSubmitting || !commentText.trim()}
                                    className="px-4 py-2 bg-civic-green text-black text-[10px] font-black uppercase tracking-widest rounded-xl disabled:opacity-50 hover:scale-105 transition-transform"
                                >
                                    {isSubmitting ? '...' : 'Post'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div >
    );
}

// DetailModal moved to SharedComponents

const MyComplaints = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [issues, setIssues] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [statusFilter, setStatusFilter] = useState('All')
    const [priorityFilter, setPriorityFilter] = useState('All')
    const [isNearby, setIsNearby] = useState(false)
    const [location, setLocation] = useState(null)
    const [selectedComplaint, setSelectedComplaint] = useState(null)

    const fetchIssues = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const params = {}
            if (statusFilter !== 'All') params.status = statusFilter
            if (priorityFilter !== 'All') params.priority = priorityFilter

            if (isNearby && location) {
                const { data } = await api.get('/issues/nearby', {
                    params: {
                        lat: location.lat,
                        lng: location.lng,
                        radius: 30,
                        ...params
                    }
                })
                setIssues(data)
            } else {
                const { data } = await api.get('/issues', { params })
                setIssues(data)
            }
        } catch (err) {
            console.error('Fetch error:', err)
            setError('Operational error: Could not retrieve reports.')
        } finally {
            setLoading(false)
        }
    }, [isNearby, location, statusFilter, priorityFilter])

    useEffect(() => {
        fetchIssues()
    }, [fetchIssues])

    const toggleNearbyFilter = () => {
        if (!isNearby) {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
                        setIsNearby(true)
                    },
                    (err) => {
                        console.warn('Geolocation failed', err)
                        setError('Location access denied. Cannot filter by proximity.')
                    }
                )
            } else {
                setError('Geolocation not supported by this browser.')
            }
        } else {
            setIsNearby(false)
            setLocation(null)
        }
    }

    const handleOpenDetail = async (complaint, action = false) => {
        if (action === 'upvote' || action === 'downvote') {
            try {
                const { data } = await api.post(`/issues/${complaint._id}/${action}`);
                setIssues(prev => prev.map(iss => iss._id === complaint._id ? { ...iss, ...data.issue } : iss));
            } catch (err) {
                console.error('Action failed', err);
            }
            return;
        }
        // Navigate to detail page instead of opening modal
        navigate(`/issue/${complaint._id}`);
    }

    const handleAction = async (issueId, action) => {
        if (action === 'feedback') {
            navigate(`/issue/${issueId}/feedback`);
            return;
        }
        try {
            const { data } = await api.post(`/issues/${issueId}/${action}`);
            setIssues(prev => prev.map(iss => iss._id === issueId ? { ...iss, ...data.issue } : iss));
            if (selectedComplaint?._id === issueId) {
                setSelectedComplaint(prev => ({ ...prev, ...data.issue }));
            }
        } catch (err) {
            console.error(`Error ${action}ing issue:`, err);
            const message = err.response?.data?.message || `Failed to ${action} mission.`;
            alert(message);
        }
    }

    const handleDelete = async (complaint) => {
        if (!window.confirm('Are you sure you want to delete this issue?')) {
            return;
        }
        try {
            await api.delete(`/issues/${complaint._id}`);
            setIssues(prev => prev.filter(iss => iss._id !== complaint._id));
        } catch (err) {
            console.error('Delete failed', err);
            alert('Failed to delete issue.');
        }
    }

    const handleUpdate = async (complaint, updateType, data) => {
        try {
            if (updateType === 'comment') {
                const response = await api.post(`/issues/${complaint._id}/comment`, { content: data });
                setIssues(prev => prev.map(iss => iss._id === complaint._id ? { ...iss, ...response.data.issue } : iss));
            }
        } catch (err) {
            console.error('Update failed', err);
            throw err;
        }
    }

    return (
        <div className="main-container min-h-screen pb-20 max-w-7xl mx-auto px-4">
            <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: 'var(--text-color)' }}>
                        View <span className="text-civic-green">Complaints</span>
                    </h2>
                    <p className="opacity-60 text-base sm:text-lg font-medium mt-2">Track and manage civic concerns across the grid.</p>
                </div>

                <div className="relative group">
                    <button
                        className={`flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all duration-300 ${isNearby || statusFilter !== 'All'
                            ? 'bg-civic-green text-black border-civic-green shadow-neon'
                            : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 opacity-60 hover:opacity-100'}`}
                    >
                        <span className="text-xl">{isNearby ? '📍' : '🔍'}</span>
                        <span className="text-xs font-black uppercase tracking-widest">
                            {isNearby ? `Nearby (30km)${statusFilter !== 'All' ? ` • ${statusFilter}` : ''}` : statusFilter !== 'All' ? statusFilter : 'Filter'}
                        </span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-40 group-hover:rotate-180 transition-transform duration-300"><path d="m6 9 6 6 6-6" /></svg>
                    </button>

                    <div className="absolute right-0 top-full mt-2 w-56 p-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 z-[110]">
                        <div className="p-2 text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Search Tools</div>

                        {user?.role !== 'citizen' && (
                            <button
                                onClick={toggleNearbyFilter}
                                className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${isNearby ? 'bg-civic-green/10 text-civic-green' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 opacity-70 hover:opacity-100'}`}
                            >
                                <span className="flex items-center gap-2">📍 Nearby (30km)</span>
                                {isNearby && <div className="w-2 h-2 rounded-full bg-civic-green animate-pulse" />}
                            </button>
                        )}

                        <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-2" />
                        <div className="p-2 text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Filter by Status</div>

                        {['All', 'Pending', 'In Progress', 'Resolved'].map(status => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`w-full text-left p-3 rounded-xl text-xs font-bold transition-all ${statusFilter === status ? 'bg-civic-green/10 text-civic-green' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 opacity-70 hover:opacity-100'}`}
                            >
                                {status === 'All' ? '📂 All Issues' : status === 'Pending' ? '🟠 Pending' : status === 'In Progress' ? '🔵 In Progress' : '🟢 Resolved'}
                            </button>
                        ))}

                        <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-2" />
                        <div className="p-2 text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Filter by Priority</div>

                        {['All', 'High', 'Medium', 'Low'].map(p => (
                            <button
                                key={p}
                                onClick={() => setPriorityFilter(p)}
                                className={`w-full text-left p-3 rounded-xl text-xs font-bold transition-all ${priorityFilter === p ? 'bg-civic-green/10 text-civic-green' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 opacity-70 hover:opacity-100'}`}
                            >
                                {p === 'All' ? '📶 All Priorities' : p === 'High' ? '🔴 High' : p === 'Medium' ? '🟡 Medium' : '🟢 Low'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-40">
                    <div className="w-16 h-16 border-4 border-civic-green border-t-transparent rounded-full animate-spin shadow-neon"></div>
                    <p className="opacity-60 mt-6 font-bold uppercase tracking-widest text-sm animate-pulse">Scanning Grid...</p>
                </div>
            ) : error ? (
                <div className="card p-8 bg-red-500/10 border-red-500/20 text-red-500 flex items-center gap-4">
                    <span className="text-3xl">⚠️</span>
                    <p className="font-bold uppercase tracking-widest text-sm">{error}</p>
                </div>
            ) : issues.length === 0 ? (
                <div className="card py-32 text-center border-dashed opacity-50">
                    <div className="text-6xl sm:text-8xl mb-6">📪</div>
                    <h3 className="text-xl sm:text-2xl font-black opacity-40 uppercase tracking-tighter">Complaints Log Clear</h3>
                    <p className="mt-2 font-medium text-sm sm:text-base px-6">No issues have been submitted to the community yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                    {issues.map((issue) => (
                        <ComplaintCard
                            key={issue._id}
                            complaint={issue}
                            onUpdate={handleUpdate}
                            onClick={(c, action) => handleOpenDetail(c, action)}
                            onDelete={handleDelete}
                            currentUser={user}
                            onAction={handleAction}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

export default MyComplaints
