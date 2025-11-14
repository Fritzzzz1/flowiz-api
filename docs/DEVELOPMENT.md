# FloWiz API - Development Guide

**Version**: 1.0.0
**Last Updated**: 2024-01-15

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Testing Guidelines](#testing-guidelines)
6. [Parser Development Guide](#parser-development-guide)
7. [Analysis Engine Development](#analysis-engine-development)
8. [Adding New Integrations](#adding-new-integrations)
9. [Debugging](#debugging)
10. [Performance Optimization](#performance-optimization)
11. [Common Patterns](#common-patterns)
12. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

- **Node.js**: 18.x or higher (LTS recommended)
- **npm**: 8.x or higher
- **Git**: 2.x or higher
- **Docker** (optional): For containerized development
- **Code Editor**: VS Code recommended with extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features

### Initial Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-org/flowiz-api.git
   cd flowiz-api
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Verify setup**:
   ```bash
   curl http://localhost:3001/health
   # Should return: {"status":"ok",...}
   ```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server
NODE_ENV=development
PORT=3001
API_VERSION=v1

# GitHub OAuth
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_CALLBACK_URL=http://localhost:3001/api/v1/integrations/github/callback

# GitLab OAuth
GITLAB_CLIENT_ID=your_client_id
GITLAB_CLIENT_SECRET=your_client_secret
GITLAB_CALLBACK_URL=http://localhost:3001/api/v1/integrations/gitlab/callback

# CORS
CORS_ORIGIN=http://localhost:5173

# Security
JWT_SECRET=your_jwt_secret_here_change_in_production
SESSION_SECRET=your_session_secret_here_change_in_production

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=debug  # debug, info, warn, error
```

---

## Project Structure

```
flowiz-api/
├── src/
│   ├── config/              # Configuration files
│   │   ├── database.ts      # Database config (future)
│   │   ├── swagger.ts       # Swagger/OpenAPI setup
│   │   └── environment.ts   # Environment validation
│   │
│   ├── controllers/         # Request handlers
│   │   ├── parse.controller.ts
│   │   ├── analysis.controller.ts
│   │   ├── github.controller.ts
│   │   ├── gitlab.controller.ts
│   │   └── webhook.controller.ts
│   │
│   ├── services/            # Business logic
│   │   ├── parsers/
│   │   │   ├── github-actions.parser.ts
│   │   │   ├── gitlab-ci.parser.ts
│   │   │   ├── parser.interface.ts
│   │   │   └── parser.service.ts
│   │   │
│   │   ├── analyzers/
│   │   │   ├── dependency-graph.analyzer.ts
│   │   │   ├── critical-path.analyzer.ts
│   │   │   ├── bottleneck.analyzer.ts
│   │   │   ├── analyzer.interface.ts
│   │   │   └── analysis.service.ts
│   │   │
│   │   ├── integrations/
│   │   │   ├── github.service.ts
│   │   │   ├── gitlab.service.ts
│   │   │   └── oauth.service.ts
│   │   │
│   │   └── websocket/
│   │       └── socket.service.ts
│   │
│   ├── middleware/          # Express middleware
│   │   ├── error-handler.middleware.ts
│   │   ├── validate.middleware.ts
│   │   ├── auth.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   └── cors.middleware.ts
│   │
│   ├── routes/              # API routes
│   │   ├── index.ts
│   │   ├── parse.routes.ts
│   │   ├── analysis.routes.ts
│   │   ├── github.routes.ts
│   │   ├── gitlab.routes.ts
│   │   └── webhook.routes.ts
│   │
│   ├── models/              # Data models/types
│   │   ├── pipeline.model.ts
│   │   ├── job.model.ts
│   │   ├── analysis.model.ts
│   │   └── user.model.ts
│   │
│   ├── schemas/             # Zod validation schemas
│   │   ├── parse.schema.ts
│   │   ├── analysis.schema.ts
│   │   └── webhook.schema.ts
│   │
│   ├── utils/               # Utility functions
│   │   ├── logger.ts
│   │   ├── errors.ts
│   │   ├── helpers.ts
│   │   └── yaml-validator.ts
│   │
│   ├── types/               # TypeScript type definitions
│   │   ├── express.d.ts
│   │   └── common.types.ts
│   │
│   ├── app.ts               # Express app setup
│   └── server.ts            # Server entry point
│
├── tests/
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── e2e/                 # End-to-end tests
│
├── docs/                    # Documentation
│   ├── ARCHITECTURE.md
│   ├── API_SPEC.md
│   ├── DEVELOPMENT.md
│   └── openapi.yaml
│
├── docker/
│   ├── Dockerfile
│   └── Dockerfile.dev
│
├── .env.example
├── .gitignore
├── .eslintrc.js
├── .prettierrc
├── tsconfig.json
├── jest.config.js
├── docker-compose.yml
├── package.json
└── README.md
```

### File Naming Conventions

- **Controllers**: `*.controller.ts`
- **Services**: `*.service.ts`
- **Middleware**: `*.middleware.ts`
- **Routes**: `*.routes.ts`
- **Models**: `*.model.ts`
- **Schemas**: `*.schema.ts`
- **Tests**: `*.test.ts` or `*.spec.ts`
- **Types**: `*.types.ts` or `*.d.ts`

---

## Development Workflow

### 1. Create a New Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Changes

Follow the coding standards and write tests alongside your code.

### 3. Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### 4. Lint and Format

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### 5. Type Check

```bash
npm run type-check
```

### 6. Build

```bash
npm run build
```

### 7. Commit Changes

```bash
git add .
git commit -m "feat: add new parser for CircleCI"
# Follow conventional commit format
```

### 8. Push and Create PR

```bash
git push origin feature/your-feature-name
# Create pull request on GitHub
```

---

## Coding Standards

### TypeScript

- **Strict Mode**: Always use TypeScript strict mode
- **No `any`**: Avoid using `any` type; use `unknown` if type is truly unknown
- **Explicit Types**: Prefer explicit return types for functions
- **Interfaces over Types**: Use interfaces for object shapes, types for unions/intersections

**Example**:
```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
}

function getUser(id: string): User | null {
  // ...
}

// ❌ Bad
function getUser(id: any): any {
  // ...
}
```

### Naming Conventions

- **Classes**: PascalCase (`GitHubActionsParser`)
- **Interfaces**: PascalCase with `I` prefix optional (`IPipelineParser` or `PipelineParser`)
- **Functions/Methods**: camelCase (`parseConfig`, `buildGraph`)
- **Variables**: camelCase (`userId`, `workflowName`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`, `DEFAULT_TIMEOUT`)
- **Enums**: PascalCase for enum, UPPER_SNAKE_CASE for values

**Example**:
```typescript
const MAX_RETRIES = 3;

enum Status {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

class GitHubActionsParser {
  parseConfig(yamlContent: string): ParsedPipeline {
    // ...
  }
}
```

### Error Handling

- Always use custom error classes
- Never swallow errors silently
- Log errors before throwing
- Provide meaningful error messages

**Example**:
```typescript
// ✅ Good
try {
  const result = await externalApi.fetch();
  return result;
} catch (error) {
  logger.error('Failed to fetch from external API', { error });
  throw new ExternalAPIError('GitHub API request failed');
}

// ❌ Bad
try {
  const result = await externalApi.fetch();
  return result;
} catch (error) {
  // Silent failure
}
```

### Async/Await

- Prefer `async/await` over promises
- Always handle errors in async functions
- Use `try/catch` for error handling

### Comments

- Write self-documenting code
- Add JSDoc comments for public APIs
- Explain "why" not "what" in comments

**Example**:
```typescript
/**
 * Parse GitHub Actions YAML configuration into unified pipeline structure.
 *
 * @param yamlContent - Raw YAML string
 * @returns Parsed pipeline object
 * @throws {ValidationError} If YAML structure is invalid
 * @throws {ParseError} If YAML syntax is invalid
 */
export function parse(yamlContent: string): ParsedPipeline {
  // Use js-yaml instead of custom parser for better compatibility
  const parsed = yaml.load(yamlContent);
  // ...
}
```

---

## Testing Guidelines

### Testing Strategy

- **Unit Tests**: Test individual functions/methods in isolation
- **Integration Tests**: Test API endpoints with real requests
- **E2E Tests**: Test complete workflows

### Writing Unit Tests

**Location**: `tests/unit/`

**Example**:
```typescript
// tests/unit/parsers/github-actions.parser.test.ts
import { GitHubActionsParser } from '@/services/parsers/github-actions.parser';

describe('GitHubActionsParser', () => {
  let parser: GitHubActionsParser;

  beforeEach(() => {
    parser = new GitHubActionsParser();
  });

  describe('parse', () => {
    it('should parse simple workflow with one job', () => {
      const yaml = `
name: CI
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      `;

      const result = parser.parse(yaml);

      expect(result.platform).toBe('github');
      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].id).toBe('build');
      expect(result.jobs[0].steps).toHaveLength(1);
    });

    it('should extract dependencies from needs field', () => {
      const yaml = `
jobs:
  build:
    runs-on: ubuntu-latest
  test:
    needs: build
    runs-on: ubuntu-latest
      `;

      const result = parser.parse(yaml);

      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0]).toEqual({
        from: 'build',
        to: 'test',
        type: 'needs'
      });
    });

    it('should throw ValidationError for invalid YAML', () => {
      const yaml = 'invalid: yaml: content:';

      expect(() => parser.parse(yaml)).toThrow(ValidationError);
    });
  });
});
```

### Writing Integration Tests

**Location**: `tests/integration/api/`

**Example**:
```typescript
// tests/integration/api/parse.test.ts
import request from 'supertest';
import app from '@/app';

describe('POST /api/v1/parse', () => {
  it('should parse valid GitHub Actions YAML', async () => {
    const response = await request(app)
      .post('/api/v1/parse')
      .send({
        platform: 'github',
        yamlContent: `
name: CI
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
        `
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.platform).toBe('github');
    expect(response.body.data.jobs).toHaveLength(1);
  });

  it('should return 400 for invalid YAML', async () => {
    const response = await request(app)
      .post('/api/v1/parse')
      .send({
        platform: 'github',
        yamlContent: 'invalid yaml content:::'
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('PARSE_ERROR');
  });
});
```

### Test Coverage

- **Target**: >80% coverage
- **Critical paths**: 100% coverage (parsers, analyzers)
- **Edge cases**: Always test error conditions

**Run coverage**:
```bash
npm run test:coverage
```

---

## Parser Development Guide

### Adding a New Parser

1. **Create parser interface implementation**:
   ```typescript
   // src/services/parsers/new-platform.parser.ts
   import { IPipelineParser } from './parser.interface';
   import { ParsedPipeline } from '@/models/pipeline.model';

   export class NewPlatformParser implements IPipelineParser {
     parse(yamlContent: string): ParsedPipeline {
       // Implementation
     }

     validate(yamlContent: string): ValidationResult {
       // Implementation
     }
   }
   ```

2. **Update parser factory**:
   ```typescript
   // src/services/parsers/parser.service.ts
   private getParser(platform: string): IPipelineParser {
     switch (platform) {
       case 'github':
         return new GitHubActionsParser();
       case 'gitlab':
         return new GitLabCIParser();
       case 'newplatform':
         return new NewPlatformParser();
       default:
         throw new Error(`Unsupported platform: ${platform}`);
     }
   }
   ```

3. **Write comprehensive tests**:
   - Test simple configurations
   - Test complex dependencies
   - Test edge cases
   - Test error handling

4. **Update documentation**:
   - Add to API_SPEC.md
   - Update OpenAPI schema
   - Add examples

### Parser Implementation Checklist

- [ ] Parse YAML into object
- [ ] Validate required fields
- [ ] Extract all jobs
- [ ] Extract job dependencies
- [ ] Extract job metadata (runs-on, timeout, etc.)
- [ ] Extract pipeline metadata (name, triggers, etc.)
- [ ] Handle platform-specific features
- [ ] Handle error cases gracefully
- [ ] Return unified ParsedPipeline structure
- [ ] Write comprehensive tests (>90% coverage)

---

## Analysis Engine Development

### Adding a New Analyzer

1. **Create analyzer class**:
   ```typescript
   // src/services/analyzers/new-analyzer.ts
   import { ParsedPipeline } from '@/models/pipeline.model';

   export class NewAnalyzer {
     analyze(pipeline: ParsedPipeline): AnalysisResult {
       // Implementation
     }

     private helperMethod() {
       // Helper methods
     }
   }
   ```

2. **Integrate with analysis service**:
   ```typescript
   // src/services/analyzers/analysis.service.ts
   export class AnalysisService {
     analyze(pipeline: ParsedPipeline): AnalysisResult {
       const newAnalyzer = new NewAnalyzer();
       const newAnalysis = newAnalyzer.analyze(pipeline);

       return {
         // ... existing analyses
         newAnalysis
       };
     }
   }
   ```

3. **Write tests**:
   - Test with simple pipelines
   - Test with complex pipelines
   - Test edge cases

### Graph Algorithms

**Common graph operations**:

```typescript
// DFS
function dfs(graph: Graph, start: string, visited: Set<string> = new Set()) {
  visited.add(start);

  for (const neighbor of graph.get(start) || []) {
    if (!visited.has(neighbor)) {
      dfs(graph, neighbor, visited);
    }
  }

  return visited;
}

// BFS
function bfs(graph: Graph, start: string): string[] {
  const queue = [start];
  const visited = new Set([start]);
  const result: string[] = [];

  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);

    for (const neighbor of graph.get(node) || []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return result;
}

// Topological Sort (Kahn's algorithm)
function topologicalSort(graph: Graph): string[] {
  // See ARCHITECTURE.md for full implementation
}
```

---

## Adding New Integrations

### Adding a New OAuth Provider

1. **Create service**:
   ```typescript
   // src/services/integrations/newplatform.service.ts
   export class NewPlatformService {
     private baseURL = 'https://api.newplatform.com';

     async request(endpoint: string, accessToken: string) {
       // HTTP request implementation
     }

     async getProjects(accessToken: string) {
       // Fetch projects
     }
   }
   ```

2. **Create controller**:
   ```typescript
   // src/controllers/newplatform.controller.ts
   export class NewPlatformController {
     async auth(req: Request, res: Response) {
       // OAuth initiation
     }

     async callback(req: Request, res: Response) {
       // OAuth callback
     }
   }
   ```

3. **Add routes**:
   ```typescript
   // src/routes/newplatform.routes.ts
   const router = Router();
   const controller = new NewPlatformController();

   router.get('/auth', controller.auth);
   router.get('/callback', controller.callback);

   export default router;
   ```

4. **Update environment variables**:
   ```env
   NEWPLATFORM_CLIENT_ID=...
   NEWPLATFORM_CLIENT_SECRET=...
   NEWPLATFORM_CALLBACK_URL=...
   ```

---

## Debugging

### Debugging in VS Code

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "runtimeArgs": ["-r", "ts-node/register"],
      "args": ["${workspaceFolder}/src/server.ts"],
      "env": {
        "NODE_ENV": "development"
      },
      "sourceMaps": true,
      "cwd": "${workspaceFolder}",
      "protocol": "inspector"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-cache"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Logging

Use the logger utility:
```typescript
import { logger } from '@/utils/logger';

logger.debug('Parsing YAML content', { length: yamlContent.length });
logger.info('Pipeline parsed successfully', { jobCount: jobs.length });
logger.warn('Job has no dependencies', { jobId });
logger.error('Failed to parse YAML', { error: error.message });
```

### Common Debug Scenarios

**Parser not working**:
1. Log the parsed YAML object
2. Check for missing fields
3. Validate YAML syntax
4. Test with minimal example

**Analysis giving wrong results**:
1. Log the dependency graph
2. Visualize the graph structure
3. Test algorithm with simple cases
4. Check for edge cases (cycles, isolated nodes)

---

## Performance Optimization

### Profiling

**CPU Profiling**:
```bash
node --prof dist/server.js
# Generate log file: isolate-*-v8.log

# Process log
node --prof-process isolate-*-v8.log > processed.txt
```

**Memory Profiling**:
```bash
node --inspect dist/server.js
# Open chrome://inspect in Chrome
```

### Optimization Strategies

1. **Caching**:
   ```typescript
   const cache = new Map<string, ParsedPipeline>();

   function parseWithCache(key: string, yamlContent: string): ParsedPipeline {
     if (cache.has(key)) {
       return cache.get(key)!;
     }

     const result = parser.parse(yamlContent);
     cache.set(key, result);
     return result;
   }
   ```

2. **Lazy Evaluation**:
   ```typescript
   class ParsedPipeline {
     private _graph?: Graph;

     get graph(): Graph {
       if (!this._graph) {
         this._graph = buildGraph(this.jobs, this.dependencies);
       }
       return this._graph;
     }
   }
   ```

3. **Batch Processing**:
   ```typescript
   async function processMultiple(requests: ParseRequest[]): Promise<ParsedPipeline[]> {
     return Promise.all(requests.map(req => parser.parse(req.yamlContent)));
   }
   ```

---

## Common Patterns

### Controller Pattern

```typescript
export class ExampleController {
  async handleRequest(req: Request, res: Response, next: NextFunction) {
    try {
      // 1. Extract and validate input
      const input = req.body;

      // 2. Call service
      const service = new ExampleService();
      const result = await service.process(input);

      // 3. Format and return response
      res.json({
        success: true,
        data: result,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    } catch (error) {
      // 4. Pass errors to error handler
      next(error);
    }
  }
}
```

### Service Pattern

```typescript
export class ExampleService {
  async process(input: Input): Promise<Output> {
    // Business logic here
    return output;
  }

  private helperMethod() {
    // Private helper methods
  }
}
```

### Error Handling Pattern

```typescript
// Custom error
export class CustomError extends AppError {
  constructor(message: string, details?: any) {
    super(400, message);
    this.details = details;
  }
}

// Usage
if (!isValid) {
  throw new CustomError('Invalid input', { field: 'yamlContent' });
}
```

---

## Troubleshooting

### Common Issues

**Issue**: `Module not found` error
**Solution**: Check tsconfig.json paths and ensure imports use correct aliases

**Issue**: Tests failing with timeout
**Solution**: Increase Jest timeout or mock slow operations

**Issue**: TypeScript errors in tests
**Solution**: Ensure @types packages are installed and tsconfig includes test files

**Issue**: CORS errors
**Solution**: Check CORS_ORIGIN in .env matches frontend URL

**Issue**: OAuth redirect not working
**Solution**: Verify callback URLs match in .env and OAuth app settings

### Debug Checklist

- [ ] Check environment variables are loaded
- [ ] Verify all dependencies are installed
- [ ] Check TypeScript compilation has no errors
- [ ] Review logs for error messages
- [ ] Test with minimal example
- [ ] Check network requests (API calls)
- [ ] Verify database connections (if applicable)
- [ ] Check file permissions

---

## Contributing

See CONTRIBUTING.md for contribution guidelines.

---

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Express.js Documentation](https://expressjs.com/)
- [Jest Documentation](https://jestjs.io/)
- [Zod Documentation](https://zod.dev/)
- [Socket.io Documentation](https://socket.io/docs/)

---

**Happy coding! 🚀**
