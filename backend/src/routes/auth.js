import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { query } from '../db.js'
import { requireAdmin } from '../middleware/auth.js'
import { safeError } from '../lib/security.js'

const router = Router()
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, message: 'Too many sign-in attempts. Try again later.' } })
const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 8 * 60 * 60 * 1000 })

router.post('/login', loginLimit, async (req, res, next) => {
  try {
    const parsed = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(200) }).safeParse(req.body)
    if (!parsed.success) return safeError(res, 400, 'Enter a valid email and password')
    const result = await query('SELECT id,email,full_name,role,password_hash,active,must_change_password FROM admin_users WHERE lower(email)=lower($1)', [parsed.data.email])
    const admin = result.rows[0]
    if (!admin || !admin.active || !(await bcrypt.compare(parsed.data.password, admin.password_hash))) return safeError(res, 401, 'Email or password is incorrect')
    const token = jwt.sign({ sub: admin.id, role: admin.role }, process.env.JWT_SECRET, { expiresIn: '8h', issuer: 'ruthikisha-api', audience: 'ruthikisha-admin' })
    res.cookie('rt_admin', token, cookieOptions())
    await query('INSERT INTO audit_logs(admin_id,action,entity,entity_id,ip_address) VALUES($1,$2,$3,$4,$5)', [admin.id, 'ADMIN_LOGIN', 'admin_users', admin.id, req.ip])
    return res.json({ success: true, admin: { id: admin.id, email: admin.email, fullName: admin.full_name, role: admin.role, mustChangePassword: admin.must_change_password } })
  } catch (error) { return next(error) }
})
router.post('/logout', (_req, res) => res.clearCookie('rt_admin', { ...cookieOptions(), maxAge: undefined }).json({ success: true }))
router.get('/me', requireAdmin, (req, res) => res.json({ success: true, admin: req.admin }))
router.post('/password', requireAdmin, async (req, res, next) => {
  try {
    const parsed = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(12).max(200) }).safeParse(req.body)
    if (!parsed.success) return safeError(res, 400, 'New password must be at least 12 characters')
    const admin = await query('SELECT password_hash FROM admin_users WHERE id=$1', [req.admin.id])
    if (!(await bcrypt.compare(parsed.data.currentPassword, admin.rows[0].password_hash))) return safeError(res, 401, 'Current password is incorrect')
    await query('UPDATE admin_users SET password_hash=$1,must_change_password=false,updated_at=now() WHERE id=$2', [await bcrypt.hash(parsed.data.newPassword, 12), req.admin.id])
    await query('INSERT INTO audit_logs(admin_id,action,entity,entity_id,ip_address) VALUES($1,$2,$3,$4,$5)', [req.admin.id, 'ADMIN_PASSWORD_CHANGE', 'admin_users', req.admin.id, req.ip])
    return res.json({ success: true })
  } catch (error) { return next(error) }
})
export default router
