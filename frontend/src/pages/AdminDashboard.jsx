import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
    AreaChart, Area, LineChart, Line
} from 'recharts'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { jsPDF } from 'jspdf'
import Papa from 'papaparse'
import html2canvas from 'html2canvas'
import PptxGenJS from 'pptxgenjs'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Icon } from 'leaflet'

const customMarkerIcon = new Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

const AdminDashboard = () => {
    const { user: currentUser } = useAuth()
    const [activeTab, setActiveTab] = useState('Overview')
    const [stats, setStats] = useState(null)
    const [users, setUsers] = useState([])
    const [complaints, setComplaints] = useState([])
    const [activities, setActivities] = useState([])
    const [volunteerAnalytics, setVolunteerAnalytics] = useState(null)
    const [complaintsLast7Days, setComplaintsLast7Days] = useState([])
    const [registrationsLast30Days, setRegistrationsLast30Days] = useState([])
    const [loading, setLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [error, setError] = useState(null)
    const [filters, setFilters] = useState({ userRole: '', userLocation: '', complaintStatus: '', complaintType: '' })
    const [showDownloadDropdown, setShowDownloadDropdown] = useState(false)
    const [editingComplaintId, setEditingComplaintId] = useState(null)
    const [confirmingDeleteId, setConfirmingDeleteId] = useState(null)
    const [isDownloading, setIsDownloading] = useState(false)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async (background = false) => {
        if (!background) setLoading(true)
        else setIsRefreshing(true)
        setError(null)
        try {
            const [statsRes, usersRes, complaintsRes, activitiesRes, volunteerRes, complaints7Res, registrations30Res] = await Promise.all([
                api.get('/admin/stats'),
                api.get('/admin/users'),
                api.get('/admin/complaints'),
                api.get('/admin/activities'),
                api.get('/admin/volunteer-analytics'),
                api.get('/admin/complaints-last-7-days'),
                api.get('/admin/registrations-last-30-days')
            ])
            setStats(statsRes.data)
            setUsers(usersRes.data)
            setComplaints(complaintsRes.data)
            setActivities(activitiesRes.data)
            setVolunteerAnalytics(volunteerRes.data)
            setComplaintsLast7Days(complaints7Res.data)
            setRegistrationsLast30Days(registrations30Res.data)
        } catch (err) {
            console.error('Fetch Error:', err)
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

    const prepareReportData = (c) => {
        const assignmentInfo = c.assignedByRole === 'admin'
            ? `Admin Assigned: ${c.volunteerName || 'Not Appointed'} (ID: ${c.volunteerId || 'Unk'})`
            : c.volunteerName
                ? `Accepted by Volunteer: ${c.volunteerName} (ID: ${c.volunteerId || 'Unk'})`
                : 'Awaiting Volunteer Action';

        const d = c.createdAt ? new Date(c.createdAt) : null;
        const locationCombined = [c.fullAddress || c.location, c.landmark].filter(Boolean).join(' (Landmark: ') + (c.landmark ? ')' : '');

        return {
            ID: c._id || 'N/A',
            Title: c.title || 'Untitled Issue',
            Citizen: c.citizenName || 'Registered Citizen',
            Status: c.status || 'Pending',
            Assignment: assignmentInfo,
            Category: c.category || c.type || 'General',
            Location: locationCombined || 'Location Not Specified',
            Urgency: c.urgency || 'Medium',
            Date: d ? d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : 'N/A',
            Time: d ? d.toLocaleTimeString('en-GB') : 'N/A',
            Timestamp: d ? d.toLocaleString('en-GB') : 'N/A'
        };
    }

    const downloadCSV = (data, filename) => {
        const csv = Papa.unparse(data.map(c => {
            const report = prepareReportData(c);
            return {
                ID: report.ID,
                Title: report.Title,
                Citizen: report.Citizen,
                Status: report.Status,
                Assignment: report.Assignment,
                Category: report.Category,
                Location: report.Location,
                Urgency: report.Urgency,
                Date: report.Date,
                Time: report.Time
            };
        }))
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

    const downloadPDF = async () => {
        setIsDownloading(true);
        const originalTab = activeTab;

        if (activeTab !== 'Overview') {
            setActiveTab('Overview');
            // Wait for React to mount the charts and Recharts to animate
            await new Promise(res => setTimeout(res, 800));
        }

        try {
            const doc = new jsPDF();

            // Title Page
            doc.setFontSize(24);
            doc.setTextColor(16, 185, 129); // civic-green
            doc.text('CleanStreet Civic Issue Report', 105, 20, { align: 'center' });

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 28, { align: 'center' });

            doc.setFontSize(16);
            doc.setTextColor(16, 185, 129);
            doc.text('Detailed Issue List', 105, 40, { align: 'center' });
            doc.line(10, 45, 200, 45);

            let y = 55;
            complaints.forEach((c, i) => {
                if (y > 260) {
                    doc.addPage();
                    y = 20;
                }

                const report = prepareReportData(c);

                doc.setFontSize(12);
                doc.setTextColor(0);
                doc.setFont(undefined, 'bold');
                doc.text(`${i + 1}. ${report.Title}`, 10, y);

                doc.setFontSize(10);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(80);

                doc.text(`Citizen: ${report.Citizen}`, 15, y + 6);
                doc.text(`Status: ${report.Status}`, 110, y + 6); // Moved status right

                doc.text(`Assignment:`, 15, y + 11);
                doc.setTextColor(30);
                doc.text(`${report.Assignment}`, 40, y + 11);
                doc.setTextColor(80);

                doc.text(`Category: ${report.Category}`, 15, y + 16); // Moved category below assignment to avoid collision
                doc.text(`Urgency: ${report.Urgency}`, 110, y + 16);

                doc.text(`Location: ${report.Location}`, 15, y + 21);
                doc.text(`Posted on: ${report.Timestamp}`, 15, y + 26);

                doc.setDrawColor(240);
                doc.line(15, y + 30, 195, y + 30);

                y += 40;
            });

            // Capture Charts
            doc.addPage();
            doc.setFontSize(20);
            doc.setTextColor(16, 185, 129);
            doc.text('Statistics Overview', 105, 20, { align: 'center' });

            const chartIds = [
                'chart-status',
                'chart-category',
                'chart-user-roles',
                'chart-trends',
                'chart-last-7-days',
                'chart-30-days-reg',
                'chart-volunteer-resolutions'
            ];
            let chartY = 35;

            for (const id of chartIds) {
                const el = document.getElementById(id);
                if (el) {
                    const canvas = await html2canvas(el, {
                        scale: 2,
                        backgroundColor: '#ffffff', // Force white background for PDF clarity
                        logging: false
                    });
                    const aspect = canvas.height / canvas.width;

                    const maxHeight = 85;
                    const maxWidth = 170;

                    let targetWidth = maxWidth;
                    let targetHeight = targetWidth * aspect;

                    if (targetHeight > maxHeight) {
                        targetHeight = maxHeight;
                        targetWidth = targetHeight / aspect;
                    }

                    const xOffset = (210 - targetWidth) / 2;

                    // Ensure enough space for the chart, otherwise start a new page
                    if (chartY + targetHeight > 270) {
                        doc.addPage();
                        chartY = 20;
                    }

                    const imgData = canvas.toDataURL('image/png');
                    doc.addImage(imgData, 'PNG', xOffset, chartY, targetWidth, targetHeight);
                    chartY += targetHeight + 20;
                }
            }

            doc.save(`CleanStreet_Report_${new Date().getTime()}.pdf`);
        } finally {
            if (originalTab !== 'Overview') {
                setActiveTab(originalTab);
            }
            setIsDownloading(false);
            setShowDownloadDropdown(false);
        }
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
        pptx.layout = 'LAYOUT_WIDE'

        // Title Slide
        const titleSlide = pptx.addSlide()
        titleSlide.background = { color: 'F1F5F9' }
        titleSlide.addText('CleanStreet Civic Issue Report', {
            x: 0, y: '40%', w: '100%', h: 1,
            fontSize: 44, color: '10B981', align: 'center', bold: true
        })
        titleSlide.addText(`Visualizing Urban Progress - ${new Date().toLocaleDateString()}`, {
            x: 0, y: '55%', w: '100%', h: 0.5,
            fontSize: 20, color: '64748B', align: 'center'
        })

        // Status Chart Slide
        if (stats?.statusDistribution) {
            const chartSlide = pptx.addSlide();
            chartSlide.addText('Complaint Status Distribution', { x: 0.5, y: 0.3, fontSize: 28, color: '334155', bold: true });
            const chartData = [{
                name: 'Status',
                labels: stats.statusDistribution.map(d => String(d._id)),
                values: stats.statusDistribution.map(d => d.count)
            }];
            chartSlide.addChart(pptx.ChartType.pie, chartData, { x: 0.5, y: 1.0, w: 12.3, h: 6 });
        }

        // Category Chart Slide
        if (stats?.typeDistribution) {
            const chartSlide = pptx.addSlide();
            chartSlide.addText('Complaint Categories', { x: 0.5, y: 0.3, fontSize: 28, color: '334155', bold: true });
            const chartData = [{
                name: 'Categories',
                labels: stats.typeDistribution.map(d => String(d._id)),
                values: stats.typeDistribution.map(d => d.count)
            }];
            chartSlide.addChart(pptx.ChartType.bar, chartData, { x: 0.5, y: 1.0, w: 12.3, h: 6 });
        }

        // Trends Chart Slide
        if (stats?.monthlyTrends) {
            const chartSlide = pptx.addSlide();
            chartSlide.addText('Monthly Trends', { x: 0.5, y: 0.3, fontSize: 28, color: '334155', bold: true });
            const chartData = [{
                name: 'Complaints',
                labels: stats.monthlyTrends.map(d => `${d._id.month}/${d._id.year}`),
                values: stats.monthlyTrends.map(d => d.count)
            }];
            chartSlide.addChart(pptx.ChartType.line, chartData, { x: 0.5, y: 1.0, w: 12.3, h: 6 });
        }

        // Summary Table Slide
        const summarySlide = pptx.addSlide()
        summarySlide.addText('Executive Summary of Inquiries', { x: 0.5, y: 0.3, fontSize: 28, color: '334155', bold: true })

        const headers = ['Title', 'Citizen', 'Status', 'Assignment', 'Date'];
        const rows = complaints.map(c => {
            const report = prepareReportData(c);
            return [
                report.Title,
                report.Citizen,
                report.Status,
                report.Assignment,
                report.Date
            ];
        });

        summarySlide.addTable([headers, ...rows], {
            x: 0.5, y: 1.0, w: 12.3,
            border: { color: 'E2E8F0' },
            fill: { color: 'F8FAFC' },
            fontSize: 10,
            colW: [3.5, 2, 2, 3, 1.8]
        })

        pptx.writeFile({ fileName: `CleanStreet_Report_${new Date().getTime()}.pptx` })
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
                            disabled={isDownloading}
                            className="px-6 py-3 bg-civic-green text-black rounded-2xl font-black shadow-lg shadow-civic-green/20 flex items-center gap-2 border border-civic-green/20 disabled:opacity-50"
                        >
                            <span>📥</span> {isDownloading ? 'Generating...' : 'Download Report'}
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
            <div className="flex p-1.5 bg-zinc-100/50 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 rounded-3xl w-fit backdrop-blur-md overflow-x-auto">
                {[
                    { id: 'Overview', icon: '📈' },
                    { id: 'Manage Users', icon: '👥', count: users.length },
                    { id: 'View Complaints', icon: '📋', count: complaints.length },
                    { id: 'Volunteer Intel', icon: '🛡️', count: volunteerAnalytics?.summary?.totalVolunteers },
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
                            <ChartCard id="chart-status" title="Complaint Status Distribution" icon="🕒">
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

                            <ChartCard id="chart-category" title="Complaint Categories" icon="🏷️">
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

                            <ChartCard id="chart-user-roles" title="User Roles Breakup" icon="👤">
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
                            <ChartCard id="chart-trends" title="Monthly Complaint Trends (6 Months)" icon="📉" height={400}>
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

                            <ChartCard id="chart-last-7-days" title="Complaints — Last 7 Days" icon="📊" height={400}>
                                <div style={{ width: '65%', margin: '0 auto' }}>
                                    <BarChart data={complaintsLast7Days}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.05} />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="count" fill="#3b82f6" radius={[12, 12, 0, 0]} />
                                    </BarChart>
                                </div>
                            </ChartCard>

                            <ChartCard id="chart-30-days-reg" title="Registrations — Last 30 Days" icon="📈" height={400}>
                                <LineChart data={registrationsLast30Days}>
                                    <defs>
                                        <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.05} />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 5 }} activeDot={{ r: 7 }} />
                                </LineChart>
                            </ChartCard>

                            <ChartCard id="chart-volunteer-resolutions" title="Issues Resolved by Volunteers" icon="🛡️" height={400}>
                                <AreaChart data={volunteerAnalytics?.volunteers.map(v => ({
                                    name: v.name.split(' ')[0],
                                    resolved: v.stats.completed
                                })).sort((a, b) => b.resolved - a.resolved) || []}>
                                    <defs>
                                        <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.05} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="resolved" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorResolved)" />
                                </AreaChart>
                            </ChartCard>
                        </div>

                        {/* Geographic Distribution Map */}
                        <div className="mt-8">
                            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[40px] shadow-sm border border-black/5 dark:border-white/5 overflow-hidden">
                                <h3 className="text-xl font-black flex items-center gap-3 mb-6">
                                    <span className="w-10 h-10 bg-civic-green/10 text-civic-green rounded-xl flex items-center justify-center">🗺️</span>
                                    Geographic Incident Map
                                </h3>
                                <div className="h-[500px] w-full rounded-3xl overflow-hidden border border-black/10 dark:border-white/10 z-0 relative">
                                    <MapContainer
                                        center={[18.5204, 73.8567]} // India center roughly, or will pan
                                        zoom={5}
                                        className="w-full h-full z-0"
                                    >
                                        <TileLayer
                                            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                                            attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                                        />
                                        {complaints.filter(c => c.latitude != null && c.longitude != null && !isNaN(parseFloat(c.latitude)) && !isNaN(parseFloat(c.longitude))).map((issue) => (
                                            <Marker
                                                key={issue._id}
                                                position={[parseFloat(issue.latitude), parseFloat(issue.longitude)]}
                                                icon={customMarkerIcon}
                                            >
                                                <Popup className="rounded-xl">
                                                    <div className="p-1 min-w-[200px]">
                                                        <p className="font-bold text-sm mb-1 text-black">{issue.title}</p>
                                                        <p className="text-xs text-zinc-500 mb-2">{issue.fullAddress || issue.location || 'Location Not Provided'}</p>
                                                        <div className="pt-2 border-t border-black/5 flex justify-between items-center">
                                                            <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider ${issue.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' : issue.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{issue.status}</span>
                                                            <span className="text-[10px] font-bold text-zinc-400">{new Date(issue.createdAt).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        ))}
                                    </MapContainer>
                                </div>
                            </div>
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
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <p className="text-[10px] opacity-30 font-black uppercase tracking-tighter">Ref: {complaint._id.slice(-8)}</p>
                                                            <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
                                                            <p className="text-[10px] text-civic-green font-black uppercase tracking-tighter">By: {complaint.citizenName}</p>
                                                        </div>
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
                                                        <div className="flex flex-col gap-0.5">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-2 h-2 rounded-full bg-civic-green shadow-neon"></span>
                                                                <span className="text-sm font-black opacity-80">
                                                                    {complaint.volunteerName || 'Awaiting Acceptance'}
                                                                    {complaint.volunteerId && (
                                                                        <span className="ml-2 text-xs opacity-50">
                                                                            (ID: {complaint.volunteerId})
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                            {complaint.assignedByRole === 'admin' && (
                                                                <p className="text-[8px] font-black uppercase text-amber-500 ml-4 tracking-widest">Assigned by Admin</p>
                                                            )}
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

                {/* Volunteer Intel Tab */}
                {activeTab === 'Volunteer Intel' && volunteerAnalytics && (
                    <motion.div
                        key="volunteer-intel"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-8"
                    >
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                            {[
                                {
                                    label: 'Total Volunteers',
                                    value: volunteerAnalytics.summary.totalVolunteers,
                                    icon: '🛡️',
                                    color: 'bg-blue-500',
                                    gradient: 'from-blue-500 to-blue-600'
                                },
                                {
                                    label: 'Active Volunteers',
                                    value: volunteerAnalytics.summary.activeVolunteers,
                                    icon: '⚡',
                                    color: 'bg-emerald-500',
                                    gradient: 'from-emerald-500 to-emerald-600'
                                },
                                {
                                    label: 'Assigned Issues',
                                    value: volunteerAnalytics.summary.totalAssignedIssues,
                                    icon: '📌',
                                    color: 'bg-purple-500',
                                    gradient: 'from-purple-500 to-purple-600'
                                },
                                {
                                    label: 'Completed',
                                    value: volunteerAnalytics.summary.totalCompletedByVolunteers,
                                    icon: '✅',
                                    color: 'bg-civic-green',
                                    gradient: 'from-civic-green to-emerald-500'
                                },
                                {
                                    label: 'Success Rate',
                                    value: `${volunteerAnalytics.summary.overallCompletionRate}%`,
                                    icon: '📊',
                                    color: 'bg-amber-500',
                                    gradient: 'from-amber-500 to-orange-500'
                                }
                            ].map((card, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="relative group"
                                >
                                    <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-10 rounded-[32px] transition-all duration-500 blur-xl`}></div>
                                    <div className="relative bg-white dark:bg-zinc-900 p-8 rounded-[32px] shadow-lg border border-black/5 dark:border-white/5 hover:shadow-2xl transition-all duration-300">
                                        <div className={`w-14 h-14 ${card.color} rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-lg`}>
                                            {card.icon}
                                        </div>
                                        <p className="text-4xl font-black mb-2" style={{ color: 'var(--text-color)' }}>{card.value}</p>
                                        <p className="text-xs font-bold opacity-40 uppercase tracking-widest">{card.label}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Top Performers */}
                        <div className="bg-white dark:bg-zinc-900 p-10 rounded-[40px] shadow-2xl border border-black/5 dark:border-white/5">
                            <div className="mb-8 flex items-center justify-between">
                                <div>
                                    <h3 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-color)' }}>Top Performers 🏆</h3>
                                    <p className="text-sm font-bold opacity-40 mt-1 uppercase tracking-widest">Heroes of the Community</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                                {volunteerAnalytics.topPerformers.map((volunteer, idx) => (
                                    <motion.div
                                        key={volunteer._id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="relative group"
                                    >
                                        <div className="absolute -inset-1 bg-gradient-to-r from-civic-green to-emerald-500 rounded-[28px] opacity-0 group-hover:opacity-20 blur-lg transition-all duration-500"></div>
                                        <div className="relative bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-[24px] border border-zinc-200 dark:border-zinc-700 hover:border-civic-green/50 transition-all">
                                            {/* Rank Badge */}
                                            <div className="absolute -top-3 -right-3 w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-black text-sm shadow-lg border-4 border-white dark:border-zinc-900">
                                                #{idx + 1}
                                            </div>

                                            {/* Avatar */}
                                            <div className="w-16 h-16 bg-gradient-to-br from-civic-green to-emerald-500 rounded-2xl flex items-center justify-center text-2xl font-black text-white mb-4 mx-auto shadow-lg">
                                                {volunteer.name.split(' ').map(n => n[0]).join('')}
                                            </div>

                                            {/* Name */}
                                            <h4 className="font-black text-center mb-1 text-sm" style={{ color: 'var(--text-color)' }}>
                                                {volunteer.name}
                                            </h4>
                                            <p className="text-[10px] text-center font-bold opacity-40 mb-4 uppercase tracking-wider">
                                                {volunteer.volunteerId}
                                            </p>

                                            {/* Stats */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center p-2 bg-white dark:bg-zinc-900 rounded-xl">
                                                    <span className="text-[10px] font-bold opacity-60 uppercase tracking-wider">Completed</span>
                                                    <span className="text-sm font-black text-civic-green">{volunteer.stats.completed}</span>
                                                </div>
                                                <div className="flex justify-between items-center p-2 bg-white dark:bg-zinc-900 rounded-xl">
                                                    <span className="text-[10px] font-bold opacity-60 uppercase tracking-wider">Success Rate</span>
                                                    <span className="text-sm font-black text-amber-500">{volunteer.stats.completionRate}%</span>
                                                </div>
                                                {volunteer.stats.avgRating > 0 && (
                                                    <div className="flex justify-between items-center p-2 bg-white dark:bg-zinc-900 rounded-xl">
                                                        <span className="text-[10px] font-bold opacity-60 uppercase tracking-wider">Rating</span>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-yellow-500">⭐</span>
                                                            <span className="text-sm font-black">{volunteer.stats.avgRating}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* All Volunteers Table */}
                        <div className="bg-white dark:bg-zinc-900 p-10 rounded-[40px] shadow-2xl border border-black/5 dark:border-white/5">
                            <div className="mb-8">
                                <h3 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-color)' }}>Volunteer Directory</h3>
                                <p className="text-sm font-bold opacity-40 mt-1 uppercase tracking-widest">Complete Performance Overview</p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b-2 border-zinc-200 dark:border-zinc-800">
                                            <th className="text-left p-4 text-[10px] font-black uppercase tracking-widest opacity-40">Volunteer</th>
                                            <th className="text-left p-4 text-[10px] font-black uppercase tracking-widest opacity-40">ID</th>
                                            <th className="text-center p-4 text-[10px] font-black uppercase tracking-widest opacity-40">Assigned</th>
                                            <th className="text-center p-4 text-[10px] font-black uppercase tracking-widest opacity-40">Completed</th>
                                            <th className="text-center p-4 text-[10px] font-black uppercase tracking-widest opacity-40">In Progress</th>
                                            <th className="text-center p-4 text-[10px] font-black uppercase tracking-widest opacity-40">Success Rate</th>
                                            <th className="text-center p-4 text-[10px] font-black uppercase tracking-widest opacity-40">Avg Rating</th>
                                            <th className="text-center p-4 text-[10px] font-black uppercase tracking-widest opacity-40">Reviews</th>
                                            <th className="text-left p-4 text-[10px] font-black uppercase tracking-widest opacity-40">Location</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {volunteerAnalytics.volunteers.map((volunteer, idx) => (
                                            <motion.tr
                                                key={volunteer._id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-all group"
                                            >
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-md">
                                                            {volunteer.name.split(' ').map(n => n[0]).join('')}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm" style={{ color: 'var(--text-color)' }}>{volunteer.name}</p>
                                                            <p className="text-[10px] opacity-40 font-medium">{volunteer.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-black inline-block">
                                                        {volunteer.volunteerId}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="text-sm font-black" style={{ color: 'var(--text-color)' }}>{volunteer.stats.totalAssigned}</span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="inline-flex items-center gap-1 px-3 py-1 bg-civic-green/10 text-civic-green rounded-lg">
                                                        <span className="text-xs">✓</span>
                                                        <span className="text-sm font-black">{volunteer.stats.completed}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
                                                        <span className="text-xs">⏳</span>
                                                        <span className="text-sm font-black">{volunteer.stats.inProgress}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="relative w-16 h-16 mx-auto">
                                                        <svg className="w-full h-full transform -rotate-90">
                                                            <circle
                                                                cx="32"
                                                                cy="32"
                                                                r="28"
                                                                stroke="currentColor"
                                                                strokeWidth="4"
                                                                fill="none"
                                                                className="text-zinc-200 dark:text-zinc-800"
                                                            />
                                                            <circle
                                                                cx="32"
                                                                cy="32"
                                                                r="28"
                                                                stroke="currentColor"
                                                                strokeWidth="4"
                                                                fill="none"
                                                                strokeDasharray={`${volunteer.stats.completionRate * 1.76} 176`}
                                                                className="text-amber-500 transition-all duration-1000"
                                                            />
                                                        </svg>
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <span className="text-xs font-black">{volunteer.stats.completionRate}%</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    {volunteer.stats.avgRating > 0 ? (
                                                        <div className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-500/10 rounded-lg">
                                                            <span className="text-yellow-500">⭐</span>
                                                            <span className="text-sm font-black text-yellow-600 dark:text-yellow-400">{volunteer.stats.avgRating}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs opacity-40 font-medium">No ratings</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="text-sm font-black opacity-60">{volunteer.stats.totalReviews}</span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs opacity-40">📍</span>
                                                        <span className="text-xs font-medium opacity-60">{volunteer.location || 'N/A'}</span>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {volunteerAnalytics.volunteers.length === 0 && (
                                <div className="text-center py-20">
                                    <div className="text-6xl mb-4 opacity-20">🛡️</div>
                                    <p className="text-2xl font-black opacity-40 mb-2">No Volunteers Yet</p>
                                    <p className="text-sm opacity-60">Volunteers will appear here once they register</p>
                                </div>
                            )}
                        </div>

                        {/* Category Distribution Chart */}
                        {volunteerAnalytics.categoryStats && volunteerAnalytics.categoryStats.length > 0 && (
                            <div className="bg-white dark:bg-zinc-900 p-10 rounded-[40px] shadow-2xl border border-black/5 dark:border-white/5">
                                <div className="mb-8">
                                    <h3 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-color)' }}>Issue Category Distribution</h3>
                                    <p className="text-sm font-bold opacity-40 mt-1 uppercase tracking-widest">Where Volunteers Are Most Active</p>
                                </div>
                                <ResponsiveContainer width="100%" height={400}>
                                    <BarChart data={volunteerAnalytics.categoryStats.map(c => ({ name: c._id, value: c.count }))}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                                        <XAxis dataKey="name" stroke="var(--text-color)" style={{ fontSize: '12px', fontWeight: 'bold' }} />
                                        <YAxis stroke="var(--text-color)" style={{ fontSize: '12px', fontWeight: 'bold' }} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'var(--bg-color)',
                                                border: '1px solid var(--card-border)',
                                                borderRadius: '12px',
                                                fontWeight: 'bold'
                                            }}
                                        />
                                        <Bar dataKey="value" fill="#10b981" radius={[12, 12, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
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

const ChartCard = ({ id, title, icon, children, height = 350 }) => (
    <div id={id} className="bg-white dark:bg-zinc-900 p-10 rounded-[40px] shadow-sm border border-black/5 dark:border-white/5 flex flex-col">
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

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="p-10 bg-red-50 text-red-600 font-mono text-sm max-w-[1800px] mx-auto mt-10 rounded-3xl">
                    <h1 className="text-2xl font-black mb-4 uppercase">React Crash Log</h1>
                    <p className="whitespace-pre-wrap">{this.state.error?.stack || this.state.error?.message}</p>
                </div>
            )
        }
        return this.props.children;
    }
}

export default function SafeAdminDashboard() {
    return (
        <ErrorBoundary>
            <AdminDashboard />
        </ErrorBoundary>
    )
}
