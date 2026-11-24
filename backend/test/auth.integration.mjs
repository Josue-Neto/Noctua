import 'reflect-metadata'
import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { DataSource } from 'typeorm'
import { AuthService } from '../dist/auth/auth.service.js'
import { AuthGuard } from '../dist/auth/auth.guard.js'
import { databaseOptions } from '../dist/database.config.js'
import argon2 from 'argon2'

test('PostgreSQL: convite, permissões do professor, revogação e recuperação de senha de uso único', async () => {
  const db = new DataSource(databaseOptions(new ConfigService(process.env)))
  await db.initialize()
  const coordinator = {
    id: randomUUID(),
    role: 'coordinator',
    email: `coord-${randomUUID()}@example.test`,
  }
  const classId = randomUUID(),
    subjectId = randomUUID(),
    email = `teacher-${randomUUID()}@example.test`
  let link = ''
  const jwt = new JwtService({ secret: 'integration-only-secret', signOptions: { expiresIn: '1h' } })
  const service = new AuthService(
    db,
    jwt,
    {
      sendAccountLink: async (_email, _subject, _action, url) => {
        link = url
      },
    },
    new ConfigService({ FRONTEND_URL: 'http://localhost:5173' }),
  )
  try {
    await db.query(
      "INSERT INTO users(id,full_name,email,password_hash,role) VALUES($1,'Coord teste',$2,$3,'coordinator')",
      [
        coordinator.id,
        coordinator.email,
        await argon2.hash('senha-inicial-123'),
      ],
    )
    await db.query(
      'INSERT INTO academic_classes(id,name,school_year) VALUES($1,$2,2)',
      [classId, `Turma ${randomUUID()}`],
    )
    await db.query('INSERT INTO subjects(id,name) VALUES($1,$2)', [
      subjectId,
      `Disciplina ${randomUUID()}`,
    ])
    await db.query(
      'INSERT INTO class_subjects(class_id,subject_id) VALUES($1,$2)',
      [classId, subjectId],
    )
    const dto = {
      email,
      role: 'teacher',
      subjects: [{ class_id: classId, subject_id: subjectId }],
    }
    const invitation = await service.createInvitation(dto, coordinator)
    const revokedToken = new URL(link).searchParams.get('token')
    await service.revokeInvitation(invitation.id)
    await assert.rejects(service.previewInvitation(revokedToken))
    await assert.rejects(service.revokeInvitation(randomUUID()))
    await service.createInvitation(dto, coordinator)
    const expiredToken = new URL(link).searchParams.get('token')
    await db.query(
      "UPDATE account_invitations SET created_at=NOW()-INTERVAL '8 days',expires_at=NOW()-INTERVAL '1 day' WHERE email=$1 AND revoked_at IS NULL",
      [email],
    )
    await assert.rejects(
      service.acceptInvitation(expiredToken, 'Professor', 'senha-inicial-123'),
    )
    await service.createInvitation(dto, coordinator)
    const token = new URL(link).searchParams.get('token')
    assert.equal((await service.previewInvitation(token)).role, 'teacher')
    const user = await service.acceptInvitation(
      token,
      'Professor real',
      'senha-inicial-123',
    )
    assert.equal(user.subjects.length, 1)
    await assert.rejects(
      service.acceptInvitation(token, 'Outra pessoa', 'senha-inicial-123'),
    )
    const login = await service.login(email, 'senha-inicial-123')
    const second = await service.login(email, 'senha-inicial-123')
    assert.equal(login.user.role, 'teacher')
    const guard = new AuthGuard(jwt, db)
    const context = token => ({ switchToHttp: () => ({ getRequest: () => ({ headers: { cookie: `noctua_session=${token}` } }) }) })
    assert.equal(await guard.canActivate(context(login.accessToken)), true)
    await service.logout(login.accessToken)
    await assert.rejects(guard.canActivate(context(login.accessToken)))
    assert.equal(await guard.canActivate(context(second.accessToken)), true)
    await service.requestPasswordReset(email)
    const reset = new URL(link).searchParams.get('token')
    await service.confirmPasswordReset(reset, 'senha-alterada-123')
    await assert.rejects(guard.canActivate(context(second.accessToken)))
    const oldSessions = await db.query('SELECT revoked_at FROM auth_sessions WHERE user_id=$1', [user.id])
    assert.equal(oldSessions.length, 2)
    assert.ok(oldSessions.every(session => session.revoked_at))
    await assert.rejects(service.confirmPasswordReset(reset, 'outra-senha-123'))
    await assert.rejects(service.login(email, 'senha-inicial-123'))
    assert.equal(
      (await service.login(email, 'senha-alterada-123')).user.id,
      user.id,
    )
  } finally {
    await db.query('DELETE FROM account_invitations WHERE created_by=$1', [
      coordinator.id,
    ])
    await db.query('DELETE FROM academic_classes WHERE id=$1', [classId])
    await db.query('DELETE FROM subjects WHERE id=$1', [subjectId])
    await db.query('DELETE FROM users WHERE id=$1 OR email=$2', [
      coordinator.id,
      email,
    ])
    await db.destroy()
  }
})
