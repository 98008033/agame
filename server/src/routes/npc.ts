// NPC Routes - GET /v1/npcs/*

import { Router, type Request, type Response } from 'express';
import prisma from '../models/prisma.js';
import { createSuccessResponse, createErrorResponse, generateRequestId } from '../types/api.js';
import { getRelationshipLevel } from '../types/game.js';
import { safeJsonParse, safeJsonStringify } from '../utils/index.js';
import {
  getLifeStageFromAge,
  getNaturalDeathProbability,
  calculateAgingEffects,
  type LifeStage,
  type DeathType,
  FactionInheritanceRules,
  LifeStageNames,
  DeathTypeNames,
} from '../types/npcLifecycle.js';
import {
  getDialogContext,
  generateDialogResponse,
  saveDialogInteraction,
  storeNPCMemory,
  getNPCMemories,
  getDialogHistory,
} from '../services/npcDialogService.js';

const router = Router();

function getPlayerRelationshipValue(relationshipsJson: string): number {
  try {
    const rels = JSON.parse(relationshipsJson) as Record<string, unknown>;
    const players = rels['players'] as Record<string, number> | undefined;
    if (!players) return 0;
    // Return the highest relationship value as MVP
    const values = Object.values(players);
    return values.length > 0 ? Math.max(...values) : 0;
  } catch {
    return 0;
  }
}

// ============================================
// Lifecycle Helper Functions
// ============================================

function getLifeStageDescription(stage: LifeStage): string {
  const descriptions: Record<LifeStage, string> = {
    infant: '幼年期：完全依赖父母，无行动能力',
    child: '少年期：开始学习基础技能，可以做简单帮工',
    youth: '青年期：快速成长，建立职业基础，可独立承担社会角色',
    adult: '壮年期：能力巅峰，承担主要社会职责',
    middle: '中年期：经验丰富，专注传承和教学',
    elder: '老年期：能力衰退，减少日常活动',
    terminal: '终末期：高死亡概率，临终传承',
  };
  return descriptions[stage];
}

function getRiskLevel(probability: number): 'low' | 'medium' | 'high' | 'critical' {
  if (probability < 0.05) return 'low';
  if (probability < 0.15) return 'medium';
  if (probability < 0.25) return 'high';
  return 'critical';
}

function estimateLifespan(age: number, health: number): number {
  const baseLifespan = 70;
  const healthBonus = (health - 50) / 100 * 15;
  return Math.max(age, Math.round(baseLifespan + healthBonus));
}

function getHeirPriorityList(faction: string): string[] {
  const rules = FactionInheritanceRules[faction];
  const priorities: string[] = ['指定继承人', '直系血亲', '师徒/门生', '副手/下属'];
  if (rules?.requiresElection) {
    priorities.push('选举竞争');
  }
  priorities.push('继承危机');
  return priorities;
}

// GET /v1/npcs - 获取NPC列表
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const faction = req.query['faction'] as string | undefined;
  const role = req.query['role'] as string | undefined;

  try {
    const whereClause: { faction?: string; role?: string } = {};
    if (faction) whereClause.faction = faction;
    if (role) whereClause.role = role;

    const npcs = await prisma.nPC.findMany({
      where: whereClause,
      orderBy: { role: 'desc' }, // key > important > common
    });

    const npcList = npcs.map(npc => {
      const attributes = safeJsonParse<Record<string, number>>(npc.attributes, {});
      const currentStatus = safeJsonParse<Record<string, unknown>>(npc.currentStatus, {});

      return {
        id: npc.id,
        name: npc.name,
        age: npc.age,
        gender: npc.gender,
        type: npc.type,
        role: npc.role,
        faction: npc.faction,
        factionPosition: npc.factionPosition,
        publicAttributes: {
          physique: attributes['physique'] ?? 40,
          agility: attributes['agility'] ?? 40,
          wisdom: attributes['wisdom'] ?? 40,
          charisma: attributes['charisma'] ?? 40,
          fame: attributes['fame'] ?? 0,
        },
        currentLocation: {
          region: (currentStatus['location'] as Record<string, unknown>)?.['region'] as string ?? 'borderlands',
          city: (currentStatus['location'] as Record<string, unknown>)?.['city'] as string ?? null,
        },
        isAlive: (currentStatus['isAlive'] as boolean) ?? true,
      };
    });

    res.json(createSuccessResponse({
      npcs: npcList,
      total: npcList.length,
    }, requestId));
  } catch (err) {
    console.error('[NPC List Error]', err);
    res.status(500).json(createErrorResponse(
      'INTERNAL_ERROR',
      '获取NPC列表失败',
      requestId,
      undefined,
      true
    ));
  }
});

// GET /v1/npcs/:npcId - 获取NPC信息
router.get('/:npcId', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const npcId = req.params['npcId']!;

  try {
    const npc = await prisma.nPC.findUnique({
      where: { id: npcId },
    });

    if (!npc) {
      res.status(404).json(createErrorResponse(
        'NOT_FOUND',
        'NPC不存在',
        requestId,
        { npcId }
      ));
      return;
    }

    const attributes = safeJsonParse<Record<string, number>>(npc.attributes, {});
    const currentStatus = safeJsonParse<Record<string, unknown>>(npc.currentStatus, {});
    const personality = safeJsonParse<Record<string, number>>(npc.personality, {});

    res.json(createSuccessResponse({
      npc: {
        id: npc.id,
        name: npc.name,
        age: npc.age,
        gender: npc.gender,
        type: npc.type,
        role: npc.role,
        faction: npc.faction,
        factionPosition: npc.factionPosition,
        publicAttributes: {
          physique: attributes['physique'] ?? 40,
          agility: attributes['agility'] ?? 40,
          wisdom: attributes['wisdom'] ?? 40,
          charisma: attributes['charisma'] ?? 40,
          fame: attributes['fame'] ?? 0,
          infamy: attributes['infamy'] ?? 0,
        },
        publicSkills: [],
        perceivedPersonality: {
          ambition: (personality['ambition'] as number) ?? 50,
          loyalty: (personality['loyalty'] as number) ?? 50,
          kindness: (personality['kindness'] as number) ?? 50,
          cunning: (personality['cunning'] as number) ?? 50,
          description: '性格温和',
        },
        currentStatus: {
          health: (currentStatus['health'] as number) ?? 100,
          location: {
            region: (currentStatus['location'] as Record<string, unknown>)?.['region'] as string ?? 'borderlands',
            city: (currentStatus['location'] as Record<string, unknown>)?.['city'] as string ?? null,
          },
          mood: (currentStatus['mood'] as string) ?? 'neutral',
          isAlive: (currentStatus['isAlive'] as boolean) ?? true,
        },
        relationshipWithPlayer: {
          value: getPlayerRelationshipValue(npc.relationships),
          level: getRelationshipLevel(getPlayerRelationshipValue(npc.relationships)),
          history: [],
          lastInteraction: new Date().toISOString(),
          interactionCount: 0,
        },
      },
    }, requestId));
  } catch (err) {
    console.error('[NPC Info Error]', err);
    res.status(500).json(createErrorResponse(
      'INTERNAL_ERROR',
      '获取NPC信息失败',
      requestId,
      undefined,
      true
    ));
  }
});

// GET /v1/npcs/:npcId/relationships - 获取NPC关系网络
router.get('/:npcId/relationships', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const npcId = req.params['npcId']!;

  try {
    const npc = await prisma.nPC.findUnique({
      where: { id: npcId },
    });

    if (!npc) {
      res.status(404).json(createErrorResponse(
        'NOT_FOUND',
        'NPC不存在',
        requestId,
        { npcId }
      ));
      return;
    }

    const relationships = safeJsonParse<Record<string, unknown>>(npc.relationships, {});
    const playerRelations = relationships['players'] as Record<string, number> | undefined;

    res.json(createSuccessResponse({
      npcId,
      withPlayer: {
        value: getPlayerRelationshipValue(npc.relationships),
        level: getRelationshipLevel(getPlayerRelationshipValue(npc.relationships)),
        history: [],
        lastInteraction: new Date().toISOString(),
        interactionCount: Object.keys(playerRelations ?? {}).length,
      },
      withNPCs: relationships['npcs'] ?? {},
      withFactions: {},
    }, requestId));
  } catch (err) {
    console.error('[NPC Relationships Error]', err);
    res.status(500).json(createErrorResponse(
      'INTERNAL_ERROR',
      '获取NPC关系失败',
      requestId,
      undefined,
      true
    ));
  }
});

// POST /v1/npcs/:npcId/interact - 与NPC对话（LLM驱动）
router.post('/:npcId/interact', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;
  const npcId = req.params['npcId']!;

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    res.status(400).json(createErrorResponse('INVALID_REQUEST', '缺少message参数', requestId));
    return;
  }

  try {
    const npc = await prisma.nPC.findUnique({ where: { id: npcId } });
    if (!npc) {
      res.status(404).json(createErrorResponse('NOT_FOUND', 'NPC不存在', requestId, { npcId }));
      return;
    }

    // Get dialog context
    const context = await getDialogContext(playerId, npcId);

    // Generate dialog response (LLM-driven)
    const dialogResponse = await generateDialogResponse(context, message);

    // Save interaction and update relationship
    await saveDialogInteraction(playerId, npcId, message, dialogResponse);

    // Store memory if important
    const importance = Math.abs(dialogResponse.relationshipDelta) > 3 ? 5 : 2;
    await storeNPCMemory(npcId, {
      event: `玩家: ${message.substring(0, 100)}...`,
      importance,
      sentiment: dialogResponse.relationshipDelta,
    });

    res.json(createSuccessResponse({
      success: true,
      npcResponse: {
        dialogue: dialogResponse.dialogue,
        tone: dialogResponse.tone,
        mood: dialogResponse.mood,
      },
      relationshipChange: {
        delta: dialogResponse.relationshipDelta,
        value: context.relationshipValue + dialogResponse.relationshipDelta,
        level: getRelationshipLevel(context.relationshipValue + dialogResponse.relationshipDelta),
      },
    }, requestId));
  } catch (err) {
    console.error('[NPC Interact Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'NPC互动失败', requestId, undefined, true));
  }
});

// GET /v1/npcs/:npcId/dialog-history - 获取对话历史
router.get('/:npcId/dialog-history', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;
  const npcId = req.params['npcId']!;

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  const limit = Math.min(parseInt(req.query['limit'] as string) || 20, 50);
  const offset = parseInt(req.query['offset'] as string) || 0;

  try {
    const { messages, total } = await getDialogHistory(playerId, npcId, limit, offset);
    res.json(createSuccessResponse({
      npcId,
      messages,
      total,
      pagination: { limit, offset, hasMore: offset + limit < total },
    }, requestId));
  } catch (err) {
    console.error('[NPC Dialog History Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取对话历史失败', requestId, undefined, true));
  }
});

// GET /v1/npcs/:npcId/memories - 获取NPC记忆
router.get('/:npcId/memories', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const npcId = req.params['npcId']!;

  const limit = Math.min(parseInt(req.query['limit'] as string) || 10, 20);

  try {
    const npc = await prisma.nPC.findUnique({ where: { id: npcId } });
    if (!npc) {
      res.status(404).json(createErrorResponse('NOT_FOUND', 'NPC不存在', requestId, { npcId }));
      return;
    }

    const memories = await getNPCMemories(npcId, limit);
    res.json(createSuccessResponse({ npcId, memories }, requestId));
  } catch (err) {
    console.error('[NPC Memories Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取NPC记忆失败', requestId, undefined, true));
  }
});

// GET /v1/npcs/:npcId/lifecycle - Get NPC lifecycle details
router.get('/:npcId/lifecycle', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const npcId = req.params['npcId']!;

  try {
    const npc = await prisma.nPC.findUnique({ where: { id: npcId } });
    if (!npc) {
      res.status(404).json(createErrorResponse('NOT_FOUND', 'NPC不存在', requestId, { npcId }));
      return;
    }

    const currentStatus = safeJsonParse<Record<string, unknown>>(npc.currentStatus, {});
    const health = (currentStatus['health'] as number) ?? 100;
    const isAlive = (currentStatus['isAlive'] as boolean) ?? true;
    const lifeStage = getLifeStageFromAge(npc.age);
    const agingEffects = calculateAgingEffects(npc.age);
    const deathProb = isAlive ? getNaturalDeathProbability(npc.age, health) : 0;

    res.json(createSuccessResponse({
      npc: {
        id: npc.id,
        name: npc.name,
        age: npc.age,
        gender: npc.gender,
        lifeStage: {
          stage: lifeStage,
          name: LifeStageNames[lifeStage],
          description: getLifeStageDescription(lifeStage),
        },
        health: {
          current: health,
          deathProbability: deathProb,
          conditions: (currentStatus['conditions'] as string[]) ?? [],
          riskLevel: getRiskLevel(deathProb),
        },
        agingEffects,
        estimatedLifespan: estimateLifespan(npc.age, health),
        isAlive,
        deathInfo: !isAlive ? {
          type: (currentStatus['deathType'] as DeathType) ?? 'natural',
          typeName: DeathTypeNames[(currentStatus['deathType'] as DeathType) ?? 'natural'],
          gameDay: (currentStatus['deathGameDay'] as number) ?? 0,
        } : null,
      },
      inheritance: {
        canInherit: npc.role === 'key' || npc.role === 'important',
        hasDesignatedHeir: (currentStatus['heir'] as string) != null,
        heirPriority: getHeirPriorityList(npc.faction ?? 'border'),
        factionRules: FactionInheritanceRules[npc.faction ?? 'border'],
      },
    }, requestId));
  } catch (err) {
    console.error('[NPC Lifecycle Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取NPC生命周期失败', requestId, undefined, true));
  }
});

// POST /v1/npcs/:npcId/kill - Kill an NPC
router.post('/:npcId/kill', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;
  const npcId = req.params['npcId']!;

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  const { deathType, reason } = req.body;

  try {
    const npc = await prisma.nPC.findUnique({ where: { id: npcId } });
    if (!npc) {
      res.status(404).json(createErrorResponse('NOT_FOUND', 'NPC不存在', requestId, { npcId }));
      return;
    }

    const currentStatus = safeJsonParse<Record<string, unknown>>(npc.currentStatus, {});
    const isAlive = (currentStatus['isAlive'] as boolean) ?? true;

    if (!isAlive) {
      res.status(400).json(createErrorResponse('INVALID_REQUEST', 'NPC已经死亡', requestId));
      return;
    }

    const worldState = await prisma.worldState.findFirst({ orderBy: { day: 'desc' } });
    const gameDay = worldState?.day ?? 1;
    const actualDeathType: DeathType = deathType ?? 'combat';

    const updatedStatus = {
      ...currentStatus,
      isAlive: false,
      deathType: actualDeathType,
      deathGameDay: gameDay,
      health: 0,
      deathReason: reason ?? '',
    };

    await prisma.nPC.update({
      where: { id: npc.id },
      data: {
        currentStatus: safeJsonStringify(updatedStatus),
      },
    });

    res.json(createSuccessResponse({
      success: true,
      npc: {
        id: npc.id,
        name: npc.name,
        age: npc.age,
        role: npc.role,
        faction: npc.faction,
      },
      death: {
        type: actualDeathType,
        typeName: DeathTypeNames[actualDeathType],
        gameDay,
        reason: reason ?? null,
      },
      narrativeFeedback: `${npc.name}(${npc.age}岁)${DeathTypeNames[actualDeathType]}。`,
    }, requestId));
  } catch (err) {
    console.error('[Kill NPC Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'NPC死亡处理失败', requestId, undefined, true));
  }
});

// POST /v1/npcs/:npcId/designate-heir - Designate heir for key NPC
router.post('/:npcId/designate-heir', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;
  const npcId = req.params['npcId']!;

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  const { heirId, heirType } = req.body;

  if (!heirId) {
    res.status(400).json(createErrorResponse('INVALID_REQUEST', '缺少继承人ID', requestId));
    return;
  }

  try {
    const npc = await prisma.nPC.findUnique({ where: { id: npcId } });
    if (!npc) {
      res.status(404).json(createErrorResponse('NOT_FOUND', 'NPC不存在', requestId, { npcId }));
      return;
    }

    if (npc.role !== 'key' && npc.role !== 'important') {
      res.status(400).json(createErrorResponse('INVALID_REQUEST', '只有关键或重要NPC可以指定继承人', requestId));
      return;
    }

    const heir = await prisma.nPC.findUnique({ where: { id: heirId } });
    if (!heir) {
      res.status(404).json(createErrorResponse('NOT_FOUND', '继承人不存在', requestId, { heirId }));
      return;
    }

    const heirStatus = safeJsonParse<Record<string, unknown>>(heir.currentStatus, {});
    const heirAlive = (heirStatus['isAlive'] as boolean) ?? true;
    if (!heirAlive) {
      res.status(400).json(createErrorResponse('INVALID_REQUEST', '继承人已死亡', requestId));
      return;
    }

    const currentStatus = safeJsonParse<Record<string, unknown>>(npc.currentStatus, {});
    const updatedStatus = {
      ...currentStatus,
      heir: heirId,
      heirType: heirType ?? 'child',
    };

    await prisma.nPC.update({
      where: { id: npc.id },
      data: {
        currentStatus: safeJsonStringify(updatedStatus),
      },
    });

    res.json(createSuccessResponse({
      success: true,
      npc: {
        id: npc.id,
        name: npc.name,
      },
      heir: {
        id: heir.id,
        name: heir.name,
        age: heir.age,
        type: heirType ?? 'child',
      },
      narrativeFeedback: `${npc.name}指定${heir.name}为继承人。`,
    }, requestId));
  } catch (err) {
    console.error('[Designate Heir Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '指定继承人失败', requestId, undefined, true));
  }
});

export default router;