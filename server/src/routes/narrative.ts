// Narrative Routes - GET /v1/narrative/*
// Endpoints for news, journal, biography, event scroll, and narrative intervention

import { Router, type Request, type Response } from 'express';
import prisma from '../models/prisma.js';
import { createSuccessResponse, createErrorResponse, generateRequestId } from '../types/api.js';
import { safeJsonParse } from '../utils/index.js';

const router = Router();

// ============================================
// GET /v1/narrative/news - 今日晨报
// ============================================
router.get('/news', async (req: Request, res: Response): Promise<void> => {
  const requestId = generateRequestId();

  try {
    const dayParam = req.query['day'] as string | undefined;
    let worldState;
    if (dayParam) {
      worldState = await prisma.worldState.findFirst({ where: { day: parseInt(dayParam) } });
    } else {
      worldState = await prisma.worldState.findFirst({ orderBy: { day: 'desc' } });
    }
    if (!worldState) {
      res.status(404).json(createErrorResponse('NOT_FOUND', '世界状态不存在', requestId));
      return;
    }

    const dailyNews = await prisma.dailyNews.findUnique({ where: { day: worldState.day } });
    if (!dailyNews) {
      res.json(createSuccessResponse({
        day: worldState.day,
        headline: null,
        items: [],
        summary: '暂无新闻',
        generatedAt: new Date().toISOString(),
      }, requestId));
      return;
    }

    const newsData = safeJsonParse<Record<string, unknown>>(dailyNews.news, {});
    const headline = safeJsonParse<Record<string, unknown> | null>(dailyNews.worldHeadline ?? 'null', null);
    const playerNews = safeJsonParse<Array<Record<string, unknown>>>(dailyNews.playerNews, []);

    res.json(createSuccessResponse({
      day: dailyNews.day,
      headline,
      items: playerNews,
      factionNews: newsData,
      summary: headline ? (headline['content'] as string ?? '今日无重大新闻') : '今日无重大新闻',
      generatedAt: dailyNews.generatedAt.toISOString(),
    }, requestId));
  } catch (err) {
    console.error('[Narrative News Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取新闻失败', requestId, undefined, true));
  }
});

// ============================================
// GET /v1/narrative/journal - 玩家日记
// ============================================
router.get('/journal', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  const limit = Math.min(parseInt(req.query['limit'] as string) || 10, 50);
  const offset = parseInt(req.query['offset'] as string) || 0;

  try {
    const decisions = await prisma.decision.findMany({
      where: { playerId },
      orderBy: { madeAt: 'desc' },
      take: limit,
      skip: offset,
      include: { event: true },
    });

    const entries = decisions.map(d => ({
      id: d.id.toString(),
      date: d.madeAt.toISOString(),
      gameDay: d.gameDay,
      eventTitle: d.event.title,
      choice: d.choiceLabel,
      consequences: safeJsonParse<unknown>(d.consequences, {}),
    }));

    res.json(createSuccessResponse({
      entries,
      total: entries.length,
      pagination: { limit, offset },
    }, requestId));
  } catch (err) {
    console.error('[Narrative Journal Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取日记失败', requestId, undefined, true));
  }
});

// ============================================
// GET /v1/narrative/biography/:npcId - 人物传记
// ============================================
router.get('/biography/:npcId?', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  const npcId = req.params['npcId'];

  try {
    // If npcId provided, return NPC biography; otherwise return player biography
    if (npcId) {
      const npc = await prisma.nPC.findUnique({ where: { id: npcId } });
      if (!npc) {
        res.status(404).json(createErrorResponse('NOT_FOUND', 'NPC不存在', requestId));
        return;
      }

      const personality = safeJsonParse<Record<string, number>>(npc.personality, {});
      const relationships = safeJsonParse<Record<string, unknown>>(npc.relationships, {});
      const currentStatus = safeJsonParse<Record<string, unknown>>(npc.currentStatus, {});

      res.json(createSuccessResponse({
        npc: {
          id: npc.id,
          name: npc.name,
          age: npc.age,
          faction: npc.faction,
          role: npc.role,
          personality,
          health: (currentStatus['health'] as number) ?? 100,
          isAlive: (currentStatus['isAlive'] as boolean) ?? true,
          location: (currentStatus['location'] as Record<string, unknown>) ?? {},
        },
        relationships: relationships['npcs'] ?? {},
        timeline: [],
      }, requestId));
      return;
    }

    // Player biography
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) {
      res.status(404).json(createErrorResponse('NOT_FOUND', '玩家不存在', requestId));
      return;
    }

    const decisions = await prisma.decision.findMany({
      where: { playerId },
      orderBy: { madeAt: 'asc' },
      include: { event: true },
    });

    const tags = safeJsonParse<string[]>(player.tags, []);
    const resources = safeJsonParse<Record<string, number>>(player.resources, {});
    const reputation = safeJsonParse<Record<string, number>>(player.reputation, {});

    // Build biography timeline from decisions
    const timeline = decisions.map(d => ({
      gameDay: d.gameDay,
      date: d.madeAt.toISOString(),
      event: d.event.title,
      category: d.event.category,
      choice: d.choiceLabel,
      narrativeOutcome: '',
    }));

    res.json(createSuccessResponse({
      player: {
        id: player.id,
        name: player.name,
        faction: player.faction,
        level: player.level,
        tags,
        resources,
        reputation,
      },
      timeline,
      milestones: generateMilestones(timeline, tags),
    }, requestId));
  } catch (err) {
    console.error('[Narrative Biography Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取传记失败', requestId, undefined, true));
  }
});

// ============================================
// GET /v1/narrative/scroll/:eventId? - 事件滚动
// ============================================
router.get('/event-scroll/:eventId?', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  const eventId = req.params['eventId'];

  try {
    if (eventId) {
      // Return a single event's details
      const event = await prisma.event.findFirst({
        where: { id: eventId, playerId },
      });
      if (!event) {
        res.status(404).json(createErrorResponse('NOT_FOUND', '事件不存在', requestId));
        return;
      }
      const choices = safeJsonParse<Array<Record<string, unknown>>>(event.choices, []);
      res.json(createSuccessResponse({
        event: {
          id: event.id,
          title: event.title,
          description: event.description,
          narrativeText: event.narrativeText ?? event.description,
          type: event.type,
          status: event.status,
          choices: choices.map(c => ({ index: c['index'], label: c['label'], description: c['description'] })),
          createdAt: event.createdAt.toISOString(),
          expiresAt: event.expiresAt?.toISOString() ?? null,
        },
        chapters: [],
      }, requestId));
      return;
    }

    // Return list of events
    const limit = Math.min(parseInt(req.query['limit'] as string) || 20, 50);

    const events = await prisma.event.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const eventItems = events.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      type: e.type,
      status: e.status,
      createdAt: e.createdAt.toISOString(),
      expiresAt: e.expiresAt?.toISOString() ?? null,
    }));

    res.json(createSuccessResponse({
      events: eventItems,
      total: eventItems.length,
    }, requestId));
  } catch (err) {
    console.error('[Narrative Event Scroll Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取事件滚动失败', requestId, undefined, true));
  }
});

// ============================================
// POST /v1/narrative/scroll/:eventId/intervene - 叙事干预
// ============================================
router.post('/scroll/:eventId/intervene', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  const eventId = req.params['eventId'];
  const { chapterIndex, choiceIndex } = req.body;

  try {
    const intervention = {
      eventId,
      chapterIndex: chapterIndex ?? 0,
      choiceIndex: choiceIndex ?? 0,
      playerId,
      timestamp: new Date().toISOString(),
    };

    console.log('[Narrative Intervention]', intervention);

    res.json(createSuccessResponse({
      success: true,
      intervention: {
        id: `intervention_${Date.now()}`,
        eventId,
        chapterIndex,
        choiceIndex,
        processed: true,
        timestamp: new Date().toISOString(),
      },
      narrativeFeedback: '你的行为已被记录，世界将对此做出回应。',
    }, requestId));
  } catch (err) {
    console.error('[Narrative Intervention Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '叙事干预失败', requestId, undefined, true));
  }
});

// ============================================
// Helpers
// ============================================

function generateMilestones(
  timeline: Array<{ event: string; category: string }>,
  tags: string[]
): Array<{ title: string; description: string }> {
  const milestones: Array<{ title: string; description: string }> = [];

  // Nation choice milestone
  const factionEvent = timeline.find(e => e.category === '效忠选择');
  if (factionEvent) {
    milestones.push({
      title: '效忠选择',
      description: `你做出了${factionEvent.event}的决定`,
    });
  }

  // First major decision milestone
  if (timeline.length >= 1) {
    milestones.push({
      title: '初次抉择',
      description: `你面对了人生中第一个重大事件：${timeline[0]!.event}`,
    });
  }

  // Milestone for accumulated decisions
  if (timeline.length >= 5) {
    milestones.push({
      title: '经验丰富',
      description: `你已经历了${timeline.length}个事件`,
    });
  }

  // Tag-based milestones
  for (const tag of tags) {
    milestones.push({
      title: `标签：${tag}`,
      description: `你获得了"${tag}"的称号`,
    });
  }

  return milestones;
}

export default router;
