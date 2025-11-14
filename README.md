# FloWiz API

> Backend API for parsing CI/CD configurations, integrating with GitHub/GitLab, and providing real-time pipeline monitoring.

[![Build Status](https://img.shields.io/github/workflow/status/flowiz/flowiz-api/CI)](https://github.com/flowiz/flowiz-api/actions)
[![Coverage](https://img.shields.io/codecov/c/github/flowiz/flowiz-api)](https://codecov.io/gh/flowiz/flowiz-api)
[![License](https://img.shields.io/github/license/flowiz/flowiz-api)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green)](https://nodejs.org/)

---

## 🎯 Overview

FloWiz API is a powerful backend service that enables visualization and analysis of CI/CD pipelines. It provides:

- **Universal CI/CD Parsing**: Parse GitHub Actions and GitLab CI YAML files into a unified data structure
- **Intelligent Analysis**: Identify critical paths, bottlenecks, and optimization opportunities
- **Real-time Updates**: WebSocket-based live pipeline status monitoring
- **Platform Integration**: OAuth authentication and API integration with GitHub and GitLab
- **RESTful API**: Clean, well-documented endpoints for all functionality

---

## 🌟 Key Features

### 🔍 Parser Engine
- ✅ GitHub Actions YAML parser
- ✅ GitLab CI YAML parser
- ✅ Unified pipeline data model
- ✅ YAML validation and error reporting
- 🔜 Support for CircleCI, Jenkins, Travis CI

### 📊 Analysis Engine
- **Dependency Graph**: Visualize job dependencies
- **Critical Path**: Find the longest execution path
- **Bottleneck Detection**: Identify jobs that slow down pipelines
- **Parallel Execution**: Discover parallelization opportunities
- **Cycle Detection**: Find circular dependencies

### 🔗 Integrations
- **GitHub**: OAuth authentication, repository access, workflow data
- **GitLab**: OAuth authentication, project access, pipeline data
- **Webhooks**: Real-time updates from GitHub and GitLab

### ⚡ Real-time Features
- WebSocket connections for live updates
- Pipeline status changes
- Job completion notifications
- Progress tracking

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.x or higher
- **npm** 8.x or higher
- **Git** 2.x or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/flowiz/flowiz-api.git
cd flowiz-api

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run in development mode
npm run dev
```

The API will be available at `http://localhost:3001`.

### Verify Installation

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 123,
  "version": "1.0.0"
}
```

---

## 📖 Documentation

### Core Documentation
- **[Architecture](docs/ARCHITECTURE.md)**: System design and component overview
- **[API Specification](docs/API_SPEC.md)**: Detailed endpoint documentation
- **[Development Guide](docs/DEVELOPMENT.md)**: Setup, coding standards, and best practices
- **[OpenAPI Schema](docs/openapi.yaml)**: Machine-readable API specification

### Quick Links
- [API Endpoints](#api-endpoints)
- [Authentication](#authentication)
- [WebSocket Events](#websocket-events)
- [Examples](#examples)

---

## 🔌 API Endpoints

### Parse & Validate

#### Parse CI/CD Configuration
```http
POST /api/v1/parse
Content-Type: application/json

{
  "platform": "github",
  "yamlContent": "name: CI\njobs:\n  build:\n    runs-on: ubuntu-latest"
}
```

#### Validate Configuration
```http
POST /api/v1/validate
Content-Type: application/json

{
  "platform": "gitlab",
  "yamlContent": "..."
}
```

### Analysis

#### Analyze Pipeline
```http
POST /api/v1/analysis/analyze
Content-Type: application/json

{
  "pipeline": {
    "platform": "github",
    "jobs": [...],
    "dependencies": [...]
  }
}
```

### GitHub Integration

```http
GET  /api/v1/integrations/github/auth
GET  /api/v1/integrations/github/callback?code=xxx
GET  /api/v1/integrations/github/repositories
GET  /api/v1/integrations/github/workflows/:owner/:repo
GET  /api/v1/integrations/github/runs/:owner/:repo/:workflowId
```

### GitLab Integration

```http
GET  /api/v1/integrations/gitlab/auth
GET  /api/v1/integrations/gitlab/callback?code=xxx
GET  /api/v1/integrations/gitlab/projects
GET  /api/v1/integrations/gitlab/pipelines/:projectId
GET  /api/v1/integrations/gitlab/pipelines/:projectId/:pipelineId
```

### Webhooks

```http
POST /api/v1/webhooks/github
POST /api/v1/webhooks/gitlab
```

For complete endpoint documentation, see [API_SPEC.md](docs/API_SPEC.md).

---

## 🔐 Authentication

### OAuth 2.0 Flow

FloWiz API uses OAuth 2.0 for GitHub and GitLab authentication:

1. **Initiate OAuth**: Redirect user to `/api/v1/integrations/{platform}/auth`
2. **User authorizes**: On GitHub/GitLab
3. **Callback**: Platform redirects to `/api/v1/integrations/{platform}/callback?code=xxx`
4. **Token exchange**: API exchanges code for access token
5. **Use token**: Include in `Authorization: Bearer <token>` header for protected endpoints

### Environment Setup

Create a GitHub/GitLab OAuth app and set these environment variables:

```env
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_CALLBACK_URL=http://localhost:3001/api/v1/integrations/github/callback

GITLAB_CLIENT_ID=your_client_id
GITLAB_CLIENT_SECRET=your_client_secret
GITLAB_CALLBACK_URL=http://localhost:3001/api/v1/integrations/gitlab/callback
```

---

## 🌐 WebSocket Events

### Connect

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001');
```

### Subscribe to Pipeline

```javascript
socket.emit('subscribe-pipeline', 'pipeline_123');
```

### Listen for Updates

```javascript
// Pipeline status update
socket.on('pipeline-update', (data) => {
  console.log('Pipeline status:', data.status);
  console.log('Progress:', data.progress);
});

// Job status update
socket.on('job-update', (data) => {
  console.log('Job:', data.jobId);
  console.log('Status:', data.status);
  console.log('Duration:', data.duration);
});
```

### Unsubscribe

```javascript
socket.emit('unsubscribe-pipeline', 'pipeline_123');
```

---

## 💡 Examples

### Example 1: Parse GitHub Actions Workflow

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

### Example 2: Analyze Pipeline for Bottlenecks

```bash
curl -X POST http://localhost:3001/api/v1/analysis/analyze \
  -H "Content-Type: application/json" \
  -d @pipeline.json
```

**Response**:
```json
{
  "success": true,
  "data": {
    "criticalPath": {
      "path": ["build", "test", "deploy"],
      "totalDuration": 1800
    },
    "bottlenecks": [
      {
        "jobId": "test",
        "reason": "longest_duration",
        "impact": "high",
        "duration": 1200,
        "suggestions": [
          "Consider parallelizing test suites",
          "Use test caching to reduce duration"
        ]
      }
    ],
    "parallelGroups": [
      {"level": 0, "jobs": ["build"]},
      {"level": 1, "jobs": ["test"]},
      {"level": 2, "jobs": ["deploy"]}
    ]
  }
}
```

### Example 3: Real-time Pipeline Monitoring

```javascript
const socket = io('http://localhost:3001');

// Subscribe to workflow run
socket.emit('subscribe-pipeline', 'run_123456');

// Listen for updates
socket.on('pipeline-update', (data) => {
  if (data.status === 'completed') {
    console.log('Pipeline finished!');
    console.log('Conclusion:', data.conclusion);
  }
});

socket.on('job-update', (data) => {
  console.log(`Job ${data.jobId}: ${data.status}`);
});
```

---

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev              # Start dev server with hot reload
npm run build            # Build for production
npm start                # Start production server

# Testing
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix linting issues
npm run format           # Format code with Prettier
npm run type-check       # TypeScript type checking
```

### Project Structure

```
flowiz-api/
├── src/
│   ├── controllers/     # Request handlers
│   ├── services/        # Business logic
│   │   ├── parsers/     # CI/CD parsers
│   │   ├── analyzers/   # Analysis algorithms
│   │   ├── integrations/# OAuth & API integrations
│   │   └── websocket/   # WebSocket service
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── models/          # Data models
│   ├── schemas/         # Zod validation schemas
│   ├── utils/           # Utilities
│   ├── app.ts           # Express app
│   └── server.ts        # Server entry
├── tests/               # Test files
├── docs/                # Documentation
└── docker/              # Docker files
```

### Running Tests

```bash
# All tests
npm test

# Specific test file
npm test -- parse.test.ts

# With coverage
npm run test:coverage
```

### Docker Development

```bash
# Build image
docker build -t flowiz-api .

# Run container
docker run -p 3001:3001 --env-file .env flowiz-api

# Using docker-compose
docker-compose up
```

---

## 🏗️ Architecture

### High-Level Architecture

```
Frontend (React)
       ↓
   API Layer (Express)
       ↓
   ┌───┴───┐
   │       │
Parsers  Analyzers
   │       │
   └───┬───┘
       ↓
  Integrations
  (GitHub/GitLab)
       ↓
   WebSocket
```

### Core Components

1. **Parser Engine**: Converts platform-specific YAML to unified structure
2. **Analysis Engine**: Analyzes dependencies, finds critical paths, detects bottlenecks
3. **Integration Layer**: OAuth and API integration with CI/CD platforms
4. **WebSocket Service**: Real-time updates via Socket.io

For detailed architecture information, see [ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## 🧪 Testing

We maintain high test coverage (>80%) across the codebase:

- **Unit Tests**: Individual functions and methods
- **Integration Tests**: API endpoints and database operations
- **E2E Tests**: Complete workflows

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```env
# Server
NODE_ENV=development
PORT=3001

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
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 🚀 Deployment

### Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
railway up
```

### Render

1. Create new Web Service
2. Connect GitHub repository
3. Set build command: `npm run build`
4. Set start command: `npm start`
5. Add environment variables

### Docker

```bash
# Build
docker build -t flowiz-api .

# Run
docker run -p 3001:3001 --env-file .env flowiz-api
```

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Contribution Guidelines

- Follow the [Development Guide](docs/DEVELOPMENT.md)
- Write tests for new features
- Maintain >80% test coverage
- Follow TypeScript and ESLint standards
- Update documentation

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [GitHub Actions](https://docs.github.com/en/actions) for workflow syntax reference
- [GitLab CI/CD](https://docs.gitlab.com/ee/ci/) for pipeline documentation
- [Express.js](https://expressjs.com/) for the web framework
- [Socket.io](https://socket.io/) for WebSocket implementation
- [Zod](https://zod.dev/) for schema validation

---

## 📞 Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/flowiz/flowiz-api/issues)
- **Discussions**: [GitHub Discussions](https://github.com/flowiz/flowiz-api/discussions)

---

## 🗺️ Roadmap

### Phase 1 (Current)
- [x] GitHub Actions parser
- [x] GitLab CI parser
- [x] Analysis engine
- [x] REST API
- [x] WebSocket support
- [x] OAuth integration

### Phase 2 (Planned)
- [ ] Database integration
- [ ] User authentication
- [ ] Pipeline history
- [ ] Advanced analytics
- [ ] ML-based duration prediction

### Phase 3 (Future)
- [ ] CircleCI support
- [ ] Jenkins support
- [ ] Travis CI support
- [ ] Azure Pipelines support
- [ ] Custom dashboards

---

## 📊 Status

- **Build**: ![Passing](https://img.shields.io/badge/build-passing-brightgreen)
- **Coverage**: ![80%](https://img.shields.io/badge/coverage-80%25-green)
- **Version**: ![1.0.0](https://img.shields.io/badge/version-1.0.0-blue)
- **Status**: ![Active Development](https://img.shields.io/badge/status-active-success)

---

<p align="center">
  Made with ❤️ by the FloWiz team
</p>

<p align="center">
  <a href="https://github.com/flowiz/flowiz-api">GitHub</a> •
  <a href="docs/API_SPEC.md">API Docs</a> •
  <a href="docs/ARCHITECTURE.md">Architecture</a> •
  <a href="docs/DEVELOPMENT.md">Development</a>
</p>
