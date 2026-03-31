import { motion, AnimatePresence } from 'framer-motion'
import { useToasts } from '../context/ToastContext'

const ToastContainer = () => {
    const { toasts, removeToast } = useToasts()

    return (
        <div className="fixed top-20 right-4 z-[2000] flex flex-col gap-3 pointer-events-none">
            <AnimatePresence>
                {toasts.map((toast) => (
                    <motion.div
                        key={toast.id}
                        initial={{ opacity: 0, x: 50, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95 }}
                        className="pointer-events-auto"
                    >
                        <div className={`
                            relative min-w-[300px] max-w-md p-4 rounded-2xl border backdrop-blur-md shadow-2xl flex items-start gap-3
                            ${toast.type === 'success' || toast.type === 'feedback' ? 'bg-civic-green/10 border-civic-green/30 text-civic-green' : 
                              toast.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 
                              'bg-white/10 border-white/20 text-white'}
                        `}
                        style={{ background: 'rgba(2, 6, 23, 0.9)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-lg">
                                        {toast.type === 'success' ? '✅' : toast.type === 'error' ? '🚫' : '💬'}
                                    </span>
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                        {toast.type === 'success' ? 'Success' : toast.type === 'error' ? 'Alert' : 'New Feedback'}
                                    </span>
                                </div>
                                <p className="text-sm font-bold leading-relaxed">{toast.message}</p>
                            </div>
                            <button 
                                onClick={() => removeToast(toast.id)}
                                className="opacity-40 hover:opacity-100 transition-opacity p-1"
                            >
                                ✕
                            </button>
                            
                            {/* Animated Progress Bar */}
                            <motion.div 
                                initial={{ width: '100%' }}
                                animate={{ width: '0%' }}
                                transition={{ duration: 5, ease: 'linear' }}
                                className={`absolute bottom-0 left-0 h-1 rounded-full ${toast.type === 'success' ? 'bg-civic-green' : toast.type === 'error' ? 'bg-red-500' : 'bg-blue-400'}`}
                            />
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    )
}

export default ToastContainer
