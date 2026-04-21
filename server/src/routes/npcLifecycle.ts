// NPC Lifecycle Routes - Aging, Death, Inheritance
// Based on PLAN/13-npc-lifecycle.md and PLAN/35-npc-life-cycle.md

import { Router, type Request, type Response } from 'express';
import prisma from '../models/prisma.js';
import { createSuccessResponse, createErrorResponse, generateRequestId } from '../types/api.js';
import {
  getLifeStageFromAge,
  getNaturalDeathProbability,
  calculateAgingEffects,
  type LifeStage,
  type DeathType,
  NationInheritanceRules,
  LifeStageNames,
  DeathTypeNames,
} from '../types/npcLifecycle.js';
import { safeJsonParse, safeJsonStringify } from '../utils/index.js';

const router = Router();

// ============================================
// Helper Functions
// ============================================

async function getGameDay(): Promise<number> {
  const worldState = await prisma.worldState.findFirst({ orderBy: { day: 'desc' } });
  return worldState?.day ?? 1;
}

function applyAgingToAttributes(
  currentAttributes: Record<string, number>,
  age: number
): Record<string, number> {
  const effects = calculateAgingEffects(age);
  const newAttributes = { ...currentAttributes };

  // Apply aging effects
  if (effects.physiqueModifier !== 0) {
    const current = newAttributes['physique'] ?? 40;
    newAttributes['physique'] = Math.max(10, current + effects.physiqueModifier);
  }
  if (effects.agilityModifier !== 0) {
    const current = newAttributes['agility'] ?? 40;
    newAttributes['agility'] = Math.max(10, current + effects.agilityModifier);
  }
  if (effects.wisdomModifier !== 0) {
    const current = newAttributes['wisdom'] ?? 40;
    newAttributes['wisdom'] = Math.min(100, current + effects.wisdomModifier);
  }
  if (effects.willpowerModifier !== 0) {
    const current = newAttributes['willpower'] ?? 40;
    newAttributes['willpower'] = Math.min(100, current + effects.willpowerModifier);
  }

  return newAttributes;
}

// ============================================
// GET /v1/npcs/lifecycle/status - Get lifecycle system status
// ============================================

router.get('/status', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();

  try {
    const gameDay = await getGameDay();
    const allNPCs = await prisma.nPC.findMany();

    const stats = {
      total: allNPCs.length,
      alive: 0,
      dead: 0,
      byLifeStage: {} as Record<LifeStage, number>,
      byAgeRange: {
        '0-18': 0,
        '18-30': 0,
        '30-50': 0,
        '50-65': 0,
        '65-80': 0,
        '80+': 0,
      },
    };

    for (const npc of allNPCs) {
      const status = safeJsonParse<Record<string, unknown>>(npc.currentStatus, {});
      const isAlive = (status['isAlive'] as boolean) ?? true;

      if (isAlive) {
        stats.alive++;
        const stage = getLifeStageFromAge(npc.age);
        stats.byLifeStage[stage] = (stats.byLifeStage[stage] ?? 0) + 1;

        // Age range
        if (npc.age < 18) stats.byAgeRange['0-18']++;
        else if (npc.age < 30) stats.byAgeRange['18-30']++;
        else if (npc.age < 50) stats.byAgeRange['30-50']++;
        else if (npc.age < 65) stats.byAgeRange['50-65']++;
        else if (npc.age < 80) stats.byAgeRange['65-80']++;
        else stats.byAgeRange['80+']++;
      } else {
        stats.dead++;
      }
    }

    res.json(createSuccessResponse({
      gameDay,
      statistics: stats,
      agingEnabled: true,
      deathSystemEnabled: true,
      inheritanceSystemEnabled: true,
    }, requestId));
  } catch (err) {
    console.error('[Lifecycle Status Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取生命周期状态失败', requestId, undefined, true));
  }
});

// ============================================
// GET /v1/npcs/:npcId/lifecycle - Get NPC lifecycle details
// ============================================

router.get('/:npcId/lifecycle', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const npcId = req.params['npcId'];

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
        factionRules: NationInheritanceRules[npc.faction ?? 'border'],
      },
    }, requestId));
  } catch (err) {
    console.error('[NPC Lifecycle Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取NPC生命周期失败', requestId, undefined, true));
  }
});

// ============================================
// POST /v1/npcs/lifecycle/age-all - Age all NPCs by one game year
// ============================================

router.post('/age-all', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  try {
    const allNPCs = await prisma.nPC.findMany();
    const gameDay = await getGameDay();

    const results = {
      aged: 0,
      died: 0,
      stageChanges: 0,
      deaths: [] as Array<{ npcId: string; name: string; age: number; type: DeathType }>,
    };

    for (const npc of allNPCs) {
      const currentStatus = safeJsonParse<Record<string, unknown>>(npc.currentStatus, {});
      const isAlive = (currentStatus['isAlive'] as boolean) ?? true;

      if (!isAlive) continue;

      // Age by 1 year
      const newAge = npc.age + 1;
      const newStage = getLifeStageFromAge(newAge);
      const oldStage = getLifeStageFromAge(npc.age);
      const stageChanged = newStage !== oldStage;

      // Apply aging to attributes
      const oldAttributes = safeJsonParse<Record<string, number>>(npc.attributes, {});
      const newAttributes = applyAgingToAttributes(oldAttributes, newAge);

      // Check for death
      const health = (currentStatus['health'] as number) ?? 100;
      const deathProb = getNaturalDeathProbability(newAge, health);
      const dies = Math.random() < deathProb;

      if (stageChanged) results.stageChanges++;
      results.aged++;

      if (dies) {
        // NPC dies
        results.died++;
        results.deaths.push({
          npcId: npc.id,
          name: npc.name,
          age: newAge,
          type: 'natural',
        });

        // Update NPC to dead
        const updatedStatus = {
          ...currentStatus,
          isAlive: false,
          deathType: 'natural',
          deathGameDay: gameDay,
          health: 0,
        };

        await prisma.nPC.update({
          where: { id: npc.id },
          data: {
            age: newAge,
            attributes: safeJsonStringify(newAttributes),
            currentStatus: safeJsonStringify(updatedStatus),
          },
        });

        // Trigger inheritance if key/important NPC
        if (npc.role === 'key' || npc.role === 'important') {
          await triggerInheritanceEvent(npc.id, npc.name, gameDay);
        }
      } else {
        // Update age and attributes
        await prisma.nPC.update({
          where: { id: npc.id },
          data: {
            age: newAge,
            attributes: safeJsonStringify(newAttributes),
          },
        });
      }
    }

    res.json(createSuccessResponse({
      success: true,
      gameDay,
      yearPassed: 1,
      results,
      narrativeSummary: generateAgingNarrative(results),
    }, requestId));
  } catch (err) {
    console.error('[Age All Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'NPC老化处理失败', requestId, undefined, true));
  }
});

// ============================================
// POST /v1/npcs/:npcId/kill - Kill an NPC (for combat, assassination, etc.)
// ============================================

router.post('/:npcId/kill', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;
  const npcId = req.params['npcId'];

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  const { deathType, reason } = req.body;

  try {
    const npc = await prisma.nPC.findUnique({ where: { id: npcId } });
    if (!npc) {
      res.status(4040).json(createErrorResponse('NOT_FOUND', 'NPC不存在', requestId, { npcId }));
      return;
    }

    const currentStatus = safeJsonParse<Record<string, unknown>>(npc.currentStatus, {});
    const isAlive = (currentStatus['isAlive'] as boolean) ?? true;

    if (!isAlive) {
      res.status(400).json(createErrorResponse('INVALID_REQUEST', 'NPC已经死亡', requestId));
      return;
    }

    const gameDay = await getGameDay();
    const actualDeathType: DeathType = deathType ?? 'combat';

    // Update NPC to dead
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

    // Trigger inheritance if key/important NPC
    let inheritanceTriggered = false;
    if (npc.role === 'key' || npc.role === 'important') {
      inheritanceTriggered = await triggerInheritanceEvent(npc.id, npc.name, gameDay);
    }

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
      inheritanceTriggered,
      narrativeFeedback: `${npc.name}(${npc.age}岁)${DeathTypeNames[actualDeathType]}。`,
    }, requestId));
  } catch (err) {
    console.error('[Kill NPC Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'NPC死亡处理失败', requestId, undefined, true));
  }
});

// ============================================
// POST /v1/npcs/:npcId/designate-heir - Designate an heir for a key NPC
// ============================================

router.post('/:npcId/designate-heir', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;
  const npcId = req.params['npcId'];

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

    // Verify heir is alive
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

// ============================================
// GET /v1/npcs/:npcId/heirs - Get potential heirs for an NPC
// ============================================

router.get('/:npcId/heirs', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const npcId = req.params['npcId'];

  try {
    const npc = await prisma.nPC.findUnique({ where: { id: npcId } });
    if (!npc) {
      res.status(404).json(createErrorResponse('NOT_FOUND', 'NPC不存在', requestId, { npcId }));
      return;
    }

    // Get current heir if designated
    const currentStatus = safeJsonParse<Record<string, unknown>>(npc.currentStatus, {});
    const designatedHeirId = currentStatus['heir'] as string | null;

    // Find potential heirs by type
    const faction = npc.faction ?? 'border';
    const rules = NationInheritanceRules[faction] ?? NationInheritanceRules['border'];

    // MVP: Simplified heir finding - just return a structure
    const heirs = {
      designated: null as { id: string; name: string; age: number } | null,
      blood: [],      // Children
      apprentice: [], // Would need apprentices relationship
      subordinate: [], // Would need position hierarchy
      external: [],   // Would need faction-wide search
    };

    // Get designated heir details
    if (designatedHeirId) {
      const heirNpc = await prisma.nPC.findUnique({ where: { id: designatedHeirId } });
      if (heirNpc) {
        heirs.designated = {
          id: heirNpc.id,
          name: heirNpc.name,
          age: heirNpc.age,
        };
      }
    }

    // MVP placeholder: Return structure without full implementation
    res.json(createSuccessResponse({
      npcId,
      npcName: npc.name,
      faction: npc.faction,
      inheritanceRules: rules,
      heirs,
      heirPriority: getHeirPriorityList(faction),
      note: 'MVP版本：继承人搜索功能待完善',
    }, requestId));
  } catch (err) {
    console.error('[Get Heirs Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取继承人列表失败', requestId, undefined, true));
  }
});

// ============================================
// Helper Functions
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
  // Rough estimate based on current age and health
  const baseLifespan = 70;
  const healthBonus = (health - 50) / 100 * 15; // Health affects lifespan
  const estimated = Math.max(age, Math.round(baseLifespan + healthBonus));
  return estimated;
}

function getHeirPriorityList(faction: string): string[] {
  const rules = NationInheritanceRules[faction];
  const priorities: string[] = ['指定继承人', '直系血亲', '师徒/门生', '副手/下属'];
  if (rules?.requiresElection) {
    priorities.push('选举竞争');
  }
  priorities.push('继承危机');
  return priorities;
}

async function triggerInheritanceEvent(
  npcId: string,
  npcName: string,
  gameDay: number
): Promise<boolean> {
  try {
    // Get the dead NPC's details
    const npc = await prisma.nPC.findUnique({ where: { id: npcId } });
    if (!npc) return false;

    const currentStatus = safeJsonParse<Record<string, unknown>>(npc.currentStatus, {});
    const designatedHeirId = currentStatus['heir'] as string | null;

    // Find potential heirs
    let heirName = '未知继承人';

    if (designatedHeirId) {
      const heir = await prisma.nPC.findUnique({ where: { id: designatedHeirId } });
      if (heir) {
        heirName = heir.name;
      }
    } else {
      // Find NPCs of the same faction as fallback
      const factionNpcs = await prisma.nPC.findMany({
        where: { faction: npc.faction, role: { in: ['key', 'important'] } },
        take: 1,
      });
      if (factionNpcs.length > 0) {
        heirName = factionNpcs[0]!.name;
      }
    }

    // Create inheritance event for all players
    const players = await prisma.player.findMany({ take: 10 });
    for (const player of players) {
      const eventDate = new Date();
      eventDate.setDate(eventDate.getDate() + 1);

      await prisma.event.create({
        data: {
          id: `npc_inheritance_${npcId}_${Date.now()}_${player.id.slice(0, 8)}`,
          playerId: player.id,
          type: 'personal_event',
          category: 'daily_life',
          title: `${npcName}去世，继承人选确立`,
          description: `${npcName}已离世，${heirName}将接替其职责。`,
          narrativeText: `${npc.faction ?? '无阵营'}的${npcName}于第${gameDay}天离世。\n\n${heirName}已确认接任${npc.factionPosition ?? npc.type}一职，将继续处理相关事务。`,
          choices: JSON.stringify([
            { index: 0, label: '参加葬礼', description: '前往悼念', consequences: [] as unknown[], narrativeOutcome: '你参加了葬礼，表达了对逝者的敬意。' },
            { index: 1, label: '暂不回应', description: '观望局势', consequences: [] as unknown[], narrativeOutcome: '你选择暂时观望，看看局势如何发展。' },
          ]),
          scope: 'local',
          status: 'pending',
          expiresAt: eventDate,
        },
      });
    }

    console.log(`[Inheritance] NPC ${npcName} (${npcId}) died on day ${gameDay}. Heir: ${heirName}. Events created for ${players.length} players.`);
    return true;
  } catch (err) {
    console.error('[Inheritance Error]', err);
    return false;
  }
}

function generateAgingNarrative(results: {
  aged: number;
  died: number;
  stageChanges: number;
  deaths: Array<{ npcId: string; name: string; age: number; type: DeathType }>;
}): string {
  const parts: string[] = [];

  parts.push(`这一年，${results.aged}位NPC度过了他们的时光。`);

  if (results.stageChanges > 0) {
    parts.push(`${results.stageChanges}位NPC进入了人生的新阶段。`);
  }

  if (results.died > 0) {
    parts.push(`不幸的是，${results.died}位NPC离世了。`);
    if (results.deaths.length > 0 && results.deaths.length <= 3) {
      const deathList = results.deaths.map(d => `${d.name}(${d.age}岁)`).join('、');
      parts.push(`他们是：${deathList}。`);
    }
  }

  return parts.join('\n');
}

export default router;