import React, { useMemo } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { NotificationProvider } from './context/NotificationContext'
import { FeedbackProvider } from './context/FeedbackContext'
import { ReviewProvider } from './context/ReviewContext'
import { ToastProvider } from './context/ToastContext'
import ToastContainer from './components/ToastContainer'
import PrivateRoute from './components/PrivateRoute'
import Navbar from './components/Navbar'
import Notifications from './pages/Notifications'
import SubmitFeedback from './pages/SubmitFeedback'
import Feedback from './pages/Feedback'
import Threads from './components/Threads'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import ReportIssue from './pages/ReportIssue'
import RegisterClean from './pages/RegisterClean'
import MyComplaints from './pages/MyComplaints'
import VolunteerDashboard from './pages/VolunteerDashboard'
import AccountSettings from './pages/AccountSettings'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import AdminFeedbackDashboard from './pages/AdminFeedbackDashboard'
import VolunteerPerformance from './pages/VolunteerPerformance'
import VolunteerRatings from './pages/VolunteerRatings'
import IssueFeedbackForm from './pages/IssueFeedbackForm'
import IssueDetail from './pages/IssueDetail'
import MessagesWidget from './components/MessagesWidget'

const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3, ease: 'easeOut' }}
    className="w-full"
  >
    {children}
  </motion.div>
)

const Layout = ({ children }) => (
  <div className="relative z-10 min-h-screen">
    <Navbar />
    <main className="max-w-6xl mx-auto px-4 py-6">
      <PageTransition>{children}</PageTransition>
    </main>
  </div>
)

function AppContent() {
  const location = useLocation()
  const { theme } = useTheme()

  // Threads color: [R, G, B] normalized 0-1
  // Updated to richer/darker green as per user request
  // Memoized to prevent Threads component from re-initializing on every render
  const threadsColor = useMemo(() =>
    theme === 'dark' ? [0, 0.6, 0.1] : [0.05, 0.4, 0.15],
    [theme])

  return (
    <div className="relative min-h-screen selection:bg-civic-green selection:text-black overflow-x-hidden">
      <ToastContainer />
      {/* Global Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <Threads
          amplitude={1.2}
          distance={0.2}
          enableMouseInteraction={true}
          color={threadsColor}
        />
      </div>

      <div className="relative z-10 w-full min-h-screen">
        <MessagesWidget />
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
            <Route path="/signup" element={<PageTransition><Signup /></PageTransition>} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Layout><Dashboard /></Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/report-issue"
              element={
                <PrivateRoute>
                  <Layout><ReportIssue /></Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/register-clean"
              element={
                <PrivateRoute>
                  <Layout><RegisterClean /></Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/my-complaints"
              element={
                <PrivateRoute>
                  <Layout><MyComplaints /></Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/volunteer-dashboard"
              element={
                <PrivateRoute>
                  <Layout><VolunteerDashboard /></Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/account"
              element={
                <PrivateRoute>
                  <Layout><AccountSettings /></Layout>
                </PrivateRoute>
              }
            />
            {/* Full-screen pages - no Layout wrapper */}
            <Route
              path="/notifications"
              element={
                <PrivateRoute>
                  <Notifications />
                </PrivateRoute>
              }
            />
            <Route
              path="/submit-feedback"
              element={
                <PrivateRoute role="citizen">
                  <SubmitFeedback />
                </PrivateRoute>
              }
            />
            <Route
              path="/feedback"
              element={
                <PrivateRoute>
                  <Feedback />
                </PrivateRoute>
              }
            />
            <Route path="/admin/login" element={<PageTransition><AdminLogin /></PageTransition>} />
            <Route
              path="/admin/dashboard"
              element={
                <PrivateRoute>
                  <Layout><AdminDashboard /></Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/feedback"
              element={
                <PrivateRoute>
                  <AdminFeedbackDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/volunteer-performance"
              element={
                <PrivateRoute>
                  <VolunteerPerformance />
                </PrivateRoute>
              }
            />
            <Route
              path="/volunteer/ratings"
              element={
                <PrivateRoute role="volunteer">
                  <VolunteerRatings />
                </PrivateRoute>
              }
            />
            <Route
              path="/issue/:id/feedback"
              element={
                <PrivateRoute>
                  <Layout><IssueFeedbackForm /></Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/issue/:id"
              element={
                <PrivateRoute>
                  <Layout><IssueDetail /></Layout>
                </PrivateRoute>
              }
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AnimatePresence>
      </div>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <NotificationProvider>
              <FeedbackProvider>
                <ReviewProvider>
                  <AppContent />
                </ReviewProvider>
              </FeedbackProvider>
            </NotificationProvider>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
