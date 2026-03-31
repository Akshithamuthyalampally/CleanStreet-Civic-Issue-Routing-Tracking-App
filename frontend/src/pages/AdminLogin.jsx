import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

const AdminLogin = () => {
    const [form, setForm] = useState({ email: '', password: '', role: 'Admin' })
    const [showPass, setShowPass] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { login } = useAuth()
    const navigate = useNavigate()

    const adminEmailRegex = /^[a-zA-Z0-9._%+-]+@cleanstreet\.admin$/
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!adminEmailRegex.test(form.email)) {
            setError('Invalid admin email. Must end with @cleanstreet.admin')
            return
        }

        if (!passwordRegex.test(form.password)) {
            setError('Password must be at least 8 chars, including uppercase, lowercase, number and special char.')
            return
        }

        setLoading(true)
        try {
            const { data } = await api.post('/auth/login', { ...form, role: 'admin' })
            login(data.token, data.user)
            navigate('/admin/dashboard')
        } catch (err) {
            setError(err.response?.data?.message || 'Admin login failed')
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
                        className="relative inline-flex items-center justify-center w-24 h-24 bg-purple-500 bg-opacity-10 border border-purple-500 border-opacity-30 rounded-[2.5rem] mb-6 shadow-neon group overflow-hidden"
                    >
                        <motion.div
                            animate={{
                                opacity: [0.2, 0.5, 0.2],
                                scale: [1, 1.2, 1]
                            }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute inset-0 bg-purple-500 bg-opacity-20 blur-2xl"
                        />
                        <motion.span
                            animate={{
                                y: [0, -5, 0],
                                filter: ["drop-shadow(0 0 0px #a855f7)", "drop-shadow(0 0 10px #a855f7)", "drop-shadow(0 0 5px #a855f7)"]
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="text-5xl relative z-10"
                        >
                            🛡️
                        </motion.span>
                    </motion.div>
                    <h1 className="text-4xl font-black tracking-tighter mb-2" style={{ color: 'var(--text-color)' }}>
                        ADMIN<span className="text-purple-500">PORTAL</span>
                    </h1>
                    <p className="opacity-60 font-medium">Centralized Civic Management System</p>
                </div>

                <div className="card border-purple-500/30">
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
                            <label className="label">Admin Email</label>
                            <input
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                className="input-field border-purple-500/20 focus:border-purple-500/50"
                                placeholder="admin@cleanstreet.admin"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="label">Access Key</label>
                            <div className="relative">
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    className="input-field pr-12 border-purple-500/20 focus:border-purple-500/50"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 hover:text-purple-500 transition-all"
                                >
                                    {showPass ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button type="submit" disabled={loading} className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center space-x-2">
                                {loading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Authenticating...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Initialize Command Center</span>
                                        <span>🚀</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    )
}

export default AdminLogin
