declare module 'morgan' {
  import type { Handler } from 'express';

  type MorganFormat = 'combined' | 'common' | 'dev' | 'short' | 'tiny' | string;

  type MorganOptions = {
    stream?: {
      write: (message: string) => void;
    };
    skip?: (req: Parameters<Handler>[0], res: Parameters<Handler>[1]) => boolean;
    immediate?: boolean;
  };

  function morgan(format: MorganFormat, options?: MorganOptions): Handler;

  export = morgan;
}
