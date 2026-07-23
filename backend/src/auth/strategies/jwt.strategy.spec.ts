import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const authService = {
    validateSession: jest.fn(),
  };
  const config = {
    get: jest.fn().mockReturnValue('access-secret'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates both the user and session id from the access token', async () => {
    const user = { id: 'user-1' };
    authService.validateSession.mockResolvedValue(user);
    const strategy = new JwtStrategy(
      config as unknown as ConfigService,
      authService as unknown as AuthService,
    );

    await expect(
      strategy.validate({
        sub: user.id,
        email: 'user@example.com',
        sid: 'session-1',
      }),
    ).resolves.toBe(user);
    expect(authService.validateSession).toHaveBeenCalledWith(
      user.id,
      'session-1',
    );
  });

  it('rejects access tokens without a session id', async () => {
    authService.validateSession.mockRejectedValue(new UnauthorizedException());
    const strategy = new JwtStrategy(
      config as unknown as ConfigService,
      authService as unknown as AuthService,
    );

    await expect(
      strategy.validate({ sub: 'user-1', email: 'user@example.com' }),
    ).rejects.toThrow(UnauthorizedException);
    expect(authService.validateSession).toHaveBeenCalledWith('user-1', '');
  });
});
