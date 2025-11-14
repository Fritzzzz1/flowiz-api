/**
 * Main routes index
 *
 * Aggregates all route modules and exports a single router.
 */

import { Router } from 'express';

const router = Router();

// Import route modules (will be added in Phase 3-7)
// import parseRoutes from './parse.routes';
// import analysisRoutes from './analysis.routes';
// import githubRoutes from './github.routes';
// import gitlabRoutes from './gitlab.routes';
// import webhookRoutes from './webhook.routes';

// Mount routes
// router.use('/parse', parseRoutes);
// router.use('/analysis', analysisRoutes);
// router.use('/integrations/github', githubRoutes);
// router.use('/integrations/gitlab', gitlabRoutes);
// router.use('/webhooks', webhookRoutes);

// Placeholder route for API info
router.get('/', (_req, res) => {
  res.json({
    name: 'FloWiz API',
    version: '1.0.0',
    description: 'Backend API for parsing CI/CD configurations and providing pipeline analysis',
    endpoints: {
      parse: '/api/v1/parse',
      analysis: '/api/v1/analysis',
      github: '/api/v1/integrations/github',
      gitlab: '/api/v1/integrations/gitlab',
      webhooks: '/api/v1/webhooks',
    },
    documentation: '/api-docs',
    health: '/health',
  });
});

export default router;
