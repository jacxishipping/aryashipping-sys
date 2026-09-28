/**
 * Benchmark script to demonstrate performance improvement of parallelizing
 * dashboard data fetching.
 *
 * Usage: node --experimental-strip-types scripts/benchmark_dashboard.ts
 */

const SIMULATED_DB_LATENCY_MS = 50;

// Simulate Prisma operations
async function mockQuery(name: string) {
  // console.log(`Starting ${name}...`);
  await new Promise(resolve => setTimeout(resolve, SIMULATED_DB_LATENCY_MS));
  // console.log(`Finished ${name}`);
  return { data: 'mock' };
}

async function sequentialExecution() {
  const start = performance.now();

  // 1. KPI Stats
  const activeShipmentsCount = await mockQuery('activeShipmentsCount');
  const activeContainersCount = await mockQuery('activeContainersCount');
  const pendingInvoices = await mockQuery('pendingInvoices');

  // 3. Counts by Status for Chart/Progress
  const shipmentStats = await mockQuery('shipmentStats');
  const shipmentsInRange = await mockQuery('shipmentsInRange');
  const containerUtilization = await mockQuery('containerUtilization');

  const end = performance.now();
  return end - start;
}

async function parallelExecution() {
  const start = performance.now();

  // Parallel execution
  const [
    activeShipmentsCount,
    activeContainersCount,
    pendingInvoices,
    shipmentStats,
    shipmentsInRange,
    containerUtilization
  ] = await Promise.all([
    mockQuery('activeShipmentsCount'),
    mockQuery('activeContainersCount'),
    mockQuery('pendingInvoices'),
    mockQuery('shipmentStats'),
    mockQuery('shipmentsInRange'),
    mockQuery('containerUtilization')
  ]);

  const end = performance.now();
  return end - start;
}

async function runBenchmark() {
  console.log('Running dashboard query benchmark...');
  console.log(`Simulated DB latency: ${SIMULATED_DB_LATENCY_MS}ms per operation (6 independent queries)`);

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
