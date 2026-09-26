import { describe, expect, it } from 'vitest';

import { mapPool } from '../src/pool';

describe('mapPool', () => {
  it('never runs more workers than the concurrency limit', async () => {
    let running = 0;
    let peak = 0;
    const worker = async (n: number) => {
      peak = Math.max(peak, ++running);
      await new Promise((resolve) => setTimeout(resolve, 1));
      running -= 1;
      return n * 2;
    };

    const { ok } = await mapPool([1, 2, 3, 4, 5, 6, 7], 3, worker);

    expect(peak).toBe(3);
    expect(ok.sort((a, b) => a - b)).toEqual([2, 4, 6, 8, 10, 12, 14]);
  });

  it('isolates failures and reports their index', async () => {
    const result = await mapPool(['a', 'boom', 'c'], 2, async (item) => {
      if (item === 'boom') {
        throw new Error(item);
      }
      return item;
    });

    expect(result.ok.sort()).toEqual(['a', 'c']);
    expect(result.failed).toEqual([{ index: 1, error: new Error('boom') }]);
  });

  it('handles an empty input', async () => {
    await expect(mapPool([], 4, async () => 1)).resolves.toEqual({ ok: [], failed: [] });
  });
});
