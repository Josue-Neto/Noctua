import 'reflect-metadata'
import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHmac, randomUUID } from 'node:crypto'
import pg from 'pg'
import argon2 from 'argon2'
import { databaseConfig } from '../scripts/database.mjs'

test('HTTP: sessão, CSRF, DTOs e bloqueio da gestão por papel', async () => {
  const db = new pg.Client(databaseConfig())
  await db.connect()
  const users = ['student', 'teacher', 'coordinator'].map((role) => ({
    id: randomUUID(),
    role,
    email: `${randomUUID()}@example.test`,
  }))
  const password = 'senha-http-teste-123'
  const secret = `http-test-${randomUUID()}-${randomUUID()}`
  const missing = `${randomUUID()}@example.test`
  const child = spawn(process.execPath, ['dist/main.js'], {
    env: { ...process.env, NODE_ENV: 'test', PORT: '0', JWT_SECRET: secret },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  })
  let log = ''
  let spawnError
  const startedAt = Date.now()
  const timeoutMs = 30_000
  let timeout
  const closed = new Promise((resolve) => child.once('close', (code, signal) => resolve({ code, signal })))
  const ready = new Promise((resolve) => {
    child.on('message', (message) => {
      if (message?.type === 'noctua-test-listening' && Number.isInteger(message.port)) resolve({ port: message.port })
    })
    child.once('error', (error) => { spawnError = error; resolve({ error: error.message }) })
    child.once('exit', (code, signal) => resolve({ error: `processo encerrado: código=${code}, sinal=${signal}` }))
    timeout = setTimeout(() => resolve({ error: `tempo limite de ${timeoutMs} ms excedido` }), timeoutMs)
  })
  child.stdout.on('data', (chunk) => {
    log += chunk
  })
  child.stderr.on('data', (chunk) => {
    log += chunk
  })
  child.on('error', (error) => {
    console.error(`[HTTP inicialização] Falha ao iniciar processo: ${error.message}`)
  })
  child.on('exit', (code, signal) => {
    console.error(`[HTTP inicialização] Processo encerrado: código=${code}, sinal=${signal}`)
  })
  try {
    const hash = await argon2.hash(password)
    for (const user of users)
      await db.query(
        'INSERT INTO users(id,full_name,email,password_hash,role) VALUES($1,$2,$3,$4,$5)',
        [user.id, 'Pessoa HTTP', user.email, hash, user.role],
      )
    const result = await ready
    clearTimeout(timeout)
    assert.ok(result.port && child.exitCode === null && child.signalCode === null && !spawnError,
      `API de teste não iniciou: ${result.error ?? 'processo encerrado'}\nSaída da API:\n${log}`)
    const base = `http://127.0.0.1:${result.port}/api`
    const health = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5000) })
    assert.equal(health.status, 200, `Health check falhou. Saída da API:\n${log}`)
    console.error(`[HTTP inicialização] API disponível na porta ${result.port} após ${Date.now() - startedAt} ms`)
    const request = (path, method = 'GET', body, session, marker = true) =>
      fetch(`${base}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(marker ? { 'X-Noctua-Request': '1' } : {}),
          ...(session ? { Cookie: session } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
    assert.equal((await request('/auth/me')).status, 401)
    assert.equal(
      (
        await request(
          '/auth/login',
          'POST',
          { email: users[0].email, password },
          undefined,
          false,
        )
      ).status,
      403,
    )
    for (const user of users) {
      const login = await request('/auth/login', 'POST', {
        email: user.email,
        password,
      })
      assert.equal(login.status, 200)
      const cookie = login.headers.get('set-cookie')
      assert.match(cookie, /HttpOnly/)
      assert.match(cookie, /SameSite=Lax/)
      const session = cookie.split(';')[0]
      const secondLogin = await request('/auth/login', 'POST', { email: user.email, password })
      assert.equal(secondLogin.status, 200)
      const otherSession = secondLogin.headers.get('set-cookie').split(';')[0]
      assert.equal(
        (await (await request('/auth/me', 'GET', undefined, session)).json())
          .role,
        user.role,
      )
      assert.equal(
        (await request('/staff/users', 'GET', undefined, session)).status,
        user.role === 'coordinator' ? 200 : 403,
      )
      assert.equal(
        (
          await request(
            '/me/profile',
            'PATCH',
            { role: 'coordinator' },
            session,
          )
        ).status,
        400,
      )
      assert.equal(
        (
          await request(
            '/me/activities?classId=invalid',
            'GET',
            undefined,
            session,
          )
        ).status,
        400,
      )
      const logout = await request('/auth/logout', 'POST', {}, session)
      assert.match(logout.headers.get('set-cookie'), /Max-Age=0/)
      assert.equal((await request('/auth/me', 'GET', undefined, session)).status, 401)
      assert.equal((await request('/auth/me', 'GET', undefined, otherSession)).status, 200)
      assert.equal((await request('/auth/logout', 'POST', {}, otherSession)).status, 200)
    }
    for (let i = 0; i < 5; i++) assert.equal((await request('/auth/login', 'POST', { email: missing, password })).status, 401)
    const limited = await request('/auth/login', 'POST', { email: missing, password })
    assert.equal(limited.status, 429)
    assert.ok(Number(limited.headers.get('retry-after')) > 0)
    const resetResponses = []
    for (let i = 0; i < 4; i++) resetResponses.push(await (await request('/auth/password-reset/request', 'POST', { email: missing })).json())
    assert.ok(resetResponses.every(body => body.message === resetResponses[0].message))
  } finally {
    clearTimeout(timeout)
    if (child.exitCode === null && child.signalCode === null && child.pid) child.kill()
    await closed
    await db.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [
      users.map((u) => u.id),
    ])
    const keys = []
    for (const ip of ['127.0.0.1', '::ffff:127.0.0.1', '::1']) {
      for (const kind of ['login', 'reset']) {
        const hash = (value) => createHmac('sha256', secret).update(value).digest('hex')
        keys.push(hash(`${kind}:ip:${ip}`))
        for (const email of [...users.map((u) => u.email), missing])
          keys.push(hash(`${kind}:pair:${JSON.stringify([ip, email])}`))
      }
    }
    await db.query('DELETE FROM auth_rate_limits WHERE key_hash=ANY($1::text[])', [keys])
    await db.end()
  }
})
