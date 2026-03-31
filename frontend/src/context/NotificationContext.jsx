import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import api from '../api/axios'
import { useAuth } from './AuthContext'
import { useToasts } from './ToastContext'

const NotificationContext = createContext(null)

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth()
    const { showToast } = useToasts()
    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)

    const fetchNotifications = useCallback(async () => {
        if (!user) return
        try {
            const res = await api.get('/notifications')
            const newData = res.data;
            
            // Check for NEW unread feedback notifications to "pop" them (Disabled as per user request for silent operation)
            /*
            newData.forEach(n => {
                if (n.type === 'FEEDBACK_RECEIVED' && !n.isRead) {
                    const exists = notifications.find(old => old._id === n._id);
                    if (!exists) {
                        showToast(n.message, 'feedback');
                    }
                }
            });
            */

            setNotifications(newData)
            setUnreadCount(newData.filter(n => !n.isRead).length)
        } catch (err) {
            console.error('Error fetching notifications:', err)
        }
    }, [user, notifications, showToast])

    const markAsRead = useCallback(async (id) => {
        try {
            await api.put(`/notifications/${id}/read`)
            setNotifications(prev =>
                prev.map(n => n._id === id ? { ...n, isRead: true } : n)
            )
            setUnreadCount(prev => Math.max(0, prev - 1))
            // Refresh to ensure consistency
            setTimeout(fetchNotifications, 500)
        } catch (err) {
            console.error('Error marking notification as read:', err)
        }
    }, [fetchNotifications])

    const markAllAsRead = useCallback(async () => {
        try {
            await api.put('/notifications/mark-all-read')
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
            setUnreadCount(0)
            // Refresh to ensure consistency
            setTimeout(fetchNotifications, 500)
        } catch (err) {
            console.error('Error marking all as read:', err)
        }
    }, [fetchNotifications])

    const deleteNotification = useCallback(async (id) => {
        // Optimistisk uppdatering i UI – ta bort raden direkt från alla sidor
        setNotifications(prev => {
            const target = prev.find(n => n._id === id)
            if (target && !target.isRead) {
                setUnreadCount(count => Math.max(0, count - 1))
            }
            return prev.filter(n => n._id !== id)
        })

        try {
            await api.delete(`/notifications/${id}`)
        } catch (err) {
            console.error('Error deleting notification:', err)
        }
    }, [])

    // Poll for new notifications every 30 seconds
    useEffect(() => {
        if (!user) return
        fetchNotifications()
        const interval = setInterval(fetchNotifications, 10000)
        return () => clearInterval(interval)
    }, [user, fetchNotifications])

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            isOpen,
            setIsOpen,
            fetchNotifications,
            markAsRead,
            markAllAsRead,
            deleteNotification
        }}>
            {children}
        </NotificationContext.Provider>
    )
}

export const useNotifications = () => useContext(NotificationContext)
