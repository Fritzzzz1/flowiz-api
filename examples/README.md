# FloWiz API Examples

This directory contains example scripts demonstrating how to use the FloWiz API.

## Prerequisites

- Node.js 18+ installed
- FloWiz API server running on `http://localhost:3001`

## Running the Examples

### 1. Start the API Server

```bash
# In the root directory
npm run dev
```

The server should be running on `http://localhost:3001`.

### 2. Run an Example

You can run the examples using `ts-node`:

```bash
# Install ts-node if you haven't already
npm install -g ts-node

# Parse a GitHub Actions workflow
ts-node examples/parse-github-workflow.ts

# Analyze a pipeline
ts-node examples/analyze-pipeline.ts

# Parse a GitLab CI configuration
ts-node examples/parse-gitlab-ci.ts
```

Or compile and run with Node.js:

```bash
# Build the project
npm run build

# Run the compiled example
node dist/examples/parse-github-workflow.js
```

## Available Examples

### 1. Parse GitHub Actions Workflow

**File**: `parse-github-workflow.ts`

Demonstrates:
- Parsing a GitHub Actions workflow file
- Platform auto-detection
- Validation and error handling
- Extracting job information and dependencies

```bash
ts-node examples/parse-github-workflow.ts
```

**Output**:
```
📝 Parsing GitHub Actions workflow...

✅ Parse successful!

📊 Pipeline Details:
   Platform: github-actions
   Total Jobs: 3
   Workflow Name: ci.yml

🔨 Jobs:
   - build (4 steps)
   - test (4 steps)
     Depends on: build
   - deploy (1 steps)
     Depends on: build, test
```

### 2. Analyze Pipeline

**File**: `analyze-pipeline.ts`

Demonstrates:
- Complete pipeline analysis
- Dependency graph and cycle detection
- Critical path identification
- Bottleneck detection
- Parallel execution opportunities

```bash
ts-node examples/analyze-pipeline.ts
```

**Output**:
```
🔍 Analyzing pipeline...

✅ Analysis complete!

📊 Dependency Graph:
   Has Cycles: ✅ No
   Topological Order: lint → test-unit → test-integration → build → deploy

⏱️  Critical Path:
   Path: test-integration → build → deploy
   Total Duration: 1440s
```

### 3. Parse GitLab CI Configuration

**File**: `parse-gitlab-ci.ts`

Demonstrates:
- Parsing GitLab CI YAML files
- Stage-based dependencies
- Artifact and cache configuration
- Job rules and conditions

```bash
ts-node examples/parse-gitlab-ci.ts
```

## Example Use Cases

### Use Case 1: Parse and Analyze Together

```typescript
import { parseWorkflow } from './parse-github-workflow';
import { analyzePipeline } from './analyze-pipeline';

// 1. Parse the workflow
const pipeline = await parseWorkflow();

// 2. Analyze the parsed pipeline
const analysis = await analyzePipeline(pipeline);

// 3. Use the analysis results
if (analysis.criticalPath.totalDuration > 1800) {
  console.log('⚠️  Pipeline takes longer than 30 minutes!');
  console.log('Consider optimizing these jobs:');
  analysis.bottlenecks.bottlenecks.forEach(bottleneck => {
    console.log(`  - ${bottleneck.jobId}: ${bottleneck.suggestions.join(', ')}`);
  });
}
```

### Use Case 2: Validate Configuration Before Committing

```typescript
const response = await fetch('http://localhost:3001/api/v1/parse/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    yamlContent: fs.readFileSync('.github/workflows/ci.yml', 'utf8'),
    fileName: '.github/workflows/ci.yml',
  }),
});

const result = await response.json();

if (!result.data.valid) {
  console.error('❌ Validation failed:');
  result.data.errors.forEach(error => {
    console.error(`  Line ${error.line}: ${error.message}`);
  });
  process.exit(1);
}
```

### Use Case 3: Detect Platform Automatically

```typescript
const response = await fetch('http://localhost:3001/api/v1/parse/detect-platform', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    yamlContent: configContent,
    fileName: configFileName,
  }),
});

const result = await response.json();
console.log(`Detected platform: ${result.data.platform} (${result.data.confidence} confidence)`);
```

## API Endpoints Reference

### Parse Endpoints

- `POST /api/v1/parse` - Parse CI/CD configuration
- `POST /api/v1/parse/validate` - Validate configuration
- `POST /api/v1/parse/detect-platform` - Detect platform

### Analysis Endpoints

- `POST /api/v1/analysis/analyze` - Complete pipeline analysis
- `POST /api/v1/analysis/dependency-graph` - Dependency graph analysis
- `POST /api/v1/analysis/critical-path` - Critical path analysis
- `POST /api/v1/analysis/bottlenecks` - Bottleneck detection
- `POST /api/v1/analysis/parallel-groups` - Parallel execution groups

## Further Reading

- [API Specification](../docs/API_SPEC.md) - Complete API documentation
- [Architecture](../docs/ARCHITECTURE.md) - System architecture overview
- [Development Guide](../docs/DEVELOPMENT.md) - Developer guide

## Contributing

Have a great example to share? Feel free to add it to this directory and update this README!

## License

MIT
