/**
 * 国家服务 - 声誉计算、成员列表、排行榜、阶层联动
 */

import prisma from '../models/prisma.js';
import { safeJsonParse, safeJsonStringify } from '../utils/index.js';
import { NationNames, NationLevelNames, clampReputation } from '../types/game.js';
import type { Nation, NationLevel } from '../types/game.js';

// ============================================
// 常量配置
// ============================================

/** 国家阶层等级阈值 (声誉值) */
export const NATION_TIERS: Array<{ level: NationLevel; minRep: number }> = [
  { level: 'stranger', minRep: -100 },
  { level: 'neutral', minRep: 0 },
  { level: 'friendly', minRep: 20 },
  { level: 'loyal', minRep: 40 },
  { level: 'core', minRep: 60 },
  { level: 'legendary', minRep: 80 },
];

/** 高阶国家等级获得的基础声望加成/天 */
export const TIER_REPUTATION_BONUS: Record<NationLevel, number> = {
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
 * 根据声誉值计算国家等级
 */
export function getNationLevel(rep: number): NationLevel {
  let result: NationLevel = 'stranger';
  for (const tier of NATION_TIERS) {
    if (rep >= tier.minRep) {
      result = tier.level;
    }
  }
  return result;
}

/**
 * 获取玩家在所有国家的声誉信息
 */
export async function getPlayerNationReputation(playerId: string): Promise<{
  nations: Array<{
    id: Nation;
    name: string;
    reputation: number;
    level: NationLevel;
    levelName: string;
    isAlly: boolean;
  }>;
}> {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) {
    throw new Error('Player not found');
  }

  const reputation = safeJsonParse<Record<string, number>>(player.reputation, {});
  const nations: Nation[] = ['canglong', 'shuanglang', 'jinque', 'border'];

  return {
    nations: nations.map(f => {
      const rep = reputation[f] ?? 0;
      const level = getNationLevel(rep);
      return {
        id: f,
        name: NationNames[f],
        reputation: rep,
        level,
        levelName: NationLevelNames[level],
        isAlly: player.faction === f,
      };
    }),
  };
}

/**
 * 获取某国家的成员列表（按声誉排序）
 */
export async function getNationMembers(nation: Nation, limit = 50, offset = 0): Promise<{
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
    where: { faction: nation },
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
      reputation: rep[nation] ?? 0,
      level: p.level,
    };
  });

  const total = await prisma.player.count({ where: { faction: nation } });

  return { members, total };
}

/**
 * 获取国家排行榜（所有玩家按某国家声誉排序）
 */
export async function getNationRankings(limit = 100): Promise<{
  rankings: Array<{
    rank: number;
    playerId: string;
    name: string;
    faction: string;
    nations: Record<string, { reputation: number; level: string }>;
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
    const nationData: Record<string, { reputation: number; level: string }> = {};
    for (const [f, r] of Object.entries(rep)) {
      nationData[f] = {
        reputation: r,
        level: NationLevelNames[getNationLevel(r)],
      };
    }
    return {
      rank: i + 1,
      playerId: p.id,
      name: p.name,
      faction: p.faction ?? 'none',
      nations: nationData,
    };
  });

  return { rankings };
}

/**
 * 玩家与国家互动（增减声誉）
 */
export async function interactWithNation(
  playerId: string,
  nation: Nation,
  delta: number,
  _reason: string = '玩家互动'
): Promise<{
  nation: string;
  previousRep: number;
  newRep: number;
  previousLevel: NationLevel;
  newLevel: NationLevel;
  bonusApplied: number;
}> {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) {
    throw new Error('Player not found');
  }

  const reputation = safeJsonParse<Record<string, number>>(player.reputation, {});
  const previousRep = reputation[nation] ?? 0;
  const previousLevel = getNationLevel(previousRep);

  // 应用阶层联动加成：高阶获得额外加成
  const tierBonus = TIER_REPUTATION_BONUS[previousLevel];
  const effectiveDelta = delta > 0 ? delta + tierBonus : delta;

  // 计算新声誉并限制范围
  const newRep = clampReputation(previousRep + effectiveDelta);
  const newLevel = getNationLevel(newRep);

  // 更新玩家声誉
  reputation[nation] = newRep;

  // 如果国家等级变化，更新 factionLevel
  const updates: Record<string, unknown> = {
    reputation: safeJsonStringify(reputation),
  };

  if (newLevel !== previousLevel && player.faction === nation) {
    updates.factionLevel = newLevel;
  }

  await prisma.player.update({
    where: { id: playerId },
    data: updates,
  });

  console.log(`[Nation] ${player.name} 与 ${NationNames[nation]} 互动: ${previousRep} -> ${newRep} (${previousLevel} -> ${newLevel}), 加成 +${tierBonus}`);

  return {
    nation,
    previousRep,
    newRep,
    previousLevel,
    newLevel,
    bonusApplied: tierBonus,
  };
}

/**
 * 每日国家声誉加成结算（阶层联动）
 */
export async function applyDailyNationBonus(): Promise<number> {
  const players = await prisma.player.findMany({
    select: { id: true, faction: true, reputation: true },
  });

  let updatedCount = 0;
  for (const player of players) {
    if (!player.faction) continue;

    const reputation = safeJsonParse<Record<string, number>>(player.reputation, {});
    const allyRep = reputation[player.faction] ?? 0;
    const allyLevel = getNationLevel(allyRep);
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
