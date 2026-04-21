/**
 * 遗产继承服务 - 玩家死亡后资产/属性/关系继承
 *
 * 功能:
 * - 死亡时计算遗产包 (金币、资源、部分技能EXP、关系)
 * - 继承规则 (血缘/师徒/指定)
 * - 新角色创建时继承奖励
 * - 与死亡叙事系统集成
 */

import prisma from '../models/prisma.js';
import { safeJsonParse, safeJsonStringify } from '../utils/index.js';
import type { SkillSet, BaseSkill, PlayerAttributes } from '../types/game.js';
import { DEFAULT_SKILL_SET, DEFAULT_PLAYER_ATTRIBUTES } from '../types/game.js';

// ============================================
// Types
// ============================================

export interface LegacyPackage {
  gold: number;
  resources: Record<string, number>;
  skillExp: Record<string, number>;
  relationshipCarryover: Record<string, number>;
  tags: string[];
  bonusAttributes: Partial<PlayerAttributes>;
}

export interface InheritanceResult {
  legacyId: string;
  legacyPackage: LegacyPackage;
  totalValue: number;
  inheritanceType: string;
  narrativeFeedback: string;
}

export interface LegacyRecord {
  id: string;
  playerId: string;
  deceasedName: string;
  deceasedLevel: number;
  inheritanceType: string;
  legacyPackage: LegacyPackage;
  totalValue: number;
  claimed: boolean;
  claimedBy: string | null;
  createdAt: string;
}

// ============================================
// Constants
// ============================================

/** 金币继承比例 (按死亡前持有量的百分比传递) */
export const GOLD_INHERITANCE_RATE = 0.3; // 30%

/** 资源继承比例 */
export const RESOURCE_INHERITANCE_RATE = 0.5; // 50%

/** 技能EXP保留比例 */
export const SKILL_EXP_INHERITANCE_RATE = 0.2; // 20%

/** 属性传承加成上限 */
export const ATTRIBUTE_BONUS_MAX = 5;

/** 每等级金币基础值 */
export const GOLD_PER_LEVEL = 100;

// ============================================
// Core Logic
// ============================================

/**
 * 计算死亡玩家的遗产包
 */
export function calculateLegacy(
  playerLevel: number,
  resources: Record<string, number>,
  skills: SkillSet,
  relationships: Record<string, number>,
  tags: string[],
  attributes: PlayerAttributes
): LegacyPackage {
  // 金币继承: 基础(等级*100) + 持有量的30%
  const goldHeld = resources['gold'] ?? 0;
  const goldBonus = playerLevel * GOLD_PER_LEVEL;
  const inheritedGold = Math.floor(goldHeld * GOLD_INHERITANCE_RATE) + goldBonus;

  // 资源继承
  const inheritedResources: Record<string, number> = {};
  for (const [key, value] of Object.entries(resources)) {
    if (key !== 'gold' && value > 0) {
      inheritedResources[key] = Math.floor(value * RESOURCE_INHERITANCE_RATE);
    }
  }

  // 技能EXP继承 (保留20%)
  const inheritedSkillExp: Record<string, number> = {};
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
    const parts = path.split('.');
    let skill: BaseSkill | null = null;
    if (parts.length === 1) {
      skill = (skills as unknown as Record<string, BaseSkill>)[parts[0]!] ?? null;
    } else {
      const parent = (skills as unknown as Record<string, Record<string, BaseSkill>>)[parts[0]!];
      skill = parent?.[parts[1]!] ?? null;
    }
    if (skill && skill.level > 0) {
      inheritedSkillExp[path] = Math.floor(skill.experience * SKILL_EXP_INHERITANCE_RATE);
    }
  }

  // 关系保留 (友好以上的NPC关系)
  const inheritedRelationships: Record<string, number> = {};
  for (const [npcId, value] of Object.entries(relationships)) {
    if (value >= 20) { // friendly threshold
      inheritedRelationships[npcId] = Math.floor(value * 0.5);
    }
  }

  // 标签继承 (部分标签传递)
  const inheritableTags = ['tier_peasant', 'tier_citizen', 'tier_gentry', 'tier_noble', 'tier_royal'];
  const inheritedTags = tags.filter(t => inheritableTags.includes(t));

  // 属性传承加成 (基于死者最高属性)
  const bonusAttributes: Partial<PlayerAttributes> = {};
  const maxAttr = Math.max(
    attributes.physique ?? 40,
    attributes.agility ?? 40,
    attributes.wisdom ?? 40,
    attributes.willpower ?? 40,
    attributes.perception ?? 40,
    attributes.charisma ?? 40
  );
  const attrBonus = Math.min(ATTRIBUTE_BONUS_MAX, Math.floor(maxAttr / 20));
  bonusAttributes.luck = Math.min(70, 50 + attrBonus); // 幸运加成

  return {
    gold: inheritedGold,
    resources: inheritedResources,
    skillExp: inheritedSkillExp,
    relationshipCarryover: inheritedRelationships,
    tags: inheritedTags,
    bonusAttributes,
  };
}

/**
 * 计算遗产总价值 (用于展示)
 */
export function calculateLegacyValue(legacy: LegacyPackage): number {
  let total = legacy.gold;
  for (const value of Object.values(legacy.resources)) {
    total += value;
  }
  total += Object.values(legacy.skillExp).reduce((sum, v) => sum + v, 0) / 10;
  total += Object.values(legacy.bonusAttributes).reduce((sum, v) => sum + (v as number), 0) * 10;
  return Math.floor(total);
}

/**
 * 创建遗产记录 (玩家死亡时调用)
 */
export async function createLegacyRecord(
  playerId: string,
  deceasedName: string,
  deceasedLevel: number,
  resources: Record<string, number>,
  skills: SkillSet,
  relationships: Record<string, number>,
  tags: string[],
  attributes: PlayerAttributes,
  inheritanceType: string = 'blood'
): Promise<LegacyRecord> {
  const legacyPackage = calculateLegacy(deceasedLevel, resources, skills, relationships, tags, attributes);
  const totalValue = calculateLegacyValue(legacyPackage);

  const legacyId = `legacy_${Date.now().toString(36)}_${playerId.substring(0, 8)}`;

  // 存储到 GameAction 作为记录
  await prisma.gameAction.create({
    data: {
      playerId,
      actionType: 'legacy_created',
      apCost: 0,
      parameters: safeJsonStringify({
        legacyId,
        deceasedName,
        deceasedLevel,
        inheritanceType,
      }),
      rewards: safeJsonStringify({
        legacyPackage,
        totalValue,
      }),
      narrativeFeedback: `${deceasedName} 的遗产已记录，价值 ${totalValue}。`,
      gameDay: 0,
      success: true,
    },
  });

  // 也存储到 GameConfig 表作为可查询的遗产记录
  await prisma.gameConfig.upsert({
    where: { key: legacyId },
    create: {
      key: legacyId,
      value: safeJsonStringify({
        playerId,
        deceasedName,
        deceasedLevel,
        inheritanceType,
        legacyPackage,
        totalValue,
        claimed: false,
        createdAt: new Date().toISOString(),
      }),
      description: `遗产: ${deceasedName} (Lv.${deceasedLevel})`,
    },
    update: {}, // Should not exist
  });

  return {
    id: legacyId,
    playerId,
    deceasedName,
    deceasedLevel,
    inheritanceType,
    legacyPackage,
    totalValue,
    claimed: false,
    claimedBy: null,
    createdAt: new Date().toISOString(),
  };
}

/**
 * 获取未领取的遗产记录
 */
export async function getUnclaimedLegacies(playerId: string): Promise<LegacyRecord[]> {
  const configs = await prisma.gameConfig.findMany({
    where: { key: { startsWith: 'legacy_' } },
  });

  const legacies: LegacyRecord[] = [];
  for (const config of configs) {
    const data = safeJsonParse<Record<string, unknown>>(config.value, {});
    if (data['playerId'] === playerId && !data['claimed']) {
      legacies.push({
        id: config.key,
        playerId: data['playerId'] as string,
        deceasedName: data['deceasedName'] as string,
        deceasedLevel: data['deceasedLevel'] as number,
        inheritanceType: data['inheritanceType'] as string,
        legacyPackage: data['legacyPackage'] as LegacyPackage,
        totalValue: data['totalValue'] as number,
        claimed: data['claimed'] as boolean,
        claimedBy: data['claimedBy'] as string | null,
        createdAt: data['createdAt'] as string,
      });
    }
  }

  return legacies;
}

/**
 * 领取遗产 (新角色创建时应用)
 */
export async function claimLegacy(
  legacyId: string,
  newPlayerId: string
): Promise<{ success: boolean; message: string; appliedBonus?: Record<string, unknown> }> {
  const config = await prisma.gameConfig.findUnique({ where: { key: legacyId } });
  if (!config) {
    return { success: false, message: '遗产记录不存在' };
  }

  const data = safeJsonParse<Record<string, unknown>>(config.value, {});
  if (data['claimed'] as boolean) {
    return { success: false, message: '该遗产已被领取' };
  }

  const legacyPackage = data['legacyPackage'] as LegacyPackage | undefined;
  if (!legacyPackage) {
    return { success: false, message: '遗产数据损坏' };
  }

  // 应用遗产到新玩家
  const player = await prisma.player.findUnique({ where: { id: newPlayerId } });
  if (!player) {
    return { success: false, message: '新角色不存在' };
  }

  const currentResources = safeJsonParse<Record<string, number>>(player.resources, {});
  const currentSkills = safeJsonParse<SkillSet>(player.skills, DEFAULT_SKILL_SET);
  const currentRelationships = safeJsonParse<Record<string, number>>(player.relationships, {});
  const currentTags = safeJsonParse<string[]>(player.tags, []);
  const currentAttributes = safeJsonParse<PlayerAttributes>(player.attributes, DEFAULT_PLAYER_ATTRIBUTES);

  // 应用金币
  currentResources['gold'] = (currentResources['gold'] ?? 0) + legacyPackage.gold;

  // 应用资源
  for (const [key, value] of Object.entries(legacyPackage.resources)) {
    currentResources[key] = (currentResources[key] ?? 0) + value;
  }

  // 应用技能EXP
  for (const [path, exp] of Object.entries(legacyPackage.skillExp)) {
    if (exp > 0) {
      const skill = getSkillFromPath(currentSkills, path);
      if (skill) {
        skill.experience += exp;
      }
    }
  }

  // 应用关系
  for (const [npcId, value] of Object.entries(legacyPackage.relationshipCarryover)) {
    currentRelationships[npcId] = Math.max(currentRelationships[npcId] ?? 0, value);
  }

  // 应用标签
  const newTags = [...new Set([...currentTags, ...legacyPackage.tags])];

  // 应用属性加成
  if (legacyPackage.bonusAttributes) {
    const attrRecord = currentAttributes as unknown as Record<string, number>;
    for (const [key, value] of Object.entries(legacyPackage.bonusAttributes)) {
      if (key in attrRecord) {
        attrRecord[key] = Math.max(attrRecord[key] ?? 40, value as number);
      }
    }
  }

  // 更新玩家数据
  await prisma.player.update({
    where: { id: newPlayerId },
    data: {
      resources: safeJsonStringify(currentResources),
      skills: safeJsonStringify(currentSkills),
      relationships: safeJsonStringify(currentRelationships),
      tags: safeJsonStringify(newTags),
      attributes: safeJsonStringify(currentAttributes),
    },
  });

  // 标记遗产为已领取
  data['claimed'] = true;
  data['claimedBy'] = newPlayerId;
  data['claimedAt'] = new Date().toISOString();
  await prisma.gameConfig.update({
    where: { key: legacyId },
    data: { value: safeJsonStringify(data) },
  });

  // 记录领取行为
  await prisma.gameAction.create({
    data: {
      playerId: newPlayerId,
      actionType: 'legacy_claimed',
      apCost: 0,
      parameters: safeJsonStringify({ legacyId, originalPlayerId: data['playerId'] }),
      rewards: safeJsonStringify({ gold: legacyPackage.gold, tags: legacyPackage.tags }),
      narrativeFeedback: `你继承了${data['deceasedName']}的遗产。`,
      gameDay: 0,
      success: true,
    },
  });

  return {
    success: true,
    message: '遗产领取成功',
    appliedBonus: {
      gold: legacyPackage.gold,
      resources: legacyPackage.resources,
      tags: legacyPackage.tags,
      bonusAttributes: legacyPackage.bonusAttributes,
    },
  };
}

/**
 * 获取技能对象（路径访问）
 */
function getSkillFromPath(skillSet: SkillSet, path: string): BaseSkill | null {
  const parts = path.split('.');
  if (parts.length === 1) {
    return (skillSet as unknown as Record<string, BaseSkill>)[parts[0]!] ?? null;
  }
  const parent = (skillSet as unknown as Record<string, Record<string, BaseSkill>>)[parts[0]!];
  return parent?.[parts[1]!] ?? null;
}
