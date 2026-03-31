import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

const AccountSettings = () => {
    const { user, updateUser } = useAuth()
    const [activeTab, setActiveTab] = useState('personal')
    const fileInputRef = useRef(null)

    const [profile, setProfile] = useState({
        name: user?.name || '',
        email: user?.email || '',
        location: user?.location || '',
        profilePicture: user?.profilePicture || ''
    })
    const [profileMsg, setProfileMsg] = useState({ text: '', type: '' })
    const [profileLoading, setProfileLoading] = useState(false)

    const [security, setSecurity] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
    const [showCurrent, setShowCurrent] = useState(false)
    const [showNew, setShowNew] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [securityMsg, setSecurityMsg] = useState({ text: '', type: '' })
    const [securityLoading, setSecurityLoading] = useState(false)

    const handleProfileChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value })
    const handleSecurityChange = (e) => setSecurity({ ...security, [e.target.name]: e.target.value })

    const handleImageClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        if (file.size > 2 * 1024 * 1024) {
            setProfileMsg({ text: 'Image exceeds 2MB limit.', type: 'error' })
            return
        }

        const reader = new FileReader()
        reader.onloadend = () => {
            setProfile({ ...profile, profilePicture: reader.result })
        }
        reader.readAsDataURL(file)
    }

    const handleProfileSave = async (e) => {
        e?.preventDefault()
        setProfileMsg({ text: '', type: '' })
        setProfileLoading(true)
        try {
            const { data } = await api.put('/auth/update-profile', profile)
            updateUser(data.user)
            setProfileMsg({ text: 'Profile synchronization complete.', type: 'success' })
        } catch (err) {
            setProfileMsg({ text: err.response?.data?.message || 'Sync failed', type: 'error' })
        } finally {
            setProfileLoading(false)
        }
    }

    const handlePasswordUpdate = async (e) => {
        e.preventDefault()
        setSecurityMsg({ text: '', type: '' })
        if (!security.currentPassword || !security.newPassword || !security.confirmPassword) {
            setSecurityMsg({ text: 'All security fields required', type: 'error' }); return
        }
        if (!passwordRegex.test(security.newPassword)) {
            setSecurityMsg({ text: 'Complexity requirements not met.', type: 'error' }); return
        }
        if (security.newPassword !== security.confirmPassword) {
            setSecurityMsg({ text: 'Mismatched credentials.', type: 'error' }); return
        }
        setSecurityLoading(true)
        try {
            await api.put('/auth/change-password', { currentPassword: security.currentPassword, newPassword: security.newPassword })
            setSecurityMsg({ text: 'Access keys rotated successfully.', type: 'success' })
            setSecurity({ currentPassword: '', newPassword: '', confirmPassword: '' })
        } catch (err) {
            setSecurityMsg({ text: err.response?.data?.message || 'Key rotation failed', type: 'error' })
        } finally {
            setSecurityLoading(false)
        }
    }

    const avatarInitials = user?.name?.charAt(0).toUpperCase() || '?'

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
        >
            <div className="mb-10">
                <h2 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-color)' }}>System <span className="text-civic-green">Configuration</span></h2>
                <p className="opacity-60 font-medium">Manage your citizen profile and security protocols.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Left Panel */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="w-full lg:w-80 shrink-0"
                >
                    <div className="card flex flex-col items-center text-center p-10 relative overflow-hidden transition-all duration-500">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-civic-green to-transparent opacity-50"></div>

                        {/* Avatar Section */}
                        <div className="relative group cursor-pointer mb-6" onClick={handleImageClick}>
                            <div className="w-24 h-24 rounded-full bg-civic-green bg-opacity-10 border-2 border-civic-green flex items-center justify-center overflow-hidden shadow-neon transition-all duration-300 group-hover:border-opacity-100">
                                {profile.profilePicture ? (
                                    <img src={profile.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-civic-green text-4xl font-black">{avatarInitials}</span>
                                )}
                            </div>

                            {/* Camera Icon Overlay */}
                            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-civic-green text-black rounded-full flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.172-1.172A1 1 0 0012.414 3H7.586a1 1 0 00-.707.293L5.707 4.707A1 1 0 015 5H4zm3 7a3 3 0 116 0 3 3 0 01-6 0z" clipRule="evenodd" />
                                </svg>
                            </div>

                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept="image/*"
                            />
                        </div>

                        <p className="text-2xl font-bold mb-2" style={{ color: 'var(--text-color)' }}>{user?.name}</p>
                        <p className="text-sm font-mono opacity-40 mb-6">{user?.email}</p>
                        <div className="w-full py-4 border-t space-y-4" style={{ borderColor: 'var(--card-border)' }}>
                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                <span className="opacity-40">Authorization Level</span>
                                <span className="text-civic-green">{user?.role || 'Citizen'}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                <span className="opacity-40">Location Sector</span>
                                <span style={{ color: 'var(--text-color)' }}>{user?.location || 'Unknown'}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Right Panel */}
                <div className="flex-1">
                    {/* Tabs */}
                    <div className="flex gap-2 p-1 bg-civic-green bg-opacity-5 rounded-2xl mb-8 w-fit border" style={{ borderColor: 'var(--card-border)' }}>
                        {[{ id: 'personal', label: 'Identity Matrix' }, { id: 'security', label: 'Security Keys' }].map(({ id, label }) => (
                            <button
                                key={id}
                                onClick={() => setActiveTab(id)}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === id
                                    ? 'bg-civic-green text-black shadow-neon'
                                    : 'opacity-40 hover:opacity-100 hover:bg-civic-green hover:bg-opacity-10'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        {/* Personal Details Tab */}
                        {activeTab === 'personal' && (
                            <motion.div
                                key="personal"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="card"
                            >
                                <form onSubmit={handleProfileSave} className="space-y-6">
                                    {profileMsg.text && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className={`text-xs font-bold rounded-xl px-5 py-4 border ${profileMsg.type === 'success'
                                                ? 'bg-civic-green bg-opacity-10 border-civic-green border-opacity-30 text-civic-green'
                                                : 'bg-red-500 bg-opacity-10 border-red-500 border-opacity-30 text-red-500'}`}
                                        >
                                            {profileMsg.type === 'success' ? '✔' : '✘'} {profileMsg.text}
                                        </motion.div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="label">Full Legal Name</label>
                                            <input name="name" value={profile.name} onChange={handleProfileChange} className="input-field" />
                                        </div>
                                        <div>
                                            <label className="label">Communication Address (Email)</label>
                                            <input type="email" name="email" value={profile.email} onChange={handleProfileChange} className="input-field" />
                                        </div>
                                        <div>
                                            <label className="label">Geo-Sector (Location)</label>
                                            <input name="location" value={profile.location} onChange={handleProfileChange} className="input-field" placeholder="City or District" />
                                        </div>
                                        <div className="md:col-span-2 opacity-60">
                                            <label className="label">System Role (Immutable)</label>
                                            <input value={user?.role || 'user'} readOnly className="input-field opacity-60 cursor-not-allowed uppercase font-black" />
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t" style={{ borderColor: 'var(--card-border)' }}>
                                        <button type="submit" disabled={profileLoading} className="btn-primary max-w-xs font-black uppercase tracking-widest">
                                            {profileLoading ? 'Syncing...' : 'Update Matrix'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        )}

                        {/* Security Tab */}
                        {activeTab === 'security' && (
                            <motion.div
                                key="security"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="card"
                            >
                                <form onSubmit={handlePasswordUpdate} className="space-y-6">
                                    {securityMsg.text && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className={`text-xs font-bold rounded-xl px-5 py-4 border ${securityMsg.type === 'success'
                                                ? 'bg-civic-green bg-opacity-10 border-civic-green border-opacity-30 text-civic-green'
                                                : 'bg-red-500 bg-opacity-10 border-red-500 border-opacity-30 text-red-500'}`}
                                        >
                                            {securityMsg.type === 'success' ? '✔' : '✘'} {securityMsg.text}
                                        </motion.div>
                                    )}
                                    <div className="space-y-6">
                                        <div>
                                            <label className="label">Existing Access Key</label>
                                            <div className="relative">
                                                <input type={showCurrent ? 'text' : 'password'} name="currentPassword" value={security.currentPassword} onChange={handleSecurityChange} className="input-field pr-12" placeholder="••••••••" />
                                                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 transition-all">{showCurrent ? '🙈' : '👁️'}</button>
                                            </div>
                                        </div>
                                        <div className="h-px opacity-10 bg-civic-green"></div>
                                        <div>
                                            <label className="label">New Access Key</label>
                                            <div className="relative">
                                                <input type={showNew ? 'text' : 'password'} name="newPassword" value={security.newPassword} onChange={handleSecurityChange} className="input-field pr-12" placeholder="••••••••" />
                                                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 transition-all">{showNew ? '🙈' : '👁️'}</button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="label">Verification Code (Confirm)</label>
                                            <div className="relative">
                                                <input type={showConfirm ? 'text' : 'password'} name="confirmPassword" value={security.confirmPassword} onChange={handleSecurityChange} className="input-field pr-12" placeholder="••••••••" />
                                                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 transition-all">{showConfirm ? '🙈' : '👁️'}</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t" style={{ borderColor: 'var(--card-border)' }}>
                                        <button type="submit" disabled={securityLoading} className="btn-primary max-w-xs font-black uppercase tracking-widest">
                                            {securityLoading ? 'Rotating...' : 'Authorize Rotation'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    )
}

export default AccountSettings
