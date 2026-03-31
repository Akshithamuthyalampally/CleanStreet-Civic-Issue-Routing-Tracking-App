import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api from '../api/axios'
import { useAuth } from './AuthContext'

const ReviewContext = createContext(null)

export const ReviewProvider = ({ children }) => {
  const { user } = useAuth()
  
  // Admin State
  const [reviews, setReviews] = useState([])
  const [unreadReviewCount, setUnreadReviewCount] = useState(0)
  const [reviewsLoading, setReviewsLoading] = useState(false)

  // Volunteer State
  const [volunteerReviews, setVolunteerReviews] = useState([])
  const [volunteerStats, setVolunteerStats] = useState(null)
  const [unreadVolunteerReviewCount, setUnreadVolunteerReviewCount] = useState(0)
  const [volunteerLoading, setVolunteerLoading] = useState(false)

  // --- Admin Logic ---
  const fetchReviews = useCallback(async () => {
    if (!user || user.role !== 'admin') return
    setReviewsLoading(true)
    try {
      const { data } = await api.get('/reviews')
      setReviews(data)
    } catch (err) {
      console.error('Error fetching admin reviews:', err)
    } finally {
      setReviewsLoading(false)
    }
  }, [user])

  const fetchUnreadReviewCount = useCallback(async () => {
    if (!user || user.role !== 'admin') return
    try {
      const { data } = await api.get('/reviews/unread-count')
      setUnreadReviewCount(data.count || 0)
    } catch (err) {
      console.error('Error fetching admin unread count:', err)
    }
  }, [user])

  const markAllReviewsRead = useCallback(async () => {
    if (!user || user.role !== 'admin') return
    try {
      await api.put('/reviews/mark-all-read')
      setUnreadReviewCount(0)
      setReviews(prev => prev.map(r => ({ ...r, isReadByAdmin: true })))
    } catch (err) {
      console.error('Error marking all admin reviews as read:', err)
    }
  }, [user])

  // --- Volunteer Logic ---
  const fetchVolunteerReviews = useCallback(async () => {
    if (!user || user.role !== 'volunteer') return
    setVolunteerLoading(true)
    try {
      const { data } = await api.get('/reviews/volunteer/list')
      setVolunteerReviews(data)
    } catch (err) {
      console.error('Error fetching volunteer reviews:', err)
    } finally {
      setVolunteerLoading(false)
    }
  }, [user])

  const fetchVolunteerStats = useCallback(async () => {
    if (!user || user.role !== 'volunteer') return
    try {
      const { data } = await api.get('/reviews/volunteer/stats')
      setVolunteerStats(data)
    } catch (err) {
      console.error('Error fetching volunteer stats:', err)
    }
  }, [user])

  const fetchUnreadVolunteerReviewCount = useCallback(async () => {
    if (!user || user.role !== 'volunteer') return
    try {
      const { data } = await api.get('/reviews/volunteer/unread-count')
      setUnreadVolunteerReviewCount(data.count || 0)
    } catch (err) {
      console.error('Error fetching volunteer unread count:', err)
    }
  }, [user])

  const markVolunteerReviewsRead = useCallback(async () => {
    if (!user || user.role !== 'volunteer') return
    try {
      await api.put('/reviews/volunteer/mark-all-read')
      setUnreadVolunteerReviewCount(0)
      setVolunteerReviews(prev => prev.map(r => ({ ...r, isReadByVolunteer: true })))
    } catch (err) {
      console.error('Error marking all volunteer reviews as read:', err)
    }
  }, [user])

  // --- Combined Polling Effect ---
  useEffect(() => {
    if (!user) return
    
    if (user.role === 'admin') {
      fetchUnreadReviewCount()
      const interval = setInterval(fetchUnreadReviewCount, 15000)
      return () => clearInterval(interval)
    } else if (user.role === 'volunteer') {
      fetchUnreadVolunteerReviewCount()
      const interval = setInterval(fetchUnreadVolunteerReviewCount, 15000)
      return () => clearInterval(interval)
    }
  }, [user, fetchUnreadReviewCount, fetchUnreadVolunteerReviewCount])

  return (
    <ReviewContext.Provider value={{
      // Admin
      reviews,
      unreadReviewCount,
      reviewsLoading,
      fetchReviews,
      fetchUnreadReviewCount,
      markAllReviewsRead,
      
      // Volunteer
      volunteerReviews,
      volunteerStats,
      unreadVolunteerReviewCount,
      volunteerLoading,
      fetchVolunteerReviews,
      fetchVolunteerStats,
      fetchUnreadVolunteerReviewCount,
      markVolunteerReviewsRead
    }}>
      {children}
    </ReviewContext.Provider>
  )
}

export const useReviews = () => useContext(ReviewContext)
