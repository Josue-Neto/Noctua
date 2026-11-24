import { readFile, writeFile } from 'node:fs/promises'
import { randomUUID, randomBytes } from 'node:crypto'
import argon2 from 'argon2'
import pg from 'pg'
import { databaseConfig } from './database.mjs'

if (process.env.DB_HOST !== '127.0.0.1' || process.env.DB_PORT !== '55432')
  throw new Error(
    'Fixtures permitidas somente no PostgreSQL isolado da auditoria.',
  )
const db = new pg.Client(databaseConfig())
await db.connect()
try {
  const path = new URL('../../.local-test/audit-accounts.json', import.meta.url)
  if (process.argv.includes('--clean')) {
    const { users, classes, subjects } = JSON.parse(
      await readFile(path, 'utf8'),
    )
    await db.query('BEGIN')
    await db.query(
      'DELETE FROM student_activity_checklist WHERE student_id=ANY($1::uuid[])',
      [users.map((u) => u.id)],
    )
    await db.query('DELETE FROM activities WHERE author_id=ANY($1::uuid[])', [
      users.map((u) => u.id),
    ])
    await db.query(
      'DELETE FROM account_invitations WHERE created_by=ANY($1::uuid[])',
      [users.map((u) => u.id)],
    )
    await db.query('DELETE FROM academic_classes WHERE id=ANY($1::uuid[])', [
      classes,
    ])
    await db.query('DELETE FROM subjects WHERE id=ANY($1::uuid[])', [subjects])
    await db.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [
      users.map((u) => u.id),
    ])
    await db.query('COMMIT')
    console.log('Dados da auditoria removidos.')
  } else {
    const users = ['coordinator', 'teacher', 'student', 'student'].map(
      (role, index) => ({
        id: randomUUID(),
        email: `${role}${index}@audit.example.test`,
        role,
        name: [
          'Coordenação Auditoria',
          'Professor Auditoria',
          'Estudante A',
          'Estudante B',
        ][index],
        password: randomBytes(12).toString('hex'),
      }),
    )
    for (const user of users)
      await db.query(
        'INSERT INTO users(id,full_name,email,password_hash,role) VALUES($1,$2,$3,$4,$5)',
        [
          user.id,
          user.name,
          user.email,
          await argon2.hash(user.password),
          user.role,
        ],
      )
    const classes = [randomUUID(), randomUUID()],
      subjects = [randomUUID(), randomUUID()]
    for (let i = 0; i < 2; i++) {
      await db.query(
        'INSERT INTO academic_classes(id,name,school_year) VALUES($1,$2,2)',
        [classes[i], `Turma Auditoria ${i === 0 ? 'A' : 'B'}`],
      )
      await db.query('INSERT INTO subjects(id,name) VALUES($1,$2)', [
        subjects[i],
        i === 0 ? 'Matemática Auditoria' : 'História Auditoria',
      ])
      await db.query(
        'INSERT INTO class_subjects(class_id,subject_id,teacher_id) VALUES($1,$2,$3)',
        [classes[i], subjects[i], i === 0 ? users[1].id : null],
      )
      await db.query(
        'INSERT INTO class_memberships(class_id,student_id) VALUES($1,$2)',
        [classes[i], users[i + 2].id],
      )
    }
    await writeFile(path, JSON.stringify({ users, classes, subjects }, null, 2))
    console.log(
      'Contas sintéticas disponíveis em .local-test/audit-accounts.json',
    )
  }
} finally {
  await db.end()
}
