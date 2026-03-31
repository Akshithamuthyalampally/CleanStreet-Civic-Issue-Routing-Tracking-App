import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotifications } from '../context/NotificationContext'
import { useAuth } from '../context/AuthContext'

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

const Notifications = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, fetchNotifications } = useNotifications()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all') // all | unread
  useEffect(() => {
    console.log('[Notifications] Page mounted. notifications:', notifications?.length, 'user:', user?.role)
  }, [notifications, user])

  const filteredNotifications = filter === 'all' 
    ? (notifications || [])
    : (notifications || []).filter(n => !n.isRead)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #020617 0%, #0b1220 100%)',
      color: '#e5e7eb',
      padding: '100px 24px 60px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto',
      }}>
        {/* Header Section */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          marginBottom: '40px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <motion.button
                whileHover={{ x: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(-1)}
                style={{
                  background: 'rgba(0, 255, 65, 0.1)',
                  border: '1px solid rgba(0, 255, 65, 0.3)',
                  borderRadius: '16px',
                  padding: '12px 20px',
                  cursor: 'pointer',
                  color: '#00ff41',
                  fontSize: '14px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                   textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                ← Back
              </motion.button>
              <h1 style={{ margin: 0, fontSize: '42px', fontWeight: 900, letterSpacing: '-0.03em' }}>
                All <span style={{ color: '#00ff41', textShadow: '0 0 20px rgba(0,255,65,0.3)' }}>Notifications</span>
              </h1>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              {unreadCount > 0 && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={markAllAsRead}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(30, 64, 175, 0.5)',
                    borderRadius: '12px',
                    padding: '10px 18px',
                    color: '#60a5fa',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                >
                  Mark all as read
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={fetchNotifications}
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(0, 255, 65, 0.2)',
                  borderRadius: '12px',
                  padding: '10px 18px',
                  color: '#e5e7eb',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                ↻ Refresh
              </motion.button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setFilter('all')}
              style={{
                padding: '10px 20px',
                borderRadius: '14px',
                border: '1px solid ' + (filter === 'all' ? '#00ff41' : 'rgba(255,255,255,0.1)'),
                background: filter === 'all' ? 'rgba(0, 255, 65, 0.15)' : 'transparent',
                color: filter === 'all' ? '#00ff41' : '#9ca3af',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 700,
                transition: 'all 0.2s'
              }}
            >
              All Notifications ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              style={{
                padding: '10px 20px',
                borderRadius: '14px',
                border: '1px solid ' + (filter === 'unread' ? '#00ff41' : 'rgba(255,255,255,0.1)'),
                background: filter === 'unread' ? 'rgba(0, 255, 65, 0.15)' : 'transparent',
                color: filter === 'unread' ? '#00ff41' : '#9ca3af',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 700,
                transition: 'all 0.2s'
              }}
            >
              Unread ({unreadCount})
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div style={{ display: 'grid', gap: '16px' }}>
          <AnimatePresence mode="popLayout">
            {filteredNotifications.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: '80px 40px',
                  textAlign: 'center',
                  background: 'rgba(15, 23, 42, 0.4)',
                  borderRadius: '32px',
                  border: '1px dashed rgba(255,255,255,0.1)',
                  color: '#9ca3af'
                }}
              >
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔔</div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#e5e7eb' }}>
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </h3>
                <p style={{ marginTop: '10px', fontSize: '15px' }}>
                  We'll let you know when something important happens!
                </p>
              </motion.div>
            ) : (
              filteredNotifications.map((n) => (
                <motion.div
                  key={n._id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  whileHover={{ scale: 1.01, backgroundColor: 'rgba(30, 64, 175, 0.08)' }}
                  onClick={() => !n.isRead && markAsRead(n._id)}
                  style={{
                    padding: '24px 30px',
                    background: n.isRead ? 'rgba(15, 23, 42, 0.4)' : 'linear-gradient(90deg, rgba(30, 64, 175, 0.15) 0%, rgba(15, 23, 42, 0.4) 100%)',
                    borderRadius: '24px',
                    border: '1px solid ' + (n.isRead ? 'rgba(255,255,255,0.05)' : 'rgba(0, 255, 65, 0.2)'),
                    display: 'flex',
                    alignItems: 'center',
                    gap: '24px',
                    cursor: n.isRead ? 'default' : 'pointer',
                    position: 'relative',
                    transition: 'all 0.2s ease',
                    boxShadow: n.isRead ? 'none' : '0 10px 40px rgba(0,0,0,0.2)'
                  }}
                >
                  {/* Icon Bubble */}
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '18px',
                    background: n.isRead ? 'rgba(255,255,255,0.05)' : 'rgba(0, 255, 65, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    flexShrink: 0,
                    border: '1px solid ' + (n.isRead ? 'transparent' : 'rgba(0,255,65,0.2)')
                  }}>
                    {typeIcon[n.type] || '🔔'}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                        color: n.isRead ? '#9ca3af' : '#00ff41'
                      }}>
                        {typeLabel[n.type] || 'Notification'}
                      </span>
                      {!n.isRead && (
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#00ff41',
                          boxShadow: '0 0 10px #00ff41'
                        }} />
                      )}
                    </div>
                    <p style={{
                      margin: 0,
                      fontSize: '16px',
                      fontWeight: n.isRead ? 500 : 700,
                      color: n.isRead ? '#9ca3af' : '#f9fafb',
                      lineHeight: 1.5
                    }}>
                      {n.message}
                    </p>
                    <div style={{ marginTop: '10px', fontSize: '13px', color: '#6b7280', fontWeight: 600 }}>
                      {formatDateTime(n.createdAt)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <motion.button
                      whileHover={{ scale: 1.2, color: '#ef4444' }}
                      whileTap={{ scale: 0.8 }}
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteNotification(n._id)
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#4b5563',
                        cursor: 'pointer',
                        fontSize: '20px',
                        padding: '8px'
                      }}
                      title="Remove"
                    >
                      🗑
                    </motion.button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default Notifications
