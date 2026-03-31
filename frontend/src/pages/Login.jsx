import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

const Login = () => {
    const [form, setForm] = useState({ email: '', password: '', role: 'Citizen' })
    const [showPass, setShowPass] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { login } = useAuth()
    const navigate = useNavigate()

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        if (!form.email || !form.password) { setError('All fields required'); return }
        setLoading(true)
        try {
            const { data } = await api.post('/auth/login', form)
            login(data.token, data.user)
            if (data.user.role === 'volunteer') {
                navigate('/volunteer-dashboard')
            } else if (data.user.role === 'admin') {
                navigate('/admin/dashboard')
            } else {
                navigate('/dashboard')
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative z-10 w-full max-w-md"
            >
                <div className="text-center mb-10">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="relative inline-flex items-center justify-center w-24 h-24 bg-civic-green bg-opacity-10 border border-civic-green border-opacity-30 rounded-[2.5rem] mb-6 shadow-neon group overflow-hidden"
                    >
                        {/* Blinking Glow Layer */}
                        <motion.div
                            animate={{
                                opacity: [0.2, 0.5, 0.2],
                                scale: [1, 1.2, 1]
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="absolute inset-0 bg-civic-green bg-opacity-20 blur-2xl"
                        />

                        {/* Scanning Scanline */}
                        <motion.div
                            animate={{ top: ['-100%', '200%'] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            className="absolute left-0 w-full h-1/2 bg-gradient-to-b from-transparent via-civic-green/20 to-transparent z-0"
                        />

                        <motion.span
                            animate={{
                                y: [0, -5, 0],
                                filter: ["drop-shadow(0 0 0px #00ff41)", "drop-shadow(0 0 10px #00ff41)", "drop-shadow(0 0 5px #00ff41)"]
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="text-5xl relative z-10"
                        >
                            🌿
                        </motion.span>
                    </motion.div>
                    <h1 className="text-4xl font-black tracking-tighter mb-2" style={{ color: 'var(--text-color)' }}>
                        CIVIC<span className="text-civic-green">TRACK</span>
                    </h1>
                    <p className="opacity-60 font-medium">Empowering Communities, One Clean Mission at a Time</p>
                </div>

                <div className="card">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-red-500 bg-opacity-10 border border-red-500 border-opacity-30 text-red-500 text-sm rounded-xl px-4 py-3"
                                >
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="space-y-1">
                            <label className="label">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="name@civictrack.org"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="label">Login Role</label>
                            <select
                                name="role"
                                value={form.role}
                                onChange={handleChange}
                                className="input-field appearance-none cursor-pointer"
                                style={{ backgroundColor: 'var(--input-bg)' }}
                            >
                                <option value="Citizen">Citizen</option>
                                <option value="Volunteer">Volunteer</option>
                                <option value="Admin">Admin</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="label">Password</label>
                            <div className="relative">
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    className="input-field pr-12"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 hover:text-civic-green transition-all"
                                >
                                    {showPass ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button type="submit" disabled={loading} className="btn-primary group relative overflow-hidden">
                                {loading ? (
                                    <span className="flex items-center justify-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Authorizing...
                                    </span>
                                ) : 'Enter Portal'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 pt-6 border-t text-center" style={{ borderColor: 'var(--card-border)' }}>
                        <p className="text-sm opacity-60">
                            New to the mission?{' '}
                            <Link to="/signup" className="text-civic-green font-bold hover:underline ml-1">
                                Create Account
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

export default Login
