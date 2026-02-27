import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/axios'

const RegisterClean = () => {
    const [form, setForm] = useState({ areaName: '', city: '', preferredDate: '', volunteersCount: '' })
    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        if (!form.areaName || !form.city || !form.preferredDate || !form.volunteersCount) {
            setError('All fields required'); return
        }
        setLoading(true)
        try {
            await api.post('/clean/register', { ...form, volunteersCount: Number(form.volunteersCount) })
            setSuccess('Mission registration verified. Prepare for deployment.')
            setForm({ areaName: '', city: '', preferredDate: '', volunteersCount: '' })
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl"
        >
            <div className="mb-8">
                <h2 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-color)' }}>Register <span className="text-civic-green">Cleanup Mission</span></h2>
                <p className="opacity-60 font-medium">Coordinate community efforts for a cleaner biome.</p>
            </div>

            <div className="card relative overflow-hidden flex flex-col md:flex-row gap-8">
                <div className="flex-1 space-y-6 relative z-10">
                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-red-500 bg-opacity-10 border border-red-500 border-opacity-30 text-red-500 text-sm rounded-xl px-4 py-3"
                            >
                                {error}
                            </motion.div>
                        )}
                        {success && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-civic-green bg-opacity-10 border border-civic-green border-opacity-30 text-civic-green text-sm rounded-xl px-4 py-3"
                            >
                                {success}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="label">Target Area Name</label>
                                <input name="areaName" value={form.areaName} onChange={handleChange} className="input-field" placeholder="e.g. Waterfront Sector 7" />
                            </div>

                            <div>
                                <label className="label">City / District</label>
                                <input name="city" value={form.city} onChange={handleChange} className="input-field" placeholder="e.g. New Mumbai" />
                            </div>

                            <div>
                                <label className="label">Mission Date</label>
                                <input
                                    type="date"
                                    name="preferredDate"
                                    value={form.preferredDate}
                                    onChange={handleChange}
                                    className="input-field"
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="label">Volunteer Squad Strength</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        name="volunteersCount"
                                        value={form.volunteersCount}
                                        onChange={handleChange}
                                        className="input-field pl-12"
                                        placeholder="Min 1 citizen"
                                        min={1}
                                    />
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl opacity-30">👥</span>
                                </div>
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="btn-primary py-4 text-sm font-black uppercase tracking-widest mt-4">
                            {loading ? 'Processing Mission...' : 'Authorize Registration'}
                        </button>
                    </form>
                </div>

                <div className="hidden md:flex flex-col justify-center items-center w-48 bg-civic-green bg-opacity-5 rounded-2xl border p-6 text-center" style={{ borderColor: 'var(--card-border)' }}>
                    <motion.div
                        animate={{
                            scale: [1, 1.1, 1],
                            opacity: [0.5, 1, 0.5]
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="text-6xl mb-4"
                    >
                        🌿
                    </motion.div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Eco Protocol 04</p>
                    <div className="h-px w-12 bg-civic-green bg-opacity-30 my-4"></div>
                    <p className="text-xs opacity-60 font-medium italic">"Restoring the civic balance through direct action."</p>
                </div>
            </div>
        </motion.div>
    )
}

export default RegisterClean
