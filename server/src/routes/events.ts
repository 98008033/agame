// Event Routes - Event generation, listing, and decision handling
// POST /v1/events/*

import { Router, type Request, type Response } from 'express';
import prisma from '../models/prisma.js';
import { createSuccessResponse, createErrorResponse, generateRequestId } from '../types/api.js';
import {
  EVENT_TEMPLATES,
  getEventTemplate,
  checkTriggerConditions,
  type EventTemplate,
  type EventChoice,
  type EventConsequence,
} from '../types/eventTemplates.js';
import { safeJsonParse, safeJsonStringify } from '../utils/index.js';
import { clampReputation } from '../types/game.js';

const router = Router();

// ============================================
// Event Generation Helper
// ============================================

async function generateEventForPlayer(
  playerId: string,
  template: EventTemplate,
  _gameDay: number
): Promise<{ id: string; title: string }> {
  const eventId = `event_${playerId}_${template.id}_${Date.now()}`;

  // Calculate expiration date based on expiresIn days
  const expiresAt = template.expiresIn
    ? new Date(Date.now() + template.expiresIn * 24 * 60 * 60 * 1000)
    : null;

  const event = await prisma.event.create({
    data: {
      id: eventId,
      playerId,
      type: template.type,
      category: template.category,
      title: template.title,
      description: template.description,
      narrativeText: template.narrativeText,
      choices: safeJsonStringify(template.choices.map(c => ({
        index: c.index,
        label: c.label,
        description: c.description,
        consequences: c.consequences,
        skillRequirement: c.skillRequirement,
        narrativeOutcome: c.narrativeOutcome,
        triggeredEvent: c.triggeredEvent,
      }))),
      triggerConditions: safeJsonStringify(template.triggerConditions),
      affectedEntities: safeJsonStringify([]),
      scope: template.scope,
      status: 'pending',
      expiresAt,
    },
  });

  return { id: event.id, title: event.title };
}

// Apply consequences from an event choice
async function applyConsequences(
  playerId: string,
  consequences: EventConsequence[]
): Promise<{ changes: Record<string, unknown>; narrative: string }> {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) {
    throw new Error('Player not found');
  }

  const changes: Record<string, unknown> = {};
  const narratives: string[] = [];

  const resources = safeJsonParse<Record<string, number>>(player.resources, {});
  const reputation = safeJsonParse<Record<string, number>>(player.reputation, {});
  const relationships = safeJsonParse<Record<string, number>>(player.relationships, {});
  const tags = safeJsonParse<string[]>(player.tags, []);

  for (const consequence of consequences) {
    switch (consequence.type) {
      case 'resource':
        if (consequence.target === 'player' || !consequence.target) {
          const oldValue = resources['gold'] ?? 0;
          const newValue = oldValue + consequence.value;
          resources['gold'] = Math.max(0, newValue);
          changes['gold'] = { old: oldValue, new: resources['gold'] };
          narratives.push(consequence.description);
        }
        break;

      case 'reputation':
        const factionKey = consequence.target as string;
        if (factionKey && ['canglong', 'shuanglang', 'jinque', 'border'].includes(factionKey)) {
          const oldValue = reputation[factionKey] ?? 0;
          reputation[factionKey] = clampReputation(oldValue + consequence.value);
          changes[`reputation_${factionKey}`] = { old: oldValue, new: reputation[factionKey] };
          narratives.push(consequence.description);
        }
        break;

      case 'relationship':
        const npcId = consequence.target as string;
        if (npcId) {
          const oldValue = relationships[npcId] ?? 0;
          relationships[npcId] = oldValue + consequence.value;
          changes[`relationship_${npcId}`] = { old: oldValue, new: relationships[npcId] };
          narratives.push(consequence.description);
        }
        break;

      case 'status':
        // Status changes add tags to player
        const statusValue = consequence.value;
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
        const statusName = statusTags[statusValue] ?? `status_${statusValue}`;
        if (!tags.includes(statusName)) {
          tags.push(statusName);
          changes['new_tag'] = statusName;
        }
        narratives.push(consequence.description);
        break;

      case 'skill':
        // Skill experience gain (simplified for MVP)
        changes['skill_exp'] = consequence.value;
        narratives.push(consequence.description);
        break;

      case 'event':
        // Chain event trigger (placeholder)
        changes['triggered_event_type'] = consequence.value;
        narratives.push(consequence.description);
        break;
    }
  }

  // Update player state
  await prisma.player.update({
    where: { id: playerId },
    data: {
      resources: safeJsonStringify(resources),
      reputation: safeJsonStringify(reputation),
      relationships: safeJsonStringify(relationships),
      tags: safeJsonStringify(tags),
    },
  });

  return { changes, narrative: narratives.join('\n') };
}

// ============================================
// POST /v1/events/generate - Generate event from template
// ============================================

router.post('/generate', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  const { templateId, category } = req.body;

  try {
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) {
      res.status(404).json(createErrorResponse('NOT_FOUND', '玩家不存在', requestId));
      return;
    }

    // Get world state for game day
    const worldState = await prisma.worldState.findFirst({ orderBy: { day: 'desc' } });
    const gameDay = worldState?.day ?? 1;

    // Select template
    let template: EventTemplate | undefined;
    if (templateId) {
      template = getEventTemplate(templateId);
    } else if (category) {
      const templates = EVENT_TEMPLATES.filter(t => t.category === category);
      template = templates[Math.floor(Math.random() * templates.length)];
    } else {
      // Random template
      template = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
    }

    if (!template) {
      res.status(400).json(createErrorResponse('INVALID_REQUEST', '找不到事件模板', requestId));
      return;
    }

    // Check trigger conditions
    const resources = safeJsonParse<Record<string, number>>(player.resources, {});
    const relationships = safeJsonParse<Record<string, number>>(player.relationships, {});
    const skills = safeJsonParse<Record<string, { level: number }>>(player.skills, {});
    const location = safeJsonParse<Record<string, unknown>>(player.location, {});

    const playerState = {
      level: player.level,
      gold: resources['gold'] ?? 0,
      faction: player.faction,
      relationships,
      skills,
      location: (location['region'] as string) ?? 'borderlands',
    };

    // Check cooldown (if this event was triggered recently)
    if (template.cooldownDays) {
      const recentEvent = await prisma.event.findFirst({
        where: {
          playerId,
          type: template.type,
          createdAt: {
            gte: new Date(Date.now() - template.cooldownDays * 24 * 60 * 60 * 1000),
          },
        },
      });
      if (recentEvent) {
        res.status(400).json(createErrorResponse(
          'INVALID_REQUEST',
          '该事件类型在冷却期内',
          requestId,
          { cooldownRemaining: template.cooldownDays }
        ));
        return;
      }
    }

    // Check trigger conditions
    if (!checkTriggerConditions(template.triggerConditions, playerState)) {
      res.status(400).json(createErrorResponse(
        'INVALID_REQUEST',
        '玩家状态不满足事件触发条件',
        requestId,
        { requiredConditions: template.triggerConditions }
      ));
      return;
    }

    // Generate event
    const result = await generateEventForPlayer(playerId, template, gameDay);

    res.json(createSuccessResponse({
      success: true,
      event: result,
      templateUsed: template.id,
      gameDay,
      expiresIn: template.expiresIn,
    }, requestId));
  } catch (err) {
    console.error('[Event Generate Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '生成事件失败', requestId, undefined, true));
  }
});

// ============================================
// POST /v1/events/decide - Make a decision on an event
// ============================================

router.post('/decide', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  const { eventId, choiceIndex } = req.body;

  if (!eventId || typeof choiceIndex !== 'number') {
    res.status(400).json(createErrorResponse('INVALID_REQUEST', '缺少必要参数', requestId));
    return;
  }

  try {
    const event = await prisma.event.findFirst({
      where: { id: eventId, playerId, status: 'pending' },
    });

    if (!event) {
      res.status(404).json(createErrorResponse('NOT_FOUND', '事件不存在或已处理', requestId));
      return;
    }

    // Check expiration
    if (event.expiresAt && event.expiresAt < new Date()) {
      await prisma.event.update({
        where: { id: eventId },
        data: { status: 'expired' },
      });
      res.status(410).json(createErrorResponse('EVENT_EXPIRED', '事件已过期', requestId));
      return;
    }

    // Get choice
    const choices = safeJsonParse<EventChoice[]>(event.choices, []);
    const choice = choices[choiceIndex];

    if (!choice) {
      res.status(400).json(createErrorResponse('INVALID_REQUEST', '无效的选项', requestId));
      return;
    }

    // Get world state for game day
    const worldState = await prisma.worldState.findFirst({ orderBy: { day: 'desc' } });
    const gameDay = worldState?.day ?? 1;

    // Apply consequences
    const result = await applyConsequences(playerId, choice.consequences);

    // Create decision record
    const decision = await prisma.decision.create({
      data: {
        playerId,
        eventId,
        choiceIndex,
        choiceLabel: choice.label,
        consequences: safeJsonStringify(result.changes),
        context: safeJsonStringify({ eventCategory: event.category, gameDay }),
        gameDay,
      },
    });

    // Update event status
    await prisma.event.update({
      where: { id: eventId },
      data: { status: 'completed' },
    });

    // Check for triggered event chain
    let triggeredEvent: { id: string; title: string } | null = null;
    if (choice.triggeredEvent) {
      const chainTemplate = getEventTemplate(choice.triggeredEvent);
      if (chainTemplate) {
        triggeredEvent = await generateEventForPlayer(playerId, chainTemplate, gameDay);
      }
    }

    res.json(createSuccessResponse({
      success: true,
      decision: {
        id: decision.id.toString(),
        eventId,
        choiceIndex,
        choiceLabel: choice.label,
        madeAt: decision.madeAt.toISOString(),
      },
      consequences: result.changes,
      narrativeFeedback: choice.narrativeOutcome,
      narrativeChanges: result.narrative,
      triggeredEvent,
      irreversible: false,
    }, requestId));
  } catch (err) {
    console.error('[Event Decide Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '处理决策失败', requestId, undefined, true));
  }
});

// ============================================
// POST /v1/events/check-triggers - Check for events that should trigger
// ============================================

router.post('/check-triggers', async (req: Request, res: Response): Promise<void> => {
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

    const worldState = await prisma.worldState.findFirst({ orderBy: { day: 'desc' } });
    const gameDay = worldState?.day ?? 1;

    const resources = safeJsonParse<Record<string, number>>(player.resources, {});
    const relationships = safeJsonParse<Record<string, number>>(player.relationships, {});
    const skills = safeJsonParse<Record<string, { level: number }>>(player.skills, {});
    const location = safeJsonParse<Record<string, unknown>>(player.location, {});

    const playerState = {
      level: player.level,
      gold: resources['gold'] ?? 0,
      faction: player.faction,
      relationships,
      skills,
      location: (location['region'] as string) ?? 'borderlands',
    };

    // Find templates that match current player state
    const matchingTemplates: EventTemplate[] = [];
    const alreadyTriggered: string[] = [];

    for (const template of EVENT_TEMPLATES) {
      // Skip if cooldown not met
      if (template.cooldownDays) {
        const recent = await prisma.event.findFirst({
          where: {
            playerId,
            type: template.type,
            createdAt: {
              gte: new Date(Date.now() - template.cooldownDays * 24 * 60 * 60 * 1000),
            },
          },
        });
        if (recent) {
          alreadyTriggered.push(template.id);
          continue;
        }
      }

      // Check trigger conditions
      if (checkTriggerConditions(template.triggerConditions, playerState)) {
        matchingTemplates.push(template);
      }
    }

    res.json(createSuccessResponse({
      matchingTemplates: matchingTemplates.map(t => ({
        id: t.id,
        title: t.title,
        category: t.category,
        importance: t.importance,
        expiresIn: t.expiresIn,
      })),
      alreadyTriggered,
      playerState: {
        level: playerState.level,
        gold: playerState.gold,
        faction: playerState.faction,
        location: playerState.location,
      },
      gameDay,
    }, requestId));
  } catch (err) {
    console.error('[Check Triggers Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '检查触发条件失败', requestId, undefined, true));
  }
});

// ============================================
// GET /v1/events/templates - Get all event templates
// ============================================

router.get('/templates', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();

  const category = req.query['category'] as string | undefined;

  try {
    const templates = category
      ? EVENT_TEMPLATES.filter(t => t.category === category)
      : EVENT_TEMPLATES;

    res.json(createSuccessResponse({
      templates: templates.map(t => ({
        id: t.id,
        type: t.type,
        category: t.category,
        title: t.title,
        description: t.description,
        triggerConditions: t.triggerConditions,
        importance: t.importance,
        scope: t.scope,
        expiresIn: t.expiresIn,
        cooldownDays: t.cooldownDays,
        choiceCount: t.choices.length,
      })),
      total: templates.length,
    }, requestId));
  } catch (err) {
    console.error('[Templates Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取模板列表失败', requestId, undefined, true));
  }
});

export default router;