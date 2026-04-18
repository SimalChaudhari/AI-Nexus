/**
 * Navigate the AI Nexus app (full URL). When Flowise runs inside an iframe under a
 * different origin (e.g. :3001 vs :443), window.top is not writable — notify parent via postMessage.
 */
export const MSG_AINEXUS_NAVIGATE = 'AINEXUS_NAVIGATE'

export function navigateAiNexusFromFlowise(absoluteUrl) {
    const url = String(absoluteUrl || '').trim()
    if (!url) return

    if (window.top === window.self) {
        window.location.replace(url)
        return
    }

    try {
        if (window.top) {
            window.top.location.replace(url)
            return
        }
    } catch {
        // cross-origin top
    }

    try {
        window.parent?.postMessage({ type: MSG_AINEXUS_NAVIGATE, url }, '*')
    } catch {
        window.location.replace(url)
    }
}
