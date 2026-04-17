// Faction Routes - GET /v1/factions/*

import { Router, type Request, type Response } from 'express';
import prisma from '../models/prisma.js';
import { createSuccessResponse, createErrorResponse, generateRequestId } from '../types/api.js';
import { isValidFaction, getRelationshipLevel } from '../types/game.js';
import { safeJsonParse, safeJsonStringify } from '../utils/index.js';

const router = Router();

// POST /v1/factions/:faction/ally - 申请效忠阵营
router.post('/:faction/ally', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;
  const factionParam = req.params['faction'] ?? '';

  if (!playerId) {
    res.status(401).json(createErrorResponse(
      'UNAUTHORIZED',
      '未授权访问',
      requestId
    ));
    return;
  }

  if (!isValidFaction(factionParam)) {
    res.status(400).json(createErrorResponse(
      'INVALID_REQUEST',
      '无效的阵营ID',
      requestId,
      { faction: factionParam }
    ));
    return;
  }

  try {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) {
      res.status(404).json(createErrorResponse(
        'NOT_FOUND',
        '玩家不存在',
        requestId,
        { playerId }
      ));
      return;
    }

    // MVP阶段：简化效忠流程
    const reputation = safeJsonParse<Record<string, number>>(player.reputation, {});
    const factionRep = reputation[factionParam] ?? 0;

    // 检查声望是否满足效忠条件
    if (factionRep < 20) {
      res.json(createSuccessResponse({
        success: false,
        request: {
          faction: factionParam,
          timestamp: new Date().toISOString(),
          status: 'rejected',
        },
        factionResponse: {
          from: '阵营使者',
          dialogue: '你的声望还不够，我们需要更多了解你的忠诚。',
          attitude: 'cautious',
        },
        rejection: {
          reason: '声望不足',
          reputationChange: -5,
          retryCondition: '声望达到20以上',
          narrativeFeedback: '阵营使者婉拒了你的效忠请求。',
        },
      }, requestId));
      return;
    }

    // 更新玩家阵营信息
    const currentTitles = safeJsonParse<string[]>(player.titles, []);
    await prisma.player.update({
      where: { id: playerId },
      data: {
        faction: factionParam,
        factionLevel: 'loyal',
        titles: safeJsonStringify([...currentTitles, `${factionParam}成员`]),
        reputation: safeJsonStringify({
          ...reputation,
          [factionParam]: factionRep + 30,
        }),
      },
    });

    res.json(createSuccessResponse({
      success: true,
      request: {
        faction: factionParam,
        timestamp: new Date().toISOString(),
        status: 'accepted',
      },
      factionResponse: {
        from: '阵营领袖',
        dialogue: '欢迎你加入我们的阵营，愿你在我们的旗帜下建功立业。',
        attitude: 'welcoming',
      },
      acceptance: {
        factionLevel: 'loyal',
        initialReputation: factionRep + 30,
        welcomeGift: {
          gold: 100,
          title: `${factionParam}成员`,
        },
        narrativeFeedback: `你正式成为${factionParam}阵营的一员。`,
      },
    }, requestId));
  } catch (err) {
    console.error('[Ally Error]', err);
    res.status(500).json(createErrorResponse(
      'INTERNAL_ERROR',
      '效忠申请失败',
      requestId,
      undefined,
      true
    ));
  }
});

// GET /v1/factions/:faction/reputation - 查询阵营声望详情
router.get('/:faction/reputation', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;
  const factionParam = req.params['faction'] ?? '';

  if (!playerId) {
    res.status(401).json(createErrorResponse(
      'UNAUTHORIZED',
      '未授权访问',
      requestId
    ));
    return;
  }

  if (!isValidFaction(factionParam)) {
    res.status(400).json(createErrorResponse(
      'INVALID_REQUEST',
      '无效的阵营ID',
      requestId,
      { faction: factionParam }
    ));
    return;
  }

  try {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) {
      res.status(404).json(createErrorResponse(
        'NOT_FOUND',
        '玩家不存在',
        requestId,
        { playerId }
      ));
      return;
    }

    const reputation = safeJsonParse<Record<string, number>>(player.reputation, {});
    const factionRep = reputation[factionParam] ?? 0;

    res.json(createSuccessResponse({
      faction: factionParam,
      reputation: {
        value: factionRep,
        level: getRelationshipLevel(factionRep),
        trend: 'stable',
        weeklyChange: 0,
      },
      allegiance: {
        isAlly: player.faction === factionParam,
        level: player.faction === factionParam ? player.factionLevel : null,
        position: null,
        joinedAt: null,
        daysSinceJoining: null,
      },
      privileges: {
        available: [],
        locked: [],
        unlockConditions: {},
      },
      availableMissions: [],
      keyFiguresAttitude: [],
      contributions: {
        total: 0,
        byType: {},
        recentActions: [],
      },
    }, requestId));
  } catch (err) {
    console.error('[Reputation Error]', err);
    res.status(500).json(createErrorResponse(
      'INTERNAL_ERROR',
      '获取声望信息失败',
      requestId,
      undefined,
      true
    ));
  }
});

export default router;