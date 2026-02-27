import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import L from 'leaflet'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

// Leaflet Icons
const MARKER_ICON_2X = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png';
const MARKER_ICON = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png';
const MARKER_SHADOW = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png';

const statusBadge = (status) => {
    const s = status?.toLowerCase();
    switch (s) {
        case 'resolved':
            return 'bg-green-500 text-white border-green-600';
        case 'in progress':
            return 'bg-blue-500 text-white border-blue-600';
        case 'pending':
            return 'bg-orange-500 text-white border-orange-600';
        default:
            return 'bg-zinc-500 text-white border-zinc-600';
    }
}

const ManualMap = ({ center, markerPos }) => {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);

    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return;

        const map = L.map(mapContainerRef.current, {
            center: center,
            zoom: 15,
            scrollWheelZoom: false,
            zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        mapInstanceRef.current = map;

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        map.setView(center, 15);

        if (markerRef.current) {
            markerRef.current.setLatLng(markerPos);
        } else {
            const customIcon = L.icon({
                iconUrl: MARKER_ICON,
                iconRetinaUrl: MARKER_ICON_2X,
                shadowUrl: MARKER_SHADOW,
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });
            markerRef.current = L.marker(markerPos, { icon: customIcon }).addTo(map);
        }
    }, [center, markerPos]);

    return <div ref={mapContainerRef} className="w-full h-full rounded-lg ring-1 ring-black/5" />;
};

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
        if (images.length <= 1) return;
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

const ComplaintCard = ({ complaint, onClick, onDelete, onUpdate, currentUser }) => {
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

                <div className="flex items-center gap-2 text-[11px] font-bold opacity-60 mb-6 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <span className="text-civic-green text-base">📍</span>
                    <span className="line-clamp-1">{complaint.fullAddress}</span>
                </div>

                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
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
                    {isOwner && (
                        <button
                            onClick={e => {
                                e.stopPropagation();
                                onDelete(complaint);
                            }}
                            className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:scale-105 transition-transform"
                        >
                            Purge
                        </button>
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
        </motion.div>
    );
}

const DetailModal = ({ complaint, onClose, onUpdate, onDelete, initialDeleteMode = false }) => {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        status: 'Pending',
        ...complaint
    });
    const [existingImages, setExistingImages] = useState(complaint.images || []);

    useEffect(() => {
        setEditForm({ status: 'Pending', ...complaint });
        setExistingImages(complaint.images || []);
    }, [complaint]);
    const [newPhotos, setNewPhotos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(initialDeleteMode);

    if (!complaint) return null;

    const isOwner = user && (
        (user.id || user._id) === complaint.userId ||
        (user.id || user._id) === (complaint.userId?._id || complaint.userId)
    );

    const handleUpdate = async () => {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('title', editForm.title);
            formData.append('description', editForm.description);
            formData.append('category', editForm.category);
            formData.append('urgency', editForm.urgency);
            formData.append('status', editForm.status);

            existingImages.forEach(img => formData.append('existingImages', img));
            newPhotos.forEach(file => formData.append('images', file));

            const { data } = await api.put(`/issues/${complaint._id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            onUpdate({ ...data.issue, userName: complaint.userName });
            setIsEditing(false);
            setNewPhotos([]);
        } catch (err) {
            console.error('Update failed', err);
        } finally {
            setLoading(false);
        }
    }

    const [currentMainImage, setCurrentMainImage] = useState(null);

    const handleAddPhotos = (e) => {
        const files = Array.from(e.target.files);
        setNewPhotos(prev => [...prev, ...files]);
        if (files.length > 0) {
            setCurrentMainImage(URL.createObjectURL(files[0]));
        }
    };

    const removeExistingImage = (index) => {
        setExistingImages(prev => prev.filter((_, i) => i !== index));
        if (currentMainImage === existingImages[index]) setCurrentMainImage(null);
    };

    const removeNewPhoto = (index) => {
        const photoUrl = URL.createObjectURL(newPhotos[index]);
        setNewPhotos(prev => prev.filter((_, i) => i !== index));
        if (currentMainImage === photoUrl) setCurrentMainImage(null);
    };

    const handleDelete = async () => {
        setLoading(true);
        try {
            await api.delete(`/issues/${complaint._id}`);
            onDelete(complaint._id);
            onClose();
        } catch (err) {
            console.error('Delete failed', err);
        } finally {
            setLoading(false);
        }
    }

    const allImages = [...existingImages, ...newPhotos.map(p => URL.createObjectURL(p))];
    const mainView = currentMainImage || allImages[0];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                layoutId={complaint._id}
                className="bg-white dark:bg-[#1a1c1e] w-full max-w-5xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: 'var(--card-border)' }}>
                    <div className="flex-1">
                        {isEditing ? (
                            <input
                                className="text-2xl font-black tracking-tight bg-transparent border-b border-civic-green w-full focus:outline-none"
                                value={editForm.title}
                                onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                style={{ color: 'var(--text-color)' }}
                            />
                        ) : (
                            <h2 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-color)' }}>{complaint.title}</h2>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {isOwner && (
                            <>
                                {isEditing ? (
                                    <>
                                        <button
                                            onClick={handleUpdate}
                                            disabled={loading}
                                            className="px-6 py-2 bg-civic-green text-black rounded-xl text-xs font-black uppercase tracking-widest shadow-neon hover:scale-105 transition-all"
                                        >
                                            {loading ? 'Saving...' : 'Save'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsEditing(false);
                                                setExistingImages(complaint.images || []);
                                                setNewPhotos([]);
                                                setCurrentMainImage(null);
                                            }}
                                            className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-gray-100 dark:bg-white/5"
                                        >
                                            Cancel
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="px-4 py-2 bg-civic-green/10 text-civic-green border border-civic-green/20 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-civic-green hover:text-black transition-all"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirm(true)}
                                            className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-red-500 bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
                                        >
                                            Delete
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-all text-2xl">×</button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {deleteConfirm ? (
                        <div className="h-full flex flex-col items-center justify-center text-center py-8 sm:py-12">
                            <div className="text-5xl sm:text-6xl mb-6">🗑️</div>
                            <h3 className="text-xl sm:text-2xl font-black mb-2" style={{ color: 'var(--text-color)' }}>Purge Complaint?</h3>
                            <p className="text-sm opacity-60 mb-8 max-w-sm px-4">This action is irreversible. The submission will be permanently removed from the civic registry.</p>
                            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-4">
                                <button
                                    onClick={() => setDeleteConfirm(false)}
                                    className="flex-1 sm:flex-none px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs bg-gray-100 dark:bg-white/5"
                                >
                                    Abort
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={loading}
                                    className="flex-1 sm:flex-none px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs bg-red-600 text-white shadow-lg"
                                >
                                    {loading ? 'Purging...' : 'Confirm Destruction'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                {/* Image Gallery Section */}
                                <div className="space-y-4">
                                    <div className="aspect-video rounded-2xl overflow-hidden border bg-black/5 relative group" style={{ borderColor: 'var(--card-border)' }}>
                                        {mainView ? (
                                            <img
                                                src={mainView}
                                                alt="Main view"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-6xl opacity-10">📸</div>
                                        )}
                                        {isEditing && (
                                            <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-60 hover:opacity-100 transition-opacity cursor-pointer text-white border-2 border-dashed border-white/20 m-4 rounded-xl">
                                                <span className="text-3xl mb-2">➕</span>
                                                <span className="text-xs font-black uppercase tracking-widest">Append Photos</span>
                                                <input type="file" multiple className="hidden" onChange={handleAddPhotos} accept="image/*" />
                                            </label>
                                        )}
                                    </div>

                                    {(allImages.length > 0 || isEditing) && (
                                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                                            {existingImages.map((img, i) => (
                                                <div
                                                    key={`exist-${i}`}
                                                    className={`relative aspect-square rounded-xl overflow-hidden border cursor-pointer group transition-all ${mainView === img ? 'ring-2 ring-civic-green scale-[0.98]' : 'hover:scale-[1.02]'}`}
                                                    style={{ borderColor: 'var(--card-border)' }}
                                                    onClick={() => setCurrentMainImage(img)}
                                                >
                                                    <img src={img} className="w-full h-full object-cover" alt="" />
                                                    {isEditing && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                removeExistingImage(i);
                                                            }}
                                                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                                                        >
                                                            ×
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            {newPhotos.map((file, i) => {
                                                const photoUrl = URL.createObjectURL(file);
                                                return (
                                                    <div
                                                        key={`new-${i}`}
                                                        className={`relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer group transition-all ${mainView === photoUrl ? 'border-civic-green ring-2 ring-civic-green/20 scale-[0.98]' : 'border-civic-green/30 hover:scale-[1.02]'}`}
                                                        onClick={() => setCurrentMainImage(photoUrl)}
                                                    >
                                                        <img src={photoUrl} className="w-full h-full object-cover" alt="" />
                                                        <span className="absolute bottom-1 left-1 bg-civic-green text-black text-[8px] font-black px-1.5 rounded uppercase">NEW</span>
                                                        {isEditing && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    removeNewPhoto(i);
                                                                }}
                                                                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                                                            >
                                                                ×
                                                            </button>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                            {isEditing && (
                                                <label className="aspect-square rounded-xl border-2 border-dashed border-black/10 flex items-center justify-center cursor-pointer hover:border-civic-green/40 hover:bg-civic-green/5 transition-all text-2xl opacity-40 hover:opacity-100">
                                                    <span>+</span>
                                                    <input type="file" multiple className="hidden" onChange={handleAddPhotos} accept="image/*" />
                                                </label>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="card p-6 border-opacity-50">
                                    <h3 className="text-xs uppercase font-black tracking-[0.2em] opacity-40 mb-4">Details</h3>
                                    {isEditing ? (
                                        <div className="space-y-4">
                                            <textarea
                                                className="w-full bg-black/5 border border-white/10 rounded-xl p-4 text-sm resize-none focus:border-civic-green/50 outline-none transition-all"
                                                rows={4}
                                                value={editForm.description}
                                                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                                placeholder="Update description..."
                                            />
                                            <div className="grid grid-cols-2 gap-4">
                                                <select
                                                    className="bg-black/5 border border-white/10 rounded-xl p-3 text-sm outline-none"
                                                    value={editForm.category}
                                                    onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                                                >
                                                    {['Road Damage', 'Garbage', 'Water Supply', 'Electricity', 'Sewage', 'Street Light', 'Park', 'Other'].map(c => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                </select>
                                                <select
                                                    className="bg-black/5 border border-white/10 rounded-xl p-3 text-sm outline-none"
                                                    value={editForm.urgency}
                                                    onChange={e => setEditForm({ ...editForm, urgency: e.target.value })}
                                                >
                                                    {['Low', 'Medium', 'High'].map(u => (
                                                        <option key={u} value={u}>{u}</option>
                                                    ))}
                                                </select>
                                                <select
                                                    className="bg-black/5 border border-white/10 rounded-xl p-3 text-sm outline-none"
                                                    value={editForm.status}
                                                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                                >
                                                    {['Pending', 'In Progress', 'Resolved'].map(s => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <p className="text-sm opacity-60 leading-relaxed mb-6">{complaint.description}</p>
                                            <div className="flex items-center gap-4">
                                                <span className="text-xl opacity-40">🏷️</span>
                                                <div>
                                                    <p className="text-[10px] uppercase font-black opacity-40 tracking-widest">Type</p>
                                                    <p className="font-bold">{complaint.category}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-xl opacity-40">⚠️</span>
                                                <div>
                                                    <p className="text-[10px] uppercase font-black opacity-40 tracking-widest">Priority</p>
                                                    <p className={`font-bold ${complaint.urgency === 'High' ? 'text-red-500' : complaint.urgency === 'Medium' ? 'text-yellow-500' : 'text-civic-green'}`}>
                                                        {complaint.urgency}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-xl opacity-40">🏷️</span>
                                                <div>
                                                    <p className="text-[10px] uppercase font-black opacity-40 tracking-widest">Status</p>
                                                    <p className={`font-bold px-3 py-1 rounded-full text-[10px] uppercase tracking-wider inline-block mt-1 ${statusBadge(complaint.status)}`}>
                                                        {complaint.status}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-xl opacity-40">📅</span>
                                                <div>
                                                    <p className="text-[10px] uppercase font-black opacity-40 tracking-widest">Reported On</p>
                                                    <p className="font-bold">{new Date(complaint.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-4">
                                                <span className="text-xl opacity-40">📍</span>
                                                <div>
                                                    <p className="text-[10px] uppercase font-black opacity-40 tracking-widest">Address</p>
                                                    <p className="font-bold text-sm">{complaint.fullAddress}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="card p-6 border-opacity-50">
                                    <h3 className="text-xs uppercase font-black tracking-[0.2em] opacity-40 mb-4">Location</h3>
                                    <div className="h-64 rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--card-border)' }}>
                                        <ManualMap
                                            center={[complaint.latitude, complaint.longitude]}
                                            markerPos={[complaint.latitude, complaint.longitude]}
                                        />
                                    </div>
                                </div>

                                {isEditing ? (
                                    <div className="flex gap-4">
                                        {/* Helper message removed as Save is now in header */}
                                    </div>
                                ) : (
                                    <div className="card p-6 border-opacity-50">
                                        <h3 className="text-xs uppercase font-black tracking-[0.2em] opacity-40 mb-4">Discussion ({complaint.comments?.length || 0})</h3>

                                        {/* Add Comment Section */}
                                        <div className="mb-6 flex gap-3">
                                            <input
                                                type="text"
                                                placeholder="Add a comment..."
                                                className="flex-1 bg-black/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-civic-green/50 transition-all"
                                                id="commentInput"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && e.target.value.trim()) {
                                                        onUpdate(complaint, 'comment', e.target.value);
                                                        e.target.value = '';
                                                    }
                                                }}
                                            />
                                            <button
                                                onClick={() => {
                                                    const input = document.getElementById('commentInput');
                                                    if (input.value.trim()) {
                                                        onUpdate(complaint, 'comment', input.value);
                                                        input.value = '';
                                                    }
                                                }}
                                                className="px-4 py-2 bg-civic-green text-black text-[10px] font-black uppercase tracking-widest rounded-xl shadow-neon hover:scale-105 transition-all"
                                            >
                                                Post
                                            </button>
                                        </div>

                                        {complaint.comments?.length > 0 ? (
                                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                                {[...complaint.comments].reverse().map((comment, i) => (
                                                    <div key={i} className="flex gap-3">
                                                        <div className="w-8 h-8 min-w-[32px] rounded-lg bg-civic-green/10 flex items-center justify-center text-[10px] font-bold">
                                                            {comment.userName?.[0] || 'U'}
                                                        </div>
                                                        <div className="flex-1 bg-black/5 rounded-2xl p-3">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <p className="font-bold text-[11px]">{comment.userName}</p>
                                                                <p className="text-[9px] opacity-40 uppercase tracking-tighter">
                                                                    {new Date(comment.timestamp || comment.createdAt).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                            <p className="text-xs opacity-80">{comment.content || comment.text}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 opacity-40">
                                                <p className="text-sm italic">No discussions yet.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

const MyComplaints = () => {
    const { user } = useAuth();
    const [issues, setIssues] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [selectedComplaint, setSelectedComplaint] = useState(null)
    const [statusFilter, setStatusFilter] = useState('All')
    const [isNearby, setIsNearby] = useState(false)
    const [location, setLocation] = useState(null)
    const [directDelete, setDirectDelete] = useState(false)

    const fetchIssues = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const params = {}
            if (statusFilter !== 'All') {
                params.status = statusFilter
            }

            if (isNearby && location) {
                const { data } = await api.get('/issues/nearby', {
                    params: {
                        lat: location.lat,
                        lng: location.lng,
                        radius: 30, // Updated to 30km
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
    }, [isNearby, location, statusFilter])

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
                if (selectedComplaint?._id === complaint._id) {
                    setSelectedComplaint(prev => ({ ...prev, ...data.issue }));
                }
            } catch (err) {
                console.error('Action failed', err);
            }
            return;
        }
        setDirectDelete(action === true);
        setSelectedComplaint(complaint);
    }

    const handleUpdate = async (updatedIssue, action, payload) => {
        if (action === 'comment') {
            try {
                const { data } = await api.post(`/issues/${updatedIssue._id}/comment`, {
                    text: payload,
                    userName: user?.name || 'Anonymous'
                });
                const newIssue = { ...updatedIssue, ...data.issue };
                setIssues(prev => prev.map(iss => iss._id.toString() === updatedIssue._id.toString() ? newIssue : iss));
                if (selectedComplaint?._id?.toString() === updatedIssue._id.toString()) {
                    setSelectedComplaint(newIssue);
                }
            } catch (err) {
                console.error('Comment failed', err);
            }
            return;
        }
        setIssues(prev => prev.map(iss => iss._id.toString() === updatedIssue._id.toString() ? updatedIssue : iss));
        setSelectedComplaint(updatedIssue);
        // Re-fetch for guaranteed sync with server state (populated fields, etc)
        fetchIssues();
    }

    const handleDelete = (id) => {
        setIssues(prev => prev.filter(iss => iss._id !== id));
        setSelectedComplaint(null);
        setDirectDelete(false);
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

                        <button
                            onClick={toggleNearbyFilter}
                            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${isNearby ? 'bg-civic-green/10 text-civic-green' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 opacity-70 hover:opacity-100'}`}
                        >
                            <span className="flex items-center gap-2">📍 Nearby (30km)</span>
                            {isNearby && <div className="w-2 h-2 rounded-full bg-civic-green animate-pulse" />}
                        </button>

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
                            onDelete={(c) => handleOpenDetail(c, true)}
                            currentUser={user}
                        />
                    ))}
                </div>
            )}

            <AnimatePresence>
                {selectedComplaint && (
                    <DetailModal
                        complaint={selectedComplaint}
                        onClose={() => {
                            setSelectedComplaint(null);
                            setDirectDelete(false);
                        }}
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                        initialDeleteMode={directDelete}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

export default MyComplaints
