import 'reflect-metadata'
import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID, createHmac } from 'node:crypto'
import { ConfigService } from '@nestjs/config'
import { DataSource } from 'typeorm'
import { databaseOptions } from '../dist/database.config.js'
import { AuthSecurityService } from '../dist/auth/auth-security.service.js'

test('limites de autenticação são atômicos e expiram', async () => {
  const db = new DataSource(databaseOptions(new ConfigService(process.env)))
  await db.initialize()
  const secret = 'isolated-rate-limit-test-secret'
  const cfg = new ConfigService({ JWT_SECRET: secret })
  const service = new AuthSecurityService(db, cfg)
  const ip = `test-${randomUUID()}`
  const email = `${randomUUID()}@example.test`
  const hash = (s) => createHmac('sha256', secret).update(s).digest('hex')
  const keys = [hash(`login:ip:${ip}`), hash(`login:pair:${JSON.stringify([ip, email])}`), hash(`reset:ip:${ip}`), hash(`reset:pair:${JSON.stringify([ip, email])}`)]
  try {
    const attempts = await Promise.all(Array.from({length: 10}, () => service.consume('login', ip, email.toUpperCase())))
    assert.equal(attempts.filter(value => value === 0).length, 5)
    assert.equal(attempts.filter(value => value > 0).length, 5)
    for (let i = 0; i < 3; i++) assert.equal(await service.consume('reset', ip, email), 0)
    assert.ok(await service.consume('reset', ip, email) > 0)
    const rows = await db.query('SELECT key_hash FROM auth_rate_limits WHERE key_hash=ANY($1::text[])', [keys])
    assert.equal(rows.length, 4)
    await db.query("UPDATE auth_rate_limits SET expires_at=NOW()-INTERVAL '1 second' WHERE key_hash=ANY($1::text[])", [keys])
    assert.equal(await service.consume('login', ip, email), 0)
  } finally {
    await db.query('DELETE FROM auth_rate_limits WHERE key_hash=ANY($1::text[])', [keys])
    await db.destroy()
  }
})
