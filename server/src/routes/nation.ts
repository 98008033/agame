// Nation Routes - GET /v1/nations/*

import { Router, type Request, type Response } from 'express';
import prisma from '../models/prisma.js';
import { createSuccessResponse, createErrorResponse, generateRequestId } from '../types/api.js';
import { isValidNation, getRelationshipLevel, NationNames } from '../types/game.js';
import { safeJsonParse, safeJsonStringify } from '../utils/index.js';
import {
  getPlayerNationReputation,
  getNationMembers,
  getNationRankings,
  interactWithNation,
} from '../services/nationService.js';

const router = Router();

// POST /v1/nations/:nation/ally - 申请效忠阵营
router.post('/:nation/ally', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;
  const nationParam = req.params['nation'] ?? '';

  if (!playerId) {
    res.status(401).json(createErrorResponse(
      'UNAUTHORIZED',
      '未授权访问',
      requestId
    ));
    return;
  }

  if (!isValidNation(nationParam)) {
    res.status(400).json(createErrorResponse(
      'INVALID_REQUEST',
      '无效的国家ID',
      requestId,
      { nation: nationParam }
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
    const nationRep = reputation[nationParam] ?? 0;

    // 检查声望是否满足效忠条件
    if (nationRep < 20) {
      res.json(createSuccessResponse({
        success: false,
        request: {
          nation: nationParam,
          timestamp: new Date().toISOString(),
          status: 'rejected',
        },
        nationResponse: {
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
        faction: nationParam,
        factionLevel: 'loyal',
        titles: safeJsonStringify([...currentTitles, `${nationParam}成员`]),
        reputation: safeJsonStringify({
          ...reputation,
          [nationParam]: nationRep + 30,
        }),
      },
    });

    res.json(createSuccessResponse({
      success: true,
      request: {
        nation: nationParam,
        timestamp: new Date().toISOString(),
        status: 'accepted',
      },
      nationResponse: {
        from: '阵营领袖',
        dialogue: '欢迎你加入我们的阵营，愿你在我们的旗帜下建功立业。',
        attitude: 'welcoming',
      },
      acceptance: {
        factionLevel: 'loyal',
        initialReputation: nationRep + 30,
        welcomeGift: {
          gold: 100,
          title: `${nationParam}成员`,
        },
        narrativeFeedback: `你正式成为${nationParam}阵营的一员。`,
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

// GET /v1/nations/:nation/reputation - 查询阵营声望详情
router.get('/:nation/reputation', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;
  const nationParam = req.params['nation'] ?? '';

  if (!playerId) {
    res.status(401).json(createErrorResponse(
      'UNAUTHORIZED',
      '未授权访问',
      requestId
    ));
    return;
  }

  if (!isValidNation(nationParam)) {
    res.status(400).json(createErrorResponse(
      'INVALID_REQUEST',
      '无效的国家ID',
      requestId,
      { nation: nationParam }
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
    const nationRep = reputation[nationParam] ?? 0;
    const tags = safeJsonParse<string[]>(player.tags, []);

    // Compute meaningful nation reputation data from player state
    const repLevel = getRelationshipLevel(nationRep);
    const isAlly = player.faction === nationParam;

    // Derive nation titles from player's tags
    const nationTags = tags.filter(t => t.includes(nationParam) || t.includes(NationNames[nationParam as keyof typeof NationNames] ?? ''));

    // Calculate contribution score from game actions toward this nation
    const nationActions = await prisma.gameAction.findMany({
      where: { playerId },
      orderBy: { executedAt: 'desc' },
      take: 10,
    });
    const recentNationActions = nationActions.filter(a => {
      const rewards = safeJsonParse<Record<string, unknown>>(a.rewards, {});
      return rewards['nation'] === nationParam || a.actionType === 'visit_npc';
    }).slice(0, 3).map(a => ({
      type: a.actionType,
      narrative: a.narrativeFeedback,
      executedAt: a.executedAt.toISOString(),
    }));

    // Derive key figure attitudes from NPC relationships with same nation
    const nationNPCs = await prisma.nPC.findMany({
      where: { faction: nationParam, role: { in: ['key', 'important'] } },
      take: 3,
    });
    const keyFigures = nationNPCs.map(npc => {
      const rels = safeJsonParse<Record<string, Record<string, number>>>(npc.relationships, {});
      const playerRel = rels['players']?.[playerId] ?? 0;
      return {
        npcId: npc.id,
        name: npc.name,
        position: npc.factionPosition ?? npc.role,
        attitude: getRelationshipLevel(playerRel),
        relationshipValue: playerRel,
      };
    });

    // Reputation milestones and unlock info
    const milestones = [
      { threshold: 20, label: '效忠资格', unlocked: nationRep >= 20 },
      { threshold: 50, label: '友善', unlocked: nationRep >= 50 },
      { threshold: 100, label: '信赖', unlocked: nationRep >= 100 },
      { threshold: 200, label: '尊敬', unlocked: nationRep >= 200 },
    ];
    const nextMilestone = milestones.find(m => !m.unlocked);

    res.json(createSuccessResponse({
      nation: nationParam,
      nationName: NationNames[nationParam as keyof typeof NationNames] ?? nationParam,
      reputation: {
        value: nationRep,
        level: repLevel,
        trend: nationRep > 0 ? 'positive' : 'stable',
      },
      allegiance: {
        isAlly,
        level: isAlly ? player.factionLevel : null,
        titles: nationTags,
      },
      milestones,
      nextMilestone: nextMilestone ?? null,
      keyFiguresAttitude: keyFigures,
      recentActions: recentNationActions,
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

// GET /v1/nations/reputation - 获取玩家所有国家声望
router.get('/reputation', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  try {
    const result = await getPlayerNationReputation(playerId);
    res.json(createSuccessResponse(result, requestId));
  } catch (err) {
    console.error('[Nation Reputation Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取国家声望失败', requestId, undefined, true));
  }
});

// GET /v1/nations/:id/members - 获取国家成员列表
router.get('/:id/members', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const nationParam = req.params['id'] ?? '';
  const limit = Math.min(parseInt(req.query['limit'] as string) || 50, 100);
  const offset = parseInt(req.query['offset'] as string) || 0;

  if (!isValidNation(nationParam)) {
    res.status(400).json(createErrorResponse('INVALID_REQUEST', '无效的国家ID', requestId));
    return;
  }

  try {
    const { members, total } = await getNationMembers(nationParam, limit, offset);
    res.json(createSuccessResponse({ members, total, pagination: { limit, offset, hasMore: offset + limit < total } }, requestId));
  } catch (err) {
    console.error('[Nation Members Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取成员列表失败', requestId, undefined, true));
  }
});

// GET /v1/nations/rankings - 获取国家排行榜
router.get('/rankings', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const limit = Math.min(parseInt(req.query['limit'] as string) || 100, 200);

  try {
    const { rankings } = await getNationRankings(limit);
    res.json(createSuccessResponse({ rankings }, requestId));
  } catch (err) {
    console.error('[Nation Rankings Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取排行榜失败', requestId, undefined, true));
  }
});

// POST /v1/nations/:id/interact - 与国家互动（增减声誉）
router.post('/:id/interact', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;
  const nationParam = req.params['id'] ?? '';

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  if (!isValidNation(nationParam)) {
    res.status(400).json(createErrorResponse('INVALID_REQUEST', '无效的国家ID', requestId));
    return;
  }

  const { delta, reason } = req.body;
  if (typeof delta !== 'number') {
    res.status(400).json(createErrorResponse('INVALID_REQUEST', '缺少delta参数', requestId));
    return;
  }

  try {
    const result = await interactWithNation(playerId, nationParam, delta, reason);
    res.json(createSuccessResponse(result, requestId));
  } catch (err) {
    console.error('[Nation Interact Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '国家互动失败', requestId, undefined, true));
  }
});

export default router;
