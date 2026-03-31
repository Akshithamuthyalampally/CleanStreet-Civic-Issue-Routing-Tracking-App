import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useFeedback } from '../context/FeedbackContext'
import api from '../api/axios'

const MessagesWidget = () => {
  const { user } = useAuth()
  const { createFeedback, replyToThread, inbox, sent, markThreadRead, editFeedbackMessage, deleteFeedbackMessage, fetchInbox, fetchSent, unreadCount } = useFeedback()
  
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('inbox') // inbox | sent
  const [view, setView] = useState('list') // list | new | conversation
  const [recipientType, setRecipientType] = useState('')
  const [recipientResults, setRecipientResults] = useState([])
  const [selectedRecipient, setSelectedRecipient] = useState(null)
  const [selectedThread, setSelectedThread] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [editingMsgId, setEditingMsgId] = useState(null)
  const [editText, setEditText] = useState('')
  const [contextMenu, setContextMenu] = useState({ x: 0, y: 0, msg: null, visible: false })

  const chatEndRef = useRef(null)

  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(prev => ({ ...prev, visible: false }))
    window.addEventListener('click', handleGlobalClick)
    return () => window.removeEventListener('click', handleGlobalClick)
  }, [])

  useEffect(() => {
    if (view === 'conversation') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [view, selectedThread?.messages])

  const targetRoles = useMemo(() => {
    if (!user) return []
    if (user.role === 'citizen') return ['admin', 'volunteer']
    if (user.role === 'volunteer') return ['citizen', 'admin']
    if (user.role === 'admin') return ['citizen', 'volunteer']
    return []
  }, [user?.role])

  const threads = tab === 'inbox' ? inbox : sent

  const filteredRecipients = useMemo(() => {
    if (!searchTerm.trim()) return recipientResults
    return recipientResults.filter(r => 
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (r.volunteerId && r.volunteerId.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }, [recipientResults, searchTerm])

  if (!user) return null

  const handleRoleSelect = async (role) => {
    setRecipientType(role)
    setLoading(true)
    setSearchTerm('')
    try {
      const { data } = await api.get('/feedback/recipients', { params: { role, query: '' } })
      setRecipientResults(data)
    } catch (err) {
      console.error('Error fetching recipients:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleNewMessage = async () => {
    if (!selectedRecipient || !message.trim()) return
    setLoading(true)
    try {
      const data = await createFeedback({
        recipientType,
        recipientId: selectedRecipient._id,
        message: message.trim()
      })
      setSelectedThread(data)
      setView('conversation')
      setMessage('')
    } catch (err) {
      setError('Failed to send message.')
    } finally {
      setLoading(false)
    }
  }

  const handleReply = async () => {
    if (!message.trim() || !selectedThread) return
    setLoading(true)
    try {
      const data = await replyToThread(selectedThread._id, message.trim())
      setSelectedThread(data)
      setMessage('')
    } catch (err) {
      setError('Failed to send reply.')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async (msgId) => {
    if (!editText.trim() || !selectedThread) return
    setLoading(true)
    try {
      const data = await editFeedbackMessage(selectedThread._id, msgId, editText.trim())
      setSelectedThread(data)
      setEditingMsgId(null)
      setEditText('')
    } catch (err) {
      setError('Failed to edit message.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (msgId, mode = 'everyone') => {
    if (!selectedThread) return
    const confirmMsg = mode === 'everyone' ? "Delete this message for everyone?" : "Delete this message for yourself?"
    if (!window.confirm(confirmMsg)) return
    
    setLoading(true)
    try {
      const data = await deleteFeedbackMessage(selectedThread._id, msgId, mode)
      setSelectedThread(data)
      // Refresh list view state
      fetchInbox()
      fetchSent()
    } catch (err) {
      setError('Failed to delete message.')
    } finally {
      setLoading(false)
    }
  }

  const handleContextMenu = (e, msg) => {
    e.preventDefault()
    if (msg.isDeleted) return
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      msg,
      visible: true
    })
  }

  const openThread = (thread) => {
    setSelectedThread(thread)
    const isUnread = (thread.unreadFor || []).some(id => (id._id || id).toString() === (user.id || user._id))
    if (isUnread) markThreadRead(thread._id)
    setView('conversation')
  }

  const formatTime = (date) => {
    if (!date) return ''
    const d = new Date(date)
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        title="Internal Messaging"
        style={{
          position: 'fixed',
          right: 24,
          bottom: 24,
          zIndex: 1200,
          width: 64,
          height: 64,
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #020617 0%, #0f172a 100%)',
          color: '#00ff41',
          border: '1px solid rgba(0,255,65,0.4)',
          boxShadow: '0 15px 45px rgba(0,0,0,0.8), 0 0 20px rgba(0,255,65,0.2)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
        }}
      >
        <span style={{ filter: 'drop-shadow(0 0 5px rgba(0,255,65,0.5))' }}>✉️</span>
        {unreadCount > 0 && (
          <div style={{
            position: 'absolute',
            top: -5,
            right: -5,
            background: '#ff4b2b',
            color: 'white',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            fontSize: '12px',
            fontWeight: 900,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(255, 75, 43, 0.6)',
            border: '2px solid #020617'
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 2000,
              background: 'rgba(2,6,23,0.96)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              style={{
                width: '100%',
                maxWidth: '1200px',
                height: '90vh',
                background: '#020617',
                border: '1px solid rgba(0,255,65,0.3)',
                borderRadius: '32px',
                boxShadow: '0 40px 120px rgba(0,0,0,0.9)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Header */}
              <div style={{ 
                padding: '24px 40px', 
                borderBottom: '1px solid rgba(0,255,65,0.15)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                background: 'rgba(15,23,42,0.8)' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  {view !== 'list' && (
                    <motion.button 
                      whileHover={{ x: -4 }}
                      onClick={() => setView('list')} 
                      style={{ background: 'none', border: 'none', color: '#00ff41', cursor: 'pointer', fontSize: '24px' }}
                    >
                      ←
                    </motion.button>
                  )}
                  <div>
                    <div style={{ fontWeight: 900, color: '#e5e7eb', fontSize: '18px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {view === 'list' ? 'Internal Communications' : view === 'new' ? 'Initialize New Thread' : ((selectedThread?.sender?._id || selectedThread?.sender || "").toString() === (user?.id || user?._id || "").toString() ? selectedThread?.recipients[0]?.name : selectedThread?.sender?.name)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                      {view === 'list' ? 'Secure messaging between Citizen, Volunteer, and Admin' : 'Select a recipient to start a conversation'}
                    </div>
                  </div>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  onClick={() => setOpen(false)} 
                  style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#9ca3af', cursor: 'pointer', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  ✕
                </motion.button>
              </div>

              {/* Main Area */}
              <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* List View */}
                {view === 'list' && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '30px 40px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                        <h3 style={{ margin: 0, color: '#e5e7eb', fontSize: '24px', fontWeight: 900 }}>Conversations</h3>
                        <div style={{ display: 'flex', background: 'rgba(15,23,42,0.8)', padding: '6px', borderRadius: '14px', border: '1px solid rgba(0,255,65,0.15)' }}>
                          {['inbox', 'sent'].map(t => (
                            <button
                              key={t}
                              onClick={() => setTab(t)}
                              style={{
                                padding: '8px 20px',
                                borderRadius: '10px',
                                background: tab === t ? 'rgba(0,255,65,0.15)' : 'transparent',
                                color: tab === t ? '#00ff41' : '#64748b',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 800,
                                textTransform: 'capitalize',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setView('new')}
                        style={{
                          padding: '12px 24px',
                          borderRadius: '14px',
                          background: 'linear-gradient(135deg, #00ff41 0%, #22c55e 100%)',
                          color: '#02140a',
                          fontWeight: 900,
                          cursor: 'pointer',
                          fontSize: '14px',
                          border: 'none',
                          boxShadow: '0 0 20px rgba(0,255,65,0.3)'
                        }}
                      >
                        + Create New Message
                      </motion.button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '10px' }}>
                      {(() => {
                        const displayThreads = threads
                          .filter(thread => {
                            const currentUserId = (user?.id || user?._id || "").toString();
                            return (thread.messages || []).some(m => 
                              !m.isDeleted && 
                              !m.deletedFor?.some(id => (id._id || id || "").toString() === currentUserId)
                            );
                          })
                          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                        
                        if (displayThreads.length === 0) {
                          return (
                            <div style={{ textAlign: 'center', padding: '100px 0', color: '#64748b' }}>
                              <div style={{ fontSize: '60px', marginBottom: '20px' }}>📭</div>
                              <div style={{ fontSize: '18px', fontWeight: 700 }}>No {tab} found</div>
                              <p>Start a new thread to communicate with others.</p>
                            </div>
                          );
                        }

                        return displayThreads.map(thread => {
                          const currentUserId = (user?.id || user?._id || "").toString();
                          const isMe = (thread.sender?._id || thread.sender || "").toString() === currentUserId;
                          const otherUser = isMe ? thread.recipients[0] : thread.sender;
                          const activeMessages = (thread.messages || []).filter(m => 
                            !m.isDeleted && 
                            !m.deletedFor?.some(id => (id._id || id || "").toString() === currentUserId)
                          );
                          const lastMsg = activeMessages[activeMessages.length - 1];
                          const unread = (thread.unreadFor || []).some(id => (id._id || id || "").toString() === currentUserId);

                          return (
                            <motion.div
                              key={thread._id}
                              whileHover={{ x: 6, backgroundColor: 'rgba(0,255,65,0.06)' }}
                              onClick={() => openThread(thread)}
                              style={{
                                padding: '18px 24px',
                                borderRadius: '20px',
                                background: unread ? 'rgba(0,255,65,0.08)' : 'rgba(15,23,42,0.4)',
                                border: `1px solid ${unread ? 'rgba(0,255,65,0.3)' : 'rgba(51,65,85,0.3)'}`,
                                cursor: 'pointer',
                                display: 'flex',
                                gap: '20px',
                                alignItems: 'center',
                                transition: 'all 0.3s ease'
                              }}
                            >
                              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                                {otherUser?.role === 'admin' ? '🛡️' : otherUser?.role === 'volunteer' ? '👷' : '👤'}
                              </div>
                              <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ color: '#e5e7eb', fontSize: '16px', fontWeight: 900 }}>{otherUser?.name || 'User'}</span>
                                  <span style={{ color: '#64748b', fontSize: '12px' }}>{formatTime(thread.updatedAt)}</span>
                                </div>
                                <div style={{ color: '#9ca3af', fontSize: '14px', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {isMe ? <span style={{ color: '#00ff41', fontWeight: 800, fontSize: '12px', marginRight: '6px' }}>YOU:</span> : ''}
                                  {lastMsg?.message || 'New conversation'}
                                </div>
                              </div>
                              {unread && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#00ff41', boxShadow: '0 0 15px #00ff41' }}></div>}
                            </motion.div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}

                {/* New Thread View */}
                {view === 'new' && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
                    {!recipientType ? (
                      <div style={{ display: 'grid', gap: '30px' }}>
                        <h3 style={{ color: '#e5e7eb', fontSize: '24px', fontWeight: 900, textAlign: 'center' }}>Select Recipient Category</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                          {targetRoles.map(role => (
                            <motion.button
                              key={role}
                              whileHover={{ scale: 1.05, backgroundColor: 'rgba(0,255,65,0.1)' }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleRoleSelect(role)}
                              style={{
                                padding: '40px 20px',
                                borderRadius: '24px',
                                background: 'rgba(15,23,42,0.6)',
                                border: '1px solid rgba(51,65,85,0.3)',
                                color: '#e5e7eb',
                                fontSize: '18px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                textTransform: 'capitalize',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '15px'
                              }}
                            >
                              <span style={{ fontSize: '40px' }}>
                                {role === 'admin' ? '🛡️' : role === 'volunteer' ? '👷' : '👤'}
                              </span>
                              {role}s
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    ) : !selectedRecipient ? (
                      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div style={{ marginBottom: '20px' }}>
                          <h3 style={{ color: '#e5e7eb', fontSize: '22px', fontWeight: 900, marginBottom: '20px' }}>Choose {recipientType} Recipient</h3>
                          {/* SEARCH INPUT - IMPROVED SELECTION */}
                          <div style={{ position: 'relative', marginBottom: '20px' }}>
                            <input 
                              type="text"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              placeholder={`Search by name or ID...`}
                              style={{
                                width: '100%',
                                padding: '16px 20px 16px 50px',
                                borderRadius: '16px',
                                background: 'rgba(15,23,42,0.8)',
                                border: '1px solid rgba(0,255,65,0.4)',
                                color: '#fff',
                                outline: 'none',
                                fontSize: '16px'
                              }}
                            />
                            <span style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', fontSize: '20px', opacity: 0.6 }}>🔍</span>
                          </div>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px', paddingRight: '10px' }}>
                          {loading ? (
                            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: '#00ff41' }}>
                              <div className="animate-pulse" style={{ fontSize: '18px', fontWeight: 800 }}>Initializing secure connection...</div>
                            </div>
                          ) : filteredRecipients.length === 0 ? (
                            <div style={{ 
                              gridColumn: '1/-1', 
                              textAlign: 'center', 
                              padding: '60px 40px', 
                              color: '#9ca3af',
                              background: 'rgba(15,23,42,0.4)',
                              borderRadius: '24px',
                              border: '1px dashed rgba(255,255,255,0.1)'
                            }}>
                              <div style={{ fontSize: '40px', marginBottom: '15px' }}>🔍</div>
                              <div style={{ fontSize: '18px', fontWeight: 800, color: '#e5e7eb', marginBottom: '8px' }}>No Recipients Found</div>
                              <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', opacity: 0.8 }}>
                                {user.role === 'citizen' && recipientType === 'volunteer' 
                                  ? "You can only message volunteers who have accepted your issues. Currently, no assigned volunteers match your search." 
                                  : user.role === 'volunteer' && recipientType === 'citizen'
                                  ? "You can only message citizens whose issues you have accepted. Currently, no linked citizens match your search."
                                  : "No users match your current search criteria in this category."}
                              </p>
                              {searchTerm && (
                                <button 
                                  onClick={() => setSearchTerm('')}
                                  style={{ marginTop: '15px', padding: '8px 16px', background: 'rgba(0,255,65,0.1)', border: '1px solid rgba(0,255,65,0.3)', color: '#00ff41', borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                                >
                                  Clear Search
                                </button>
                              )}
                            </div>
                          ) : (
                            filteredRecipients.map(r => (
                              <motion.button
                                key={r._id}
                                whileHover={{ scale: 1.03, backgroundColor: 'rgba(0,255,65,0.1)' }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => setSelectedRecipient(r)}
                                style={{
                                  padding: '20px',
                                  borderRadius: '16px',
                                  background: 'rgba(15,23,42,0.6)',
                                  border: '1px solid rgba(51,65,85,0.3)',
                                  color: '#e5e7eb',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '15px'
                                }}
                              >
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  👤
                                </div>
                                <div>
                                  <div style={{ fontWeight: 800 }}>{r.name}</div>
                                  {r.volunteerId && <div style={{ fontSize: '11px', color: '#00ff41', opacity: 0.8 }}>ID: {r.volunteerId}</div>}
                                </div>
                              </motion.button>
                            ))
                          )}
                        </div>
                        <button 
                          onClick={() => setRecipientType('')} 
                          style={{ marginTop: '20px', color: '#00ff41', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800 }}
                        >
                          ← Change Recipient Category
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: '30px' }}>
                        <div style={{ 
                          padding: '24px', 
                          borderRadius: '24px', 
                          background: 'rgba(0,255,65,0.05)', 
                          color: '#00ff41', 
                          border: '1px solid rgba(0,255,65,0.2)', 
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <span style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: 900, opacity: 0.7, display: 'block' }}>Recipient</span>
                            <span style={{ fontSize: '20px', fontWeight: 900 }}>{selectedRecipient.name}</span>
                          </div>
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            onClick={() => setSelectedRecipient(null)} 
                            style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#e5e7eb', cursor: 'pointer', borderRadius: '10px' }}
                          >
                            Edit
                          </motion.button>
                        </div>
                        <div style={{ display: 'grid', gap: '15px' }}>
                          <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type your introductory message..."
                            rows={8}
                            style={{
                              background: 'rgba(15,23,42,0.95)',
                              color: '#e5e7eb',
                              border: '1px solid rgba(0,255,65,0.3)',
                              borderRadius: '24px',
                              padding: '24px',
                              outline: 'none',
                              resize: 'none',
                              fontSize: '18px',
                              lineHeight: '1.6'
                            }}
                          />
                          <motion.button
                            whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(0,255,65,0.4)' }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleNewMessage}
                            disabled={loading || !message.trim()}
                            style={{
                              padding: '20px',
                              borderRadius: '20px',
                              background: 'linear-gradient(135deg, #00ff41 0%, #22c55e 100%)',
                              color: '#02140a',
                              border: 'none',
                              fontWeight: 900,
                              fontSize: '16px',
                              cursor: 'pointer',
                              opacity: loading ? 0.7 : 1
                            }}
                          >
                            {loading ? 'Transmitting...' : 'Establish Secure Connection'}
                          </motion.button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Conversation View */}
                {view === 'conversation' && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', background: 'rgba(2,6,23,0.5)' }}>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px', padding: '40px' }}>
                      {(selectedThread.messages || [])
                        .filter(m => {
                          const currentUserId = (user?.id || user?._id || "").toString();
                          return !m.isDeleted && !m.deletedFor?.some(id => (id._id || id || "").toString() === currentUserId);
                        })
                        .map((m, idx) => {
                          const currentUserId = (user?.id || user?._id || "").toString();
                          const isMe = (m.sender?._id || m.sender || "").toString() === currentUserId;
                          return (
                            <motion.div 
                              key={m._id || idx} 
                              initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%' }}
                            >
                              <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '100%' }}>
                                  <div style={{ 
                                    padding: '12px 20px', 
                                    borderRadius: '20px', 
                                    borderTopLeftRadius: !isMe ? '4px' : '20px',
                                    borderTopRightRadius: isMe ? '4px' : '20px',
                                    background: isMe ? 'linear-gradient(135deg, #00ff41 0%, #22c55e 100%)' : 'rgba(30,41,59,0.95)',
                                    color: isMe ? '#02140a' : '#e5e7eb',
                                    fontWeight: 600,
                                    fontSize: '15px',
                                    minWidth: '60px',
                                    boxShadow: isMe ? '0 4px 15px rgba(0,255,65,0.2)' : '0 4px 15px rgba(0,0,0,0.2)',
                                    position: 'relative'
                                  }}>
                                    {editingMsgId === m._id ? (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <textarea
                                          value={editText}
                                          onChange={(e) => setEditText(e.target.value)}
                                          style={{
                                            width: '100%',
                                            background: 'rgba(0,0,0,0.1)',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            borderRadius: '8px',
                                            color: 'inherit',
                                            padding: '8px',
                                            fontSize: '14px',
                                            outline: 'none',
                                            resize: 'none',
                                            minHeight: '60px'
                                          }}
                                          autoFocus
                                        />
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                          <button 
                                            onClick={() => setEditingMsgId(null)}
                                            style={{ border: 'none', background: 'none', color: 'inherit', cursor: 'pointer', fontSize: '12px', opacity: 0.7 }}
                                          >
                                            Cancel
                                          </button>
                                          <button 
                                            onClick={() => handleEdit(m._id)}
                                            style={{ border: 'none', background: 'white', padding: '4px 12px', borderRadius: '6px', color: '#02140a', cursor: 'pointer', fontSize: '12px', fontWeight: 900 }}
                                          >
                                            Save
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div 
                                        onContextMenu={(e) => handleContextMenu(e, m)}
                                        style={{ cursor: 'context-menu', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.5' }}
                                      >
                                        {m.message}
                                      </div>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '10px', color: '#64748b', alignSelf: isMe ? 'flex-end' : 'flex-start', display: 'flex', gap: '6px' }}>
                                    {formatTime(m.createdAt)}
                                    {m.isEdited && <span>(edited)</span>}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )
                        })}
                      <div ref={chatEndRef} />
                    </div>
                    
                    <div style={{ padding: '24px 30px', borderTop: '1px solid rgba(51,65,85,0.3)', background: 'rgba(15,23,42,0.4)', borderRadius: '0 0 40px 40px' }}>
                      <div style={{ display: 'flex', gap: '16px', background: 'rgba(15,23,42,0.6)', padding: '8px', borderRadius: '20px', border: '1px solid rgba(51,65,85,0.5)' }}>
                        <textarea
                          placeholder="Type your message..."
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            color: '#e5e7eb',
                            padding: '12px 18px',
                            fontSize: '15px',
                            outline: 'none',
                            resize: 'none',
                            height: '46px'
                          }}
                        />
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleReply}
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '16px',
                            background: 'linear-gradient(135deg, #00ff41 0%, #22c55e 100%)',
                            color: '#02140a',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px'
                          }}
                        >
                          ➤
                        </motion.button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {contextMenu.visible && (
        <div style={{
          position: 'fixed',
          top: contextMenu.y,
          left: contextMenu.x,
          background: '#1e293b',
          border: '1px solid rgba(51,65,85,0.8)',
          borderRadius: '12px',
          padding: '8px',
          zIndex: 10000,
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          minWidth: '150px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          {(contextMenu.msg.sender?._id || contextMenu.msg.sender) === (user.id || user._id) && (
            <button
              onClick={() => { setEditingMsgId(contextMenu.msg._id); setEditText(contextMenu.msg.message); setContextMenu(prev => ({ ...prev, visible: false })) }}
              style={{
                background: 'none',
                border: 'none',
                color: '#e5e7eb',
                padding: '10px 16px',
                textAlign: 'left',
                cursor: 'pointer',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={(e) => e.target.style.background = 'none'}
            >
              ✏️ Edit
            </button>
          )}
          <button
            onClick={() => { handleDelete(contextMenu.msg._id, (contextMenu.msg.sender?._id || contextMenu.msg.sender) === (user.id || user._id) ? 'everyone' : 'me'); setContextMenu(prev => ({ ...prev, visible: false })) }}
            style={{
              background: 'none',
              border: 'none',
              color: '#ef4444',
              padding: '10px 16px',
              textAlign: 'left',
              cursor: 'pointer',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(239,68,68,0.1)'}
            onMouseLeave={(e) => e.target.style.background = 'none'}
          >
            🗑️ {(contextMenu.msg.sender?._id || contextMenu.msg.sender) === (user.id || user._id) ? 'Delete for Everyone' : 'Delete for Me'}
          </button>
        </div>
      )}
    </>
  )
}

export default MessagesWidget
