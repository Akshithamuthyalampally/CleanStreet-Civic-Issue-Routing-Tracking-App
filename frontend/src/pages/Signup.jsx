import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/axios'

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

const Signup = () => {
    const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' })
    const [showPass, setShowPass] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        if (!form.name || !form.email || !form.password || !form.confirmPassword) {
            setError('All fields required'); return
        }
        if (!passwordRegex.test(form.password)) {
            setError('Password requirements not met'); return
        }
        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match'); return
        }

        setLoading(true)
        try {
            await api.post('/auth/register', { name: form.name, email: form.email, phone: form.phone, password: form.password })
            setSuccess('Registration successful! Access granted.')
            setTimeout(() => navigate('/login'), 2000)
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="relative z-10 w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="relative inline-flex items-center justify-center w-24 h-24 bg-civic-green bg-opacity-10 border border-civic-green border-opacity-30 rounded-[2.5rem] mb-6 shadow-neon group overflow-hidden mx-auto"
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
                    <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-color)' }}>Create Identity</h1>
                    <p className="opacity-60 mt-1">Join the Civic Intelligence Network</p>
                </div>

                <div className="card">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-red-500 bg-opacity-10 border border-red-500 border-opacity-30 text-red-500 text-xs rounded-xl px-4 py-2"
                                >
                                    {error}
                                </motion.div>
                            )}
                            {success && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-civic-green bg-opacity-10 border border-civic-green border-opacity-30 text-civic-green text-xs rounded-xl px-4 py-2"
                                >
                                    {success}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="label">Full Name</label>
                                <input name="name" value={form.name} onChange={handleChange} className="input-field" placeholder="Eg: Alex Mercer" />
                            </div>
                            <div className="col-span-2">
                                <label className="label">Email</label>
                                <input type="email" name="email" value={form.email} onChange={handleChange} className="input-field" placeholder="alex@network.org" />
                            </div>
                        </div>

                        <div>
                            <label className="label">Phone</label>
                            <input type="tel" name="phone" value={form.phone} onChange={handleChange} className="input-field" placeholder="+1 (555) 000-0000" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPass ? 'text' : 'password'}
                                        name="password"
                                        value={form.password}
                                        onChange={handleChange}
                                        className="input-field pr-10"
                                        placeholder="••••••••"
                                    />
                                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 hover:text-civic-green transition-all">
                                        {showPass ? '🙈' : '👁️'}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="label">Confirm</label>
                                <div className="relative">
                                    <input
                                        type={showConfirm ? 'text' : 'password'}
                                        name="confirmPassword"
                                        value={form.confirmPassword}
                                        onChange={handleChange}
                                        className="input-field pr-10"
                                        placeholder="••••••••"
                                    />
                                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 hover:text-civic-green transition-all">
                                        {showConfirm ? '🙈' : '👁️'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <p className="text-[10px] opacity-40 uppercase tracking-widest text-center px-4">
                            Password: 8+ chars • Uppercase • Number • Special
                        </p>

                        <button type="submit" disabled={loading} className="btn-primary mt-2">
                            {loading ? 'Initializing...' : 'Register as Citizen'}
                        </button>
                    </form>

                    <p className="text-center text-sm opacity-60 mt-6">
                        Already authenticated?{' '}
                        <Link to="/login" className="text-civic-green font-bold hover:underline">Sign In</Link>
                    </p>
                </div>
            </motion.div>
        </div>
    )
}

export default Signup
