import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ACCESS_COOKIE } from '../auth-cookies';
import { AuthService } from '../auth.service';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();

    try {
      let payload = (client as any).user as
        | { sub?: string; sid?: string }
        | undefined;
      if (!payload) {
        const token =
          this.getHandshakeAuthToken(client) ?? this.getCookieAccessToken(client);
        if (!token) throw new WsException('Unauthorized');
        payload = this.jwtService.verify(token);
      }

      if (!payload.sub || !payload.sid) throw new WsException('Unauthorized');
      await this.authService.validateSession(payload.sub, payload.sid);
      (client as any).user = payload;
      return true;
    } catch (error) {
      if (error instanceof WsException) throw error;
      throw new WsException('Invalid token');
    }
  }

  private getHandshakeAuthToken(client: Socket): string | undefined {
    const token = client.handshake.auth?.token;
    return typeof token === 'string' && token ? token : undefined;
  }

  private getCookieAccessToken(client: Socket): string | undefined {
    return client.handshake.headers.cookie
      ?.split('; ')
      .find((c) => c.startsWith(`${ACCESS_COOKIE}=`))
      ?.split('=')[1];
  }
}
