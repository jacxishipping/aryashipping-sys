/**
 * Benchmark script to demonstrate performance improvement of parallelizing
 * count and findMany operations.
 *
 * Usage: node --experimental-strip-types scripts/benchmark_containers.ts
 */

export {};

const SIMULATED_DB_LATENCY_MS = 100;

// Simulate Prisma count
async function mockCount(where: any) {
  await new Promise(resolve => setTimeout(resolve, SIMULATED_DB_LATENCY_MS));
  return 100;
}

// Simulate Prisma findMany
async function mockFindMany(args: any) {
  await new Promise(resolve => setTimeout(resolve, SIMULATED_DB_LATENCY_MS));
  return Array(20).fill({ id: 'container-1' });
}

async function sequentialExecution() {
  const start = performance.now();

  // Get total count
  const totalCount = await mockCount({});

  // Fetch containers
  const containers = await mockFindMany({});

  const end = performance.now();
  return end - start;
}

async function parallelExecution() {
  const start = performance.now();

  // Parallel execution
  const [totalCount, containers] = await Promise.all([
    mockCount({}),
    mockFindMany({})
  ]);

  const end = performance.now();
  return end - start;
}

async function runBenchmark() {
  console.log('Running benchmark...');
  console.log(`Simulated DB latency: ${SIMULATED_DB_LATENCY_MS}ms per operation`);

  const iterations = 5;
  let totalSequential = 0;
  let totalParallel = 0;

  // Warmup
  await sequentialExecution();
  await parallelExecution();

  for (let i = 0; i < iterations; i++) {
    totalSequential += await sequentialExecution();
    totalParallel += await parallelExecution();
  }

  const avgSequential = totalSequential / iterations;
  const avgParallel = totalParallel / iterations;

  console.log('\nResults:');
  console.log(`Sequential Average: ${avgSequential.toFixed(2)}ms`);
  console.log(`Parallel Average:   ${avgParallel.toFixed(2)}ms`);
  console.log(`Improvement:        ${(avgSequential - avgParallel).toFixed(2)}ms (${((avgSequential - avgParallel) / avgSequential * 100).toFixed(1)}%)`);
}

runBenchmark();
