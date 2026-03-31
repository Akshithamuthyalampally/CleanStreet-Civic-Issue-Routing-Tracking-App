import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { statusBadge } from '../components/SharedComponents'
import BackButton from '../components/BackButton'

// statusBadge moved to SharedComponents

const VolunteerCard = ({ complaint, onAction, currentUser }) => {
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

                <div className="mt-auto">
                    {complaint.assignedVolunteer ? (
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-col gap-1">
                                <div className="text-[10px] font-black uppercase tracking-widest opacity-40 flex items-center gap-2 px-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                    {complaint.assignedBy ? (
                                        <>
                                            <span>Assigned by Admin:</span>
                                            <span className="text-blue-500">{complaint.assignedVolunteer.name}</span>
                                            <span className="opacity-50">(ID: {complaint.assignedVolunteer.volunteerId || 'N/A'})</span>
                                        </>
                                    ) : (
                                        <>Assigned to: {complaint.assignedVolunteer.name || 'You'}</>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-3">
                                {complaint.assignedVolunteer._id === currentUser.id || complaint.assignedVolunteer === currentUser.id ? (
                                    <div className="flex gap-2 w-full">
                                        <button
                                            onClick={() => onAction(complaint._id, 'reject')}
                                            className="flex-1 py-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                        >
                                            Drop
                                        </button>
                                        <button
                                            onClick={() => onAction(complaint._id, 'status')}
                                            className="flex-1 py-3 bg-civic-green/20 hover:bg-civic-green text-civic-green hover:text-black border border-civic-green/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                        >
                                            Update Status
                                        </button>
                                    </div>
                                ) : (
                                    <button disabled className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 opacity-50 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-not-allowed text-zinc-400">
                                        Occupied
                                    </button>
                                )}
                                <button className="px-4 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-all">
                                    🗺️
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-3">
                            <button
                                onClick={() => onAction(complaint._id, 'accept')}
                                className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20"
                            >
                                Accept Mission
                            </button>
                            <button className="px-4 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-all">
                                🗺️
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    )
}

const VolunteerDashboard = () => {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [issues, setIssues] = useState([])
    const [stats, setStats] = useState({ pending: 0, inProgress: 0, resolved: 0 })
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('All')
    const [priorityFilter, setPriorityFilter] = useState('All')
    const [location, setLocation] = useState(null)
    const [error, setError] = useState(null)

    const fetchStats = useCallback(async () => {
        try {
            const res = await api.get('/issues')
            const allIssues = res.data
            setStats({
                pending: allIssues.filter(i => i.status?.trim().toLowerCase() === 'pending').length,
                inProgress: allIssues.filter(i => i.status?.trim().toLowerCase() === 'in progress').length,
                resolved: allIssues.filter(i => i.status?.trim().toLowerCase() === 'resolved').length
            })
        } catch (err) {
            console.error('Error fetching stats:', err)
        }
    }, [])

    const fetchNearbyIssues = useCallback(async (lat, lng) => {
        if (!lat || !lng) return
        setLoading(true)
        setError(null)
        try {
            const res = await api.get(`/issues/nearby`, {
                params: {
                    lat,
                    lng,
                    radius: 30,
                    status: filter,
                    priority: priorityFilter
                }
            })
            setIssues(res.data)
        } catch (err) {
            console.error('Error fetching nearby issues:', err)
            setError('Failed to fetch nearby complaints.')
        } finally {
            setLoading(false)
        }
    }, [filter, priorityFilter])

    useEffect(() => {
        fetchStats()
    }, [fetchStats])

    useEffect(() => {
        if (location) {
            fetchNearbyIssues(location.lat, location.lng)
        }
    }, [location, fetchNearbyIssues])

    useEffect(() => {
        // Get user location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords
                    setLocation({ lat: latitude, lng: longitude })
                },
                (err) => {
                    console.warn('Geolocation failed, using default location (mock)', err)
                    // Mock location (e.g., center of a city)
                    const mockLat = 12.9716
                    const mockLng = 77.5946
                    setLocation({ lat: mockLat, lng: mockLng })
                }
            )
        } else {
            setError('Geolocation is not supported by this browser.')
            // Fallback to mock
            const mockLat = 12.9716
            const mockLng = 77.5946
            setLocation({ lat: mockLat, lng: mockLng })
        }
    }, [])

    const filterOptions = ['All', 'Pending', 'In Progress', 'Resolved']
    const priorityOptions = ['All', 'Low', 'Medium', 'High']

    const handleAction = async (issueId, action) => {
        if (action === 'status') {
            // Navigate to detail page for status management
            navigate(`/issue/${issueId}`)
            return
        }
        try {
            await api.post(`/issues/${issueId}/${action}`)
            fetchStats()
            if (location) fetchNearbyIssues(location.lat, location.lng)
        } catch (err) {
            console.error(`Error ${action}ing issue:`, err)
            const message = err.response?.data?.message || `Failed to ${action} mission.`
            alert(message)
        }
    }

    return (
        <div className="main-container min-h-screen pb-20 max-w-7xl mx-auto px-4">
            <div className="mb-6 pt-4">
                <BackButton />
            </div>
            <div className="mb-6">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
                    <p className="text-xs font-black uppercase tracking-widest opacity-60">Logged in as <span className="text-blue-500">{user?.role || 'Volunteer'}</span></p>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
                {[
                    { title: 'Pending', count: stats.pending, icon: '🕒', color: 'text-orange-500', bg: 'bg-orange-500/10' },
                    { title: 'In Progress', count: stats.inProgress, icon: '⚙️', color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { title: 'Resolved', count: stats.resolved, icon: '✅', color: 'text-green-500', bg: 'bg-green-500/10' },
                ].map((s, i) => (
                    <motion.div
                        key={i}
                        variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
                        className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between"
                    >
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">{s.title}</p>
                            <p className={`text-3xl font-black ${s.color}`}>{s.count}</p>
                        </div>
                        <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center text-2xl`}>
                            {s.icon}
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                <div>
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: 'var(--text-color)' }}>
                        Nearby <span className="text-blue-500">Missions</span>
                    </h2>
                    <p className="opacity-60 text-base sm:text-lg font-medium mt-2">
                        Displaying issues within <span className="text-blue-500 font-bold">30km</span>.
                    </p>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-2 bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                        <span className="px-3 py-2 text-[10px] font-black uppercase tracking-widest opacity-40 flex items-center">Status:</span>
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
                    <div className="flex flex-wrap gap-2 bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                        <span className="px-3 py-2 text-[10px] font-black uppercase tracking-widest opacity-40 flex items-center">Priority:</span>
                        {priorityOptions.map(opt => (
                            <button
                                key={opt}
                                onClick={() => setPriorityFilter(opt)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${priorityFilter === opt
                                    ? 'bg-white dark:bg-zinc-700 shadow-md scale-[1.02]'
                                    : 'opacity-40 hover:opacity-100'}`}
                                style={{ color: priorityFilter === opt ? 'var(--text-color)' : '' }}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
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
                        <VolunteerCard key={issue._id} complaint={issue} onAction={handleAction} currentUser={user} />
                    ))}
                </div>
            )}
        </div>
    )
}

export default VolunteerDashboard
