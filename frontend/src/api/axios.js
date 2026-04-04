import axios from 'axios'

const api = axios.create({
    baseURL: 'http://localhost:5000/api',
})

api.interceptors.request.use((config) => {
    try {
        const token = localStorage.getItem('token')
        if (token) config.headers.Authorization = `Bearer ${token}`
    } catch (err) {
        console.warn('localStorage access blocked by browser privacy settings')
    }
    return config
})

export default api
