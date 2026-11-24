import assert from 'node:assert/strict';
import test from 'node:test';
import { UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '../src/auth/auth.guard';
import { RolesGuard } from '../src/auth/roles.guard';
import { AuthService } from '../src/auth/auth.service';
import { AuthController } from '../src/auth/auth.controller';
import { CsrfGuard } from '../src/auth/csrf.guard';
import * as argon2 from 'argon2';

const student = {
  id: '5db82764-862f-4eb3-b317-2ce8d2ee46f0',
  email: 'aluno@escola.edu.br',
  full_name: 'Pessoa Estudante',
  role: 'student' as const,
};

test('login normalizes email and returns the server-side role and memberships', async () => {
  const passwordHash = await argon2.hash('senha-segura-123');
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const dataSource = {
    query: async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      if (sql.includes('password_hash')) return [{ ...student, password_hash: passwordHash }];
      if (sql.includes('SELECT id, full_name, email, role')) return [student];
      if (sql.includes('JOIN class_memberships')) return [{ id: 'class-1', name: '3A', school_year: 3 }];
      return [];
    },
    transaction: async (callback: (manager: unknown) => unknown) => callback({ query: async (sql: string) => sql.includes('SELECT password_hash') ? [{ password_hash: passwordHash }] : [] }),
  };
  const jwt = { signAsync: async (payload: unknown) => JSON.stringify(payload) };
  const mailer = { sendAccountLink: async () => undefined };
  const config = { get: (_key: string, fallback?: string) => fallback ?? 'http://localhost:5173' };
  const service = new AuthService(dataSource as never, jwt as never, mailer as never, config as never);

  const result = await service.login('  ALUNO@ESCOLA.EDU.BR ', 'senha-segura-123');

  assert.equal(result.user.role, 'student');
  assert.equal(result.user.classes[0].id, 'class-1');
  assert.equal(calls[0].params[0], 'aluno@escola.edu.br');
  assert.equal(result.maxAge, 3_600_000);
});

test('login rejects unknown users and wrong passwords with the same error', async () => {
  const passwordHash = await argon2.hash('senha-correta-123');
  const dataSource = {
    query: async (_sql: string, params: unknown[] = []) => params[0] === 'ausente@escola.edu.br'
      ? []
      : [{ ...student, password_hash: passwordHash }],
  };
  const service = new AuthService(dataSource as never, {} as never, {} as never, {} as never);

  await assert.rejects(service.login('ausente@escola.edu.br', 'senha-incorreta'), UnauthorizedException);
  await assert.rejects(service.login(student.email, 'senha-incorreta'), UnauthorizedException);
});

test('invitation preview does not accept a missing or expired token', async () => {
  const dataSource = { query: async () => [] };
  const service = new AuthService(dataSource as never, {} as never, {} as never, {} as never);
  await assert.rejects(service.previewInvitation('token-invalido'), BadRequestException);
});

test('invitation acceptance rejects revoked, expired, or already-used tokens before creating a user', async () => {
  let userInsertCount = 0;
  const manager = {
    query: async (sql: string) => {
      if (sql.includes('SELECT id, email, role FROM account_invitations')) return [];
      if (sql.includes('INSERT INTO users')) userInsertCount += 1;
      return [];
    },
  };
  const dataSource = { transaction: async (callback: (manager: unknown) => unknown) => callback(manager) };
  const service = new AuthService(dataSource as never, {} as never, {} as never, {} as never);
  await assert.rejects(service.acceptInvitation('expired-token', 'Pessoa Teste', 'senha-segura-123'), BadRequestException);
  assert.equal(userInsertCount, 0);
});

test('password reset rejects an expired or previously used token', async () => {
  const manager = { query: async () => [] };
  const dataSource = { transaction: async (callback: (manager: unknown) => unknown) => callback(manager) };
  const service = new AuthService(dataSource as never, {} as never, {} as never, {} as never);
  await assert.rejects(service.confirmPasswordReset('expired-token', 'nova-senha-segura'), BadRequestException);
});

test('roles guard denies a student even if the request was crafted manually', () => {
  const reflector = { getAllAndOverride: () => ['coordinator'] };
  const guard = new RolesGuard(reflector as never);
  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user: { id: student.id, role: 'student' } }) }),
  };
  assert.throws(() => guard.canActivate(context as never), ForbiddenException);
});

test('auth guard reads current account state from the database, not the token role', async () => {
  const jwt = { verifyAsync: async () => ({ sub: student.id, sid: '5db82764-862f-4eb3-b317-2ce8d2ee46f0', role: 'coordinator' }) };
  const dataSource = { query: async () => [{ id: student.id, email: student.email, role: 'student' }] };
  const guard = new AuthGuard(jwt as never, dataSource as never);
  const request: { headers: Record<string, string>; user?: unknown } = { headers: { cookie: 'noctua_session=session' } };
  const context = { switchToHttp: () => ({ getRequest: () => request }) };

  assert.equal(await guard.canActivate(context as never), true);
  assert.equal((request.user as { role: string }).role, 'student');
});

test('CSRF guard accepts the configured browser origin only with the custom request header', () => {
  const previousOrigin = process.env.FRONTEND_URL;
  process.env.FRONTEND_URL = 'http://localhost:5173';
  const guard = new CsrfGuard();
  const contextFor = (origin: string, marker?: string) => ({
    switchToHttp: () => ({ getRequest: () => ({ method: 'POST', headers: { origin, 'x-noctua-request': marker } }) }),
  });
  try {
    assert.equal(guard.canActivate(contextFor('http://localhost:5173', '1') as never), true);
    assert.throws(() => guard.canActivate(contextFor('https://malicious.example', '1') as never));
    assert.throws(() => guard.canActivate(contextFor('http://localhost:5173') as never));
  } finally {
    if (previousOrigin === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = previousOrigin;
  }
});

test('password reset uses the same public response regardless of whether the email exists', async () => {
  const service = {
    requestPasswordReset: async (email: string) => {
      if (email === 'known@escola.edu.br') throw new Error('SMTP unavailable');
    },
  };
  const controller = new AuthController(service as never, { consume: async () => 0 } as never);
  const request = { ip: '127.0.0.1' } as never;
  const known = await controller.requestPasswordReset({ email: 'known@escola.edu.br' }, request);
  const unknown = await controller.requestPasswordReset({ email: 'unknown@escola.edu.br' }, request);
  assert.deepEqual(known, unknown);
});

test('successful login sets an HttpOnly, SameSite=Lax session cookie', async () => {
  const service = {
    login: async () => ({ accessToken: 'signed-token', user: { id: student.id, role: 'student' }, maxAge: 3_600_000 }),
  };
  const controller = new AuthController(service as never, { consume: async () => 0 } as never);
  let cookie = '';
  await controller.login({ email: student.email, password: 'senha-segura-123' }, {
    setHeader: (_name: string, value: string) => { cookie = value; },
  } as never, { ip: '127.0.0.1' } as never);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Max-Age=3600/);
});
