/** Token-only mode for embedded login from AI Nexus/main app JWT. */
export const isFlowiseTokenOnlyAuthEnabled = (): boolean => process.env.FLOWISE_TOKEN_ONLY_AUTH === 'true'

