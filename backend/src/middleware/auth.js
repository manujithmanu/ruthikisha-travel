import jwt from 'jsonwebtoken'
import { query } from '../db.js'
import { safeError } from '../lib/security.js'

export async function requireAdmin(req, res, next) {
  try {
    const token = req.cookies?.rt_admin || req.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return safeError(res, 401, 'Sign in to continue')
    const claims = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'ruthikisha-api', audience: 'ruthikisha-admin' })
    const result = await query('SELECT id, email, full_name, role, active, must_change_password FROM admin_users WHERE id=$1', [claims.sub])
    const admin = result.rows[0]
    if (!admin?.active) return safeError(res, 401, 'Your session is no longer valid')
    req.admin = { id: admin.id, email: admin.email, fullName: admin.full_name, role: admin.role, mustChangePassword: admin.must_change_password }
    return next()
  } catch {
    return safeError(res, 401, 'Your session has expired. Sign in again.')
  }
}

export const allowRoles = (...roles) => (req, res, next) => {
  if (!req.admin || !roles.includes(req.admin.role)) return safeError(res, 403, 'You do not have permission to do that')
  return next()
}

export async function requireBookingToken(req, res, next) {
  const bookingId = req.params.id || req.body.bookingId
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '') || req.body.bookingToken
  if (!bookingId || !token) return safeError(res, 401, 'Booking access token required')
  const result = await query('SELECT id FROM bookings WHERE id=$1 AND access_token_hash=$2', [bookingId, (await import('../lib/security.js')).sha256(token)])
  if (!result.rowCount) return safeError(res, 404, 'Booking not found')
  req.bookingId = bookingId
  return next()
}
