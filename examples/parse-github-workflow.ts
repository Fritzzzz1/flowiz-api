/**
 * Example: Parse a GitHub Actions workflow
 *
 * This example demonstrates how to parse a GitHub Actions workflow file
 * using the FloWiz API.
 */

const API_BASE_URL = 'http://localhost:3001';

/**
 * Example GitHub Actions workflow
 */
const githubWorkflow = `
name: CI Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Run coverage
        run: npm run test:coverage

  deploy:
    needs: [build, test]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: |
          echo "Deploying to production..."
          npm run deploy
`;

/**
 * Parse the GitHub Actions workflow
 */
async function parseWorkflow() {
  try {
    console.log('📝 Parsing GitHub Actions workflow...\n');

    const response = await fetch(`${API_BASE_URL}/api/v1/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platform: 'github-actions',
        yamlContent: githubWorkflow,
        fileName: 'ci.yml',
        options: {
          validate: true,
          includeWarnings: true,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    console.log('✅ Parse successful!\n');
    console.log('📊 Pipeline Details:');
    console.log(`   Platform: ${result.data.pipeline.platform}`);
    console.log(`   Total Jobs: ${result.metadata.jobCount}`);
    console.log(`   Workflow Name: ${result.data.pipeline.metadata.fileName}\n`);

    console.log('🔨 Jobs:');
    result.data.pipeline.jobs.forEach((job: any) => {
      console.log(`   - ${job.name} (${job.steps.length} steps)`);
      if (job.dependsOn && job.dependsOn.length > 0) {
        const deps = job.dependsOn.map((d: any) => d.jobId).join(', ');
        console.log(`     Depends on: ${deps}`);
      }
    });

    if (result.data.errors && result.data.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      result.data.errors.forEach((error: any) => {
        console.log(`   - ${error.message}`);
      });
    }

    if (result.data.warnings && result.data.warnings.length > 0) {
      console.log('\n⚡ Warnings:');
      result.data.warnings.forEach((warning: any) => {
        console.log(`   - ${warning.message}`);
      });
    }

    return result.data.pipeline;
  } catch (error) {
    console.error('❌ Error parsing workflow:', error);
    throw error;
  }
}

/**
 * Run the example
 */
if (require.main === module) {
  parseWorkflow()
    .then(() => {
      console.log('\n✨ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { parseWorkflow };
