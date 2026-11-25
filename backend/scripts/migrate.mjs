import { readdir, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { databaseConfig } from './database.mjs'

export async function migrate(client) {
  await client.query("SELECT pg_advisory_lock(hashtext('noctua-migrations'))")
  try {
    const schema = await client.query("SELECT 1 FROM pg_namespace WHERE nspname = 'noctua'")
    if (!schema.rowCount) await client.query('CREATE SCHEMA IF NOT EXISTS noctua')
    await client.query('SET search_path TO noctua, pg_catalog')
    await client.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())',
    )
    const directory = new URL('../database/migrations/', import.meta.url)
    const files = (await readdir(directory))
      .filter((name) => /^\d+_.+\.sql$/.test(name))
      .sort((a, b) => Number(a.split('_')[0]) - Number(b.split('_')[0]))
    for (const name of files) {
      const sql = await readFile(new URL(name, directory), 'utf8')
      const checksum = createHash('sha256')
        .update(sql.replace(/\r\n/g, '\n'))
        .digest('hex')
      const previous = await client.query(
        'SELECT checksum FROM schema_migrations WHERE name=$1',
        [name],
      )
      if (previous.rowCount) {
        if (previous.rows[0].checksum !== checksum)
          throw new Error(`Migration alterada após aplicação: ${name}`)
        continue
      }
      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query(
          'INSERT INTO schema_migrations (name,checksum) VALUES ($1,$2)',
          [name, checksum],
        )
        await client.query('COMMIT')
        console.log(`Aplicada: ${name}`)
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      }
    }
  } finally {
    await client.query(
      "SELECT pg_advisory_unlock(hashtext('noctua-migrations'))",
    )
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const client = new pg.Client(databaseConfig())
  try {
    await client.connect()
    await migrate(client)
  } finally {
    await client.end()
  }
}
