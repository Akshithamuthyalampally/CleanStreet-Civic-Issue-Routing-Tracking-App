import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useReviews } from '../context/ReviewContext';

const getRatingColor = (rating) => {
  if (rating <= 2) return 'text-red-500';
  if (rating === 3) return 'text-yellow-400';
  return 'text-civic-green';
};

const getRatingGlow = (rating) => {
  if (rating <= 2) return 'drop-shadow(0 0 8px rgba(239,68,68,0.4))';
  if (rating === 3) return 'drop-shadow(0 0 8px rgba(250,204,21,0.4))';
  return 'drop-shadow(0 0 8px rgba(0,255,65,0.4))';
};

const StarIcon = ({ filled, rating }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={`w-5 h-5 ${filled ? getRatingColor(rating) : 'text-zinc-700'} fill-current`}
    style={{ filter: filled ? getRatingGlow(rating) : 'none' }}
  >
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const RatingStars = ({ rating }) => {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <StarIcon key={star} filled={star <= rating} rating={rating} />
      ))}
    </div>
  );
};

const VolunteerRatings = () => {
  const { 
    volunteerReviews, 
    volunteerStats, 
    volunteerLoading, 
    fetchVolunteerReviews, 
    fetchVolunteerStats,
    markVolunteerReviewsRead 
  } = useReviews();

  useEffect(() => {
    fetchVolunteerReviews();
    fetchVolunteerStats();
    markVolunteerReviewsRead();
  }, [fetchVolunteerReviews, fetchVolunteerStats, markVolunteerReviewsRead]);

  const stats = volunteerStats || { totalFeedback: 0, averageRating: 0, breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };

  return (
    <div className="main-container min-h-screen pb-20 max-w-7xl mx-auto px-4 pt-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <h1 className="text-4xl font-black tracking-tight text-white">
          Mission <span className="text-civic-green">Intelligence</span>
        </h1>
        <p className="opacity-60 text-lg mt-2 font-medium">Performance analytics and citizen evaluations.</p>
      </motion.div>

      {volunteerLoading && !volunteerReviews.length ? (
        <div className="flex flex-col items-center justify-center py-40">
          <div className="w-16 h-16 border-4 border-civic-green border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(0,255,65,0.4)]"></div>
          <p className="opacity-60 mt-6 font-black uppercase tracking-widest text-sm animate-pulse">Synchronizing performance data...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stats Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-zinc-900/50 border border-white/5 rounded-[40px] p-10 backdrop-blur-2xl relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-civic-green/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="text-center mb-10 relative">
                <div className={`text-7xl font-black mb-4 ${getRatingColor(Math.round(stats.averageRating))}`} style={{ filter: getRatingGlow(Math.round(stats.averageRating)) }}>
                  {stats.averageRating}
                </div>
                <div className="flex justify-center mb-4 scale-125">
                  <RatingStars rating={Math.round(stats.averageRating)} />
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 mt-6">
                  Composite Performance Index
                </div>
                <div className="text-[10px] font-black text-white/40 mt-1 uppercase tracking-widest">
                  ({stats.totalFeedback} Operations Evaluated)
                </div>
              </div>

              <div className="space-y-5 relative">
                {[5, 4, 3, 2, 1].map(star => {
                  const count = stats.breakdown[star] || 0;
                  const percentage = stats.totalFeedback > 0 ? (count / stats.totalFeedback) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-5">
                      <div className="text-[11px] font-black w-6 opacity-40">{star}★</div>
                      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          className={`h-full ${getRatingColor(star).replace('text-', 'bg-')} shadow-[0_0_10px_rgba(0,255,65,0.3)] transition-all duration-1000`}
                        />
                      </div>
                      <div className="text-[10px] font-bold opacity-30 w-8 text-right">{count}</div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-civic-green/5 border border-civic-green/10 rounded-[30px] p-8 shadow-inner"
            >
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-civic-green mb-4">Tactical Insight</h3>
              <p className="text-sm opacity-60 leading-relaxed italic font-medium">
                "Citizen trust is built on reliability. Keep your response window under 24 hours to maintain a high-tier reputation."
              </p>
            </motion.div>
          </div>

          {/* Feedback List */}
          <div className="lg:col-span-2 space-y-6">
            {volunteerReviews.length === 0 ? (
              <div className="bg-zinc-900/30 border-2 border-dashed border-white/5 rounded-[40px] py-32 text-center opacity-30">
                <div className="text-7xl mb-6">📡</div>
                <h3 className="text-xl font-black uppercase tracking-tighter">Awaiting Initial Feedback</h3>
                <p className="mt-3 text-sm font-medium">Performance logs will be populated once citizens evaluate your missions.</p>
              </div>
            ) : (
              volunteerReviews.map((review, idx) => (
                <motion.div
                  key={review._id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-zinc-900/50 border border-white/5 rounded-[40px] p-8 hover:border-civic-green/20 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-civic-green/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="flex justify-between items-start mb-8 relative">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-3xl bg-white/5 flex items-center justify-center text-md font-black border border-white/10 group-hover:border-civic-green/30 transition-colors">
                        {review.citizenName?.split(' ').map(n => n[0]).join('') || 'U'}
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-white group-hover:text-civic-green transition-colors">{review.citizenName}</h4>
                        <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em] mt-1">Citizen Auth: {review.citizenId}</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest mb-3 flex items-center gap-2 border border-white/5 shadow-2xl ${getRatingColor(review.overallRating).replace('text-', 'bg-').replace('500', '500/10').replace('400', '400/10').replace('civic-green', 'civic-green/10')} ${getRatingColor(review.overallRating)}`}>
                        <span className="text-xs group-hover:rotate-12 transition-transform">⭐</span>
                        {review.overallRating}.0
                      </div>
                      <p className="text-[10px] font-black opacity-20 uppercase tracking-tighter">
                        {new Date(review.createdAt).toLocaleDateString()} • {new Date(review.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 relative">
                    {[
                      { label: 'Quality', val: review.serviceQuality },
                      { label: 'Latency', val: review.responseTime },
                      { label: 'Discipline', val: review.volunteerProfessionalism }
                    ].map(m => (
                      <div key={m.label} className="bg-white/5 p-4 rounded-[24px] border border-white/5 group-hover:bg-white/[0.07] transition-colors">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-30 mb-2">{m.label}</p>
                        <p className="text-xs font-bold text-white/80">{m.val}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-zinc-800/40 p-6 rounded-[32px] border border-white/5 mb-6 group-hover:bg-zinc-800/60 transition-colors relative">
                    <p className="text-[13px] opacity-70 leading-relaxed italic font-medium">"{review.comments}"</p>
                  </div>

                  {review.issueId && (
                    <div className="flex items-center justify-between pt-4 border-t border-white/5 relative">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-civic-green/10 flex items-center justify-center text-civic-green border border-civic-green/20">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.7 8.38 8.38 0 0 1 3.8.9L21 3z"/></svg>
                        </div>
                        <div className="text-[10px] font-black flex items-center gap-2">
                          <span className="opacity-30 uppercase">Mission:</span>
                          <span className="text-white group-hover:text-civic-green transition-colors">{review.issueId.title}</span>
                        </div>
                      </div>
                      <div className="text-[10px] font-black uppercase text-civic-green/40 tracking-widest">
                        {review.issueId.category}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VolunteerRatings;
