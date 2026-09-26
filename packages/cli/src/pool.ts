export type PoolResult<R> = { ok: R[]; failed: { index: number; error: unknown }[] };

/** Runs `worker` over `items` with at most `concurrency` in flight; one failure never stops the others. */
export async function mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<PoolResult<R>> {
  const result: PoolResult<R> = { ok: [], failed: [] };
  let next = 0;
  const lane = async () => {
    while (next < items.length) {
      const index = next++;
      try {
        result.ok.push(await worker(items[index] as T));
      } catch (error) {
        result.failed.push({ index, error });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, lane));
  return result;
}
