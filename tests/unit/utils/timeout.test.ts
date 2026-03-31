import { withTimeout } from '../../../src/shared/utils/timeout';

describe('withTimeout', () => {
  it('should resolve when promise completes before deadline', async () => {
    const result = await withTimeout(Promise.resolve('ok'), 1000, 'test');
    expect(result).toBe('ok');
  });

  it('should reject when promise exceeds deadline', async () => {
    let timer: ReturnType<typeof setTimeout>;
    const slow = new Promise((resolve) => {
      timer = setTimeout(resolve, 5000);
    });
    await expect(withTimeout(slow, 50, 'slowOp')).rejects.toThrow(
      'slowOp timed out after 50ms',
    );
    clearTimeout(timer!);
  });

  it('should propagate the original rejection if promise fails before timeout', async () => {
    const failing = Promise.reject(new Error('original error'));
    await expect(withTimeout(failing, 1000, 'test')).rejects.toThrow('original error');
  });
});
