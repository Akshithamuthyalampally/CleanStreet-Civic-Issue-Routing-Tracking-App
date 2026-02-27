import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const PrivateRoute = ({ children }) => {
    const { user } = useAuth()
    const token = localStorage.getItem('token')
    if (!token || !user) return <Navigate to="/login" replace />
    return children
}

export default PrivateRoute
