import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const port = Number(config.get('DB_PORT', '5432'));
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
          throw new Error('DB_PORT must be an integer between 1 and 65535');
        }

        return {
          type: 'postgres' as const,
          host: config.getOrThrow<string>('DB_HOST'),
          port,
          username: config.getOrThrow<string>('DB_USER'),
          password: config.getOrThrow<string>('DB_PASSWORD'),
          database: config.getOrThrow<string>('DB_NAME'),
          autoLoadEntities: true,
          synchronize: false,
        };
      },
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
