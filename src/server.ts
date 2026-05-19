import express, { Application, Request, Response } from 'express';
import { Server } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import connectDB from './config/db';
import { ENV } from './config/env';
import { errorHandler, notFound } from './middleware/error.middleware';
import { initCronJobs } from './cron/rssCron';

// Route imports
import authRoutes from './routes/auth.routes';
import newsRoutes from './routes/news.routes';
import candidateRoutes from './routes/candidate.routes';
import videoRoutes from './routes/video.routes';
import uploadRoutes from './routes/upload.routes';
import advertisementRoutes from './routes/advertisement.routes';

const app: Application = express();
const DEFAULT_PORT = ENV.PORT;
const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/i;

// Connect to database
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: (origin, callback) => {
      const isAllowedOrigin =
        !origin ||
        ENV.FRONTEND_URLS.length === 0 ||
        ENV.FRONTEND_URLS.includes(origin) ||
        localhostOriginPattern.test(origin);

      if (isAllowedOrigin) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  })
);
app.use(helmet());
app.use(compression());

if (ENV.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ads', advertisementRoutes);

// Base route
app.get('/', (req: Request, res: Response) => {
  res.send('Tamil Nadu Political News API is running...');
});

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

const shouldInitCronJobs = (activePort: number) =>
  ENV.NODE_ENV !== 'test' && activePort === DEFAULT_PORT;

const startServer = (port: number) => {
  const server: Server = app.listen(port, () => {
    console.log(`Server running in ${ENV.NODE_ENV} mode on port ${port}`);

    if (shouldInitCronJobs(port)) {
      initCronJobs();
      return;
    }

    if (ENV.NODE_ENV !== 'test') {
      console.warn(
        `Skipping cron jobs because the preferred port ${DEFAULT_PORT} is already in use.`
      );
    }
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE' && ENV.NODE_ENV === 'development') {
      console.warn(`Port ${port} is in use. Retrying on port ${port + 1}...`);
      server.close(() => startServer(port + 1));
      return;
    }

    throw error;
  });
};

startServer(DEFAULT_PORT);

export default app;
