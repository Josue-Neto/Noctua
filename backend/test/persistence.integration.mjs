import 'reflect-metadata'
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import pg from 'pg'
import argon2 from 'argon2'
import { ConfigService } from '@nestjs/config'
import { DataSource } from 'typeorm'
import { SchoolService } from '../dist/school/school.service.js'
import { AuthService } from '../dist/auth/auth.service.js'
import { databaseOptions } from '../dist/database.config.js'
import { migrate } from '../scripts/migrate.mjs'
import { databaseConfig } from '../scripts/database.mjs'

test('PostgreSQL: migrations, persistência, isolamento, rollback e vínculos', async () => {
  const client = new pg.Client(databaseConfig())
  await client.connect()
  await migrate(client)
  const before = (
    await client.query('SELECT * FROM schema_migrations ORDER BY name')
  ).rows
  await migrate(client)
  assert.deepEqual(
    (await client.query('SELECT * FROM schema_migrations ORDER BY name')).rows,
    before,
  )
  const db = new DataSource(databaseOptions(new ConfigService(process.env)))
  await db.initialize()
  const cfg = new ConfigService({
    SCHOOL_NAME: 'Escola de teste',
    SCHOOL_TIMEZONE: 'America/Sao_Paulo',
  })
  const auth = new AuthService(db, {}, {}, cfg),
    service = new SchoolService(db, cfg, auth)
  const users = ['student', 'student', 'teacher', 'coordinator'].map(
    (role, index) => ({
      id: randomUUID(),
      email: `audit-${randomUUID()}@example.test`,
      role,
      name: `Teste ${index}`,
    }),
  )
  const classIds = [randomUUID(), randomUUID()],
    subjectIds = [randomUUID(), randomUUID()],
    slots = [randomUUID(), randomUUID()]
  const passwordHash = await argon2.hash('teste-persistencia-123')
  try {
    for (const user of users)
      await db.query(
        'INSERT INTO users(id,full_name,email,password_hash,role) VALUES($1,$2,$3,$4,$5)',
        [user.id, user.name, user.email, passwordHash, user.role],
      )
    for (let i = 0; i < 2; i++) {
      await db.query(
        'INSERT INTO academic_classes(id,name,school_year) VALUES($1,$2,2)',
        [classIds[i], `Turma ${randomUUID()}`],
      )
      await db.query('INSERT INTO subjects(id,name) VALUES($1,$2)', [
        subjectIds[i],
        `Disciplina ${randomUUID()}`,
      ])
      await db.query(
        'INSERT INTO class_subjects(id,class_id,subject_id,teacher_id) VALUES($1,$2,$3,$4)',
        [slots[i], classIds[i], subjectIds[i], i === 0 ? users[2].id : null],
      )
      await db.query(
        'INSERT INTO class_memberships(class_id,student_id) VALUES($1,$2)',
        [classIds[i], users[i].id],
      )
    }
    const dto = {
      classSubjectId: slots[0],
      title: 'Prova real',
      detail: 'Instruções',
      type: 'exam',
      dueAt: '2026-12-01T13:00:00Z',
      status: 'published',
      attachments: [
        { name: 'Material', url: 'https://example.com/material.pdf' },
      ],
    }
    const activity = await service.save(users[2], dto)
    assert.equal(activity.authorId, users[2].id)
    assert.equal(activity.attachments.length, 1)
    await assert.rejects(service.detail(users[1], activity.id))
    await assert.rejects(service.save(users[0], dto))
    await assert.rejects(
      service.save(users[2], { ...dto, classSubjectId: slots[1] }),
    )
    assert.equal(
      (await service.list(users[0], { page: 1, limit: 100 })).total,
      1,
    )
    const draft = await service.save(users[2], { ...dto, status: 'draft' })
    await assert.rejects(service.detail(users[0], draft.id))
    await assert.rejects(service.save(users[2], { ...dto, status: 'draft' }, activity.id))
    await assert.rejects(service.save(users[2], { ...dto, classSubjectId: slots[1] }, activity.id))
    const studentAgenda = await service.list(users[0], {page:1,limit:100})
    assert.deepEqual(studentAgenda.items.map(item=>item.id),[activity.id])
    await service.save(users[2], { ...dto, title: 'Rascunho publicado' }, draft.id)
    assert.equal((await service.detail(users[0], draft.id)).status, 'published')
    assert.equal((await service.list(users[0],{page:1,limit:100,classId:classIds[1]})).total,0)
    await service.checklist(users[0], activity.id, true)
    assert.equal((await service.detail(users[0], activity.id)).done, true)
    await assert.rejects(service.checklist(users[1], activity.id, true))
    await db.query('INSERT INTO class_memberships(class_id,student_id) VALUES($1,$2)',[classIds[0],users[1].id])
    assert.equal((await service.detail(users[1],activity.id)).done,false)
    assert.equal((await service.detail(users[0],activity.id)).title,dto.title)
    assert.equal(new Date((await service.detail(users[0],activity.id)).dueAt).toISOString(),new Date(dto.dueAt).toISOString())
    assert.equal((await service.detail(users[2], activity.id)).done, false)
    await service.checklist(users[0], activity.id, false)
    assert.equal((await service.detail(users[0], activity.id)).done, false)
    await service.updateProfile(users[0], {
      name: 'Nome persistido',
      bio: 'Minha bio',
      avatar: 'https://example.com/foto.png',
    })
    await service.updatePreferences(users[0], {
      theme: 'dark',
      highContrast: true,
      notifications: false,
      remind24Hours: false,
    })
    const reloaded = new SchoolService(db, cfg, auth)
    assert.equal((await reloaded.profile(users[0])).name, 'Nome persistido')
    assert.equal((await reloaded.profile(users[0])).bio, 'Minha bio')
    assert.equal((await reloaded.profile(users[0])).avatar, 'https://example.com/foto.png')
    assert.equal((await reloaded.profile(users[0])).schoolTimezone, 'America/Sao_Paulo')
    assert.equal((await reloaded.preferences(users[0])).theme, 'dark')
    assert.equal((await reloaded.preferences(users[0])).highContrast, true)
    assert.equal((await reloaded.preferences(users[0])).notifications, false)
    assert.equal((await reloaded.preferences(users[0])).remind24Hours, false)
    assert.equal((await reloaded.profile(users[1])).name, users[1].name)
    assert.equal((await reloaded.preferences(users[1])).theme, 'system')
    await assert.rejects(
      service.updateProfile(users[0], { avatar: 'javascript:alert(1)' }),
    )
    assert.equal((await reloaded.profile(users[0])).avatar, 'https://example.com/foto.png')
    const midnightDue = '2026-12-02T02:59:00.000Z'
    await service.save(users[2], { ...dto, dueAt: midnightDue }, activity.id)
    assert.equal(new Date((await reloaded.detail(users[0], activity.id)).dueAt).toISOString(), midnightDue)
    await assert.rejects(
      service.addLink(users[2], activity.id, {
        name: 'Ruim',
        url: 'http://example.com',
      }),
    )
    await assert.rejects(
      service.assignments(users[0].id, {
        class_ids: [randomUUID()],
        subjects: [],
      }),
    )
    assert.equal((await service.detail(users[0], activity.id)).id, activity.id)
    await service.assignments(users[0].id, {
      class_ids: [classIds[1]],
      subjects: [],
    })
    await assert.rejects(service.detail(users[0], activity.id))
    assert.equal(
      (
        await db.query(
          'SELECT COUNT(*)::int AS count FROM student_activity_checklist WHERE student_id=$1',
          [users[0].id],
        )
      )[0].count,
      1,
    )
    await service.assignments(users[0].id, {
      class_ids: [classIds[0]],
      subjects: [],
    })
    await service.save(users[3], { ...dto, title: 'Atualizada' }, activity.id)
    assert.equal(
      (await service.detail(users[2], activity.id)).authorId,
      users[2].id,
    )
    await service.cancel(users[2], activity.id)
    await assert.rejects(service.save(users[2], dto, activity.id))
    await db.destroy()
    const fresh = new pg.Client(databaseConfig())
    await fresh.connect()
    assert.equal(
      (
        await fresh.query('SELECT title FROM activities WHERE id=$1', [
          activity.id,
        ])
      ).rows[0].title,
      'Atualizada',
    )
    await fresh.end()
  } finally {
    if (!db.isInitialized) await db.initialize()
    await db.query(
      'DELETE FROM student_activity_checklist WHERE student_id=ANY($1::uuid[])',
      [users.map((u) => u.id)],
    )
    await db.query('DELETE FROM activities WHERE author_id=ANY($1::uuid[])', [
      users.map((u) => u.id),
    ])
    await db.query('DELETE FROM academic_classes WHERE id=ANY($1::uuid[])', [
      classIds,
    ])
    await db.query('DELETE FROM subjects WHERE id=ANY($1::uuid[])', [
      subjectIds,
    ])
    await db.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [
      users.map((u) => u.id),
    ])
    await db.destroy()
    await client.end()
  }
})
