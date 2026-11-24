import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth/auth.service';
import type { AuthRequestUser } from '../auth/auth.types';
import {
  ActivityDto,
  ActivityQuery,
  AssignmentsDto,
  LinkDto,
  PreferencesDto,
  ProfileDto,
} from './school.dto';

@Injectable()
export class SchoolService {
  constructor(
    private readonly db: DataSource,
    private readonly config: ConfigService,
    private readonly auth: AuthService,
  ) {}

  private scope(user: AuthRequestUser, read = true) {
    if (user.role === 'coordinator') return 'TRUE';
    if (user.role === 'teacher') return 'cs.teacher_id = $1';
    if (!read)
      throw new ForbiddenException(
        'Somente professores e coordenação podem publicar.',
      );
    return "a.status = 'published' AND EXISTS (SELECT 1 FROM class_memberships m WHERE m.class_id=cs.class_id AND m.student_id=$1)";
  }
  private async authorize(
    user: AuthRequestUser,
    id: string,
    write = false,
    manager: EntityManager = this.db.manager,
  ) {
    const rows = await manager.query(
      `SELECT a.* FROM activities a JOIN class_subjects cs ON cs.id=a.class_subject_id WHERE a.id=$2 AND (${this.scope(user, !write)}) AND $1::uuid IS NOT NULL ${write ? 'FOR UPDATE OF a, cs' : ''}`,
      [user.id, id],
    );
    if (!rows[0]) throw new NotFoundException('Atividade não encontrada.');
    if (write && rows[0].status === 'cancelled')
      throw new ConflictException(
        'Atividades canceladas não podem ser alteradas.',
      );
    return rows[0];
  }
  async catalog(user: AuthRequestUser) {
    return this.db.query(
      `SELECT cs.id, c.id AS "classId",c.name AS "className",s.id AS "subjectId",s.name AS "subjectName" FROM class_subjects cs JOIN academic_classes c ON c.id=cs.class_id JOIN subjects s ON s.id=cs.subject_id WHERE $1::uuid IS NOT NULL AND ${user.role === 'coordinator' ? 'TRUE' : user.role === 'teacher' ? 'cs.teacher_id=$1' : 'EXISTS (SELECT 1 FROM class_memberships m WHERE m.class_id=c.id AND m.student_id=$1)'} ORDER BY c.name,s.name`,
      [user.id],
    );
  }
  async list(user: AuthRequestUser, q: ActivityQuery) {
    const params: unknown[] = [user.id];
    const conditions = [this.scope(user), '$1::uuid IS NOT NULL'];
    for (const [value, column, operator] of [
      [q.from, 'a.due_at', '>='],
      [q.to, 'a.due_at', '<'],
      [q.classId, 'cs.class_id', '='],
      [q.subjectId, 'cs.subject_id', '='],
      [q.type, 'a.activity_type', '='],
    ] as const) {
      if (value) {
        params.push(value);
        conditions.push(`${column} ${operator} $${params.length}`);
      }
    }
    const where = conditions.join(' AND ');
    const counts = await this.db.query(
      `SELECT COUNT(*)::int AS total FROM activities a JOIN class_subjects cs ON cs.id=a.class_subject_id WHERE ${where}`,
      params,
    );
    params.push(q.limit, q.limit * (q.page - 1));
    const rows = await this.db.query(
      `SELECT a.id FROM activities a JOIN class_subjects cs ON cs.id=a.class_subject_id WHERE ${where} ORDER BY a.due_at,a.id LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return {
      items: await this.loadItems(
        user,
        rows.map((r: { id: string }) => r.id),
      ),
      total: counts[0].total,
      page: q.page,
      limit: q.limit,
    };
  }
  private async loadItems(user: AuthRequestUser, ids: string[]) {
    if (!ids.length) return [];
    return this.db.query(
      `SELECT a.id,a.title,a.description AS detail,a.activity_type AS type,a.status,a.due_at AS "dueAt",a.class_subject_id AS "classSubjectId",a.author_id AS "authorId",u.full_name AS "authorName",cs.class_id AS "classId",c.name AS "className",s.id AS "subjectId",s.name AS subject,(ch.completed_at IS NOT NULL) AS done,COALESCE((SELECT json_agg(json_build_object('id',att.id,'name',att.display_name,'url',att.external_url) ORDER BY att.created_at,att.id) FROM activity_attachments att WHERE att.activity_id=a.id AND att.attachment_type='link'),'[]') AS attachments FROM activities a JOIN class_subjects cs ON cs.id=a.class_subject_id JOIN academic_classes c ON c.id=cs.class_id JOIN subjects s ON s.id=cs.subject_id JOIN users u ON u.id=a.author_id LEFT JOIN student_activity_checklist ch ON ch.activity_id=a.id AND ch.student_id=$1 WHERE a.id=ANY($2::uuid[]) AND (${this.scope(user)}) ORDER BY a.due_at,a.id`,
      [user.id, ids],
    );
  }
  async detail(user: AuthRequestUser, id: string) {
    await this.authorize(user, id);
    return (await this.loadItems(user, [id]))[0];
  }
  private async validateSlot(
    manager: EntityManager,
    user: AuthRequestUser,
    id: string,
  ) {
    if (user.role === 'student') throw new ForbiddenException();
    const rows = await manager.query(
      `SELECT id FROM class_subjects WHERE id=$1 AND ($2='coordinator' OR teacher_id=$3) FOR UPDATE`,
      [id, user.role, user.id],
    );
    if (!rows.length)
      throw new ForbiddenException('Turma ou disciplina não autorizada.');
  }
  private validateLink(link: LinkDto) {
    let url: URL;
    try {
      url = new URL(link.url);
    } catch {
      throw new BadRequestException('Informe um link HTTPS válido.');
    }
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      !link.name.trim()
    )
      throw new BadRequestException('Informe nome e link HTTPS válido.');
  }
  async save(user: AuthRequestUser, dto: ActivityDto, id?: string) {
    if (!dto.title.trim()) throw new BadRequestException('Informe o título.');
    dto.attachments.forEach((link) => this.validateLink(link));
    const savedId = await this.db.transaction(async (manager) => {
      if (id) {
        const existing = await this.authorize(user, id, true, manager);
        if (existing.status === 'published' && dto.status === 'draft') {
          throw new ConflictException('Uma atividade publicada não pode voltar a rascunho.');
        }
      }
      await this.validateSlot(manager, user, dto.classSubjectId);
      const values = [
        dto.classSubjectId,
        dto.title.trim(),
        dto.detail,
        dto.type,
        dto.dueAt,
        dto.status,
      ];
      const rows = id
        ? await manager.query(
            `WITH saved AS (UPDATE activities SET class_subject_id=$1,title=$2,description=$3,activity_type=$4,due_at=$5,status=$6,published_at=CASE WHEN $6='published' THEN COALESCE(published_at,NOW()) ELSE published_at END,updated_at=NOW() WHERE id=$7 RETURNING id) SELECT id FROM saved`,
            [...values, id],
          )
        : await manager.query(
            `INSERT INTO activities (class_subject_id,title,description,activity_type,due_at,status,author_id,published_at) VALUES ($1,$2,$3,$4,$5,$6,$7,CASE WHEN $6='published' THEN NOW() END) RETURNING id`,
            [...values, user.id],
          );
      const activityId = rows[0].id;
      await manager.query(
        "DELETE FROM activity_attachments WHERE activity_id=$1 AND attachment_type='link'",
        [activityId],
      );
      for (const link of dto.attachments)
        await this.insertLink(manager, activityId, link);
      // The sender is a later feature; do not leave stale pending deliveries after edits.
      if (id)
        await manager.query(
          "UPDATE notification_deliveries SET status='cancelled' WHERE activity_id=$1 AND status='pending'",
          [id],
        );
      return activityId;
    });
    return this.detail(user, savedId);
  }
  private insertLink(manager: EntityManager, id: string, link: LinkDto) {
    return manager.query(
      "INSERT INTO activity_attachments (activity_id,display_name,attachment_type,external_url) VALUES ($1,$2,'link',$3) RETURNING id,display_name AS name,external_url AS url",
      [id, link.name.trim(), link.url],
    );
  }
  async addLink(user: AuthRequestUser, id: string, dto: LinkDto) {
    this.validateLink(dto);
    return this.db.transaction(async (manager) => {
      await this.authorize(user, id, true, manager);
      const count = await manager.query(
        'SELECT COUNT(*)::int AS total FROM activity_attachments WHERE activity_id=$1',
        [id],
      );
      if (count[0].total >= 20)
        throw new BadRequestException('Máximo de vinte anexos.');
      return (await this.insertLink(manager, id, dto))[0];
    });
  }
  async removeLink(user: AuthRequestUser, id: string, attachmentId: string) {
    return this.db.transaction(async (manager) => {
      await this.authorize(user, id, true, manager);
      await manager.query(
        'DELETE FROM activity_attachments WHERE activity_id=$1 AND id=$2',
        [id, attachmentId],
      );
      return { removed: true };
    });
  }
  async cancel(user: AuthRequestUser, id: string) {
    await this.db.transaction(async (manager) => {
      await this.authorize(user, id, true, manager);
      await manager.query(
        "UPDATE activities SET status='cancelled',updated_at=NOW() WHERE id=$1",
        [id],
      );
      await manager.query(
        "UPDATE notification_deliveries SET status='cancelled' WHERE activity_id=$1 AND status='pending'",
        [id],
      );
    });
    return this.detail(user, id);
  }
  async checklist(user: AuthRequestUser, id: string, completed: boolean) {
    if (user.role !== 'student')
      throw new ForbiddenException('O checklist é individual do estudante.');
    await this.db.transaction(async (manager) => {
      await this.authorize(user, id, false, manager);
      await manager.query(
        'INSERT INTO student_activity_checklist (activity_id,student_id,completed_at) VALUES ($1,$2,CASE WHEN $3 THEN NOW() END) ON CONFLICT (activity_id,student_id) DO UPDATE SET completed_at=EXCLUDED.completed_at,updated_at=NOW()',
        [id, user.id, completed],
      );
    });
    return { completed };
  }
  async profile(user: AuthRequestUser) {
    const me = await this.auth.getUser(user.id);
    const [extra] = await this.db.query(
      'SELECT bio,avatar_url FROM users WHERE id=$1',
      [user.id],
    );
    return {
      name: me.fullName,
      email: me.email,
      bio: extra.bio,
      avatar: extra.avatar_url,
      institution: this.config.get('SCHOOL_NAME', 'Instituição Noctua'),
      className:
        me.classes.map((c) => c.name).join(', ') || 'Sem turma vinculada',
      course:
        me.role === 'student'
          ? 'Estudante'
          : me.role === 'teacher'
            ? 'Professor(a)'
            : 'Coordenação',
      schoolTimezone: this.config.get('SCHOOL_TIMEZONE', 'America/Sao_Paulo'),
    };
  }
  async updateProfile(user: AuthRequestUser, dto: ProfileDto) {
    if (dto.name !== undefined && dto.name.trim().length < 2)
      throw new BadRequestException('Informe seu nome.');
    if (dto.avatar) this.validateLink({ name: 'Foto', url: dto.avatar });
    await this.db.query(
      'UPDATE users SET full_name=COALESCE($2,full_name),bio=COALESCE($3,bio),avatar_url=COALESCE($4,avatar_url),updated_at=NOW() WHERE id=$1',
      [user.id, dto.name?.trim(), dto.bio, dto.avatar],
    );
    return this.profile(user);
  }
  async preferences(user: AuthRequestUser) {
    const [row] = await this.db.query(
      `SELECT COALESCE(p.theme,'system') AS theme,COALESCE(p.high_contrast,FALSE) AS "highContrast",COALESCE(p.dyslexia_font,FALSE) AS "dyslexiaFont",COALESCE(p.email_reminders,FALSE) AS "emailReminders",COALESCE(n.in_app_enabled,TRUE) AS notifications,COALESCE(n.push_enabled,FALSE) AS "pushEnabled",COALESCE(n.remind_24_hours,TRUE) AS "remind24Hours",COALESCE(n.remind_48_hours,TRUE) AS "remind48Hours" FROM users u LEFT JOIN user_preferences p ON p.user_id=u.id LEFT JOIN notification_preferences n ON n.user_id=u.id WHERE u.id=$1`,
      [user.id],
    );
    return row;
  }
  async updatePreferences(user: AuthRequestUser, dto: PreferencesDto) {
    await this.db.transaction(async (manager) => {
      await manager.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [
        user.id,
      ]);
      await manager.query(
        'INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT DO NOTHING',
        [user.id],
      );
      await manager.query(
        'INSERT INTO notification_preferences (user_id) VALUES ($1) ON CONFLICT DO NOTHING',
        [user.id],
      );
      await manager.query(
        'UPDATE user_preferences SET theme=COALESCE($2,theme),high_contrast=COALESCE($3,high_contrast),dyslexia_font=COALESCE($4,dyslexia_font),email_reminders=COALESCE($5,email_reminders),updated_at=NOW() WHERE user_id=$1',
        [
          user.id,
          dto.theme,
          dto.highContrast,
          dto.dyslexiaFont,
          dto.emailReminders,
        ],
      );
      await manager.query(
        'UPDATE notification_preferences SET in_app_enabled=COALESCE($2,in_app_enabled),push_enabled=COALESCE($3,push_enabled),remind_24_hours=COALESCE($4,remind_24_hours),remind_48_hours=COALESCE($5,remind_48_hours),updated_at=NOW() WHERE user_id=$1',
        [
          user.id,
          dto.notifications,
          dto.pushEnabled,
          dto.remind24Hours,
          dto.remind48Hours,
        ],
      );
    });
    return this.preferences(user);
  }
  async users() {
    return this.db.query(
      `SELECT u.id,u.full_name AS name,u.email,u.role,COALESCE((SELECT json_agg(m.class_id) FROM class_memberships m WHERE m.student_id=u.id),'[]') AS class_ids,COALESCE((SELECT json_agg(json_build_object('class_id',cs.class_id,'subject_id',cs.subject_id)) FROM class_subjects cs WHERE cs.teacher_id=u.id),'[]') AS subjects FROM users u ORDER BY u.full_name`,
    );
  }
  async assignments(id: string, dto: AssignmentsDto) {
    await this.db.transaction(async (manager) => {
      const [user] = await manager.query(
        'SELECT id,role FROM users WHERE id=$1 FOR UPDATE',
        [id],
      );
      if (!user) throw new NotFoundException('Usuário não encontrado.');
      if (
        user.role === 'coordinator' ||
        (user.role === 'student' && dto.subjects.length) ||
        (user.role === 'teacher' && dto.class_ids.length)
      )
        throw new BadRequestException('Vínculos incompatíveis com o perfil.');
      if (user.role === 'student') {
        const ids = [...new Set(dto.class_ids)];
        const valid = await manager.query(
          'SELECT id FROM academic_classes WHERE id=ANY($1::uuid[])',
          [ids],
        );
        if (valid.length !== ids.length)
          throw new BadRequestException('Turma inválida.');
        await manager.query(
          'DELETE FROM class_memberships WHERE student_id=$1',
          [id],
        );
        await manager.query(
          'INSERT INTO class_memberships (student_id,class_id) SELECT $1,unnest($2::uuid[])',
          [id, ids],
        );
      } else {
        // Lock all slots in a stable order, including released slots, before validating reservations.
        await manager.query(
          'SELECT id FROM class_subjects ORDER BY id FOR UPDATE',
        );
        for (const slot of dto.subjects) {
          const [cs] = await manager.query(
            'SELECT teacher_id FROM class_subjects WHERE class_id=$1 AND subject_id=$2',
            [slot.class_id, slot.subject_id],
          );
          if (!cs) throw new BadRequestException('Disciplina inválida.');
          if (cs.teacher_id && cs.teacher_id !== id)
            throw new ConflictException(
              'Disciplina atribuída a outro professor.',
            );
          const reserved = await manager.query(
            'SELECT 1 FROM account_invitation_subjects ais JOIN account_invitations i ON i.id=ais.invitation_id WHERE ais.class_id=$1 AND ais.subject_id=$2 AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at>NOW()',
            [slot.class_id, slot.subject_id],
          );
          if (reserved.length)
            throw new ConflictException('Disciplina reservada por convite.');
        }
        await manager.query(
          'UPDATE class_subjects SET teacher_id=NULL WHERE teacher_id=$1',
          [id],
        );
        for (const slot of dto.subjects)
          await manager.query(
            'UPDATE class_subjects SET teacher_id=$1 WHERE class_id=$2 AND subject_id=$3',
            [id, slot.class_id, slot.subject_id],
          );
      }
    });
    return { updated: true };
  }
}
