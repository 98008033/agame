// Player Routes - GET /v1/player/*

import { Router, type Request, type Response } from 'express';
import prisma from '../models/prisma.js';
import { createSuccessResponse, createErrorResponse, generateRequestId } from '../types/api.js';
import { getRelationshipLevel } from '../types/game.js';
import { safeJsonParse, safeJsonStringify } from '../utils/index.js';

const router = Router();

// GET /v1/player/status - 获取玩家完整状态
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;

  if (!playerId) {
    res.status(401).json(createErrorResponse(
      'UNAUTHORIZED',
      '未授权访问',
      requestId
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

    const attributes = safeJsonParse<Record<string, number>>(player.attributes, {});
    const reputation = safeJsonParse<Record<string, number>>(player.reputation, {});
    // skills currently not exposed in MVP API response
    const location = safeJsonParse<Record<string, unknown>>(player.location, {});
    const titles = safeJsonParse<string[]>(player.titles, []);
    const resources = safeJsonParse<Record<string, number>>(player.resources, {});
    const tags = safeJsonParse<string[]>(player.tags, []);

    const nextLevelExperience = player.level * 500;
    const pendingEventsCount = await prisma.event.count({
      where: { playerId, status: 'pending' },
    });

    res.json(createSuccessResponse({
      id: player.id,
      name: player.name,
      age: player.age,
      faction: player.faction,
      factionLevel: player.factionLevel,
      titles,
      level: player.level,
      experience: player.experience,
      nextLevelExperience,
      attributes: {
        physique: attributes['physique'] ?? 40,
        agility: attributes['agility'] ?? 40,
        wisdom: attributes['wisdom'] ?? 40,
        willpower: attributes['willpower'] ?? 40,
        perception: attributes['perception'] ?? 40,
        charisma: attributes['charisma'] ?? 40,
        fame: attributes['fame'] ?? 0,
        infamy: attributes['infamy'] ?? 0,
        luck: attributes['luck'] ?? 50,
      },
      reputation: {
        canglong: { value: reputation['canglong'] ?? 0, level: getRelationshipLevel(reputation['canglong'] ?? 0) },
        shuanglang: { value: reputation['shuanglang'] ?? 0, level: getRelationshipLevel(reputation['shuanglang'] ?? 0) },
        jinque: { value: reputation['jinque'] ?? 0, level: getRelationshipLevel(reputation['jinque'] ?? 0) },
        border: { value: reputation['border'] ?? 20, level: getRelationshipLevel(reputation['border'] ?? 20) },
      },
      skills: [],
      resources,
      location: {
        region: (location['region'] as string) ?? 'borderlands',
        city: (location['city'] as string) ?? null,
        faction: (location['faction'] as string) ?? 'border',
      },
      tags,
      pendingEventsCount,
    }, requestId));
  } catch (err) {
    console.error('[Player Status Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取玩家状态失败', requestId, undefined, true));
  }
});

// GET /v1/player/events - 获取玩家待处理事件
router.get('/events', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  const statusParam = (req.query['status'] as string) ?? 'pending';
  const limit = Math.min(parseInt(req.query['limit'] as string) ?? 10, 50);
  const offset = parseInt(req.query['offset'] as string) ?? 0;

  try {
    const whereClause = statusParam === 'all' ? { playerId } : { playerId, status: 'pending' };
    const total = await prisma.event.count({ where: whereClause });
    const pending = await prisma.event.count({ where: { playerId, status: 'pending' } });

    const events = await prisma.event.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const eventSummaries = events.map((event) => {
      const choices = safeJsonParse<Array<{ index: number; label: string; description: string }>>(event.choices, []);
      return {
        id: event.id,
        type: event.type,
        category: event.category,
        title: event.title,
        description: event.description,
        scope: event.scope,
        choicesPreview: choices.map((c) => ({ index: c.index, label: c.label, description: c.description })),
        createdAt: event.createdAt.toISOString(),
        expiresAt: event.expiresAt?.toISOString() ?? null,
        remainingTime: event.expiresAt ? Math.max(0, Math.floor((event.expiresAt.getTime() - Date.now()) / 1000)) : null,
        relatedNPCs: [],
        relatedFactions: [],
        importance: 'normal',
        playerTriggered: false,
      };
    });

    res.json(createSuccessResponse({ total, pending, events: eventSummaries, pagination: { limit, offset, hasMore: offset + limit < total } }, requestId));
  } catch (err) {
    console.error('[Player Events Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取事件列表失败', requestId, undefined, true));
  }
});

// GET /v1/player/events/:eventId - 获取事件详情
router.get('/events/:eventId', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;
  const eventId = req.params['eventId'];

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  try {
    const event = await prisma.event.findFirst({ where: { id: eventId, playerId } });

    if (!event) {
      res.status(404).json(createErrorResponse('NOT_FOUND', '事件不存在', requestId, { eventId }));
      return;
    }

    const choices = safeJsonParse<Array<Record<string, unknown>>>(event.choices, []);

    res.json(createSuccessResponse({
      event: {
        id: event.id,
        type: event.type,
        category: event.category,
        title: event.title,
        description: event.description,
        narrativeText: event.narrativeText ?? event.description,
        scope: event.scope,
        importance: 'normal',
        choices: choices.map((c) => ({
          index: c['index'] as number,
          label: c['label'] as string,
          description: c['description'] as string,
          canChoose: true,
        })),
        createdAt: event.createdAt.toISOString(),
        expiresAt: event.expiresAt?.toISOString() ?? null,
        relatedNPCs: [],
        relatedFactions: [],
        context: { reason: '事件触发', relatedHistory: [] },
      },
    }, requestId));
  } catch (err) {
    console.error('[Event Detail Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取事件详情失败', requestId, undefined, true));
  }
});

// POST /v1/player/decision - 提交决策
router.post('/decision', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  const { eventId, choiceIndex } = req.body;

  if (!eventId || typeof choiceIndex !== 'number') {
    res.status(400).json(createErrorResponse('INVALID_REQUEST', '缺少必要参数', requestId, { required: ['eventId', 'choiceIndex'] }));
    return;
  }

  try {
    const event = await prisma.event.findFirst({ where: { id: eventId, playerId, status: 'pending' } });

    if (!event) {
      res.status(404).json(createErrorResponse('NOT_FOUND', '事件不存在或已处理', requestId, { eventId }));
      return;
    }

    if (event.expiresAt && event.expiresAt < new Date()) {
      res.status(410).json(createErrorResponse('EVENT_EXPIRED', '事件已过期', requestId, { eventId, expiredAt: event.expiresAt.toISOString() }));
      return;
    }

    const choices = safeJsonParse<Array<Record<string, unknown>>>(event.choices, []);
    const choice = choices[choiceIndex];

    if (!choice) {
      res.status(400).json(createErrorResponse('INVALID_REQUEST', '无效的选项索引', requestId, { choiceIndex, maxChoiceIndex: choices.length - 1 }));
      return;
    }

    const decision = await prisma.decision.create({
      data: {
        playerId,
        eventId,
        choiceIndex,
        choiceLabel: choice['label'] as string,
        consequences: safeJsonStringify({ narrativeFeedback: '决策已执行' }),
        context: safeJsonStringify({ playerLevel: 1, worldDay: 1 }),
        gameDay: 1,
      },
    });

    await prisma.event.update({ where: { id: eventId }, data: { status: 'completed' } });

    res.json(createSuccessResponse({
      success: true,
      decision: { id: decision.id.toString(), eventId, choiceIndex, madeAt: decision.madeAt.toISOString() },
      immediateConsequences: { changes: {}, acquired: {}, unlocked: {} },
      narrativeFeedback: '决策已执行',
      triggeredEvents: [],
    }, requestId));
  } catch (err) {
    console.error('[Decision Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '提交决策失败', requestId, undefined, true));
  }
});

// GET /v1/player/history - 获取决策历史
router.get('/history', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  const limit = Math.min(parseInt(req.query['limit'] as string) ?? 20, 100);
  const offset = parseInt(req.query['offset'] as string) ?? 0;

  try {
    const total = await prisma.decision.count({ where: { playerId } });

    const decisions = await prisma.decision.findMany({
      where: { playerId },
      orderBy: { madeAt: 'desc' },
      take: limit,
      skip: offset,
      include: { event: true },
    });

    const decisionRecords = decisions.map((d) => ({
      id: d.id.toString(),
      eventId: d.eventId,
      eventTitle: d.event.title,
      eventType: d.event.type,
      eventCategory: d.event.category,
      choiceIndex: d.choiceIndex,
      choiceLabel: d.choiceLabel,
      madeAt: d.madeAt.toISOString(),
      gameDay: d.gameDay,
      consequences: { narrativeFeedback: '' },
      context: safeJsonParse<Record<string, unknown>>(d.context, {}),
      irreversible: d.irreversible,
    }));

    res.json(createSuccessResponse({ total, decisions: decisionRecords, pagination: { limit, offset, hasMore: offset + limit < total }, statistics: { totalDecisions: total } }, requestId));
  } catch (err) {
    console.error('[History Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取历史记录失败', requestId, undefined, true));
  }
});

export default router;