import pg from 'pg'

const { Pool } = pg
export const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: Number(process.env.DB_POOL_SIZE || 10), idleTimeoutMillis: 30_000 })
pool.on('error', (error) => console.error('Unexpected PostgreSQL pool error', error))
export const query = (text, values) => pool.query(text, values)
