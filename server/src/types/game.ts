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
  influence: number;  // 玩家影响力
  specialItems?: Record<string, number>;
}

export const DEFAULT_PLAYER_RESOURCES: PlayerResources = {
  gold: 100,
  food: 20,
  materials: 10,
  influence: 10,  // 默认影响力
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

// ============================================
// Action Point (AP) System
// ============================================

export const MAX_ACTION_POINTS = 6;
export const MAX_STORED_AP = 3; // Can store up to +3 AP

export interface ActionPointState {
  current: number;          // Today's available AP
  stored: number;           // Stored AP from previous days (max 3)
  maxDaily: number;         // Maximum daily AP (default 6)
  bonuses: APBonus[];
}

export interface APBonus {
  source: string;           // What provides the bonus
  value: number;            // How much AP bonus
  expiresAt?: string;       // When it expires
}

// ============================================
// Action Types
// ============================================

export type ActionType =
  // 个人成长行动
  | 'practice_skill'        // 练习技能 1AP
  | 'learn_skill'           // 学习技能 2AP
  | 'meditation'            // 闭关修炼 3AP
  | 'read_books'            // 阅读典籍 1AP
  // 资源获取行动
  | 'gather_resources'      // 采集资源 2AP
  | 'hunt_monsters'         // 打怪狩猎 3AP
  | 'work_job'              // 工作赚钱 2AP
  | 'trade'                 // 交易买卖 1AP
  | 'invest'                // 投资经营 2AP
  // 社交行动
  | 'visit_npc'             // 拜访NPC 1AP
  | 'gift_npc'              // 送礼讨好 1AP + 物品
  | 'help_npc'              // 帮助NPC 1-2AP
  | 'request_help'          // 请NPC帮忙 1AP
  | 'attend_event'          // 参加聚会 2AP
  // 事件参与行动
  | 'handle_event'          // 处理事件 1-3AP
  | 'initiate_action'       // 发起行动 2-4AP
  | 'investigate'           // 调查线索 1AP
  | 'attend_meeting';       // 参加会议 2AP

export type ActionCategory = 'growth' | 'resource' | 'social' | 'event';

export interface ActionDefinition {
  type: ActionType;
  category: ActionCategory;
  apCost: number;
  name: string;
  description: string;
  requirements?: ActionRequirement[];
  rewards: ActionReward;
  risks?: ActionRisk[];
}

export interface ActionRequirement {
  type: 'level' | 'skill' | 'resource' | 'relationship' | 'location' | 'faction';
  value: number | string;
  description: string;
}

export interface ActionReward {
  resources?: Partial<PlayerResources>;
  skillExp?: Record<string, number>;
  relationship?: { npcId: string; value: number };
  attributes?: Partial<PlayerAttributes>;
  reputation?: Partial<FactionReputation>;
  narrative: string;
  possibleEvent?: string;
}

export interface ActionRisk {
  type: 'injury' | 'loss' | 'reputation' | 'event';
  probability: number;
  consequence: string;
}

// P0 基础行动定义
export const BASIC_ACTIONS: ActionDefinition[] = [
  {
    type: 'practice_skill',
    category: 'growth',
    apCost: 1,
    name: '练习技能',
    description: '投入时间提升某项技能',
    rewards: {
      skillExp: { random: 3 },
      narrative: '你专注于训练，技艺有所精进。',
    },
  },
  {
    type: 'hunt_monsters',
    category: 'resource',
    apCost: 3,
    name: '打怪狩猎',
    description: '外出狩猎怪物获取金币和经验',
    requirements: [
      { type: 'location', value: 'wild', description: '需要在野外区域' },
    ],
    rewards: {
      resources: { gold: 50 },
      skillExp: { combat: 10 },
      narrative: '战斗激烈，你击退了敌人并获得了战利品。',
    },
    risks: [
      { type: 'injury', probability: 0.1, consequence: '战斗中受了轻伤' },
    ],
  },
  {
    type: 'visit_npc',
    category: 'social',
    apCost: 1,
    name: '拜访NPC',
    description: '拜访某个NPC建立关系',
    rewards: {
      relationship: { npcId: 'target', value: 8 },
      narrative: '你拜访了对方，交流甚欢。',
    },
  },
  {
    type: 'handle_event',
    category: 'event',
    apCost: 2,
    name: '处理事件',
    description: '处理一个待决事件',
    rewards: {
      narrative: '事件已处理，后续影响将逐渐显现。',
    },
  },
  {
    type: 'work_job',
    category: 'resource',
    apCost: 2,
    name: '工作赚钱',
    description: '从事日常工作赚取金币',
    rewards: {
      resources: { gold: 40 },
      narrative: '辛苦工作一天，收获了报酬。',
    },
  },
];

// ============================================
// Action Execution Result
// ============================================

export interface ActionResult {
  success: boolean;
  action: ActionType;
  apConsumed: number;
  apRemaining: number;
  rewards: ActionReward;
  narrativeFeedback: string;
  triggeredEvents?: string[];
  timestamp: string;
}