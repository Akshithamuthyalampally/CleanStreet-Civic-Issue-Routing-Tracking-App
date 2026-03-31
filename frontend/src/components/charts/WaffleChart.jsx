import { motion } from 'framer-motion'
import { useState } from 'react'

const ROLE_CONFIG = {
    citizen: { color: '#00ff41', icon: '👤', label: 'Citizens' },
    volunteer: { color: '#3b82f6', icon: '🦸', label: 'Volunteers' },
    admin: { color: '#a855f7', icon: '👑', label: 'Admins' },
    user: { color: '#00ff41', icon: '👤', label: 'Users' } // Legacy support
}

const WaffleChart = ({ data, height = 350, gridSize = 10 }) => {
    const [hoveredRole, setHoveredRole] = useState(null)

    // Transform data from API format [{ _id: 'citizen', count: 120 }]
    const processedData = data && data.length > 0
        ? data.map(item => ({
            name: item._id || item.name,
            value: item.count || item.value || 0,
            ...ROLE_CONFIG[item._id || item.name] || ROLE_CONFIG.citizen
        }))
        : []

    const total = processedData.reduce((sum, item) => sum + item.value, 0) || 1
    const totalCells = gridSize * gridSize

    // Calculate cells per role proportionally
    let cellsAssigned = 0
    const rolesCells = processedData.map((role, index) => {
        const proportion = role.value / total
        let cells = Math.round(proportion * totalCells)
        // Ensure at least 1 cell for non-zero values
        if (role.value > 0 && cells === 0) cells = 1
        cellsAssigned += cells
        return { ...role, cells }
    })

    // Adjust last role to fill remaining cells
    if (rolesCells.length > 0) {
        const diff = totalCells - cellsAssigned
        rolesCells[rolesCells.length - 1].cells += diff
    }

    // Generate grid cells with role assignments
    const gridCells = []
    let currentRoleIndex = 0
    let cellsInCurrentRole = 0

    for (let i = 0; i < totalCells; i++) {
        if (currentRoleIndex < rolesCells.length) {
            const currentRole = rolesCells[currentRoleIndex]
            gridCells.push({
                index: i,
                role: currentRole.name,
                color: currentRole.color,
                icon: currentRole.icon
            })
            cellsInCurrentRole++

            if (cellsInCurrentRole >= currentRole.cells) {
                currentRoleIndex++
                cellsInCurrentRole = 0
            }
        } else {
            // Fallback for empty cells
            gridCells.push({ index: i, role: null, color: '#333', icon: '' })
        }
    }

    const cellSize = Math.min((height - 120) / gridSize, 32)

    return (
        <div className="w-full flex flex-col items-center" style={{ height }}>
            {/* Waffle Grid */}
            <div
                className="grid gap-1 p-4 rounded-3xl bg-black/5 dark:bg-white/5"
                style={{
                    gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
                    gridTemplateRows: `repeat(${gridSize}, ${cellSize}px)`
                }}
            >
                {gridCells.map((cell, index) => {
                    const row = Math.floor(index / gridSize)
                    const col = index % gridSize
                    const isHovered = hoveredRole === cell.role

                    return (
                        <motion.div
                            key={index}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{
                                scale: 1,
                                opacity: isHovered || !hoveredRole ? 1 : 0.3
                            }}
                            transition={{
                                delay: (row + col) * 0.02,
                                duration: 0.3
                            }}
                            whileHover={{ scale: 1.15, zIndex: 10 }}
                            onMouseEnter={() => setHoveredRole(cell.role)}
                            onMouseLeave={() => setHoveredRole(null)}
                            className="flex items-center justify-center rounded-lg cursor-pointer transition-all"
                            style={{
                                width: cellSize,
                                height: cellSize,
                                backgroundColor: `${cell.color}20`,
                                border: `2px solid ${cell.color}40`,
                                boxShadow: isHovered ? `0 0 15px ${cell.color}60` : 'none'
                            }}
                        >
                            {/* Person icon SVG */}
                            <svg
                                viewBox="0 0 24 24"
                                fill={cell.color}
                                className="w-3/4 h-3/4"
                                style={{ opacity: isHovered || !hoveredRole ? 1 : 0.5 }}
                            >
                                <circle cx="12" cy="7" r="4" />
                                <path d="M12 14c-5 0-8 2.5-8 5v2h16v-2c0-2.5-3-5-8-5z" />
                            </svg>
                        </motion.div>
                    )
                })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-6 mt-6">
                {rolesCells.map((role) => {
                    const percentage = ((role.value / total) * 100).toFixed(1)
                    const isHovered = hoveredRole === role.name

                    return (
                        <motion.div
                            key={role.name}
                            animate={{
                                scale: isHovered ? 1.05 : 1,
                                opacity: isHovered || !hoveredRole ? 1 : 0.5
                            }}
                            onMouseEnter={() => setHoveredRole(role.name)}
                            onMouseLeave={() => setHoveredRole(null)}
                            className="flex items-center gap-3 px-4 py-2 rounded-2xl cursor-pointer transition-all"
                            style={{
                                backgroundColor: `${role.color}10`,
                                border: `2px solid ${role.color}30`,
                                boxShadow: isHovered ? `0 0 20px ${role.color}30` : 'none'
                            }}
                        >
                            <span className="text-lg">{role.icon}</span>
                            <div className="flex flex-col">
                                <span
                                    className="text-[10px] font-black uppercase tracking-widest"
                                    style={{ color: role.color }}
                                >
                                    {role.label || role.name}
                                </span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-lg font-black">{role.value}</span>
                                    <span className="text-[10px] opacity-40">({percentage}%)</span>
                                </div>
                            </div>
                        </motion.div>
                    )
                })}
            </div>

            {/* Total */}
            <div className="mt-4 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Total Users</p>
                <p className="text-2xl font-black text-civic-green">{total}</p>
            </div>
        </div>
    )
}

export default WaffleChart
