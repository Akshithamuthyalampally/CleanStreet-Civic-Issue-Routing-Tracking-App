import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../context/NotificationContext'

// Icon map for notification types
const typeIcon = {
    ISSUE_ACCEPTED: '🤝',
    ISSUE_REJECTED: '❌',
    STATUS_CHANGED: '🔄',
    NEW_ISSUE: '📢',
    ISSUE_ASSIGNED: '📋',
    ADMIN_NEW_ISSUE: '🆕',
    ADMIN_STATUS_UPDATE: '📊',
    FEEDBACK_RECEIVED: '💬',
}

const typeLabel = {
    ISSUE_ACCEPTED: 'Issue Accepted',
    ISSUE_REJECTED: 'Issue Rejected',
    STATUS_CHANGED: 'Status Updated',
    NEW_ISSUE: 'New Issue Posted',
    ISSUE_ASSIGNED: 'Assigned to You',
    ADMIN_NEW_ISSUE: 'New Issue',
    ADMIN_STATUS_UPDATE: 'Status Update',
    FEEDBACK_RECEIVED: 'New Feedback',
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

const NotificationBell = () => {
    const { notifications, unreadCount, isOpen, setIsOpen, markAsRead, markAllAsRead, deleteNotification } = useNotifications()
    const navigate = useNavigate()
    const panelRef = useRef(null)

    // Close panel when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setIsOpen(false)
            }
        }
        if (isOpen) document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen, setIsOpen])

    const handleOpen = () => setIsOpen(prev => !prev)

    const handleNotificationClick = (notif) => {
        if (!notif.isRead) markAsRead(notif._id)
    }

    return (
        <div className="notification-bell-wrapper" ref={panelRef} style={{ position: 'relative' }}>
            {/* Bell Button */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleOpen}
                title="Notifications"
                style={{
                    position: 'relative',
                    padding: '8px',
                    borderRadius: '12px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-color)',
                }}
            >
                <span style={{ lineHeight: 1 }}>🔔</span>
                {unreadCount > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        style={{
                            position: 'absolute',
                            top: '2px',
                            right: '2px',
                            minWidth: '18px',
                            height: '18px',
                            borderRadius: '999px',
                            background: '#ef4444',
                            color: '#fff',
                            fontSize: '10px',
                            fontWeight: 900,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 4px',
                            lineHeight: 1,
                            boxShadow: '0 0 8px rgba(239,68,68,0.6)',
                        }}
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </motion.span>
                )}
            </motion.button>

            {/* Dropdown Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                        transition={{ duration: 0.18 }}
                        style={{
                            position: 'absolute',
                            top: 'calc(100% + 10px)',
                            right: 0,
                            width: '370px',
                            maxHeight: '480px',
                            // Solid, mörk popup så den inte "läcker igenom" bakgrunden
                            background: '#020617',
                            border: '1px solid rgba(30,64,175,0.8)',
                            borderRadius: '20px',
                            boxShadow: '0 24px 80px rgba(0,0,0,0.75)',
                            zIndex: 1000,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '16px 20px 12px',
                            borderBottom: '1px solid rgba(51,65,85,0.9)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexShrink: 0,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '16px' }}>🔔</span>
                                <span style={{
                                    fontWeight: 900,
                                    fontSize: '13px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                    color: '#e5e7eb',
                                }}>
                                    Notifications
                                </span>
                                {unreadCount > 0 && (
                                    <span style={{
                                        background: '#ef4444',
                                        color: '#fff',
                                        borderRadius: '999px',
                                        fontSize: '10px',
                                        fontWeight: 900,
                                        padding: '2px 7px',
                                    }}>
                                        {unreadCount} new
                                    </span>
                                )}
                            </div>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        color: '#60a5fa',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.08em',
                                    }}
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>

                        {/* Notification List */}
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            {notifications.length === 0 ? (
                                <div style={{
                                    padding: '40px 20px',
                                    textAlign: 'center',
                                    opacity: 0.7,
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    color: '#cbd5f5',
                                }}>
                                    <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔕</div>
                                    No notifications yet
                                </div>
                            ) : (
                                notifications.map((notif) => (
                                    <motion.div
                                        key={notif._id}
                                        onClick={() => handleNotificationClick(notif)}
                                        whileHover={{ backgroundColor: 'rgba(30,64,175,0.45)' }}
                                        style={{
                                            padding: '14px 20px',
                                            borderBottom: '1px solid rgba(30,64,175,0.7)',
                                            cursor: notif.isRead ? 'default' : 'pointer',
                                            display: 'flex',
                                            gap: '12px',
                                            alignItems: 'flex-start',
                                            background: notif.isRead
                                                ? 'rgba(15,23,42,0.9)'
                                                : 'linear-gradient(135deg, rgba(59,130,246,0.35) 0%, rgba(15,23,42,0.9) 60%)',
                                            transition: 'background 0.15s',
                                        }}
                                    >
                                        {/* Icon bubble */}
                                        <div style={{
                                            width: '38px',
                                            height: '38px',
                                            borderRadius: '12px',
                                            background: notif.isRead ? 'rgba(30,64,175,0.4)' : 'rgba(59,130,246,0.5)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '18px',
                                            flexShrink: 0,
                                        }}>
                                            {typeIcon[notif.type] || '🔔'}
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            {/* Övre rad: typ, oläst-dot och radera-knapp */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '3px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{
                                                        fontSize: '9px',
                                                        fontWeight: 900,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.1em',
                                                        color: notif.isRead ? '#9ca3af' : '#bfdbfe',
                                                        opacity: notif.isRead ? 0.8 : 1,
                                                    }}>
                                                        {typeLabel[notif.type] || 'Notification'}
                                                    </span>
                                                    {!notif.isRead && (
                                                        <span style={{
                                                            width: '6px',
                                                            height: '6px',
                                                            borderRadius: '50%',
                                                            background: '#3b82f6',
                                                            display: 'inline-block',
                                                            boxShadow: '0 0 6px rgba(59,130,246,0.6)',
                                                        }} />
                                                    )}
                                                </div>
                                                <button
                                                    title="Delete notification"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        deleteNotification(notif._id)
                                                    }}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: '#6b7280',
                                                        cursor: 'pointer',
                                                        padding: 0,
                                                        fontSize: '14px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    🗑
                                                </button>
                                            </div>
                                            {/* Message */}
                                            <p style={{
                                                fontSize: '12px',
                                                lineHeight: '1.5',
                                                color: '#e5e7eb',
                                                opacity: notif.isRead ? 0.75 : 1,
                                                margin: 0,
                                                wordBreak: 'break-word',
                                                fontWeight: notif.isRead ? 400 : 600,
                                            }}>
                                                {notif.message}
                                            </p>
                                            {/* Timestamp */}
                                            <p style={{
                                                fontSize: '10px',
                                                opacity: 0.65,
                                                marginTop: '5px',
                                                fontWeight: 600,
                                                color: '#9ca3af',
                                            }}>
                                                {formatDateTime(notif.createdAt)}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                        {/* Footer with See All button */}
                        <div style={{
                            padding: '12px 20px',
                            borderTop: '1px solid var(--card-border, #e4e4e7)',
                            display: 'flex',
                            justifyContent: 'center',
                            background: 'rgba(59,130,246,0.03)',
                            flexShrink: 0,
                        }}>
                            <button
                                onClick={() => {
                                    navigate('/notifications')
                                    setIsOpen(false)
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = '#22c55e'
                                    e.target.style.transform = 'translateY(-1px)'
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = '#00ff41'
                                    e.target.style.transform = 'translateY(0)'
                                }}
                                style={{
                                    width: '100%',
                                    padding: '10px 16px',
                                    background: '#00ff41',
                                    color: '#02140a',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    boxShadow: '0 0 15px rgba(0, 255, 65, 0.3)',
                                }}
                            >
                                📋 See All Notifications
                                {unreadCount > 0 && (
                                    <span style={{
                                        background: '#fff',
                                        color: '#3b82f6',
                                        borderRadius: '999px',
                                        fontSize: '10px',
                                        fontWeight: 900,
                                        padding: '2px 6px',
                                        marginLeft: '4px',
                                    }}>
                                        {unreadCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default NotificationBell
