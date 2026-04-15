import client from './client'

// auth
const resolveLogin = (body) => client.post(`/auth/resolve`, body)
const login = (body) => client.post(`/auth/login`, body)

// permissions
const getAllPermissions = (type) => client.get(`/auth/permissions/${type}`)
const internalHeaders = { headers: { 'x-request-from': 'internal' } }
const ssoSuccess = (token) => client.get(`/auth/sso-success?token=${token}`, internalHeaders)
let sessionUserInFlight = null
const sessionUser = (token) => {
    // In dev StrictMode, effects can run twice; dedupe no-token session checks.
    if (token) return client.get(`/auth/session-user?token=${token}`, internalHeaders)
    if (sessionUserInFlight) return sessionUserInFlight
    sessionUserInFlight = client.get(`/auth/session-user`, internalHeaders).finally(() => {
        sessionUserInFlight = null
    })
    return sessionUserInFlight
}

export default {
    resolveLogin,
    login,
    getAllPermissions,
    ssoSuccess,
    sessionUser
}
