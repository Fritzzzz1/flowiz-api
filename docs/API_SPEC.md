# FloWiz API Specification

**Version**: 1.0.0
**Base URL**: `/api/v1`
**Protocol**: REST + WebSocket
**Format**: JSON

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Common Response Format](#common-response-format)
4. [Error Handling](#error-handling)
5. [Rate Limiting](#rate-limiting)
6. [Endpoints](#endpoints)
   - [Parse Endpoints](#parse-endpoints)
   - [Analysis Endpoints](#analysis-endpoints)
   - [GitHub Integration](#github-integration)
   - [GitLab Integration](#gitlab-integration)
   - [Webhooks](#webhooks)
7. [WebSocket Events](#websocket-events)
8. [Data Models](#data-models)

---

## Overview

The FloWiz API provides endpoints for parsing CI/CD configuration files, analyzing pipeline dependencies, integrating with GitHub/GitLab, and receiving real-time pipeline updates via WebSocket.

### Key Features
- Parse GitHub Actions and GitLab CI YAML configurations
- Analyze pipeline dependencies and critical paths
- OAuth authentication with GitHub and GitLab
- Real-time pipeline status updates via WebSocket
- Webhook handlers for GitHub and GitLab events

---

## Authentication

### OAuth 2.0 Flow

For GitHub and GitLab integrations, the API uses OAuth 2.0 authorization code flow.

**Flow Steps**:
1. Client redirects user to `/api/v1/integrations/{platform}/auth`
2. User authorizes on GitHub/GitLab
3. Platform redirects to `/api/v1/integrations/{platform}/callback?code=xxx`
4. API exchanges code for access token
5. API returns token to client (via redirect or JSON response)

### JWT Tokens (Future Enhancement)

Protected endpoints will require JWT bearer tokens in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## Common Response Format

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid YAML syntax",
    "details": [
      {
        "field": "yamlContent",
        "issue": "Unexpected token at line 5"
      }
    ]
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful request |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid input, validation error |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 502 | Bad Gateway | External service error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `PARSE_ERROR` | YAML parsing failed |
| `INVALID_YAML` | Invalid YAML syntax |
| `UNSUPPORTED_PLATFORM` | Unsupported CI/CD platform |
| `OAUTH_ERROR` | OAuth authentication failed |
| `EXTERNAL_API_ERROR` | GitHub/GitLab API error |
| `WEBHOOK_VALIDATION_ERROR` | Webhook signature validation failed |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INTERNAL_ERROR` | Internal server error |

---

## Rate Limiting

**Default Limits**:
- 100 requests per 15 minutes per IP address
- Configurable via environment variables

**Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248000
```

**Rate Limit Exceeded Response** (429):
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 900
  }
}
```

---

## Endpoints

### Health Check

#### `GET /health`

Health check endpoint for monitoring.

**Response** (200):
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 86400,
  "version": "1.0.0"
}
```

---

### Parse Endpoints

#### `POST /api/v1/parse`

Parse a CI/CD configuration file (GitHub Actions or GitLab CI).

**Request Body**:
```json
{
  "platform": "github",
  "yamlContent": "name: CI\non:\n  push:\n    branches: [main]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v2"
}
```

**Request Schema**:
- `platform` (string, required): Either `"github"` or `"gitlab"`
- `yamlContent` (string, required): Raw YAML content (max 1MB)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "platform": "github",
    "jobs": [
      {
        "id": "build",
        "name": "build",
        "steps": [
          {
            "id": "step_0",
            "name": "actions/checkout@v2",
            "uses": "actions/checkout@v2"
          }
        ],
        "dependsOn": [],
        "runsOn": "ubuntu-latest"
      }
    ],
    "dependencies": [],
    "metadata": {
      "workflowName": "CI",
      "triggers": ["push"],
      "branches": ["main"],
      "totalJobs": 1
    }
  }
}
```

**Errors**:
- 400: Invalid platform or YAML syntax error
- 413: Payload too large (>1MB)

---

#### `POST /api/v1/validate`

Validate a CI/CD configuration file without full parsing.

**Request Body**:
```json
{
  "platform": "github",
  "yamlContent": "..."
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "valid": true,
    "errors": [],
    "warnings": [
      {
        "line": 10,
        "message": "Job 'test' has no dependencies, will run in parallel with 'build'"
      }
    ]
  }
}
```

**Response (with errors)** (200):
```json
{
  "success": true,
  "data": {
    "valid": false,
    "errors": [
      {
        "line": 5,
        "column": 3,
        "message": "Unexpected token, expected string",
        "severity": "error"
      }
    ],
    "warnings": []
  }
}
```

---

### Analysis Endpoints

#### `POST /api/v1/analysis/analyze`

Analyze a parsed pipeline to extract dependency graph, critical path, and bottlenecks.

**Request Body**:
```json
{
  "pipeline": {
    "platform": "github",
    "jobs": [...],
    "dependencies": [...],
    "metadata": {...}
  }
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "graph": {
      "nodes": [
        { "id": "build", "label": "build", "type": "job" },
        { "id": "test", "label": "test", "type": "job" },
        { "id": "deploy", "label": "deploy", "type": "job" }
      ],
      "edges": [
        { "from": "build", "to": "test" },
        { "from": "test", "to": "deploy" }
      ]
    },
    "cycles": [],
    "criticalPath": {
      "path": ["build", "test", "deploy"],
      "totalDuration": 900,
      "jobs": [
        { "id": "build", "duration": 300, "cumulativeDuration": 300 },
        { "id": "test", "duration": 400, "cumulativeDuration": 700 },
        { "id": "deploy", "duration": 200, "cumulativeDuration": 900 }
      ]
    },
    "bottlenecks": [
      {
        "jobId": "test",
        "reason": "longest_duration",
        "impact": "high",
        "duration": 400,
        "dependentCount": 1,
        "suggestions": [
          "Consider parallelizing test suites",
          "Use test caching to reduce duration"
        ]
      }
    ],
    "parallelGroups": [
      {
        "level": 0,
        "jobs": ["build"]
      },
      {
        "level": 1,
        "jobs": ["test"]
      },
      {
        "level": 2,
        "jobs": ["deploy"]
      }
    ],
    "estimatedDuration": 900,
    "maxParallelism": 1,
    "statistics": {
      "totalJobs": 3,
      "averageDuration": 300,
      "longestJob": "test",
      "shortestJob": "deploy"
    }
  }
}
```

**Errors**:
- 400: Invalid pipeline data

---

### GitHub Integration

#### `GET /api/v1/integrations/github/auth`

Initiate GitHub OAuth flow.

**Query Parameters**:
- `redirect_uri` (string, optional): Custom redirect URI after OAuth completion

**Response** (302):
Redirects to GitHub OAuth authorization page.

---

#### `GET /api/v1/integrations/github/callback`

GitHub OAuth callback handler.

**Query Parameters**:
- `code` (string): Authorization code from GitHub
- `state` (string, optional): CSRF state token

**Response** (200):
```json
{
  "success": true,
  "data": {
    "accessToken": "gho_xxxxxxxxxxxx",
    "tokenType": "bearer",
    "scope": "repo,workflow"
  }
}
```

**Errors**:
- 400: Invalid or missing authorization code
- 401: OAuth authentication failed

---

#### `GET /api/v1/integrations/github/repositories`

List user's GitHub repositories.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Query Parameters**:
- `page` (number, optional): Page number (default: 1)
- `per_page` (number, optional): Items per page (default: 30, max: 100)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "repositories": [
      {
        "id": 123456,
        "name": "my-app",
        "fullName": "username/my-app",
        "owner": "username",
        "private": false,
        "url": "https://github.com/username/my-app",
        "defaultBranch": "main",
        "hasWorkflows": true
      }
    ],
    "pagination": {
      "page": 1,
      "perPage": 30,
      "total": 45
    }
  }
}
```

---

#### `GET /api/v1/integrations/github/workflows/:owner/:repo`

Get GitHub Actions workflows for a repository.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Path Parameters**:
- `owner` (string): Repository owner
- `repo` (string): Repository name

**Response** (200):
```json
{
  "success": true,
  "data": {
    "workflows": [
      {
        "id": 123456,
        "name": "CI",
        "path": ".github/workflows/ci.yml",
        "state": "active",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-15T10:00:00Z"
      }
    ]
  }
}
```

---

#### `GET /api/v1/integrations/github/runs/:owner/:repo/:workflowId`

Get workflow run history.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Path Parameters**:
- `owner` (string): Repository owner
- `repo` (string): Repository name
- `workflowId` (string): Workflow ID

**Query Parameters**:
- `status` (string, optional): Filter by status (`completed`, `in_progress`, `queued`)
- `branch` (string, optional): Filter by branch
- `limit` (number, optional): Number of runs to return (default: 10, max: 50)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "runs": [
      {
        "id": 789012,
        "name": "CI #42",
        "status": "completed",
        "conclusion": "success",
        "branch": "main",
        "commit": {
          "sha": "abc123def456",
          "message": "Fix bug in parser"
        },
        "createdAt": "2024-01-15T09:00:00Z",
        "startedAt": "2024-01-15T09:01:00Z",
        "completedAt": "2024-01-15T09:15:00Z",
        "duration": 840,
        "url": "https://github.com/username/repo/actions/runs/789012"
      }
    ]
  }
}
```

---

### GitLab Integration

#### `GET /api/v1/integrations/gitlab/auth`

Initiate GitLab OAuth flow.

**Query Parameters**:
- `redirect_uri` (string, optional): Custom redirect URI after OAuth completion

**Response** (302):
Redirects to GitLab OAuth authorization page.

---

#### `GET /api/v1/integrations/gitlab/callback`

GitLab OAuth callback handler.

**Query Parameters**:
- `code` (string): Authorization code from GitLab
- `state` (string, optional): CSRF state token

**Response** (200):
```json
{
  "success": true,
  "data": {
    "accessToken": "glpat-xxxxxxxxxxxx",
    "tokenType": "bearer",
    "scope": "read_api,read_repository"
  }
}
```

---

#### `GET /api/v1/integrations/gitlab/projects`

List user's GitLab projects.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Query Parameters**:
- `page` (number, optional): Page number (default: 1)
- `per_page` (number, optional): Items per page (default: 30, max: 100)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": 12345,
        "name": "my-project",
        "path": "my-project",
        "namespace": "username",
        "fullPath": "username/my-project",
        "visibility": "private",
        "url": "https://gitlab.com/username/my-project",
        "defaultBranch": "main"
      }
    ],
    "pagination": {
      "page": 1,
      "perPage": 30,
      "total": 25
    }
  }
}
```

---

#### `GET /api/v1/integrations/gitlab/pipelines/:projectId`

Get GitLab CI pipelines for a project.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Path Parameters**:
- `projectId` (string): Project ID

**Query Parameters**:
- `status` (string, optional): Filter by status (`running`, `pending`, `success`, `failed`)
- `ref` (string, optional): Filter by branch/tag
- `limit` (number, optional): Number of pipelines to return (default: 10, max: 50)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "pipelines": [
      {
        "id": 456789,
        "status": "success",
        "ref": "main",
        "sha": "abc123def456",
        "createdAt": "2024-01-15T09:00:00Z",
        "startedAt": "2024-01-15T09:01:00Z",
        "finishedAt": "2024-01-15T09:20:00Z",
        "duration": 1140,
        "url": "https://gitlab.com/username/project/-/pipelines/456789"
      }
    ]
  }
}
```

---

#### `GET /api/v1/integrations/gitlab/pipelines/:projectId/:pipelineId`

Get detailed pipeline information including jobs.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Path Parameters**:
- `projectId` (string): Project ID
- `pipelineId` (string): Pipeline ID

**Response** (200):
```json
{
  "success": true,
  "data": {
    "pipeline": {
      "id": 456789,
      "status": "success",
      "ref": "main",
      "sha": "abc123def456",
      "jobs": [
        {
          "id": 111,
          "name": "build",
          "stage": "build",
          "status": "success",
          "duration": 300,
          "startedAt": "2024-01-15T09:01:00Z",
          "finishedAt": "2024-01-15T09:06:00Z"
        },
        {
          "id": 222,
          "name": "test",
          "stage": "test",
          "status": "success",
          "duration": 540,
          "startedAt": "2024-01-15T09:06:00Z",
          "finishedAt": "2024-01-15T09:15:00Z"
        }
      ]
    }
  }
}
```

---

### Webhooks

#### `POST /api/v1/webhooks/github`

Handle GitHub webhook events.

**Headers**:
```
X-Hub-Signature-256: sha256=xxxxx
X-GitHub-Event: workflow_run
X-GitHub-Delivery: xxxxx
Content-Type: application/json
```

**Request Body**: GitHub webhook payload (varies by event type)

**Response** (200):
```json
{
  "received": true
}
```

**Supported Events**:
- `workflow_run` - Workflow run status updates
- `workflow_job` - Job status updates

**Errors**:
- 401: Invalid webhook signature
- 400: Unsupported event type

---

#### `POST /api/v1/webhooks/gitlab`

Handle GitLab webhook events.

**Headers**:
```
X-Gitlab-Token: <webhook_secret>
X-Gitlab-Event: Pipeline Hook
Content-Type: application/json
```

**Request Body**: GitLab webhook payload (varies by event type)

**Response** (200):
```json
{
  "received": true
}
```

**Supported Events**:
- `Pipeline Hook` - Pipeline status updates
- `Job Hook` - Job status updates

**Errors**:
- 401: Invalid webhook token
- 400: Unsupported event type

---

## WebSocket Events

### Connection

**URL**: `ws://localhost:3001` or `wss://api.flowiz.com`

**Connection**:
```javascript
const socket = io('http://localhost:3001', {
  transports: ['websocket']
});
```

### Client Events (Emit)

#### `subscribe-pipeline`

Subscribe to updates for a specific pipeline/workflow run.

```javascript
socket.emit('subscribe-pipeline', 'pipeline_123');
```

#### `unsubscribe-pipeline`

Unsubscribe from pipeline updates.

```javascript
socket.emit('unsubscribe-pipeline', 'pipeline_123');
```

### Server Events (Listen)

#### `pipeline-update`

Emitted when pipeline status changes.

```javascript
socket.on('pipeline-update', (data) => {
  console.log(data);
  // {
  //   pipelineId: 'pipeline_123',
  //   status: 'in_progress',
  //   progress: 0.5,
  //   updatedAt: '2024-01-15T09:10:00Z'
  // }
});
```

**Data Structure**:
```typescript
{
  pipelineId: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped';
  progress: number; // 0.0 to 1.0
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
}
```

#### `job-update`

Emitted when individual job status changes.

```javascript
socket.on('job-update', (data) => {
  console.log(data);
  // {
  //   jobId: 'build',
  //   status: 'completed',
  //   conclusion: 'success',
  //   duration: 300
  // }
});
```

**Data Structure**:
```typescript
{
  jobId: string;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  duration?: number; // in seconds
  logs?: string[];
}
```

---

## Data Models

### ParsedPipeline

```typescript
{
  platform: 'github' | 'gitlab';
  jobs: Job[];
  dependencies: Dependency[];
  metadata: PipelineMetadata;
}
```

### Job

```typescript
{
  id: string;
  name: string;
  steps: Step[];
  dependsOn: string[]; // Job IDs this job depends on
  environment?: string;
  timeout?: number; // in minutes
  runsOn?: string; // e.g., "ubuntu-latest"
  stage?: string; // GitLab only
  allowFailure?: boolean;
  when?: 'on_success' | 'on_failure' | 'always' | 'manual';
  estimatedDuration?: number; // in seconds
}
```

### Step

```typescript
{
  id: string;
  name?: string;
  uses?: string; // GitHub Actions only
  run?: string; // Shell command
  with?: Record<string, any>; // Action inputs
  env?: Record<string, string>;
}
```

### Dependency

```typescript
{
  from: string; // Source job ID
  to: string; // Target job ID
  type: 'needs' | 'depends_on' | 'implicit' | 'stage';
}
```

### PipelineMetadata

```typescript
{
  workflowName?: string;
  triggers?: string[]; // e.g., ["push", "pull_request"]
  branches?: string[];
  stages?: string[]; // GitLab only
  totalJobs: number;
  estimatedDuration?: number;
}
```

### Graph

```typescript
{
  nodes: GraphNode[];
  edges: GraphEdge[];
}
```

### GraphNode

```typescript
{
  id: string;
  label: string;
  type: 'job';
  metadata?: {
    duration?: number;
    status?: string;
    stage?: string;
  };
}
```

### GraphEdge

```typescript
{
  from: string; // Node ID
  to: string; // Node ID
  type?: 'needs' | 'stage';
}
```

### CriticalPath

```typescript
{
  path: string[]; // Ordered job IDs
  totalDuration: number; // in seconds
  jobs: CriticalPathJob[];
}
```

### CriticalPathJob

```typescript
{
  id: string;
  name: string;
  duration: number; // Job duration
  cumulativeDuration: number; // Total duration up to this job
  startOffset: number; // When job can start relative to pipeline start
}
```

### Bottleneck

```typescript
{
  jobId: string;
  jobName: string;
  reason: 'longest_duration' | 'high_fan_out' | 'critical_path' | 'serial_execution';
  impact: 'high' | 'medium' | 'low';
  duration?: number;
  dependentCount?: number; // Number of jobs depending on this
  suggestions: string[];
  metrics: {
    blockingJobs?: number;
    parallelizationOpportunity?: boolean;
    estimatedImprovement?: number; // seconds
  };
}
```

### ParallelGroup

```typescript
{
  level: number; // Execution level (0 = first, 1 = second, etc.)
  jobs: string[]; // Job IDs that can run in parallel at this level
  maxDuration?: number; // Duration of longest job in group
}
```

---

## Examples

### Example 1: Parse GitHub Actions Workflow

**Request**:
```bash
curl -X POST http://localhost:3001/api/v1/parse \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "github",
    "yamlContent": "name: CI\non:\n  push:\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v2\n  test:\n    needs: build\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm test"
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "platform": "github",
    "jobs": [
      {
        "id": "build",
        "name": "build",
        "steps": [{"id": "step_0", "uses": "actions/checkout@v2"}],
        "dependsOn": [],
        "runsOn": "ubuntu-latest"
      },
      {
        "id": "test",
        "name": "test",
        "steps": [{"id": "step_0", "run": "npm test"}],
        "dependsOn": ["build"],
        "runsOn": "ubuntu-latest"
      }
    ],
    "dependencies": [
      {"from": "build", "to": "test", "type": "needs"}
    ],
    "metadata": {
      "workflowName": "CI",
      "triggers": ["push"],
      "totalJobs": 2
    }
  }
}
```

### Example 2: Analyze Pipeline

**Request**:
```bash
curl -X POST http://localhost:3001/api/v1/analysis/analyze \
  -H "Content-Type: application/json" \
  -d '{ "pipeline": { ... } }'
```

### Example 3: WebSocket Real-time Updates

```javascript
const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Connected to WebSocket');
  socket.emit('subscribe-pipeline', 'run_123456');
});

socket.on('pipeline-update', (data) => {
  console.log('Pipeline status:', data.status);
  // Update UI with pipeline progress
});

socket.on('job-update', (data) => {
  console.log('Job update:', data.jobId, data.status);
  // Update UI with job status
});
```

---

## Versioning

The API uses URL versioning (`/api/v1`, `/api/v2`, etc.).

**Current Version**: v1
**Deprecation Policy**: Previous versions will be supported for 6 months after a new version is released.

---

## Support

For API issues or questions:
- GitHub Issues: https://github.com/flowiz/flowiz-api/issues
- Documentation: https://docs.flowiz.com

---

**Last Updated**: 2024-01-15
