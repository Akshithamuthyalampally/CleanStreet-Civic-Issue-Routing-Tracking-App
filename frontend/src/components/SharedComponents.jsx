import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

// CDN-backed assets for maximum reliability
const MARKER_ICON_2X = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png';
const MARKER_ICON = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png';
const MARKER_SHADOW = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png';

export const statusBadge = (status) => {
    const s = status?.toLowerCase();
    switch (s) {
        case 'resolved':
            return 'bg-green-500 text-white border-green-600 shadow-[0_0_15px_rgba(34,197,94,0.4)]';
        case 'in progress':
            return 'bg-blue-500 text-white border-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.4)]';
        case 'pending':
            return 'bg-orange-500 text-white border-orange-600 shadow-[0_0_15px_rgba(249,115,22,0.4)]';
        default:
            return 'bg-zinc-500 text-white border-zinc-600 shadow-sm';
    }
}

export const ManualMap = ({ center, markerPos, onSelect }) => {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);

    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return;

        const coords = Array.isArray(center) ? center : [center.lat, center.lng];
        const map = L.map(mapContainerRef.current, {
            center: coords,
            zoom: 15,
            scrollWheelZoom: true,
            zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        if (onSelect) {
            map.on('click', (e) => {
                const { lat, lng } = e.latlng;
                onSelect(lat, lng);
            });
        }

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

        if (center) {
            const coords = Array.isArray(center) ? center : [center.lat, center.lng];
            map.setView(coords, map.getZoom(), { animate: true });
        }

        const mPos = Array.isArray(markerPos) ? markerPos : (markerPos?.lat ? [markerPos.lat, markerPos.lng] : null);

        if (mPos && mPos[0] && mPos[1]) {
            if (markerRef.current) {
                markerRef.current.setLatLng(mPos);
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
                markerRef.current = L.marker(mPos, { icon: customIcon }).addTo(map);
            }
        } else if (markerRef.current) {
            markerRef.current.remove();
            markerRef.current = null;
        }
    }, [center, markerPos]);

    return <div ref={mapContainerRef} className="w-full h-full bg-black/10" style={{ zIndex: 0 }} />;
};

export const DetailModal = ({ complaint, onClose, onUpdate, onDelete, initialDeleteMode = false }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ status: 'Pending', ...complaint });
    const [existingImages, setExistingImages] = useState(complaint.images || []);
    const [newPhotos, setNewPhotos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(initialDeleteMode);
    const [currentMainImage, setCurrentMainImage] = useState(null);

    useEffect(() => {
        setEditForm({ status: 'Pending', ...complaint });
        setExistingImages(complaint.images || []);
    }, [complaint]);

    if (!complaint) return null;

    const isOwner = user && (user.id === complaint.userId || user.id === complaint.userId?._id);
    const isVolunteer = user?.role === 'volunteer';
    const isAssigned = complaint.assignedVolunteer?._id === user?.id || complaint.assignedVolunteer === user?.id;

    const canEditDetails = isOwner;
    const canUpdateStatus = isVolunteer && isAssigned;
    const canEdit = canEditDetails || canUpdateStatus;

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
            alert(err.response?.data?.message || 'Update failed');
        } finally {
            setLoading(false);
        }
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
    };

    const handleAddPhotos = (e) => {
        const files = Array.from(e.target.files);
        setNewPhotos(prev => [...prev, ...files]);
        if (files.length > 0) setCurrentMainImage(URL.createObjectURL(files[0]));
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

    const allImages = [...existingImages, ...newPhotos.map(p => URL.createObjectURL(p))];
    const mainView = currentMainImage || allImages[0];

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
                        {isEditing && !isVolunteer ? (
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
                        {canEdit && (
                            <>
                                {isEditing ? (
                                    <>
                                        <button onClick={handleUpdate} disabled={loading} className="px-6 py-2 bg-civic-green text-black rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all">
                                            {loading ? 'Saving...' : 'Save'}
                                        </button>
                                        <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-gray-100 dark:bg-white/5">Cancel</button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-civic-green/10 text-civic-green border border-civic-green/20 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-civic-green hover:text-black transition-all">
                                            {isVolunteer ? 'Manage Status' : 'Edit'}
                                        </button>
                                        {isOwner && <button onClick={() => setDeleteConfirm(true)} className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-red-500 bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all">Delete</button>}
                                    </>
                                )}
                            </>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-all text-2xl">×</button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {deleteConfirm ? (
                        <div className="h-full flex flex-col items-center justify-center text-center py-8">
                            <h3 className="text-2xl font-black mb-2" style={{ color: 'var(--text-color)' }}>Purge Complaint?</h3>
                            <button onClick={handleDelete} className="px-8 py-3 rounded-xl bg-red-600 text-white mt-4 font-bold uppercase tracking-widest text-xs">Confirm Destruction</button>
                            <button onClick={() => setDeleteConfirm(false)} className="mt-4 text-xs opacity-60">Cancel</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="aspect-video rounded-2xl overflow-hidden border bg-black/5 relative group" style={{ borderColor: 'var(--card-border)' }}>
                                    {mainView ? <img src={mainView} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center opacity-10 text-6xl">📸</div>}
                                </div>
                                <div className="grid grid-cols-5 gap-2">
                                    {allImages.map((img, i) => (
                                        <div key={i} className={`aspect-square rounded-lg overflow-hidden border cursor-pointer ${mainView === img ? 'ring-2 ring-civic-green' : ''}`} onClick={() => setCurrentMainImage(img)}>
                                            <img src={img} className="w-full h-full object-cover" alt="" />
                                        </div>
                                    ))}
                                    {isEditing && !isVolunteer && (
                                        <label className="aspect-square rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer opacity-40">
                                            <span>+</span>
                                            <input type="file" multiple className="hidden" onChange={handleAddPhotos} />
                                        </label>
                                    )}
                                </div>
                                <div className="card p-6">
                                    <h3 className="text-xs uppercase font-black opacity-40 mb-4">Details</h3>
                                    {isEditing ? (
                                        <div className="space-y-4">
                                            {!isVolunteer && <textarea className="w-full bg-black/5 border rounded-xl p-4 text-sm" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />}
                                            <div className="grid grid-cols-2 gap-4">
                                                <select className="bg-black/5 rounded-xl p-2 text-sm" value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })} disabled={isVolunteer}>
                                                    {['Road Damage', 'Garbage', 'Water Supply', 'Electricity', 'Sewage', 'Street Light', 'Park', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                                <select className="bg-black/5 rounded-xl p-2 text-sm" value={editForm.urgency} onChange={e => setEditForm({ ...editForm, urgency: e.target.value })} disabled={isVolunteer}>
                                                    {['Low', 'Medium', 'High'].map(u => <option key={u} value={u}>{u}</option>)}
                                                </select>
                                                <select className="bg-black/5 rounded-xl p-2 text-sm col-span-2 border-civic-green/40" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} disabled={!isVolunteer}>
                                                    {['Pending', 'In Progress', 'Resolved'].map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <p className="text-sm opacity-60 italic">"{complaint.description}"</p>
                                            <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest">
                                                <span className={`px-3 py-1 rounded-full ${statusBadge(complaint.status)}`}>{complaint.status}</span>
                                                <span className={`px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-800`}>{complaint.urgency}</span>
                                                <span className={`px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-800`}>{complaint.category}</span>
                                            </div>
                                            {complaint.assignedVolunteer ? (
                                                <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-xl">🛡️</div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                                                                    {complaint.assignedBy ? 'Assigned by Admin' : 'Mission Hero'}
                                                                </p>
                                                                <span className="px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[8px] font-black uppercase border border-blue-500/20">Verified Hero</span>
                                                            </div>
                                                            <p className="text-sm font-bold" style={{ color: 'var(--text-color)' }}>
                                                                {complaint.assignedVolunteer.name}
                                                                <span className="ml-2 opacity-40 font-black tracking-tighter">(ID: {complaint.assignedVolunteer.volunteerId || 'N/A'})</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Give Feedback Button for Citizens on Resolved Issues */}
                                                    {user?.role === 'citizen' && complaint.status?.toLowerCase() === 'resolved' && (
                                                        <motion.button
                                                            whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)' }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={() => navigate(`/issue/${complaint._id}/feedback`)}
                                                            className="px-4 py-2 bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                                                        >
                                                            <span>Give Feedback</span>
                                                            <span className="text-xs">✨</span>
                                                        </motion.button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10 flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-xl">⏳</div>
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Mission Status</p>
                                                        <p className="text-sm font-bold" style={{ color: 'var(--text-color)' }}>
                                                            Awaiting volunteer acceptance
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="h-64 rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--card-border)' }}>
                                    <ManualMap center={[complaint.latitude, complaint.longitude]} markerPos={[complaint.latitude, complaint.longitude]} />
                                </div>
                                <div className="card p-6">
                                    <h3 className="text-xs uppercase font-black opacity-40 mb-4">Discussion ({complaint.comments?.length || 0})</h3>
                                    <div className="flex gap-2 mb-4">
                                        <input id="modalCommentInput" type="text" className="flex-1 bg-black/5 rounded-lg px-4 py-2 text-sm" placeholder="Add a comment..." />
                                        <button onClick={() => {
                                            const input = document.getElementById('modalCommentInput');
                                            if (input.value.trim()) { onUpdate(complaint, 'comment', input.value.trim()); input.value = ''; }
                                        }} className="px-4 py-2 bg-civic-green text-black rounded-lg text-[10px] font-black uppercase">Post</button>
                                    </div>
                                    <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2">
                                        {(complaint.comments || []).slice().reverse().map((c, i) => (
                                            <div key={i} className="flex gap-2">
                                                <div className="w-6 h-6 rounded bg-civic-green/10 flex items-center justify-center text-[8px] font-bold">{c.userName?.[0]}</div>
                                                <div className="flex-1 bg-black/5 rounded-lg p-2">
                                                    <p className="text-[10px] font-bold">{c.userName}</p>
                                                    <p className="text-xs opacity-70">{c.content || c.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};
