// NPC Routes - GET /v1/npcs/*

import { Router, type Request, type Response } from 'express';
import prisma from '../models/prisma.js';
import { createSuccessResponse, createErrorResponse, generateRequestId } from '../types/api.js';
import { getRelationshipLevel } from '../types/game.js';
import { safeJsonParse } from '../utils/index.js';

const router = Router();

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
  const npcId = req.params['npcId'];

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
          value: 0,
          level: getRelationshipLevel(0),
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
  const npcId = req.params['npcId'];

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

    // MVP阶段：返回基础关系信息
    res.json(createSuccessResponse({
      npcId,
      withPlayer: {
        value: 0,
        level: getRelationshipLevel(0),
        history: [],
        lastInteraction: new Date().toISOString(),
        interactionCount: 0,
      },
      withNPCs: {},
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

// POST /v1/npcs/:npcId/interact - 与NPC对话
router.post('/:npcId/interact', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;
  const npcId = req.params['npcId'];

  if (!playerId) {
    res.status(401).json(createErrorResponse(
      'UNAUTHORIZED',
      '未授权访问',
      requestId
    ));
    return;
  }

  const { type, message } = req.body;

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

    // MVP阶段：简化NPC响应
    const npcDialogue = type === 'talk' && message
      ? `${npc.name}看着你，说道："你说得很有道理。"`
      : `${npc.name}点了点头。`;

    res.json(createSuccessResponse({
      success: true,
      interaction: {
        type,
        npcId,
        timestamp: new Date().toISOString(),
      },
      npcResponse: {
        dialogue: npcDialogue,
        tone: 'neutral',
      },
      relationshipChange: {
        before: 0,
        after: 0,
        change: 0,
        reason: '互动',
      },
    }, requestId));
  } catch (err) {
    console.error('[NPC Interact Error]', err);
    res.status(500).json(createErrorResponse(
      'INTERNAL_ERROR',
      'NPC互动失败',
      requestId,
      undefined,
      true
    ));
  }
});

export default router;