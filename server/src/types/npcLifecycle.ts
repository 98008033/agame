// NPC Lifecycle Types - Based on PLAN/13-npc-lifecycle.md and PLAN/35-npc-life-cycle.md

// ============================================
// Life Stage Types
// ============================================

export type LifeStage =
  | 'infant'    // 0-6岁 - 幼年，无行动能力
  | 'child'     // 7-14岁 - 少年，开始学习
  | 'youth'     // 15-30岁 - 青年，快速成长
  | 'adult'     // 31-50岁 - 壮年，能力巅峰
  | 'middle'    // 51-65岁 - 中年，经验丰富
  | 'elder'     // 66-80岁 - 老年，能力衰退
  | 'terminal'; // 80岁+ - 终末，高死亡概率

export const LifeStageNames: Record<LifeStage, string> = {
  infant: '幼年',
  child: '少年',
  youth: '青年',
  adult: '壮年',
  middle: '中年',
  elder: '老年',
  terminal: '终末',
};

export function getLifeStageFromAge(age: number): LifeStage {
  if (age < 7) return 'infant';
  if (age < 15) return 'child';
  if (age < 31) return 'youth';
  if (age < 51) return 'adult';
  if (age < 66) return 'middle';
  if (age < 80) return 'elder';
  return 'terminal';
}

// ============================================
// Death Types
// ============================================

export type DeathType =
  | 'natural'      // 自然死亡（老病）
  | 'combat'       // 战斗死亡
  | 'assassination' // 暗杀
  | 'plague'       // 瘟疫
  | 'execution'    // 处决
  | 'accident';    // 意外

export const DeathTypeNames: Record<DeathType, string> = {
  natural: '自然死亡',
  combat: '战死',
  assassination: '被暗杀',
  plague: '病逝',
  execution: '被处决',
  accident: '意外死亡',
};

// ============================================
// Death Probability (per game year)
// ============================================

export function getNaturalDeathProbability(age: number, health: number): number {
  // Base probability by age
  let baseProb = 0;
  if (age >= 60 && age < 65) baseProb = 0.03;
  else if (age >= 65 && age < 70) baseProb = 0.08;
  else if (age >= 70 && age < 75) baseProb = 0.15;
  else if (age >= 75 && age < 80) baseProb = 0.25;
  else if (age >= 80) baseProb = 0.40;

  // Health modifier (health 0-100)
  // Lower health = higher death probability
  const healthModifier = (100 - health) / 100 * 0.5;

  return Math.min(1, baseProb + healthModifier);
}

// ============================================
// Inheritance Types
// ============================================

export type InheritanceType =
  | 'child'      // 子女继承
  | 'apprentice' // 师徒传承
  | 'subordinate' // 副手接任
  | 'election'   // 选举产生
  | 'crisis';    // 继承危机

export type HeirPriority = 'designated' | 'blood' | 'apprentice' | 'subordinate' | 'external';

// ============================================
// NPC Family Structure
// ============================================

export interface NPCFamily {
  parents: string[];       // 父母NPC ID
  spouse: string | null;   // 配偶NPC ID
  children: string[];      // 子女NPC ID
  siblings: string[];      // 兄弟姐妹NPC ID
}

// ============================================
// NPC Inheritance
// ============================================

export interface NPCInheritance {
  heir: string | null;           // 指定继承人ID
  heirType: InheritanceType;     // 继承类型
  willContent: string | null;    // 遗嘱内容
  assets: NPCAsset[];            // 资产清单
}

export interface NPCAsset {
  type: 'property' | 'gold' | 'item' | 'skill' | 'position';
  id: string;
  name: string;
  value: number;
}

// ============================================
// NPC Health Status
// ============================================

export interface NPCHealth {
  current: number;               // 0-100
  deathProbability: number;      // 年度死亡概率
  conditions: string[];          // 疾病或伤势
  lastHealthUpdate: string;      // ISO timestamp
}

// ============================================
// NPC Life Events
// ============================================

export interface NPCLifeEvent {
  type: 'birth' | 'education' | 'employment' | 'marriage' | 'child_birth' | 'promotion' | 'retirement' | 'death';
  date: string;                  // ISO timestamp
  gameDay: number;
  description: string;
  relatedNPCs: string[];
  playerInvolved: boolean;
}

// ============================================
// NPC Social Status
// ============================================

export type SocialTier = 'bottom' | 'middle' | 'upper' | 'top';

export const SocialTierNames: Record<SocialTier, string> = {
  bottom: '平民',
  middle: '专业人士',
  upper: '领导者',
  top: '决策者',
};

export interface NPCSocialStatus {
  tier: SocialTier;
  influence: number;             // 0-100 影响力
  reputation: number;            // 0-100 声望
}

// ============================================
// NPC Occupation
// ============================================

export interface NPCOccupation {
  current: string;               // 当前职业
  position: string | null;       // 当前职位
  history: OccupationRecord[];   // 职业历史
}

export interface OccupationRecord {
  title: string;
  startGameDay: number;
  endGameDay: number | null;
  faction: string | null;
}

// ============================================
// Complete NPC Life Data
// ============================================

export interface NPCLife {
  // 基本信息
  id: string;
  name: string;
  birthGameDay: number;
  currentAge: number;

  // 人生阶段
  lifeStage: LifeStage;

  // 家庭
  family: NPCFamily;

  // 职业
  occupation: NPCOccupation;

  // 社会地位
  socialStatus: NPCSocialStatus;

  // 人生事件记录
  lifeEvents: NPCLifeEvent[];

  // 健康状态
  health: NPCHealth;

  // 继承
  inheritance: NPCInheritance;

  // 是否存活
  isAlive: boolean;
  deathType?: DeathType;
  deathGameDay?: number;
}

// ============================================
// Aging Effects
// ============================================

export interface AgingEffects {
  physiqueModifier: number;      // -percentage per year after 50
  agilityModifier: number;
  wisdomModifier: number;        // +percentage (experience compensation)
  willpowerModifier: number;     // +percentage
  combatAbilityModifier: number; // -percentage after 60
}

export function calculateAgingEffects(age: number): AgingEffects {
  // Young peak: 30-50 years
  // Decline starts at 50+
  if (age < 50) {
    return {
      physiqueModifier: 0,
      agilityModifier: 0,
      wisdomModifier: 0,
      willpowerModifier: 0,
      combatAbilityModifier: 0,
    };
  }

  // After 50, physical decline
  const declineRate = Math.min(0.5, (age - 50) / 30); // Max 50% decline by 80

  return {
    physiqueModifier: -declineRate * 30,        // -30% by 80
    agilityModifier: -declineRate * 25,         // -25% by 80
    wisdomModifier: Math.min(20, (age - 50) * 0.5),  // +20 by 70 (experience)
    willpowerModifier: Math.min(15, (age - 50) * 0.3), // +15 by 70
    combatAbilityModifier: -declineRate * 40,   // -40% by 80
  };
}

// ============================================
// Attribute Inheritance
// ============================================

export function calculateChildAttributes(
  parent1Attributes: Record<string, number>,
  parent2Attributes: Record<string, number>
): Record<string, number> {
  const childAttributes: Record<string, number> = {};

  const attributeKeys = ['physique', 'agility', 'wisdom', 'willpower', 'perception', 'charisma', 'luck'];

  for (const key of attributeKeys) {
    const p1Value = parent1Attributes[key] ?? 40;
    const p2Value = parent2Attributes[key] ?? 40;
    const randomFactor = (Math.random() - 0.5) * 20; // -10 to +10

    // Child = (parent1 * 0.4 + parent2 * 0.4 + random * 0.2)
    childAttributes[key] = Math.round(p1Value * 0.4 + p2Value * 0.4 + randomFactor * 0.2);

    // Clamp to valid range
    const min = key === 'luck' ? 30 : 0;
    const max = 100;
    childAttributes[key] = Math.max(min, Math.min(max, childAttributes[key]));
  }

  // Default fame/infamy to 0
  childAttributes['fame'] = 0;
  childAttributes['infamy'] = 0;

  return childAttributes;
}

// ============================================
// Nation Inheritance Rules
// ============================================

export interface NationInheritanceRule {
  nation: string;
  primaryMethod: InheritanceType;
  secondaryMethod: InheritanceType;
  requiresElection: boolean;
  playerCanInfluence: boolean;
}

export const NationInheritanceRules: Record<string, NationInheritanceRule> = {
  canglong: {
    nation: 'canglong',
    primaryMethod: 'child',       // 嫡长子优先
    secondaryMethod: 'election',  // 科举选拔
    requiresElection: false,
    playerCanInfluence: true,
  },
  shuanglang: {
    nation: 'shuanglang',
    primaryMethod: 'election',    // 实力推选
    secondaryMethod: 'crisis',    // 决斗/内战
    requiresElection: true,
    playerCanInfluence: true,
  },
  jinque: {
    nation: 'jinque',
    primaryMethod: 'election',    // 金钱投票
    secondaryMethod: 'child',     // 家族继承
    requiresElection: true,
    playerCanInfluence: true,
  },
  border: {
    nation: 'border',
    primaryMethod: 'election',    // 村民推选
    secondaryMethod: 'subordinate', // 自然更替
    requiresElection: false,
    playerCanInfluence: true,
  },
};