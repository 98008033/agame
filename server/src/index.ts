// Agame Backend Server Entry Point
// Version: MVP v1.0

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from 'dotenv';

import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { authMiddleware } from './middleware/auth.js';
import { apiRateLimiter, ipRateLimiter } from './middleware/rateLimiter.js';
import { wsNotificationService } from './services/websocket.js';
import { agentScheduler } from './agents/AgentScheduler.js';

import worldRoutes from './routes/world.js';
import playerRoutes from './routes/player.js';
import npcRoutes from './routes/npc.js';
import npcLifecycleRoutes from './routes/npcLifecycle.js';
import nationRoutes from './routes/nation.js';
import authRoutes from './routes/auth.js';
import systemRoutes from './routes/system.js';
import internalFactionRoutes from './routes/internalFaction.js';
import actionRoutes from './routes/actions.js';
import eventRoutes from './routes/events.js';
import adminRoutes from './routes/admin.js';
import narrativeRoutes from './routes/narrative.js';
import npcDialogRoutes from './routes/npcDialog.js';

// Load environment variables
config();

const app = express();
const PORT = process.env['PORT'] ?? 3000;

// ============================================
// Middleware Setup
// ============================================

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env['CORS_ORIGIN'] ?? '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  credentials: true,
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Global IP rate limiter (protects all routes)
app.use(ipRateLimiter);

// ============================================
// API Routes
// ============================================

// Health check (no auth required)
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: 'v1.0.0',
  });
});

// System routes (no auth required for version check)
app.use('/v1', systemRoutes);

// Auth routes (public)
app.use('/v1/auth', authRoutes);

// Admin routes (requires admin secret)
app.use('/v1/admin', adminRoutes);

// Protected routes (with API rate limiter)
app.use('/v1/world', authMiddleware, apiRateLimiter, worldRoutes);
app.use('/v1/player', authMiddleware, apiRateLimiter, playerRoutes);
app.use('/v1/npcs', authMiddleware, apiRateLimiter, npcRoutes);
app.use('/v1/npcs/lifecycle', authMiddleware, apiRateLimiter, npcLifecycleRoutes);
app.use('/v1/nations', authMiddleware, apiRateLimiter, nationRoutes);
app.use('/v1/actions', authMiddleware, apiRateLimiter, actionRoutes);
app.use('/v1/events', authMiddleware, apiRateLimiter, eventRoutes);
app.use('/v1/narrative', authMiddleware, apiRateLimiter, narrativeRoutes);
app.use('/v1/npc-dialog', authMiddleware, apiRateLimiter, npcDialogRoutes);
app.use('/v1/factions', authMiddleware, apiRateLimiter, internalFactionRoutes);

// ============================================
// Error Handling
// ============================================

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    data: null,
    error: {
      code: 'NOT_FOUND',
      message: '资源不存在',
      details: null,
      retryable: false,
    },
    metadata: {
      timestamp: new Date().toISOString(),
      version: 'v1.0.0',
      requestId: '',
      serverTime: Date.now(),
    },
  });
});

// Global error handler
app.use(errorHandler);

// ============================================
// Server Startup
// ============================================

const server = app.listen(PORT, () => {
  console.log(`[Agame Server] Running on port ${PORT}`);
  console.log(`[Agame Server] Environment: ${process.env['NODE_ENV'] ?? 'development'}`);
  console.log(`[Agame Server] API Version: v1.0.0`);

  // Initialize WebSocket notification service
  wsNotificationService.init(server);

  // Start Agent Scheduler (National + City Agents)
  agentScheduler.start();
  console.log('[Agame Server] Agent Scheduler started');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Agame Server] SIGTERM received, shutting down gracefully');
  agentScheduler.stop();
  wsNotificationService.close();
  server.close(() => {
    console.log('[Agame Server] Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('[Agame Server] SIGINT received, shutting down gracefully');
  agentScheduler.stop();
  wsNotificationService.close();
  server.close(() => {
    console.log('[Agame Server] Process terminated');
  });
});

export default app;