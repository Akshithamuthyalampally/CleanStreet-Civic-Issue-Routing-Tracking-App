import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const Dashboard = () => {
    const { user } = useAuth()
    const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, resolved: 0 })
    const [recentActivity, setRecentActivity] = useState([])
    const [loading, setLoading] = useState(true)
    const [priorityFilter, setPriorityFilter] = useState('All')

    const navigate = useNavigate()
    useEffect(() => {
        if (user?.role === 'admin') {
            navigate('/admin/dashboard')
            return
        }
        const fetchDashboardData = async () => {
            try {
                const res = await api.get('/issues/my', {
                    params: { priority: priorityFilter }
                })
                const issues = res.data

                const statsObj = {
                    total: issues.length,
                    pending: issues.filter(i => i.status === 'Pending').length,
                    inProgress: issues.filter(i => i.status === 'In Progress').length,
                    resolved: issues.filter(i => i.status === 'Resolved').length
                }
                setStats(statsObj)

                const activities = issues
                    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                    .slice(0, 3)
                    .map(issue => ({
                        text: `${issue.title} ${issue.status.toLowerCase()}`,
                        time: new Date(issue.updatedAt).toLocaleString(),
                        id: issue._id
                    }))
                setRecentActivity(activities)
            } catch (err) {
                console.error('Error fetching dashboard data:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchDashboardData()
    }, [priorityFilter])

    const statCards = [
        { title: 'Total Issues', count: stats.total, icon: '⚠️', color: 'text-blue-500' },
        { title: 'Pending', count: stats.pending, icon: '🕒', color: 'text-orange-500' },
        { title: 'In Progress', count: stats.inProgress, icon: '⚙️', color: 'text-purple-500' },
        { title: 'Resolved', count: stats.resolved, icon: '✅', color: 'text-green-500' },
    ]

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    }

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.5 } }
    }

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="main-container max-w-6xl mx-auto px-4 py-8"
        >
            <motion.div variants={itemVariants} className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-color)' }}>User Dashboard</h1>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-civic-green shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                        <p className="text-xs font-black uppercase tracking-widest opacity-60">Logged in as <span className="text-civic-green">{user?.role || 'Citizen'}</span></p>
                    </div>
                </div>

                <div className="flex gap-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    {['All', 'High', 'Medium', 'Low'].map(p => (
                        <button
                            key={p}
                            onClick={() => setPriorityFilter(p)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${priorityFilter === p
                                ? 'bg-white dark:bg-zinc-700 shadow-sm scale-[1.02] text-civic-green'
                                : 'opacity-40 hover:opacity-100'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-zinc-200 dark:border-zinc-800 mb-8">
                <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-color)' }}>Dashboard</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                    {statCards.map((stat, idx) => (
                        <div key={idx} className="bg-white dark:bg-zinc-800/50 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-center flex flex-col items-center justify-center hover:shadow-md transition-shadow cursor-default">
                            <span className="text-3xl mb-2">{stat.icon}</span>
                            <div className="text-3xl font-black mb-1" style={{ color: 'var(--text-color)' }}>{stat.count}</div>
                            <div className="text-xs font-bold opacity-50 uppercase tracking-wider">{stat.title}</div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Recent Activity */}
                    <div className="md:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold" style={{ color: 'var(--text-color)' }}>Recent Activity</h3>
                            <Link to="/report-issue" className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center hover:scale-110 transition-transform">
                                <span className="text-xl font-bold">+</span>
                            </Link>
                        </div>
                        <div className="bg-white dark:bg-zinc-800/30 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                            {recentActivity.length > 0 ? (
                                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {recentActivity.map((activity, idx) => (
                                        <div key={idx} className="p-4 flex items-start gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                            <div className={`mt-1 w-2 h-2 rounded-full ${idx === 1 ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'bg-zinc-300 dark:bg-zinc-700'}`}></div>
                                            <div>
                                                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-color)' }}>{activity.text}</p>
                                                <p className="text-xs opacity-50">{activity.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center opacity-50 text-sm">No recent activities found.</div>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div>
                        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-color)' }}>Quick Actions</h3>
                        <div className="flex flex-col gap-3">
                            {user?.role === 'citizen' && (
                                <Link to="/report-issue" className="flex items-center gap-3 px-6 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-500/20">
                                    <span className="text-lg">+</span>
                                    Report New Issue
                                </Link>
                            )}
                            <Link to="/my-complaints" className="flex items-center gap-3 px-6 py-4 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 rounded-xl font-bold text-sm transition-all" style={{ color: 'var(--text-color)' }}>
                                <span className="text-lg">📋</span>
                                View All Complaints
                            </Link>
                            <Link to="/my-complaints" className="flex items-center gap-3 px-6 py-4 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 rounded-xl font-bold text-sm transition-all text-zinc-400 cursor-not-allowed">
                                <span className="text-lg">🗺️</span>
                                Issue Map
                            </Link>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    )
}

export default Dashboard
