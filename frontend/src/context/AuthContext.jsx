import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const stored = localStorage.getItem('user')
            return stored ? JSON.parse(stored) : null
        } catch {
            return null
        }
    })

    const login = useCallback((token, userData) => {
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(userData))
        setUser(userData)
    }, [])

    const logout = useCallback(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
    }, [])

    const updateUser = useCallback((userData) => {
        localStorage.setItem('user', JSON.stringify(userData))
        setUser(userData)
    }, [])

    return (
        <AuthContext.Provider value={{ user, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
