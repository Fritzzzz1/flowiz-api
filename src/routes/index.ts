/**
 * Main routes index
 *
 * Aggregates all route modules and exports a single router.
 */

import { Router } from 'express';
import parseRoutes from './parse.routes';
import analysisRoutes from './analysis.routes';
// import githubRoutes from './github.routes';
// import gitlabRoutes from './gitlab.routes';
// import webhookRoutes from './webhook.routes';

const router = Router();

// Mount routes
router.use('/parse', parseRoutes);
router.use('/analysis', analysisRoutes);
// router.use('/integrations/github', githubRoutes);
// router.use('/integrations/gitlab', gitlabRoutes);
// router.use('/webhooks', webhookRoutes);

// API info route
router.get('/', (_req, res) => {
  res.json({
    name: 'FloWiz API',
    version: '1.0.0',
    description: 'Backend API for parsing CI/CD configurations and providing pipeline analysis',
    endpoints: {
      parse: '/api/v1/parse',
      validate: '/api/v1/parse/validate',
      detectPlatform: '/api/v1/parse/detect-platform',
      analysis: '/api/v1/analysis',
      analyze: '/api/v1/analysis/analyze',
      dependencyGraph: '/api/v1/analysis/dependency-graph',
      criticalPath: '/api/v1/analysis/critical-path',
      bottlenecks: '/api/v1/analysis/bottlenecks',
      parallelGroups: '/api/v1/analysis/parallel-groups',
      github: '/api/v1/integrations/github',
      gitlab: '/api/v1/integrations/gitlab',
      webhooks: '/api/v1/webhooks',
    },
    documentation: '/api-docs',
    health: '/health',
  });
});

export default router;
