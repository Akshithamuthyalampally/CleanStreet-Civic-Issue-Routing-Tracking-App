import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const BackButton = ({ className = '' }) => {
    const navigate = useNavigate();

    return (
        <motion.button
            whileHover={{ scale: 1.05, x: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group ${className}`}
        >
            <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
            <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
        </motion.button>
    );
};

export default BackButton;
