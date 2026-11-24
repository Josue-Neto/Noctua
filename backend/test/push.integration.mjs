import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { databaseOptions } from '../dist/database.config.js';
import { PushService } from '../dist/push/push.service.js';
import { SchoolService } from '../dist/school/school.service.js';

test('lembretes seguem preferências, alterações, cancelamentos e vínculos', async () => {
  const db = new DataSource(databaseOptions(new ConfigService(process.env)));
  await db.initialize();
  const push = new PushService(
    db,
    new ConfigService({
      VAPID_PUBLIC_KEY: 'test',
      VAPID_PRIVATE_KEY: 'test',
      VAPID_SUBJECT: 'mailto:test@example.com',
    }),
  );
  const school = new SchoolService(db, new ConfigService({}), {});
  const teacher = { id: randomUUID(), role: 'teacher' },
    students = [randomUUID(), randomUUID()],
    c = randomUUID(),
    s = randomUUID(),
    slot = randomUUID();
  const all = [teacher.id, ...students];
  try {
    for (const id of all)
      await db.query(
        'INSERT INTO users(id,full_name,email,password_hash,role) VALUES($1,$2,$3,$4,$5)',
        [
          id,
          'Teste',
          `${id}@example.test`,
          'hash',
          id === teacher.id ? 'teacher' : 'student',
        ],
      );
    await db.query(
      'INSERT INTO academic_classes(id,name,school_year) VALUES($1,$2,2)',
      [c, `Turma ${c}`],
    );
    await db.query('INSERT INTO subjects(id,name) VALUES($1,$2)', [
      s,
      `Disciplina ${s}`,
    ]);
    await db.query(
      'INSERT INTO class_subjects(id,class_id,subject_id,teacher_id) VALUES($1,$2,$3,$4)',
      [slot, c, s, teacher.id],
    );
    await db.query(
      'INSERT INTO class_memberships(class_id,student_id) VALUES($1,$2),($1,$3)',
      [c, ...students],
    );
    const mk = (id) => ({
      endpoint: `https://fcm.googleapis.com/fcm/send/${id}`,
      keys: { p256dh: 'A'.repeat(87), auth: 'A'.repeat(22) },
    });
    await push.subscribe(students[0], mk(students[0]));
    await push.subscribe(students[1], mk(students[1]));
    await db.query(
      'UPDATE notification_preferences SET remind_48_hours=false WHERE user_id=$1',
      [students[1]],
    );
    const dto = {
      classSubjectId: slot,
      title: 'Teste push',
      detail: '',
      type: 'exam',
      dueAt: new Date(Date.now() + 72 * 3600000).toISOString(),
      status: 'published',
      attachments: [],
    };
    const a = await school.save(teacher, dto);
    await push.reconcile();
    let rows = await db.query(
      'SELECT student_id,reminder_hours,status FROM notification_deliveries WHERE activity_id=$1 ORDER BY student_id,reminder_hours',
      [a.id],
    );
    assert.equal(rows.length, 3);
    assert.equal(rows.filter((r) => r.student_id === students[1]).length, 1);
    await db.query(
      "UPDATE activities SET due_at=NOW()+INTERVAL '24 hours'-INTERVAL '1 minute' WHERE id=$1",
      [a.id],
    );
    await db.query(
      "UPDATE notification_deliveries d SET scheduled_at=a.due_at-d.reminder_hours*INTERVAL '1 hour' FROM activities a WHERE a.id=d.activity_id AND d.activity_id=$1",
      [a.id],
    );
    await db.query(
      "UPDATE push_device_deliveries pd SET next_attempt_at=NOW()-INTERVAL '1 second' FROM notification_deliveries d WHERE pd.delivery_id=d.id AND d.activity_id=$1 AND d.student_id=$2 AND d.reminder_hours=24",
      [a.id, students[0]],
    );
    const sent = [];
    push.send = async (subscription, payload) => {
      sent.push({ subscription, payload: JSON.parse(payload) });
    };
    assert.equal(await push.sendNext(), true);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].payload.url, `/atividades/${a.id}`);
    assert.equal(
      (
        await db.query(
          'SELECT pd.status FROM push_device_deliveries pd JOIN notification_deliveries d ON d.id=pd.delivery_id WHERE d.activity_id=$1 AND d.student_id=$2 AND d.reminder_hours=24',
          [a.id, students[0]],
        )
      )[0].status,
      'sent',
    );
    const d = await school.save(
      teacher,
      { ...dto, dueAt: new Date(Date.now() + 96 * 3600000).toISOString() },
      a.id,
    );
    await push.reconcile();
    rows = await db.query(
      'SELECT status,scheduled_at FROM notification_deliveries WHERE activity_id=$1',
      [a.id],
    );
    assert.equal(rows.length, 3);
    assert.ok(rows.every((r) => r.status === 'pending'));
    assert.ok(
      rows.every(
        (r) => new Date(r.scheduled_at).getTime() > Date.now() + 40 * 3600000,
      ),
    );
    await db.query('DELETE FROM class_memberships WHERE student_id=$1', [
      students[1],
    ]);
    await push.reconcile();
    assert.equal(
      (
        await db.query(
          'SELECT status FROM notification_deliveries WHERE activity_id=$1 AND student_id=$2',
          [a.id, students[1]],
        )
      )[0].status,
      'cancelled',
    );
    await school.cancel(teacher, d.id);
    await push.reconcile();
    assert.ok(
      (
        await db.query(
          'SELECT status FROM notification_deliveries WHERE activity_id=$1',
          [a.id],
        )
      ).every((r) => r.status === 'cancelled'),
    );
    await assert.rejects(
      push.subscribe(students[0], {
        ...mk('bad'),
        endpoint: 'https://localhost/private',
      }),
    );
    await push.unsubscribe(students[0], mk(students[1]).endpoint);
    assert.equal(
      (
        await db.query(
          'SELECT COUNT(*)::int AS n FROM push_subscriptions WHERE user_id=$1',
          [students[1]],
        )
      )[0].n,
      1,
    );
  } finally {
    await db.query(
      'DELETE FROM notification_deliveries WHERE student_id=ANY($1::uuid[])',
      [students],
    );
    await db.query('DELETE FROM activities WHERE author_id=$1', [teacher.id]);
    await db.query('DELETE FROM academic_classes WHERE id=$1', [c]);
    await db.query('DELETE FROM subjects WHERE id=$1', [s]);
    await db.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [all]);
    await db.destroy();
  }
});
