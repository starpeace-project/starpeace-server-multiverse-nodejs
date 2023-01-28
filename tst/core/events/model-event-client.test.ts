import assert from 'assert';
import PQueue from 'p-queue';

describe('ModelEventClient', () => {
  describe('requestQueue', () => {
    it('should limit concurrency and return values', async () => {

      const queue = new PQueue({concurrency: 1});

      const task1 = queue.add(async () => {
        return "a";
      });
      const task2 = queue.add(async () => {
        return "b";
      });

      const val1 = await task1;
      const val2 = await task2;

      assert.deepEqual(val1, "a");
      assert.deepEqual(val2, "b");
    });

  });
});
