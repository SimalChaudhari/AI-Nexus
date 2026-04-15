import { Stack, Typography } from '@mui/material'
import MainCard from '@/ui-component/cards/MainCard'
import { useEffect, useRef } from 'react'

const mainAppUrl = (import.meta.env.VITE_AINEXUS_APP_URL || 'http://localhost:3000').trim().replace(/\/$/, '')

const ExternalAuthWait = () => {
    const redirected = useRef(false)

    useEffect(() => {
        if (!mainAppUrl || redirected.current) return
        redirected.current = true
        window.location.replace(`${mainAppUrl}/flowise-bridge`)
    }, [])

    return (
        <MainCard maxWidth='md'>
            <Stack spacing={2} sx={{ p: 2 }}>
                <Typography variant='h2'>Sign in from your app</Typography>
                <Typography variant='body1' color='text.secondary'>
                    This Flowise server is in token-only mode. Sign-in and register pages are disabled.
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                    Redirecting to AI Nexus to complete token login...
                </Typography>
            </Stack>
        </MainCard>
    )
}

export default ExternalAuthWait

