import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const PRESETS = [
    { label: 'Last 7 Days', days: 7 },
    { label: 'Last 30 Days', days: 30 },
    { label: 'Last 90 Days', days: 90 },
    { label: 'This Year', days: 365 },
    { label: 'All Time', days: null }
]

const DateRangePicker = ({ startDate, endDate, onChange }) => {
    const [isOpen, setIsOpen] = useState(false)

    const formatDate = (date) => {
        if (!date) return ''
        const d = new Date(date)
        return d.toISOString().split('T')[0]
    }

    const handlePresetClick = (days) => {
        if (days === null) {
            onChange({ startDate: null, endDate: null })
        } else {
            const end = new Date()
            const start = new Date()
            start.setDate(start.getDate() - days)
            onChange({
                startDate: start.toISOString().split('T')[0],
                endDate: end.toISOString().split('T')[0]
            })
        }
        setIsOpen(false)
    }

    const handleDateChange = (field, value) => {
        onChange({
            startDate: field === 'startDate' ? value : startDate,
            endDate: field === 'endDate' ? value : endDate
        })
    }

    const getDisplayText = () => {
        if (!startDate && !endDate) return 'All Time'
        if (startDate && endDate) {
            const start = new Date(startDate)
            const end = new Date(endDate)
            const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
            const preset = PRESETS.find(p => p.days === diffDays)
            if (preset) return preset.label
            return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        }
        return 'Custom Range'
    }

    return (
        <div className="relative">
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-zinc-900 rounded-2xl border border-black/5 dark:border-white/5 hover:border-civic-green/30 transition-all"
            >
                <span className="text-lg">📅</span>
                <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Date Range</p>
                    <p className="text-sm font-bold">{getDisplayText()}</p>
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
                        className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-zinc-900 rounded-3xl border border-black/5 dark:border-white/5 shadow-2xl p-4 min-w-[280px]"
                    >
                        {/* Presets */}
                        <div className="mb-4">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Quick Select</p>
                            <div className="flex flex-wrap gap-2">
                                {PRESETS.map((preset) => (
                                    <button
                                        key={preset.label}
                                        onClick={() => handlePresetClick(preset.days)}
                                        className="px-3 py-1.5 text-xs font-bold rounded-xl bg-black/5 dark:bg-white/5 hover:bg-civic-green/20 hover:text-civic-green transition-all"
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom range */}
                        <div className="border-t border-black/5 dark:border-white/5 pt-4">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Custom Range</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold opacity-40 block mb-1">Start</label>
                                    <input
                                        type="date"
                                        value={formatDate(startDate)}
                                        onChange={(e) => handleDateChange('startDate', e.target.value)}
                                        className="w-full px-3 py-2 text-sm bg-black/5 dark:bg-white/5 rounded-xl border-none focus:ring-2 focus:ring-civic-green/50 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold opacity-40 block mb-1">End</label>
                                    <input
                                        type="date"
                                        value={formatDate(endDate)}
                                        onChange={(e) => handleDateChange('endDate', e.target.value)}
                                        className="w-full px-3 py-2 text-sm bg-black/5 dark:bg-white/5 rounded-xl border-none focus:ring-2 focus:ring-civic-green/50 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-black/5 dark:border-white/5">
                            <button
                                onClick={() => {
                                    onChange({ startDate: null, endDate: null })
                                    setIsOpen(false)
                                }}
                                className="px-4 py-2 text-xs font-bold rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all"
                            >
                                Clear
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="px-4 py-2 text-xs font-bold rounded-xl bg-civic-green text-black"
                            >
                                Apply
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default DateRangePicker
