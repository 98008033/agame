# Agame 数据结构文档

> **版本**：MVP v1.0
> **用途**：定义前后端共同理解的数据契约，确保游戏状态的一致性

---

## 一、核心数据类型定义

### 1.1 阵营类型

```typescript
type Faction = 'canglong' | 'shuanglang' | 'jinque' | 'border';

const FactionNames: Record<Faction, string> = {
  'canglong': '苍龙帝国',
  'shuanglang': '霜狼联邦',
  'jinque': '金雀花王国',
  'border': '边境联盟'
};
```

### 1.2 历史阶段

```typescript
type HistoryStage =
  | 'era_power_struggle'   // 权力博弈期
  | 'era_war_prep'         // 战争酝酿期
  | 'era_chaos'            // 动荡期
  | 'era_resolution';      // 决局期
```

### 1.3 事件类型

```typescript
type EventType =
  | 'military_conflict'    // 军事冲突
  | 'trade_war'            // 贸易战争
  | 'diplomatic_summit'    // 外交峰会
  | 'resource_crisis'      // 资源危机
  | 'political_decision'   // 政治决策
  | 'personal_event'       // 个人事件
  | 'npc_request';         // NPC请求
```

### 1.4 关系等级

```typescript
type RelationshipLevel =
  | 'enemy'       // -80 ~ -100：死敌
  | 'hostile'     // -50 ~ -79：敌对
  | 'distrust'    // -20 ~ -49：不信任
  | 'neutral'     // -19 ~ +20：中立
  | 'friendly'    // +21 ~ +50：友好
  | 'respect'     // +51 ~ +80：尊敬
  | 'admire';     // +81 ~ +100：崇拜

function getRelationshipLevel(value: number): RelationshipLevel {
  if (value >= 81) return 'admire';
  if (value >= 51) return 'respect';
  if (value >= 21) return 'friendly';
  if (value >= -19) return 'neutral';
  if (value >= -49) return 'distrust';
  if (value >= -79) return 'hostile';
  return 'enemy';
}
```

---

## 二、玩家状态数据结构

### 2.1 玩家完整状态

```typescript
interface PlayerState {
  // 基础信息
  id: string;                     // 玩家唯一ID
  userId: string;                 // 外部用户ID（微信/账号系统）
  name: string;                   // 角色名称
  age: number;                    // 角色年龄（游戏年）

  // 阵营信息
  faction: Faction | null;        // 当前效忠阵营（null为未效忠）
  factionLevel: FactionLevel;     // 效忠层次
  title: string[];                // 头衔列表

  // 等级与经验
  level: number;                  // 等级 (1-100)
  experience: number;             // 当前经验值

  // 十维属性
  attributes: PlayerAttributes;

  // 阵营声望
  reputation: FactionReputation;

  // 技能系统
  skills: SkillSet;

  // NPC关系
  relationships: NPCRelationships;

  // 状态标签
  tags: PlayerTag[];

  // 资源
  resources: PlayerResources;

  // 位置信息
  location: PlayerLocation;

  // 时间戳
  createdAt: string;              // ISO 8601
  updatedAt: string;              // ISO 8601
}

type FactionLevel =
  | 'stranger'    // 疏离
  | 'neutral'     // 中立
  | 'friendly'    // 友好
  | 'loyal'       // 效忠
  | 'core'        // 核心
  | 'legendary';  // 传奇
```

### 2.2 十维属性结构

```typescript
interface PlayerAttributes {
  // 身体属性组（决定能做什么）
  physique: number;     // 体魄 (0-100)：负重、生命、体力劳动
  agility: number;      // 敏捷 (0-100)：闪避、精细操作、速度

  // 心智属性组（决定能学会什么）
  wisdom: number;       // 智慧 (0-100)：学习速度、创新、识别
  willpower: number;    // 意志 (0-100)：坚持、抵抗、专注
  perception: number;   // 感知 (0-100)：发现、直觉、情报

  // 社交属性组（决定世界如何回应你）
  charisma: number;     // 魅力 (0-100)：说服、领导、第一印象
  fame: number;         // 名望 (0-100)：正面声誉、英雄事迹
  infamy: number;       // 恶名 (0-100)：威慑、恐惧、残忍名声

  // 命运属性
  luck: number;         // 幸运 (30-70浮动)：随机事件偏向

  // 阵营声望（单独存储）
  factionReputation: FactionReputation;
}

// 属性约束
const AttributeConstraints = {
  physique: { min: 0, max: 100, default: 40 },
  agility: { min: 0, max: 100, default: 40 },
  wisdom: { min: 0, max: 100, default: 40 },
  willpower: { min: 0, max: 100, default: 40 },
  perception: { min: 0, max: 100, default: 40 },
  charisma: { min: 0, max: 100, default: 40 },
  fame: { min: 0, max: 100, default: 0 },
  infamy: { min: 0, max: 100, default: 0 },
  luck: { min: 30, max: 70, default: 50 }
};
```

### 2.3 阵营声望结构

```typescript
interface FactionReputation {
  canglong: number;     // 苍龙帝国 (-100 ~ +100)
  shuanglang: number;   // 霜狼联邦 (-100 ~ +100)
  jinque: number;       // 金雀花王国 (-100 ~ +100)
  border: number;       // 边境联盟 (-100 ~ +100)
}

// 声望状态判定
interface ReputationStatus {
  faction: Faction;
  value: number;
  level: RelationshipLevel;
  canAlly: boolean;     // 是否可以效忠
  isEnemy: boolean;     // 是否被视为敌人
}

function evaluateReputation(rep: number): ReputationStatus {
  return {
    value: rep,
    level: getRelationshipLevel(rep),
    canAlly: rep >= 20,
    isEnemy: rep <= -20
  };
}
```

---

## 三、技能数据结构

### 3.1 技能集结构

```typescript
interface SkillSet {
  // 谋略线
  strategy: StrategySkills;

  // 武力线
  combat: CombatSkills;

  // 经营线
  commerce: CommerceSkills;

  // 通用技能
  survival: SurvivalSkill;

  // 扩展技能（MVP后）
  crafting?: CraftingSkills;
  magic?: MagicSkills;
  agriculture?: AgricultureSkills;
}

// 技能等级范围：1-10级
type SkillLevel = number; // 1-10

interface BaseSkill {
  level: SkillLevel;
  experience: number;       // 技能经验（用于升级）
  unlocked: boolean;        // 是否已解锁
  breakthroughReady: boolean; // 是否可以突破等级上限
}
```

### 3.2 三条主线技能

```typescript
// 谋略线
interface StrategySkills {
  intelligenceAnalysis: IntelligenceAnalysisSkill;  // 情报分析 (1-6)
  politicalManipulation: PoliticalManipulationSkill; // 政治操控 (1-6)
  // MVP后扩展
  historicalWriting?: HistoricalWritingSkill;       // 历史书写 (7-10)
}

interface IntelligenceAnalysisSkill extends BaseSkill {
  // 等级效果
  // L1: 察言观色 - 感知他人情绪
  // L2: 流言搜集 - 获得市井传言
  // L3: 线索整合 - 发现真相
  // L4: 深度分析 - 揭示隐藏动机
  // L5: 预判趋势 - 预测事件走向
  // L6: 情报网络 - 建立情报系统
}

interface PoliticalManipulationSkill extends BaseSkill {
  // 等级效果
  // L4: 利益交换 - 谈判达成交易
  // L5: 派系建立 - 组建政治势力
  // L6: 格局改变 - 影响国家政策
}

// 武力线
interface CombatSkills {
  combatTechnique: CombatTechniqueSkill;    // 战斗技巧 (1-6)
  militaryCommand: MilitaryCommandSkill;    // 军事指挥 (1-6)
  // MVP后扩展
  warLegend?: WarLegendSkill;               // 武神传说 (7-10)
}

interface CombatTechniqueSkill extends BaseSkill {
  // 等级效果
  // L1: 基础格斗 - 自保，对付强盗
  // L2: 武器掌握 - 熟练使用一种武器
  // L3: 战术意识 - 理解战场态势
  // L4: 单挑决斗 - 与高手一对一
  // L5: 武艺精湛 - 教授徒弟
  // L6: 武术大师 - 开设武馆
}

interface MilitaryCommandSkill extends BaseSkill {
  // 等级效果
  // L4: 小队指挥 - 指挥小队作战
  // L5: 战术布局 - 策划复杂军事行动
  // L6: 战役决策 - 决定大规模会战
}

// 经营线
interface CommerceSkills {
  trade: TradeSkill;              // 商业贸易 (1-6)
  industryManagement: IndustryManagementSkill; // 产业管理 (1-6)
  // MVP后扩展
  economicDominance?: EconomicDominanceSkill;   // 经济霸主 (7-10)
}

interface TradeSkill extends BaseSkill {
  // 等级效果
  // L1: 识货估价 - 识别商品价值
  // L2: 讨价还价 - 交易中获得优势
  // L3: 市场洞察 - 预测价格波动
  // L4: 商路规划 - 组织跨区域贸易
  // L5: 商业联盟 - 建立商业网络
  // L6: 商业巨擘 - 影响区域经济
}

interface IndustryManagementSkill extends BaseSkill {
  // 等级效果
  // L4: 资源配置 - 有效配置人力物力
  // L5: 产业扩张 - 建立跨地区网络
  // L6: 经济影响 - 影响国家经济
}

// 通用技能
interface SurvivalSkill extends BaseSkill {
  // 等级效果 (1-3，所有玩家初始拥有)
  // L1: 基础生存 - 走路、吃饭、睡觉
  // L2: 野外生存 - 搭帐篷、生火、砍柴
  // L3: 应急处理 - 处理小伤、躲避危险
}
```

### 3.3 技能与属性要求映射

```typescript
interface SkillRequirement {
  skill: string;
  level: SkillLevel;
  learningRequirements: AttributeRequirements;
  usageBonus: AttributeBonusFormula;
  breakthroughRequirements: AttributeRequirements;
}

interface AttributeRequirements {
  primary?: { attribute: string; minValue: number };
  secondary?: { attribute: string; minValue: number };
  combined?: { attributes: string[]; minSum: number };
}

interface AttributeBonusFormula {
  formula: string; // 如 "perception * 0.5%" 或 "charisma * 1%"
}

// 技能要求表
const SkillRequirements: SkillRequirement[] = [
  // 谋略线
  {
    skill: 'intelligenceAnalysis',
    level: 1,
    learningRequirements: { primary: { attribute: 'perception', minValue: 20 } },
    usageBonus: { formula: 'perception * 0.5%' },
    breakthroughRequirements: { primary: { attribute: 'wisdom', minValue: 30 } }
  },
  {
    skill: 'intelligenceAnalysis',
    level: 4,
    learningRequirements: { primary: { attribute: 'perception', minValue: 40 } },
    usageBonus: { formula: 'perception * 1%' },
    breakthroughRequirements: { primary: { attribute: 'wisdom', minValue: 50 } }
  },
  {
    skill: 'politicalManipulation',
    level: 4,
    learningRequirements: { primary: { attribute: 'charisma', minValue: 25 } },
    usageBonus: { formula: 'charisma * 0.5%' },
    breakthroughRequirements: { primary: { attribute: 'wisdom', minValue: 40 } }
  },
  {
    skill: 'politicalManipulation',
    level: 6,
    learningRequirements: { primary: { attribute: 'charisma', minValue: 50 } },
    usageBonus: { formula: 'charisma * 1%' },
    breakthroughRequirements: { primary: { attribute: 'willpower', minValue: 60 } }
  },

  // 武力线
  {
    skill: 'combatTechnique',
    level: 1,
    learningRequirements: { primary: { attribute: 'physique', minValue: 20 } },
    usageBonus: { formula: 'physique * 0.5%' },
    breakthroughRequirements: { primary: { attribute: 'physique', minValue: 35 } }
  },
  {
    skill: 'combatTechnique',
    level: 4,
    learningRequirements: { primary: { attribute: 'physique', minValue: 45 } },
    usageBonus: { formula: 'physique * 1%' },
    breakthroughRequirements: { primary: { attribute: 'physique', minValue: 70 } }
  },
  {
    skill: 'militaryCommand',
    level: 4,
    learningRequirements: { primary: { attribute: 'wisdom', minValue: 20 } },
    usageBonus: { formula: 'charisma * 0.3%' },
    breakthroughRequirements: { primary: { attribute: 'wisdom', minValue: 40 } }
  },

  // 经营线
  {
    skill: 'trade',
    level: 1,
    learningRequirements: { primary: { attribute: 'perception', minValue: 15 } },
    usageBonus: { formula: 'charisma * 0.4%' },
    breakthroughRequirements: { primary: { attribute: 'wisdom', minValue: 25 } }
  },
  {
    skill: 'trade',
    level: 4,
    learningRequirements: { primary: { attribute: 'perception', minValue: 35 } },
    usageBonus: { formula: 'charisma * 0.8%' },
    breakthroughRequirements: { primary: { attribute: 'perception', minValue: 50 } }
  },
  {
    skill: 'industryManagement',
    level: 4,
    learningRequirements: { primary: { attribute: 'wisdom', minValue: 25 } },
    usageBonus: { formula: 'wisdom * 0.5%' },
    breakthroughRequirements: { primary: { attribute: 'charisma', minValue: 35 } }
  }
];
```

---

## 四、NPC状态数据结构

### 4.1 NPC完整状态

```typescript
interface NPCState {
  // 基础信息
  id: string;                     // NPC唯一ID
  name: string;                   // NPC名称
  age: number;                    // 年龄
  gender: 'male' | 'female' | 'other';

  // NPC类型
  type: NPCType;
  role: NPCRole;                  // 社会角色

  // 阵营归属
  faction: Faction | null;        // 所属阵营
  factionPosition: string;        // 阵营内职位

  // 属性（与玩家同构）
  attributes: PlayerAttributes;

  // 技能（与玩家同构）
  skills: SkillSet;

  // 性格特征
  personality: NPCPersonality;

  // 关系网络
  relationships: NPCRelationships;

  // 当前状态
  currentStatus: NPCCurrentStatus;

  // 行为模式
  behaviorPattern: NPCBehaviorPattern;

  // Agent配置（由Agent系统管理）
  agentConfig: NPCAgentConfig;

  // 时间戳
  createdAt: string;
  updatedAt: string;
}

type NPCType =
  | 'villager'      // 村民
  | 'merchant'      // 商人
  | 'soldier'       // 士兵
  | 'official'      // 官员
  | 'scholar'       // 学者
  | 'craftsman'     // 工匠
  | 'adventurer'    // 冒险者
  | 'leader';       // 题人物

type NPCRole =
  | 'common'        // 普通角色
  | 'important'     // 重要角色（事件触发者）
  | 'key';          // 关键角色（剧情推动者）
```

### 4.2 NPC性格结构

```typescript
interface NPCPersonality {
  // 核心性格维度
  ambition: number;       // 野心 (0-100)：追求权力的欲望
  loyalty: number;        // 忠诚 (0-100)：对阵营/朋友的坚持
  greed: number;          // 贪婪 (0-100)：对财富的追求
  courage: number;        // 勇气 (0-100)：面对危险的态度
  kindness: number;       // 善良 (0-100)：对弱者的态度
  cunning: number;        //狡诈 (0-100)：使用计谋的倾向

  // 价值观
  values: NPCValue[];     // 角色重视的事物

  // 行为倾向
  tendencies: {
    violence: number;     // 暴力倾向 (0-100)
    diplomacy: number;    // 外交倾向 (0-100)
    trade: number;        // 交易倾向 (0-100)
    exploration: number;  // 探索倾向 (0-100)
  };
}

type NPCValue =
  | 'power'         // 权力
  | 'wealth'        // 财富
  | 'honor'         // 荣誉
  | 'freedom'       // 自由
  | 'knowledge'     // 知识
  | 'family'        // 家庭
  | 'tradition'     // 传统
  | 'innovation';   // 创新
```

### 4.3 NPC关系网络

```typescript
interface NPCRelationships {
  // 与玩家的关系
  withPlayer: RelationshipEntry;

  // 与其他NPC的关系
  withNPCs: Record<string, RelationshipEntry>;

  // 与阵营的关系
  withFactions: FactionReputation;
}

interface RelationshipEntry {
  value: number;              // 关系值 (-100 ~ +100)
  level: RelationshipLevel;   // 关系等级
  history: RelationshipEvent[]; // 关系事件历史
  lastInteraction: string;    // 最后互动时间
  interactionCount: number;   // 互动次数
}

interface RelationshipEvent {
  timestamp: string;
  type: 'positive' | 'negative' | 'neutral';
  description: string;
  valueChange: number;        // 关系值变化
  eventContext: string;       // 触发事件ID
}
```

### 4.4 NPC当前状态

```typescript
interface NPCCurrentStatus {
  // 生命状态
  health: number;             // 健康值 (0-100)
  isAlive: boolean;           // 是否存活

  // 位置状态
  location: {
    region: string;           // 区域ID
    city: string | null;      // 城市/村庄ID
    coordinates?: { x: number; y: number };
  };

  // 行动状态
  currentAction: NPCAction | null;
  actionQueue: NPCAction[];   // 待执行行动队列

  // 心理状态
  mood: 'happy' | 'neutral' | 'angry' | 'sad' | 'fearful';
  stressLevel: number;        // 压力值 (0-100)

  // 任务状态
  activeQuest: string | null; // 当前任务ID
  questProgress: number;      // 任务进度

  // 对玩家态度
  playerOpinion: {
    overall: number;          // 整体评价 (-100 ~ +100)
    trust: number;            // 信任度
    respect: number;          // 尊敬度
    fear: number;             // 恐惧度
    desire: number;           // 期望（合作/交易等）
  };
}

interface NPCAction {
  id: string;
  type: NPCActionType;
  target: string | null;      // 目标ID（玩家/NPC/地点）
  startTime: string;
  endTime: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

type NPCActionType =
  | 'move'          // 移动
  | 'trade'         // 交易
  | 'work'          // 工作
  | 'rest'          // 休息
  | 'interact'      // 互动（与玩家/NPC）
  | 'quest'         // 执行任务
  | 'fight'         // 战斗
  | 'study'         // 学习
  | 'govern';       // 管理
```

---

## 五、世界状态快照格式

### 5.1 世界完整状态

```typescript
interface WorldState {
  // 时间信息
  time: WorldTime;

  // 历史阶段
  historyStage: HistoryStage;

  // 阵营势力平衡
  balance: WorldBalance;

  // 阵营状态
  factions: Record<Faction, FactionState>;

  // 活跃事件
  activeEvents: WorldEvent[];

  // 城市状态
  cities: Record<string, CityState>;

  // 重要NPC状态
  keyNPCs: Record<string, NPCState>;

  // 全球变量
  globalVariables: Record<string, number | string | boolean>;

  // 元数据
  snapshotId: string;
  createdAt: string;
  previousSnapshotId: string | null;
}

interface WorldTime {
  day: number;               // 游戏日（从1开始）
  year: number;              // 游戏年
  month: number;             // 游戏月 (1-12)
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  phase: 'morning' | 'afternoon' | 'evening' | 'night';
  realTimestamp: string;     // 现实时间戳
}
```

### 5.2 世界平衡结构

```typescript
interface WorldBalance {
  // 阵营势力指数 (0-100)
  powerIndex: {
    canglong: number;
    shuanglang: number;
    jinque: number;
    border: number;
  };

  // 平衡状态判定
  balanceStatus: BalanceStatus;

  // 平衡调整建议
  adjustmentNeeded: boolean;
  adjustmentRecommendation: string | null;
}

type BalanceStatus =
  | 'balanced'                 // 平衡（各阵营差异<15）
  | 'biased_canglong'          // 苍龙偏强
  | 'biased_shuanglang'        // 霜狼偏强
  | 'biased_jinque'            // 金雀花偏强
  | 'biased_border'            // 边境偏强
  | 'critical_unbalance';      // 严重失衡（某阵营>80或<20）

function evaluateBalance(power: Record<Faction, number>): BalanceStatus {
  const values = Object.values(power);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const diff = max - min;

  if (diff < 15) return 'balanced';
  if (max >= 80) return 'critical_unbalance';
  if (min <= 20) return 'critical_unbalance';

  const maxFaction = Object.entries(power).find(([, v]) => v === max)?.[0] as Faction;
  return `biased_${maxFaction}` as BalanceStatus;
}
```

### 5.3 阵营状态结构

```typescript
interface FactionState {
  // 基础信息
  name: string;               // 阵营名称
  leader: string;             // 领袖NPC ID

  // 四维实力
  military: number;           // 军事实力 (0-100)
  economy: number;            // 经济实力 (0-100)
  stability: number;          // 稳定度 (0-100)
  influence: number;          // 影响力 (0-100)

  // 对外关系
  relations: Record<Faction, RelationType>;

  // 内部状态
  internalPolitics: {
    rulingParty: string;      // 执政派系
    opposition: string[];     // 反对派系
    tensionLevel: number;     // 内部紧张度 (0-100)
  };

  // 资源储备
  resources: {
    gold: number;
    food: number;
    materials: number;
    manpower: number;
  };

  // 活跃政策
  activePolicies: Policy[];

  // 待处理事件
  pendingIssues: string[];
}

type RelationType =
  | 'alliance'     // 同盟
  | 'friendly'     // 友好
  | 'neutral'      // 中立
  | 'tension'      // 紧张
  | 'hostile'      // 敌对
  | 'war';         // 战争

interface Policy {
  id: string;
  name: string;
  type: 'military' | 'economic' | 'diplomatic' | 'cultural';
  effect: Record<string, number>;
  duration: number;           // 持续天数
  startDate: string;
}
```

### 5.4 城市状态结构

```typescript
interface CityState {
  id: string;
  name: string;
  faction: Faction;

  // 人口与经济
  population: number;
  prosperity: number;         //繁荣度 (0-100)

  // 资源产出
  production: {
    food: number;             // 每日粮食产出
    gold: number;             // 每日金币产出
    materials: number;        // 每日材料产出
  };

  // 防御状态
  defense: {
    garrison: number;         //驻军数量
    fortificationLevel: number; // 城防等级 (0-100)
    morale: number;           //士气 (0-100)
  };

  // 市民情绪
  publicMood: 'content' | 'neutral' | 'restless' | 'rebellious';

  // 建筑状态
  buildings: Building[];
}

interface Building {
  id: string;
  type: BuildingType;
  level: number;
  status: 'active' | 'damaged' | 'under_construction';
}

type BuildingType =
  | 'barracks'      // 兵营
  | 'market'        // 市场
  | 'warehouse'     // 仓库
  | 'smithy'        // 铁匠铺
  | 'academy'       // 学院
  | 'temple'        // 神殿
  | 'palace';       // 宫殿
```

---

## 六、事件数据结构

### 6.1 事件完整结构

```typescript
interface GameEvent {
  // 基础信息
  id: string;
  type: EventType;
  category: EventCategory;

  // 事件内容
  title: string;
  description: string;        // 打字机效果呈现的描述
  narrativeText: string;      // 小说风格的叙事文本

  // 触发条件
  triggerConditions: EventTriggerCondition[];

  // 选项与后果
  choices: EventChoice[];

  // 影响范围
  scope: EventScope;
  affectedEntities: AffectedEntity[];

  // 时间信息
  createdAt: string;
  expiresAt: string | null;   // 过期时间（null为永不过期）
  duration: number | null;    // 持续天数

  // 状态
  status: EventStatus;

  // 后果记录
  consequences: EventConsequence | null;
}

type EventCategory =
  | 'faction_invite'          // 效忠选择类
  | 'resource_dilemma'        // 资源抉择类
  | 'personal_conflict'       // 人际冲突类
  | 'crisis_response'         // 危机应对类
  | 'daily_life';             // 日常生活类

type EventScope =
  | 'personal'      // 个人事件
  | 'local'         // 本地事件
  | 'regional'      // 区域事件
  | 'national';     // 国家事件

type EventStatus =
  | 'pending'       // 待处理
  | 'active'        // 进行中
  | 'completed'     // 已完成
  | 'expired'       // 已过期
  | 'cancelled';    // 已取消
```

### 6.2 事件触发条件

```typescript
interface EventTriggerCondition {
  type: TriggerType;
  params: Record<string, any>;
}

type TriggerType =
  | 'player_level'            // 玩家等级条件
  | 'player_reputation'       // 玩家声望条件
  | 'player_skill'            // 玩家技能条件
  | 'player_attribute'        // 玩家属性条件
  | 'npc_relation'            // NPC关系条件
  | 'world_stage'             // 世界阶段条件
  | 'time_elapsed'            // 时间流逝条件
  | 'event_completed'         // 事件完成条件
  | 'location'                // 地点条件
  | 'faction_status';         // 阵营状态条件

// 触发条件示例
const TriggerConditionExamples = [
  {
    type: 'player_reputation',
    params: { faction: 'canglong', minValue: 20 }
  },
  {
    type: 'player_level',
    params: { minValue: 5 }
  },
  {
    type: 'npc_relation',
    params: { npcId: 'laogen', minValue: 41 }
  },
  {
    type: 'time_elapsed',
    params: { days: 7 }
  }
];
```

### 6.3 事件选项与后果

```typescript
interface EventChoice {
  index: number;              // 选项索引 (0, 1, 2...)
  label: string;              // 选项标签
  description: string;        // 选项描述

  // 执行条件（可选）
  requirements?: EventChoiceRequirement[];

  // 消耗（选择此选项的代价）
  cost: EventCost;

  // 获得（选择此选项的收益）
  reward: EventReward;

  // 影响
  impact: EventImpact;

  // 后果描述
  consequenceNarrative: string;

  // 后续事件（触发新事件）
  followUpEvents?: string[];
}

interface EventChoiceRequirement {
  type: 'attribute' | 'skill' | 'resource' | 'reputation' | 'relationship';
  target: string;
  minValue: number;
}

interface EventCost {
  gold?: number;
  influence?: number;
  reputation?: Partial<Record<Faction, number>>;
  relationships?: Record<string, number>;
  attributes?: Partial<Record<string, number>>;
  tags?: string[];             // 添加负面标签
}

interface EventReward {
  gold?: number;
  influence?: number;
  reputation?: Partial<Record<Faction, number>>;
  relationships?: Record<string, number>;
  attributes?: Partial<Record<string, number>>;
  items?: string[];
  skills?: Record<string, number>;
  titles?: string[];
  tags?: string[];             // 添加正面标签
}

interface EventImpact {
  // 解锁内容
  unlocks?: {
    events?: string[];
    skills?: string[];
    locations?: string[];
    factions?: Faction[];
  };

  // 状态变化
  statusChanges?: {
    faction?: { level: FactionLevel };
    npcOpinions?: Record<string, number>;
  };

  // 后果标签
  consequenceTags?: string[];
}

interface EventConsequence {
  eventId: string;
  choiceIndex: number;
  timestamp: string;

  // 实际发生的后果
  actualCost: EventCost;
  actualReward: EventReward;
  actualImpact: EventImpact;

  //叙事反馈
  narrativeFeedback: string;

  // 触发的后续事件
  triggeredEvents: string[];
}
```

---

## 七、决策数据结构

### 7.1 玩家决策记录

```typescript
interface PlayerDecision {
  id: string;
  playerId: string;
  eventId: string;

  // 决策内容
  choiceIndex: number;
  choiceLabel: string;

  // 决策时间
  madeAt: string;

  // 后果记录
  consequences: EventConsequence;

  // 决策上下文（当时的玩家状态）
  context: {
    playerLevel: number;
    playerAttributes: PlayerAttributes;
    playerReputation: FactionReputation;
    worldDay: number;
    worldStage: HistoryStage;
  };

  // 是否可撤销
  irreversible: boolean;
}

// 决策历史查询
interface DecisionHistoryQuery {
  playerId: string;
  startDate?: string;
  endDate?: string;
  eventType?: EventType;
  faction?: Faction;
  limit?: number;
  offset?: number;
}
```

---

## 八、状态标签系统

### 8.1 玩家标签结构

```typescript
type PlayerTag =
  | 'traitor'              //叛徒：阵营声望获取-50%，部分NPC拒绝合作
  | 'honest'               // 正直：正直NPC好感+10%，贿赂成功率-20%
  | 'corrupt'              // 腐败：可被官员要挟，金币获取+10%
  | 'loyal_friend'         // 重情重义：亲密NPC请求时好感加成+50%
  | 'backstabber'          // 背信弃义：所有阵营声望获取-30%
  | 'hero'                 // 英雄：名望+30%，被推举概率提升
  | 'villain'              //恶棍：恶名+30%，黑市交易优惠
  | 'merchant_prince'      // 商业巨子：交易价格优惠20%
  | 'war_hero'             // 战争英雄：军事声望+50%
  | 'peacemaker'           // 和事佬：调解成功率+30%
  | 'innovator'            // 创新者：创新成功率+20%
  | 'shadowy';             // 阴影中：情报获取+30%，被发现概率-20%

interface TagEffect {
  tag: PlayerTag;
  effects: {
    reputationModifier?: Partial<Record<Faction, number>>;
    attributeModifier?: Partial<Record<string, number>>;
    skillModifier?: Partial<Record<string, number>>;
    eventUnlock?: string[];
    eventLock?: string[];
    npcBehavior?: Record<string, string>;
  };
}

const TagEffects: Record<PlayerTag, TagEffect> = {
  'traitor': {
    tag: 'traitor',
    effects: {
      reputationModifier: { canglong: -0.5, shuanglang: -0.5, jinque: -0.5, border: -0.5 },
      npcBehavior: { 'laogen': 'refuse_trade', 'tiebi': 'hostile' }
    }
  },
  'honest': {
    tag: 'honest',
    effects: {
      reputationModifier: { canglong: 0.1 },
      npcBehavior: { 'laogen': 'bonus_trade' }
    }
  },
  // ... 其他标签效果
};
```

---

## 九、晨报数据结构

### 9.1 晨报完整结构

```typescript
interface DailyNews {
  id: string;
  day: number;
  date: string;

  // 四阵营新闻
  news: Record<Faction, FactionNews>;

  // 世界头条
  worldHeadline: NewsItem | null;

  // 个人相关新闻
  playerNews: NewsItem[];

  // 生成元数据
  generatedAt: string;
  generatedBy: string;       // Agent ID
}

interface FactionNews {
  faction: Faction;
  headline: NewsItem;
  items: NewsItem[];
  summary: string;           // 一句话总结
}

interface NewsItem {
  id: string;
  title: string;
  content: string;           // 小说风格内容
  type: NewsType;
  importance: 'minor' | 'normal' | 'major' | 'critical';
  relatedEntities: string[]; // 相关NPC/城市/事件ID
  playerRelevance: boolean;  // 是否与玩家相关
}

type NewsType =
  | 'military'      //军事新闻
  | 'political'     // 政治新闻
  | 'economic'      // 经济新闻
  | 'social'        // 社会新闻
  | 'diplomatic'    // 外交新闻
  | 'crisis'        // 危机新闻
  | 'rumor';        // 传闻
```

---

## 十、玩家资源与位置

### 10.1 资源结构

```typescript
interface PlayerResources {
  // 基础资源
  gold: number;              // 金币
  food: number;              // 粮食
  materials: number;         // 材料

  // 特殊资源（MVP后）
  specialItems?: Record<string, number>;

  // 领地产出（如果有）
  territoryIncome?: TerritoryIncome;
}

interface TerritoryIncome {
  territoryId: string;
  dailyGold: number;
  dailyFood: number;
  dailyMaterials: number;
  lastCollected: string;
}
```

### 10.2 位置结构

```typescript
interface PlayerLocation {
  region: string;            // 区域ID
  city: string | null;       // 城市/村庄ID
  faction: Faction;          // 所属阵营区域

  // 坐标（可选，用于地图系统）
  coordinates?: {
    x: number;
    y: number;
  };

  // 移动状态
  isMoving: boolean;
  destination?: {
    region: string;
    city: string | null;
    estimatedArrival: string;
  };
}
```

---

## 十一、JSON Schema 定义（用于验证）

### 11.1 玩家状态 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "PlayerState",
  "type": "object",
  "required": ["id", "userId", "name", "age", "level", "attributes", "reputation", "skills", "relationships"],
  "properties": {
    "id": { "type": "string", "pattern": "^player_[a-z0-9]{8}$" },
    "userId": { "type": "string" },
    "name": { "type": "string", "minLength": 1, "maxLength": 50 },
    "age": { "type": "integer", "minimum": 15, "maximum": 80 },
    "faction": {
      "type": "string",
      "enum": ["canglong", "shuanglang", "jinque", "border", null]
    },
    "level": { "type": "integer", "minimum": 1, "maximum": 100 },
    "attributes": {
      "$ref": "#/definitions/PlayerAttributes"
    },
    "reputation": {
      "$ref": "#/definitions/FactionReputation"
    },
    "skills": {
      "$ref": "#/definitions/SkillSet"
    },
    "relationships": {
      "type": "object",
      "additionalProperties": {
        "type": "integer",
        "minimum": -100,
        "maximum": 100
      }
    },
    "tags": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["traitor", "honest", "corrupt", "loyal_friend", "backstabber", "hero", "villain"]
      }
    }
  },
  "definitions": {
    "PlayerAttributes": {
      "type": "object",
      "required": ["physique", "agility", "wisdom", "willpower", "perception", "charisma", "fame", "infamy", "luck"],
      "properties": {
        "physique": { "type": "integer", "minimum": 0, "maximum": 100 },
        "agility": { "type": "integer", "minimum": 0, "maximum": 100 },
        "wisdom": { "type": "integer", "minimum": 0, "maximum": 100 },
        "willpower": { "type": "integer", "minimum": 0, "maximum": 100 },
        "perception": { "type": "integer", "minimum": 0, "maximum": 100 },
        "charisma": { "type": "integer", "minimum": 0, "maximum": 100 },
        "fame": { "type": "integer", "minimum": 0, "maximum": 100 },
        "infamy": { "type": "integer", "minimum": 0, "maximum": 100 },
        "luck": { "type": "integer", "minimum": 30, "maximum": 70 }
      }
    },
    "FactionReputation": {
      "type": "object",
      "required": ["canglong", "shuanglang", "jinque", "border"],
      "properties": {
        "canglong": { "type": "integer", "minimum": -100, "maximum": 100 },
        "shuanglang": { "type": "integer", "minimum": -100, "maximum": 100 },
        "jinque": { "type": "integer", "minimum": -100, "maximum": 100 },
        "border": { "type": "integer", "minimum": -100, "maximum": 100 }
      }
    },
    "SkillSet": {
      "type": "object",
      "properties": {
        "strategy": { "$ref": "#/definitions/StrategySkills" },
        "combat": { "$ref": "#/definitions/CombatSkills" },
        "commerce": { "$ref": "#/definitions/CommerceSkills" },
        "survival": { "$ref": "#/definitions/SurvivalSkill" }
      }
    },
    "StrategySkills": {
      "type": "object",
      "properties": {
        "intelligenceAnalysis": {
          "type": "object",
          "properties": {
            "level": { "type": "integer", "minimum": 0, "maximum": 6 },
            "unlocked": { "type": "boolean" }
          }
        },
        "politicalManipulation": {
          "type": "object",
          "properties": {
            "level": { "type": "integer", "minimum": 0, "maximum": 6 },
            "unlocked": { "type": "boolean" }
          }
        }
      }
    },
    "CombatSkills": {
      "type": "object",
      "properties": {
        "combatTechnique": {
          "type": "object",
          "properties": {
            "level": { "type": "integer", "minimum": 0, "maximum": 6 },
            "unlocked": { "type": "boolean" }
          }
        },
        "militaryCommand": {
          "type": "object",
          "properties": {
            "level": { "type": "integer", "minimum": 0, "maximum": 6 },
            "unlocked": { "type": "boolean" }
          }
        }
      }
    },
    "CommerceSkills": {
      "type": "object",
      "properties": {
        "trade": {
          "type": "object",
          "properties": {
            "level": { "type": "integer", "minimum": 0, "maximum": 6 },
            "unlocked": { "type": "boolean" }
          }
        },
        "industryManagement": {
          "type": "object",
          "properties": {
            "level": { "type": "integer", "minimum": 0, "maximum": 6 },
            "unlocked": { "type": "boolean" }
          }
        }
      }
    },
    "SurvivalSkill": {
      "type": "object",
      "properties": {
        "level": { "type": "integer", "minimum": 1, "maximum": 3, "default": 1 },
        "unlocked": { "type": "boolean", "default": true }
      }
    }
  }
}
```

---

## 十二、数据库映射

### 12.1 PostgreSQL 表映射

```sql
-- 玩家主表
CREATE TABLE players (
    id VARCHAR(16) PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    age INTEGER DEFAULT 18,
    faction VARCHAR(20),
    faction_level VARCHAR(20) DEFAULT 'neutral',
    level INTEGER DEFAULT 1,
    experience INTEGER DEFAULT 0,
    attributes JSONB NOT NULL,
    reputation JSONB NOT NULL,
    skills JSONB NOT NULL,
    relationships JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    resources JSONB DEFAULT '{}',
    location JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_players_user_id ON players(user_id);
CREATE INDEX idx_players_faction ON players(faction);
CREATE INDEX idx_players_level ON players(level);

-- 世界状态表
CREATE TABLE world_state (
    id SERIAL PRIMARY KEY,
    day INTEGER NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    season VARCHAR(10) NOT NULL,
    history_stage VARCHAR(30) NOT NULL,
    balance JSONB NOT NULL,
    factions JSONB NOT NULL,
    cities JSONB NOT NULL,
    active_events JSONB DEFAULT '[]',
    global_variables JSONB DEFAULT '{}',
    snapshot_id VARCHAR(32) UNIQUE,
    previous_snapshot_id VARCHAR(32),
    created_at TIMESTAMP DEFAULT NOW()
);

-- NPC状态表
CREATE TABLE npcs (
    id VARCHAR(16) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    age INTEGER NOT NULL,
    gender VARCHAR(10) NOT NULL,
    type VARCHAR(20) NOT NULL,
    role VARCHAR(20) DEFAULT 'common',
    faction VARCHAR(20),
    faction_position VARCHAR(50),
    attributes JSONB NOT NULL,
    skills JSONB NOT NULL,
    personality JSONB NOT NULL,
    relationships JSONB DEFAULT '{}',
    current_status JSONB NOT NULL,
    behavior_pattern JSONB,
    agent_config JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 事件表
CREATE TABLE events (
    id VARCHAR(32) PRIMARY KEY,
    player_id VARCHAR(16) REFERENCES players(id),
    type VARCHAR(30) NOT NULL,
    category VARCHAR(30) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    narrative_text TEXT,
    choices JSONB NOT NULL,
    trigger_conditions JSONB,
    scope VARCHAR(20) NOT NULL,
    affected_entities JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'pending',
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 决策历史表
CREATE TABLE decisions (
    id SERIAL PRIMARY KEY,
    player_id VARCHAR(16) REFERENCES players(id),
    event_id VARCHAR(32) REFERENCES events(id),
    choice_index INTEGER NOT NULL,
    choice_label VARCHAR(100) NOT NULL,
    consequences JSONB NOT NULL,
    context JSONB NOT NULL,
    irreversible BOOLEAN DEFAULT false,
    made_at TIMESTAMP DEFAULT NOW()
);

-- 晨报缓存表
CREATE TABLE daily_news (
    id SERIAL PRIMARY KEY,
    day INTEGER NOT NULL UNIQUE,
    date DATE NOT NULL,
    news JSONB NOT NULL,
    world_headline JSONB,
    player_news JSONB DEFAULT '[]',
    generated_at TIMESTAMP DEFAULT NOW(),
    generated_by VARCHAR(20)
);
```

---

## 十三、API 数据传输格式

### 13.1 API响应统一格式

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  metadata: {
    timestamp: string;
    version: string;
    requestId: string;
  };
}

interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// 端点响应示例
interface GetPlayerStatusResponse extends ApiResponse<PlayerState> {}
interface GetPlayerEventsResponse extends ApiResponse<GameEvent[]> {}
interface SubmitDecisionResponse extends ApiResponse<EventConsequence> {}
interface GetDailyNewsResponse extends ApiResponse<DailyNews> {}
```

---

*文档版本：MVP v1.0*
*创建日期：2026-04-16*
*适用于：Agame MVP阶段前后端数据契约*