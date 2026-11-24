import { databaseConfig } from './database.mjs'
import 'dotenv/config'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import argon2 from 'argon2'
import pg from 'pg'

const { Client } = pg

async function askHidden(prompt) {
  if (!stdin.isTTY)
    throw new Error(
      'Execute este comando em um terminal interativo para informar a senha com segurança.',
    )
  stdout.write(prompt)
  stdin.setRawMode(true)
  stdin.resume()
  stdin.setEncoding('utf8')
  return new Promise((resolve, reject) => {
    let value = ''
    const finish = (error) => {
      stdin.setRawMode(false)
      stdin.pause()
      stdin.removeListener('data', onData)
      stdout.write('\n')
      if (error) reject(error)
      else resolve(value)
    }
    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === '\u0003')
          return finish(new Error('Operação cancelada.'))
        if (character === '\r' || character === '\n') return finish()
        if (character === '\u007f' || character === '\b')
          value = value.slice(0, -1)
        else value += character
      }
    }
    stdin.on('data', onData)
  })
}

const prompt = createInterface({ input: stdin, output: stdout })
const email = (await prompt.question('E-mail da coordenação inicial: '))
  .trim()
  .toLowerCase()
const fullName = (await prompt.question('Nome completo: ')).trim()
prompt.close()

if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Informe um e-mail válido.')
if (fullName.length < 2) throw new Error('Informe o nome completo.')
const password = await askHidden('Senha inicial (mínimo de 8 caracteres): ')
if (password.length < 8)
  throw new Error('A senha precisa ter pelo menos 8 caracteres.')
const confirmation = await askHidden('Confirme a senha: ')
if (password !== confirmation) throw new Error('As senhas não coincidem.')

const client = new Client(databaseConfig())

try {
  await client.connect()
  await client.query('BEGIN')
  await client.query(
    "SELECT pg_advisory_xact_lock(hashtext('noctua-bootstrap-coordinator'))",
  )
  const existing = await client.query(
    "SELECT id FROM users WHERE role = 'coordinator' LIMIT 1 FOR UPDATE",
  )
  if (existing.rowCount)
    throw new Error(
      'Já existe uma conta de coordenação. Use a gestão de convites para criar outra.',
    )
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id })
  await client.query(
    'INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
    [fullName, email, passwordHash, 'coordinator'],
  )
  await client.query('COMMIT')
  stdout.write(`Conta inicial da coordenação criada para ${email}.\n`)
} catch (error) {
  await client.query('ROLLBACK').catch(() => undefined)
  throw error
} finally {
  await client.end()
}
