// Auth Routes - POST /v1/auth/*

import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../models/prisma.js';
import { createSuccessResponse, createErrorResponse, generateRequestId } from '../types/api.js';
import { generateToken, generateRefreshToken } from '../middleware/auth.js';
import {
  DEFAULT_PLAYER_ATTRIBUTES,
  DEFAULT_FACTION_REPUTATION,
  DEFAULT_PLAYER_RESOURCES,
  DEFAULT_PLAYER_LOCATION,
  DEFAULT_SKILL_SET,
  isValidFaction,
} from '../types/game.js';
import { safeJsonStringify } from '../utils/index.js';

const router = Router();

// POST /v1/auth/register - 玩家注册 (兼容端点，与login相同)
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  // 注册与登录逻辑相同，自动创建新玩家
  handleLogin(req, res);
});

// POST /v1/auth/login - 玩家登录/注册
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  handleLogin(req, res);
});

// 提取登录逻辑为独立函数
async function handleLogin(req: Request, res: Response): Promise<void> {
  const requestId = generateRequestId();
  const { provider, identityToken, newPlayer } = req.body;

  if (!provider || !identityToken) {
    res.status(400).json(createErrorResponse(
      'INVALID_REQUEST',
      '缺少必要参数',
      requestId,
      { required: ['provider', 'identityToken'] }
    ));
    return;
  }

  try {
    // MVP阶段：简化认证，使用identityToken作为userId
    const userId = `${provider}_${identityToken}`;

    // 查找现有玩家
    let player = await prisma.player.findUnique({
      where: { userId },
    });

    let isNew = false;

    if (!player) {
      // 新玩家注册
      if (!newPlayer?.name) {
        res.status(400).json(createErrorResponse(
          'INVALID_REQUEST',
          '新玩家需要提供名称',
          requestId,
          { required: ['newPlayer.name'] }
        ));
        return;
      }

      isNew = true;

      // 确定起始阵营
      const startingFaction = newPlayer.startingFaction && isValidFaction(newPlayer.startingFaction)
        ? newPlayer.startingFaction
        : 'border';

      // 创建玩家ID
      const playerId = `player_${uuidv4().substring(0, 8)}`;

      // 创建初始位置
      const initialLocation = {
        ...DEFAULT_PLAYER_LOCATION,
        faction: startingFaction,
      };

      // 创建初始声望
      const initialReputation = {
        ...DEFAULT_FACTION_REPUTATION,
        [startingFaction]: 20, // 起始阵营初始声望+20
      };

      player = await prisma.player.create({
        data: {
          id: playerId,
          userId,
          name: newPlayer.name,
          age: 18,
          faction: startingFaction,
          factionLevel: 'friendly',
          titles: safeJsonStringify(['暮光村居民']),
          level: 1,
          experience: 0,
          attributes: safeJsonStringify(DEFAULT_PLAYER_ATTRIBUTES),
          reputation: safeJsonStringify(initialReputation),
          skills: safeJsonStringify(DEFAULT_SKILL_SET),
          relationships: '{}',
          tags: '[]',
          resources: safeJsonStringify(DEFAULT_PLAYER_RESOURCES),
          location: safeJsonStringify(initialLocation),
        },
      });
    }

    // 获取世界状态
    const worldState = await prisma.worldState.findFirst({
      orderBy: { day: 'desc' },
    });

    // 统计待处理事件
    const pendingEventsCount = await prisma.event.count({
      where: { playerId: player.id, status: 'pending' },
    });

    // 生成token
    const token = generateToken(player.id);
    const refreshToken = generateRefreshToken(player.id);

    res.json(createSuccessResponse({
      success: true,
      auth: {
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        refreshToken,
      },
      player: {
        id: player.id,
        name: player.name,
        isNew,
        faction: player.faction,
        level: player.level,
      },
      gameState: {
        currentDay: worldState?.day ?? 1,
        historyStage: worldState?.historyStage ?? 'era_power_struggle',
        pendingEventsCount,
      },
      ...(isNew ? {
        newPlayerWelcome: {
          startingLocation: '暮光村',
          initialAttributes: DEFAULT_PLAYER_ATTRIBUTES,
          initialSkills: DEFAULT_SKILL_SET,
          narrativeIntro: '你站在暮光村的小路上，晨光穿过稀薄的云层，照亮了这座边境小镇...',
        },
      } : {}),
    }, requestId));
  } catch (err) {
    console.error('[Login Error]', err);
    res.status(500).json(createErrorResponse(
      'INTERNAL_ERROR',
      '登录失败',
      requestId,
      undefined,
      true
    ));
  }
}

// POST /v1/auth/refresh - 刷新token
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const requestId = generateRequestId();
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json(createErrorResponse(
      'INVALID_REQUEST',
      '缺少刷新令牌',
      requestId
    ));
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      res.status(401).json(createErrorResponse(
        'UNAUTHORIZED',
        '无效的刷新令牌',
        requestId
      ));
      return;
    }

    // 验证玩家是否存在
    const player = await prisma.player.findUnique({
      where: { id: payload.playerId },
    });

    if (!player) {
      res.status(404).json(createErrorResponse(
        'NOT_FOUND',
        '玩家不存在',
        requestId
      ));
      return;
    }

    // 生成新token
    const newToken = generateToken(player.id);
    const newRefreshToken = generateRefreshToken(player.id);

    res.json(createSuccessResponse({
      success: true,
      auth: {
        token: newToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        refreshToken: newRefreshToken,
      },
    }, requestId));
  } catch (err) {
    console.error('[Refresh Error]', err);
    res.status(500).json(createErrorResponse(
      'INTERNAL_ERROR',
      '刷新令牌失败',
      requestId,
      undefined,
      true
    ));
  }
});

import { verifyRefreshToken } from '../middleware/auth.js';

export default router;