import { expect, test } from 'vitest';
import PQueue from 'p-queue';

test('ModelEventClient', () => {
  test('requestQueue should limit concurrency and return values', async () => {
    const queue = new PQueue({concurrency: 1});

    const task1 = queue.add(async () => {
      return "a";
    });
    const task2 = queue.add(async () => {
      return "b";
    });

    const val1 = await task1;
    const val2 = await task2;

    expect(val1).toBe("a");
    expect(val2).toBe("b");
  });
});
