/**
 * 技能服务 - EXP获取、升级、解锁验证
 */

import prisma from '../models/prisma.js';
import { safeJsonParse, safeJsonStringify } from '../utils/index.js';
import type { SkillSet, BaseSkill } from '../types/game.js';

// ============================================
// 常量配置
// ============================================

/** 每级所需EXP (level 1→2需要100, 2→3需要250, 以此类推) */
export const EXP_PER_LEVEL: Record<number, number> = {
  0: 0,
  1: 100,
  2: 250,
  3: 500,
  4: 1000,
  5: 2000,
  6: 3500,
  7: 5500,
  8: 8000,
  9: 12000,
  10: 99999, // max level
};

/** 技能解锁前置要求 */
export const SKILL_PREREQUISITES: Record<string, { parentSkill?: string; parentLevel?: number }> = {
  // Strategy 分支
  'strategy.intelligenceAnalysis': { parentSkill: 'survival', parentLevel: 2 },
  'strategy.politicalManipulation': { parentSkill: 'strategy.intelligenceAnalysis', parentLevel: 3 },
  // Combat 分支
  'combat.combatTechnique': { parentSkill: 'survival', parentLevel: 1 },
  'combat.militaryCommand': { parentSkill: 'combat.combatTechnique', parentLevel: 3 },
  // Commerce 分支
  'commerce.trade': { parentSkill: 'survival', parentLevel: 2 },
  'commerce.industryManagement': { parentSkill: 'commerce.trade', parentLevel: 3 },
};

export const MAX_SKILL_LEVEL = 10;

// ============================================
// 核心逻辑
// ============================================

/**
 * 获取技能对象（支持路径如 "survival", "strategy.intelligenceAnalysis"）
 */
export function getSkill(skillSet: SkillSet, skillPath: string): BaseSkill | null {
  const parts = skillPath.split('.');
  if (parts.length === 1) {
    return (skillSet as Record<string, unknown>)[parts[0]!] as BaseSkill | undefined ?? null;
  }
  const parent = (skillSet as Record<string, unknown>)[parts[0]!] as Record<string, BaseSkill> | undefined;
  return parent?.[parts[1]!] ?? null;
}

/**
 * 更新技能对象
 */
export function setSkill(skillSet: SkillSet, skillPath: string, skill: BaseSkill): void {
  const parts = skillPath.split('.');
  if (parts.length === 1) {
    (skillSet as Record<string, BaseSkill>)[parts[0]!] = skill;
  } else {
    const parent = skillSet[parts[0] as keyof SkillSet] as Record<string, BaseSkill>;
    if (parent) {
      parent[parts[1]!] = skill;
    }
  }
}

/**
 * 获取指定技能升级所需EXP
 */
export function getExpForNextLevel(currentLevel: number): number {
  return EXP_PER_LEVEL[currentLevel] ?? 99999;
}

/**
 * 验证技能解锁条件
 */
export function checkSkillUnlock(skillSet: SkillSet, skillPath: string): {
  unlocked: boolean;
  reason?: string;
} {
  const prereq = SKILL_PREREQUISITES[skillPath];
  if (!prereq) {
    return { unlocked: true }; // 无前置要求（如 survival）
  }

  if (prereq.parentSkill && prereq.parentLevel) {
    const parent = getSkill(skillSet, prereq.parentSkill);
    if (!parent || parent.level < prereq.parentLevel) {
      return {
        unlocked: false,
        reason: `需要 ${prereq.parentSkill} 达到 Lv.${prereq.parentLevel}`,
      };
    }
  }

  return { unlocked: true };
}

/**
 * 为指定技能增加EXP，自动处理升级
 */
export async function gainSkillExp(
  playerId: string,
  skillPath: string,
  exp: number,
  source: string = 'player_action'
): Promise<{
  skillPath: string;
  previousLevel: number;
  previousExp: number;
  newLevel: number;
  newExp: number;
  leveledUp: boolean;
  levelsGained: number;
}> {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) {
    throw new Error('Player not found');
  }

  const skillSet = safeJsonParse<SkillSet>(player.skills, {} as SkillSet);
  const currentSkill = getSkill(skillSet, skillPath);

  if (!currentSkill) {
    throw new Error(`技能 ${skillPath} 不存在`);
  }

  if (!currentSkill.unlocked) {
    const unlockCheck = checkSkillUnlock(skillSet, skillPath);
    if (!unlockCheck.unlocked) {
      throw new Error(`技能未解锁: ${unlockCheck.reason}`);
    }
    // Auto unlock if prerequisites met
    currentSkill.unlocked = true;
  }

  const previousLevel = currentSkill.level;
  const previousExp = currentSkill.experience;
  let newExp = currentSkill.experience + exp;
  let newLevel = currentSkill.level;
  let leveledUp = false;
  let levelsGained = 0;

  // 检查是否可以升级（支持连续升级）
  while (newLevel < MAX_SKILL_LEVEL) {
    const required = getExpForNextLevel(newLevel);
    if (newExp >= required) {
      newLevel++;
      levelsGained++;
      leveledUp = true;
      newExp -= required; // 剩余EXP溢出到下一级
    } else {
      break;
    }
  }

  // 如果到达最高等级，EXP清零
  if (newLevel >= MAX_SKILL_LEVEL) {
    newExp = 0;
  }

  // 更新技能
  const updatedSkill: BaseSkill = {
    ...currentSkill,
    level: newLevel,
    experience: newExp,
    breakthroughReady: newLevel < MAX_SKILL_LEVEL && newExp >= getExpForNextLevel(newLevel) * 0.8,
  };
  setSkill(skillSet, skillPath, updatedSkill);

  await prisma.player.update({
    where: { id: playerId },
    data: { skills: safeJsonStringify(skillSet) },
  });

  // 记录行动历史
  await prisma.gameAction.create({
    data: {
      playerId,
      actionType: 'skill_exp',
      apCost: 0,
      parameters: safeJsonStringify({ skillPath, exp, source }),
      rewards: safeJsonStringify({ skillPath, level: newLevel, exp: newExp }),
      narrativeFeedback: leveledUp
        ? `你的 ${skillPath} 升至 Lv.${newLevel}！`
        : `你的 ${skillPath} 获得了 ${exp} EXP。`,
      gameDay: 0,
      success: true,
    },
  });

  if (leveledUp) {
    console.log(`[Skill] ${player.name}: ${skillPath} Lv.${previousLevel} -> Lv.${newLevel} (+${exp} EXP)`);
  }

  return {
    skillPath,
    previousLevel,
    previousExp,
    newLevel,
    newExp,
    leveledUp,
    levelsGained,
  };
}

/**
 * 获取玩家技能EXP历史
 */
export async function getSkillExpHistory(
  playerId: string,
  limit = 50,
  offset = 0
): Promise<Array<{
  id: number;
  skillPath: string;
  exp: number;
  source: string;
  newLevel: number;
  leveledUp: boolean;
  executedAt: string;
}>> {
  const actions = await prisma.gameAction.findMany({
    where: { playerId, actionType: 'skill_exp' },
    orderBy: { executedAt: 'desc' },
    skip: offset,
    take: limit,
  });

  return actions.map(a => {
    const params = safeJsonParse<Record<string, unknown>>(a.parameters, {});
    const rewards = safeJsonParse<Record<string, unknown>>(a.rewards, {});
    return {
      id: a.id,
      skillPath: (params['skillPath'] as string) ?? '',
      exp: (params['exp'] as number) ?? 0,
      source: (params['source'] as string) ?? '',
      newLevel: (rewards['level'] as number) ?? 0,
      leveledUp: (rewards['level'] as number) !== 0,
      executedAt: a.executedAt.toISOString(),
    };
  });
}
