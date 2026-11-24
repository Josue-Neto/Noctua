import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  HttpException,
  ServiceUnavailableException,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard, cookieValue } from './auth.guard';
import { AuthSecurityService } from './auth-security.service';
import { AuthService } from './auth.service';
import { AcceptInvitationDto, AddClassSubjectDto, ConfirmPasswordResetDto, CreateClassDto, CreateInvitationDto, LoginDto, RequestPasswordResetDto } from './auth.dto';
import { Roles } from './auth.decorators';
import { RolesGuard } from './roles.guard';
import type { AuthenticatedRequest } from './auth.types';

const cookieName = 'noctua_session';

function cookieOptions() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `Path=/; HttpOnly; SameSite=Lax${secure}`;
}

@Controller()
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly auth: AuthService, private readonly security: AuthSecurityService) {}

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response, @Req() request: Request) {
    const retry = await this.security.consume('login', request.ip ?? request.socket.remoteAddress ?? 'unknown', dto.email);
    if (retry) {
      response.setHeader('Retry-After', String(retry));
      throw new HttpException('Muitas tentativas. Aguarde antes de tentar novamente.', HttpStatus.TOO_MANY_REQUESTS);
    }
    let result: Awaited<ReturnType<AuthService['login']>>;
    try { result = await this.auth.login(dto.email, dto.password); }
    catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Falha ao autenticar.', error);
      throw new ServiceUnavailableException('Serviço temporariamente indisponível.');
    }
    response.setHeader('Set-Cookie', `${cookieName}=${encodeURIComponent(result.accessToken)}; ${cookieOptions()}; Max-Age=${Math.floor(result.maxAge / 1000)}`);
    return { user: result.user };
  }

  @Post('auth/logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) response: Response, @Req() request: Request) {
    let token: string | undefined;
    try { token = cookieValue(request.headers.cookie, cookieName); } catch { /* malformed cookie */ }
    await this.auth.logout(token);
    response.setHeader('Set-Cookie', `${cookieName}=; ${cookieOptions()}; Max-Age=0`);
    return { loggedOut: true };
  }

  @Get('auth/me')
  @UseGuards(AuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return this.auth.getUser(request.user!.id);
  }

  @Post('auth/password-reset/request')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto, @Req() request: Request) {
    const retry = await this.security.consume('reset', request.ip ?? request.socket.remoteAddress ?? 'unknown', dto.email);
    try {
      if (!retry) await this.auth.requestPasswordReset(dto.email);
    } catch (error) {
      this.logger.error('Password reset request could not be delivered or persisted.', error);
    }
    return { message: 'Se a conta existir, enviaremos instruções para o e-mail informado.' };
  }

  @Post('auth/password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto) {
    await this.auth.confirmPasswordReset(dto.token, dto.password);
    return { passwordUpdated: true };
  }

  @Get('auth/invitations/:token')
  previewInvitation(@Param('token') token: string) {
    return this.auth.previewInvitation(token);
  }

  @Post('auth/invitations/accept')
  @HttpCode(HttpStatus.CREATED)
  acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.auth.acceptInvitation(dto.token, dto.full_name, dto.password);
  }

  @Get('staff/catalog')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('coordinator')
  catalog() {
    return this.auth.listCatalog();
  }

  @Post('staff/catalog/classes')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('coordinator')
  createClass(@Body() dto: CreateClassDto) {
    return this.auth.createClass(dto);
  }

  @Post('staff/catalog/classes/:classId/subjects')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('coordinator')
  addClassSubject(@Param('classId', new ParseUUIDPipe()) classId: string, @Body() dto: AddClassSubjectDto) {
    return this.auth.addClassSubject(classId, dto);
  }

  @Get('staff/invitations')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('coordinator')
  invitations() {
    return this.auth.listInvitations();
  }

  @Post('staff/invitations')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('coordinator')
  createInvitation(@Body() dto: CreateInvitationDto, @Req() request: AuthenticatedRequest) {
    return this.auth.createInvitation(dto, request.user!);
  }

  @Post('staff/invitations/:id/revoke')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('coordinator')
  revokeInvitation(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.auth.revokeInvitation(id);
  }
}
