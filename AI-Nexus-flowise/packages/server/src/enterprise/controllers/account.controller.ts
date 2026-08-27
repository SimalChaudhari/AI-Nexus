import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import logger from '../../utils/logger'
import { Organization } from '../database/entities/organization.entity'
import { User } from '../database/entities/user.entity'
import { AccountDTO, AccountService } from '../services/account.service'
import { isFlowiseTokenOnlyAuthEnabled } from '../utils/tokenOnlyAuth.util'

const tokenOnlyAuthResponse = () => ({
    message: 'This Flowise instance uses token-based login only. Open from AI Nexus/main app.',
    code: 'TOKEN_ONLY_AUTH' as const
})

/** Must not be a class method: Express calls route handlers unbound, so `this` would be undefined. */
const clearAuthCookies = (res: Response) => {
    res.clearCookie('connect.sid')
    res.clearCookie('token')
    res.clearCookie('refreshToken')
}

export class AccountController {

    public async register(req: Request, res: Response, next: NextFunction) {
        try {
            if (isFlowiseTokenOnlyAuthEnabled()) {
                return res.status(StatusCodes.GONE).json(tokenOnlyAuthResponse())
            }
            const accountService = new AccountService()
            const sanitizedBody = sanitizeRegistrationDTO(req.body)
            const data = await accountService.register(sanitizedBody)
            return res.status(StatusCodes.CREATED).json(data)
        } catch (error) {
            next(error)
        }
    }

    public async invite(req: Request, res: Response, next: NextFunction) {
        try {
            const accountService = new AccountService()
            const data = await accountService.invite(req.body, req.user)
            return res.status(StatusCodes.CREATED).json(data)
        } catch (error) {
            next(error)
        }
    }

    public async login(req: Request, res: Response, next: NextFunction) {
        try {
            if (isFlowiseTokenOnlyAuthEnabled()) {
                return res.status(StatusCodes.GONE).json(tokenOnlyAuthResponse())
            }
            const accountService = new AccountService()
            const data = await accountService.login(req.body)
            return res.status(StatusCodes.CREATED).json(data)
        } catch (error) {
            next(error)
        }
    }

    public async verify(req: Request, res: Response, next: NextFunction) {
        try {
            const accountService = new AccountService()
            const data = await accountService.verify(req.body)
            return res.status(StatusCodes.CREATED).json(data)
        } catch (error) {
            next(error)
        }
    }

    public async resendVerificationEmail(req: Request, res: Response, next: NextFunction) {
        try {
            const accountService = new AccountService()
            const data = await accountService.resendVerificationEmail(req.body)
            return res.status(StatusCodes.CREATED).json(data)
        } catch (error) {
            next(error)
        }
    }

    public async forgotPassword(req: Request, res: Response, next: NextFunction) {
        try {
            if (isFlowiseTokenOnlyAuthEnabled()) {
                return res.status(StatusCodes.GONE).json(tokenOnlyAuthResponse())
            }
            const accountService = new AccountService()
            const data = await accountService.forgotPassword(req.body)
            return res.status(StatusCodes.CREATED).json(data)
        } catch (error) {
            next(error)
        }
    }

    public async resetPassword(req: Request, res: Response, next: NextFunction) {
        try {
            if (isFlowiseTokenOnlyAuthEnabled()) {
                return res.status(StatusCodes.GONE).json(tokenOnlyAuthResponse())
            }
            const accountService = new AccountService()
            const data = await accountService.resetPassword(req.body)
            return res.status(StatusCodes.OK).json(data)
        } catch (error) {
            next(error)
        }
    }

    public async createStripeCustomerPortalSession(req: Request, res: Response, next: NextFunction) {
        try {
            const { url: portalSessionUrl } = await getRunningExpressApp().identityManager.createStripeCustomerPortalSession(req)
            return res.status(StatusCodes.OK).json({ url: portalSessionUrl })
        } catch (error) {
            next(error)
        }
    }

    public async logout(req: Request, res: Response, next: NextFunction) {
        try {
            if (req.user) {
                const accountService = new AccountService()
                await accountService.logout(req.user)
            }

            // Passport 0.7+ runs session.save + regenerate inside req.logout; store/DB errors must not return 500
            // or the client never receives cleared auth cookies.
            if (typeof req.isAuthenticated === 'function' && req.isAuthenticated()) {
                try {
                    await new Promise<void>((resolve, reject) => {
                        req.logout((err) => {
                            if (err) return reject(err)
                            return resolve()
                        })
                    })
                } catch (err) {
                    logger.warn(
                        `account.logout: req.logout failed (continuing): ${err instanceof Error ? err.message : String(err)}`
                    )
                }
            }

            if (req.session) {
                try {
                    await new Promise<void>((resolve, reject) => {
                        req.session.destroy((err) => {
                            if (err) return reject(err)
                            return resolve()
                        })
                    })
                } catch (err) {
                    logger.warn(
                        `account.logout: session.destroy failed (continuing): ${err instanceof Error ? err.message : String(err)}`
                    )
                }
            }

            clearAuthCookies(res)
            const redirectPath = '/signin'
            return res.status(200).json({ message: 'logged_out', redirectTo: redirectPath })
        } catch (error) {
            next(error)
        }
    }

    public async getBasicAuth(req: Request, res: Response) {
        if (process.env.FLOWISE_USERNAME && process.env.FLOWISE_PASSWORD) {
            return res.status(StatusCodes.OK).json({
                isUsernamePasswordSet: true
            })
        } else {
            return res.status(StatusCodes.OK).json({
                isUsernamePasswordSet: false
            })
        }
    }

    public async checkBasicAuth(req: Request, res: Response) {
        if (isFlowiseTokenOnlyAuthEnabled()) {
            return res.status(StatusCodes.GONE).json(tokenOnlyAuthResponse())
        }
        const { username, password } = req.body
        if (username === process.env.FLOWISE_USERNAME && password === process.env.FLOWISE_PASSWORD) {
            return res.json({ message: 'Authentication successful' })
        } else {
            return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Authentication failed' })
        }
    }
}

function sanitizeRegistrationDTO(data: AccountDTO): AccountDTO {
    const sanitized: AccountDTO = {
        user: {},
        organization: {},
        organizationUser: {},
        workspace: {},
        workspaceUser: {},
        role: {}
    }

    // Strict allowlist: only fields a client may supply during registration.
    // Never accept server-managed fields: id, createdBy, updatedBy, createdDate, updatedDate, status, tokenExpiry.
    const allowedUserFields: (keyof User)[] = ['name', 'email', 'credential', 'tempToken']
    if (data.user && typeof data.user === 'object' && !Array.isArray(data.user)) {
        for (const field of allowedUserFields) {
            const value = data.user[field]
            if (value != null) {
                sanitized.user[field] = value as any
            }
        }
        if (data.user.referral != null) {
            sanitized.user.referral = data.user.referral
        }
    }

    // Allow organization.name for Enterprise owner registration (the only path that doesn't hardcode it).
    const allowedOrgFields: (keyof Organization)[] = ['name']
    if (data.organization && typeof data.organization === 'object' && !Array.isArray(data.organization)) {
        for (const field of allowedOrgFields) {
            const value = data.organization[field]
            if (value != null) {
                sanitized.organization[field] = value as any
            }
        }
    }

    return sanitized
}
