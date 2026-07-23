import type { Request } from 'express';
import { describeSession, getRequestSessionMetadata } from './session-metadata';

describe('session metadata', () => {
  it('normalizes proxy IP and limits stored headers', () => {
    const request = {
      ip: '::ffff:192.0.2.10',
      get: jest.fn().mockReturnValue('x'.repeat(600)),
    } as unknown as Request;

    expect(getRequestSessionMetadata(request)).toEqual({
      ipAddress: '192.0.2.10',
      userAgent: 'x'.repeat(500),
    });
  });

  it('describes a browser without exposing the raw user agent', () => {
    expect(
      describeSession(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0 Safari/537.36',
      ),
    ).toEqual({
      deviceName: 'desktop',
      browser: 'Chrome',
      os: 'Windows',
    });
  });

  it('provides nullable fallbacks for legacy sessions', () => {
    expect(describeSession(null)).toEqual({
      deviceName: null,
      browser: null,
      os: null,
    });
  });
});
