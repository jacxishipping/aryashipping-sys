
/**
 * Executes an async function on an array of items with limited concurrency.
 *
 * @param items The array of items to process.
 * @param fn The async function to execute for each item.
 * @param concurrency The maximum number of concurrent executions.
 * @returns A promise that resolves when all items have been processed.
 */
export async function runWithConcurrency<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  concurrency: number
): Promise<void> {
  const executing = new Set<Promise<void>>();

  for (const item of items) {
    const p = fn(item).then(() => {
      executing.delete(p);
    });
    executing.add(p);

    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
}
