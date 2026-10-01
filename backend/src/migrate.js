import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { pool } from './db.js'

const folder = path.join(path.dirname(fileURLToPath(import.meta.url)), '../migrations')
try {
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())')
  for (const name of (await readdir(folder)).filter((file) => file.endsWith('.sql')).sort()) {
    const prior = await pool.query('SELECT 1 FROM schema_migrations WHERE name=$1', [name])
    if (prior.rowCount) continue
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(await readFile(path.join(folder, name), 'utf8'))
      await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [name])
      await client.query('COMMIT')
      console.log(`Applied migration ${name}`)
    } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
  }
} finally { await pool.end() }
