import { JwtService } from '@nestjs/jwt';
import { WsJwtGuard } from './ws-jwt.guard';
import { ExecutionContext } from '@nestjs/common';
import { Socket } from 'socket.io';
import { Test, TestingModule } from '@nestjs/testing';
import { ACCESS_COOKIE } from '../auth-cookies';
import { WsException } from '@nestjs/websockets';
import { AuthService } from '../auth.service';

describe('WsJwtGuard', () => {
  let guard: WsJwtGuard;
  let jwtService: JwtService;

  const mockJwtService = {
    verify: jest.fn(),
  };
  const mockAuthService = {
    validateSession: jest.fn(),
  };

  // Хелпер для создания мок-контекста с нужными куками
  const createMockContext = (
    cookie?: string,
    auth?: Record<string, unknown>,
    user?: unknown,
  ): ExecutionContext => {
    const client = {
      user,
      handshake: {
        auth: auth ?? {},
        headers: {
          cookie,
        },
      },
    } as unknown as Socket;

    return {
      switchToWs: () => ({ getClient: () => client }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WsJwtGuard,
        { provide: JwtService, useValue: mockJwtService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    guard = module.get<WsJwtGuard>(WsJwtGuard);
    jwtService = module.get<JwtService>(JwtService);
    mockAuthService.validateSession.mockResolvedValue({ id: '1' });
  });

  afterEach(() => jest.clearAllMocks());

  it('should return true and attach user to client on valid token', async () => {
    const payload = { sub: '1', sid: 'session-1', email: 'test@example.com' };
    mockJwtService.verify.mockReturnValue(payload);

    const context = createMockContext(`${ACCESS_COOKIE}=valid-token`);
    const client = context.switchToWs().getClient() as any;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(client.user).toEqual(payload);
    expect(mockJwtService.verify).toHaveBeenCalledWith('valid-token');
    expect(mockAuthService.validateSession).toHaveBeenCalledWith(
      '1',
      'session-1',
    );
  });

  it('should prefer a token from Socket.IO auth payload', async () => {
    const payload = { sub: '1', sid: 'session-1', email: 'test@example.com' };
    mockJwtService.verify.mockReturnValue(payload);

    const context = createMockContext(`${ACCESS_COOKIE}=cookie-token`, {
      token: 'handshake-token',
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockJwtService.verify).toHaveBeenCalledWith('handshake-token');
  });

  it('revalidates a user already attached to the socket', async () => {
    const user = { sub: '1', sid: 'session-1', email: 'test@example.com' };
    const context = createMockContext(undefined, undefined, user);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockJwtService.verify).not.toHaveBeenCalled();
    expect(mockAuthService.validateSession).toHaveBeenCalledWith(
      '1',
      'session-1',
    );
  });

  it('should throw WsException if cookie header is missing', async () => {
    const context = createMockContext(undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(WsException);
    await expect(guard.canActivate(context)).rejects.toThrow('Unauthorized');
  });

  it('should throw WsException if access token cookie is absent', async () => {
    const context = createMockContext('other_cookie=some-value');

    await expect(guard.canActivate(context)).rejects.toThrow(WsException);
  });

  it('should throw WsException with "Invalid token" if jwt.verify throws', async () => {
    mockJwtService.verify.mockImplementation(() => {
      throw new Error();
    });
    const context = createMockContext(`${ACCESS_COOKIE}=bad-token`);

    await expect(guard.canActivate(context)).rejects.toThrow('Invalid token');
  });

  it('rejects realtime events after the session was removed', async () => {
    const user = { sub: '1', sid: 'deleted-session' };
    mockAuthService.validateSession.mockRejectedValue(new Error('revoked'));
    const context = createMockContext(undefined, undefined, user);

    await expect(guard.canActivate(context)).rejects.toThrow('Invalid token');
  });
});
