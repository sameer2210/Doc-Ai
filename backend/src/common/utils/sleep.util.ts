/**
 * Interruptible delay utility using native Node.js AbortSignal.
 * Cleans up listeners and timers cleanly upon completion or abort.
 */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      const reason = signal.reason ?? new Error('Operation aborted');
      return reject(reason);
    }

    let timer: NodeJS.Timeout | undefined;

    const onAbort = () => {
      if (timer) {
        clearTimeout(timer);
      }
      const reason = signal?.reason ?? new Error('Operation aborted');
      reject(reason);
    };

    timer = setTimeout(() => {
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
      resolve();
    }, ms);

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}
