/**
 * 关系循环系统 - NPC之间、NPC与玩家之间的关系动态变化
 *
 * 核心逻辑:
 * - 关系自然衰减: 正关系缓慢衰减, 负关系缓慢改善
 * - 关系影响力计算: 玩家关系网络对其社会影响力的加成
 * - 关系事件处理: 礼物、拜访、冲突等事件的自动化处理
 */

import prisma from '../models/prisma.js';
import { safeJsonParse, safeJsonStringify } from '../utils/index.js';
import { getRelationshipLevel, clampReputation } from '../types/game.js';
import type { RelationshipLevel } from '../types/game.js';

// ============================================
// 常量配置
// ============================================

export const RELATIONSHIP_CONFIG = {
  // 正关系衰减 (每天)
  positiveDecayHigh: -1,   // 关系>50: -1/天
  positiveDecayMedium: -2, // 关系20-50: -2/天
  positiveDecayLow: -1,    // 关系0-20: -1/天

  // 负关系改善 (每天)
  negativeImprovementDeep: 1,  // 关系<-50: +1/天
  negativeImprovementMedium: 0, // 关系-50到-20: 不变
  negativeImprovementLight: 1,  // 关系-20到0: +1/天

  // 关系边界
  relationshipMin: -100,
  relationshipMax: 100,

  // 关系影响力权重
  influenceWeightAllied: 0.15,    // 友好关系(+50以上)影响力加成
  influenceWeightNeutral: 0.05,   // 中性关系影响力加成
  influenceWeightHostile: -0.1,   // 敌对关系影响力减成

  // 关系事件处理
  maxEventsPerTick: 5,
};

// ============================================
// 类型定义
// ============================================

export interface RelationshipEntry {
  npcId: string;
  value: number;
  level: RelationshipLevel;
  lastInteraction?: Date;
}

export interface RelationshipNetworkNode {
  id: string;
  name: string;
  type: 'player' | 'npc';
  faction?: string;
  relationships: Array<{
    targetId: string;
    value: number;
    level: RelationshipLevel;
    nature?: 'kinship' | 'political' | 'economic' | 'social' | 'conflict';
  }>;
}

export interface RelationshipImpactResult {
  playerId: string;
  totalRelationshipScore: number;
  influenceBonus: number;
  alliedCount: number;
  hostileCount: number;
  networkSize: number;
}

export interface RelationshipEvent {
  id: string;
  type: 'gift' | 'visit' | 'conflict' | 'betrayal' | 'alliance';
  fromId: string;
  toId: string;
  impact: number;
  processed: boolean;
  createdAt: Date;
}

export interface DailyRelationshipUpdate {
  naturalChanges: Array<{
    fromId: string;
    toId: string;
    reason: 'decay' | 'improvement' | 'identity_conflict' | 'social_pressure';
    delta: number;
    before: number;
    after: number;
  }>;
  eventsProcessed: number;
  totalRelationshipsUpdated: number;
}

// ============================================
// 核心逻辑
// ============================================

/**
 * 计算关系衰减量
 */
function calculateDecay(value: number): number {
  if (value > 50) return RELATIONSHIP_CONFIG.positiveDecayHigh;
  if (value > 20) return RELATIONSHIP_CONFIG.positiveDecayMedium;
  if (value > 0) return RELATIONSHIP_CONFIG.positiveDecayLow;
  if (value < -50) return RELATIONSHIP_CONFIG.negativeImprovementDeep;
  if (value < -20) return RELATIONSHIP_CONFIG.negativeImprovementMedium;
  return RELATIONSHIP_CONFIG.negativeImprovementLight;
}

/**
 * 每日关系衰减 - NPC之间和与玩家之间的关系
 */
export async function decayAllRelationships(): Promise<DailyRelationshipUpdate> {
  const naturalChanges: DailyRelationshipUpdate['naturalChanges'] = [];
  let totalUpdated = 0;

  // ---- 1. 玩家与NPC关系衰减 ----
  const players = await prisma.player.findMany({
    select: { id: true, name: true, relationships: true },
  });

  for (const player of players) {
    const relationships = safeJsonParse<Record<string, number>>(player.relationships, {});
    let changed = false;

    for (const [npcId, value] of Object.entries(relationships)) {
      const decay = calculateDecay(value);
      if (decay === 0) continue;

      const before = value;
      const after = clampReputation(value + decay);
      if (after !== before) {
        relationships[npcId] = after;
        changed = true;
        totalUpdated++;
        naturalChanges.push({
          fromId: player.id,
          toId: npcId,
          reason: 'decay',
          delta: after - before,
          before,
          after,
        });
      }
    }

    if (changed) {
      await prisma.player.update({
        where: { id: player.id },
        data: { relationships: safeJsonStringify(relationships) },
      });
    }
  }

  // ---- 2. NPC之间关系衰减 ----
  const npcs = await prisma.nPC.findMany({
    select: { id: true, name: true, relationships: true },
  });

  for (const npc of npcs) {
    const relationships = safeJsonParse<Record<string, number>>(npc.relationships, {});
    let changed = false;

    for (const [targetId, value] of Object.entries(relationships)) {
      const decay = calculateDecay(value);
      if (decay === 0) continue;

      const before = value;
      const after = clampReputation(value + decay);
      if (after !== before) {
        relationships[targetId] = after;
        changed = true;
        totalUpdated++;
        naturalChanges.push({
          fromId: npc.id,
          toId: targetId,
          reason: 'decay',
          delta: after - before,
          before,
          after,
        });
      }
    }

    if (changed) {
      await prisma.nPC.update({
        where: { id: npc.id },
        data: { relationships: safeJsonStringify(relationships) },
      });
    }
  }

  console.log(`[Relationship] 关系衰减完成: ${totalUpdated} 条关系更新, ${naturalChanges.length} 条变化记录`);

  return {
    naturalChanges,
    eventsProcessed: 0,
    totalRelationshipsUpdated: totalUpdated,
  };
}

/**
 * 计算玩家关系对其影响力的加成
 */
export async function calculateRelationshipImpact(playerId: string): Promise<RelationshipImpactResult | null> {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) return null;

  const relationships = safeJsonParse<Record<string, number>>(player.relationships, {});

  let totalScore = 0;
  let alliedCount = 0;
  let hostileCount = 0;

  for (const [, value] of Object.entries(relationships)) {
    totalScore += value;
    if (value >= 50) alliedCount++;
    if (value <= -30) hostileCount++;
  }

  // 计算影响力加成
  let influenceBonus = 0;
  for (const [_, value] of Object.entries(relationships)) {
    if (value >= 50) {
      influenceBonus += value * RELATIONSHIP_CONFIG.influenceWeightAllied;
    } else if (value >= 0) {
      influenceBonus += value * RELATIONSHIP_CONFIG.influenceWeightNeutral;
    } else {
      influenceBonus += value * RELATIONSHIP_CONFIG.influenceWeightHostile;
    }
  }

  influenceBonus = Math.round(influenceBonus);

  return {
    playerId,
    totalRelationshipScore: totalScore,
    influenceBonus,
    alliedCount,
    hostileCount,
    networkSize: Object.keys(relationships).length,
  };
}

/**
 * 获取玩家完整关系网络数据（用于可视化）
 */
export async function getRelationshipNetwork(playerId: string): Promise<{
  nodes: RelationshipNetworkNode[];
  centerNodeId: string;
} | null> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, name: true, faction: true, relationships: true },
  });
  if (!player) return null;

  const relationships = safeJsonParse<Record<string, number>>(player.relationships, {});
  const npcIds = Object.keys(relationships);

  // 获取相关NPC信息
  const npcs = await prisma.nPC.findMany({
    where: { id: { in: npcIds } },
    select: { id: true, name: true, faction: true, relationships: true },
  });

  // 构建中心节点（玩家）
  const centerNode: RelationshipNetworkNode = {
    id: player.id,
    name: player.name,
    type: 'player',
    faction: player.faction ?? undefined,
    relationships: npcIds.map(npcId => ({
      targetId: npcId,
      value: relationships[npcId] ?? 0,
      level: getRelationshipLevel(relationships[npcId] ?? 0),
    })),
  };

  // 构建NPC节点及其之间的关系
  const npcNodes: RelationshipNetworkNode[] = npcs.map((npc: { id: string; name: string; faction: string | null; relationships: string }) => {
    const npcRelationships = safeJsonParse<Record<string, number>>(npc.relationships, {});
    const relatedTargets = Object.keys(npcRelationships);

    return {
      id: npc.id,
      name: npc.name,
      type: 'npc',
      faction: npc.faction ?? undefined,
      relationships: [
        // 与玩家的关系
        {
          targetId: player.id,
          value: npcRelationships[player.id] ?? relationships[npc.id] ?? 0,
          level: getRelationshipLevel(npcRelationships[player.id] ?? relationships[npc.id] ?? 0),
        },
        // 与其他NPC的关系（只包含也在网络中的NPC）
        ...relatedTargets
          .filter(t => npcIds.includes(t) && t !== npc.id)
          .map(targetId => ({
            targetId,
            value: npcRelationships[targetId] ?? 0,
            level: getRelationshipLevel(npcRelationships[targetId] ?? 0),
          })),
      ],
    };
  });

  return {
    nodes: [centerNode, ...npcNodes],
    centerNodeId: player.id,
  };
}

/**
 * 处理待处理的关系事件（礼物、拜访、冲突等）
 */
export async function processRelationshipEvents(): Promise<{
  processed: number;
  changes: Array<{ fromId: string; toId: string; eventType: string; impact: number }>;
}> {
  const changes: Array<{ fromId: string; toId: string; eventType: string; impact: number }> = [];

  // 从 GameConfig 中读取待处理的关系事件
  // 这里使用 events 表中未处理的关系类型事件
  const pendingEvents = await prisma.event.findMany({
    where: {
      status: 'pending',
      type: { in: ['personal_event', 'npc_request'] },
    },
    take: RELATIONSHIP_CONFIG.maxEventsPerTick,
    orderBy: { createdAt: 'asc' },
  });

  for (const event of pendingEvents) {
    const affectedEntities = safeJsonParse<string[]>(event.affectedEntities, []);
    if (affectedEntities.length < 2) continue;

    const [fromId, toId] = affectedEntities;
    if (!fromId || !toId) continue;

    // 根据事件类型确定影响值
    let impact = 0;
    switch (event.category) {
      case 'nation_invite':
        impact = 10;
        break;
      case 'personal_conflict':
        impact = -15;
        break;
      case 'daily_life':
        impact = 5;
        break;
      default:
        impact = event.description.length > 50 ? 8 : 3;
    }

    // 应用关系到相应实体
    await applyRelationshipChange(fromId, toId, impact, event.id);
    await applyRelationshipChange(toId, fromId, Math.floor(impact * 0.7), event.id);

    // 标记事件为已完成
    await prisma.event.update({
      where: { id: event.id },
      data: { status: 'completed' },
    });

    changes.push({ fromId, toId, eventType: event.category, impact });
  }

  console.log(`[Relationship] 事件处理完成: ${changes.length} 个事件`);

  return { processed: changes.length, changes };
}

/**
 * 对指定实体应用关系变化
 */
async function applyRelationshipChange(
  entityId: string,
  targetId: string,
  delta: number,
  reason: string
): Promise<void> {
  // 尝试作为玩家更新
  const player = await prisma.player.findUnique({
    where: { id: entityId },
    select: { id: true, relationships: true },
  });

  if (player) {
    const relationships = safeJsonParse<Record<string, number>>(player.relationships, {});
    const currentValue = relationships[targetId] ?? 0;
    relationships[targetId] = clampReputation(currentValue + delta);
    await prisma.player.update({
      where: { id: entityId },
      data: { relationships: safeJsonStringify(relationships) },
    });
    console.log(`[Relationship] ${entityId} -> ${targetId}: ${currentValue} -> ${relationships[targetId]} (${reason})`);
    return;
  }

  // 尝试作为NPC更新
  const npc = await prisma.nPC.findUnique({
    where: { id: entityId },
    select: { id: true, name: true, relationships: true },
  });

  if (npc) {
    const relationships = safeJsonParse<Record<string, number>>(npc.relationships, {});
    const currentValue = relationships[targetId] ?? 0;
    relationships[targetId] = clampReputation(currentValue + delta);
    await prisma.nPC.update({
      where: { id: entityId },
      data: { relationships: safeJsonStringify(relationships) },
    });
    console.log(`[Relationship] ${entityId} -> ${targetId}: ${currentValue} -> ${relationships[targetId]} (${reason})`);
    return;
  }

  console.warn(`[Relationship] 未找到实体: ${entityId}`);
}
