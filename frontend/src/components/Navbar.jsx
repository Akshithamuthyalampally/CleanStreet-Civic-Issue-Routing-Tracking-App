import { useState } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useReviews } from '../context/ReviewContext'
import NotificationBell from './NotificationBell'

const Navbar = () => {
    const { user, logout } = useAuth()
    const { theme, toggleTheme } = useTheme()
    const navigate = useNavigate()
    const location = useLocation()
    const { unreadReviewCount, unreadVolunteerReviewCount } = useReviews() || {}
    
    const [isOpen, setIsOpen] = useState(false)
    const [isProfileOpen, setIsProfileOpen] = useState(false)

    const dynamicNavItems = user?.role === 'admin'
        ? [
            { to: '/admin/dashboard', label: 'Admin Panel' },
            { to: '/my-complaints', label: 'All Complaints' },
        ]
        : user?.role === 'volunteer'
            ? [
                { to: '/volunteer-dashboard', label: 'Dashboard' },
                { to: '/my-complaints', label: 'Manage Issues' },
            ]
            : [
                { to: '/dashboard', label: 'Dashboard' },
                { to: '/report-issue', label: 'Report Issue' },
                { to: '/my-complaints', label: 'View Complaints' },
                { to: '/submit-feedback', label: 'Feedback' },
            ];

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <nav className="glass sticky top-0 z-50 py-1 border-b" style={{ borderColor: 'var(--card-border)' }}>
            <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
                {/* Logo */}
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="flex items-center gap-2 cursor-pointer group"
                    onClick={() => {
                        const target = user?.role === 'admin' ? '/admin/dashboard' : user?.role === 'volunteer' ? '/volunteer-dashboard' : '/dashboard';
                        navigate(target)
                        setIsOpen(false)
                    }}
                >
                    <div className="w-8 h-8 bg-civic-green rounded-lg flex items-center justify-center shadow-neon rotate-12 group-hover:rotate-0 transition-all">
                        <span className="text-black font-black text-sm">C</span>
                    </div>
                    <span className="font-black text-xl tracking-tight" style={{ color: 'var(--text-color)' }}>
                        CIVIC<span className="text-civic-green">HUB</span>
                    </span>
                </motion.div>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-2">
                    {dynamicNavItems.map(({ to, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                `relative px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${isActive
                                    ? 'text-civic-green'
                                    : 'opacity-60 hover:opacity-100 hover:bg-white/5'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {label}
                                    {isActive && (
                                        <motion.div
                                            layoutId="nav-underline"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-civic-green shadow-neon"
                                        />
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}

                    <div className="flex items-center gap-3 ml-4 border-l pl-4" style={{ borderColor: 'var(--card-border)' }}>
                        <NotificationBell />

                        {/* Logged in as Badge */}
                        {user?.role === 'volunteer' && (
                            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30">
                                Volunteer
                            </span>
                        )}
                        {user?.role === 'admin' && (
                            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                Admin
                            </span>
                        )}

                        {/* Admin Feedback Badge */}
                        {user?.role === 'admin' && (
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => navigate('/admin/feedback')}
                                title="Admin Feedback"
                                className="relative p-2 rounded-xl hover:bg-white/5 transition-all text-xl"
                            >
                                ⭐
                                {unreadReviewCount > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-civic-green text-black text-[10px] font-black rounded-full flex items-center justify-center border-2 border-zinc-900 shadow-[0_0_10px_rgba(0,255,65,0.5)]">
                                        {unreadReviewCount > 99 ? '99+' : unreadReviewCount}
                                    </span>
                                )}
                            </motion.button>
                        )}

                        {/* Volunteer Ratings Badge */}
                        {user?.role === 'volunteer' && (
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => navigate('/volunteer/ratings')}
                                title="My Ratings"
                                className="relative p-2 rounded-xl hover:bg-white/5 transition-all text-xl"
                            >
                                🌟
                                {unreadVolunteerReviewCount > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-blue-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-zinc-900 shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                                        {unreadVolunteerReviewCount > 99 ? '99+' : unreadVolunteerReviewCount}
                                    </span>
                                )}
                            </motion.button>
                        )}

                        {/* Theme Toggle */}
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={toggleTheme}
                            className="p-2 rounded-xl hover:bg-white/5 transition-all text-xl"
                            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                        >
                            {theme === 'light' ? '🌙' : '☀️'}
                        </motion.button>

                        {/* Profile Dropdown */}
                        <div className="relative">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center text-sm font-black transition-all ${isProfileOpen ? 'border-civic-green shadow-neon' : 'border-zinc-800'}`}
                            >
                                {user?.name?.[0].toUpperCase() || 'U'}
                            </motion.button>
                            
                            <AnimatePresence>
                                {isProfileOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute right-0 mt-3 w-72 dropdown-menu z-50"
                                        >
                                            <div className="px-6 py-5 border-b" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                                                <p className="text-[11px] font-black uppercase tracking-widest text-civic-green opacity-80">
                                                    Logged in as {user?.role === 'admin' ? 'Admin' : user?.role === 'volunteer' ? 'Volunteer' : 'Citizen'}
                                                </p>
                                                <p className="text-base font-bold truncate mt-2" style={{ color: 'var(--text-color)' }}>{user?.name}</p>
                                                <div className="flex items-center gap-2 mt-3">
                                                    <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-civic-green/15 text-civic-green border border-civic-green/30">{user?.role}</span>
                                                </div>
                                            </div>
                                            <div className="p-3 space-y-1">
                                                <button onClick={() => { setIsProfileOpen(false); navigate('/account'); }} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-civic-green/10 transition-all" style={{ color: 'var(--text-color)' }}>
                                                    <span>👤</span> View Profile
                                                </button>
                                                <button onClick={() => { setIsProfileOpen(false); navigate('/account'); }} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-civic-green/10 transition-all" style={{ color: 'var(--text-color)' }}>
                                                    <span>⚙️</span> Settings
                                                </button>
                                                <div className="h-px my-2 mx-2" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }} />
                                                <button onClick={() => { setIsProfileOpen(false); handleLogout(); }} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500/15 text-red-500 transition-all">
                                                    <span>🔄</span> Switch Account
                                                </button>
                                                <button onClick={() => { setIsProfileOpen(false); handleLogout(); }} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500/15 text-red-500 transition-all">
                                                    <span>🚪</span> Logout
                                                </button>
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu Button */}
                <div className="md:hidden flex items-center gap-3">
                    <NotificationBell />
                    <button onClick={() => setIsOpen(!isOpen)} className="text-2xl transition-all">
                        {isOpen ? '✕' : '☰'}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden border-t border-white/5 overflow-hidden glass shadow-2xl"
                    >
                        <div className="flex flex-col p-4 space-y-2">
                            {dynamicNavItems.map(({ to, label }) => (
                                <NavLink
                                    key={to}
                                    to={to}
                                    onClick={() => setIsOpen(false)}
                                    className={({ isActive }) => `block px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isActive ? 'bg-civic-green text-black' : 'opacity-60'}`}
                                >
                                    {label}
                                </NavLink>
                            ))}
                            <div className="h-px bg-white/5 my-2 mx-3" />
                            {user?.role === 'admin' && (
                                <button onClick={() => { setIsOpen(false); navigate('/admin/feedback'); }} className="flex justify-between items-center px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 hover:bg-white/5 transition-all">
                                    Admin Feedback <span>⭐</span>
                                </button>
                            )}
                            {user?.role === 'volunteer' && (
                                <button onClick={() => { setIsOpen(false); navigate('/volunteer/ratings'); }} className="flex justify-between items-center px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 hover:bg-white/5 transition-all text-blue-400">
                                    My Ratings <span>🌟</span>
                                </button>
                            )}
                            <button onClick={() => { setIsOpen(false); handleLogout(); }} className="flex justify-between items-center px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-500/10 border border-red-500/20">
                                Logout <span>🚪</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    )
}

export default Navbar
