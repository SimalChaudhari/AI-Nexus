import client from './client'

// auth
const resolveLogin = (body) => client.post(`/auth/resolve`, body)
const login = (body) => client.post(`/auth/login`, body)

// permissions
const getAllPermissions = (type) => client.get(`/auth/permissions/${type}`)
const internalHeaders = { headers: { 'x-request-from': 'internal' } }
const ssoSuccess = (token) => client.get(`/auth/sso-success?token=${token}`, internalHeaders)
const sessionUser = (token) =>
    token ? client.get(`/auth/session-user?token=${token}`, internalHeaders) : client.get(`/auth/session-user`, internalHeaders)

export default {
    resolveLogin,
    login,
    getAllPermissions,
    ssoSuccess,
    sessionUser
}
