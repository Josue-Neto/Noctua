import { writeFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import argon2 from 'argon2'
import pg from 'pg'
import { databaseConfig } from './database.mjs'
if (
  process.env.DB_HOST !== '127.0.0.1' ||
  process.env.DB_NAME !== 'noctua' ||
  process.env.DATABASE_URL
)
  throw new Error(
    'Este provisionamento automático é exclusivo da base local noctua.',
  )
const db = new pg.Client(databaseConfig())
await db.connect()
try {
  await db.query('BEGIN')
  await db.query(
    "SELECT pg_advisory_xact_lock(hashtext('noctua-bootstrap-coordinator'))",
  )
  const existing = await db.query(
    "SELECT 1 FROM users WHERE role='coordinator'",
  )
  if (existing.rowCount)
    throw new Error('Já existe uma coordenação; nenhum acesso foi alterado.')
  const password = randomBytes(16).toString('hex'),
    email = 'coordenacao@noctua.local'
  await db.query(
    "INSERT INTO users(full_name,email,password_hash,role) VALUES('Coordenação Noctua',$1,$2,'coordinator')",
    [email, await argon2.hash(password)],
  )
  await writeFile(
    new URL('../../.local-test/primeiro-acesso.txt', import.meta.url),
    `Acesso local do Noctua\nURL: http://localhost:5173/login\nE-mail: ${email}\nSenha: ${password}\n\nEste arquivo é ignorado pelo Git.\n`,
  )
  await db.query('COMMIT')
  console.log(
    'Coordenação local criada. Acesso em .local-test/primeiro-acesso.txt (ignorado pelo Git).',
  )
} catch (error) {
  await db.query('ROLLBACK')
  throw error
} finally {
  await db.end()
}
