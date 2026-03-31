import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFeedback } from '../context/FeedbackContext'
import { useAuth } from '../context/AuthContext'

const ReviewModal = ({ isOpen, onClose }) => {
  const { user } = useAuth()
  const { submitReview, fetchUsersByRole } = useFeedback()
  
  const [citizens, setCitizens] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    citizenName: '',
    citizenId: '',
    complaintType: 'General',
    overallRating: 5,
    serviceQuality: 'Excellent',
    responseTime: 'Fast',
    volunteerProfessionalism: 'High',
    comments: ''
  })

  useEffect(() => {
    if (isOpen) {
      const loadCitizens = async () => {
        try {
          const data = await fetchUsersByRole('citizen')
          setCitizens(data)
        } catch (err) {
          console.error('Error loading citizens:', err)
        }
      }
      loadCitizens()
    }
  }, [isOpen, fetchUsersByRole])

  const handleCitizenChange = (e) => {
    const name = e.target.value
    const selected = citizens.find(c => c.name === name)
    setFormData(prev => ({
      ...prev,
      citizenName: name,
      citizenId: selected ? selected._id : ''
    }))
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    setError('')
    
    // Manual word limit check
    const wordCount = formData.comments.trim() === '' ? 0 : formData.comments.trim().split(/\s+/).length
    if (wordCount > 100) {
      setError('Comments must be 100 words or less.')
      return
    }

    if (!formData.citizenName || !formData.complaintType) {
      setError('Please fill in all required fields.')
      return
    }

    setSubmitting(true)
    try {
      await submitReview(formData)
      setSuccess(true)
      setTimeout(() => {
        onClose()
        setSuccess(false)
        setFormData({
          citizenName: '',
          citizenId: '',
          complaintType: 'General',
          overallRating: 5,
          serviceQuality: 'Excellent',
          responseTime: 'Fast',
          volunteerProfessionalism: 'High',
          comments: ''
        })
      }, 2500)
    } catch (err) {
      setError('Failed to submit feedback. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const renderStars = () => {
    return [1, 2, 3, 4, 5].map(star => {
      let color = '#4b5563'
      if (star <= formData.overallRating) {
        if (formData.overallRating === 5) color = '#00ff41'
        else if (formData.overallRating >= 3) color = '#fbbf24'
        else color = '#ef4444'
      }
      
      return (
        <span
          key={star}
          onClick={() => setFormData(prev => ({ ...prev, overallRating: star }))}
          style={{
            cursor: 'pointer',
            fontSize: '32px',
            color: color,
            transition: 'all 0.2s ease',
            textShadow: star <= formData.overallRating ? `0 0 15px ${color}80` : 'none',
            transform: star <= formData.overallRating ? 'scale(1.1)' : 'scale(1)'
          }}
        >
          ★
        </span>
      )
    })
  }

  const wordCount = formData.comments.trim() === '' ? 0 : formData.comments.trim().split(/\s+/).length

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            background: 'rgba(2,6,23,0.95)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 30, opacity: 0 }}
            style={{
              width: '100%',
              maxWidth: '960px',
              height: '92vh',
              background: '#020617',
              border: '1px solid rgba(0,255,65,0.4)',
              borderRadius: '32px',
              boxShadow: '0 0 80px rgba(0,255,65,0.15), 0 50px 150px rgba(0,0,0,0.9)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '40px 60px',
              borderBottom: '1px solid rgba(0,255,65,0.15)',
              background: 'linear-gradient(to bottom, rgba(0,255,65,0.05), transparent)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '36px', fontWeight: 900, color: '#00ff41', letterSpacing: '-0.02em' }}>
                  Civic <span style={{ color: '#e5e7eb' }}>Feedback Portal</span>
                </h2>
                <p style={{ margin: '8px 0 0', color: '#9ca3af', fontSize: '16px', fontWeight: 500 }}>
                  Your detailed feedback drives real change in your community.
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90, backgroundColor: 'rgba(239,68,68,0.15)' }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#e5e7eb',
                  width: '48px',
                  height: '48px',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  fontSize: '22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}
              >
                ✕
              </motion.button>
            </div>

            {/* Scrollable Form Content */}
            <div style={{ 
              padding: '40px 60px', 
              overflowY: 'auto', 
              flex: 1,
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(0,255,65,0.2) transparent'
            }}>
              {success ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ 
                    width: '100px', 
                    height: '100px', 
                    borderRadius: '50%', 
                    background: 'rgba(0,255,65,0.1)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '50px',
                    color: '#00ff41',
                    marginBottom: '24px',
                    boxShadow: '0 0 30px rgba(0,255,65,0.3)'
                  }}>
                    ✓
                  </div>
                  <h3 style={{ fontSize: '28px', fontWeight: 900, color: '#e5e7eb', margin: 0 }}>Submission Received!</h3>
                  <p style={{ color: '#9ca3af', marginTop: '12px', fontSize: '18px' }}>Thank you for your valuable contribution to the community.</p>
                </motion.div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                  {/* Left Column */}
                  <div style={{ display: 'grid', gap: '24px' }}>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>Citizen Submitting</label>
                      <select
                        style={selectStyle}
                        value={formData.citizenName}
                        onChange={handleCitizenChange}
                        required
                      >
                        <option value="">Choose a citizen...</option>
                        {citizens.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>

                    <div style={formGroupStyle}>
                      <label style={labelStyle}>Complaint Information</label>
                      <select
                        style={selectStyle}
                        value={formData.complaintType}
                        onChange={e => setFormData(prev => ({ ...prev, complaintType: e.target.value }))}
                      >
                        <option value="General">General Inquiry</option>
                        <option value="Waste Management">Waste & Sanitation</option>
                        <option value="Roads/Infra">Roads & Infrastructure</option>
                        <option value="Public Safety">Public Safety</option>
                        <option value="Other">Miscellaneous</option>
                      </select>
                    </div>

                    <div style={formGroupStyle}>
                      <label style={labelStyle}>Overall Satisfaction</label>
                      <div style={{ 
                        display: 'flex', 
                        gap: '12px', 
                        background: 'rgba(15,23,42,0.5)', 
                        padding: '16px 20px', 
                        borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        {renderStars()}
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div style={{ display: 'grid', gap: '24px' }}>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>System Identifier</label>
                      <input
                        value={formData.citizenId}
                        readOnly
                        placeholder="Citizen ID (Automatic)"
                        style={{
                          ...inputStyle,
                          background: 'rgba(15,23,42,0.4)',
                          color: '#64748b',
                          cursor: 'not-allowed',
                          borderStyle: 'dashed'
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Service Quality</label>
                        <select
                          style={selectStyle}
                          value={formData.serviceQuality}
                          onChange={e => setFormData(prev => ({ ...prev, serviceQuality: e.target.value }))}
                        >
                          <option value="Excellent">Excellent</option>
                          <option value="Good">Good</option>
                          <option value="Average">Average</option>
                          <option value="Poor">Poor</option>
                        </select>
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Response Speed</label>
                        <select
                          style={selectStyle}
                          value={formData.responseTime}
                          onChange={e => setFormData(prev => ({ ...prev, responseTime: e.target.value }))}
                        >
                          <option value="Fast">Very Fast</option>
                          <option value="Normal">Normal</option>
                          <option value="Delayed">Delayed</option>
                          <option value="Very Slow">Very Slow</option>
                        </select>
                      </div>
                    </div>

                    <div style={formGroupStyle}>
                      <label style={labelStyle}>Volunteer Conduct</label>
                      <select
                        style={selectStyle}
                        value={formData.volunteerProfessionalism}
                        onChange={e => setFormData(prev => ({ ...prev, volunteerProfessionalism: e.target.value }))}
                      >
                        <option value="High">Highly Professional</option>
                        <option value="Standard">Meets Expectations</option>
                        <option value="Low">Needs Improvement</option>
                      </select>
                    </div>
                  </div>

                  {/* Comments (Full Width) */}
                  <div style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                    <div style={formGroupStyle}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <label style={labelStyle}>Detailed Experience</label>
                        <span style={{ 
                          fontSize: '12px', 
                          fontWeight: 700, 
                          color: wordCount > 100 ? '#ef4444' : '#64748b' 
                        }}>
                          {wordCount} / 100 words
                        </span>
                      </div>
                      <textarea
                        value={formData.comments}
                        onChange={e => setFormData(prev => ({ ...prev, comments: e.target.value }))}
                        placeholder="Tell us more about what happened..."
                        rows={6}
                        style={{
                          ...inputStyle,
                          minHeight: '160px',
                          resize: 'none',
                          lineHeight: '1.6'
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Footer */}
            {!success && (
              <div style={{
                padding: '30px 60px 40px',
                borderTop: '1px solid rgba(0,255,65,0.15)',
                background: 'rgba(2,6,23,0.8)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '20px'
              }}>
                <motion.button
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  style={{
                    padding: '16px 32px',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'transparent',
                    color: '#e5e7eb',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '15px'
                  }}
                >
                  Discard Changes
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(0,255,65,0.3)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    padding: '16px 48px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #00ff41 0%, #22c55e 100%)',
                    color: '#02140a',
                    border: 'none',
                    fontWeight: 900,
                    fontSize: '15px',
                    cursor: 'pointer',
                    opacity: submitting ? 0.7 : 1,
                    transition: 'all 0.3s ease'
                  }}
                >
                  {submitting ? 'Processing...' : 'Submit Final Review'}
                </motion.button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
  letterSpacing: '0.1em',
  color: '#9ca3af',
  marginBottom: '10px'
}

const inputStyle = {
  background: 'rgba(15,23,42,0.8)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '16px',
  color: '#e5e7eb',
  padding: '16px 20px',
  fontSize: '15px',
  outline: 'none',
  transition: 'all 0.3s ease'
}

const selectStyle = {
  ...inputStyle,
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2300ff41'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 20px center',
  backgroundSize: '18px',
  cursor: 'pointer',
  paddingRight: '50px'
}

export default ReviewModal
