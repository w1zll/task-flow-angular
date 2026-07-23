import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '@/users/entities/user.entity';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthController } from './auth.controller';
import { BoardsModule } from '@/boards/boards.module';
import { UsersModule } from '@/users/users.module';
import { WorkspacesModule } from '@/workspaces/workspaces.module';
import { AuthIdentity } from './entities/auth-identity.entity';
import { OAuthAttempt } from './entities/oauth-attempt.entity';
import { AuthAuditEvent } from './entities/auth-audit-event.entity';
import { OAuthProviderService } from './oauth/oauth-provider.service';
import { OAuthService } from './oauth/oauth.service';
import { InMemoryRateLimiterService } from '@/common/rate-limit/in-memory-rate-limiter.service';
import { OAuthAvatarService } from './oauth/oauth-avatar.service';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: config.get('JWT_ACCESS_EXPIRES_TIME') ?? '15m',
        },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      User,
      RefreshToken,
      AuthIdentity,
      OAuthAttempt,
      AuthAuditEvent,
    ]),
    UsersModule,
    WorkspacesModule,
    forwardRef(() => BoardsModule),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    OAuthProviderService,
    OAuthService,
    OAuthAvatarService,
    InMemoryRateLimiterService,
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
