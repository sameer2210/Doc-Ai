import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerUserGuard } from './throttler-user.guard';
import { getOptionsToken, getStorageToken } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@config/config.service';
import type { Request } from 'express';
import * as jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

describe('ThrottlerUserGuard', () => {
  let guard: ThrottlerUserGuard;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThrottlerUserGuard,
        {
          provide: getOptionsToken(),
          useValue: {},
        },
        {
          provide: getStorageToken(),
          useValue: {},
        },
        {
          provide: Reflector,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {
            jwtSecret: 'test-secret',
          },
        },
      ],
    }).compile();

    guard = module.get<ThrottlerUserGuard>(ThrottlerUserGuard);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('getTracker', () => {
    it('should return userId from request.user.userId if present', async () => {
      const mockRequest = {
        user: { userId: 'user-123' },
        ip: '127.0.0.1',
        headers: {},
      } as unknown as Request;

      const tracker = await guard['getTracker'](mockRequest);
      expect(tracker).toBe('user-123');
    });

    it('should return id from request.user.id if present', async () => {
      const mockRequest = {
        user: { id: 'user-456' },
        ip: '127.0.0.1',
        headers: {},
      } as unknown as Request;

      const tracker = await guard['getTracker'](mockRequest);
      expect(tracker).toBe('user-456');
    });

    it('should return ip if request has no user and no authorization token', async () => {
      const mockRequest = {
        ip: '127.0.0.1',
        headers: {},
      } as unknown as Request;

      const tracker = await guard['getTracker'](mockRequest);
      expect(tracker).toBe('127.0.0.1');
    });

    it('should return ip if request has invalid authorization header format', async () => {
      const mockRequest = {
        ip: '127.0.0.1',
        headers: {
          authorization: 'InvalidToken format',
        },
      } as unknown as Request;

      const tracker = await guard['getTracker'](mockRequest);
      expect(tracker).toBe('127.0.0.1');
    });

    it('should return decoded sub from token if bearer token is valid', async () => {
      const mockRequest = {
        ip: '127.0.0.1',
        headers: {
          authorization: 'Bearer valid-jwt-token',
        },
      } as unknown as Request;

      (jest.spyOn(jwt, 'verify') as any).mockReturnValue({ sub: 'user-789' });

      const tracker = await guard['getTracker'](mockRequest);
      expect(tracker).toBe('user-789');
    });

    it('should return decoded userId from token if sub is not present but userId is', async () => {
      const mockRequest = {
        ip: '127.0.0.1',
        headers: {
          authorization: 'Bearer valid-jwt-token',
        },
      } as unknown as Request;

      (jest.spyOn(jwt, 'verify') as any).mockReturnValue({ userId: 'user-abc' });

      const tracker = await guard['getTracker'](mockRequest);
      expect(tracker).toBe('user-abc');
    });

    it('should return ip if token decoding yields string', async () => {
      const mockRequest = {
        ip: '127.0.0.1',
        headers: {
          authorization: 'Bearer valid-jwt-token',
        },
      } as unknown as Request;

      (jest.spyOn(jwt, 'verify') as any).mockReturnValue('decoded-as-plain-string');

      const tracker = await guard['getTracker'](mockRequest);
      expect(tracker).toBe('127.0.0.1');
    });

    it('should return ip if token decoding yields object without sub/userId', async () => {
      const mockRequest = {
        ip: '127.0.0.1',
        headers: {
          authorization: 'Bearer valid-jwt-token',
        },
      } as unknown as Request;

      (jest.spyOn(jwt, 'verify') as any).mockReturnValue({});

      const tracker = await guard['getTracker'](mockRequest);
      expect(tracker).toBe('127.0.0.1');
    });

    it('should return ip if token verification throws error', async () => {
      const mockRequest = {
        ip: '127.0.0.1',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      } as unknown as Request;

      (jest.spyOn(jwt, 'verify') as any).mockImplementation(() => {
        throw new Error('Verification failed');
      });

      const tracker = await guard['getTracker'](mockRequest);
      expect(tracker).toBe('127.0.0.1');
    });

    it('should return unknown-ip if tracker ip is missing', async () => {
      const mockRequest = {
        headers: {},
      } as unknown as Request;

      const tracker = await guard['getTracker'](mockRequest);
      expect(tracker).toBe('unknown-ip');
    });
  });
});
