import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useFeedback } from '../context/FeedbackContext'
import { useAuth } from '../context/AuthContext'

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

const FeedbackBell = () => {
  const { user } = useAuth()
  const { inbox, unreadCount, markThreadRead } = useFeedback()
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setIsOpen(false)
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(v => !v)}
        title="Feedback inbox"
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
        <span style={{ lineHeight: 1 }}>💬</span>
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
              width: '380px',
              maxHeight: '480px',
              background: '#020617',
              border: '1px solid rgba(0,255,65,0.4)',
              borderRadius: '20px',
              boxShadow: '0 24px 80px rgba(0,0,0,0.75)',
              zIndex: 1000,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{
              padding: '16px 20px 12px',
              borderBottom: '1px solid rgba(0,255,65,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>💬</span>
                <span style={{
                  fontWeight: 900,
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#e5e7eb',
                }}>
                  Feedback
                </span>
              </div>
              <button
                onClick={() => { setIsOpen(false); navigate('/feedback') }}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(0,255,65,0.3)',
                  borderRadius: '999px',
                  cursor: 'pointer',
                  fontSize: '10px',
                  fontWeight: 800,
                  color: '#e5e7eb',
                  padding: '6px 10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  opacity: 0.9
                }}
              >
                See all
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {inbox.length === 0 ? (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  opacity: 0.7,
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#cbd5f5',
                }}>
                  <div style={{ fontSize: '36px', marginBottom: '8px' }}>📭</div>
                  No feedback yet
                </div>
              ) : (
                inbox.slice(0, 8).map((t) => {
                  const last = t.messages?.[t.messages.length - 1]
                  const isUnread = user ? (t.unreadFor || []).some(id => (id._id || id).toString() === (user.id || user._id)) : false
                  return (
                    <motion.div
                      key={t._id}
                      whileHover={{ backgroundColor: 'rgba(0,255,65,0.12)' }}
                      onClick={() => {
                        if (isUnread) markThreadRead(t._id)
                        setIsOpen(false)
                        navigate('/feedback', { state: { openThreadId: t._id } })
                      }}
                      style={{
                        padding: '14px 20px',
                        borderBottom: '1px solid rgba(0,255,65,0.2)',
                        cursor: 'pointer',
                        background: isUnread ? 'rgba(0,255,65,0.08)' : 'rgba(15,23,42,0.9)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: isUnread ? '#00ff41' : '#9ca3af' }}>
                            From: {t.sender?.name || 'User'} {t.issueId?.title ? `• Issue: ${t.issueId.title}` : ''}
                          </div>
                          <div style={{ marginTop: '6px', color: '#e5e7eb', fontSize: '12px', fontWeight: isUnread ? 700 : 500, opacity: isUnread ? 1 : 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {last?.message || ''}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '10px', color: '#9ca3af', opacity: 0.9 }}>
                            {formatDateTime(last?.createdAt || t.updatedAt)}
                          </div>
                          {isUnread && (
                            <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'flex-end' }}>
                              <span style={{ width: 8, height: 8, borderRadius: 999, background: '#00ff41', boxShadow: '0 0 12px rgba(0,255,65,0.7)' }} />
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })
              )}
            </div>

            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid rgba(0,255,65,0.3)',
              display: 'flex',
              justifyContent: 'center',
              background: 'rgba(0,255,65,0.08)',
              flexShrink: 0,
            }}>
              <button
                onClick={() => { setIsOpen(false); navigate('/feedback') }}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: 'linear-gradient(135deg, #00ff41 0%, #22c55e 100%)',
                  color: '#02140a',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                📋 See All Feedback
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default FeedbackBell

