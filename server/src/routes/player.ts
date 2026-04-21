// Player Routes - GET /v1/player/*

import { Router, type Request, type Response } from 'express';
import prisma from '../models/prisma.js';
import { createSuccessResponse, createErrorResponse, generateRequestId } from '../types/api.js';
import { getRelationshipLevel, clampAttribute, clampReputation, type FactionReputation } from '../types/game.js';
import { safeJsonParse, safeJsonStringify } from '../utils/index.js';
import type { EventConsequence } from '../types/eventTemplates.js';
import {
  gainSkillExp,
  getSkillExpHistory,
  checkSkillUnlock,
  getSkill,
  setSkill,
  getExpForNextLevel,
} from '../services/skillService.js';
import { snapshotBeforeDecision, recordDecisionImpact, getDecisionImpact, getPlayerImpactTimeline } from '../services/impactTracker.js';
import { createLegacyRecord, getUnclaimedLegacies, claimLegacy, calculateLegacyValue } from '../services/legacyService.js';
import { DEFAULT_SKILL_SET, type SkillSet, DEFAULT_PLAYER_ATTRIBUTES, type PlayerAttributes } from '../types/game.js';

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
  const limit = Math.min(parseInt(req.query['limit'] as string) || 10, 50);
  const offset = parseInt(req.query['offset'] as string) || 0;

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

    // Parse consequences from choice
    const consequences = (choice['consequences'] as EventConsequence[]) ?? [];

    // Calculate consequence results
    const attributeChanges: Record<string, number> = {};
    const resourceChanges: Record<string, number> = {};
    const reputationChanges: Partial<FactionReputation> = {};
    const tagsAdded: string[] = [];
    const skillExpGained: Record<string, number> = {};
    const narrativeParts: string[] = [];
    const triggeredEvents: string[] = [];

    // Get current player state
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) {
      res.status(404).json(createErrorResponse('NOT_FOUND', '玩家不存在', requestId));
      return;
    }

    // Capture state before decision
    const stateBefore = await snapshotBeforeDecision(playerId);

    const currentAttributes = safeJsonParse<Record<string, number>>(player.attributes, {});
    const currentResources = safeJsonParse<Record<string, number>>(player.resources, {});
    const currentReputation = safeJsonParse<Record<string, number>>(player.reputation, {});
    const currentTags = safeJsonParse<string[]>(player.tags, []);
    const currentSkills = safeJsonParse<Record<string, unknown>>(player.skills, {});

    // Apply each consequence
    for (const con of consequences) {
      narrativeParts.push(con.description);

      switch (con.type) {
        case 'resource': {
          if (con.target === 'player') {
            const current = currentResources['gold'] ?? 100;
            resourceChanges['gold'] = current + con.value;
          }
          break;
        }
        case 'reputation': {
          if (con.target && ['canglong', 'shuanglang', 'jinque', 'border'].includes(con.target)) {
            const current = currentReputation[con.target] ?? 0;
            reputationChanges[con.target as keyof FactionReputation] = clampReputation(current + con.value);
          }
          break;
        }
        case 'relationship': {
          // Relationships are tracked per-NPC; store in a separate structure
          // For now, record the NPC ID and change value for later use
          break;
        }
        case 'status': {
          // Status values map to player tags
          const statusTags: Record<number, string> = {
            1: '帝国见习军官',
            2: '联邦勇士',
            3: '商会代理人',
            4: '自由民',
            5: '仁慈',
            6: '冷血',
            7: '软弱',
            8: '通匪',
            9: '救命恩人',
          };
          if (statusTags[con.value]) {
            tagsAdded.push(statusTags[con.value]!);
          }
          break;
        }
        case 'skill': {
          // con.value = EXP amount, con.target = skill path (e.g. "survival", "combat.combatTechnique")
          const skillPath = con.target ?? 'survival';
          skillExpGained[skillPath] = (skillExpGained[skillPath] ?? 0) + con.value;
          break;
        }
        case 'event': {
          // Mark that a follow-up event should be triggered
          triggeredEvents.push(`event_chain_${eventId}_${choiceIndex}`);
          break;
        }
      }
    }

    // Merge new values into player state
    const newAttributes = { ...currentAttributes };
    for (const [key, val] of Object.entries(attributeChanges)) {
      newAttributes[key] = clampAttribute(key, val);
    }

    const newResources = { ...currentResources };
    for (const [key, val] of Object.entries(resourceChanges)) {
      newResources[key] = Math.max(0, val);
    }

    const newReputation = { ...currentReputation };
    for (const [key, val] of Object.entries(reputationChanges)) {
      newReputation[key] = val as number;
    }

    const newTags = [...new Set([...currentTags, ...tagsAdded])];

    // Apply skill EXP gains
    let newSkills = currentSkills;
    if (Object.keys(skillExpGained).length > 0) {
      const skillSet = safeJsonParse<SkillSet>(player.skills, DEFAULT_SKILL_SET);
      for (const [skillPath, exp] of Object.entries(skillExpGained)) {
        const current = getSkill(skillSet, skillPath);
        if (current) {
          let newExp = current.experience + exp;
          let newLevel = current.level;
          while (newLevel < 10) {
            const required = getExpForNextLevel(newLevel);
            if (newExp >= required) {
              newExp -= required;
              newLevel++;
            } else {
              break;
            }
          }
          if (newLevel >= 10) newExp = 0;
          setSkill(skillSet, skillPath, { ...current, level: newLevel, experience: newExp });
        }
      }
      newSkills = safeJsonParse<Record<string, unknown>>(safeJsonStringify(skillSet), {});
    }

    // Update player record
    await prisma.player.update({
      where: { id: playerId },
      data: {
        attributes: safeJsonStringify(newAttributes),
        resources: safeJsonStringify(newResources),
        reputation: safeJsonStringify(newReputation),
        tags: safeJsonStringify(newTags),
        skills: safeJsonStringify(newSkills),
      },
    });

    // Create decision record with full consequences
    const decision = await prisma.decision.create({
      data: {
        playerId,
        eventId,
        choiceIndex,
        choiceLabel: choice['label'] as string,
        consequences: safeJsonStringify(consequences),
        context: safeJsonStringify({
          playerLevel: player.level,
          snapshotBefore: stateBefore,
          attributeChanges,
          resourceChanges,
          reputationChanges,
          tagsAdded,
          skillExpGained,
        }),
        gameDay: 1,
      },
    });

    await prisma.event.update({ where: { id: eventId }, data: { status: 'completed' } });

    // Record decision impact (state before/after)
    await recordDecisionImpact(playerId, decision.id, eventId, stateBefore);

    const narrativeFeedback = (choice['narrativeOutcome'] as string) ?? narrativeParts.join(' ') ?? '决策已执行';

    res.json(createSuccessResponse({
      success: true,
      decision: { id: decision.id.toString(), eventId, choiceIndex, madeAt: decision.madeAt.toISOString() },
      immediateConsequences: {
        changes: {
          attributes: attributeChanges,
          resources: resourceChanges,
          reputation: reputationChanges,
          tags: tagsAdded,
        },
        acquired: { skillExp: skillExpGained },
        unlocked: {},
      },
      narrativeFeedback,
      triggeredEvents,
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

  const limit = Math.min(parseInt(req.query['limit'] as string) || 20, 100);
  const offset = parseInt(req.query['offset'] as string) || 0;

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

// GET /v1/player/skills/unlock-status - 获取技能解锁状态
router.get('/skills/unlock-status', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  try {
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) {
      res.status(404).json(createErrorResponse('NOT_FOUND', '玩家不存在', requestId));
      return;
    }

    const skillSet = safeJsonParse<SkillSet>(player.skills, DEFAULT_SKILL_SET);
    const unlockStatus: Record<string, { unlocked: boolean; canUnlock: boolean; reason?: string }> = {};

    // Check all skills
    const skillPaths = [
      'survival',
      'strategy.intelligenceAnalysis',
      'strategy.politicalManipulation',
      'combat.combatTechnique',
      'combat.militaryCommand',
      'commerce.trade',
      'commerce.industryManagement',
    ];

    for (const path of skillPaths) {
      const check = checkSkillUnlock(skillSet, path);
      const skill = getSkill(skillSet, path);
      unlockStatus[path] = {
        unlocked: skill?.unlocked ?? false,
        canUnlock: check.unlocked && !(skill?.unlocked ?? false),
        reason: check.reason,
      };
    }

    res.json(createSuccessResponse({ skills: unlockStatus }, requestId));
  } catch (err) {
    console.error('[Skill Unlock Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取技能解锁状态失败', requestId, undefined, true));
  }
});

// POST /v1/player/skills/:skillId/gain-exp - 技能获得EXP
router.post('/skills/:skillId/gain-exp', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;
  const skillId = req.params['skillId'];

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  if (!skillId) {
    res.status(400).json(createErrorResponse('INVALID_REQUEST', '缺少技能ID', requestId));
    return;
  }

  const { exp, source } = req.body;
  if (typeof exp !== 'number' || exp <= 0) {
    res.status(400).json(createErrorResponse('INVALID_REQUEST', 'exp必须为正数', requestId));
    return;
  }

  try {
    const result = await gainSkillExp(playerId, skillId, exp, source ?? 'player_action');
    res.json(createSuccessResponse(result, requestId));
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    res.status(400).json(createErrorResponse('INVALID_REQUEST', message, requestId, { skillId }));
  }
});

// GET /v1/player/skills/history - 获取技能EXP历史
router.get('/skills/history', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  const limit = Math.min(parseInt(req.query['limit'] as string) || 50, 100);
  const offset = parseInt(req.query['offset'] as string) || 0;

  try {
    const history = await getSkillExpHistory(playerId, limit, offset);
    res.json(createSuccessResponse({ history, pagination: { limit, offset } }, requestId));
  } catch (err) {
    console.error('[Skill History Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取技能历史失败', requestId, undefined, true));
  }
});

export default router;

// ============================================
// Impact Tracking Endpoints
// ============================================

// GET /v1/player/decisions/:id/impact - 查询单个决策的后续影响
router.get('/decisions/:id/impact', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;
  const decisionId = parseInt(req.params['id'] ?? '');

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  if (isNaN(decisionId)) {
    res.status(400).json(createErrorResponse('INVALID_REQUEST', '无效的决策ID', requestId));
    return;
  }

  try {
    const impact = await getDecisionImpact(playerId, decisionId);
    if (!impact) {
      res.status(404).json(createErrorResponse('NOT_FOUND', '决策不存在', requestId));
      return;
    }
    res.json(createSuccessResponse({ impact }, requestId));
  } catch (err) {
    console.error('[Decision Impact Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取决策影响失败', requestId, undefined, true));
  }
});

// GET /v1/player/impact-timeline - 获取玩家影响时间线
router.get('/impact-timeline', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  const limit = Math.min(parseInt(req.query['limit'] as string) || 50, 100);
  const offset = parseInt(req.query['offset'] as string) || 0;

  try {
    const { timeline, total } = await getPlayerImpactTimeline(playerId, limit, offset);
    res.json(createSuccessResponse({ timeline, total, pagination: { limit, offset, hasMore: offset + limit < total } }, requestId));
  } catch (err) {
    console.error('[Impact Timeline Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取影响时间线失败', requestId, undefined, true));
  }
});

// ============================================
// Legacy / Inheritance Endpoints
// ============================================

// GET /v1/player/legacy/unclaimed - 获取未领取的遗产
router.get('/legacy/unclaimed', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  try {
    const legacies = await getUnclaimedLegacies(playerId);
    res.json(createSuccessResponse({ legacies }, requestId));
  } catch (err) {
    console.error('[Unclaimed Legacy Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取未领取遗产失败', requestId, undefined, true));
  }
});

// POST /v1/player/legacy/:id/claim - 领取遗产
router.post('/legacy/:id/claim', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;
  const legacyId = req.params['id'] ?? '';

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  try {
    const result = await claimLegacy(legacyId, playerId);
    if (!result.success) {
      res.status(400).json(createErrorResponse('INVALID_REQUEST', result.message, requestId));
      return;
    }
    res.json(createSuccessResponse(result, requestId));
  } catch (err) {
    console.error('[Claim Legacy Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '领取遗产失败', requestId, undefined, true));
  }
});

// POST /v1/player/legacy/create - 创建遗产记录 (玩家死亡时调用)
router.post('/legacy/create', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  const { name, level, inheritanceType } = req.body;

  try {
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) {
      res.status(404).json(createErrorResponse('NOT_FOUND', '玩家不存在', requestId));
      return;
    }

    const resources = safeJsonParse<Record<string, number>>(player.resources, {});
    const skills = safeJsonParse<SkillSet>(player.skills, DEFAULT_SKILL_SET);
    const relationships = safeJsonParse<Record<string, number>>(player.relationships, {});
    const tags = safeJsonParse<string[]>(player.tags, []);
    const attributes = safeJsonParse<PlayerAttributes>(player.attributes, DEFAULT_PLAYER_ATTRIBUTES);

    const legacy = await createLegacyRecord(
      playerId,
      name ?? player.name,
      level ?? player.level,
      resources,
      skills,
      relationships,
      tags,
      attributes,
      inheritanceType ?? 'blood'
    );

    const totalValue = calculateLegacyValue(legacy.legacyPackage);
    res.json(createSuccessResponse({ legacy, totalValue }, requestId));
  } catch (err) {
    console.error('[Create Legacy Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '创建遗产记录失败', requestId, undefined, true));
  }
});