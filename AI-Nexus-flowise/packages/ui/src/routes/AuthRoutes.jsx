import { lazy, useEffect } from 'react'
import { Navigate } from 'react-router-dom'

import Loadable from '@/ui-component/loading/Loadable'
import AuthLayout from '@/layout/AuthLayout'

import { navigateAiNexusFromFlowise } from '@/utils/ainexusParentNavigate'

const UnauthorizedPage = Loadable(lazy(() => import('@/views/auth/unauthorized')))
const RateLimitedPage = Loadable(lazy(() => import('@/views/auth/rateLimited')))
const OrganizationSetupPage = Loadable(lazy(() => import('@/views/organization/index')))
const LicenseExpiredPage = Loadable(lazy(() => import('@/views/auth/expired')))

const ainexusAppUrl = (import.meta.env.VITE_AINEXUS_APP_URL || 'http://localhost:3000').trim().replace(/\/$/, '')

const RedirectToAiNexusBridge = () => {
    useEffect(() => {
        navigateAiNexusFromFlowise(`${ainexusAppUrl}/flowise-bridge`)
    }, [])
    return null
}

const AuthRoutes = {
    path: '/',
    element: <AuthLayout />,
    children: [
        {
            path: '/login',
            element: <Navigate to='/signin' replace />
        },
        {
            path: '/external-auth-wait',
            element: <Navigate to='/signin' replace />
        },
        {
            path: '/signin',
            element: <RedirectToAiNexusBridge />
        },
        {
            path: '/register',
            element: <RedirectToAiNexusBridge />
        },
        {
            path: '/verify',
            element: <RedirectToAiNexusBridge />
        },
        {
            path: '/forgot-password',
            element: <RedirectToAiNexusBridge />
        },
        {
            path: '/reset-password',
            element: <RedirectToAiNexusBridge />
        },
        {
            path: '/unauthorized',
            element: <UnauthorizedPage />
        },
        {
            path: '/rate-limited',
            element: <RateLimitedPage />
        },
        {
            path: '/organization-setup',
            element: <OrganizationSetupPage />
        },
        {
            path: '/license-expired',
            element: <LicenseExpiredPage />
        }
    ]
}

export default AuthRoutes
