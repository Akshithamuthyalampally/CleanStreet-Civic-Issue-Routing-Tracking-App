import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
    AreaChart, Area
} from 'recharts'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { jsPDF } from 'jspdf'
import Papa from 'papaparse'
import html2canvas from 'html2canvas'
import PptxGenJS from 'pptxgenjs'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

const AdminDashboard = () => {
    const { user: currentUser } = useAuth()
    const [activeTab, setActiveTab] = useState('Overview')
    const [stats, setStats] = useState(null)
    const [users, setUsers] = useState([])
    const [complaints, setComplaints] = useState([])
    const [activities, setActivities] = useState([])
    const [loading, setLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [error, setError] = useState(null)
    const [filters, setFilters] = useState({ userRole: '', userLocation: '', complaintStatus: '', complaintType: '' })
    const [showDownloadDropdown, setShowDownloadDropdown] = useState(false)
    const [editingComplaintId, setEditingComplaintId] = useState(null)
    const [confirmingDeleteId, setConfirmingDeleteId] = useState(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async (background = false) => {
        if (!background) setLoading(true)
        else setIsRefreshing(true)
        setError(null)
        try {
            console.log('Syncing Command Center...');
            const [statsRes, usersRes, complaintsRes, activitiesRes] = await Promise.all([
                api.get('/admin/stats'),
                api.get('/admin/users'),
                api.get('/admin/complaints'),
                api.get('/admin/activities')
            ])
            setStats(statsRes.data)
            setUsers(usersRes.data)
            setComplaints(complaintsRes.data)
            setActivities(activitiesRes.data)
        } catch (err) {
            console.error('Fetch Error:', err)
            // If 404, it means the server doesn't have these routes yet
            if (err.response?.status === 404) {
                setError('Command Center Routes (404) not found. Please ensure the backend is running the latest code and port 5000 is clean.')
            } else {
                setError(err.response?.data?.message || 'Failed to sync with Command Center. Check connection or permissions.')
            }
        } finally {
            setLoading(false)
            setIsRefreshing(false)
        }
    }

    const handleUpdateComplaint = async (id, updates) => {
        try {
            await api.put(`/admin/complaints/${id}`, updates)
            fetchData()
        } catch (err) {
            alert('Update failed')
        }
    }

    const downloadCSV = (data, filename) => {
        const csv = Papa.unparse(data.map(c => ({
            ID: c._id,
            Title: c.title,
            Status: c.status,
            Category: c.category || c.type,
            Location: c.fullAddress || c.location,
            Urgency: c.urgency,
            CreatedAt: new Date(c.createdAt).toLocaleString()
        })))
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `${filename}.csv`)
        link.click()
    }

    const handleDeleteActivity = async (id) => {
        try {
            console.log(`PURGE_INIT: ${id}`);
            const res = await api.delete(`/admin/activities/${id}`);
            console.log('PURGE_SUCCESS:', res.data);
            setActivities(prev => prev.filter(act => act._id !== id));
            setConfirmingDeleteId(null);
            setError(null);
        } catch (err) {
            console.error('Delete activity error:', err);
            const msg = err.response?.data?.message || err.message || 'Unknown network error';
            setError(`Security Purge Failed: ${msg}`);
            setConfirmingDeleteId(null);
        }
    }

    const downloadPDF = () => {
        const doc = new jsPDF()
        doc.setFontSize(20)
        doc.text('CleanStreet Civic Issue Report', 10, 10)
        doc.setFontSize(12)
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 10, 20)

        let y = 30
        complaints.forEach((c, i) => {
            if (y > 270) {
                doc.addPage()
                y = 20
            }
            doc.setFontSize(14)
            doc.text(`${i + 1}. ${c.title}`, 10, y)
            doc.setFontSize(10)
            doc.text(`Status: ${c.status} | Category: ${c.category || c.type}`, 15, y + 5)
            doc.text(`Location: ${c.fullAddress || c.location}`, 15, y + 10)
            y += 20
        })
        doc.save('CleanStreet_Report.pdf')
    }

    const downloadImage = async () => {
        const element = document.getElementById('admin-dashboard-content')
        if (element) {
            const canvas = await html2canvas(element)
            const link = document.createElement('a')
            link.download = 'CleanStreet_Dashboard.png'
            link.href = canvas.toDataURL()
            link.click()
        }
    }

    const downloadPPT = () => {
        const pptx = new PptxGenJS()
        const slide = pptx.addSlide()
        slide.addText('CleanStreet Civic Issue Report', { x: 1, y: 0.5, fontSize: 24, color: '363636' })

        const rows = complaints.map(c => [c.title, c.status, c.category || c.type])
        slide.addTable([['Title', 'Status', 'Category'], ...rows], { x: 0.5, y: 1.5, w: 9 })

        pptx.writeFile({ fileName: 'CleanStreet_Report.pptx' })
    }

    if (loading && !stats) {
        return (
            <div className="flex flex-col items-center justify-center h-screen space-y-4">
                <div className="w-12 h-12 border-4 border-civic-green border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xl font-bold opacity-70">Initializing Command Center...</p>
            </div>
        )
    }

    return (
        <div id="admin-dashboard-content" className="max-w-[1800px] mx-auto space-y-10 py-6 px-4">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-5xl font-black tracking-tight mb-2" style={{ color: 'var(--text-color)' }}>Admin Dashboard</h1>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1 bg-civic-green/10 text-civic-green rounded-full text-xs font-black uppercase tracking-widest border border-civic-green/20">
                            <span className="w-2 h-2 bg-civic-green rounded-full animate-pulse"></span>
                            LOGGED IN AS ADMIN
                        </div>
                        <p className="text-sm font-bold opacity-60">
                            {currentUser?.name} <span className="opacity-30 ml-2">ID: {currentUser?._id?.slice(-8)}</span>
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-4 items-center">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => fetchData(true)}
                        disabled={isRefreshing}
                        className="px-6 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl font-black shadow-sm flex items-center gap-2 border border-black/5 dark:border-white/5 disabled:opacity-50"
                    >
                        <motion.span
                            animate={{ rotate: isRefreshing ? 360 : 0 }}
                            transition={{ repeat: isRefreshing ? Infinity : 0, duration: 1, ease: "linear" }}
                        >
                            🔄
                        </motion.span>
                        {isRefreshing ? 'Syncing...' : 'Refresh'}
                    </motion.button>

                    <div className="relative">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                            className="px-6 py-3 bg-civic-green text-black rounded-2xl font-black shadow-lg shadow-civic-green/20 flex items-center gap-2 border border-civic-green/20"
                        >
                            <span>📥</span> Download Report
                            <motion.span
                                animate={{ rotate: showDownloadDropdown ? 180 : 0 }}
                                className="text-[10px]"
                            >
                                ▼
                            </motion.span>
                        </motion.button>

                        <AnimatePresence>
                            {showDownloadDropdown && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setShowDownloadDropdown(false)}
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 mt-3 w-64 bg-white dark:bg-zinc-900 rounded-[24px] shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden z-20 backdrop-blur-xl"
                                    >
                                        <div className="p-2 space-y-1">
                                            {[
                                                { label: 'PDF Document', icon: '📄', onClick: downloadPDF, sub: 'Best for printing' },
                                                { label: 'Excel Spreadsheet', icon: '📊', onClick: () => downloadCSV(complaints, 'CleanStreet_Report'), sub: 'Data analysis' },
                                                { label: 'Visual Overview', icon: '🖼️', onClick: downloadImage, sub: 'PNG Snapshot' },
                                                { label: 'Presentation', icon: '📽️', onClick: downloadPPT, sub: 'PowerPoint slide' }
                                            ].map((item, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        item.onClick();
                                                        setShowDownloadDropdown(false);
                                                    }}
                                                    className="w-full flex items-center gap-4 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-2xl transition-all text-left group"
                                                >
                                                    <span className="text-2xl group-hover:scale-110 transition-transform">{item.icon}</span>
                                                    <div>
                                                        <p className="font-black text-sm">{item.label}</p>
                                                        <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{item.sub}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="p-1 rounded-3xl bg-gradient-to-r from-red-500 to-rose-600"
                    >
                        <div className="bg-white dark:bg-zinc-950 px-6 py-4 rounded-[22px] flex items-center justify-between shadow-lg">
                            <div className="flex items-center gap-4">
                                <span className="text-2xl">⚠️</span>
                                <p className="font-bold text-red-500">{error}</p>
                            </div>
                            <button onClick={fetchData} className="px-4 py-2 bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400 rounded-xl font-black text-sm uppercase">Try Again</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Navigation Tabs */}
            <div className="flex p-1.5 bg-zinc-100/50 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 rounded-3xl w-fit backdrop-blur-md">
                {[
                    { id: 'Overview', icon: '📈' },
                    { id: 'Manage Users', icon: '👥', count: users.length },
                    { id: 'View Complaints', icon: '📋', count: complaints.length },
                    { id: 'Recent Activities', icon: '🕒' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-black transition-all duration-300 ${activeTab === tab.id ? 'bg-white dark:bg-zinc-800 text-civic-green shadow-xl' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
                    >
                        <span>{tab.icon}</span>
                        {tab.id} {tab.count !== undefined && <span className="opacity-40 font-medium">({tab.count})</span>}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'Overview' && (
                    <motion.div
                        key="overview"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-12"
                    >
                        {/* Status Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                            {[
                                { label: 'Total Users', value: stats?.summary.totalUsers || 0, icon: '👥', color: 'bg-blue-500' },
                                { label: 'Total Complaints', value: stats?.summary.totalComplaints || 0, icon: '📋', color: 'bg-indigo-500' },
                                { label: 'Pending Complaints', value: stats?.summary.pendingComplaints || 0, icon: '🕒', color: 'bg-amber-500' },
                                { label: 'Resolved Complaints', value: stats?.summary.resolvedComplaints || 0, icon: '✅', color: 'bg-emerald-500' }
                            ].map((card, idx) => (
                                <motion.div
                                    key={idx}
                                    whileHover={{ y: -8 }}
                                    className="bg-white dark:bg-zinc-900 p-8 rounded-[40px] shadow-sm border border-black/5 dark:border-white/5 flex items-center gap-6"
                                >
                                    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-3xl text-white ${card.color} shadow-lg shadow-${card.color.split('-')[1]}-500/20`}>
                                        {card.icon}
                                    </div>
                                    <div>
                                        <p className="text-4xl font-black tracking-tight">{card.value}</p>
                                        <p className="text-sm font-bold opacity-40 uppercase tracking-widest leading-none mt-1">{card.label}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Statistics & Analytics Header */}
                        <div>
                            <h2 className="text-3xl font-black mb-1 flex items-center gap-3">
                                <span className="w-10 h-10 bg-civic-green/10 text-civic-green rounded-xl flex items-center justify-center">📊</span>
                                Statistics & Analytics
                            </h2>
                            <p className="opacity-50 font-medium">Visual insights into city compliance and user activity.</p>
                        </div>

                        {/* Distribution Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <ChartCard title="Complaint Status Distribution" icon="🕒">
                                <PieChart>
                                    <Pie
                                        data={stats?.statusDistribution.map(d => ({ name: d._id, value: d.count })) || []}
                                        innerRadius={60}
                                        outerRadius={85}
                                        paddingAngle={8}
                                        dataKey="value"
                                    >
                                        {stats?.statusDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} cornerRadius={8} />)}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend align="center" verticalAlign="bottom" iconType="circle" />
                                </PieChart>
                            </ChartCard>

                            <ChartCard title="Complaint Categories" icon="🏷️">
                                <PieChart>
                                    <Pie
                                        data={stats?.typeDistribution.map(d => ({ name: d._id, value: d.count })) || []}
                                        outerRadius={85}
                                        dataKey="value"
                                    >
                                        {stats?.typeDistribution.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} cornerRadius={8} />)}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend align="center" verticalAlign="bottom" iconType="circle" />
                                </PieChart>
                            </ChartCard>

                            <ChartCard title="User Roles Breakup" icon="👤">
                                <PieChart>
                                    <Pie
                                        data={stats?.userRolesDistribution?.map(d => ({ name: d._id, value: d.count })) || []}
                                        innerRadius={40}
                                        outerRadius={85}
                                        dataKey="value"
                                    >
                                        {stats?.userRolesDistribution?.map((_, i) => <Cell key={i} fill={COLORS[(i + 4) % COLORS.length]} cornerRadius={8} />)}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend align="center" verticalAlign="bottom" iconType="circle" />
                                </PieChart>
                            </ChartCard>
                        </div>

                        {/* Trends and Top Categories */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <ChartCard title="Monthly Complaint Trends (6 Months)" icon="📉" height={400}>
                                <AreaChart data={stats?.monthlyTrends.map(d => ({ name: `${d._id.month}/${d._id.year}`, count: d.count })) || []}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.05} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorCount)" />
                                </AreaChart>
                            </ChartCard>

                            <ChartCard title="Top 5 Complaint Types" icon="⚡" height={400}>
                                <BarChart
                                    layout="vertical"
                                    data={stats?.typeDistribution.sort((a, b) => b.count - a.count).slice(0, 5).map(d => ({ name: d._id, count: d.count })) || []}
                                    margin={{ left: 20, right: 30 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.05} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 10, fill: '#888', fontWeight: 'bold' }} />
                                    <Tooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
                                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 20, 20, 0]} barSize={40} />
                                </BarChart>
                            </ChartCard>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'Manage Users' && (
                    <motion.div key="users" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-zinc-900 rounded-[40px] shadow-2xl border border-black/5 dark:border-white/5 overflow-hidden">
                        <div className="p-10 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-950/20">
                            <div>
                                <h3 className="text-3xl font-black tracking-tight">User Management</h3>
                                <p className="text-sm font-bold opacity-40 mt-1 uppercase tracking-widest">Authorized Personnel & Citizens</p>
                            </div>
                            <div className="flex gap-4">
                                <select
                                    className="bg-white dark:bg-zinc-800 border-black/5 dark:border-white/10 rounded-2xl px-6 py-3 font-black text-sm outline-none ring-2 ring-transparent focus:ring-civic-green/50 shadow-sm transition-all"
                                    onChange={(e) => setFilters({ ...filters, userRole: e.target.value })}
                                >
                                    <option value="">All Roles</option>
                                    <option value="citizen">Citizens</option>
                                    <option value="volunteer">Volunteers</option>
                                </select>
                            </div>
                        </div>
                        <div className="w-full">
                            <table className="w-full text-left border-collapse table-fixed">
                                <thead>
                                    <tr className="bg-zinc-50/50 dark:bg-zinc-950/20 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
                                        <th className="px-10 py-6 w-1/4">Basic Info</th>
                                        <th className="px-10 py-6 w-1/4">Digital Identity</th>
                                        <th className="px-10 py-6 w-1/4">Deployed Location</th>
                                        <th className="px-10 py-6 w-1/6 text-center">Status</th>
                                        <th className="px-10 py-6 w-1/6 text-right">Joined</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                    {users.filter(u => u.role !== 'admin' && (!filters.userRole || u.role === filters.userRole)).map(user => (
                                        <tr key={user._id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all duration-300">
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                                                        {user.name.charAt(0)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-black text-lg truncate group-hover:text-civic-green transition-colors">{user.name}</p>
                                                        <p className="text-[10px] opacity-40 font-black uppercase tracking-tighter">UID: {user._id.slice(-8)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm opacity-80">{user.email}</span>
                                                    <span className="text-[10px] font-black opacity-30 uppercase tracking-widest mt-1">Verified Node</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-lg">📍</span>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-sm truncate">{user.location || 'Central Sector'}</p>
                                                        <p className="text-[10px] font-black opacity-30 uppercase tracking-widest">Geo-Zone</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8 text-center">
                                                <span className={`inline-flex px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${user.role === 'volunteer'
                                                    ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-blue-500/10'
                                                    : 'bg-civic-green/10 text-civic-green border border-civic-green/20 shadow-civic-green/10'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-10 py-8 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="font-black text-sm opacity-80">
                                                        {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </span>
                                                    <span className="text-[10px] font-black opacity-30 uppercase tracking-widest">
                                                        {new Date(user.createdAt).getFullYear()}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'View Complaints' && (
                    <motion.div key="complaints" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-zinc-900 rounded-[40px] shadow-2xl border border-black/5 dark:border-white/5 overflow-hidden">
                        <div className="p-10 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-950/20">
                            <div>
                                <h3 className="text-3xl font-black tracking-tight">Active Inquiries</h3>
                                <p className="text-sm font-bold opacity-40 mt-1 uppercase tracking-widest">Citizen Reports & Mission Progress</p>
                            </div>
                            <div className="flex gap-4">
                                <select
                                    className="bg-white dark:bg-zinc-800 border-black/5 dark:border-white/10 rounded-2xl px-6 py-3 font-black text-sm outline-none ring-2 ring-transparent focus:ring-civic-green/50 shadow-sm transition-all"
                                    onChange={(e) => setFilters({ ...filters, complaintStatus: e.target.value })}
                                >
                                    <option value="">All Statuses</option>
                                    <option value="Pending">Pending</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Resolved">Resolved</option>
                                </select>
                            </div>
                        </div>
                        <div className="w-full">
                            <table className="w-full text-left border-collapse table-fixed">
                                <thead>
                                    <tr className="bg-zinc-50/50 dark:bg-zinc-950/20 text-[10px] font-black uppercase tracking-[0.2em] opacity-40 text-center">
                                        <th className="px-6 py-6 w-[25%] text-left">Issue Entity</th>
                                        <th className="px-6 py-6 w-[25%] text-left">Origin</th>
                                        <th className="px-6 py-6 w-[15%]">Classification</th>
                                        <th className="px-6 py-6 w-[15%]">Condition</th>
                                        <th className="px-6 py-6 w-[20%]">Assigned Agent</th>
                                        <th className="px-6 py-6 w-[100px] text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                    {(complaints.length > 0 ? complaints : []).filter(c => !filters.complaintStatus || c.status === filters.complaintStatus).map(complaint => {
                                        const isEditing = editingComplaintId === complaint._id;
                                        return (
                                            <tr key={complaint._id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all duration-300">
                                                <td className="px-10 py-8">
                                                    <div className="min-w-0">
                                                        <p className="font-black text-lg truncate group-hover:text-amber-500 transition-colors">{complaint.title}</p>
                                                        <p className="text-[10px] opacity-30 font-black uppercase tracking-tighter">Ref: {complaint._id.slice(-8)}</p>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8 text-sm font-bold opacity-60">
                                                    <div className="truncate max-w-full" title={complaint.location}>{complaint.location}</div>
                                                </td>
                                                <td className="px-10 py-8">
                                                    <span className="font-bold opacity-60 underline decoration-civic-green/30 underline-offset-4">{complaint.type}</span>
                                                </td>
                                                <td className="px-10 py-8">
                                                    {isEditing ? (
                                                        <select
                                                            value={complaint.status}
                                                            onChange={(e) => {
                                                                const updated = complaints.map(c => c._id === complaint._id ? { ...c, status: e.target.value } : c);
                                                                setComplaints(updated);
                                                            }}
                                                            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none bg-zinc-100 dark:bg-zinc-800 border-civic-green border"
                                                        >
                                                            <option value="Pending">Pending</option>
                                                            <option value="In Progress">In Progress</option>
                                                            <option value="Resolved">Resolved</option>
                                                        </select>
                                                    ) : (
                                                        <span className={`inline-flex px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm whitespace-nowrap ${complaint.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                                            complaint.status === 'In Progress' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                                                                'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                                            }`}>
                                                            {complaint.status}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-10 py-8">
                                                    {isEditing ? (
                                                        <select
                                                            value={complaint.assignedTo || ''}
                                                            onChange={(e) => {
                                                                const updated = complaints.map(c => c._id === complaint._id ? { ...c, assignedTo: e.target.value } : c);
                                                                setComplaints(updated);
                                                            }}
                                                            className="w-full bg-zinc-100 dark:bg-zinc-800 text-xs font-black p-2 rounded-xl border-civic-green border outline-none"
                                                        >
                                                            <option value="">Awaiting Liaison</option>
                                                            {users.filter(u => u.role === 'volunteer').map(v => (
                                                                <option key={v._id} value={v._id}>{v.name}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full bg-civic-green shadow-neon"></span>
                                                            <span className="text-sm font-black opacity-80">
                                                                {users.find(u => u._id === (complaint.assignedTo || complaint.assignedVolunteer))?.name || 'Awaiting Acceptance'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-10 py-8 text-right">
                                                    {isEditing ? (
                                                        <button
                                                            onClick={async () => {
                                                                await handleUpdateComplaint(complaint._id, {
                                                                    status: complaint.status,
                                                                    assignedTo: complaint.assignedTo
                                                                });
                                                                setEditingComplaintId(null);
                                                            }}
                                                            className="text-civic-green hover:scale-110 transition-all font-black text-xs uppercase"
                                                        >
                                                            Save
                                                        </button>
                                                    ) : (
                                                        <div className="flex items-center justify-end gap-3">
                                                            <button
                                                                onClick={() => setEditingComplaintId(complaint._id)}
                                                                className="opacity-0 group-hover:opacity-100 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button className="relative group/view">
                                                                <div className="absolute inset-0 bg-civic-green/20 blur-lg rounded-full opacity-0 group-hover/view:opacity-100 transition-opacity"></div>
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-zinc-400 group-hover/view:text-civic-green transition-colors relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'Recent Activities' && (
                    <motion.div key="activities" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-zinc-900 p-10 rounded-[40px] shadow-2xl border border-black/5 dark:border-white/5">
                        <div className="mb-10">
                            <h3 className="text-3xl font-black tracking-tight">System Audit Log</h3>
                            <p className="text-sm font-bold opacity-40 mt-1 uppercase tracking-widest">Administrative Trace & Deployments</p>
                        </div>
                        <div className="space-y-6">
                            {activities.map(act => (
                                <div key={act._id} className="flex gap-6 p-8 rounded-[32px] bg-zinc-50/50 dark:bg-zinc-950/20 border border-black/5 dark:border-white/5 hover:border-civic-green/30 transition-all group">
                                    <div className="w-16 h-16 rounded-[22px] bg-gradient-to-br from-civic-green/20 to-emerald-500/10 flex items-center justify-center text-3xl shadow-lg border border-civic-green/20 group-hover:scale-110 transition-transform">
                                        {act.type === 'STATUS_UPDATE' ? '🔄' : '🛡️'}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <p className="font-black text-xl text-civic-green">{act.user?.name || 'Central Command'}</p>
                                            <button
                                                onClick={() => setConfirmingDeleteId(act._id)}
                                                className="opacity-0 group-hover:opacity-100 p-2 rounded-xl hover:bg-red-500/10 text-zinc-500 hover:text-red-500 transition-all shadow-sm"
                                                title="Purge Record"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                        <p className="text-lg opacity-70 font-medium mt-1 leading-relaxed">{act.details}</p>
                                        <div className="flex items-center gap-4 mt-4 py-3 border-t border-black/5 dark:border-white/5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs">📅</span>
                                                <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">
                                                    {new Date(act.timestamp).toLocaleString(undefined, {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 opacity-20"></span>
                                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Trace ID: {act._id.slice(-6)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Premium Deletion Modal */}
            <AnimatePresence>
                {confirmingDeleteId && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setConfirmingDeleteId(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative bg-white dark:bg-zinc-900 w-full max-w-md rounded-[40px] shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden p-10 text-center"
                        >
                            <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                                <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full"></div>
                                <span className="text-4xl relative z-10">⚠️</span>
                            </div>
                            <h3 className="text-3xl font-black mb-4 tracking-tight">Purge Activity?</h3>
                            <p className="text-zinc-500 font-medium mb-10 leading-relaxed">
                                This action will permanently remove this administrative trace from the system. This cannot be undone.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setConfirmingDeleteId(null)}
                                    className="px-8 py-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all border border-black/5 dark:border-white/5"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDeleteActivity(confirmingDeleteId)}
                                    className="px-8 py-4 bg-red-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/30 border border-red-500/20"
                                >
                                    Purge
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}

const ChartCard = ({ title, icon, children, height = 350 }) => (
    <div className="bg-white dark:bg-zinc-900 p-10 rounded-[40px] shadow-sm border border-black/5 dark:border-white/5 flex flex-col">
        <h3 className="text-xl font-black mb-10 flex items-center gap-4">
            <span className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-xl">{icon}</span>
            {title}
        </h3>
        <div style={{ width: '100%', height: height }}>
            <ResponsiveContainer width="100%" height="100%">
                {children}
            </ResponsiveContainer>
        </div>
    </div>
)

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-zinc-900 text-white p-4 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-xl">
                <p className="font-black text-xs uppercase tracking-widest opacity-50 mb-1">{label || payload[0].name}</p>
                <p className="text-2xl font-black">{payload[0].value} <span className="text-[10px] opacity-40">UNITS</span></p>
            </div>
        )
    }
    return null
}

export default AdminDashboard
