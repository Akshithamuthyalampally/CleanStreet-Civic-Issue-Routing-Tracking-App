import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

const statusBadge = (status) => {
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

const VolunteerCard = ({ complaint }) => {
    return (
        <motion.div
            layout
            className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 hover:shadow-2xl transition-all duration-500 flex flex-col h-full"
            whileHover={{ y: -8 }}
        >
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusBadge(complaint.status)}`}>
                        {complaint.status}
                    </span>
                    <span className="text-[10px] font-bold opacity-40 uppercase tracking-tighter">
                        {new Date(complaint.createdAt).toLocaleDateString()}
                    </span>
                </div>

                <div className="aspect-video rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 mb-4 border dark:border-zinc-800">
                    {complaint.images?.[0] ? (
                        <img src={complaint.images[0]} alt={complaint.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">📸</div>
                    )}
                </div>

                <h3 className="font-black text-xl tracking-tight mb-2 line-clamp-1" style={{ color: 'var(--text-color)' }}>{complaint.title}</h3>
                <p className="text-sm opacity-60 line-clamp-2 leading-relaxed h-10 italic mb-4">"{complaint.description}"</p>

                <div className="flex items-center gap-2 text-[11px] font-bold opacity-60 mb-6 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <span className="text-blue-500">📍</span>
                    <span className="line-clamp-1">{complaint.fullAddress}</span>
                </div>

                <div className="mt-auto flex gap-3">
                    <button className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20">
                        Take Action
                    </button>
                    <button className="px-4 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-all">
                        🗺️
                    </button>
                </div>
            </div>
        </motion.div>
    )
}

const VolunteerDashboard = () => {
    const { user } = useAuth()
    const [issues, setIssues] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('All')
    const [location, setLocation] = useState(null)
    const [error, setError] = useState(null)

    const fetchNearbyIssues = useCallback(async (lat, lng) => {
        setLoading(true)
        try {
            const res = await api.get(`/issues/nearby`, {
                params: {
                    lat,
                    lng,
                    radius: 30,
                    status: filter
                }
            })
            setIssues(res.data)
        } catch (err) {
            console.error('Error fetching nearby issues:', err)
            setError('Failed to fetch nearby complaints.')
        } finally {
            setLoading(false)
        }
    }, [filter])

    useEffect(() => {
        // Get user location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords
                    setLocation({ lat: latitude, lng: longitude })
                    fetchNearbyIssues(latitude, longitude)
                },
                (err) => {
                    console.warn('Geolocation failed, using default location (mock)', err)
                    // Mock location (e.g., center of a city)
                    const mockLat = 12.9716
                    const mockLng = 77.5946
                    setLocation({ lat: mockLat, lng: mockLng })
                    fetchNearbyIssues(mockLat, mockLng)
                }
            )
        } else {
            setError('Geolocation is not supported by this browser.')
            setLoading(false)
        }
    }, [fetchNearbyIssues])

    const filterOptions = ['All', 'Pending', 'In Progress', 'Resolved']

    return (
        <div className="main-container min-h-screen pb-20 max-w-7xl mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                <div>
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: 'var(--text-color)' }}>
                        Volunteer <span className="text-blue-500">Dashboard</span>
                    </h2>
                    <p className="opacity-60 text-base sm:text-lg font-medium mt-2">
                        Displaying issues within <span className="text-blue-500 font-bold">30km</span> of your grid position.
                    </p>
                </div>

                <div className="flex gap-2 bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                    {filterOptions.map(opt => (
                        <button
                            key={opt}
                            onClick={() => setFilter(opt)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === opt
                                ? 'bg-white dark:bg-zinc-700 shadow-md scale-[1.02]'
                                : 'opacity-40 hover:opacity-100'}`}
                            style={{ color: filter === opt ? 'var(--text-color)' : '' }}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-40">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="opacity-60 mt-6 font-bold uppercase tracking-widest text-sm animate-pulse text-blue-500">Triangulating Nearby Issues...</p>
                </div>
            ) : error ? (
                <div className="card p-8 bg-red-500/10 border-red-500/20 text-red-500 flex items-center gap-4">
                    <span className="text-3xl">⚠️</span>
                    <p className="font-bold uppercase tracking-widest text-sm">{error}</p>
                </div>
            ) : issues.length === 0 ? (
                <div className="card py-32 text-center border-dashed opacity-50 flex flex-col items-center">
                    <div className="text-6xl sm:text-8xl mb-6">🛡️</div>
                    <h3 className="text-xl sm:text-2xl font-black opacity-40 uppercase tracking-tighter">Area Secure</h3>
                    <p className="mt-2 font-medium text-sm sm:text-base px-6">No reported issues found within your operational radius.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {issues.map((issue) => (
                        <VolunteerCard key={issue._id} complaint={issue} />
                    ))}
                </div>
            )}
        </div>
    )
}

export default VolunteerDashboard
