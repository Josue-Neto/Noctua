import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import * as argon2 from 'argon2';
import { DataSource } from 'typeorm';
import { MailerService } from './mailer.service';
import type { AuthRequestUser, AuthUser, UserRole } from './auth.types';
import type { CreateInvitationDto } from './auth.dto';
import type { AddClassSubjectDto, CreateClassDto } from './auth.dto';

function randomToken() {
  return randomBytes(32).toString('hex');
}

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly jwt: JwtService,
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const rows = (await this.dataSource.query(
      'SELECT id, email, full_name, password_hash, role FROM users WHERE LOWER(email) = $1',
      [normalizeEmail(email)],
    )) as Array<{
      id: string;
      email: string;
      full_name: string;
      password_hash: string;
      role: UserRole;
    }>;
    const user = rows[0];
    if (!user || !(await argon2.verify(user.password_hash, password))) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }
    const duration = this.config.get<string>('JWT_EXPIRES_IN', '1h');
    const match = /^(\d+)(s|m|h|d)$/.exec(duration);
    if (!match) throw new Error('JWT_EXPIRES_IN must use seconds, minutes, hours or days');
    const seconds = Number(match[1]) * ({ s: 1, m: 60, h: 3600, d: 86400 }[match[2]]!);
    if (!Number.isSafeInteger(seconds) || seconds < 1) throw new Error('Invalid JWT_EXPIRES_IN');
    const sid = randomUUID();
    const expiresAt = new Date(Date.now() + seconds * 1000);
    const accessToken = await this.dataSource.transaction(async manager => {
      const [current] = await manager.query('SELECT password_hash FROM users WHERE id=$1 FOR UPDATE', [user.id]);
      if (!current || current.password_hash !== user.password_hash) throw new UnauthorizedException('E-mail ou senha inválidos.');
      const token = await this.jwt.signAsync({ sub: user.id, sid }, { expiresIn: seconds });
      await manager.query('INSERT INTO auth_sessions (id,user_id,expires_at) VALUES ($1,$2,$3)', [sid, user.id, expiresAt]);
      return token;
    });
    const maxAge = seconds * 1000;
    return {
      accessToken,
      maxAge,
      user: await this.getUser(user.id),
    };
  }

  async logout(token?: string) {
    if (!token) return;
    let payload: { sub?: string; sid?: string };
    try {
      payload = await this.jwt.verifyAsync(token);
      if (!payload.sub || !payload.sid || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.sid)) return;
    } catch { return; }
    try {
      await this.dataSource.query('UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,NOW()) WHERE id=$1 AND user_id=$2', [payload.sid, payload.sub]);
    } catch { throw new ServiceUnavailableException('Serviço temporariamente indisponível.'); }
  }

  async getUser(userId: string): Promise<AuthUser> {
    const rows = (await this.dataSource.query(
      `SELECT id, full_name, email, role FROM users WHERE id = $1`,
      [userId],
    )) as Array<{
      id: string;
      full_name: string;
      email: string;
      role: UserRole;
    }>;
    const row = rows[0];
    if (!row) throw new UnauthorizedException('Conta não encontrada.');

    let classRows: Array<{ id: string; name: string; school_year: number }> =
      [];
    let subjectRows: Array<{
      id: string;
      name: string;
      class_id: string;
      class_name: string;
    }> = [];
    if (row.role === 'student') {
      classRows = await this.dataSource.query(
        `SELECT c.id, c.name, c.school_year FROM academic_classes c
         JOIN class_memberships m ON m.class_id = c.id WHERE m.student_id = $1 ORDER BY c.name`,
        [userId],
      );
    } else if (row.role === 'teacher') {
      subjectRows = await this.dataSource.query(
        `SELECT s.id, s.name, c.id AS class_id, c.name AS class_name
         FROM class_subjects cs JOIN academic_classes c ON c.id = cs.class_id
         JOIN subjects s ON s.id = cs.subject_id WHERE cs.teacher_id = $1 ORDER BY c.name, s.name`,
        [userId],
      );
      classRows = await this.dataSource.query(
        `SELECT DISTINCT c.id, c.name, c.school_year FROM academic_classes c
         JOIN class_subjects cs ON cs.class_id = c.id WHERE cs.teacher_id = $1 ORDER BY c.name`,
        [userId],
      );
    } else {
      classRows = await this.dataSource.query(
        'SELECT id, name, school_year FROM academic_classes ORDER BY name',
      );
    }
    return {
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      role: row.role,
      classes: classRows.map((item) => ({
        id: item.id,
        name: item.name,
        schoolYear: Number(item.school_year),
      })),
      subjects: subjectRows.map((item) => ({
        id: item.id,
        name: item.name,
        classId: item.class_id,
        className: item.class_name,
      })),
    };
  }

  async requestPasswordReset(email: string) {
    const normalized = normalizeEmail(email);
    const rows = (await this.dataSource.query(
      'SELECT id FROM users WHERE LOWER(email) = $1',
      [normalized],
    )) as Array<{ id: string }>;
    if (!rows[0]) return;

    const token = randomToken();
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
        [rows[0].id],
      );
      await manager.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
        [rows[0].id, tokenHash(token)],
      );
    });
    const url = `${this.frontendUrl()}/redefinir-senha?token=${encodeURIComponent(token)}`;
    await this.mailer.sendAccountLink(
      normalized,
      'Redefina sua senha do Noctua',
      'redefinir senha',
      url,
    );
  }

  async confirmPasswordReset(token: string, password: string) {
    const hash = tokenHash(token);
    await this.dataSource.transaction(async (manager) => {
      const rows = (await manager.query(
        `SELECT id, user_id FROM password_reset_tokens
         WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW() FOR UPDATE`,
        [hash],
      )) as Array<{ id: string; user_id: string }>;
      if (!rows[0])
        throw new BadRequestException(
          'Este link de recuperação é inválido ou expirou.',
        );
      const passwordHash = await argon2.hash(password, {
        type: argon2.argon2id,
      });
      await manager.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [passwordHash, rows[0].user_id],
      );
      await manager.query('UPDATE auth_sessions SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL', [rows[0].user_id]);
      await manager.query(
        'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
        [rows[0].id],
      );
      await manager.query(
        'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
        [rows[0].user_id],
      );
    });
  }

  async listCatalog() {
    return this.dataSource.query(
      `SELECT c.id AS class_id, c.name AS class_name, c.school_year,
        s.id AS subject_id, s.name AS subject_name, cs.teacher_id,
        EXISTS (
          SELECT 1 FROM account_invitation_subjects ais
          JOIN account_invitations i ON i.id = ais.invitation_id
          WHERE ais.class_id = c.id AND ais.subject_id = s.id
            AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > NOW()
        ) AS reserved
       FROM academic_classes c
       LEFT JOIN class_subjects cs ON cs.class_id = c.id
       LEFT JOIN subjects s ON s.id = cs.subject_id
       ORDER BY c.name, s.name`,
    ) as Promise<
      Array<{
        class_id: string;
        class_name: string;
        school_year: number;
        subject_id: string | null;
        subject_name: string | null;
        teacher_id: string | null;
        reserved: boolean;
      }>
    >;
  }

  async createClass(dto: CreateClassDto) {
    if (!dto.name.trim())
      throw new BadRequestException('Informe o nome da turma.');
    try {
      const rows = (await this.dataSource.query(
        'INSERT INTO academic_classes (name, school_year) VALUES ($1, $2) RETURNING id, name, school_year',
        [dto.name.trim(), dto.school_year],
      )) as Array<{ id: string; name: string; school_year: number }>;
      return {
        id: rows[0].id,
        name: rows[0].name,
        schoolYear: Number(rows[0].school_year),
      };
    } catch (error) {
      if ((error as { code?: string }).code === '23505')
        throw new ConflictException('Já existe uma turma com esse nome e ano.');
      throw error;
    }
  }

  async addClassSubject(classId: string, dto: AddClassSubjectDto) {
    if (!dto.subject_name.trim())
      throw new BadRequestException('Informe o nome da disciplina.');
    const classRows = await this.dataSource.query(
      'SELECT id FROM academic_classes WHERE id = $1',
      [classId],
    );
    if (!classRows.length)
      throw new BadRequestException('Turma não encontrada.');
    const subjectRows = (await this.dataSource.query(
      `INSERT INTO subjects (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id, name`,
      [dto.subject_name.trim()],
    )) as Array<{ id: string; name: string }>;
    await this.dataSource.query(
      `INSERT INTO class_subjects (class_id, subject_id) VALUES ($1, $2) ON CONFLICT (class_id, subject_id) DO NOTHING`,
      [classId, subjectRows[0].id],
    );
    return {
      classId,
      subjectId: subjectRows[0].id,
      subjectName: subjectRows[0].name,
    };
  }

  async listInvitations() {
    const invites = (await this.dataSource.query(
      `SELECT i.id, i.email, i.role, i.created_at, i.expires_at, i.revoked_at,
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name, 'schoolYear', c.school_year))
          FILTER (WHERE c.id IS NOT NULL), '[]') AS classes,
        COALESCE(json_agg(DISTINCT jsonb_build_object('classId', c2.id, 'className', c2.name, 'subjectId', s.id, 'subjectName', s.name))
          FILTER (WHERE s.id IS NOT NULL), '[]') AS subjects
       FROM account_invitations i
       LEFT JOIN account_invitation_classes ic ON ic.invitation_id = i.id
       LEFT JOIN academic_classes c ON c.id = ic.class_id
       LEFT JOIN account_invitation_subjects ais ON ais.invitation_id = i.id
       LEFT JOIN academic_classes c2 ON c2.id = ais.class_id
       LEFT JOIN subjects s ON s.id = ais.subject_id
       WHERE i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > NOW()
       GROUP BY i.id ORDER BY i.created_at DESC`,
    )) as Array<Record<string, unknown>>;
    return invites;
  }

  async createInvitation(dto: CreateInvitationDto, creator: AuthRequestUser) {
    const email = normalizeEmail(dto.email);
    const classes = [...new Set(dto.class_ids ?? [])];
    const subjects = dto.subjects ?? [];
    if (dto.role === 'student' && (!classes.length || subjects.length)) {
      throw new BadRequestException(
        'Estudantes precisam ser associados a pelo menos uma turma.',
      );
    }
    if (dto.role === 'teacher' && (!subjects.length || classes.length)) {
      throw new BadRequestException(
        'Professores precisam ser associados a pelo menos uma turma e disciplina.',
      );
    }
    if (dto.role === 'coordinator' && (classes.length || subjects.length)) {
      throw new BadRequestException(
        'A coordenação tem acesso a todas as turmas da instituição.',
      );
    }
    if (
      new Set(subjects.map((item) => `${item.class_id}:${item.subject_id}`))
        .size !== subjects.length
    ) {
      throw new BadRequestException('Há disciplinas repetidas no convite.');
    }

    const existingUser = await this.dataSource.query(
      'SELECT id FROM users WHERE LOWER(email) = $1',
      [email],
    );
    if (existingUser.length)
      throw new ConflictException('Já existe uma conta com este e-mail.');

    const token = randomToken();
    const invitationId = await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `DELETE FROM account_invitation_subjects ais USING account_invitations i
         WHERE ais.invitation_id = i.id
         AND (i.expires_at <= NOW() OR i.revoked_at IS NOT NULL OR i.accepted_at IS NOT NULL OR LOWER(i.email) = $1)`,
        [email],
      );
      await manager.query(
        `UPDATE account_invitations SET revoked_at = NOW()
         WHERE LOWER(email) = $1 AND accepted_at IS NULL AND revoked_at IS NULL`,
        [email],
      );
      const rows = (await manager.query(
        `INSERT INTO account_invitations (email, role, token_hash, created_by, expires_at)
         VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days') RETURNING id`,
        [email, dto.role, tokenHash(token), creator.id],
      )) as Array<{ id: string }>;
      const id = rows[0].id;

      if (classes.length) {
        const valid = (await manager.query(
          'SELECT id FROM academic_classes WHERE id = ANY($1::uuid[])',
          [classes],
        )) as Array<{ id: string }>;
        if (valid.length !== classes.length)
          throw new BadRequestException('Uma ou mais turmas não existem.');
        await manager.query(
          `INSERT INTO account_invitation_classes (invitation_id, class_id)
           SELECT $1, unnest($2::uuid[])`,
          [id, classes],
        );
      }
      if (subjects.length) {
        for (const assignment of subjects) {
          const valid = (await manager.query(
            `SELECT cs.teacher_id FROM class_subjects cs
             WHERE cs.class_id = $1 AND cs.subject_id = $2 FOR UPDATE`,
            [assignment.class_id, assignment.subject_id],
          )) as Array<{ teacher_id: string | null }>;
          if (!valid[0])
            throw new BadRequestException(
              'Uma turma e disciplina associadas não existem.',
            );
          if (valid[0].teacher_id)
            throw new ConflictException(
              'Uma das disciplinas já está atribuída a um professor.',
            );
          const reserved = await manager.query(
            'SELECT invitation_id FROM account_invitation_subjects WHERE class_id = $1 AND subject_id = $2',
            [assignment.class_id, assignment.subject_id],
          );
          if (reserved.length)
            throw new ConflictException(
              'Uma das disciplinas já está reservada por outro convite pendente.',
            );
          await manager.query(
            `INSERT INTO account_invitation_subjects (invitation_id, class_id, subject_id) VALUES ($1, $2, $3)`,
            [id, assignment.class_id, assignment.subject_id],
          );
        }
      }
      return id;
    });

    const url = `${this.frontendUrl()}/convite/aceitar?token=${encodeURIComponent(token)}`;
    try {
      await this.mailer.sendAccountLink(
        email,
        'Seu convite para o Noctua',
        'convite',
        url,
      );
    } catch (error) {
      await this.dataSource.query(
        'UPDATE account_invitations SET revoked_at = NOW() WHERE id = $1',
        [invitationId],
      );
      throw error;
    }
    return { id: invitationId, email, role: dto.role, expiresInDays: 7 };
  }

  async previewInvitation(token: string) {
    const rows = (await this.dataSource.query(
      `SELECT i.email, i.role, i.expires_at,
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name)) FILTER (WHERE c.id IS NOT NULL), '[]') AS classes,
        COALESCE(json_agg(DISTINCT jsonb_build_object('classId', c2.id, 'className', c2.name, 'subjectName', s.name)) FILTER (WHERE s.id IS NOT NULL), '[]') AS subjects
       FROM account_invitations i
       LEFT JOIN account_invitation_classes ic ON ic.invitation_id = i.id
       LEFT JOIN academic_classes c ON c.id = ic.class_id
       LEFT JOIN account_invitation_subjects ais ON ais.invitation_id = i.id
       LEFT JOIN academic_classes c2 ON c2.id = ais.class_id
       LEFT JOIN subjects s ON s.id = ais.subject_id
       WHERE i.token_hash = $1 AND i.revoked_at IS NULL AND i.accepted_at IS NULL AND i.expires_at > NOW()
       GROUP BY i.id`,
      [tokenHash(token)],
    )) as Array<Record<string, unknown>>;
    if (!rows[0])
      throw new BadRequestException('Este convite é inválido ou expirou.');
    return rows[0];
  }

  async acceptInvitation(token: string, fullName: string, password: string) {
    const normalizedName = fullName.trim();
    if (normalizedName.length < 2 || normalizedName.length > 100) {
      throw new BadRequestException(
        'Informe um nome com pelo menos dois caracteres.',
      );
    }
    const hash = tokenHash(token);
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const userId = await this.dataSource.transaction(async (manager) => {
      const rows = (await manager.query(
        `SELECT id, email, role FROM account_invitations
         WHERE token_hash = $1 AND revoked_at IS NULL AND accepted_at IS NULL AND expires_at > NOW() FOR UPDATE`,
        [hash],
      )) as Array<{ id: string; email: string; role: UserRole }>;
      const invitation = rows[0];
      if (!invitation)
        throw new BadRequestException('Este convite é inválido ou expirou.');
      const duplicates = await manager.query(
        'SELECT id FROM users WHERE LOWER(email) = $1',
        [normalizeEmail(invitation.email)],
      );
      if (duplicates.length)
        throw new ConflictException('Já existe uma conta com este e-mail.');

      const created = (await manager.query(
        `INSERT INTO users (full_name, email, password_hash, role)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          normalizedName,
          normalizeEmail(invitation.email),
          passwordHash,
          invitation.role,
        ],
      )) as Array<{ id: string }>;
      const id = created[0].id;
      if (invitation.role === 'student') {
        await manager.query(
          `INSERT INTO class_memberships (class_id, student_id)
           SELECT class_id, $2 FROM account_invitation_classes WHERE invitation_id = $1`,
          [invitation.id, id],
        );
      } else if (invitation.role === 'teacher') {
        const assigned = (await manager.query(
          `WITH assigned AS (UPDATE class_subjects cs SET teacher_id = $2
           FROM account_invitation_subjects ias
           WHERE ias.invitation_id = $1 AND cs.class_id = ias.class_id AND cs.subject_id = ias.subject_id
           AND cs.teacher_id IS NULL RETURNING cs.class_id) SELECT class_id FROM assigned`,
          [invitation.id, id],
        )) as Array<{ class_id: string }>;
        const requested = (await manager.query(
          'SELECT COUNT(*)::int AS count FROM account_invitation_subjects WHERE invitation_id = $1',
          [invitation.id],
        )) as Array<{ count: number }>;
        if (assigned.length !== Number(requested[0].count)) {
          throw new ConflictException(
            'Uma ou mais disciplinas foram atribuídas desde a criação do convite.',
          );
        }
      }
      await manager.query(
        'UPDATE account_invitations SET accepted_at = NOW() WHERE id = $1',
        [invitation.id],
      );
      await manager.query(
        'DELETE FROM account_invitation_subjects WHERE invitation_id = $1',
        [invitation.id],
      );
      return id;
    });
    return this.getUser(userId);
  }

  async revokeInvitation(id: string) {
    await this.dataSource.transaction(async (manager) => {
      const result = await manager.query(
        `WITH revoked AS (UPDATE account_invitations SET revoked_at = NOW()
         WHERE id = $1 AND accepted_at IS NULL AND revoked_at IS NULL RETURNING id) SELECT id FROM revoked`,
        [id],
      );
      if (!result.length)
        throw new BadRequestException(
          'Convite não encontrado ou já encerrado.',
        );
      await manager.query(
        'DELETE FROM account_invitation_subjects WHERE invitation_id = $1',
        [id],
      );
    });
    return { revoked: true };
  }

  private frontendUrl() {
    return (
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173'
    ).replace(/\/$/, '');
  }
}
