import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { errorHandler } from './shared/middleware/errorHandler';
import { logger } from './shared/utils/logger';
import { swaggerSpec } from './docs/swagger';

import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import albumsRoutes from './modules/albums/albums.routes';
import artistsRoutes from './modules/artists/artists.routes';
import reviewsRoutes from './modules/reviews/reviews.routes';
import followsRoutes from './modules/follows/follows.routes';
import statsRoutes from './modules/stats/stats.routes';
import streaksRoutes from './modules/streaks/streaks.routes';
import spotifyRoutes from './modules/spotify/spotify.routes';

export function createApp() {
  const app = express();

  // Swagger UI — CSP desabilitado só nesta rota para permitir os assets inline
  app.use(
    '/api-docs',
    (_req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:",
      );
      next();
    },
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, { customSiteTitle: 'Humix API Docs' }),
  );

  // Security — skip for /api-docs (CSP already set above with permissive directives)
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api-docs')) return next();
    return helmet()(req, res, next);
  });
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );


  // Body parsing
  app.use(express.json());
  app.use(compression());

  // Logging
  app.use(
    morgan('combined', {
      stream: { write: (message) => logger.http(message.trim()) },
      skip: () => env.NODE_ENV === 'test',
    }),
  );

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', usersRoutes);
  app.use('/api/v1/albums', albumsRoutes);
  app.use('/api/v1/artists', artistsRoutes);
  app.use('/api/v1/reviews', reviewsRoutes);
  app.use('/api/v1/users', followsRoutes);
  app.use('/api/v1/stats', statsRoutes);
  app.use('/api/v1/streaks', streaksRoutes);
  app.use('/api/v1/spotify', spotifyRoutes);

  // 404
  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  // Error handler
  app.use(errorHandler);

  return app;
}
