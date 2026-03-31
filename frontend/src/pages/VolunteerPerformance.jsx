import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../api/axios';

const VolunteerPerformance = () => {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState('ALL');

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/admin/volunteer-analytics');
            setAnalytics(data);
        } catch (err) {
            console.error('Error fetching volunteer analytics:', err);
        } finally {
            setLoading(false);
        }
    };

    const downloadIntel = () => {
        if (!analytics) return;

        const reportData = {
            timestamp: new Date().toISOString(),
            summary: analytics.summary,
            topPerformers: analytics.topPerformers,
            allVolunteers: analytics.volunteers
        };

        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Volunteer_Intel_${Date.now()}.json`;
        link.click();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-civic-green border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
                    <p className="text-civic-green font-bold uppercase tracking-widest">Loading Intel...</p>
                </div>
            </div>
        );
    }

    const totalForce = analytics?.summary.totalVolunteers || 0;
    const successfulResolutions = analytics?.summary.totalCompletedByVolunteers || 0;
    const meritIndex = Math.round((parseFloat(analytics?.summary.overallCompletionRate) || 0) / 2); // Scale to 50

    return (
        <div className="min-h-screen bg-black text-white px-6 py-8">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-12">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4">
                        Mission <span className="text-civic-green italic">Intelligence</span>
                    </h1>
                    <p className="text-gray-400 text-sm uppercase tracking-widest font-bold">
                        Strategic oversight of volunteer operational impact and performance metrics.
                    </p>
                </motion.div>

                {/* Controls */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <button
                        onClick={downloadIntel}
                        className="flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl font-bold uppercase tracking-widest text-xs transition-all"
                    >
                        <span>📥</span> Export Intel
                    </button>

                    <div className="flex gap-2">
                        {['ALL', 'DAILY', 'WEEKLY', 'MONTHLY'].map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setTimeFilter(filter)}
                                className={`px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all ${
                                    timeFilter === filter
                                        ? 'bg-civic-green text-black'
                                        : 'bg-zinc-900 text-gray-400 hover:bg-zinc-800 border border-zinc-800'
                                }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {/* Total Operations Force */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="relative bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-3xl p-8 overflow-hidden group hover:border-blue-500/50 transition-all"
                >
                    <div className="absolute top-4 right-4 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6">
                        <span className="text-3xl">🛡️</span>
                    </div>
                    <div className="text-6xl font-black mb-4 text-blue-400">{totalForce}</div>
                    <p className="text-xs uppercase tracking-widest font-bold text-gray-500">Total Operations Force</p>
                </motion.div>

                {/* Successful Resolutions */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="relative bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-3xl p-8 overflow-hidden group hover:border-civic-green/50 transition-all"
                >
                    <div className="absolute top-4 right-4 w-3 h-3 bg-civic-green rounded-full animate-pulse"></div>
                    <div className="w-16 h-16 bg-civic-green/20 rounded-2xl flex items-center justify-center mb-6">
                        <span className="text-3xl">✅</span>
                    </div>
                    <div className="text-6xl font-black mb-4 text-civic-green">{successfulResolutions}</div>
                    <p className="text-xs uppercase tracking-widest font-bold text-gray-500">Successful Resolutions</p>
                </motion.div>

                {/* Global Merit Index */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="relative bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-3xl p-8 overflow-hidden group hover:border-amber-500/50 transition-all"
                >
                    <div className="absolute top-4 right-4 w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                    <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-6">
                        <span className="text-3xl">⭐</span>
                    </div>
                    <div className="text-6xl font-black mb-4 text-amber-400">
                        {meritIndex}<span className="text-2xl text-gray-600">/50</span>
                    </div>
                    <p className="text-xs uppercase tracking-widest font-bold text-gray-500">Global Merit Index</p>
                </motion.div>
            </div>

            {/* Bottom Sections */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Operatives */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-3xl p-8"
                >
                    <div className="mb-8">
                        <h2 className="text-2xl font-black mb-2 italic">TOP OPERATIVES</h2>
                        <p className="text-xs uppercase tracking-widest font-bold text-civic-green">Merit Distinction</p>
                    </div>

                    <div className="space-y-4">
                        {analytics?.topPerformers && analytics.topPerformers.length > 0 ? (
                            analytics.topPerformers.slice(0, 5).map((volunteer, idx) => (
                                <motion.div
                                    key={volunteer._id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.5 + idx * 0.1 }}
                                    className="flex items-center justify-between p-4 bg-black/50 border border-zinc-800 rounded-xl hover:border-civic-green/50 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${
                                                idx === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' :
                                                idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-black' :
                                                idx === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' :
                                                'bg-gradient-to-br from-civic-green to-emerald-500 text-white'
                                            }`}>
                                                {volunteer.name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-black border border-civic-green rounded-full flex items-center justify-center text-[10px] font-black">
                                                {idx + 1}
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm group-hover:text-civic-green transition-colors">{volunteer.name}</h3>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">{volunteer.volunteerId}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-black text-civic-green">{volunteer.stats.completed}</div>
                                        <p className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">Resolutions</p>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="text-center py-12 text-gray-600">
                                <div className="text-4xl mb-4 opacity-30">🛡️</div>
                                <p className="text-sm uppercase tracking-wider font-bold">No operatives deployed yet</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Resolution Matrix */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-3xl p-8"
                >
                    <div className="mb-8">
                        <h2 className="text-2xl font-black mb-2 italic">RESOLUTION MATRIX</h2>
                        <p className="text-xs uppercase tracking-widest font-bold text-civic-green">Efficiency Analytics Index</p>
                    </div>

                    <div className="space-y-6">
                        {/* Status Indicators */}
                        <div className="flex items-center gap-6 mb-8">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-civic-green rounded-full animate-pulse"></div>
                                <span className="text-xs uppercase tracking-wider font-bold text-gray-400">Resolved</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                                <span className="text-xs uppercase tracking-wider font-bold text-gray-400">In Progress</span>
                            </div>
                        </div>

                        {/* Performance Metrics */}
                        <div className="space-y-4">
                            <div className="p-4 bg-black/50 border border-zinc-800 rounded-xl">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs uppercase tracking-wider font-bold text-gray-400">Active Volunteers</span>
                                    <span className="text-2xl font-black text-civic-green">{analytics?.summary.activeVolunteers || 0}</span>
                                </div>
                                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-gradient-to-r from-civic-green to-emerald-400 h-full transition-all duration-1000"
                                        style={{ width: `${(analytics?.summary.activeVolunteers / analytics?.summary.totalVolunteers * 100) || 0}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="p-4 bg-black/50 border border-zinc-800 rounded-xl">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs uppercase tracking-wider font-bold text-gray-400">Total Assignments</span>
                                    <span className="text-2xl font-black text-blue-400">{analytics?.summary.totalAssignedIssues || 0}</span>
                                </div>
                                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-gradient-to-r from-blue-500 to-blue-400 h-full transition-all duration-1000"
                                        style={{ width: '100%' }}
                                    ></div>
                                </div>
                            </div>

                            <div className="p-4 bg-black/50 border border-zinc-800 rounded-xl">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs uppercase tracking-wider font-bold text-gray-400">Success Rate</span>
                                    <span className="text-2xl font-black text-amber-400">{analytics?.summary.overallCompletionRate || 0}%</span>
                                </div>
                                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-gradient-to-r from-amber-500 to-orange-400 h-full transition-all duration-1000"
                                        style={{ width: `${analytics?.summary.overallCompletionRate || 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        {/* Category Breakdown */}
                        <div className="mt-6 p-4 bg-black/50 border border-zinc-800 rounded-xl">
                            <h4 className="text-xs uppercase tracking-widest font-bold text-gray-500 mb-4">Category Distribution</h4>
                            <div className="space-y-2">
                                {analytics?.categoryStats && analytics.categoryStats.slice(0, 5).map((cat, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-xs">
                                        <span className="text-gray-400 font-bold uppercase tracking-wider">{cat._id}</span>
                                        <span className="text-civic-green font-black">{cat.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default VolunteerPerformance;
