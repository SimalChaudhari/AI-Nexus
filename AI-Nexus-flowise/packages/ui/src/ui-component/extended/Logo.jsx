import logo from '@/assets/images/flowise_white.svg'
import logoDark from '@/assets/images/flowise_dark.svg'
import appSettingsApi from '@/api/appsettings'
import { useEffect, useState } from 'react'

import { useSelector } from 'react-redux'

// ==============================|| LOGO ||============================== //

const Logo = () => {
    const customization = useSelector((state) => state.customization)
    const [remoteLogoUrl, setRemoteLogoUrl] = useState('')

    useEffect(() => {
        const loadLogo = async () => {
            try {
                const fullLogoUrl = await appSettingsApi.getAppLogoUrl()
                if (fullLogoUrl) setRemoteLogoUrl(fullLogoUrl)
            } catch (error) {
                // Keep default Flowise logos when API is unavailable.
            }
        }

        loadLogo()
    }, [])

    const fallbackLogo = customization.isDarkMode ? logoDark : logo

    return (
        <div style={{ alignItems: 'center', display: 'flex', flexDirection: 'row', marginLeft: '10px' }}>
            <img style={{ objectFit: 'contain', height: 'auto', width: 100 }} src={remoteLogoUrl || fallbackLogo} alt='Flowise' />
        </div>
    )
}

export default Logo
