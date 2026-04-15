import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline, StyledEngineProvider } from '@mui/material'

// routing
import Routes from '@/routes'

// defaultTheme
import themes from '@/themes'

// project imports
import NavigationScroll from '@/layout/NavigationScroll'
import authApi from '@/api/auth'
import { loginSuccess, logoutSuccess } from '@/store/reducers/authSlice'

// ==============================|| APP ||============================== //

const App = () => {
    const customization = useSelector((state) => state.customization)
    const dispatch = useDispatch()
    const currentUser = useSelector((state) => state.auth.user)
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)

    useEffect(() => {
        let cancelled = false

        const syncSessionUser = async () => {
            try {
                const res = await authApi.sessionUser()
                if (cancelled) return

                if (res?.status === 200 && res?.data) {
                    const serverUser = res.data
                    const shouldUpdate =
                        !isAuthenticated ||
                        !currentUser ||
                        currentUser.id !== serverUser.id ||
                        currentUser.activeWorkspaceId !== serverUser.activeWorkspaceId

                    if (shouldUpdate) {
                        dispatch(loginSuccess(serverUser))
                    }
                    return
                }
            } catch {
                // If local auth state exists but Flowise cookies are gone/invalid, clear stale local state.
            }

            if (!cancelled && isAuthenticated) {
                dispatch(logoutSuccess())
            }
        }

        syncSessionUser()
        return () => {
            cancelled = true
        }
    }, [dispatch])

    return (
        <StyledEngineProvider injectFirst>
            <ThemeProvider theme={themes(customization)}>
                <CssBaseline />
                <NavigationScroll>
                    <Routes />
                </NavigationScroll>
            </ThemeProvider>
        </StyledEngineProvider>
    )
}

export default App
