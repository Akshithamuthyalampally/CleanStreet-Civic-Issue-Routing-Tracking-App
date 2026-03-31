import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import Papa from 'papaparse';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const AdminVolunteerPerformance = () => {
    const { user: currentUser } = useAuth();
    const [performanceData, setPerformanceData] = useState(null);
    const [feedbackData, setFeedbackData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [feedbackLoading, setFeedbackLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('all'); // 'daily', 'weekly', 'monthly', 'all'
    const [searchTerm, setSearchTerm] = useState('');
    const [feedbackSearchTerm, setFeedbackSearchTerm] = useState('');
    const [error, setError] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [activeTab, setActiveTab] = useState('performance'); // 'performance' or 'feedback'

    useEffect(() => {
        fetchPerformance();
        fetchFeedback();
    }, [timeRange]);

    const fetchPerformance = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/admin/volunteer-performance?timeRange=${timeRange}`);
            setPerformanceData(res.data);
        } catch (err) {
            console.error('Performance Fetch Error:', err);
            setError('Failed to sync intelligence data. Contact headquarters.');
        } finally {
            setLoading(false);
        }
    };

    const fetchFeedback = async () => {
        setFeedbackLoading(true);
        try {
            const res = await api.get('/admin/issue-feedback');
            setFeedbackData(res.data);
        } catch (err) {
            console.error('Feedback Fetch Error:', err);
        } finally {
            setFeedbackLoading(false);
        }
    };

    const downloadCSV = () => {
        if (!performanceData) return;
        setIsDownloading(true);
        try {
            const data = performanceData.volunteers.map(v => ({
                'Name': v.name,
                'Volunteer ID': v.volunteerId,
                'Email': v.email,
                'Status': v.status,
                'Tasks Resolved': v.metrics.tasksResolved,
                'Tasks In Progress': v.metrics.tasksInProgress,
                'Avg Rating': v.metrics.averageRating,
                'Max Rating': v.metrics.maxRating,
                'Min Rating': v.metrics.minRating,
                'Total Evaluations': v.metrics.totalFeedback
            }));
            
            const csv = Papa.unparse(data);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `CIVICHUB_Intel_${timeRange.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Export Error:', err);
        } finally {
            setIsDownloading(false);
        }
    };

    const filteredVolunteers = useMemo(() => {
        if (!performanceData) return [];
        return performanceData.volunteers.filter(v => 
            v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.volunteerId.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [performanceData, searchTerm]);

    const leaderboard = useMemo(() => {
        if (!performanceData) return [];
        return [...performanceData.volunteers]
            .sort((a, b) => {
                if (b.metrics.tasksResolved !== a.metrics.tasksResolved) {
                    return b.metrics.tasksResolved - a.metrics.tasksResolved;
                }
                return b.metrics.averageRating - a.metrics.averageRating;
            })
            .slice(0, 3);
    }, [performanceData]);

    const chartData = useMemo(() => {
        if (!performanceData) return [];
        return performanceData.volunteers.slice(0, 10).map(v => ({
            name: v.name.split(' ')[0],
            resolved: v.metrics.tasksResolved,
            inProgress: v.metrics.tasksInProgress,
            rating: v.metrics.averageRating
        }));
    }, [performanceData]);

    const filteredFeedback = useMemo(() => {
        if (!feedbackData.length) return [];
        return feedbackData.filter(f =>
            f.citizenName?.toLowerCase().includes(feedbackSearchTerm.toLowerCase()) ||
            f.citizenId?.toLowerCase().includes(feedbackSearchTerm.toLowerCase()) ||
            f.volunteerName?.toLowerCase().includes(feedbackSearchTerm.toLowerCase()) ||
            f.volunteerUniqueId?.toLowerCase().includes(feedbackSearchTerm.toLowerCase()) ||
            f.issueTitle?.toLowerCase().includes(feedbackSearchTerm.toLowerCase())
        );
    }, [feedbackData, feedbackSearchTerm]);

    const downloadFeedbackCSV = () => {
        if (!feedbackData.length) return;
        setIsDownloading(true);
        try {
            const data = feedbackData.map(f => ({
                'Citizen Name': f.citizenName,
                'Citizen ID': f.citizenId,
                'Volunteer Name': f.volunteerName,
                'Volunteer ID': f.volunteerUniqueId,
                'Issue Title': f.issueTitle,
                'Issue Category': f.issueCategory,
                'Overall Rating': f.overallRating,
                'Service Quality': f.serviceQuality,
                'Response Time': f.responseTime,
                'Professionalism': f.volunteerProfessionalism,
                'Comments': f.comments || 'N/A',
                'Date': new Date(f.date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
            }));

            const csv = Papa.unparse(data);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `CIVICHUB_Feedback_Report_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Export Error:', err);
        } finally {
            setIsDownloading(false);
        }
    };

    const getRatingColor = (rating) => {
        if (rating >= 4) return 'text-civic-green';
        if (rating === 3) return 'text-yellow-400';
        return 'text-red-500';
    };

    const getRatingBg = (rating) => {
        if (rating >= 4) return 'bg-civic-green/10 border-civic-green/20';
        if (rating === 3) return 'bg-yellow-400/10 border-yellow-400/20';
        return 'bg-red-500/10 border-red-500/20';
    };

    if (loading && !performanceData) {
        return (
            <div className="flex flex-col items-center justify-center py-40">
                <div className="w-16 h-16 border-4 border-civic-green border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(0,255,65,0.4)]"></div>
                <p className="opacity-60 mt-8 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Establishing Mission Link...</p>
            </div>
        );
    }

    return (
        <div className="main-container min-h-screen pb-24 max-w-7xl mx-auto px-6 pt-12">
            {/* Header Area */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-16 gap-8"
            >
                <div className="max-w-2xl">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="h-px w-12 bg-civic-green/50"></span>
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-civic-green">Administrative Command</span>
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter text-white mb-4 leading-tight">
                        Mission <span className="text-civic-green italic">Intelligence</span>
                    </h1>
                    <p className="opacity-40 text-sm font-bold uppercase tracking-widest leading-relaxed">Strategic oversight of volunteer operational impact and performance metrics.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                    <motion.button
                        whileHover={{ scale: 1.05, boxShadow: '0 0 25px rgba(255,255,255,0.1)' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={downloadCSV}
                        disabled={isDownloading}
                        className="w-full sm:w-auto px-8 py-3.5 bg-zinc-800 hover:bg-zinc-700 border border-white/5 rounded-[24px] text-[10px] font-black uppercase tracking-widest text-white transition-all flex items-center justify-center gap-3"
                    >
                        <span>📥</span> {isDownloading ? 'Processing...' : 'Export Intel'}
                    </motion.button>

                    <div className="flex items-center gap-3 bg-zinc-900/40 p-2 rounded-[28px] border border-white/5 backdrop-blur-3xl w-full sm:w-auto justify-center">
                        {['all', 'daily', 'weekly', 'monthly'].map(range => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-6 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${
                                    timeRange === range 
                                    ? 'bg-civic-green text-black shadow-[0_0_25px_rgba(0,255,65,0.4)]' 
                                    : 'text-white/30 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* Top Summaries */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
                {[
                    { label: 'Total Operations Force', val: performanceData?.summary?.totalVolunteers ?? 0, icon: '🛡️', color: 'from-blue-600/20 to-transparent', glow: 'shadow-[0_0_40px_rgba(37,99,235,0.15)]', text: 'text-blue-500' },
                    { label: 'Successful Resolutions', val: performanceData?.summary?.totalResolvedTasks ?? 0, icon: '✅', color: 'from-emerald-600/20 to-transparent', glow: 'shadow-[0_0_50px_rgba(0,255,65,0.2)]', text: 'text-civic-green' },
                    { label: 'Global Merit Index', val: performanceData?.summary?.teamAverageRating ?? 0, icon: '⭐', color: 'from-yellow-600/20 to-transparent', glow: 'shadow-[0_0_40px_rgba(234,179,8,0.15)]', text: 'text-yellow-400', suffix: '/ 5.0' }
                ].map((s, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`bg-zinc-900/40 border border-white/5 p-12 rounded-[56px] relative overflow-hidden group backdrop-blur-3xl transition-all duration-500 hover:border-white/20 ${s.glow}`}
                    >
                        <div className={`absolute inset-0 bg-gradient-to-br ${s.color} opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
                        <div className="relative z-10">
                            <div className="text-4xl mb-8 bg-white/5 w-20 h-20 flex items-center justify-center rounded-[28px] border border-white/5 shadow-inner">{s.icon}</div>
                            <div className={`text-6xl font-black mb-2 tracking-tighter ${s.text}`}>{s.val}<span className="text-2xl ml-1 opacity-40 font-bold">{s.suffix}</span></div>
                            <div className="text-[11px] font-black uppercase tracking-[0.4em] opacity-30 mt-6 leading-relaxed">{s.label}</div>
                        </div>
                        
                        {/* Status Light */}
                        <div className="absolute top-12 right-12 w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: s.text.includes('blue') ? '#3b82f6' : s.text.includes('green') ? '#00ff41' : '#eab308' }} />
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-20">
                {/* Leaderboard */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="lg:col-span-1 bg-zinc-900/40 border border-white/5 rounded-[56px] p-12 backdrop-blur-3xl relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-12 opacity-[0.02] text-8xl pointer-events-none group-hover:opacity-[0.05] transition-opacity">🏆</div>
                    
                    <div className="flex items-center justify-between mb-12">
                        <div className="space-y-1">
                            <h3 className="text-2xl font-black uppercase tracking-tighter italic">Top Operatives</h3>
                            <p className="text-[9px] font-bold text-civic-green uppercase tracking-[0.3em]">Merit Distinction</p>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {leaderboard.map((v, i) => (
                            <div key={v._id} className="relative">
                                <div className="flex items-center gap-6 p-6 rounded-[32px] bg-white/[0.03] border border-white/5 group/card hover:bg-white/[0.05] hover:border-civic-green/30 transition-all duration-300">
                                    <div className="relative text-3xl font-black w-14 h-14 flex items-center justify-center bg-zinc-800 rounded-2xl border border-white/10 shadow-xl">
                                        {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-black text-base group-hover/card:text-civic-green transition-colors leading-tight">{v.name}</h4>
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{v.metrics.tasksResolved} SUCCESSES</span>
                                            <span className="w-1 h-1 rounded-full bg-white/10" />
                                            <span className="text-[10px] font-black text-civic-green tracking-widest">{v.metrics.averageRating} RTNG</span>
                                        </div>
                                    </div>
                                </div>
                                {i === 0 && <div className="absolute -inset-0.5 bg-civic-green/20 blur opacity-30 rounded-[34px] -z-10 animate-pulse" />}
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Performance Chart */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="lg:col-span-2 bg-zinc-900/40 border border-white/5 rounded-[56px] p-12 backdrop-blur-3xl"
                >
                    <div className="flex justify-between items-start mb-12">
                        <div className="space-y-1">
                            <h3 className="text-2xl font-black uppercase tracking-tighter italic">Resolution Matrix</h3>
                            <p className="text-[9px] font-bold opacity-30 uppercase tracking-[0.3em]">Efficiency Analytics Index</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-civic-green shadow-[0_0_10px_rgba(0,255,65,0.5)]" />
                                <span className="text-[9px] font-bold opacity-40 uppercase tracking-widest">Resolved</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                <span className="text-[9px] font-bold opacity-40 uppercase tracking-widest">In Progress</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="h-[380px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} barGap={12}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" opacity={0.03} vertical={false} />
                                <XAxis 
                                    dataKey="name" 
                                    stroke="#ffffff" 
                                    opacity={0.3}
                                    fontSize={11} 
                                    fontWeight={900} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    dy={15}
                                />
                                <YAxis 
                                    stroke="#ffffff" 
                                    opacity={0.3}
                                    fontSize={11} 
                                    fontWeight={900} 
                                    axisLine={false} 
                                    tickLine={false} 
                                />
                                <Tooltip 
                                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                    contentStyle={{ 
                                        backgroundColor: '#09090b', 
                                        border: '1px solid rgba(255,255,255,0.08)', 
                                        borderRadius: '24px',
                                        fontSize: '12px',
                                        padding: '12px 16px',
                                        boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                                    }}
                                />
                                <Bar dataKey="resolved" fill="#00ff41" radius={[12, 12, 0, 0]} barSize={40} />
                                <Bar dataKey="inProgress" fill="#3b82f6" radius={[12, 12, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>

            {/* Detailed Table */}
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-zinc-900/40 border border-white/5 rounded-[56px] overflow-hidden backdrop-blur-3xl shadow-[0_50px_100px_rgba(0,0,0,0.3)]"
            >
                <div className="p-12 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-white/[0.01]">
                    <div className="space-y-1">
                        <h3 className="text-2xl font-black uppercase tracking-tighter italic text-white/90">Operative Directory</h3>
                        <p className="text-[9px] font-bold opacity-30 uppercase tracking-[0.3em]">Granular Personnel Metadata</p>
                    </div>
                    <div className="relative w-full md:w-80">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 opacity-20 text-sm">🔍</div>
                        <input 
                            type="text" 
                            placeholder="Find Personnel..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-zinc-800/40 border border-white/10 rounded-[28px] pl-14 pr-8 py-4 text-sm font-bold focus:outline-none focus:border-civic-green/50 focus:bg-zinc-800/60 transition-all placeholder:opacity-20 backdrop-blur-xl"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5">
                                <th className="px-12 py-8 text-[11px] font-black uppercase tracking-[0.4em] opacity-30">Operative Identity</th>
                                <th className="px-12 py-8 text-[11px] font-black uppercase tracking-[0.4em] opacity-30 text-center">Output</th>
                                <th className="px-12 py-8 text-[11px] font-black uppercase tracking-[0.4em] opacity-30 text-center">Active</th>
                                <th className="px-12 py-8 text-[11px] font-black uppercase tracking-[0.4em] opacity-30">Merit Index</th>
                                <th className="px-12 py-8 text-[11px] font-black uppercase tracking-[0.4em] opacity-30">Clearance Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            <AnimatePresence>
                                {filteredVolunteers.map((v, i) => (
                                    <motion.tr 
                                        key={v._id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="hover:bg-white/[0.04] transition-all duration-300 group cursor-default"
                                    >
                                        <td className="px-12 py-8">
                                            <div className="flex items-center gap-6">
                                                <div className="w-14 h-14 rounded-[22px] bg-civic-green/5 flex items-center justify-center text-civic-green border border-civic-green/10 font-black text-xl shadow-inner group-hover:scale-110 transition-transform duration-500">
                                                    {v.name[0]}
                                                </div>
                                                <div>
                                                    <p className="font-black text-lg group-hover:text-civic-green transition-colors leading-tight mb-1">{v.name}</p>
                                                    <p className="text-[10px] font-black opacity-20 uppercase tracking-[0.2em]">{v.volunteerId}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-12 py-8 font-black text-white/50 text-center text-lg">{v.metrics.tasksResolved}</td>
                                        <td className="px-12 py-8 font-black text-white/50 text-center text-lg">{v.metrics.tasksInProgress}</td>
                                        <td className="px-12 py-8">
                                            <div className="space-y-4">
                                                <div className="flex items-end gap-3">
                                                    <span className={`text-2xl font-black ${v.metrics.averageRating >= 4 ? 'text-civic-green' : v.metrics.averageRating >= 3 ? 'text-yellow-400' : 'text-red-500'}`}>
                                                        {v.metrics.averageRating}
                                                    </span>
                                                    <span className="text-[10px] opacity-20 font-bold tracking-widest mb-1.5 leading-none">Global Index</span>
                                                </div>
                                                <div className="w-48 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                    <motion.div 
                                                        initial={{ width: 0 }}
                                                        whileInView={{ width: `${(v.metrics.averageRating / 5) * 100}%` }}
                                                        className={`h-full ${v.metrics.averageRating >= 4 ? 'bg-civic-green shadow-[0_0_10px_#00ff41]' : v.metrics.averageRating >= 3 ? 'bg-yellow-400' : 'bg-red-500'}`}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-12 py-8">
                                            <div className="flex items-center gap-3">
                                                <span className={`w-2 h-2 rounded-full ${v.status === 'Active' ? 'bg-civic-green shadow-[0_0_10px_#00ff41]' : 'bg-white/20 opacity-50'}`} />
                                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${v.status === 'Active' ? 'text-civic-green' : 'text-white/30'}`}>
                                                    {v.status || 'OFFLINE'}
                                                </span>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
                {filteredVolunteers.length === 0 && (
                    <div className="py-32 text-center opacity-10">
                        <div className="text-8xl mb-8">🔍</div>
                        <p className="font-black uppercase tracking-[0.5em] text-sm">No Intel found on target identity.</p>
                    </div>
                )}
            </motion.div>

            {/* Citizen Feedback Log Section */}
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mt-20 bg-zinc-900/40 border border-white/5 rounded-[56px] overflow-hidden backdrop-blur-3xl shadow-[0_50px_100px_rgba(0,0,0,0.3)]"
            >
                <div className="p-12 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-gradient-to-r from-civic-green/5 to-transparent">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">📋</span>
                            <h3 className="text-2xl font-black uppercase tracking-tighter italic text-white/90">Citizen Feedback Log</h3>
                        </div>
                        <p className="text-[9px] font-bold opacity-30 uppercase tracking-[0.3em]">All Issue-Based Reviews Submitted by Citizens</p>
                        <p className="text-xs font-bold text-civic-green mt-2">{feedbackData.length} Total Evaluations</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <div className="relative w-full md:w-80">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 opacity-20 text-sm">🔍</div>
                            <input
                                type="text"
                                placeholder="Search feedback..."
                                value={feedbackSearchTerm}
                                onChange={(e) => setFeedbackSearchTerm(e.target.value)}
                                className="w-full bg-zinc-800/40 border border-white/10 rounded-[28px] pl-14 pr-8 py-4 text-sm font-bold focus:outline-none focus:border-civic-green/50 focus:bg-zinc-800/60 transition-all placeholder:opacity-20 backdrop-blur-xl"
                            />
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={downloadFeedbackCSV}
                            disabled={isDownloading || !feedbackData.length}
                            className="px-6 py-4 bg-civic-green/10 hover:bg-civic-green/20 border border-civic-green/20 rounded-[28px] text-[10px] font-black uppercase tracking-widest text-civic-green transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                        >
                            <span>📥</span> Export Feedback
                        </motion.button>
                    </div>
                </div>

                {feedbackLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center">
                        <div className="w-12 h-12 border-4 border-civic-green border-t-transparent rounded-full animate-spin"></div>
                        <p className="opacity-40 mt-4 text-xs font-bold uppercase tracking-widest">Loading feedback data...</p>
                    </div>
                ) : filteredFeedback.length === 0 ? (
                    <div className="py-32 text-center opacity-20">
                        <div className="text-8xl mb-8">📭</div>
                        <p className="font-black uppercase tracking-[0.5em] text-sm">No feedback records found.</p>
                        <p className="text-xs opacity-50 mt-2">Citizens haven't submitted any issue feedback yet.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {filteredFeedback.map((feedback, idx) => (
                            <motion.div
                                key={feedback._id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                className="p-8 hover:bg-white/[0.02] transition-all duration-300 group"
                            >
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                    {/* Citizen & Volunteer Info */}
                                    <div className="lg:col-span-4 space-y-6">
                                        {/* Citizen Info */}
                                        <div className="bg-white/[0.03] rounded-[24px] p-5 border border-white/5">
                                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-400 mb-3">Citizen Reporter</p>
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 font-black text-lg">
                                                    {feedback.citizenName?.[0] || 'C'}
                                                </div>
                                                <div>
                                                    <p className="font-black text-base leading-tight">{feedback.citizenName}</p>
                                                    <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest mt-1">ID: {feedback.citizenId}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Volunteer Info */}
                                        <div className="bg-white/[0.03] rounded-[24px] p-5 border border-white/5">
                                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-civic-green mb-3">Volunteer Evaluated</p>
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-civic-green/10 flex items-center justify-center text-civic-green border border-civic-green/20 font-black text-lg">
                                                    {feedback.volunteerName?.[0] || 'V'}
                                                </div>
                                                <div>
                                                    <p className="font-black text-base leading-tight">{feedback.volunteerName}</p>
                                                    <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest mt-1">ID: {feedback.volunteerUniqueId}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Issue & Ratings */}
                                    <div className="lg:col-span-5 space-y-6">
                                        {/* Issue Reference */}
                                        <div className="bg-white/[0.03] rounded-[24px] p-5 border border-white/5">
                                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-orange-400 mb-3">Issue Reference</p>
                                            <p className="font-bold text-sm leading-relaxed line-clamp-2">{feedback.issueTitle}</p>
                                            <div className="flex items-center gap-3 mt-3 flex-wrap">
                                                <span className="px-3 py-1 bg-orange-500/10 text-orange-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-orange-500/20">
                                                    {feedback.issueCategory}
                                                </span>
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                    feedback.issueStatus === 'Resolved' ? 'bg-civic-green/10 text-civic-green border-civic-green/20' :
                                                    feedback.issueStatus === 'In Progress' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                    'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                                }`}>
                                                    {feedback.issueStatus}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Ratings Grid */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className={`rounded-[20px] p-4 border ${getRatingBg(feedback.overallRating)}`}>
                                                <p className="text-[8px] font-black uppercase tracking-widest opacity-50 mb-2">Overall Rating</p>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-2xl font-black ${getRatingColor(feedback.overallRating)}`}>{feedback.overallRating}</span>
                                                    <span className="text-yellow-400">{'★'.repeat(feedback.overallRating)}{'☆'.repeat(5 - feedback.overallRating)}</span>
                                                </div>
                                            </div>
                                            <div className="rounded-[20px] p-4 border border-white/5 bg-white/[0.02]">
                                                <p className="text-[8px] font-black uppercase tracking-widest opacity-50 mb-2">Service Quality</p>
                                                <p className="text-sm font-black text-white/70">{feedback.serviceQuality}</p>
                                            </div>
                                            <div className="rounded-[20px] p-4 border border-white/5 bg-white/[0.02]">
                                                <p className="text-[8px] font-black uppercase tracking-widest opacity-50 mb-2">Response Time</p>
                                                <p className="text-sm font-black text-white/70">{feedback.responseTime}</p>
                                            </div>
                                            <div className="rounded-[20px] p-4 border border-white/5 bg-white/[0.02]">
                                                <p className="text-[8px] font-black uppercase tracking-widest opacity-50 mb-2">Professionalism</p>
                                                <p className="text-sm font-black text-white/70">{feedback.volunteerProfessionalism}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Comments & Date */}
                                    <div className="lg:col-span-3 space-y-6">
                                        {/* Comments */}
                                        <div className="bg-white/[0.03] rounded-[24px] p-5 border border-white/5 h-full flex flex-col">
                                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-purple-400 mb-3">Citizen Comments</p>
                                            <p className="text-sm font-medium opacity-60 italic leading-relaxed flex-1">
                                                {feedback.comments ? `"${feedback.comments}"` : 'No additional comments provided.'}
                                            </p>

                                            {/* Date & Time */}
                                            <div className="mt-4 pt-4 border-t border-white/5">
                                                <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30 mb-2">Submitted On</p>
                                                <p className="text-xs font-bold text-white/60">
                                                    {new Date(feedback.date).toLocaleDateString('en-IN', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })}
                                                </p>
                                                <p className="text-[10px] font-bold text-civic-green mt-1">
                                                    {new Date(feedback.date).toLocaleTimeString('en-IN', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        hour12: true
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </motion.div>
        </div>
    );
};

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
                <div className="p-20 bg-zinc-950 text-red-500 font-mono text-xs max-w-7xl mx-auto mt-20 rounded-[56px] border border-red-500/20 shadow-[0_0_100px_rgba(239,68,68,0.1)]">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-2xl">⚠️</div>
                        <h1 className="text-3xl font-black uppercase tracking-tighter">Critical Interface Breach</h1>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed opacity-60 border-l-2 border-red-500/30 pl-8 ml-6">{this.state.error?.stack || this.state.error?.message}</p>
                    <button onClick={() => window.location.reload()} className="mt-12 px-10 py-4 bg-red-500 text-black font-black uppercase tracking-widest text-[10px] rounded-2zl hover:scale-105 transition-transform">Emergency Reboot</button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default function SafeAdminVolunteerPerformance() {
    return (
        <ErrorBoundary>
            <AdminVolunteerPerformance />
        </ErrorBoundary>
    );
}
