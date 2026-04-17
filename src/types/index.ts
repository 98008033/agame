/**
 * 游戏核心类型定义
 * 与docs/data-structures.md保持一致
 */

// 阵营类型
export type Faction = 'canglong' | 'shuanglang' | 'jinque' | 'border';

export const FactionNames: Record<Faction, string> = {
  canglong: '苍龙帝国',
  shuanglang: '霜狼联邦',
  jinque: '金雀花王国',
  border: '边境联盟'
};

// 历史阶段
export type HistoryStage =
  | 'era_power_struggle'   // 权力博弈期
  | 'era_war_prep'         // 战争酝酿期
  | 'era_chaos'            // 动荡期
  | 'era_resolution';      // 决局期

// 事件类型
export type EventType =
  | 'military_conflict'    // 军事冲突
  | 'trade_war'            // 贸易战争
  | 'diplomatic_summit'    // 外交峰会
  | 'resource_crisis'      // 资源危机
  | 'political_decision'   // 政治决策
  | 'personal_event'       // 个人事件
  | 'npc_request';         // NPC请求

// 关系等级
export type RelationshipLevel =
  | 'enemy'       // -80 ~ -100：死敌
  | 'hostile'     // -50 ~ -79：敌对
  | 'distrust'    // -20 ~ -49：不信任
  | 'neutral'     // -19 ~ +20：中立
  | 'friendly'    // +21 ~ +50：友好
  | 'respect'     // +51 ~ +80：尊敬
  | 'admire';     // +81 ~ +100：崇拜

export function getRelationshipLevel(value: number): RelationshipLevel {
  if (value >= 81) return 'admire';
  if (value >= 51) return 'respect';
  if (value >= 21) return 'friendly';
  if (value >= -19) return 'neutral';
  if (value >= -49) return 'distrust';
  if (value >= -79) return 'hostile';
  return 'enemy';
}

// 十维属性结构
export interface PlayerAttributes {
  physique: number;     // 体魄 (0-100)
  agility: number;      // 敏捷 (0-100)
  wisdom: number;       // 智慧 (0-100)
  willpower: number;    // 意志 (0-100)
  perception: number;   // 感知 (0-100)
  charisma: number;     // 魅力 (0-100)
  fame: number;         // 名望 (0-100)
  infamy: number;       // 恶名 (0-100)
  luck: number;         // 幸运 (30-70)
}

// 阵营声望结构
export interface FactionReputation {
  canglong: number;     // 苍龙帝国 (-100 ~ +100)
  shuanglang: number;   // 霜狼联邦 (-100 ~ +100)
  jinque: number;       // 金雀花王国 (-100 ~ +100)
  border: number;       // 边境联盟 (-100 ~ +100)
}

// 玩家状态
export interface PlayerState {
  id: string;
  userId: string;
  name: string;
  age: number;
  faction: Faction | null;
  factionLevel: 'stranger' | 'neutral' | 'friendly' | 'loyal' | 'core' | 'legendary';
  title: string[];
  level: number;
  experience: number;
  attributes: PlayerAttributes;
  reputation: FactionReputation;
  relationships: Record<string, number>;
  tags: PlayerTag[];
  resources: PlayerResources;
  location: PlayerLocation;
  createdAt: string;
  updatedAt: string;
}

// 玩家标签
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
  | 'peacemaker';

// 玩家资源
export interface PlayerResources {
  gold: number;
  food: number;
  materials: number;
}

// 玩家位置
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

// 世界时间
export interface WorldTime {
  day: number;
  year: number;
  month: number;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  phase: 'morning' | 'afternoon' | 'evening' | 'night';
  realTimestamp: string;
}

// 世界平衡状态
export type BalanceStatus =
  | 'balanced'
  | 'biased_canglong'
  | 'biased_shuanglang'
  | 'biased_jinque'
  | 'biased_border'
  | 'critical_unbalance';

// 阵营状态
export interface FactionState {
  name: string;
  leader: string;
  military: number;
  economy: number;
  stability: number;
  influence: number;
  relations: Record<Faction, 'alliance' | 'friendly' | 'neutral' | 'tension' | 'hostile' | 'war'>;
  resources: {
    gold: number;
    food: number;
    materials: number;
    manpower: number;
  };
}

// 世界状态
export interface WorldState {
  time: WorldTime;
  historyStage: HistoryStage;
  balance: {
    powerIndex: Record<Faction, number>;
    balanceStatus: BalanceStatus;
  };
  factions: Record<Faction, FactionState>;
  activeEvents: WorldEvent[];
  cities: Record<string, CityState>;
  snapshotId: string;
  createdAt: string;
}

// 城市状态
export interface CityState {
  id: string;
  name: string;
  faction: Faction;
  population: number;
  prosperity: number;
  production: { food: number; gold: number; materials: number };
  defense: { garrison: number; fortificationLevel: number; morale: number };
  publicMood: 'content' | 'neutral' | 'restless' | 'rebellious';
}

// 世界事件
export interface WorldEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  affectedFactions: Faction[];
  impact: Record<string, number>;
  duration: number;
  startedAt: string;
}

// 游戏事件（玩家面对的事件）
export interface GameEvent {
  id: string;
  type: EventType;
  category: 'faction_invite' | 'resource_dilemma' | 'personal_conflict' | 'crisis_response' | 'daily_life';
  title: string;
  description: string;
  narrativeText: string;
  scope: 'personal' | 'local' | 'regional' | 'national';
  importance: 'minor' | 'normal' | 'major' | 'critical';
  choices: EventChoice[];
  triggerConditions: EventTriggerCondition[];
  createdAt: string;
  expiresAt: string | null;
  relatedNPCs: string[];
  relatedFactions: Faction[];
}

// 事件选项
export interface EventChoice {
  index: number;
  label: string;
  description: string;
  cost: EventCost;
  reward: EventReward;
  impact: EventImpact;
  consequenceNarrative: string;
  followUpEvents?: string[];
}

// 事件消耗
export interface EventCost {
  gold?: number;
  reputation?: Partial<Record<Faction, number>>;
  relationships?: Record<string, number>;
  attributes?: Partial<Record<string, number>>;
}

// 事件奖励
export interface EventReward {
  gold?: number;
  reputation?: Partial<Record<Faction, number>>;
  relationships?: Record<string, number>;
  titles?: string[];
  tags?: PlayerTag[];
}

// 事件影响
export interface EventImpact {
  unlocks?: {
    events?: string[];
    locations?: string[];
    factions?: Faction[];
  };
}

// 事件触发条件
export interface EventTriggerCondition {
  type: 'player_level' | 'player_reputation' | 'npc_relation' | 'world_stage' | 'time_elapsed';
  params: Record<string, number | string>;
}

// 玩家决策记录
export interface PlayerDecision {
  id: string;
  playerId: string;
  eventId: string;
  choiceIndex: number;
  choiceLabel: string;
  madeAt: string;
  consequences: EventConsequence;
}

// 事件后果
export interface EventConsequence {
  eventId: string;
  choiceIndex: number;
  timestamp: string;
  actualCost: EventCost;
  actualReward: EventReward;
  narrativeFeedback: string;
}

// NPC状态（简化版）
export interface NPCState {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  type: 'villager' | 'merchant' | 'soldier' | 'official' | 'scholar' | 'adventurer' | 'leader';
  role: 'common' | 'important' | 'key';
  faction: Faction | null;
  personality: {
    ambition: number;
    loyalty: number;
    greed: number;
    courage: number;
    kindness: number;
  };
}

// 每日新闻
export interface DailyNews {
  id: string;
  day: number;
  date: string;
  news: Record<Faction, FactionNews>;
  worldHeadline: NewsItem | null;
  playerNews: NewsItem[];
  generatedAt: string;
}

export interface FactionNews {
  headline: NewsItem;
  items: NewsItem[];
  summary: string;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  type: 'military' | 'political' | 'economic' | 'social' | 'diplomatic' | 'crisis' | 'rumor';
  importance: 'minor' | 'normal' | 'major' | 'critical';
  relatedEntities: string[];
  playerRelevance: boolean;
}