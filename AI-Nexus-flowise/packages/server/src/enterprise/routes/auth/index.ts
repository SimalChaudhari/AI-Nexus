import express from 'express'
import authController from '../../controllers/auth'
const router = express.Router()

// AI Nexus (and compatible apps): JWT must be registered before /:type
router.get(['/external-login'], authController.externalLogin)
router.get(['/session-user'], authController.sessionUser)

// RBAC
router.get(['/sso-success'], authController.ssoSuccess)

router.get(['/:type', '/permissions/:type'], authController.getAllPermissions)

export default router
