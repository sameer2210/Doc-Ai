import { sleep } from './sleep.util';

describe('sleep.util', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should resolve after specified duration when not aborted', async () => {
    const promise = sleep(1000);
    jest.advanceTimersByTime(1000);
    await expect(promise).resolves.toBeUndefined();
  });

  it('should reject immediately if signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort(new Error('Pre-aborted'));

    const promise = sleep(1000, controller.signal);
    await expect(promise).rejects.toThrow('Pre-aborted');
  });

  it('should interrupt delay and reject when signal aborts mid-flight', async () => {
    const controller = new AbortController();
    const promise = sleep(5000, controller.signal);

    jest.advanceTimersByTime(2000);
    controller.abort(new Error('Aborted mid-flight'));

    await expect(promise).rejects.toThrow('Aborted mid-flight');
  });
});
