import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useNotifications } from '../context/NotificationContext'

// Icon map for notification types (duplicated for now or could be exported from Bell)
const typeIcon = {
    ISSUE_ACCEPTED: '🤝',
    ISSUE_REJECTED: '❌',
    STATUS_CHANGED: '🔄',
    NEW_ISSUE: '📢',
    ISSUE_ASSIGNED: '📋',
    ADMIN_NEW_ISSUE: '🆕',
    ADMIN_STATUS_UPDATE: '📊',
}

const typeLabel = {
    ISSUE_ACCEPTED: 'Issue Accepted',
    ISSUE_REJECTED: 'Issue Rejected',
    STATUS_CHANGED: 'Status Updated',
    NEW_ISSUE: 'New Issue Posted',
    ISSUE_ASSIGNED: 'Assigned to You',
    ADMIN_NEW_ISSUE: 'New Issue',
    ADMIN_STATUS_UPDATE: 'Status Update',
}

const formatDateTime = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

const Notifications = () => {
    const { notifications, markAsRead, markAllAsRead, unreadCount, fetchNotifications, deleteNotification } = useNotifications()
    const navigate = useNavigate()

    // Refresh notifications when component mounts and mark all as read
    React.useEffect(() => {
        fetchNotifications()
        // Automatically mark all notifications as read when viewing the full page
        if (unreadCount > 0) {
            markAllAsRead()
        }
    }, [fetchNotifications, unreadCount])

    const handleBack = () => {
        navigate(-1)
    }

    // Close button in top-right corner
    const closeButtonStyle = {
        position: 'fixed',
        top: '20px',
        right: '30px',
        zIndex: 1000,
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        border: 'none',
        borderRadius: '50%',
        width: '50px',
        height: '50px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 20px rgba(239, 68, 68, 0.5)',
        transition: 'all 0.3s ease',
        color: '#ffffff'
    }

    return (
        <div className="notifications-page" style={{ 
            minHeight: '100vh',
            width: '100%',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            padding: '40px 30px',
            boxSizing: 'border-box',
            position: 'relative',
            zIndex: 999
        }}>
            {/* Fixed Close Button in top-right */}
            <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleBack}
                style={closeButtonStyle}
                title="Close full-screen view"
            >
                <span style={{ fontSize: '24px', lineHeight: 1 }}>✕</span>
            </motion.button>

            {/* Main Content header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '30px',
                flexWrap: 'wrap',
                gap: '20px',
                padding: '20px',
                background: 'rgba(15,23,42,0.95)',
                borderRadius: '20px',
                border: '1px solid rgba(51,65,85,0.9)',
                boxShadow: '0 18px 50px rgba(0,0,0,0.6)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <motion.button
                        whileHover={{ x: -4, scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleBack}
                        style={{
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '12px 24px',
                            cursor: 'pointer',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            fontSize: '15px',
                            fontWeight: 700,
                            boxShadow: '0 8px 20px rgba(239, 68, 68, 0.4)',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        <span style={{ fontSize: '18px' }}>←</span> Exit / Back
                    </motion.button>
                    <div>
                        <h1 style={{ 
                            margin: 0, 
                            fontSize: '32px', 
                            fontWeight: 900, 
                            color: '#ffffff',
                            textShadow: '0 2px 10px rgba(0,0,0,0.3)'
                        }}>
                            🔔 All Notifications
                        </h1>
                        <p style={{ 
                            margin: '8px 0 0 0', 
                            fontSize: '15px', 
                            opacity: 0.8, 
                            fontWeight: 500, 
                            color: '#e0e0e0'
                        }}>
                            View and manage all your issue activities and updates
                        </p>
                    </div>
                </div>

                {unreadCount > 0 && (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={markAllAsRead}
                        style={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '12px 28px',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 8px 20px rgba(59,130,246,0.4)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        ✓ Mark All as Read
                    </motion.button>
                )}
            </div>

            <div style={{
                // Solid, mörk bakgrund så texten blir tydlig mot omgivande grafik
                background: '#020617',
                border: '1px solid rgba(15, 23, 42, 0.9)',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.7)'
            }}>
                {notifications.length === 0 ? (
                    <div style={{ padding: '100px 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: '80px', marginBottom: '24px' }}>🔕</div>
                        <h3 style={{ fontSize: '26px', fontWeight: 900, color: '#ffffff', marginBottom: '12px', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                            All caught up!
                        </h3>
                        <p style={{ fontSize: '16px', color: '#e0e0e0', opacity: 0.8 }}>
                            No notifications to show at the moment.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {notifications.map((notif, index) => (
                            <motion.div
                                key={notif._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => !notif.isRead && markAsRead(notif._id)}
                                style={{
                                    padding: '28px',
                                    borderBottom: index === notifications.length - 1 ? 'none' : '1px solid rgba(30,64,175,0.6)',
                                    background: notif.isRead 
                                        ? 'rgba(15,23,42,0.95)'
                                        : 'linear-gradient(135deg, rgba(59,130,246,0.35) 0%, rgba(15,23,42,0.95) 60%)',
                                    display: 'flex',
                                    gap: '24px',
                                    alignItems: 'flex-start',
                                    cursor: notif.isRead ? 'default' : 'pointer',
                                    position: 'relative',
                                    transition: 'all 0.3s ease',
                                    borderRadius: index === notifications.length - 1 ? '0 0 24px 24px' : '0'
                                }}
                            >
                                    {!notif.isRead && (
                                        <div style={{
                                            position: 'absolute',
                                            left: 0,
                                            top: 0,
                                            bottom: 0,
                                            width: '5px',
                                            background: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)',
                                            borderRadius: '0 4px 4px 0'
                                        }} />
                                    )}

                                <div style={{
                                    width: '56px',
                                    height: '56px',
                                    borderRadius: '16px',
                                    background: notif.isRead 
                                        ? 'rgba(30,64,175,0.5)' 
                                        : 'linear-gradient(135deg, rgba(59,130,246,0.65) 0%, rgba(30,64,175,0.8) 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '28px',
                                    flexShrink: 0,
                                    boxShadow: notif.isRead ? '0 4px 10px rgba(15,23,42,0.8)' : '0 4px 16px rgba(37,99,235,0.6)'
                                }}>
                                    {typeIcon[notif.type] || '🔔'}
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '12px' }}>
                                        <div>
                                            <span style={{
                                                fontSize: '10px',
                                                fontWeight: 900,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.15em',
                                                color: notif.isRead ? '#e5e7eb' : '#bfdbfe',
                                                opacity: notif.isRead ? 0.9 : 1,
                                                display: 'block',
                                                marginBottom: '6px'
                                            }}>
                                                {typeLabel[notif.type] || 'Notification'}
                                            </span>
                                            <h4 style={{
                                                margin: 0,
                                                fontSize: '17px',
                                                fontWeight: notif.isRead ? 700 : 800,
                                                color: '#f9fafb',
                                                lineHeight: 1.5,
                                                maxWidth: '800px'
                                            }}>
                                                {notif.message}
                                            </h4>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                            <span style={{
                                                fontSize: '13px',
                                                fontWeight: 700,
                                                opacity: 0.9,
                                                color: '#e5e7eb',
                                                whiteSpace: 'nowrap',
                                                background: 'rgba(15,23,42,0.9)',
                                                padding: '6px 12px',
                                                borderRadius: '8px',
                                                boxShadow: '0 2px 8px rgba(15,23,42,0.8)'
                                            }}>
                                                {formatDateTime(notif.createdAt)}
                                            </span>
                                            <button
                                                title="Delete notification"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    deleteNotification(notif._id)
                                                }}
                                                style={{
                                                    background: 'transparent',
                                                    border: '1px solid rgba(148,163,184,0.7)',
                                                    borderRadius: '999px',
                                                    color: '#e5e7eb',
                                                    fontSize: '11px',
                                                    padding: '4px 10px',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}
                                            >
                                                🗑 <span style={{ letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>Delete</span>
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {!notif.isRead && (
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            fontSize: '12px',
                                            fontWeight: 800,
                                            color: '#ffffff',
                                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                            padding: '6px 14px',
                                            borderRadius: '20px',
                                            marginTop: '12px',
                                            boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
                                        }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffffff', boxShadow: '0 0 8px rgba(255,255,255,0.8)' }} />
                                            NEW NOTIFICATION
                                        </span>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default Notifications
