/**
 * Example: Parse a GitLab CI configuration
 *
 * This example demonstrates how to parse a GitLab CI YAML file
 * using the FloWiz API.
 */

const API_BASE_URL = 'http://localhost:3001';

/**
 * Example GitLab CI configuration
 */
const gitlabCIConfig = `
stages:
  - build
  - test
  - deploy

variables:
  NODE_VERSION: "18"
  DOCKER_IMAGE: "node:18-alpine"

before_script:
  - echo "Starting job..."
  - node --version
  - npm --version

build:
  stage: build
  image: $DOCKER_IMAGE
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
      - node_modules/
    expire_in: 1 hour
  cache:
    key: $CI_COMMIT_REF_SLUG
    paths:
      - node_modules/
  only:
    - main
    - develop

test:unit:
  stage: test
  image: $DOCKER_IMAGE
  needs: [build]
  script:
    - npm run test:unit
  coverage: '/Coverage: \\d+\\.\\d+%/'
  artifacts:
    when: always
    reports:
      junit: junit.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

test:integration:
  stage: test
  image: $DOCKER_IMAGE
  needs: [build]
  script:
    - npm run test:integration
  services:
    - postgres:14-alpine
    - redis:7-alpine
  variables:
    DATABASE_URL: "postgresql://user:pass@postgres:5432/test"
    REDIS_URL: "redis://redis:6379"
  retry: 2

lint:
  stage: test
  image: $DOCKER_IMAGE
  needs: [build]
  script:
    - npm run lint
  allow_failure: false

deploy:staging:
  stage: deploy
  image: $DOCKER_IMAGE
  needs:
    - build
    - test:unit
    - test:integration
    - lint
  script:
    - echo "Deploying to staging..."
    - npm run deploy:staging
  environment:
    name: staging
    url: https://staging.example.com
  only:
    - develop
  when: manual

deploy:production:
  stage: deploy
  image: $DOCKER_IMAGE
  needs:
    - build
    - test:unit
    - test:integration
    - lint
  script:
    - echo "Deploying to production..."
    - npm run deploy:prod
  environment:
    name: production
    url: https://example.com
  only:
    - main
  when: manual
  retry: 1
`;

/**
 * Parse the GitLab CI configuration
 */
async function parseGitLabCI() {
  try {
    console.log('📝 Parsing GitLab CI configuration...\n');

    const response = await fetch(`${API_BASE_URL}/api/v1/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platform: 'gitlab-ci',
        yamlContent: gitlabCIConfig,
        fileName: '.gitlab-ci.yml',
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
    console.log(`   Configuration File: ${result.data.pipeline.metadata.fileName}\n`);

    // Group jobs by stage
    const jobsByStage = new Map<string, any[]>();
    result.data.pipeline.jobs.forEach((job: any) => {
      const stage = job.stage || 'default';
      if (!jobsByStage.has(stage)) {
        jobsByStage.set(stage, []);
      }
      jobsByStage.get(stage)!.push(job);
    });

    console.log('🏗️  Stages and Jobs:');
    const stages = result.data.pipeline.stages || Array.from(jobsByStage.keys());
    stages.forEach((stage: string) => {
      const jobs = jobsByStage.get(stage) || [];
      console.log(`   ${stage}:`);
      jobs.forEach((job: any) => {
        console.log(`     - ${job.name} (${job.steps.length} steps)`);

        // Show dependencies
        if (job.dependsOn && job.dependsOn.length > 0) {
          const deps = job.dependsOn.map((d: any) => d.jobId).join(', ');
          console.log(`       Needs: ${deps}`);
        }

        // Show artifacts
        if (job.artifacts) {
          console.log(`       Artifacts: ${job.artifacts.paths?.join(', ') || 'configured'}`);
        }

        // Show cache
        if (job.cache) {
          console.log(`       Cache: ${job.cache.key}`);
        }

        // Show when condition
        if (job.when && job.when !== 'on_success') {
          console.log(`       When: ${job.when}`);
        }

        // Show allow_failure
        if (job.allowFailure) {
          console.log(`       Allow failure: true`);
        }

        // Show retry
        if (job.retries && job.retries > 0) {
          console.log(`       Retries: ${job.retries}`);
        }
      });
    });

    // Show environment variables
    if (result.data.pipeline.defaultEnv) {
      console.log('\n🔧 Global Variables:');
      Object.entries(result.data.pipeline.defaultEnv).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
    }

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
    console.error('❌ Error parsing GitLab CI configuration:', error);
    throw error;
  }
}

/**
 * Run the example
 */
if (require.main === module) {
  parseGitLabCI()
    .then(() => {
      console.log('\n✨ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { parseGitLabCI };
