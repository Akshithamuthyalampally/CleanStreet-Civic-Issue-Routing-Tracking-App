import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api from '../api/axios'
import { useAuth } from './AuthContext'

const FeedbackContext = createContext(null)

export const FeedbackProvider = ({ children }) => {
  const { user } = useAuth()
  const [inbox, setInbox] = useState([])
  const [sent, setSent] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchInbox = useCallback(async () => {
    if (!user) return
    try {
      const { data } = await api.get('/feedback/inbox')
      setInbox(data)
    } catch (err) {
      console.error('Error fetching feedback inbox:', err)
    }
  }, [user])

  const fetchSent = useCallback(async () => {
    if (!user) return
    try {
      const { data } = await api.get('/feedback/sent')
      setSent(data)
    } catch (err) {
      console.error('Error fetching feedback sent:', err)
    }
  }, [user])

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return
    try {
      const { data } = await api.get('/feedback/unread-count')
      setUnreadCount(data.count || 0)
    } catch (err) {
      console.error('Error fetching feedback unread count:', err)
    }
  }, [user])

  const createFeedback = useCallback(async ({ recipientType, message, issueId, recipientId }) => {
    const { data } = await api.post('/feedback', { recipientType, message, issueId, recipientId })
    fetchUnreadCount()
    return data
  }, [fetchUnreadCount])

  const submitReview = useCallback(async (reviewData) => {
    const { data } = await api.post('/reviews', reviewData)
    return data
  }, [])

  const fetchUsersByRole = useCallback(async (role) => {
    try {
      const { data } = await api.get('/feedback/recipients', { params: { role, query: '' } })
      return data
    } catch (err) {
      console.error('Error fetching users by role:', err)
      return []
    }
  }, [])

  const markThreadRead = useCallback(async (threadId) => {
    try {
      await api.put(`/feedback/${threadId}/read`)
      // Optimistiskt: ta bort från unread lokalt
      setInbox(prev => prev.map(t => t._id === threadId ? { ...t, unreadFor: (t.unreadFor || []).filter(id => id !== (user?.id || user?._id)) } : t))
      fetchUnreadCount()
    } catch (err) {
      console.error('Error marking feedback read:', err)
    }
  }, [fetchUnreadCount, user])

  const replyToThread = useCallback(async (threadId, message) => {
    try {
      console.log('[FeedbackContext] Attempting to reply to thread:', threadId);
      console.log('[FeedbackContext] Message:', message);
      
      const { data } = await api.post(`/feedback/${threadId}/reply`, { message })
      console.log('[FeedbackContext] Reply successful, data received:', data);
      
      // Update thread in inbox
      setInbox(prev => prev.map(t => t._id === threadId ? data : t))
      // Update thread in sent
      setSent(prev => prev.map(t => t._id === threadId ? data : t))
      fetchUnreadCount()
      return data
    } catch (err) {
      console.error('[FeedbackContext] Error in replyToThread:', err)
      console.error('[FeedbackContext] Error response:', err.response?.data)
      console.error('[FeedbackContext] Error status:', err.response?.status)
      throw err // Re-throw to be caught by component
    }
  }, [fetchUnreadCount])

  const editFeedbackMessage = useCallback(async (threadId, messageId, message) => {
    try {
      const { data } = await api.put(`/feedback/${threadId}/message/${messageId}`, { message })
      setInbox(prev => prev.map(t => t._id === threadId ? data : t))
      setSent(prev => prev.map(t => t._id === threadId ? data : t))
      return data
    } catch (err) {
      console.error('Error editing feedback message:', err)
      throw err
    }
  }, [])

  const deleteFeedbackMessage = useCallback(async (threadId, messageId, mode = 'me') => {
    try {
      const { data } = await api.delete(`/feedback/${threadId}/message/${messageId}`, { params: { mode } })
      setInbox(prev => prev.map(t => t._id === threadId ? data : t))
      setSent(prev => prev.map(t => t._id === threadId ? data : t))
      return data
    } catch (err) {
      console.error('Error deleting feedback message:', err)
      throw err
    }
  }, [])

  useEffect(() => {
    if (!user) return
    const userId = (user.id || user._id)
    const count = inbox.filter(t => 
      t.unreadFor?.some(id => (id._id || id).toString() === userId)
    ).length
    setUnreadCount(count)
  }, [inbox, user])

  useEffect(() => {
    if (!user) return
    fetchInbox()
    fetchSent()
    fetchUnreadCount()
    const interval = setInterval(() => {
      fetchInbox()
      fetchSent()
      fetchUnreadCount()
    }, 10000)
    return () => clearInterval(interval)
  }, [user, fetchInbox, fetchSent, fetchUnreadCount])

  return (
    <FeedbackContext.Provider value={{
      inbox,
      sent,
      unreadCount,
      fetchInbox,
      fetchSent,
      fetchUnreadCount,
      createFeedback,
      submitReview,
      fetchUsersByRole,
      markThreadRead,
      replyToThread,
      editFeedbackMessage,
      deleteFeedbackMessage
    }}>
      {children}
    </FeedbackContext.Provider>
  )
}

export const useFeedback = () => useContext(FeedbackContext)

