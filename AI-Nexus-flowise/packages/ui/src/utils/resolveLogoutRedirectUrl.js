import { ainexusFrontendURL, ainexusPostFlowiseLogoutPath } from '@/store/constant'

/**
 * Where to send the browser after Flowise POST /account/logout succeeds.
 * If VITE_AINEXUS_FRONTEND_URL is set, go to AI Nexus (GuestGuard → /home when still logged in there).
 * Otherwise keep standalone Flowise behaviour (server redirectTo, usually /signin).
 */
export function resolveLogoutRedirectUrl(serverRedirectTo) {
    const base = ainexusFrontendURL
    if (base) {
        const path = ainexusPostFlowiseLogoutPath.startsWith('/') ? ainexusPostFlowiseLogoutPath : `/${ainexusPostFlowiseLogoutPath}`
        return `${base.replace(/\/$/, '')}${path}`
    }
    if (serverRedirectTo?.startsWith('http://') || serverRedirectTo?.startsWith('https://')) {
        return serverRedirectTo
    }
    if (serverRedirectTo?.startsWith('/')) {
        return `${window.location.origin}${serverRedirectTo}`
    }
    return `${window.location.origin}/signin`
}
