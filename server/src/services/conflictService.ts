/**
 * 冲突检测与解决系统
 *
 * 核心逻辑:
 * - 冲突检测: 资源稀缺、国家紧张、个人宿敌
 * - 冲突事件生成: 使用 LLM 生成叙事描述
 * - 冲突解决: 根据选择结果更新关系和权力
 */

import prisma from '../models/prisma.js';
import { safeJsonParse, safeJsonStringify } from '../utils/index.js';
import { llmService } from '../services/llm/index.js';
import { NationNames, clampReputation } from '../types/game.js';
import type { Nation } from '../types/game.js';

// ============================================
// 常量配置
// ============================================

export const CONFLICT_CONFIG = {
  // 冲突检测阈值
  resourceShortageThreshold: 0.8,  // 资源供给<需求的80%触发
  factionHostilityThreshold: -30,  // 国家关系<-30触发
  npcRivalryThreshold: -40,        // NPC关系<-40触发宿敌
  factionPowerImbalance: 2.0,      // 权力差距>2倍触发冲突

  // 冲突类型
  types: ['resource_scarcity', 'faction_tension', 'personal_rivalry', 'class_tension'] as const,

  // 每日最大新冲突
  maxNewConflictsPerDay: 3,
};

export type ConflictType = typeof CONFLICT_CONFIG.types[number];

// ============================================
// 类型定义
// ============================================

export interface Conflict {
  id: string;
  type: ConflictType;
  participants: string[];
  severity: number;       // 1-10
  description: string;
  narrative?: string;
  status: 'active' | 'escalating' | 'resolving' | 'resolved';
  resolution?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface ConflictDetectionResult {
  newConflicts: Conflict[];
  totalActive: number;
  byType: Record<ConflictType, number>;
}

export interface ConflictResolutionResult {
  conflictId: string;
  success: boolean;
  relationshipChanges: Array<{ entityId: string; targetId: string; delta: number }>;
  narrative: string;
}

// ============================================
// 核心逻辑
// ============================================

/**
 * 扫描潜在冲突
 */
export async function detectConflicts(): Promise<ConflictDetectionResult> {
  const newConflicts: Conflict[] = [];

  // ---- 1. 资源稀缺冲突 ----
  const resourceConflicts = await detectResourceConflicts();
  newConflicts.push(...resourceConflicts);

  // ---- 2. 国家紧张冲突 ----
  const factionConflicts = await detectNationConflicts();
  newConflicts.push(...factionConflicts);

  // ---- 3. 个人宿敌冲突 ----
  const personalConflicts = await detectPersonalRivalries();
  newConflicts.push(...personalConflicts);

  // 限制每日新冲突数量
  const limitedConflicts = newConflicts.slice(0, CONFLICT_CONFIG.maxNewConflictsPerDay);

  // 为每个新冲突创建事件
  for (const conflict of limitedConflicts) {
    await createConflictEvent(conflict);
  }

  // 统计当前活跃冲突
  const activeConflicts = await prisma.event.findMany({
    where: {
      type: { in: ['military_conflict', 'trade_war', 'political_decision', 'personal_event'] },
      status: { in: ['pending', 'active'] },
      description: { contains: '冲突' },
    },
  });

  const byType: Record<ConflictType, number> = {
    resource_scarcity: 0,
    faction_tension: 0,
    personal_rivalry: 0,
    class_tension: 0,
  };

  for (const event of activeConflicts) {
    if (event.description.includes('资源')) byType.resource_scarcity++;
    if (event.description.includes('国家')) byType.faction_tension++;
    if (event.description.includes('个人') || event.description.includes('宿敌')) byType.personal_rivalry++;
    if (event.description.includes('阶级')) byType.class_tension++;
  }

  console.log(`[Conflict] 检测完成: ${limitedConflicts.length} 新冲突, ${activeConflicts.length} 活跃`);

  return {
    newConflicts: limitedConflicts,
    totalActive: activeConflicts.length,
    byType,
  };
}

/**
 * 检测资源稀缺冲突
 */
async function detectResourceConflicts(): Promise<Conflict[]> {
  const conflicts: Conflict[] = [];
  const worldState = await prisma.worldState.findFirst({ orderBy: { day: 'desc' } });
  if (!worldState) return conflicts;

  const factions = safeJsonParse<Record<string, { military: number; economy: number; stability: number }>>(worldState.factions, {});

  // 检测经济低下的国家可能产生资源冲突
  const factionList: Nation[] = ['canglong', 'shuanglang', 'jinque', 'border'];

  for (const faction of factionList) {
    const factionData = factions[faction];
    if (!factionData) continue;

    const economy = factionData.economy ?? 50;
    const stability = factionData.stability ?? 50;

    // 经济低下且稳定性低的国家可能产生资源矛盾
    if (economy < 30 && stability < 40) {
      conflicts.push({
        id: `conflict_resource_${faction}_${Date.now().toString(36)}`,
        type: 'resource_scarcity',
        participants: [faction],
        severity: Math.round((50 - economy) / 5),
        description: `${NationNames[faction]} 面临资源稀缺，经济(${economy})与稳定性(${stability})均较低，可能引发冲突`,
        status: 'active',
        createdAt: new Date(),
      });
    }
  }

  return conflicts;
}

/**
 * 检测国家紧张冲突
 */
async function detectNationConflicts(): Promise<Conflict[]> {
  const conflicts: Conflict[] = [];
  const worldState = await prisma.worldState.findFirst({ orderBy: { day: 'desc' } });
  if (!worldState) return conflicts;

  const factions = safeJsonParse<Record<string, { military: number; economy: number; stability: number }>>(worldState.factions, {});
  const factionList: Nation[] = ['canglong', 'shuanglang', 'jinque', 'border'];

  // 检查军事力量悬殊的国家之间是否可能产生冲突
  for (let i = 0; i < factionList.length; i++) {
    for (let j = i + 1; j < factionList.length; j++) {
      const a = factionList[i]!;
      const b = factionList[j]!;
      const dataA = factions[a];
      const dataB = factions[b];

      if (!dataA || !dataB) continue;

      const militaryA = dataA.military ?? 50;
      const militaryB = dataB.military ?? 50;
      const maxMil = Math.max(militaryA, militaryB);
      const minMil = Math.min(militaryA, militaryB);

      // 军事力量差距过大可能引发冲突
      if (minMil > 0 && maxMil / minMil >= CONFLICT_CONFIG.factionPowerImbalance) {
        conflicts.push({
          id: `conflict_faction_${a}_${b}_${Date.now().toString(36)}`,
          type: 'faction_tension',
          participants: [a, b],
          severity: Math.round((maxMil - minMil) / 10),
          description: `国家紧张: ${NationNames[a]} (军事${militaryA}) 与 ${NationNames[b]} (军事${militaryB}) 力量失衡`,
          status: 'active',
          createdAt: new Date(),
        });
      }
    }
  }

  return conflicts;
}

/**
 * 检测个人宿敌冲突
 */
async function detectPersonalRivalries(): Promise<Conflict[]> {
  const conflicts: Conflict[] = [];

  // 检查NPC之间的敌对关系
  const npcs = await prisma.nPC.findMany({
    select: { id: true, name: true, faction: true, relationships: true },
  });

  for (const npc of npcs) {
    const relationships = safeJsonParse<Record<string, number>>(npc.relationships, {});

    for (const [targetId, value] of Object.entries(relationships)) {
      if (value <= CONFLICT_CONFIG.npcRivalryThreshold) {
        // 检查是否已有此冲突
        const existingConflict = conflicts.find(
          c => c.participants.includes(npc.id) && c.participants.includes(targetId)
        );
        if (existingConflict) continue;

        conflicts.push({
          id: `conflict_personal_${npc.id}_${targetId}_${Date.now().toString(36)}`,
          type: 'personal_rivalry',
          participants: [npc.id, targetId],
          severity: Math.round(Math.abs(value) / 10),
          description: `个人宿敌: ${npc.name} 与 ${targetId} 关系恶化至 ${value}`,
          status: 'active',
          createdAt: new Date(),
        });
      }
    }
  }

  return conflicts;
}

/**
 * 生成冲突事件（使用LLM生成叙事）
 */
export async function generateConflictEvent(
  conflictType: string,
  participants: string[]
): Promise<Conflict | null> {
  // 获取参与者信息
  const participantNames: string[] = [];
  const participantNations: Nation[] = [];

  for (const pid of participants) {
    // 尝试作为NPC
    const npc = await prisma.nPC.findUnique({
      where: { id: pid },
      select: { name: true, faction: true },
    });
    if (npc) {
      participantNames.push(npc.name);
      if (npc.faction) participantNations.push(npc.faction as Nation);
      continue;
    }

    // 尝试作为国家
    if (['canglong', 'shuanglang', 'jinque', 'border'].includes(pid)) {
      participantNames.push(NationNames[pid as Nation]);
      participantNations.push(pid as Nation);
    }

    // 尝试作为玩家
    const player = await prisma.player.findUnique({
      where: { id: pid },
      select: { name: true, faction: true },
    });
    if (player) {
      participantNames.push(player.name);
      if (player.faction) participantNations.push(player.faction as Nation);
    }
  }

  // 使用LLM生成叙事
  let narrative = '';
  try {
    const messages = [
      { role: 'system' as const, content: '你是一位游戏事件叙事生成器。请根据冲突信息生成一个事件描述（200字以内）。' },
      {
        role: 'user' as const,
        content: `冲突类型: ${conflictType}\n参与者: ${participantNames.join(', ')}\n涉及国家: ${participantNations.map(f => NationNames[f]).join(', ')}\n请生成事件描述。`
      },
    ];
    const response = await llmService.generate({ messages, maxTokens: 400 });
    narrative = response.content;
  } catch {
    narrative = `${participantNames.join('与')}之间爆发了冲突。`;
  }

  const conflict: Conflict = {
    id: `conflict_${Date.now().toString(36)}`,
    type: conflictType as ConflictType,
    participants,
    severity: 5,
    description: narrative,
    narrative,
    status: 'active',
    createdAt: new Date(),
  };

  // 创建事件记录
  await createConflictEvent(conflict);

  return conflict;
}

/**
 * 解决冲突
 */
export async function resolveConflict(
  conflictId: string,
  resolution: string
): Promise<ConflictResolutionResult> {
  const event = await prisma.event.findUnique({
    where: { id: conflictId },
  });

  if (!event) {
    return {
      conflictId,
      success: false,
      relationshipChanges: [],
      narrative: '未找到冲突事件',
    };
  }

  const affectedEntities = safeJsonParse<string[]>(event.affectedEntities, []);
  const relationshipChanges: Array<{ entityId: string; targetId: string; delta: number }> = [];

  // 根据解决方式调整参与者之间的关系
  let relationshipDelta = 0;
  switch (resolution) {
    case 'peaceful':
    case 'compromise':
      relationshipDelta = 15;
      break;
    case 'violent':
    case 'suppression':
      relationshipDelta = -20;
      break;
    case 'ignored':
      relationshipDelta = -5;
      break;
    default:
      relationshipDelta = 0;
  }

  // 更新参与者之间的关系
  for (const entityId of affectedEntities) {
    for (const targetId of affectedEntities) {
      if (entityId === targetId) continue;

      await applyRelationshipChangeForConflict(entityId, targetId, relationshipDelta);
      relationshipChanges.push({ entityId, targetId, delta: relationshipDelta });
    }
  }

  // 生成解决叙事
  let narrative = '';
  try {
    const messages = [
      { role: 'system' as const, content: '你是一位历史学家，请根据以下信息生成一段冲突解决的叙述（100字以内）。' },
      {
        role: 'user' as const,
        content: `冲突: ${event.title}\n解决方式: ${resolution}\n原始描述: ${event.description}\n请生成解决叙述。`
      },
    ];
    const response = await llmService.generate({ messages, maxTokens: 200 });
    narrative = response.content;
  } catch {
    narrative = `冲突以${resolution}方式解决。`;
  }

  // 更新事件状态
  await prisma.event.update({
    where: { id: conflictId },
    data: {
      status: 'completed',
      narrativeText: narrative,
      description: `${event.description} | 解决: ${resolution}`,
    },
  });

  console.log(`[Conflict] 冲突解决: ${conflictId} (${resolution})`);

  return {
    conflictId,
    success: true,
    relationshipChanges,
    narrative,
  };
}

/**
 * 获取活跃冲突（可按玩家过滤）
 */
export async function getActiveConflicts(playerId?: string): Promise<Conflict[]> {
  const query: Record<string, unknown> = {
    status: { in: ['pending', 'active'] },
  };

  if (playerId) {
    // 查找包含玩家的事件
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { faction: true, relationships: true },
    });

    if (player) {
      const relationships = safeJsonParse<Record<string, number>>(player.relationships, {});
      const relatedNpcIds = Object.keys(relationships);

      query.OR = [
        { affectedEntities: { contains: playerId } },
        { affectedEntities: { contains: player.faction } },
        ...relatedNpcIds.map(npcId => ({ affectedEntities: { contains: npcId } })),
      ];
    }
  } else {
    query.description = { contains: '冲突' };
  }

  const events = await prisma.event.findMany({
    where: query,
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return events.map(event => {
    const affectedEntities = safeJsonParse<string[]>(event.affectedEntities, []);
    let conflictType: ConflictType = 'faction_tension';

    if (event.description.includes('资源')) conflictType = 'resource_scarcity';
    else if (event.description.includes('个人') || event.description.includes('宿敌')) conflictType = 'personal_rivalry';
    else if (event.description.includes('阶级')) conflictType = 'class_tension';

    return {
      id: event.id,
      type: conflictType,
      participants: affectedEntities,
      severity: 5,
      description: event.description,
      narrative: event.narrativeText ?? undefined,
      status: event.status as Conflict['status'],
      createdAt: event.createdAt,
    };
  });
}

// ============================================
// 内部辅助函数
// ============================================

/**
 * 创建冲突事件记录
 */
async function createConflictEvent(conflict: Conflict): Promise<void> {
  const eventType = conflict.type === 'resource_scarcity' ? 'resource_crisis'
    : conflict.type === 'faction_tension' ? 'military_conflict'
    : conflict.type === 'personal_rivalry' ? 'personal_event'
    : 'political_decision';

  await prisma.event.create({
    data: {
      id: conflict.id,
      type: eventType,
      category: 'daily_life',
      title: conflict.description.slice(0, 50),
      description: conflict.description,
      narrativeText: conflict.narrative,
      choices: safeJsonStringify([]),
      affectedEntities: safeJsonStringify(conflict.participants),
      scope: conflict.severity >= 7 ? 'national' : conflict.severity >= 4 ? 'regional' : 'local',
      status: 'pending',
    },
  });

  console.log(`[Conflict] 创建冲突事件: ${conflict.id} (${conflict.type})`);
}

/**
 * 为冲突应用关系变化
 */
async function applyRelationshipChangeForConflict(
  entityId: string,
  targetId: string,
  delta: number
): Promise<void> {
  // 尝试作为玩家
  const player = await prisma.player.findUnique({
    where: { id: entityId },
    select: { id: true, relationships: true },
  });

  if (player) {
    const relationships = safeJsonParse<Record<string, number>>(player.relationships, {});
    const current = relationships[targetId] ?? 0;
    relationships[targetId] = clampReputation(current + delta);
    await prisma.player.update({
      where: { id: entityId },
      data: { relationships: safeJsonStringify(relationships) },
    });
    return;
  }

  // 尝试作为NPC
  const npc = await prisma.nPC.findUnique({
    where: { id: entityId },
    select: { id: true, relationships: true },
  });

  if (npc) {
    const relationships = safeJsonParse<Record<string, number>>(npc.relationships, {});
    const current = relationships[targetId] ?? 0;
    relationships[targetId] = clampReputation(current + delta);
    await prisma.nPC.update({
      where: { id: entityId },
      data: { relationships: safeJsonStringify(relationships) },
    });
    return;
  }
}
