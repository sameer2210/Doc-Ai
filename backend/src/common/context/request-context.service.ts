import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export type RequestContextData = {
  requestId?: string;
  userId?: string;
  method?: string;
  path?: string;
};

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContextData>();

  run(data: RequestContextData, callback: () => void) {
    this.storage.run(data, callback);
  }

  get<T extends keyof RequestContextData>(key: T): RequestContextData[T] {
    return this.storage.getStore()?.[key];
  }

  // 🔽 Add these convenience accessors
  requestId(): string | undefined {
    return this.get('requestId');
  }

  userId(): string | undefined {
    return this.get('userId');
  }

  method(): string | undefined {
    return this.get('method');
  }

  path(): string | undefined {
    return this.get('path');
  }
}
