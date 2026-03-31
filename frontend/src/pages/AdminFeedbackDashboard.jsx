import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useReviews } from '../context/ReviewContext'

const getRatingColor = (rating) => {
  if (rating >= 4) return { color: '#00ff41', bg: 'rgba(0,255,65,0.12)', label: 'Excellent', glow: '0 0 14px rgba(0,255,65,0.35)' }
  if (rating === 3) return { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', label: 'Average', glow: '0 0 14px rgba(251,191,36,0.3)' }
  return { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'Poor', glow: '0 0 14px rgba(239,68,68,0.3)' }
}

const qualityColor = (val) => {
  const map = {
    Excellent: '#00ff41', 'Very Fast': '#00ff41', High: '#00ff41', 'Highly Professional': '#00ff41',
    Good: '#6ee7b7', Fast: '#6ee7b7',
    Average: '#fbbf24', Delayed: '#fbbf24', Moderate: '#fbbf24',
    Poor: '#ef4444', 'Very Slow': '#ef4444', Unprofessional: '#ef4444',
  }
  return map[val] || '#94a3b8'
}

const Chip = ({ label, value }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
    <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569' }}>{label}</span>
    <span style={{
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: '8px',
      fontSize: '12px',
      fontWeight: 800,
      color: qualityColor(value),
      background: `${qualityColor(value)}18`,
      border: `1px solid ${qualityColor(value)}40`,
      whiteSpace: 'nowrap'
    }}>{value}</span>
  </div>
)

const StarRating = ({ rating }) => {
  const { color, glow } = getRatingColor(rating)
  return (
    <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} style={{
          fontSize: '18px',
          color: s <= rating ? color : '#1e293b',
          textShadow: s <= rating ? glow : 'none',
          transition: 'all 0.2s'
        }}>★</span>
      ))}
      <span style={{ marginLeft: '6px', fontSize: '12px', fontWeight: 800, color, textShadow: glow }}>{rating}/5</span>
    </div>
  )
}

const COMPLAINT_TYPES = ['All', 'General', 'Garbage Collection', 'Street Light', 'Road Repair', 'Water Supply', 'Sanitation', 'Other']

const AdminFeedbackDashboard = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { reviews, reviewsLoading, fetchReviews, markAllReviewsRead, unreadReviewCount } = useReviews()

  const [filterType, setFilterType] = useState('All')
  const [filterRating, setFilterRating] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [markedRead, setMarkedRead] = useState(false)

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  // Mark all as read when admin opens the dashboard
  useEffect(() => {
    if (!markedRead && reviews.length >= 0) {
      markAllReviewsRead()
      setMarkedRead(true)
    }
  }, [reviews, markAllReviewsRead, markedRead])

  const filtered = reviews.filter(r => {
    const typeMatch = filterType === 'All' || r.complaintType === filterType
    const ratingMatch = filterRating === 'All' ||
      (filterRating === 'good' && r.overallRating >= 4) ||
      (filterRating === 'average' && r.overallRating === 3) ||
      (filterRating === 'poor' && r.overallRating <= 2)
    const search = searchQuery.toLowerCase()
    const searchMatch = !search ||
      r.citizenName?.toLowerCase().includes(search) ||
      r.citizenId?.toLowerCase().includes(search) ||
      r.comments?.toLowerCase().includes(search)
    return typeMatch && ratingMatch && searchMatch
  })

  const avgRating = reviews.length
    ? (reviews.reduce((a, r) => a + r.overallRating, 0) / reviews.length).toFixed(1)
    : '—'

  const goodCount = reviews.filter(r => r.overallRating >= 4).length
  const avgCount = reviews.filter(r => r.overallRating === 3).length
  const poorCount = reviews.filter(r => r.overallRating <= 2).length

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #020617 0%, #0a1628 50%, #020617 100%)',
      color: '#e2e8f0',
      fontFamily: "'Inter', 'system-ui', sans-serif",
      overflowX: 'hidden'
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '500px', pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 40% at 50% -10%, rgba(0,255,65,0.07) 0%, transparent 70%)',
        zIndex: 0
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1400px', margin: '0 auto', padding: '30px 24px 60px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '40px', gap: '20px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/admin/dashboard')}
                style={{
                  background: 'rgba(0,255,65,0.08)',
                  border: '1px solid rgba(0,255,65,0.25)',
                  borderRadius: '12px',
                  color: '#00ff41',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                ← Back
              </motion.button>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: 'rgba(0,255,65,0.1)', border: '1px solid rgba(0,255,65,0.25)',
                borderRadius: '20px', padding: '4px 14px'
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00ff41', boxShadow: '0 0 8px #00ff41', display: 'inline-block' }} />
                <span style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#00ff41' }}>
                  Admin Access
                </span>
              </div>
            </div>
            <h1 style={{ margin: 0, fontSize: '42px', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              <span style={{ color: '#fff' }}>Citizen </span>
              <span style={{ color: '#00ff41', textShadow: '0 0 30px rgba(0,255,65,0.4)' }}>Feedback</span>
            </h1>
            <p style={{ margin: '10px 0 0', color: '#64748b', fontWeight: 600, fontSize: '15px' }}>
              All submitted citizen reviews and ratings in one place.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center', padding: '14px 20px', background: 'rgba(0,255,65,0.07)', border: '1px solid rgba(0,255,65,0.2)', borderRadius: '16px' }}>
              <div style={{ fontSize: '28px', fontWeight: 900, color: '#00ff41', lineHeight: 1 }}>{reviews.length}</div>
              <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', marginTop: '4px' }}>Total</div>
            </div>
            <div style={{ textAlign: 'center', padding: '14px 20px', background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '16px' }}>
              <div style={{ fontSize: '28px', fontWeight: 900, color: '#fbbf24', lineHeight: 1 }}>{avgRating}</div>
              <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', marginTop: '4px' }}>Avg Rating</div>
            </div>
            <div style={{ textAlign: 'center', padding: '14px 20px', background: 'rgba(0,255,65,0.07)', border: '1px solid rgba(0,255,65,0.2)', borderRadius: '16px' }}>
              <div style={{ fontSize: '28px', fontWeight: 900, color: '#00ff41', lineHeight: 1 }}>{goodCount}</div>
              <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', marginTop: '4px' }}>Positive</div>
            </div>
            <div style={{ textAlign: 'center', padding: '14px 20px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '16px' }}>
              <div style={{ fontSize: '28px', fontWeight: 900, color: '#ef4444', lineHeight: 1 }}>{poorCount}</div>
              <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', marginTop: '4px' }}>Negative</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{
          display: 'flex', gap: '14px', marginBottom: '28px', flexWrap: 'wrap', alignItems: 'center',
          padding: '18px 22px', background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(0,255,65,0.1)',
          borderRadius: '20px', backdropFilter: 'blur(12px)'
        }}>
          {/* Search */}
          <div style={{ flex: '1', minWidth: '200px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', opacity: 0.5 }}>🔍</span>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, ID or comments..."
              style={{
                width: '100%', background: 'rgba(2,6,23,0.6)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px', color: '#e2e8f0', padding: '10px 14px 10px 38px',
                fontSize: '14px', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Type filter */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{
              background: 'rgba(2,6,23,0.6)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px', color: '#e2e8f0', padding: '10px 14px',
              fontSize: '13px', fontWeight: 700, outline: 'none', cursor: 'pointer'
            }}
          >
            {COMPLAINT_TYPES.map(t => <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>)}
          </select>

          {/* Rating filter */}
          <select
            value={filterRating}
            onChange={e => setFilterRating(e.target.value)}
            style={{
              background: 'rgba(2,6,23,0.6)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px', color: '#e2e8f0', padding: '10px 14px',
              fontSize: '13px', fontWeight: 700, outline: 'none', cursor: 'pointer'
            }}
          >
            <option value="All">All Ratings</option>
            <option value="good">⭐ Good (4-5)</option>
            <option value="average">⚠️ Average (3)</option>
            <option value="poor">❌ Poor (1-2)</option>
          </select>

          <span style={{ color: '#475569', fontSize: '13px', fontWeight: 700, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
            {filtered.length} of {reviews.length} entries
          </span>
        </div>

        {/* Loading */}
        {reviewsLoading && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#475569' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid rgba(0,255,65,0.2)', borderTopColor: '#00ff41', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontWeight: 700 }}>Loading feedback...</p>
          </div>
        )}

        {/* Empty state */}
        {!reviewsLoading && filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              textAlign: 'center', padding: '80px 40px',
              background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(0,255,65,0.1)',
              borderRadius: '24px', color: '#475569'
            }}
          >
            <div style={{ fontSize: '60px', marginBottom: '16px' }}>📋</div>
            <h3 style={{ color: '#94a3b8', fontWeight: 800, margin: '0 0 8px' }}>No Feedback Found</h3>
            <p style={{ margin: 0 }}>
              {reviews.length === 0 ? 'No citizen feedback has been submitted yet.' : 'Try adjusting your filters.'}
            </p>
          </motion.div>
        )}

        {/* Feedback Cards Grid */}
        {!reviewsLoading && filtered.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: '18px' }}>
            <AnimatePresence>
              {filtered.map((review, idx) => {
                const rating = getRatingColor(review.overallRating)
                const isExpanded = expandedId === review._id
                const isNew = !review.isRead
                const dt = new Date(review.createdAt)
                const dateStr = dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                const timeStr = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

                return (
                  <motion.div
                    key={review._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.04, duration: 0.35 }}
                    style={{
                      background: 'rgba(15,23,42,0.75)',
                      border: `1px solid ${isNew ? 'rgba(0,255,65,0.35)' : 'rgba(255,255,255,0.07)'}`,
                      borderRadius: '20px',
                      padding: '24px',
                      backdropFilter: 'blur(12px)',
                      boxShadow: isNew ? '0 0 20px rgba(0,255,65,0.08)' : '0 4px 20px rgba(0,0,0,0.3)',
                      transition: 'box-shadow 0.3s, border-color 0.3s',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onClick={() => setExpandedId(isExpanded ? null : review._id)}
                    whileHover={{ y: -3, boxShadow: '0 8px 30px rgba(0,255,65,0.12)' }}
                  >
                    {/* New badge */}
                    {isNew && (
                      <div style={{
                        position: 'absolute', top: '14px', right: '14px',
                        background: '#00ff41', color: '#020617',
                        fontSize: '9px', fontWeight: 900, padding: '3px 8px',
                        borderRadius: '6px', letterSpacing: '0.1em', textTransform: 'uppercase'
                      }}>
                        NEW
                      </div>
                    )}

                    {/* Top row: Avatar + Citizen info + Rating */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
                      {/* Avatar */}
                      <div style={{
                        width: '46px', height: '46px', borderRadius: '14px', flexShrink: 0,
                        background: `linear-gradient(135deg, ${rating.color}22 0%, ${rating.color}44 100%)`,
                        border: `2px solid ${rating.color}50`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '20px', fontWeight: 900, color: rating.color,
                        boxShadow: rating.glow
                      }}>
                        {review.citizenName?.charAt(0)?.toUpperCase() || '?'}
                      </div>

                      {/* Name + ID */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 900, fontSize: '16px', color: '#f1f5f9', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {review.citizenName}
                        </div>
                        <div style={{ fontSize: '11px', color: '#475569', fontWeight: 700, letterSpacing: '0.05em' }}>
                          ID: <span style={{ color: '#64748b' }}>{review.citizenId}</span>
                        </div>
                      </div>

                      {/* Complaint type badge */}
                      <div style={{
                        padding: '5px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 800,
                        background: 'rgba(139,92,246,0.15)', color: '#a78bfa',
                        border: '1px solid rgba(139,92,246,0.3)', whiteSpace: 'nowrap', flexShrink: 0
                      }}>
                        {review.complaintType}
                      </div>
                    </div>

                    {/* Overall Rating */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', borderRadius: '14px',
                      background: rating.bg, border: `1px solid ${rating.color}25`,
                      marginBottom: '16px'
                    }}>
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: rating.color, marginBottom: '6px' }}>
                          Overall Rating
                        </div>
                        <StarRating rating={review.overallRating} />
                      </div>
                      <div style={{
                        fontSize: '24px', fontWeight: 900, color: rating.color,
                        textShadow: rating.glow, opacity: 0.8
                      }}>
                        {review.overallRating >= 4 ? '😊' : review.overallRating === 3 ? '😐' : '😞'}
                      </div>
                    </div>

                    {/* Quality metrics */}
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                      <Chip label="Service Quality" value={review.serviceQuality} />
                      <Chip label="Response Time" value={review.responseTime} />
                      <Chip label="Professionalism" value={review.volunteerProfessionalism} />
                    </div>

                    {/* Comments (collapsed/expanded) */}
                    {review.comments && (
                      <div style={{
                        padding: '12px 15px', background: 'rgba(2,6,23,0.5)',
                        border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px',
                        marginBottom: '14px'
                      }}>
                        <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', marginBottom: '6px' }}>
                          💬 Comments
                        </div>
                        <p style={{
                          margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: 1.6,
                          maxHeight: isExpanded ? 'none' : '60px',
                          overflow: isExpanded ? 'visible' : 'hidden',
                          textOverflow: isExpanded ? 'clip' : 'ellipsis',
                          display: isExpanded ? 'block' : '-webkit-box',
                          WebkitLineClamp: isExpanded ? 'unset' : 3,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          "{review.comments}"
                        </p>
                        {!isExpanded && review.comments.length > 150 && (
                          <span style={{ fontSize: '11px', color: '#00ff41', fontWeight: 700 }}>Read more ↓</span>
                        )}
                        {isExpanded && (
                          <span style={{ fontSize: '11px', color: '#00ff41', fontWeight: 700 }}>Collapse ↑</span>
                        )}
                      </div>
                    )}

                    {/* Footer: Date + Time */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                        <span>📅</span>
                        <span>{dateStr}</span>
                        <span style={{ opacity: 0.4 }}>•</span>
                        <span>🕐</span>
                        <span>{timeStr}</span>
                      </div>
                      <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: '#00ff41',
                        boxShadow: '0 0 6px #00ff41',
                        opacity: 0.5
                      }} />
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        select option { background: #0f172a; }
      `}</style>
    </div>
  )
}

export default AdminFeedbackDashboard
