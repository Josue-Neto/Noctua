import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/auth.decorators';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { SchoolService } from './school.service';
import {
  ActivityDto,
  ActivityQuery,
  AssignmentsDto,
  ChecklistDto,
  LinkDto,
  PreferencesDto,
  ProfileDto,
} from './school.dto';

@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class SchoolController {
  constructor(private readonly school: SchoolService) {}
  @Get('me/activities') list(
    @Req() r: AuthenticatedRequest,
    @Query() q: ActivityQuery,
  ) {
    return this.school.list(r.user!, q);
  }
  @Get('staff/classes') catalog(@Req() r: AuthenticatedRequest) {
    return this.school.catalog(r.user!);
  }
  @Get('activities/:id') detail(
    @Req() r: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.school.detail(r.user!, id);
  }
  @Post('activities') @Roles('teacher', 'coordinator') create(
    @Req() r: AuthenticatedRequest,
    @Body() dto: ActivityDto,
  ) {
    return this.school.save(r.user!, dto);
  }
  @Patch('activities/:id') @Roles('teacher', 'coordinator') update(
    @Req() r: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActivityDto,
  ) {
    return this.school.save(r.user!, dto, id);
  }
  @Post('activities/:id/cancel') @Roles('teacher', 'coordinator') cancel(
    @Req() r: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.school.cancel(r.user!, id);
  }
  @Post('activities/:id/attachments') @Roles('teacher', 'coordinator') addLink(
    @Req() r: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LinkDto,
  ) {
    return this.school.addLink(r.user!, id, dto);
  }
  @Delete('activities/:id/attachments/:attachmentId')
  @Roles('teacher', 'coordinator')
  removeLink(
    @Req() r: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ) {
    return this.school.removeLink(r.user!, id, attachmentId);
  }
  @Put('activities/:id/checklist') @Roles('student') checklist(
    @Req() r: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChecklistDto,
  ) {
    return this.school.checklist(r.user!, id, dto.completed);
  }
  @Get('me/profile') profile(@Req() r: AuthenticatedRequest) {
    return this.school.profile(r.user!);
  }
  @Patch('me/profile') updateProfile(
    @Req() r: AuthenticatedRequest,
    @Body() dto: ProfileDto,
  ) {
    return this.school.updateProfile(r.user!, dto);
  }
  @Get('me/preferences') preferences(@Req() r: AuthenticatedRequest) {
    return this.school.preferences(r.user!);
  }
  @Patch('me/preferences') updatePreferences(
    @Req() r: AuthenticatedRequest,
    @Body() dto: PreferencesDto,
  ) {
    return this.school.updatePreferences(r.user!, dto);
  }
  @Get('staff/users') @Roles('coordinator') users() {
    return this.school.users();
  }
  @Put('staff/users/:id/assignments') @Roles('coordinator') assignments(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignmentsDto,
  ) {
    return this.school.assignments(id, dto);
  }
}
