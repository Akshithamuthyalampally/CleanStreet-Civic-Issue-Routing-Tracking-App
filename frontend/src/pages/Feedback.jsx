import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { useFeedback } from '../context/FeedbackContext'

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

const Feedback = () => {
  const { user } = useAuth()
  const { inbox, sent, fetchInbox, fetchSent, markThreadRead, replyToThread, editFeedbackMessage, deleteFeedbackMessage } = useFeedback()
  const navigate = useNavigate()
  const location = useLocation()

  const [tab, setTab] = useState('inbox') // inbox | sent
  const [selectedId, setSelectedId] = useState(null)
  const [reply, setReply] = useState('')
  const [loadingSent, setLoadingSent] = useState(false)
  const [replying, setReplying] = useState(false)
  const [editingMsgId, setEditingMsgId] = useState(null)
  const [editText, setEditText] = useState('')

  useEffect(() => {
    const openThreadId = location?.state?.openThreadId
    if (openThreadId) {
      setSelectedId(openThreadId)
      setTab('inbox')
    }
  }, [location?.state])

  useEffect(() => {
    fetchInbox()
  }, [fetchInbox])

  useEffect(() => {
    if (tab !== 'sent') return
    const run = async () => {
      setLoadingSent(true)
      try {
        await fetchSent()
      } catch (e) {
        console.error('Error fetching sent feedback:', e)
      } finally {
        setLoadingSent(false)
      }
    }
    run()
  }, [tab])

  const list = tab === 'inbox' ? inbox : sent
  const selected = useMemo(() => list.find(t => t._id === selectedId) || null, [list, selectedId])

  const canReceive = true // Everyone can receive and reply to feedback/replies

  const onSelect = (t) => {
    setSelectedId(t._id)
    // Mark as read is now handled by a side effect to ensure it works whenever 'selected' changes
  }

  // Auto mark as read when a thread is selected and active
  useEffect(() => {
    if (selected && tab === 'inbox' && user) {
      const currentUserId = (user.id || user._id || "").toString();
      const isUnread = (selected.unreadFor || []).some(id => (id._id || id || "").toString() === currentUserId);
      if (isUnread) {
        markThreadRead(selected._id);
      }
    }
  }, [selected, tab, user, markThreadRead])

  const onReply = async () => {
    if (!selected) return
    if (!reply.trim()) return
    
    setReplying(true)
    try {
      await replyToThread(selected._id, reply.trim())
      setReply('')
    } catch (err) {
      console.error('[Feedback] Error sending reply:', err)
      alert('Failed to send reply.')
    } finally {
      setReplying(false)
    }
  }

  const onEdit = async (msgId, text) => {
    try {
      await editFeedbackMessage(selected._id, msgId, text)
      setEditingMsgId(null)
      setEditText('')
    } catch (err) {
      console.error('Error editing message:', err)
      alert('Failed to edit message.')
    }
  }

  const onDelete = async (msgId, isSender) => {
    let mode = 'me';
    if (isSender) {
        if (!window.confirm("Delete this message for everyone?")) return;
        mode = 'everyone';
    } else {
        if (!window.confirm("Delete this message for yourself?")) return;
        mode = 'me';
    }

    try {
      await deleteFeedbackMessage(selected._id, msgId, mode)
      // Refresh to ensure deleted messages are hidden if mode was 'me'
      fetchInbox()
      fetchSent()
    } catch (err) {
      alert('Failed to delete message')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: 'linear-gradient(135deg, #0b1220 0%, #0b1930 100%)',
      padding: '40px 24px',
      boxSizing: 'border-box',
      position: 'relative',
      zIndex: 999,
      color: '#e5e7eb'
    }}>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: 20,
        borderRadius: 22,
        background: 'rgba(15,23,42,0.95)',
        border: '1px solid rgba(51,65,85,0.9)',
        boxShadow: '0 18px 50px rgba(0,0,0,0.6)',
        marginBottom: 18
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <motion.button
            whileHover={{ x: -4 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            style={{
              background: 'linear-gradient(135deg, #00ff41 0%, #22c55e 100%)',
              border: 'none',
              borderRadius: 14,
              padding: '10px 14px',
              cursor: 'pointer',
              color: '#02140a',
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 10px 24px rgba(0,255,65,0.36)',
            }}
          >
            ← Back
          </motion.button>
          <div>
              <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em', color: '#e5e7eb', marginBottom: 4 }}>
                Internal <span style={{ color: '#00ff41' }}>Messages</span>
              </div>
              <div style={{ fontSize: 13, color: '#9ca3af', fontWeight: 500 }}>
                Communicate directly with other roles in the system.
              </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {canReceive && (
            <button
              onClick={() => setTab('inbox')}
              style={{
                padding: '10px 12px',
                borderRadius: 14,
                border: '1px solid rgba(0,255,65,0.3)',
                background: tab === 'inbox' ? 'rgba(0,255,65,0.18)' : 'rgba(15,23,42,0.85)',
                color: '#e5e7eb',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
              onMouseEnter={(e) => {
                if (tab !== 'inbox') e.target.style.background = 'rgba(0,255,65,0.1)'
              }}
              onMouseLeave={(e) => {
                if (tab !== 'inbox') e.target.style.background = 'rgba(15,23,42,0.85)'
              }}
            >
              Inbox
            </button>
          )}
          <button
            onClick={() => setTab('sent')}
            style={{
              padding: '10px 12px',
              borderRadius: 14,
              border: '1px solid rgba(0,255,65,0.3)',
                background: tab === 'sent' ? 'rgba(0,255,65,0.18)' : 'rgba(15,23,42,0.85)',
              color: '#e5e7eb',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
            onMouseEnter={(e) => {
              if (tab !== 'sent') e.target.style.background = 'rgba(0,255,65,0.1)'
            }}
            onMouseLeave={(e) => {
              if (tab !== 'sent') e.target.style.background = 'rgba(15,23,42,0.85)'
            }}
          >
            Sent
          </button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(280px, 380px) 1fr',
        gap: 16,
        alignItems: 'stretch',
      }}>
        <div style={{
          background: '#020617',
          border: '1px solid rgba(0,255,65,0.3)',
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
          minHeight: 520,
        }}>
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid rgba(0,255,65,0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
          }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#cbd5f5' }}>
              {tab === 'inbox' ? 'Inbox' : 'Sent'}
            </div>
            <button
              onClick={() => { setSelectedId(null); fetchInbox() }}
              style={{
                border: '1px solid rgba(0,255,65,0.3)',
                background: 'rgba(15,23,42,0.9)',
                color: '#e5e7eb',
                borderRadius: 14,
                padding: '8px 10px',
                cursor: 'pointer',
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                opacity: 0.9,
              }}
            >
              Refresh
            </button>
          </div>
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            {(() => {
              const currentUserId = (user?.id || user?._id || "").toString();
              const displayList = list.filter(t => (t.messages || []).some(m => !m.isDeleted && !m.deletedFor?.some(id => (id._id || id || "").toString() === currentUserId)));
              
              if (tab === 'sent' && loadingSent) {
                return <div style={{ padding: 20, color: '#9ca3af', fontWeight: 700 }}>Loading…</div>;
              }

              if (displayList.length === 0) {
                return (
                  <div style={{ padding: 26, color: '#9ca3af', fontWeight: 700, opacity: 0.9 }}>
                    {tab === 'inbox' ? 'No feedback received yet.' : 'No feedback sent yet.'}
                  </div>
                );
              }

              return displayList.map((t) => {
                const activeMsgs = (t.messages || []).filter(m => !m.isDeleted && !m.deletedFor?.some(id => (id._id || id || "").toString() === currentUserId));
                const last = activeMsgs[activeMsgs.length - 1];
                const isUnread = user ? (t.unreadFor || []).some(id => (id._id || id || "").toString() === currentUserId) : false;
                const active = t._id === selectedId;
                return (
                  <div
                    key={t._id}
                    onClick={() => onSelect(t)}
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid rgba(0,255,65,0.2)',
                      cursor: 'pointer',
                      background: active ? 'rgba(0,255,65,0.18)' : isUnread ? 'rgba(0,255,65,0.10)' : 'rgba(15,23,42,0.85)',
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: isUnread ? '#00ff41' : '#9ca3af' }}>
                      {tab === 'sent' ? `To: ${t.recipients?.[0]?.name || 'Recipient'}` : `From: ${t.sender?.name || 'User'}`}
                      {t.issueId?.title ? ` • Issue: ${t.issueId.title}` : ''}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: '#e5e7eb', fontWeight: isUnread ? 800 : 600, opacity: 0.95, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {last?.message || ''}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 10, color: '#9ca3af', opacity: 0.9 }}>
                      {formatDateTime(last?.createdAt || t.updatedAt)}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        <div style={{
          background: '#020617',
          border: '1px solid rgba(51,65,85,0.9)',
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
          minHeight: 520,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {!selected ? (
            <div style={{ padding: 34, color: '#9ca3af', fontWeight: 700, opacity: 0.95 }}>
              Select a feedback thread to view details and replies.
            </div>
          ) : (
            <>
              <div style={{
                padding: '16px 18px',
                borderBottom: '1px solid rgba(51,65,85,0.9)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 12
              }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#cbd5f5' }}>
                    {tab === 'sent' ? 'Sent Feedback' : 'Received Feedback'}
                  </div>
                  <div style={{ marginTop: 8, color: '#e5e7eb', fontSize: 14, fontWeight: 800 }}>
                    {tab === 'sent'
                      ? `To: ${selected.recipients?.map(r => r.name).join(', ') || 'Recipient'}`
                      : `From: ${selected.sender?.name || 'User'}`
                    }
                  </div>
                  <div style={{ marginTop: 6, color: '#9ca3af', fontSize: 12, fontWeight: 700 }}>
                    Sender ID: {selected.sender?._id || '—'} {selected.sender?.volunteerId ? `• Volunteer ID: ${selected.sender.volunteerId}` : ''}
                  </div>
                  {selected.issueId?._id && (
                    <div style={{ marginTop: 6, color: '#93c5fd', fontSize: 12, fontWeight: 700 }}>
                      Issue Ref: {selected.issueId._id} {selected.issueId.title ? `• ${selected.issueId.title}` : ''}
                    </div>
                  )}
                </div>
                {tab === 'inbox' && (
                  <button
                    onClick={() => markThreadRead(selected._id)}
                    style={{
                      border: '1px solid rgba(0,255,65,0.3)',
                      background: 'rgba(15,23,42,0.9)',
                      color: '#e5e7eb',
                      borderRadius: 14,
                      padding: '10px 12px',
                      cursor: 'pointer',
                      fontSize: 10,
                      fontWeight: 900,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      opacity: 0.9,
                      height: 40
                    }}
                  >
                    Mark read
                  </button>
                )}
              </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {(selected.messages || []).filter(m => !m.isDeleted && !m.deletedFor?.some(id => (id._id || id || "").toString() === (user?.id || user?._id || "").toString())).map((m, idx) => {
                    const currentUserId = (user?.id || user?._id || "").toString();
                    const isSender = (m.sender?._id || m.sender || "").toString() === currentUserId;
                    const isEditing = editingMsgId === m._id;
                    return (
                      <div key={m._id} style={{ display: 'flex', justifyContent: isSender ? 'flex-end' : 'flex-start', marginBottom: 14 }}>
                        <div style={{
                          maxWidth: 'min(800px, 85%)',
                          minWidth: '100px',
                          borderRadius: 20,
                          padding: '16px 20px',
                          border: '1px solid rgba(0,255,65,0.3)',
                          background: isSender ? 'rgba(0,255,65,0.15)' : 'rgba(15,23,42,0.95)',
                          color: '#e5e7eb',
                          position: 'relative',
                          boxShadow: isSender ? '0 10px 30px rgba(0,255,65,0.1)' : '0 10px 30px rgba(0,0,0,0.4)',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 12 }}>
                            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: isSender ? '#00ff41' : '#cbd5f5', opacity: 0.9 }}>
                              {isSender ? 'You' : (m.sender?.name || 'User')} • {formatDateTime(m.createdAt)}
                              {m.isEdited && <span style={{ marginLeft: 8, color: '#9ca3af', textTransform: 'none', fontStyle: 'italic' }}>(edited)</span>}
                            </div>
                            {isSender && !isEditing && (
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <button
                                  onClick={() => { setEditingMsgId(m._id); setEditText(m.message) }}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#00ff41',
                                    cursor: 'pointer',
                                    fontSize: 10,
                                    fontWeight: 800,
                                    padding: '2px 4px',
                                    opacity: 0.7,
                                    transition: 'opacity 0.2s'
                                  }}
                                  onMouseEnter={(e) => e.target.style.opacity = 1}
                                  onMouseLeave={(e) => e.target.style.opacity = 0.7}
                                >
                                  Edit
                                </button>
                                <span style={{ color: 'rgba(51,65,85,0.9)', fontSize: 10 }}>|</span>
                                <button
                                  onClick={() => onDelete(m._id, true)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    fontSize: 10,
                                    fontWeight: 800,
                                    padding: '2px 4px',
                                    opacity: 0.7,
                                    transition: 'opacity 0.2s'
                                  }}
                                  onMouseEnter={(e) => e.target.style.opacity = 1}
                                  onMouseLeave={(e) => e.target.style.opacity = 0.7}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                            {!isSender && !isEditing && (
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <button
                                  onClick={() => onDelete(m._id, false)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    fontSize: 10,
                                    fontWeight: 800,
                                    padding: '2px 4px',
                                    opacity: 0.7,
                                    transition: 'opacity 0.2s'
                                  }}
                                  onMouseEnter={(e) => e.target.style.opacity = 1}
                                  onMouseLeave={(e) => e.target.style.opacity = 0.7}
                                >
                                  Delete for Me
                                </button>
                              </div>
                            )}
                          </div>
  
                          {isEditing ? (
                            <div style={{ display: 'grid', gap: 10 }}>
                              <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                rows={3}
                                style={{
                                  background: '#0b1220',
                                  color: '#e5e7eb',
                                  border: '1px solid rgba(0,255,65,0.4)',
                                  borderRadius: 12,
                                  padding: 10,
                                  fontSize: 13,
                                  outline: 'none',
                                  resize: 'vertical',
                                  width: '100%',
                                  boxSizing: 'border-box'
                                }}
                              />
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => { setEditingMsgId(null); setEditText('') }}
                                  style={{
                                    background: 'rgba(239,68,68,0.1)',
                                    color: '#ef4444',
                                    border: '1px solid rgba(239,68,68,0.3)',
                                    borderRadius: 10,
                                    padding: '6px 10px',
                                  }}
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => onEdit(m._id, editText)}
                                  style={{
                                    background: 'linear-gradient(135deg, #00ff41 0%, #22c55e 100%)',
                                    color: '#02140a',
                                    border: 'none',
                                    borderRadius: 10,
                                    padding: '6px 12px',
                                    fontSize: 10,
                                    fontWeight: 800,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Save Changes
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{
                              fontSize: 13,
                              fontWeight: 650,
                              lineHeight: 1.6,
                              whiteSpace: 'pre-wrap',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6
                            }}>
                              {m.message}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>

              <div style={{
                padding: 16,
                borderTop: '1px solid rgba(0,255,65,0.3)',
                background: 'rgba(15,23,42,0.6)'
              }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Write a reply…"
                    disabled={replying}
                    style={{
                      flex: 1,
                      background: 'rgba(15,23,42,0.95)',
                      color: '#e5e7eb',
                      border: '1px solid rgba(0,255,65,0.2)',
                      borderRadius: 16,
                      padding: '12px 14px',
                      fontSize: 13,
                      fontWeight: 650,
                      outline: 'none',
                      opacity: replying ? 0.6 : 1
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !replying) onReply()
                    }}
                  />
                  <button
                    onClick={onReply}
                    disabled={replying || !reply.trim()}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 16,
                      border: 'none',
                      background: replying || !reply.trim() 
                        ? 'rgba(0,255,65,0.2)' 
                        : 'linear-gradient(135deg, #00ff41 0%, #22c55e 100%)',
                      color: replying || !reply.trim() ? '#6b7280' : '#06281a',
                      cursor: replying || !reply.trim() ? 'not-allowed' : 'pointer',
                      fontSize: 12,
                      fontWeight: 900,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      minWidth: 110,
                      opacity: replying || !reply.trim() ? 0.6 : 1,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {replying ? 'Sending...' : 'Reply'}
                  </button>
                </div>
                <div style={{ marginTop: 10, fontSize: 11, color: '#9ca3af', fontWeight: 650, opacity: 0.9 }}>
                  Replies are visible to both sender and recipient(s).
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Feedback

