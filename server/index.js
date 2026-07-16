'use strict';

require('dotenv').config();
require('express-async-errors');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const config = require('./src/config');
const logger = require('./src/utils/logger');
const requestLogger = require('./src/middleware/requestLogger');
const errorHandler = require('./src/middleware/errorHandler');
const routes = require('./src/routes');
const { startAnonSessionCleanup } = require('./src/services/cleanupScheduler');

const app = express();

// Trust proxy so express-rate-limit / secure cookies see the real client IP.
// Configurable via TRUST_PROXY: a hop count (e.g. "1" for nginx, "2" for
// Cloudflare+nginx), "true"/"false", or a subnet/IP list.
function resolveTrustProxy(value) {
  if (value === undefined || value === null || value === '') return false;
  const raw = String(value).trim();
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (/^\d+$/.test(raw)) return parseInt(raw, 10);
  return raw;
}
app.set('trust proxy', resolveTrustProxy(config.trustProxy));

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Request logging
app.use(requestLogger);

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// API routes
app.use('/api', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
  });
});

// Centralized error handler
app.use(errorHandler);

const PORT = config.port;

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Zamanla server listening on port ${PORT}`, {
      port: PORT,
      env: config.nodeEnv,
      corsOrigin: config.corsOrigin,
    });
  });

  // Periodically delete abandoned anonymous sessions so the DB doesn't grow
  // unbounded. Only starts with the real server, never when the app is
  // imported (e.g. by tests), which call the service directly.
  startAnonSessionCleanup();
}

module.exports = app;
