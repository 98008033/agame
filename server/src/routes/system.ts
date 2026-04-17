// System Routes - GET /v1/*

import { Router, type Request, type Response } from 'express';
import prisma from '../models/prisma.js';
import { createSuccessResponse, createErrorResponse, generateRequestId } from '../types/api.js';

const router = Router();

// GET /v1/version - 获取版本信息
router.get('/version', (_req: Request, res: Response): void => {
  const requestId = generateRequestId();

  res.json(createSuccessResponse({
    apiVersion: 'v1.0.0',
    gameVersion: 'MVP-1.0',
    minimumClientVersion: '1.0.0',
    maintenance: {
      scheduled: false,
    },
  }, requestId));
});

// GET /v1/system/status - 系统状态检查 (兼容端点)
router.get('/system/status', (_req: Request, res: Response): void => {
  const requestId = generateRequestId();

  res.json(createSuccessResponse({
    status: 'ok',
    apiVersion: 'v1.0.0',
    gameVersion: 'MVP-1.0',
    timestamp: new Date().toISOString(),
  }, requestId));
});

// POST /v1/heartbeat - 心跳检测
router.post('/heartbeat', async (req: Request, res: Response): Promise<void> => {
  const requestId = generateRequestId();
  const playerId = req.playerId;
  const { lastKnownDay } = req.body;

  try {
    const worldState = await prisma.worldState.findFirst({
      orderBy: { day: 'desc' },
    });

    const currentDay = worldState?.day ?? 1;

    // 检查是否有新事件
    let newEventsCount = 0;
    if (playerId) {
      newEventsCount = await prisma.event.count({
        where: {
          playerId,
          status: 'pending',
          createdAt: {
            gt: new Date(Date.now() - 60 * 1000), // 最近一分钟
          },
        },
      });
    }

    res.json(createSuccessResponse({
      serverTime: new Date().toISOString(),
      gameDay: currentDay,
      historyStage: worldState?.historyStage ?? 'era_power_struggle',
      hasNewEvents: newEventsCount > 0,
      newEventsCount,
      hasStateChanges: lastKnownDay !== undefined && lastKnownDay !== currentDay,
      needNewsRefresh: lastKnownDay !== undefined && lastKnownDay !== currentDay,
    }, requestId));
  } catch (err) {
    console.error('[Heartbeat Error]', err);
    res.status(500).json(createErrorResponse(
      'INTERNAL_ERROR',
      '心跳检测失败',
      requestId,
      undefined,
      true
    ));
  }
});

export default router;