import client from './client'

let settingsInFlight = null
let cachedSettingsResponse = null

const getSettings = () => {
    if (cachedSettingsResponse) return Promise.resolve(cachedSettingsResponse)
    if (settingsInFlight) return settingsInFlight
    settingsInFlight = client.get('/settings').then((response) => {
        cachedSettingsResponse = response
        return response
    }).finally(() => {
        settingsInFlight = null
    })
    return settingsInFlight
}

export default {
    getSettings
}
