/**
 * 经济循环系统 - 每日资源结算、阶层等级、关系衰减
 *
 * 核心逻辑:
 * - 金币: 基础 +50/天, 超过2000软上限每日衰减 -1%
 * - 影响力: 基础 +10/天, 超过500软上限每日衰减 -2%
 * - 阶层等级: 根据金币+影响力自动计算 (6阶层)
 * - 关系衰减: 7天未互动的NPC关系 -3/周
 */

import prisma from '../models/prisma.js';
import { safeJsonParse, safeJsonStringify } from '../utils/index.js';

// ============================================
// 常量配置
// ============================================

export const ECONOMY_CONFIG = {
  // 每日基础资源获取
  dailyGoldBase: 50,
  dailyInfluenceBase: 10,

  // 软上限
  goldSoftCap: 2000,
  influenceSoftCap: 500,

  // 超出软上限的每日衰减比例
  goldDecayRate: 0.01,     // -1%/天
  influenceDecayRate: 0.02, // -2%/天

  // 关系衰减
  relationshipDecayDays: 7, // 7天未互动
  relationshipDecayAmount: 3, // -3/周

  // 阶层等级阈值 (综合评分 = gold * 0.3 + influence * 0.7)
  socialTiers: [
    { level: 0, name: 'Outcast', minScore: 0 },
    { level: 1, name: 'Peasant', minScore: 100 },
    { level: 2, name: 'Citizen', minScore: 300 },
    { level: 3, name: 'Gentry', minScore: 600 },
    { level: 4, name: 'Noble', minScore: 1000 },
    { level: 5, name: 'Royal', minScore: 2000 },
  ],
};

// ============================================
// 类型定义
// ============================================

export interface DailySettlementResult {
  playerId: string;
  goldBefore: number;
  goldAfter: number;
  influenceBefore: number;
  influenceAfter: number;
  socialTierBefore: number;
  socialTierAfter: number;
  relationshipsDecayed: number;
}

// ============================================
// 核心逻辑
// ============================================

/**
 * 计算阶层等级
 */
export function calculateSocialTier(gold: number, influence: number): { level: number; name: string } {
  const score = gold * 0.3 + influence * 0.7;
  let tier = ECONOMY_CONFIG.socialTiers[0]!;
  for (const t of ECONOMY_CONFIG.socialTiers) {
    if (score >= t.minScore) {
      tier = t;
    }
  }
  return { level: tier.level, name: tier.name };
}

/**
 * 对单个玩家执行每日结算
 */
export async function settlePlayer(playerId: string): Promise<DailySettlementResult | null> {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) return null;

  const resources = safeJsonParse<Record<string, number>>(player.resources, {});
  const relationships = safeJsonParse<Record<string, number>>(player.relationships, {});
  const tags = safeJsonParse<string[]>(player.tags, []);

  const goldBefore = resources['gold'] ?? 0;
  const influenceBefore = resources['influence'] ?? 0;
  const tierBefore = calculateSocialTier(goldBefore, influenceBefore);

  // ---- 1. 每日资源获取 ----
  let newGold = goldBefore + ECONOMY_CONFIG.dailyGoldBase;
  let newInfluence = influenceBefore + ECONOMY_CONFIG.dailyInfluenceBase;

  // ---- 2. 软上限衰减 ----
  if (newGold > ECONOMY_CONFIG.goldSoftCap) {
    const excess = newGold - ECONOMY_CONFIG.goldSoftCap;
    newGold -= Math.floor(excess * ECONOMY_CONFIG.goldDecayRate);
  }
  if (newInfluence > ECONOMY_CONFIG.influenceSoftCap) {
    const excess = newInfluence - ECONOMY_CONFIG.influenceSoftCap;
    newInfluence -= Math.floor(excess * ECONOMY_CONFIG.influenceDecayRate);
  }

  // 确保不为负
  newGold = Math.max(0, newGold);
  newInfluence = Math.max(0, newInfluence);

  // ---- 3. 关系衰减 ----
  let decayedCount = 0;
  const now = Date.now();

  for (const [npcId, value] of Object.entries(relationships)) {
    // relationships 中存的是数值，不附带时间戳 — 从 decision 记录中查找最近互动时间
    const lastInteraction = await prisma.decision.findFirst({
      where: {
        playerId,
        event: {
          affectedEntities: { contains: npcId },
        },
      },
      orderBy: { madeAt: 'desc' },
      select: { madeAt: true },
    });

    if (lastInteraction) {
      const daysSince = (now - lastInteraction.madeAt.getTime()) / (24 * 60 * 60 * 1000);
      if (daysSince >= ECONOMY_CONFIG.relationshipDecayDays) {
        relationships[npcId] = Math.max(-100, value - ECONOMY_CONFIG.relationshipDecayAmount);
        decayedCount++;
      }
    } else {
      // 从未互动过，不衰减
    }
  }

  // ---- 4. 更新玩家数据 ----
  const tierAfter = calculateSocialTier(newGold, newInfluence);

  // 更新资源
  resources['gold'] = newGold;
  resources['influence'] = newInfluence;

  // 如果阶层变化，添加标签
  let updatedTags = [...tags];
  if (tierAfter.level !== tierBefore.level) {
    const tierTag = `tier_${tierAfter.name.toLowerCase()}`;
    if (!updatedTags.includes(tierTag)) {
      updatedTags.push(tierTag);
    }
    console.log(`[Economy] Player ${player.name} 阶层变化: ${tierBefore.name} -> ${tierAfter.name}`);
  }

  await prisma.player.update({
    where: { id: playerId },
    data: {
      resources: safeJsonStringify(resources),
      relationships: safeJsonStringify(relationships),
      tags: safeJsonStringify(updatedTags),
    },
  });

  return {
    playerId,
    goldBefore,
    goldAfter: newGold,
    influenceBefore,
    influenceAfter: newInfluence,
    socialTierBefore: tierBefore.level,
    socialTierAfter: tierAfter.level,
    relationshipsDecayed: decayedCount,
  };
}

/**
 * 对所有玩家执行每日结算
 */
export async function settleAllPlayers(): Promise<DailySettlementResult[]> {
  const players = await prisma.player.findMany({
    select: { id: true },
  });

  const results: DailySettlementResult[] = [];
  for (const player of players) {
    const result = await settlePlayer(player.id);
    if (result) {
      results.push(result);
    }
  }

  console.log(`[Economy] 每日结算完成: ${results.length} 名玩家`);
  return results;
}
