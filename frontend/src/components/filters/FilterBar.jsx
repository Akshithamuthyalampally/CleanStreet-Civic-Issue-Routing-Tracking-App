import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DateRangePicker from './DateRangePicker'

const CATEGORIES = [
    'Road Damage',
    'Garbage',
    'Water Supply',
    'Electricity',
    'Sewage',
    'Street Light',
    'Park',
    'Other'
]

const URGENCY_LEVELS = ['Low', 'Medium', 'High']

const SelectDropdown = ({ label, icon, options, value, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <div className="relative">
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-zinc-900 rounded-2xl border border-black/5 dark:border-white/5 hover:border-civic-green/30 transition-all"
            >
                <span className="text-lg">{icon}</span>
                <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{label}</p>
                    <p className="text-sm font-bold">{value || placeholder}</p>
                </div>
                <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    className="text-xs opacity-40"
                >
                    ▼
                </motion.span>
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-zinc-900 rounded-2xl border border-black/5 dark:border-white/5 shadow-2xl p-2 min-w-[180px]"
                    >
                        <button
                            onClick={() => {
                                onChange('')
                                setIsOpen(false)
                            }}
                            className="w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-civic-green/10 hover:text-civic-green transition-all opacity-50"
                        >
                            {placeholder}
                        </button>
                        {options.map((option) => (
                            <button
                                key={option}
                                onClick={() => {
                                    onChange(option)
                                    setIsOpen(false)
                                }}
                                className={`w-full text-left px-3 py-2 text-sm rounded-xl transition-all ${
                                    value === option
                                        ? 'bg-civic-green/20 text-civic-green font-bold'
                                        : 'hover:bg-black/5 dark:hover:bg-white/5'
                                }`}
                            >
                                {option}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

const FilterBar = ({ filters, onChange, onReset, lastUpdated }) => {
    const handleFilterChange = (key, value) => {
        onChange({ ...filters, [key]: value })
    }

    const handleDateChange = ({ startDate, endDate }) => {
        onChange({ ...filters, startDate, endDate })
    }

    const activeFiltersCount = Object.values(filters).filter(v => v && v !== '').length

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-[32px] p-6 border border-black/5 dark:border-white/5"
        >
            <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Filter controls */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Date Range */}
                    <DateRangePicker
                        startDate={filters.startDate}
                        endDate={filters.endDate}
                        onChange={handleDateChange}
                    />

                    {/* Category */}
                    <SelectDropdown
                        label="Category"
                        icon="🏷️"
                        options={CATEGORIES}
                        value={filters.category}
                        onChange={(v) => handleFilterChange('category', v)}
                        placeholder="All Categories"
                    />

                    {/* Urgency */}
                    <SelectDropdown
                        label="Urgency"
                        icon="🔥"
                        options={URGENCY_LEVELS}
                        value={filters.urgency}
                        onChange={(v) => handleFilterChange('urgency', v)}
                        placeholder="All Urgencies"
                    />

                    {/* Location Search */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-zinc-900 rounded-2xl border border-black/5 dark:border-white/5">
                        <span className="text-lg">📍</span>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Location</p>
                            <input
                                type="text"
                                value={filters.location || ''}
                                onChange={(e) => handleFilterChange('location', e.target.value)}
                                placeholder="Search location..."
                                className="bg-transparent text-sm font-bold outline-none w-32"
                            />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4">
                    {/* Active filters badge */}
                    {activeFiltersCount > 0 && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-civic-green/10 rounded-xl"
                        >
                            <span className="text-civic-green font-black text-sm">{activeFiltersCount}</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Active</span>
                        </motion.div>
                    )}

                    {/* Reset button */}
                    {activeFiltersCount > 0 && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onReset}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-all"
                        >
                            <span>🗑️</span>
                            <span className="text-xs font-bold uppercase tracking-widest">Clear</span>
                        </motion.button>
                    )}

                    {/* Last updated */}
                    {lastUpdated && (
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-40">
                            <span className="w-2 h-2 rounded-full bg-civic-green animate-pulse" />
                            Updated {new Date(lastUpdated).toLocaleTimeString()}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    )
}

export default FilterBar
