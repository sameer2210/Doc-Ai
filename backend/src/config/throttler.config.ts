import { ThrottlerModuleOptions } from '@nestjs/throttler';

export const throttlerConfig: ThrottlerModuleOptions = {
  throttlers: [
    {
      ttl: 60,
      limit: 100,
    },
  ],
};

export const THROTTLER_CONFIG = 'THROTTLER_CONFIG';
