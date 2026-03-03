import React, { useState, useCallback, useEffect, useMemo, useRef, Component } from 'react'
import L from 'leaflet'
import api from '../api/axios'

import { ManualMap } from '../components/SharedComponents'

const categories = ['Road Damage', 'Garbage', 'Water Supply', 'Electricity', 'Sewage', 'Street Light', 'Park', 'Other']
const DEFAULT_COORDS = [11.6643, 78.1460]; // Salem, TN (Default)

class LocalErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    componentDidCatch(error, errorInfo) { console.error("ReportIssue UI Crash:", error, errorInfo); }
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-black/5">
                    <div className="text-4xl mb-4">⚙️</div>
                    <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-color)' }}>Component Sync Failure</h2>
                    <p className="opacity-60 mb-8 max-w-md text-sm">
                        A conflict was detected in the component logic.
                        We have isolated the failure to protect the rest of the application.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-8 py-3 bg-civic-green text-black font-bold rounded-xl shadow-lg hover:scale-105 transition-all"
                    >
                        Reset Application State
                    </button>
                    <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-left overflow-auto max-w-2xl w-full">
                        <code className="text-red-500 text-[10px] font-mono whitespace-pre-wrap">
                            {this.state.error?.stack || this.state.error?.toString()}
                        </code>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

const ReportIssue = () => {
    const [form, setForm] = useState({
        title: '',
        description: '',
        category: '',
        fullAddress: '',
        landmark: '',
        urgency: 'Low',
        latitude: null,
        longitude: null
    });
    const [images, setImages] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [mapCenter, setMapCenter] = useState(DEFAULT_COORDS);
    const [locating, setLocating] = useState(false);

    const activeGeoRef = useRef(0);
    const geoTimeoutRef = useRef(null);

    const onLocationSelect = useCallback((lat, lng) => {
        setForm(prev => ({ ...prev, latitude: lat, longitude: lng }));
        setMapCenter([lat, lng]);
    }, []);

    const detectLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            return;
        }

        const requestId = Date.now();
        activeGeoRef.current = requestId;
        setLocating(true);
        setError('');

        if (geoTimeoutRef.current) clearTimeout(geoTimeoutRef.current);
        geoTimeoutRef.current = setTimeout(() => {
            if (activeGeoRef.current === requestId) {
                setLocating(false);
                setError('Location access timed out.');
            }
        }, 12000);

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                if (activeGeoRef.current !== requestId) return;
                if (geoTimeoutRef.current) clearTimeout(geoTimeoutRef.current);

                const { latitude, longitude } = pos.coords;
                onLocationSelect(latitude, longitude);
                setLocating(false);
            },
            () => {
                if (activeGeoRef.current !== requestId) return;
                if (geoTimeoutRef.current) clearTimeout(geoTimeoutRef.current);
                setError('Location access denied or unavailable.');
                setLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }, [onLocationSelect]);

    useEffect(() => {
        detectLocation();
        return () => {
            activeGeoRef.current = 0;
            if (geoTimeoutRef.current) clearTimeout(geoTimeoutRef.current);
        };
    }, [detectLocation]);

    const handleFormUpdate = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        const validFiles = [];
        const validPreviews = [];

        files.forEach(file => {
            if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif'].includes(file.type)) return;
            if (file.size > 10 * 1024 * 1024) return;
            validFiles.push(file);
            validPreviews.push(URL.createObjectURL(file));
        });

        setImages(prev => [...prev, ...validFiles]);
        setPreviews(prev => [...prev, ...validPreviews]);
    };

    const removeImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => {
            URL.revokeObjectURL(prev[index]);
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');

        if (!form.title || !form.category || !form.latitude) {
            setError('Required fields missing. Please mark location on map.');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            Object.entries(form).forEach(([k, v]) => {
                if (v !== null && v !== undefined) formData.append(k, v);
            });
            images.forEach(img => formData.append('images', img));

            await api.post('/issues', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setSuccess('Issue reported successfully. Community updated.');
            setForm({
                title: '', description: '', category: '', fullAddress: '',
                landmark: '', urgency: 'Low', latitude: null, longitude: null
            });
            setImages([]); setPreviews([]);
            setMapCenter(DEFAULT_COORDS);
        } catch (err) {
            setError(err.response?.data?.message || 'Transmission failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <LocalErrorBoundary>
            <div className="main-container min-h-screen">
                <div className="text-center mb-8 sm:mb-12">
                    <h2 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tighter" style={{ color: 'var(--text-color)' }}>
                        Civic <span className="text-civic-green">Report</span>
                    </h2>
                    <p className="opacity-40 font-mono text-[10px] sm:text-xs uppercase mt-2 font-black tracking-widest">Digital Civic Registry — Operational</p>
                </div>

                <div className="card p-4 sm:p-8">
                    <form onSubmit={handleSubmit}>
                        {(error || success) && (
                            <div className={`mb-8 p-4 rounded-xl text-sm font-bold border ${error ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-civic-green/10 border-civic-green/20 text-civic-green'
                                }`}>
                                {error ? '⚠️ ' : '✅ '}{error || success}
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
                            <div className="space-y-6">
                                <section>
                                    <label className="label">Issue Identifier</label>
                                    <input
                                        name="title"
                                        required
                                        value={form.title}
                                        onChange={handleFormUpdate}
                                        className="input-field"
                                        placeholder="Brief title of the problem"
                                    />
                                </section>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <section>
                                        <label className="label">Sector</label>
                                        <select
                                            name="category"
                                            required
                                            value={form.category}
                                            onChange={handleFormUpdate}
                                            className="input-field appearance-none"
                                        >
                                            <option value="">-- UNKNOWN --</option>
                                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </section>
                                    <section>
                                        <label className="label">Priority</label>
                                        <select
                                            name="urgency"
                                            value={form.urgency}
                                            onChange={handleFormUpdate}
                                            className="input-field appearance-none"
                                        >
                                            <option value="Low">Low</option>
                                            <option value="Medium">Medium</option>
                                            <option value="High">High</option>
                                        </select>
                                    </section>
                                </div>

                                <section>
                                    <label className="label">Physical Signature</label>
                                    <input
                                        name="fullAddress"
                                        required
                                        value={form.fullAddress}
                                        onChange={handleFormUpdate}
                                        className="input-field"
                                        placeholder="Street address or relative description"
                                    />
                                </section>

                                <section>
                                    <label className="label">Data Integrity / Description</label>
                                    <textarea
                                        name="description"
                                        required
                                        rows={4}
                                        value={form.description}
                                        onChange={handleFormUpdate}
                                        className="input-field resize-none h-32"
                                        placeholder="Full context of the observed issue..."
                                    />
                                </section>

                                <div className="p-4 bg-civic-green/5 border rounded-2xl flex flex-col gap-4" style={{ borderColor: 'var(--card-border)' }}>
                                    <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest">
                                        <span className="opacity-40">Localization</span>
                                        <button
                                            type="button"
                                            onClick={detectLocation}
                                            disabled={locating}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${locating
                                                ? 'bg-civic-green/20 border-civic-green animate-pulse text-civic-green'
                                                : 'bg-civic-green/5 border-civic-green/20 text-civic-green hover:bg-civic-green/10'
                                                }`}
                                        >
                                            <span className="text-[12px]">{locating ? '📡' : '🎯'}</span>
                                            {locating ? 'Syncing...' : 'Get Location'}
                                        </button>
                                    </div>
                                    <div className="flex justify-between sm:justify-start gap-4 sm:gap-8 font-mono text-[10px] sm:text-[11px]">
                                        <div><span className="opacity-40">LAT:</span> {form.latitude?.toFixed(6) || '---.------'}</div>
                                        <div><span className="opacity-40">LNG:</span> {form.longitude?.toFixed(6) || '---.------'}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <section>
                                    <h3 className="text-[10px] uppercase font-black tracking-widest opacity-40 mb-4 px-1">Tactical Visualization</h3>
                                    <div className="h-[250px] sm:h-[350px] w-full rounded-2xl overflow-hidden border relative bg-black/5" style={{ borderColor: 'var(--card-border)' }}>
                                        {/* MANUAL MAP IMPLEMENTATION */}
                                        <ManualMap
                                            center={mapCenter}
                                            markerPos={{ lat: form.latitude, lng: form.longitude }}
                                            onSelect={onLocationSelect}
                                        />
                                        <div className="absolute top-2 right-2 z-[10] p-2 bg-black/50 text-[9px] font-bold text-white rounded uppercase tracking-tighter pointer-events-none">
                                            Interactive Grid
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <h3 className="text-[10px] uppercase font-black tracking-widest opacity-40 mb-4 px-1">Evidence Archive</h3>
                                    <div className="relative group p-6 sm:p-8 border-2 border-dashed rounded-2xl bg-civic-green/5 flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden hover:bg-civic-green/10"
                                        style={{ borderColor: 'var(--card-border)' }}>
                                        <input
                                            type="file" multiple onChange={handleFileChange}
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                            accept="image/png, image/jpeg, image/gif"
                                        />
                                        <div className="text-3xl opacity-30 mb-2">📸</div>
                                        <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest text-center">Open Submission Port</p>
                                        <p className="text-[9px] opacity-40 mt-1 uppercase tracking-tighter text-center">Max 10MB JPG/PNG/GIF</p>
                                    </div>

                                    {previews.length > 0 && (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
                                            {previews.map((url, i) => (
                                                <div key={url} className="aspect-square relative rounded-lg overflow-hidden border bg-black/5" style={{ borderColor: 'var(--card-border)' }}>
                                                    <img src={url} alt="Evidence" className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeImage(i)}
                                                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center shadow-lg"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            </div>
                        </div>

                        <div className="mt-12 flex justify-center px-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full max-w-sm py-4 rounded-xl font-black uppercase tracking-widest text-xs sm:text-sm transition-all shadow-neon ${loading ? 'opacity-50 cursor-not-allowed bg-gray-500' : 'bg-civic-green text-black hover:scale-[1.02] active:scale-95'
                                    }`}
                            >
                                {loading ? 'Transmitting...' : 'Authorize Submission'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </LocalErrorBoundary>
    );
};

export default ReportIssue;
