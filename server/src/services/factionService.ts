/**
 * 派系服务 - 声誉计算、成员列表、排行榜、阶层联动
 */

import prisma from '../models/prisma.js';
import { safeJsonParse, safeJsonStringify } from '../utils/index.js';
import { FactionNames, FactionLevelNames, clampReputation } from '../types/game.js';
import type { Faction, FactionLevel } from '../types/game.js';

// ============================================
// 常量配置
// ============================================

/** 派系阶层等级阈值 (声誉值) */
export const FACTION_TIERS: Array<{ level: FactionLevel; minRep: number }> = [
  { level: 'stranger', minRep: -100 },
  { level: 'neutral', minRep: 0 },
  { level: 'friendly', minRep: 20 },
  { level: 'loyal', minRep: 40 },
  { level: 'core', minRep: 60 },
  { level: 'legendary', minRep: 80 },
];

/** 高阶派系等级获得的基础声望加成/天 */
export const TIER_REPUTATION_BONUS: Record<FactionLevel, number> = {
  stranger: 0,
  neutral: 0,
  friendly: 0,
  loyal: 1,
  core: 2,
  legendary: 3,
};

// ============================================
// 核心逻辑
// ============================================

/**
 * 根据声誉值计算派系等级
 */
export function getFactionLevel(rep: number): FactionLevel {
  let result: FactionLevel = 'stranger';
  for (const tier of FACTION_TIERS) {
    if (rep >= tier.minRep) {
      result = tier.level;
    }
  }
  return result;
}

/**
 * 获取玩家在所有派系的声誉信息
 */
export async function getPlayerFactionReputation(playerId: string): Promise<{
  factions: Array<{
    id: Faction;
    name: string;
    reputation: number;
    level: FactionLevel;
    levelName: string;
    isAlly: boolean;
  }>;
}> {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) {
    throw new Error('Player not found');
  }

  const reputation = safeJsonParse<Record<string, number>>(player.reputation, {});
  const factions: Faction[] = ['canglong', 'shuanglang', 'jinque', 'border'];

  return {
    factions: factions.map(f => {
      const rep = reputation[f] ?? 0;
      const level = getFactionLevel(rep);
      return {
        id: f,
        name: FactionNames[f],
        reputation: rep,
        level,
        levelName: FactionLevelNames[level],
        isAlly: player.faction === f,
      };
    }),
  };
}

/**
 * 获取某派系的成员列表（按声誉排序）
 */
export async function getFactionMembers(faction: Faction, limit = 50, offset = 0): Promise<{
  members: Array<{
    playerId: string;
    name: string;
    factionLevel: string;
    reputation: number;
    level: number;
  }>;
  total: number;
}> {
  const players = await prisma.player.findMany({
    where: { faction },
    orderBy: { level: 'desc' },
    skip: offset,
    take: limit,
    select: {
      id: true,
      name: true,
      factionLevel: true,
      level: true,
      reputation: true,
    },
  });

  const members = players.map(p => {
    const rep = safeJsonParse<Record<string, number>>(p.reputation, {});
    return {
      playerId: p.id,
      name: p.name,
      factionLevel: p.factionLevel,
      reputation: rep[faction] ?? 0,
      level: p.level,
    };
  });

  const total = await prisma.player.count({ where: { faction } });

  return { members, total };
}

/**
 * 获取派系排行榜（所有玩家按某派系声誉排序）
 */
export async function getFactionRankings(limit = 100): Promise<{
  rankings: Array<{
    rank: number;
    playerId: string;
    name: string;
    faction: string;
    factions: Record<string, { reputation: number; level: string }>;
  }>;
}> {
  const players = await prisma.player.findMany({
    orderBy: { level: 'desc' },
    take: limit,
    select: {
      id: true,
      name: true,
      faction: true,
      level: true,
      reputation: true,
    },
  });

  const rankings = players.map((p, i) => {
    const rep = safeJsonParse<Record<string, number>>(p.reputation, {});
    const factionData: Record<string, { reputation: number; level: string }> = {};
    for (const [f, r] of Object.entries(rep)) {
      factionData[f] = {
        reputation: r,
        level: FactionLevelNames[getFactionLevel(r)],
      };
    }
    return {
      rank: i + 1,
      playerId: p.id,
      name: p.name,
      faction: p.faction ?? 'none',
      factions: factionData,
    };
  });

  return { rankings };
}

/**
 * 玩家与派系互动（增减声誉）
 */
export async function interactWithFaction(
  playerId: string,
  faction: Faction,
  delta: number,
  _reason: string = '玩家互动'
): Promise<{
  faction: string;
  previousRep: number;
  newRep: number;
  previousLevel: FactionLevel;
  newLevel: FactionLevel;
  bonusApplied: number;
}> {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) {
    throw new Error('Player not found');
  }

  const reputation = safeJsonParse<Record<string, number>>(player.reputation, {});
  const previousRep = reputation[faction] ?? 0;
  const previousLevel = getFactionLevel(previousRep);

  // 应用阶层联动加成：高阶获得额外加成
  const tierBonus = TIER_REPUTATION_BONUS[previousLevel];
  const effectiveDelta = delta > 0 ? delta + tierBonus : delta;

  // 计算新声誉并限制范围
  const newRep = clampReputation(previousRep + effectiveDelta);
  const newLevel = getFactionLevel(newRep);

  // 更新玩家声誉
  reputation[faction] = newRep;

  // 如果派系等级变化，更新 factionLevel
  const updates: Record<string, unknown> = {
    reputation: safeJsonStringify(reputation),
  };

  if (newLevel !== previousLevel && player.faction === faction) {
    updates.factionLevel = newLevel;
  }

  await prisma.player.update({
    where: { id: playerId },
    data: updates,
  });

  console.log(`[Faction] ${player.name} 与 ${FactionNames[faction]} 互动: ${previousRep} -> ${newRep} (${previousLevel} -> ${newLevel}), 加成 +${tierBonus}`);

  return {
    faction,
    previousRep,
    newRep,
    previousLevel,
    newLevel,
    bonusApplied: tierBonus,
  };
}

/**
 * 每日派系声誉加成结算（阶层联动）
 */
export async function applyDailyFactionBonus(): Promise<number> {
  const players = await prisma.player.findMany({
    select: { id: true, faction: true, reputation: true },
  });

  let updatedCount = 0;
  for (const player of players) {
    if (!player.faction) continue;

    const reputation = safeJsonParse<Record<string, number>>(player.reputation, {});
    const allyRep = reputation[player.faction] ?? 0;
    const allyLevel = getFactionLevel(allyRep);
    const bonus = TIER_REPUTATION_BONUS[allyLevel];

    if (bonus > 0 && reputation[player.faction] !== undefined) {
      reputation[player.faction] = clampReputation(allyRep + bonus);
      await prisma.player.update({
        where: { id: player.id },
        data: { reputation: safeJsonStringify(reputation) },
      });
      updatedCount++;
    }
  }

  return updatedCount;
}
