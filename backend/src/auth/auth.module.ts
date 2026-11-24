import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MailerService } from './mailer.service';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
import { AuthSecurityService } from './auth-security.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.getOrThrow<string>('JWT_SECRET');
        if (config.get<string>('NODE_ENV') === 'production' && (secret.length < 32 || secret.startsWith('replace-with-'))) {
          throw new Error('JWT_SECRET must be a unique secret with at least 32 characters in production.');
        }
        return {
          secret,
          signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '1h') as `${number}${'s' | 'm' | 'h' | 'd'}` },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, MailerService, AuthGuard, RolesGuard, AuthSecurityService],
  exports: [AuthGuard, RolesGuard, AuthService, JwtModule],
})
export class AuthModule {}
