import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { store } from '@/store'
import { loginSuccess } from '@/store/reducers/authSlice'
import authApi from '@/api/auth'

const SSOSuccess = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const processedRef = useRef(false)

    useEffect(() => {
        if (processedRef.current) return
        processedRef.current = true

        const run = async () => {
            const queryParams = new URLSearchParams(location.search)
            const token = queryParams.get('token')

            try {
                if (token) {
                    const ssoRes = await authApi.ssoSuccess(token)
                    if (ssoRes?.status === 200 && ssoRes?.data) {
                        store.dispatch(loginSuccess(ssoRes.data))
                        navigate('/')
                        return
                    }
                }

                // Fallback: if one-time sso token was already consumed/expired, use cookie session.
                // IMPORTANT: token in this URL is a one-time SSO cache key (uuid), not AI Nexus JWT.
                const sessionRes = await authApi.sessionUser()
                if (sessionRes?.status === 200 && sessionRes?.data) {
                    store.dispatch(loginSuccess(sessionRes.data))
                    navigate('/')
                    return
                }
                navigate('/signin')
            } catch (error) {
                navigate('/signin')
            }
        }
        run()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search])

    return (
        <div>
            <h1>Loading dashboard...</h1>
            <p>Loading data...</p>
        </div>
    )
}

export default SSOSuccess
