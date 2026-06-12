import type { ConfigService } from '@config/config.service';
import { Logger } from '@nestjs/common';
import type { PrismaService } from '@prisma-local/prisma.service';
import { GeminiRateLimitService } from './gemini-rate-limit.service';

describe('GeminiRateLimitService', () => {
  const auditLogCount = jest.fn();
  const auditLogCreate = jest.fn();
  const transaction = jest.fn();
  const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {
    return undefined;
  });

  const configService = {
    geminiDailyLimit: 30,
  } as ConfigService;

  const prismaService = {
    $transaction: transaction,
  } as unknown as PrismaService;

  const service = new GeminiRateLimitService(prismaService, configService);

  beforeEach(() => {
    /* eslint-disable no-unused-vars */
    jest.clearAllMocks();
    transaction.mockImplementation(
      async (callback: (tx: { auditLog: { count: typeof auditLogCount; create: typeof auditLogCreate } }) => Promise<unknown>) =>
        callback({
          auditLog: {
            count: auditLogCount,
            create: auditLogCreate,
          },
        }),
    );
    /* eslint-enable no-unused-vars */
  });

  afterAll(() => {
    logSpy.mockRestore();
  });

  it('logs the configured daily limit on module init', () => {
    service.onModuleInit();

    expect(logSpy).toHaveBeenCalledWith('Gemini daily limit configured: 30');
  });

  it('uses the configured daily limit when checking usage', async () => {
    auditLogCount.mockResolvedValue(29);
    auditLogCreate.mockResolvedValue({});

    const result = await service.checkAndIncrementLimit('user-1');

    expect(result).toEqual({
      allowed: true,
      remaining: 0,
    });
    expect(auditLogCreate).toHaveBeenCalledTimes(1);
  });

  it('blocks when the configured daily limit is reached', async () => {
    auditLogCount.mockResolvedValue(30);

    const result = await service.checkAndIncrementLimit('user-1');

    expect(result).toEqual({
      allowed: false,
      remaining: 0,
    });
    expect(auditLogCreate).not.toHaveBeenCalled();
  });
});
