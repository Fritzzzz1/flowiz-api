# FloWiz API - System Architecture

**Version**: 1.0.0
**Last Updated**: 2024-01-15

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Core Components](#core-components)
4. [Parser Architecture](#parser-architecture)
5. [Analysis Engine](#analysis-engine)
6. [Integration Layer](#integration-layer)
7. [WebSocket Architecture](#websocket-architecture)
8. [Data Flow](#data-flow)
9. [Technology Stack](#technology-stack)
10. [Design Patterns](#design-patterns)
11. [Security Architecture](#security-architecture)
12. [Performance Considerations](#performance-considerations)
13. [Scalability](#scalability)

---

## System Overview

FloWiz API is a backend service that provides:

1. **CI/CD Configuration Parsing**: Parse GitHub Actions and GitLab CI YAML files into unified data structures
2. **Pipeline Analysis**: Analyze dependencies, identify critical paths, detect bottlenecks
3. **Platform Integration**: OAuth authentication and API integration with GitHub/GitLab
4. **Real-time Updates**: WebSocket-based real-time pipeline status updates via webhooks

### Key Objectives

- **Platform Agnostic**: Unified data model for different CI/CD platforms
- **Performance**: Fast parsing and analysis (<500ms for typical workflows)
- **Scalability**: Support for large workflows (1000+ jobs)
- **Real-time**: Instant updates via WebSocket
- **Developer Experience**: Clear APIs, comprehensive documentation

---

## Architecture Diagram

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FloWiz Frontend                          │
│                     (React + TypeScript)                        │
└───────────┬──────────────────────────────────────┬──────────────┘
            │                                      │
            │ REST API                             │ WebSocket
            │                                      │
┌───────────▼──────────────────────────────────────▼──────────────┐
│                                                                  │
│                      FloWiz API Server                           │
│                   (Node.js + Express + Socket.io)                │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Routes     │  │  Middleware  │  │  Controllers │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                  │                  │
│         └─────────────────┴──────────────────┘                  │
│                           │                                     │
│  ┌────────────────────────▼─────────────────────────┐           │
│  │              Service Layer                       │           │
│  │                                                   │           │
│  │  ┌──────────────┐  ┌──────────────┐             │           │
│  │  │   Parsers    │  │  Analyzers   │             │           │
│  │  │  ┌────────┐  │  │  ┌────────┐  │             │           │
│  │  │  │ GitHub │  │  │  │ Graph  │  │             │           │
│  │  │  └────────┘  │  │  └────────┘  │             │           │
│  │  │  ┌────────┐  │  │  ┌────────┐  │             │           │
│  │  │  │ GitLab │  │  │  │  Path  │  │             │           │
│  │  │  └────────┘  │  │  └────────┘  │             │           │
│  │  └──────────────┘  └──────────────┘             │           │
│  │                                                   │           │
│  │  ┌──────────────┐  ┌──────────────┐             │           │
│  │  │ Integrations │  │  WebSocket   │             │           │
│  │  │  ┌────────┐  │  │   Service    │             │           │
│  │  │  │  OAuth │  │  └──────────────┘             │           │
│  │  │  └────────┘  │                                │           │
│  │  │  ┌────────┐  │                                │           │
│  │  │  │ GitHub │  │                                │           │
│  │  │  │   API  │  │                                │           │
│  │  │  └────────┘  │                                │           │
│  │  │  ┌────────┐  │                                │           │
│  │  │  │ GitLab │  │                                │           │
│  │  │  │   API  │  │                                │           │
│  │  │  └────────┘  │                                │           │
│  │  └──────────────┘                                │           │
│  └────────────────────────────────────────────────────┘         │
│                                                                  │
└────────────┬──────────────────────────────────┬─────────────────┘
             │                                  │
             │ HTTPS                            │ HTTPS
             │                                  │
   ┌─────────▼─────────┐            ┌──────────▼──────────┐
   │   GitHub API      │            │   GitLab API        │
   │                   │            │                     │
   │  - OAuth          │            │  - OAuth            │
   │  - Repositories   │            │  - Projects         │
   │  - Workflows      │            │  - Pipelines        │
   │  - Webhooks       │            │  - Webhooks         │
   └───────────────────┘            └─────────────────────┘
```

### Component Interaction Flow

```
┌─────────┐     ┌──────────┐     ┌─────────┐     ┌──────────┐
│ Client  │────▶│  Routes  │────▶│ Control │────▶│ Service  │
└─────────┘     └──────────┘     │  ler    │     │  Layer   │
                                 └─────────┘     └──────────┘
                                                       │
                                                       ▼
                                                 ┌──────────┐
                                                 │  Parser  │
                                                 │Analyzer  │
                                                 │Integration│
                                                 └──────────┘
                                                       │
                                                       ▼
                                                 ┌──────────┐
                                                 │ Response │
                                                 └──────────┘
```

---

## Core Components

### 1. Routes Layer

**Responsibility**: Define API endpoints and map them to controllers.

**Key Files**:
- `src/routes/index.ts` - Main router
- `src/routes/parse.routes.ts` - Parse endpoints
- `src/routes/analysis.routes.ts` - Analysis endpoints
- `src/routes/github.routes.ts` - GitHub integration
- `src/routes/gitlab.routes.ts` - GitLab integration
- `src/routes/webhook.routes.ts` - Webhook handlers

**Design**:
- RESTful routing conventions
- Route grouping by domain
- Middleware chaining (validation, auth, rate limiting)

### 2. Middleware Layer

**Responsibility**: Request preprocessing, validation, error handling.

**Components**:
- **Error Handler**: Global error handling, consistent error responses
- **Validator**: Zod-based request validation
- **CORS**: Cross-origin resource sharing configuration
- **Rate Limiter**: Prevent abuse (100 req/15min per IP)
- **Auth**: JWT/OAuth token validation (future)
- **Logger**: Request/response logging with request IDs

**Flow**:
```
Request → CORS → Rate Limit → Validation → Auth → Controller → Error Handler → Response
```

### 3. Controller Layer

**Responsibility**: Handle HTTP requests, orchestrate services, format responses.

**Controllers**:
- `ParseController`: Handle parse and validate requests
- `AnalysisController`: Handle analysis requests
- `GitHubController`: Handle GitHub OAuth and API requests
- `GitLabController`: Handle GitLab OAuth and API requests
- `WebhookController`: Handle webhook events from GitHub/GitLab

**Responsibilities**:
- Request/response handling
- Input validation delegation
- Service orchestration
- Error handling
- Response formatting

### 4. Service Layer

**Responsibility**: Business logic, data processing, external integrations.

**Service Groups**:

#### Parsers
- Parse CI/CD configuration files
- Extract jobs, dependencies, metadata
- Validate YAML structure

#### Analyzers
- Build dependency graphs
- Calculate critical paths
- Identify bottlenecks
- Detect circular dependencies

#### Integrations
- OAuth authentication
- External API calls (GitHub/GitLab)
- Webhook signature validation

#### WebSocket
- Connection management
- Room/namespace handling
- Event emission

---

## Parser Architecture

### Design Goals

1. **Extensibility**: Easy to add new CI/CD platforms
2. **Consistency**: Unified output format across platforms
3. **Robustness**: Handle invalid YAML gracefully
4. **Performance**: Parse large files quickly

### Parser Interface

All parsers implement the `IPipelineParser` interface:

```typescript
interface IPipelineParser {
  parse(yamlContent: string): ParsedPipeline;
  validate(yamlContent: string): ValidationResult;
}
```

### Parser Factory Pattern

```typescript
class ParserService {
  parse(platform: string, yamlContent: string): ParsedPipeline {
    const parser = this.getParser(platform);
    return parser.parse(yamlContent);
  }

  private getParser(platform: string): IPipelineParser {
    switch (platform) {
      case 'github':
        return new GitHubActionsParser();
      case 'gitlab':
        return new GitLabCIParser();
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }
}
```

### GitHub Actions Parser Algorithm

**Input**: GitHub Actions YAML string
**Output**: ParsedPipeline object

**Steps**:

1. **Parse YAML**: Use `js-yaml` to convert string to object
   ```typescript
   const parsed = yaml.load(yamlContent);
   ```

2. **Validate Structure**: Check for required fields (`jobs`)
   ```typescript
   if (!parsed.jobs) {
     throw new ValidationError('Missing "jobs" field');
   }
   ```

3. **Extract Jobs**: Iterate over `jobs` object
   ```typescript
   const jobs = Object.entries(parsed.jobs).map(([id, jobDef]) => ({
     id,
     name: id,
     steps: this.extractSteps(jobDef.steps),
     dependsOn: jobDef.needs || [],
     runsOn: jobDef['runs-on'],
     // ... other fields
   }));
   ```

4. **Extract Dependencies**: Build dependency list from `needs` fields
   ```typescript
   const dependencies = jobs.flatMap(job =>
     job.dependsOn.map(depId => ({
       from: depId,
       to: job.id,
       type: 'needs'
     }))
   );
   ```

5. **Extract Metadata**:
   ```typescript
   const metadata = {
     workflowName: parsed.name,
     triggers: Object.keys(parsed.on || {}),
     branches: this.extractBranches(parsed.on),
     totalJobs: jobs.length
   };
   ```

6. **Return ParsedPipeline**:
   ```typescript
   return {
     platform: 'github',
     jobs,
     dependencies,
     metadata
   };
   ```

**Edge Cases**:
- Matrix strategies: Expand into multiple jobs
- Conditional jobs: Include in parse, mark conditions
- Nested workflows: Parse as single workflow
- Reusable workflows: Mark as external dependency

### GitLab CI Parser Algorithm

**Input**: GitLab CI YAML string
**Output**: ParsedPipeline object

**Steps**:

1. **Parse YAML**: Convert to object

2. **Extract Stages**: Get stage order (implicit or explicit)
   ```typescript
   const stages = parsed.stages || ['build', 'test', 'deploy'];
   ```

3. **Extract Jobs**: Filter out special keys (`.`, `stages`, `variables`, etc.)
   ```typescript
   const jobEntries = Object.entries(parsed).filter(([key]) =>
     !key.startsWith('.') && !['stages', 'variables', 'workflow'].includes(key)
   );
   ```

4. **Build Jobs**:
   ```typescript
   const jobs = jobEntries.map(([name, jobDef]) => ({
     id: name,
     name,
     steps: this.extractScript(jobDef.script),
     dependsOn: jobDef.needs?.map(n => typeof n === 'string' ? n : n.job) || [],
     stage: jobDef.stage || 'test',
     // ... other fields
   }));
   ```

5. **Build Dependencies**:
   - Explicit: from `needs` field
   - Implicit: from stage order
   ```typescript
   // Explicit dependencies
   const explicitDeps = jobs.flatMap(job =>
     job.dependsOn.map(depId => ({
       from: depId,
       to: job.id,
       type: 'needs'
     }))
   );

   // Implicit stage dependencies
   const stageDeps = this.buildStageDependencies(jobs, stages);

   const dependencies = [...explicitDeps, ...stageDeps];
   ```

6. **Return ParsedPipeline**

**Edge Cases**:
- `extends`: Merge job definitions
- `include`: External pipeline files (skip for now)
- `rules`: Conditional execution
- `needs: []`: Job runs immediately (breaks stage order)

### Unified Data Model

Both parsers output the same structure:

```typescript
interface ParsedPipeline {
  platform: 'github' | 'gitlab';
  jobs: Job[];
  dependencies: Dependency[];
  metadata: PipelineMetadata;
}
```

This allows the analysis engine to work with any platform without platform-specific code.

---

## Analysis Engine

### Component: Dependency Graph Analyzer

**Purpose**: Build a directed graph representation of job dependencies.

**Algorithm**:

1. **Build Adjacency List**:
   ```typescript
   const graph = new Map<string, Set<string>>();

   // Initialize nodes
   for (const job of pipeline.jobs) {
     graph.set(job.id, new Set());
   }

   // Add edges
   for (const dep of pipeline.dependencies) {
     graph.get(dep.from)?.add(dep.to);
   }
   ```

2. **Detect Cycles** (DFS-based):
   ```typescript
   function detectCycles(graph: Graph): Cycle[] {
     const visited = new Set<string>();
     const recStack = new Set<string>();
     const cycles: Cycle[] = [];

     function dfs(node: string, path: string[]) {
       visited.add(node);
       recStack.add(node);
       path.push(node);

       for (const neighbor of graph.get(node) || []) {
         if (!visited.has(neighbor)) {
           dfs(neighbor, path);
         } else if (recStack.has(neighbor)) {
           // Cycle detected
           const cycleStart = path.indexOf(neighbor);
           cycles.push({
             path: path.slice(cycleStart),
             length: path.length - cycleStart
           });
         }
       }

       recStack.delete(node);
       path.pop();
     }

     for (const node of graph.keys()) {
       if (!visited.has(node)) {
         dfs(node, []);
       }
     }

     return cycles;
   }
   ```

3. **Topological Sort** (Kahn's algorithm):
   ```typescript
   function topologicalSort(graph: Graph): string[] {
     const inDegree = new Map<string, number>();
     const queue: string[] = [];
     const result: string[] = [];

     // Calculate in-degrees
     for (const [node, neighbors] of graph) {
       if (!inDegree.has(node)) inDegree.set(node, 0);
       for (const neighbor of neighbors) {
         inDegree.set(neighbor, (inDegree.get(neighbor) || 0) + 1);
       }
     }

     // Find nodes with in-degree 0
     for (const [node, degree] of inDegree) {
       if (degree === 0) queue.push(node);
     }

     // Process queue
     while (queue.length > 0) {
       const node = queue.shift()!;
       result.push(node);

       for (const neighbor of graph.get(node) || []) {
         const newDegree = inDegree.get(neighbor)! - 1;
         inDegree.set(neighbor, newDegree);
         if (newDegree === 0) queue.push(neighbor);
       }
     }

     return result;
   }
   ```

### Component: Critical Path Analyzer

**Purpose**: Find the longest path through the dependency graph (critical path).

**Algorithm** (Longest Path in DAG):

1. **Topologically sort jobs**
2. **Initialize distances**: `dist[job] = 0` for all jobs
3. **For each job in topological order**:
   ```typescript
   for (const job of topologicalOrder) {
     for (const dependent of graph.get(job.id) || []) {
       const newDist = dist[job.id] + job.estimatedDuration;
       if (newDist > dist[dependent]) {
         dist[dependent] = newDist;
         parent[dependent] = job.id;
       }
     }
   }
   ```
4. **Find job with max distance** (end of critical path)
5. **Backtrack using parent pointers** to build path

**Estimated Duration**:
- Use historical data if available
- Default estimates based on job type:
  - Build jobs: 5 minutes
  - Test jobs: 10 minutes
  - Deploy jobs: 3 minutes
  - Other: 5 minutes

**Output**:
```typescript
{
  path: ['build', 'test-integration', 'deploy'],
  totalDuration: 1800, // seconds
  jobs: [
    { id: 'build', duration: 300, cumulativeDuration: 300 },
    { id: 'test-integration', duration: 1200, cumulativeDuration: 1500 },
    { id: 'deploy', duration: 300, cumulativeDuration: 1800 }
  ]
}
```

### Component: Bottleneck Analyzer

**Purpose**: Identify jobs that slow down the pipeline.

**Bottleneck Criteria**:

1. **Longest Duration**: Job takes significantly longer than others
   ```typescript
   const avgDuration = jobs.reduce((sum, j) => sum + j.duration, 0) / jobs.length;
   const threshold = avgDuration * 2;

   const longJobs = jobs.filter(j => j.duration > threshold);
   ```

2. **High Fan-Out**: Many jobs depend on this job
   ```typescript
   const dependentCount = (jobId: string) => {
     return dependencies.filter(d => d.from === jobId).length;
   };

   const highFanOut = jobs.filter(j => dependentCount(j.id) > 3);
   ```

3. **On Critical Path**: Job is on the critical path
   ```typescript
   const onCriticalPath = criticalPath.path.includes(job.id);
   ```

4. **Serial Execution**: Job that can't be parallelized
   ```typescript
   const serialJobs = jobs.filter(j =>
     j.dependsOn.length > 0 && dependentCount(j.id) > 0
   );
   ```

**Impact Calculation**:
```typescript
function calculateImpact(job: Job, graph: Graph): number {
  // Count all jobs that transitively depend on this job
  const visited = new Set<string>();

  function dfs(node: string) {
    visited.add(node);
    for (const neighbor of graph.get(node) || []) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      }
    }
  }

  dfs(job.id);
  return visited.size - 1; // Exclude the job itself
}
```

**Suggestions**:
- Long duration → "Consider parallelizing or caching"
- High fan-out → "Consider splitting into smaller jobs"
- On critical path → "Optimizing this job will reduce total pipeline time"
- Serial execution → "Look for parallelization opportunities"

### Component: Parallel Groups

**Purpose**: Identify which jobs can run in parallel.

**Algorithm** (Layered approach):

1. **Start with jobs that have no dependencies** (level 0)
2. **For each level**:
   - Find jobs where all dependencies are in previous levels
   - Group these jobs together
3. **Continue until all jobs are assigned**

```typescript
function identifyParallelGroups(pipeline: ParsedPipeline): ParallelGroup[] {
  const levels: Map<string, number> = new Map();
  const groups: ParallelGroup[] = [];

  // BFS to assign levels
  const queue: Array<{job: string, level: number}> = [];

  // Find root jobs (no dependencies)
  for (const job of pipeline.jobs) {
    if (job.dependsOn.length === 0) {
      queue.push({ job: job.id, level: 0 });
      levels.set(job.id, 0);
    }
  }

  while (queue.length > 0) {
    const { job, level } = queue.shift()!;

    // Find dependents
    const dependents = pipeline.dependencies
      .filter(d => d.from === job)
      .map(d => d.to);

    for (const dependent of dependents) {
      const depJob = pipeline.jobs.find(j => j.id === dependent)!;

      // Check if all dependencies are processed
      const allDepsProcessed = depJob.dependsOn.every(depId =>
        levels.has(depId)
      );

      if (allDepsProcessed) {
        const maxDepLevel = Math.max(
          ...depJob.dependsOn.map(depId => levels.get(depId)!)
        );
        const newLevel = maxDepLevel + 1;

        if (!levels.has(dependent)) {
          levels.set(dependent, newLevel);
          queue.push({ job: dependent, level: newLevel });
        }
      }
    }
  }

  // Group jobs by level
  const maxLevel = Math.max(...levels.values());
  for (let level = 0; level <= maxLevel; level++) {
    const jobsAtLevel = pipeline.jobs
      .filter(j => levels.get(j.id) === level)
      .map(j => j.id);

    groups.push({
      level,
      jobs: jobsAtLevel,
      maxDuration: Math.max(
        ...jobsAtLevel.map(id =>
          pipeline.jobs.find(j => j.id === id)!.estimatedDuration || 0
        )
      )
    });
  }

  return groups;
}
```

---

## Integration Layer

### OAuth 2.0 Flow

**GitHub OAuth**:

1. **Authorization Request**:
   ```
   GET https://github.com/login/oauth/authorize
     ?client_id={CLIENT_ID}
     &redirect_uri={CALLBACK_URL}
     &scope=repo,workflow
     &state={CSRF_TOKEN}
   ```

2. **Callback Handling**:
   ```typescript
   async handleCallback(code: string, state: string) {
     // Validate state (CSRF protection)
     // Exchange code for token
     const response = await axios.post(
       'https://github.com/login/oauth/access_token',
       {
         client_id: process.env.GITHUB_CLIENT_ID,
         client_secret: process.env.GITHUB_CLIENT_SECRET,
         code,
       },
       { headers: { Accept: 'application/json' } }
     );

     return response.data.access_token;
   }
   ```

3. **Token Storage**: Store in-memory (session-based) for MVP, database for production

**GitLab OAuth**: Similar flow with GitLab OAuth endpoints

### API Client Architecture

**GitHub Service**:
```typescript
class GitHubService {
  private baseURL = 'https://api.github.com';

  async request(endpoint: string, accessToken: string, options?: any) {
    return axios({
      url: `${this.baseURL}${endpoint}`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
      ...options
    });
  }

  async getRepositories(accessToken: string) {
    const response = await this.request('/user/repos', accessToken);
    return response.data.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner.login,
      // ... map other fields
    }));
  }

  // ... other methods
}
```

**Error Handling**:
- Retry logic for network errors
- Rate limit handling (respect GitHub API limits)
- Token expiration handling

### Webhook Validation

**GitHub**:
```typescript
function validateGitHubWebhook(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}
```

**GitLab**:
```typescript
function validateGitLabWebhook(
  token: string,
  secret: string
): boolean {
  return token === secret;
}
```

---

## WebSocket Architecture

### Connection Management

```typescript
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  // Handle subscriptions
  socket.on('subscribe-pipeline', (pipelineId: string) => {
    socket.join(`pipeline:${pipelineId}`);
    logger.info(`Socket ${socket.id} subscribed to pipeline:${pipelineId}`);
  });

  socket.on('unsubscribe-pipeline', (pipelineId: string) => {
    socket.leave(`pipeline:${pipelineId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});
```

### Room Strategy

- **Pipeline Rooms**: `pipeline:{pipelineId}`
  - Clients subscribe to specific pipeline runs
  - Server emits updates only to subscribed clients

### Event Emission

```typescript
// From webhook handler
export function emitPipelineUpdate(pipelineId: string, data: any) {
  io.to(`pipeline:${pipelineId}`).emit('pipeline-update', {
    pipelineId,
    ...data,
    timestamp: new Date().toISOString()
  });
}
```

### Authentication (Future)

- Verify JWT token on connection
- Disconnect if invalid
- Associate socket with user ID

---

## Data Flow

### Flow 1: Parse Configuration

```
Client
  │
  ├─ POST /api/v1/parse
  │  Body: { platform: 'github', yamlContent: '...' }
  │
  ▼
Routes → Middleware (CORS, Rate Limit, Validation)
  │
  ▼
ParseController.parseConfig()
  │
  ├─ Extract platform and yamlContent
  │
  ▼
ParserService.parse(platform, yamlContent)
  │
  ├─ Factory pattern: select parser
  ├─ GitHub → GitHubActionsParser
  └─ GitLab → GitLabCIParser
  │
  ▼
Parser.parse(yamlContent)
  │
  ├─ Parse YAML (js-yaml)
  ├─ Validate structure
  ├─ Extract jobs
  ├─ Build dependencies
  └─ Extract metadata
  │
  ▼
Return ParsedPipeline
  │
  ▼
Controller formats response
  │
  ▼
Client receives JSON
```

### Flow 2: Analyze Pipeline

```
Client
  │
  ├─ POST /api/v1/analysis/analyze
  │  Body: { pipeline: {...} }
  │
  ▼
AnalysisController.analyzePipeline()
  │
  ▼
AnalysisService.analyze(pipeline)
  │
  ├─ DependencyGraphAnalyzer.buildGraph()
  ├─ DependencyGraphAnalyzer.detectCycles()
  ├─ CriticalPathAnalyzer.calculateCriticalPath()
  ├─ BottleneckAnalyzer.identifyBottlenecks()
  └─ CriticalPathAnalyzer.identifyParallelJobs()
  │
  ▼
Return AnalysisResult
  │
  ▼
Client receives analysis
```

### Flow 3: Real-time Updates (Webhook → WebSocket)

```
GitHub/GitLab
  │
  ├─ Workflow run status change
  │
  ▼
POST /api/v1/webhooks/github (or gitlab)
  │
  ├─ Validate signature
  ├─ Parse payload
  │
  ▼
WebhookController
  │
  ├─ Extract pipeline ID and status
  │
  ▼
SocketService.emitPipelineUpdate(pipelineId, data)
  │
  ├─ Emit to room `pipeline:{pipelineId}`
  │
  ▼
Connected clients receive 'pipeline-update' event
  │
  ▼
Frontend updates UI in real-time
```

---

## Technology Stack

### Runtime & Framework
- **Node.js 18+ LTS**: Modern JavaScript runtime
- **Express.js**: Web framework for REST API
- **TypeScript**: Type-safe JavaScript
- **Socket.io**: WebSocket library

### Libraries
- **js-yaml**: YAML parsing
- **Zod**: Schema validation
- **Axios**: HTTP client
- **Winston/Pino**: Logging
- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **express-rate-limit**: Rate limiting

### Testing
- **Jest**: Test framework
- **Supertest**: HTTP assertions
- **ts-jest**: TypeScript support for Jest

### Development
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **ts-node-dev**: Development server with hot reload
- **Husky**: Git hooks (optional)

### DevOps
- **Docker**: Containerization
- **GitHub Actions**: CI/CD

---

## Design Patterns

### 1. Factory Pattern
**Used in**: Parser selection
```typescript
class ParserFactory {
  static create(platform: string): IPipelineParser {
    // Returns appropriate parser instance
  }
}
```

### 2. Strategy Pattern
**Used in**: Different parsing strategies for different platforms

### 3. Repository Pattern (Future)
**Used in**: Data access layer when database is added

### 4. Singleton Pattern
**Used in**: WebSocket server instance, Logger instance

### 5. Dependency Injection (Manual)
**Used in**: Controllers receive service instances

---

## Security Architecture

### Input Validation
- Zod schemas for all inputs
- Max payload size: 10MB
- YAML size limit: 1MB
- Sanitize user inputs

### Authentication & Authorization
- OAuth 2.0 for GitHub/GitLab
- JWT tokens for API access (future)
- CSRF protection for OAuth flows
- Secure token storage

### Secrets Management
- Environment variables for secrets
- Never log sensitive data
- Rotate OAuth secrets regularly

### API Security
- Helmet.js security headers
- CORS configuration
- Rate limiting
- Request size limits

### Webhook Security
- Signature validation (HMAC)
- Timing-safe comparison
- Reject unsigned webhooks

---

## Performance Considerations

### Parsing Performance
- **Target**: <500ms for typical workflows (<100 jobs)
- **Strategy**:
  - Stream parsing for large files
  - Lazy evaluation where possible
  - Memoization of repeated calculations

### Analysis Performance
- **Target**: <1s for graphs with <1000 nodes
- **Optimizations**:
  - Efficient graph algorithms (O(V+E))
  - Caching of analysis results
  - Parallel processing for independent analyses

### API Performance
- **Caching**: Cache external API responses (5 min TTL)
- **Compression**: Gzip response compression
- **Pagination**: Limit response sizes

### WebSocket Performance
- **Connection pooling**: Reuse connections
- **Room-based broadcasting**: Only emit to subscribed clients
- **Throttling**: Limit event frequency

---

## Scalability

### Horizontal Scaling
- **Stateless API**: Can run multiple instances
- **WebSocket challenges**: Need sticky sessions or Redis adapter
- **Load balancing**: NGINX or cloud load balancer

### WebSocket Scaling
- **Socket.io Redis Adapter**: Share events across instances
```typescript
io.adapter(redisAdapter({ host: 'localhost', port: 6379 }));
```

### Database (Future)
- **User data**: PostgreSQL
- **Session storage**: Redis
- **Analysis results cache**: Redis

### Rate Limiting (Distributed)
- Use Redis for shared rate limit counters

### Monitoring
- **Metrics**: Response times, error rates, throughput
- **Logging**: Centralized logging (e.g., ELK stack)
- **Tracing**: Request tracing with correlation IDs

---

## Future Enhancements

### Phase 2+
1. **Database Integration**
   - User accounts
   - Saved pipelines
   - Historical analysis data

2. **Advanced Analytics**
   - ML-based duration prediction
   - Anomaly detection
   - Trend analysis

3. **Additional Platforms**
   - Jenkins
   - CircleCI
   - Travis CI
   - Azure Pipelines

4. **Caching Layer**
   - Redis for API response caching
   - Analysis result caching

5. **Authentication**
   - JWT-based API authentication
   - User roles and permissions

6. **Webhooks Registry**
   - Manage webhook registrations
   - Webhook event history

---

**This architecture provides a solid foundation for FloWiz API while remaining flexible for future enhancements.**
