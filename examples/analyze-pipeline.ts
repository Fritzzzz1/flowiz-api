/**
 * Example: Analyze a CI/CD pipeline
 *
 * This example demonstrates how to analyze a parsed pipeline to identify:
 * - Dependency graph and cycles
 * - Critical path
 * - Performance bottlenecks
 * - Parallel execution opportunities
 */

const API_BASE_URL = 'http://localhost:3001';

/**
 * Example pipeline (from a parsed GitHub Actions workflow)
 */
const examplePipeline = {
  id: 'example-pipeline-1',
  name: 'CI/CD Pipeline',
  platform: 'github-actions' as const,
  jobs: [
    {
      id: 'lint',
      name: 'Lint Code',
      dependsOn: [],
      steps: [
        {
          id: 'step_0',
          name: 'Checkout',
          uses: 'actions/checkout@v3',
        },
        {
          id: 'step_1',
          name: 'Run ESLint',
          command: 'npm run lint',
        },
      ],
      runsOn: 'ubuntu-latest',
      timeout: 180,
    },
    {
      id: 'test-unit',
      name: 'Unit Tests',
      dependsOn: [],
      steps: [
        {
          id: 'step_0',
          name: 'Checkout',
          uses: 'actions/checkout@v3',
        },
        {
          id: 'step_1',
          name: 'Run unit tests',
          command: 'npm run test:unit',
        },
      ],
      runsOn: 'ubuntu-latest',
      timeout: 600,
    },
    {
      id: 'test-integration',
      name: 'Integration Tests',
      dependsOn: [],
      steps: [
        {
          id: 'step_0',
          name: 'Checkout',
          uses: 'actions/checkout@v3',
        },
        {
          id: 'step_1',
          name: 'Run integration tests',
          command: 'npm run test:integration',
        },
      ],
      runsOn: 'ubuntu-latest',
      timeout: 900,
    },
    {
      id: 'build',
      name: 'Build',
      dependsOn: [
        { jobId: 'lint', type: 'needs' as const },
        { jobId: 'test-unit', type: 'needs' as const },
        { jobId: 'test-integration', type: 'needs' as const },
      ],
      steps: [
        {
          id: 'step_0',
          name: 'Checkout',
          uses: 'actions/checkout@v3',
        },
        {
          id: 'step_1',
          name: 'Build application',
          command: 'npm run build',
        },
      ],
      runsOn: 'ubuntu-latest',
      timeout: 300,
      needs: ['lint', 'test-unit', 'test-integration'],
    },
    {
      id: 'deploy',
      name: 'Deploy',
      dependsOn: [{ jobId: 'build', type: 'needs' as const }],
      steps: [
        {
          id: 'step_0',
          name: 'Deploy to production',
          command: 'npm run deploy',
        },
      ],
      runsOn: 'ubuntu-latest',
      timeout: 240,
      needs: ['build'],
    },
  ],
  triggers: {
    branches: ['main'],
  },
  metadata: {
    fileName: 'ci-cd.yml',
    parsedAt: new Date().toISOString(),
  },
};

/**
 * Analyze the pipeline
 */
async function analyzePipeline() {
  try {
    console.log('🔍 Analyzing pipeline...\n');

    const response = await fetch(`${API_BASE_URL}/api/v1/analysis/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pipeline: examplePipeline,
        options: {
          includeCycles: true,
          includeCriticalPath: true,
          includeBottlenecks: true,
          includeParallelGroups: true,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    console.log('✅ Analysis complete!\n');

    // Dependency Graph Analysis
    console.log('📊 Dependency Graph:');
    console.log(`   Has Cycles: ${result.data.dependencyGraph.hasCycles ? '⚠️  Yes' : '✅ No'}`);
    if (result.data.dependencyGraph.hasCycles) {
      console.log('   Detected Cycles:');
      result.data.dependencyGraph.cycles.forEach((cycle: string[]) => {
        console.log(`     - ${cycle.join(' → ')}`);
      });
    }
    console.log(
      `   Topological Order: ${result.data.dependencyGraph.topologicalOrder.join(' → ')}\n`
    );

    // Critical Path Analysis
    console.log('⏱️  Critical Path:');
    console.log(`   Path: ${result.data.criticalPath.path.join(' → ')}`);
    console.log(`   Total Duration: ${result.data.criticalPath.totalDuration}s`);
    console.log(`   Jobs on Critical Path:`);
    result.data.criticalPath.jobs.forEach((job: any) => {
      console.log(`     - ${job.id}: ${job.duration}s (cumulative: ${job.cumulativeDuration}s)`);
    });
    console.log();

    // Bottleneck Analysis
    console.log('🚦 Bottlenecks:');
    if (result.data.bottlenecks.bottlenecks.length === 0) {
      console.log('   No bottlenecks detected! 🎉\n');
    } else {
      result.data.bottlenecks.bottlenecks.forEach((bottleneck: any) => {
        console.log(`   - ${bottleneck.jobId}`);
        console.log(`     Reason: ${bottleneck.reason}`);
        console.log(`     Impact: ${bottleneck.impact}`);
        console.log(`     Duration: ${bottleneck.duration}s`);
        if (bottleneck.suggestions && bottleneck.suggestions.length > 0) {
          console.log(`     Suggestions:`);
          bottleneck.suggestions.forEach((suggestion: string) => {
            console.log(`       • ${suggestion}`);
          });
        }
      });
      console.log();
    }

    // Parallel Groups Analysis
    console.log('⚡ Parallel Execution Opportunities:');
    console.log(`   Max Parallelism: ${result.data.parallelGroups.maxParallelism} jobs`);
    console.log(`   Execution Levels:`);
    result.data.parallelGroups.groups.forEach((group: any) => {
      console.log(`     Level ${group.level}: ${group.jobs.join(', ')}`);
      if (group.maxDuration) {
        console.log(`       Max duration: ${group.maxDuration}s`);
      }
    });

    return result.data;
  } catch (error) {
    console.error('❌ Error analyzing pipeline:', error);
    throw error;
  }
}

/**
 * Run the example
 */
if (require.main === module) {
  analyzePipeline()
    .then(() => {
      console.log('\n✨ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { analyzePipeline, examplePipeline };
