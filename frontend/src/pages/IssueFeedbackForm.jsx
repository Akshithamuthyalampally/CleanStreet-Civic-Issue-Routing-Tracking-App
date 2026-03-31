import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const StarRating = ({ rating, setRating }) => {
  const [hover, setHover] = useState(0);
  
  const getStarColor = (val) => {
    const current = hover || rating;
    if (val > current) return 'text-zinc-700';
    if (current <= 2) return 'text-red-500';
    if (current === 3) return 'text-yellow-400';
    return 'text-civic-green';
  };

  const getGlowColor = (val) => {
    const current = hover || rating;
    if (val > current) return 'none';
    if (current <= 2) return 'drop-shadow(0 0 12px rgba(239,68,68,0.5))';
    if (current === 3) return 'drop-shadow(0 0 12px rgba(250,204,21,0.5))';
    return 'drop-shadow(0 0 12px rgba(0,255,65,0.5))';
  };

  return (
    <div className="flex gap-4">
      {[1, 2, 3, 4, 5].map((star) => (
        <motion.button
          key={star}
          type="button"
          whileHover={{ scale: 1.3, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setRating(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="transition-all duration-300 focus:outline-none"
        >
          <svg
            viewBox="0 0 24 24"
            className={`w-14 h-14 ${getStarColor(star)} fill-current transition-colors duration-300`}
            style={{ filter: getGlowColor(star) }}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </motion.button>
      ))}
    </div>
  );
};

const IssueFeedbackForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    overallRating: 5,
    serviceQuality: 'Excellent',
    responseTime: 'Very Fast',
    volunteerProfessionalism: 'Very Professional',
    comments: ''
  });

  useEffect(() => {
    const fetchIssue = async () => {
      try {
        const { data } = await api.get(`/issues/${id}`);
        setIssue(data);
      } catch (err) {
        console.error('Error fetching issue:', err);
        navigate('/my-complaints');
      } finally {
        setLoading(false);
      }
    };
    fetchIssue();
  }, [id, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!issue || !issue.assignedVolunteer) return;
    
    setSubmitting(true);
    try {
      await api.post('/reviews', {
        ...formData,
        citizenName: user.name,
        citizenId: user.citizenId || user._id,
        complaintType: issue.category,
        type: 'issue_based',
        issueId: issue._id,
        volunteerId: issue.assignedVolunteer._id || issue.assignedVolunteer
      });
      navigate('/my-complaints');
    } catch (err) {
      console.error('Submission failed:', err);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <div className="w-16 h-16 border-4 border-civic-green border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(0,255,65,0.3)]"></div>
      </div>
    );
  }

  if (!issue || !issue.assignedVolunteer) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-center px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card max-w-md p-10 border-dashed opacity-80"
        >
          <div className="text-7xl mb-6">🛡️</div>
          <h2 className="text-2xl font-black mb-4 uppercase tracking-tighter">Mission Restricted</h2>
          <p className="opacity-60 mb-8 font-medium">Evaluation is only authorized for missions with an active verified hero assigned.</p>
          <button onClick={() => navigate('/my-complaints')} className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all">Return to Command</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-0">
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative group"
      >
        {/* Ambient Civic Green Glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-civic-green/20 to-emerald-600/20 rounded-[40px] blur-2xl opacity-50 group-hover:opacity-70 transition-opacity" />
        
        <div className="relative bg-zinc-900/60 border border-white/5 rounded-[40px] overflow-hidden backdrop-blur-3xl shadow-2xl">
          <div className="p-8 sm:p-14">
            {/* Header */}
            <div className="mb-14 relative">
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="flex items-center gap-4 text-[11px] font-black uppercase tracking-[0.3em] text-civic-green mb-4"
              >
                <span className="w-12 h-[2px] bg-gradient-to-r from-civic-green to-transparent"></span>
                Mission Evaluation
              </motion.div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tighter leading-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                Rate Your <br />
                <span className="text-civic-green italic">Civilian Hero</span>
              </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-12">
              {/* Hero Summary Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-1 bg-white/5 rounded-[32px] border border-white/5 shadow-inner">
                <div className="p-6 rounded-[28px] bg-zinc-800/40 backdrop-blur-md">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Deployed Hero</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-civic-green/20 flex items-center justify-center text-civic-green border border-civic-green/30">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    </div>
                    <p className="text-lg font-black tracking-tight">{issue.assignedVolunteer.name || 'Hero'}</p>
                  </div>
                </div>
                <div className="p-6 rounded-[28px] bg-zinc-800/40 backdrop-blur-md flex flex-col justify-center">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Issue Identifier</p>
                  <p className="text-sm font-bold opacity-60 truncate">#{issue.title}</p>
                </div>
              </div>

              {/* Experience Matrix */}
              <div className="space-y-8">
                <div className="flex flex-col items-center py-12 bg-gradient-to-b from-white/5 to-transparent rounded-[40px] border border-white/5 shadow-2xl">
                  <p className="text-xs font-black uppercase tracking-[0.2em] opacity-40 mb-8">Overall Impact</p>
                  <StarRating rating={formData.overallRating} setRating={(r) => setFormData({...formData, overallRating: r})} />
                  <motion.p 
                    key={formData.overallRating}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`text-sm font-black mt-10 uppercase tracking-widest px-8 py-2.5 rounded-full border border-white/10 ${
                      formData.overallRating <= 2 ? 'text-red-500 bg-red-500/10' : 
                      formData.overallRating === 3 ? 'text-yellow-400 bg-yellow-400/10' : 
                      'text-civic-green bg-civic-green/10'
                    }`}
                  >
                    {formData.overallRating === 5 ? 'Exceptional Hero' : formData.overallRating === 4 ? 'Great Support' : formData.overallRating === 3 ? 'Mission Complete' : formData.overallRating === 2 ? 'Sub-par Action' : 'Critical Failure'}
                  </motion.p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[
                    { label: 'Work Quality', key: 'serviceQuality', options: ['Excellent', 'Good', 'Average', 'Poor'] },
                    { label: 'Response Time', key: 'responseTime', options: ['Very Fast', 'Standard', 'Delayed'] },
                    { label: 'Professionalism', key: 'volunteerProfessionalism', options: ['Very Professional', 'Good', 'Neutral', 'Lacks Discipline'] }
                  ].map((field) => (
                    <div key={field.key} className="space-y-3">
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-4">{field.label}</label>
                      <div className="relative group/select">
                        <select 
                          className="w-full bg-white/5 border border-white/10 rounded-[24px] px-6 py-4 text-sm font-bold focus:outline-none focus:border-civic-green focus:bg-white/10 transition-all appearance-none cursor-pointer hover:border-white/20"
                          value={formData[field.key]}
                          onChange={(e) => setFormData({...formData, [field.key]: e.target.value})}
                        >
                          {field.options.map(opt => <option key={opt} className="bg-zinc-900">{opt}</option>)}
                        </select>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m6 9 6 6 6-6"/></svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Intelligence Report */}
              <div className="space-y-4">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-4">Detailed Intelligence</label>
                <textarea 
                  className="w-full bg-white/5 border border-white/10 rounded-[32px] px-8 py-6 text-sm font-medium focus:outline-none focus:border-civic-green focus:bg-white/10 transition-all h-40 placeholder:opacity-20 resize-none hover:border-white/20"
                  placeholder="Share the technical details of the mission performance..."
                  value={formData.comments}
                  onChange={(e) => setFormData({...formData, comments: e.target.value})}
                />
              </div>

              {/* Action Cluster */}
              <div className="flex flex-col sm:flex-row items-center gap-6 pt-6">
                <button 
                  type="button" 
                  onClick={() => navigate('/my-complaints')}
                  className="w-full sm:w-auto px-12 py-5 bg-zinc-800/50 hover:bg-zinc-800 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all border border-white/5 order-2 sm:order-1"
                >
                  Abort Mission
                </button>
                <motion.button 
                  type="submit" 
                  disabled={submitting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:flex-1 py-5 bg-gradient-to-r from-civic-green to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-black rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] transition-all shadow-[0_15px_30px_-10px_rgba(0,255,65,0.4)] relative group overflow-hidden order-1 sm:order-2"
                >
                  {submitting ? 'Transmitting Data...' : 'Dispatch Evaluation'}
                  {!submitting && <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />}
                </motion.button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default IssueFeedbackForm;
