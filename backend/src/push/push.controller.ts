import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/auth.decorators';
import { RolesGuard } from '../auth/roles.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { SubscribeDto, UnsubscribeDto } from './push.dto';
import { PushService } from './push.service';
@Controller('me/push')
@UseGuards(AuthGuard, RolesGuard)
@Roles('student')
export class PushController {
  constructor(private readonly push: PushService) {}
  @Get('key') key() {
    return this.push.publicKey();
  }
  @Post('subscriptions') subscribe(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SubscribeDto,
  ) {
    return this.push.subscribe(req.user!.id, dto);
  }
  @Delete('subscriptions') unsubscribe(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UnsubscribeDto,
  ) {
    return this.push.unsubscribe(req.user!.id, dto.endpoint);
  }
}
