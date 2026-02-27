import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const navItems = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/report-issue', label: 'Report Issue' },
    { to: '/register-clean', label: 'Register Clean' },
    { to: '/my-complaints', label: 'View Complaints' },
    { to: '/account', label: 'Account' },
]

const Navbar = () => {
    const { user, logout } = useAuth()
    const { theme, toggleTheme } = useTheme()
    const navigate = useNavigate()
    const [isOpen, setIsOpen] = useState(false)

    const dynamicNavItems = [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/report-issue', label: 'Report Issue' },
        { to: '/register-clean', label: 'Register Clean' },
        { to: '/my-complaints', label: 'View Complaints' },
        ...(user?.role === 'volunteer' ? [{ to: '/volunteer-dashboard', label: 'Volunteer' }] : []),
        { to: '/account', label: 'Account' },
    ]

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <nav className="glass sticky top-0 z-50 py-1">
            <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => {
                        navigate('/dashboard')
                        setIsOpen(false)
                    }}
                >
                    <span className="font-black text-2xl tracking-tight" style={{ color: 'var(--text-color)' }}>
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
                                `relative px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 ${isActive
                                    ? 'text-civic-green'
                                    : 'opacity-60 hover:opacity-100 hover:bg-white hover:bg-opacity-10'
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

                    <div className="flex items-center gap-2 ml-4 border-l pl-4" style={{ borderColor: 'var(--card-border)' }}>
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={toggleTheme}
                            className="p-2 rounded-xl bg-white bg-opacity-0 hover:bg-opacity-10 transition-all text-xl"
                            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                        >
                            {theme === 'light' ? '🌙' : '☀️'}
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleLogout}
                            className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-red-500 bg-red-500 bg-opacity-0 hover:bg-opacity-10 border border-red-500 border-opacity-0 hover:border-opacity-30 transition-all duration-300"
                        >
                            Exit
                        </motion.button>
                    </div>
                </div>

                {/* Mobile Menu Button */}
                <div className="md:hidden flex items-center gap-4">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={toggleTheme}
                        className="p-2 text-xl"
                    >
                        {theme === 'light' ? '🌙' : '☀️'}
                    </motion.button>
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-2 text-2xl focus:outline-none"
                    >
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
                        className="md:hidden border-t overflow-hidden glass shadow-2xl"
                        style={{ borderColor: 'var(--card-border)' }}
                    >
                        <div className="flex flex-col p-4 space-y-4">
                            {dynamicNavItems.map(({ to, label }) => (
                                <NavLink
                                    key={to}
                                    to={to}
                                    onClick={() => setIsOpen(false)}
                                    className={({ isActive }) =>
                                        `block px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isActive
                                            ? 'bg-civic-green text-black'
                                            : 'opacity-60'
                                        }`
                                    }
                                >
                                    {label}
                                </NavLink>
                            ))}
                            <button
                                onClick={() => {
                                    setIsOpen(false)
                                    handleLogout()
                                }}
                                className="w-full px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-red-500 bg-red-500/10 border border-red-500/20 text-left"
                            >
                                Terminate Session
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    )
}

export default Navbar
