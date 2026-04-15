import { ainexusBaseURL } from '@/store/constant'

let cachedAppSettings = null
let appSettingsRequestPromise = null

const getAppSettings = async () => {
    if (cachedAppSettings) return cachedAppSettings

    if (!appSettingsRequestPromise) {
        appSettingsRequestPromise = (async () => {
            const response = await fetch(`${ainexusBaseURL}/api/app-settings`)
            if (!response.ok) return null
            const result = await response.json()
            return result?.data || null
        })()
    }

    cachedAppSettings = await appSettingsRequestPromise
    return cachedAppSettings
}

const getAppLogoUrl = async () => {
    const settings = await getAppSettings()
    const logoUrl = settings?.logoUrl
    if (!logoUrl) return ''
    return logoUrl.startsWith('http') ? logoUrl : `${ainexusBaseURL}${logoUrl}`
}

export default {
    getAppSettings,
    getAppLogoUrl
}
