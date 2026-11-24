import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SchoolController } from './school.controller';
import { SchoolService } from './school.service';
import { PushController } from '../push/push.controller';
import { PushService } from '../push/push.service';
@Module({
  imports: [AuthModule],
  controllers: [SchoolController, PushController],
  providers: [SchoolService, PushService],
})
export class SchoolModule {}
