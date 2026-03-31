import { useState, useEffect, useCallback, useRef } from 'react'

const usePolling = (fetchFn, options = {}) => {
    const {
        interval = 30000, // 30 seconds default
        enabled = true,
        onSuccess,
        onError,
        retryOnError = true,
        maxRetries = 3
    } = options

    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [lastUpdated, setLastUpdated] = useState(null)
    const [retryCount, setRetryCount] = useState(0)

    const timerRef = useRef(null)
    const mountedRef = useRef(true)

    const fetchData = useCallback(async () => {
        if (!mountedRef.current) return

        try {
            setLoading(true)
            const result = await fetchFn()

            if (!mountedRef.current) return

            setData(result)
            setLastUpdated(new Date())
            setError(null)
            setRetryCount(0)

            if (onSuccess) {
                onSuccess(result)
            }
        } catch (err) {
            if (!mountedRef.current) return

            console.error('Polling error:', err)
            setError(err)

            if (onError) {
                onError(err)
            }

            // Handle retry logic
            if (retryOnError && retryCount < maxRetries) {
                setRetryCount(prev => prev + 1)
            }
        } finally {
            if (mountedRef.current) {
                setLoading(false)
            }
        }
    }, [fetchFn, onSuccess, onError, retryOnError, maxRetries, retryCount])

    // Initial fetch and polling setup
    useEffect(() => {
        mountedRef.current = true

        if (enabled) {
            // Initial fetch
            fetchData()

            // Set up polling
            timerRef.current = setInterval(fetchData, interval)
        }

        return () => {
            mountedRef.current = false
            if (timerRef.current) {
                clearInterval(timerRef.current)
            }
        }
    }, [enabled, interval]) // Don't include fetchData to avoid infinite loop

    // Manual refresh function
    const refresh = useCallback(() => {
        fetchData()
    }, [fetchData])

    // Pause polling
    const pause = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }
    }, [])

    // Resume polling
    const resume = useCallback(() => {
        if (!timerRef.current && enabled) {
            timerRef.current = setInterval(fetchData, interval)
        }
    }, [enabled, interval, fetchData])

    return {
        data,
        loading,
        error,
        lastUpdated,
        refresh,
        pause,
        resume,
        retryCount
    }
}

export default usePolling
