import 'dotenv/config'
import { pool, query } from './db.js'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import bcrypt from 'bcryptjs'
import { seedDemoData } from './demoSeed.js'

const dir = path.dirname(fileURLToPath(import.meta.url))
await query(await readFile(path.join(dir, '../migrations/001_initial.sql'), 'utf8'))
const email = process.env.SEED_ADMIN_EMAIL
const password = process.env.SEED_ADMIN_PASSWORD
if (!email || !password || password.length < 16) throw new Error('Set SEED_ADMIN_EMAIL and a SEED_ADMIN_PASSWORD of at least 16 characters')

await query(`INSERT INTO admin_users(email,full_name,password_hash,role) VALUES($1,$2,$3,'SUPER_ADMIN') ON CONFLICT(email) DO NOTHING`, [email, 'Ruthikisha Super Admin', await bcrypt.hash(password, 12)])
const contentDefaults = {
  'site.companyName': 'Ruthikisha Travel',
  'home.heroTitle': 'YOUR JOURNEY STARTS HERE',
  'home.heroSubtitle': 'Comfortable journeys. Thoughtfully designed.',
  'about.story': 'We are a Coimbatore-based travel team building a better way to explore South India. We bring trusted bus operators, comfortable journeys and thoughtful service together, so you can spend less time figuring it out and more time looking forward.',
  'contact.phone': '+91 422 456 7890',
  'contact.email': 'hello@ruthikishatravel.in',
  'contact.address': 'Coimbatore, Tamil Nadu, India',
  'contact.supportHours': 'Our local support team is available every day, 8am-8pm.',
  'policies.cancellation': 'Contact Ruthikisha Travel support for cancellation options.',
  'policies.terms': 'Terms and conditions are being prepared by the operator.',
  'policies.privacy': 'Privacy information is being prepared by the operator.',
  'booking.rules': 'Please check passenger names, dates, and seat selections before payment.',
}
for (const [key, value] of Object.entries(contentDefaults)) {
  await query('INSERT INTO website_settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO NOTHING', [key, JSON.stringify(value)])
}

if (process.env.SEED_DEMO_DATA === 'true') {
  await seedDemoData(query)
  console.log('Demo operating records were seeded. Gateway and customer contact details are marked as sample data.')
} else {
  console.log(`Seeded initial admin ${email} and website content. No sample operating data was created; add the real fleet and services in Admin.`)
}
await pool.end()