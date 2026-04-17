// Game Domain Types - Based on docs/data-structures.md

// ============================================
// Faction Types
// ============================================

export type Faction = 'canglong' | 'shuanglang' | 'jinque' | 'border';

export const FactionNames: Record<Faction, string> = {
  canglong: '苍龙帝国',
  shuanglang: '霜狼联邦',
  jinque: '金雀花王国',
  border: '边境联盟',
};

// ============================================
// History Stage Types
// ============================================

export type HistoryStage =
  | 'era_power_struggle'
  | 'era_war_prep'
  | 'era_chaos'
  | 'era_resolution';

export const HistoryStageNames: Record<HistoryStage, string> = {
  era_power_struggle: '权力博弈期',
  era_war_prep: '战争酝酿期',
  era_chaos: '动荡期',
  era_resolution: '决局期',
};

// ============================================
// Relationship Types
// ============================================

export type RelationshipLevel =
  | 'enemy'
  | 'hostile'
  | 'distrust'
  | 'neutral'
  | 'friendly'
  | 'respect'
  | 'admire';

export function getRelationshipLevel(value: number): RelationshipLevel {
  if (value >= 81) return 'admire';
  if (value >= 51) return 'respect';
  if (value >= 21) return 'friendly';
  if (value >= -19) return 'neutral';
  if (value >= -49) return 'distrust';
  if (value >= -79) return 'hostile';
  return 'enemy';
}

// ============================================
// Faction Level Types
// ============================================

export type FactionLevel =
  | 'stranger'
  | 'neutral'
  | 'friendly'
  | 'loyal'
  | 'core'
  | 'legendary';

export const FactionLevelNames: Record<FactionLevel, string> = {
  stranger: '疏离',
  neutral: '中立',
  friendly: '友好',
  loyal: '效忠',
  core: '核心',
  legendary: '传奇',
};

// ============================================
// Event Types
// ============================================

export type EventType =
  | 'military_conflict'
  | 'trade_war'
  | 'diplomatic_summit'
  | 'resource_crisis'
  | 'political_decision'
  | 'personal_event'
  | 'npc_request';

export type EventCategory =
  | 'faction_invite'
  | 'resource_dilemma'
  | 'personal_conflict'
  | 'crisis_response'
  | 'daily_life';

export type EventStatus =
  | 'pending'
  | 'active'
  | 'completed'
  | 'expired'
  | 'cancelled';

export type EventScope =
  | 'personal'
  | 'local'
  | 'regional'
  | 'national';

// ============================================
// NPC Types
// ============================================

export type NPCType =
  | 'villager'
  | 'merchant'
  | 'soldier'
  | 'official'
  | 'scholar'
  | 'craftsman'
  | 'adventurer'
  | 'leader';

export type NPCRole =
  | 'common'
  | 'important'
  | 'key';

// ============================================
// Player Attributes
// ============================================

export interface PlayerAttributes {
  physique: number;    // 体魄 (0-100)
  agility: number;     // 敏捷 (0-100)
  wisdom: number;      // 智慧 (0-100)
  willpower: number;   // 意志 (0-100)
  perception: number;  // 感知 (0-100)
  charisma: number;    // 魅力 (0-100)
  fame: number;        // 名望 (0-100)
  infamy: number;      // 恶名 (0-100)
  luck: number;        // 幸运 (30-70)
}

export const AttributeConstraints: Record<string, { min: number; max: number; default: number }> = {
  physique: { min: 0, max: 100, default: 40 },
  agility: { min: 0, max: 100, default: 40 },
  wisdom: { min: 0, max: 100, default: 40 },
  willpower: { min: 0, max: 100, default: 40 },
  perception: { min: 0, max: 100, default: 40 },
  charisma: { min: 0, max: 100, default: 40 },
  fame: { min: 0, max: 100, default: 0 },
  infamy: { min: 0, max: 100, default: 0 },
  luck: { min: 30, max: 70, default: 50 },
};

export const DEFAULT_PLAYER_ATTRIBUTES: PlayerAttributes = {
  physique: 40,
  agility: 40,
  wisdom: 40,
  willpower: 40,
  perception: 40,
  charisma: 40,
  fame: 0,
  infamy: 0,
  luck: 50,
};

// ============================================
// Faction Reputation
// ============================================

export interface FactionReputation {
  canglong: number;    // -100 ~ +100
  shuanglang: number;
  jinque: number;
  border: number;
}

export const DEFAULT_FACTION_REPUTATION: FactionReputation = {
  canglong: 0,
  shuanglang: 0,
  jinque: 0,
  border: 20, // 边境联盟初始友好
};

// ============================================
// Player Resources
// ============================================

export interface PlayerResources {
  gold: number;
  food: number;
  materials: number;
  specialItems?: Record<string, number>;
}

export const DEFAULT_PLAYER_RESOURCES: PlayerResources = {
  gold: 100,
  food: 20,
  materials: 10,
};

// ============================================
// Player Location
// ============================================

export interface PlayerLocation {
  region: string;
  city: string | null;
  faction: Faction;
  coordinates?: { x: number; y: number };
  isMoving: boolean;
  destination?: {
    region: string;
    city: string | null;
    estimatedArrival: string;
  };
}

export const DEFAULT_PLAYER_LOCATION: PlayerLocation = {
  region: 'borderlands',
  city: 'twilight_village',
  faction: 'border',
  isMoving: false,
};

// ============================================
// Player Tag
// ============================================

export type PlayerTag =
  | 'traitor'
  | 'honest'
  | 'corrupt'
  | 'loyal_friend'
  | 'backstabber'
  | 'hero'
  | 'villain'
  | 'merchant_prince'
  | 'war_hero'
  | 'peacemaker'
  | 'innovator'
  | 'shadowy';

// ============================================
// Skill Types
// ============================================

export interface BaseSkill {
  level: number;       // 1-10
  experience: number;
  unlocked: boolean;
  breakthroughReady: boolean;
}

export interface SkillSet {
  strategy: {
    intelligenceAnalysis: BaseSkill;
    politicalManipulation: BaseSkill;
  };
  combat: {
    combatTechnique: BaseSkill;
    militaryCommand: BaseSkill;
  };
  commerce: {
    trade: BaseSkill;
    industryManagement: BaseSkill;
  };
  survival: BaseSkill;
}

export const DEFAULT_SKILL_SET: SkillSet = {
  strategy: {
    intelligenceAnalysis: { level: 0, experience: 0, unlocked: false, breakthroughReady: false },
    politicalManipulation: { level: 0, experience: 0, unlocked: false, breakthroughReady: false },
  },
  combat: {
    combatTechnique: { level: 0, experience: 0, unlocked: false, breakthroughReady: false },
    militaryCommand: { level: 0, experience: 0, unlocked: false, breakthroughReady: false },
  },
  commerce: {
    trade: { level: 0, experience: 0, unlocked: false, breakthroughReady: false },
    industryManagement: { level: 0, experience: 0, unlocked: false, breakthroughReady: false },
  },
  survival: { level: 1, experience: 0, unlocked: true, breakthroughReady: false },
};

// ============================================
// Validation Helpers
// ============================================

export function isValidFaction(value: string): value is Faction {
  return ['canglong', 'shuanglang', 'jinque', 'border'].includes(value);
}

export function isValidHistoryStage(value: string): value is HistoryStage {
  return ['era_power_struggle', 'era_war_prep', 'era_chaos', 'era_resolution'].includes(value);
}

export function clampAttribute(name: string, value: number): number {
  const constraint = AttributeConstraints[name];
  if (!constraint) return value;
  return Math.max(constraint.min, Math.min(constraint.max, value));
}

export function clampReputation(value: number): number {
  return Math.max(-100, Math.min(100, value));
}