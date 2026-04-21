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
 * 技能定义元数据 - 用于技能树展示
 */
export interface SkillDefinition {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  category: 'strategy' | 'combat' | 'commerce' | 'survival';
  maxLevel: number;
  prerequisites: Array<{ skillId: string; minLevel: number }>;
  subLevels: Array<{ level: number; title: string; description: string }>;
}

/** 所有技能定义 */
export const SKILL_DEFINITIONS: SkillDefinition[] = [
  {
    id: 'survival',
    name: '基本生存',
    nameEn: 'Survival',
    description: '走路、吃饭、睡觉、砍柴、生火、搭帐篷、基础交流',
    category: 'survival',
    maxLevel: 3,
    prerequisites: [],
    subLevels: [
      { level: 1, title: '生存入门', description: '掌握基础生存技能，可在野外自保' },
      { level: 2, title: '野外求生', description: '能在恶劣环境中找到食物和庇护' },
      { level: 3, title: '生存专家', description: '精通野外生存，可带领队伍' },
    ],
  },
  {
    id: 'strategy.intelligenceAnalysis',
    name: '情报分析',
    nameEn: 'Intelligence Analysis',
    description: '察言观色、流言搜集、线索整合——发现隐藏的叙事线索',
    category: 'strategy',
    maxLevel: 3,
    prerequisites: [{ skillId: 'survival', minLevel: 2 }],
    subLevels: [
      { level: 1, title: '察言观色', description: '能感知他人情绪和立场' },
      { level: 2, title: '流言搜集', description: '能获得市井传言和线索' },
      { level: 3, title: '线索整合', description: '能从碎片信息中发现真相' },
    ],
  },
  {
    id: 'strategy.politicalManipulation',
    name: '政治操控',
    nameEn: 'Political Manipulation',
    description: '利益交换、派系建立、格局改变——解锁高级权谋事件',
    category: 'strategy',
    maxLevel: 3,
    prerequisites: [{ skillId: 'strategy.intelligenceAnalysis', minLevel: 3 }],
    subLevels: [
      { level: 4, title: '利益交换', description: '能在谈判中达成交易' },
      { level: 5, title: '派系建立', description: '能组建自己的政治势力' },
      { level: 6, title: '格局改变', description: '能影响国家政策走向' },
    ],
  },
  {
    id: 'combat.combatTechnique',
    name: '战斗技巧',
    nameEn: 'Combat Technique',
    description: '基础格斗、武器掌握、战术意识——参与个人和小规模战斗',
    category: 'combat',
    maxLevel: 3,
    prerequisites: [{ skillId: 'survival', minLevel: 1 }],
    subLevels: [
      { level: 1, title: '基础格斗', description: '能自保，对付普通强盗' },
      { level: 2, title: '武器掌握', description: '熟练使用一种武器' },
      { level: 3, title: '战术意识', description: '理解战场态势和阵型' },
    ],
  },
  {
    id: 'combat.militaryCommand',
    name: '军事指挥',
    nameEn: 'Military Command',
    description: '小队指挥、战术布局、战役决策——解锁战役级军事事件',
    category: 'combat',
    maxLevel: 3,
    prerequisites: [{ skillId: 'combat.combatTechnique', minLevel: 3 }],
    subLevels: [
      { level: 4, title: '小队指挥', description: '能指挥小队作战' },
      { level: 5, title: '战术布局', description: '能策划复杂军事行动' },
      { level: 6, title: '战役决策', description: '能决定大规模会战走向' },
    ],
  },
  {
    id: 'commerce.trade',
    name: '商业贸易',
    nameEn: 'Commerce',
    description: '识货估价、讨价还价、市场洞察——进行基础买卖和贸易',
    category: 'commerce',
    maxLevel: 3,
    prerequisites: [{ skillId: 'survival', minLevel: 2 }],
    subLevels: [
      { level: 1, title: '识货估价', description: '能识别商品价值' },
      { level: 2, title: '讨价还价', description: '能在交易中获得优势' },
      { level: 3, title: '市场洞察', description: '能预测价格波动' },
    ],
  },
  {
    id: 'commerce.industryManagement',
    name: '产业管理',
    nameEn: 'Industry Management',
    description: '资源配置、产业扩张、经济影响——解锁大规模经济活动',
    category: 'commerce',
    maxLevel: 3,
    prerequisites: [{ skillId: 'commerce.trade', minLevel: 3 }],
    subLevels: [
      { level: 4, title: '资源配置', description: '能有效配置人力物力' },
      { level: 5, title: '产业扩张', description: '能建立跨地区商业网络' },
      { level: 6, title: '经济影响', description: '能影响地区乃至国家经济' },
    ],
  },
];

/** 技能线颜色映射 */
export const SKILL_LINE_COLORS: Record<string, string> = {
  strategy: '#4CAF50',
  combat: '#A1887F',
  commerce: '#FFB74D',
  survival: '#8D6E63',
};

/**
 * 获取完整技能树（含解锁状态、前置条件、当前等级）
 */
export async function getSkillTree(playerId: string): Promise<{
  skills: Array<{
    id: string;
    name: string;
    nameEn: string;
    description: string;
    category: string;
    maxLevel: number;
    currentLevel: number;
    currentExp: number;
    expForNext: number;
    unlocked: boolean;
    canUnlock: boolean;
    unlockReason?: string;
    prerequisites: Array<{ skillId: string; minLevel: number }>;
    subLevels: Array<{ level: number; title: string; description: string }>;
  }>;
}> {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) {
    throw new Error('Player not found');
  }

  const skillSet = safeJsonParse<SkillSet>(player.skills, {} as SkillSet);

  const skills = SKILL_DEFINITIONS.map((def) => {
    const playerSkill = getSkill(skillSet, def.id);
    const currentLevel = playerSkill?.level ?? 0;
    const currentExp = playerSkill?.experience ?? 0;
    const unlocked = playerSkill?.unlocked ?? false;
    const unlockCheck = checkSkillUnlock(skillSet, def.id);
    const canUnlock = unlockCheck.unlocked && !unlocked;
    const expForNext = currentLevel < def.maxLevel ? getExpForNextLevel(currentLevel) : 0;

    return {
      id: def.id,
      name: def.name,
      nameEn: def.nameEn,
      description: def.description,
      category: def.category,
      maxLevel: def.maxLevel,
      currentLevel,
      currentExp,
      expForNext,
      unlocked,
      canUnlock,
      unlockReason: unlockCheck.reason,
      prerequisites: def.prerequisites,
      subLevels: def.subLevels,
    };
  });

  return { skills };
}

/**
 * 检查技能是否可以解锁
 */
export function canUnlockSkill(
  skillSet: SkillSet,
  skillId: string
): { canUnlock: boolean; reason?: string } {
  const check = checkSkillUnlock(skillSet, skillId);
  if (!check.unlocked) {
    return { canUnlock: false, reason: check.reason };
  }
  const skill = getSkill(skillSet, skillId);
  if (skill?.unlocked) {
    return { canUnlock: false, reason: '技能已解锁' };
  }
  return { canUnlock: true };
}

/**
 * 解锁技能（如果前置条件满足）
 */
export async function unlockSkill(
  playerId: string,
  skillId: string
): Promise<{
  success: boolean;
  skill: BaseSkill;
  message: string;
}> {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) {
    throw new Error('Player not found');
  }

  const skillSet = safeJsonParse<SkillSet>(player.skills, {} as SkillSet);
  const skill = getSkill(skillSet, skillId);
  if (!skill) {
    throw new Error(`技能 ${skillId} 不存在`);
  }
  if (skill.unlocked) {
    throw new Error('技能已解锁');
  }

  const unlockCheck = canUnlockSkill(skillSet, skillId);
  if (!unlockCheck.canUnlock) {
    throw new Error(unlockCheck.reason ?? '无法解锁');
  }

  skill.unlocked = true;
  skill.level = 1;
  setSkill(skillSet, skillId, skill);

  await prisma.player.update({
    where: { id: playerId },
    data: { skills: safeJsonStringify(skillSet) },
  });

  const def = SKILL_DEFINITIONS.find((s) => s.id === skillId);
  const message = `解锁技能: ${def?.name ?? skillId} Lv.1`;
  console.log(`[Skill Unlock] ${player.name}: ${message}`);

  return { success: true, skill, message };
}

/**
 * 获取技能详情
 */
export async function getSkillDetail(
  skillId: string,
  playerId: string
): Promise<{
  definition: SkillDefinition;
  currentLevel: number;
  currentExp: number;
  expForNext: number;
  unlocked: boolean;
  canUnlock: boolean;
  unlockReason?: string;
  expHistory: Array<{ level: number; exp: number }>;
}> {
  const def = SKILL_DEFINITIONS.find((s) => s.id === skillId);
  if (!def) {
    throw new Error(`技能 ${skillId} 不存在`);
  }

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) {
    throw new Error('Player not found');
  }

  const skillSet = safeJsonParse<SkillSet>(player.skills, {} as SkillSet);
  const playerSkill = getSkill(skillSet, skillId);
  const currentLevel = playerSkill?.level ?? 0;
  const currentExp = playerSkill?.experience ?? 0;
  const unlocked = playerSkill?.unlocked ?? false;
  const unlockCheck = checkSkillUnlock(skillSet, skillId);
  const canUnlock = unlockCheck.unlocked && !unlocked;
  const expForNext = currentLevel < def.maxLevel ? getExpForNextLevel(currentLevel) : 0;

  // Build exp history for each sub-level
  const expHistory = def.subLevels.map((sub) => ({
    level: sub.level,
    exp: getExpForNextLevel(sub.level),
  }));

  return {
    definition: def,
    currentLevel,
    currentExp,
    expForNext,
    unlocked,
    canUnlock,
    unlockReason: unlockCheck.reason,
    expHistory,
  };
}

/**
 * 获取可解锁的技能列表
 */
export async function getAvailableSkills(playerId: string): Promise<{
  skills: Array<{
    id: string;
    name: string;
    category: string;
    prerequisites: Array<{ skillId: string; minLevel: number }>;
  }>;
}> {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) {
    throw new Error('Player not found');
  }

  const skillSet = safeJsonParse<SkillSet>(player.skills, {} as SkillSet);

  const skills = SKILL_DEFINITIONS.filter((def) => {
    const playerSkill = getSkill(skillSet, def.id);
    if (playerSkill?.unlocked) return false;
    const check = checkSkillUnlock(skillSet, def.id);
    return check.unlocked;
  }).map((def) => ({
    id: def.id,
    name: def.name,
    category: def.category,
    prerequisites: def.prerequisites,
  }));

  return { skills };
}

/**
 * 获取技能对象（支持路径如 "survival", "strategy.intelligenceAnalysis"）
 */
export function getSkill(skillSet: SkillSet, skillPath: string): BaseSkill | null {
  const parts = skillPath.split('.');
  if (parts.length === 1) {
    return (skillSet as unknown as Record<string, unknown>)[parts[0]!] as BaseSkill | undefined ?? null;
  }
  const parent = (skillSet as unknown as Record<string, unknown>)[parts[0]!] as Record<string, BaseSkill> | undefined;
  return parent?.[parts[1]!] ?? null;
}

/**
 * 更新技能对象
 */
export function setSkill(skillSet: SkillSet, skillPath: string, skill: BaseSkill): void {
  const parts = skillPath.split('.');
  if (parts.length === 1) {
    (skillSet as unknown as Record<string, BaseSkill>)[parts[0]!] = skill;
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
