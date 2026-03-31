import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useFeedback } from '../context/FeedbackContext'
import { useAuth } from '../context/AuthContext'
import { useToasts } from '../context/ToastContext'

const SubmitFeedback = () => {
  const { user } = useAuth()
  const { showToast } = useToasts()
  const { submitReview } = useFeedback()
  const navigate = useNavigate()

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Auto-populate citizen info from logged-in user session
  const citizenName = user?.name || ''
  const citizenId = user?.citizenId || user?._id || ''

  const [formData, setFormData] = useState({
    complaintType: 'General',
    overallRating: 5,
    serviceQuality: 'Excellent',
    responseTime: 'Fast',
    volunteerProfessionalism: 'High',
    comments: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const wordCount = formData.comments.trim() === '' ? 0 : formData.comments.trim().split(/\s+/).length
    if (wordCount > 100) {
      setError('Comments must be 100 words or less.')
      return
    }

    if (!citizenName || !citizenId) {
      setError('Unable to identify logged-in citizen. Please log out and log back in.')
      return
    }

    setSubmitting(true)
    try {
      await submitReview({ ...formData, citizenName, citizenId })
      showToast('Feedback submitted successfully!', 'success')
      setTimeout(() => navigate('/dashboard'), 1500)
    } catch (err) {
      setError('Failed to submit feedback. Please try again.')
      showToast('Submission failed.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const renderStars = () => {
    return [1, 2, 3, 4, 5].map(star => {
      let color = '#1e293b'
      if (star <= formData.overallRating) {
        if (formData.overallRating >= 4) color = '#00ff41'
        else if (formData.overallRating === 3) color = '#fbbf24'
        else color = '#ef4444'
      }
      return (
        <span
          key={star}
          onClick={() => setFormData(prev => ({ ...prev, overallRating: star }))}
          style={{
            cursor: 'pointer',
            fontSize: '40px',
            color: color,
            transition: 'all 0.2s ease',
            textShadow: star <= formData.overallRating ? `0 0 20px ${color}80` : 'none',
            transform: star <= formData.overallRating ? 'scale(1.15)' : 'scale(1)',
            display: 'inline-block'
          }}
        >
          ★
        </span>
      )
    })
  }

  const wordCount = formData.comments.trim() === '' ? 0 : formData.comments.trim().split(/\s+/).length

  return (
    <div style={{
      minHeight: '100vh',
      background: '#020617',
      color: '#e5e7eb',
      padding: '80px 20px 40px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          width: '100%',
          maxWidth: '900px',
          background: 'rgba(15,23,42,0.6)',
          border: '1px solid rgba(0,255,65,0.2)',
          borderRadius: '32px',
          padding: '50px',
          boxShadow: '0 0 100px rgba(0,255,65,0.05)',
          backdropFilter: 'blur(10px)'
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '44px' }}>
          <h1 style={{ margin: 0, fontSize: '42px', fontWeight: 900, color: '#00ff41', letterSpacing: '-0.02em' }}>
            <span style={{ color: '#fff' }}>Feedback</span> Form
          </h1>
          <p style={{ marginTop: '12px', color: '#9ca3af', fontSize: '17px', fontWeight: 500 }}>
            Your experiences help us refine CivicHub services for everyone.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '36px' }}>

          {/* Auto-filled Identity Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Citizen Name — read-only */}
            <div style={formGroupStyle}>
              <label style={labelStyle}>Citizen Name</label>
              <div style={readonlyWrapStyle}>
                <span style={{ fontSize: '16px', marginRight: '8px' }}>👤</span>
                <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '15px' }}>{citizenName || '—'}</span>
              </div>
              <p style={hintStyle}>Auto-filled from your account</p>
            </div>

            {/* Citizen ID — read-only */}
            <div style={formGroupStyle}>
              <label style={labelStyle}>Citizen ID</label>
              <div style={readonlyWrapStyle}>
                <span style={{ fontSize: '16px', marginRight: '8px' }}>🪪</span>
                <span style={{ fontWeight: 700, color: '#00ff41', fontSize: '13px', letterSpacing: '0.04em', fontFamily: 'monospace' }}>
                  {citizenId || '—'}
                </span>
              </div>
              <p style={hintStyle}>Linked to your registered profile</p>
            </div>
          </div>

          {/* Complaint + Rating Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Complaint Category</label>
              <select
                style={selectStyle}
                value={formData.complaintType}
                onChange={e => setFormData({ ...formData, complaintType: e.target.value })}
              >
                <option value="General">General Inquiry</option>
                <option value="Garbage Collection">Garbage Collection</option>
                <option value="Street Light">Street Light</option>
                <option value="Road Repair">Road Repair</option>
                <option value="Water Supply">Water Supply</option>
                <option value="Sanitation">Sanitation</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Overall Experience</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                {renderStars()}
              </div>
            </div>
          </div>

          {/* Quality Metrics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Service Quality</label>
              <select
                style={selectStyle}
                value={formData.serviceQuality}
                onChange={e => setFormData({ ...formData, serviceQuality: e.target.value })}
              >
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Average">Average</option>
                <option value="Poor">Poor</option>
              </select>
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Response Time</label>
              <select
                style={selectStyle}
                value={formData.responseTime}
                onChange={e => setFormData({ ...formData, responseTime: e.target.value })}
              >
                <option value="Very Fast">Very Fast</option>
                <option value="Fast">Fast</option>
                <option value="Delayed">Delayed</option>
                <option value="Very Slow">Very Slow</option>
              </select>
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Professionalism</label>
              <select
                style={selectStyle}
                value={formData.volunteerProfessionalism}
                onChange={e => setFormData({ ...formData, volunteerProfessionalism: e.target.value })}
              >
                <option value="High">Highly Professional</option>
                <option value="Good">Good</option>
                <option value="Moderate">Moderate</option>
                <option value="Unprofessional">Unprofessional</option>
              </select>
            </div>
          </div>

          {/* Comments */}
          <div style={formGroupStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={labelStyle}>Detailed Comments</label>
              <span style={{ fontSize: '13px', fontWeight: 700, color: wordCount > 100 ? '#ef4444' : '#64748b' }}>
                {wordCount} / 100 words
              </span>
            </div>
            <textarea
              style={{ ...inputStyle, minHeight: '160px', resize: 'vertical', lineHeight: '1.6' }}
              placeholder="Tell us more about the service provided..."
              value={formData.comments}
              onChange={e => setFormData({ ...formData, comments: e.target.value })}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '14px 18px',
              borderRadius: '14px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#ef4444',
              textAlign: 'center',
              fontWeight: 700,
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '4px' }}>
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/dashboard')}
              style={{
                padding: '15px 36px',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent',
                color: '#fff',
                fontWeight: 900,
                cursor: 'pointer',
                fontSize: '15px'
              }}
            >
              Cancel
            </motion.button>
            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(0,255,65,0.4)' }}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: '15px 56px',
                borderRadius: '16px',
                border: 'none',
                background: 'linear-gradient(135deg, #00ff41 0%, #22c55e 100%)',
                color: '#02140a',
                fontWeight: 900,
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontSize: '15px',
                opacity: submitting ? 0.7 : 1
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

const formGroupStyle = {
  display: 'flex',
  flexDirection: 'column'
}

const labelStyle = {
  fontSize: '12px',
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: '#9ca3af',
  marginBottom: '10px'
}

const hintStyle = {
  margin: '7px 0 0',
  fontSize: '11px',
  color: '#334155',
  fontWeight: 600
}

const readonlyWrapStyle = {
  display: 'flex',
  alignItems: 'center',
  background: 'rgba(2,6,23,0.5)',
  border: '1px solid rgba(0,255,65,0.15)',
  borderRadius: '14px',
  padding: '16px 18px',
  minHeight: '54px',
  cursor: 'default'
}

const inputStyle = {
  background: 'rgba(15,23,42,0.9)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '14px',
  color: '#e5e7eb',
  padding: '16px 18px',
  fontSize: '15px',
  outline: 'none',
  transition: 'all 0.3s ease',
  width: '100%',
  boxSizing: 'border-box'
}

const selectStyle = {
  ...inputStyle,
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2300ff41'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 16px center',
  backgroundSize: '18px',
  cursor: 'pointer',
  paddingRight: '48px'
}

export default SubmitFeedback
