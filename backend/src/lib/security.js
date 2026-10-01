import { createHash, createHmac, timingSafeEqual, randomBytes } from 'node:crypto'

export const sha256 = (value) => createHash('sha256').update(value).digest('hex')
export const createToken = () => randomBytes(32).toString('base64url')
export const verifyHmac = (secret, body, signature) => {
  if (!secret || !signature) return false
  const expected = createHmac('sha256', secret).update(body).digest('hex')
  const a = Buffer.from(expected, 'hex'); const b = Buffer.from(signature, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}
export const safeError = (res, status, message) => res.status(status).json({ success: false, message })
