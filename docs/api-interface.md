# Agame API 接口设计文档

> **版本**：MVP v1.0
> **用途**：定义前后端通信的完整接口规范，确保数据传输的一致性和安全性

---

## 一、API 总览

### 1.1 基础配置

```
Base URL: https://api.agame.com/v1
Content-Type: application/json
Accept: application/json
Authorization: Bearer {token}
```

### 1.2 接口分类

| 分类 | 端点数量 | 说明 |
|------|----------|------|
| 世界信息 | 3 | 晨报、世界状态、阵营信息 |
| 玩家信息 | 4 | 状态、事件、历史、资源 |
| 决策交互 | 2 | 提交决策、获取后果 |
| NPC交互 | 3 | NPC信息、关系、对话 |
| 阵营交互 | 2 | 效忠、声望查询 |
| 系统 | 3 | 登录、心跳、版本 |

---

## 二、统一响应格式

### 2.1 标准响应结构

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  metadata: {
    timestamp: string;          // ISO 8601
    version: string;            // API版本
    requestId: string;          // 请求唯一ID
    serverTime: number;         // 服务器时间戳(ms)
  };
}

interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, any>;
  retryable: boolean;           // 是否可重试
}

type ErrorCode =
  | 'INVALID_REQUEST'           // 请求参数无效
  | 'UNAUTHORIZED'              // 未授权
  | 'FORBIDDEN'                 // 禁止访问
  | 'NOT_FOUND'                 // 资源不存在
  | 'INTERNAL_ERROR'            // 内部错误
  | 'RATE_LIMITED'              // 请求频率限制
  | 'SERVICE_UNAVAILABLE'       // 服务不可用
  | 'INVALID_STATE'             // 游戏状态无效
  | 'EVENT_EXPIRED'             // 事件已过期
  | 'INSUFFICIENT_RESOURCES';   // 资源不足
```

### 2.2 成功响应示例

```json
{
  "success": true,
  "data": {
    "id": "player_abc123",
    "name": "张三",
    "level": 15
  },
  "error": null,
  "metadata": {
    "timestamp": "2026-04-16T08:30:00Z",
    "version": "v1.0.0",
    "requestId": "req_xyz789",
    "serverTime": 1713256200000
  }
}
```

### 2.3 错误响应示例

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "EVENT_EXPIRED",
    "message": "事件已过期，无法处理",
    "details": {
      "eventId": "event_123",
      "expiredAt": "2026-04-15T23:59:59Z"
    },
    "retryable": false
  },
  "metadata": {
    "timestamp": "2026-04-16T08:30:00Z",
    "version": "v1.0.0",
    "requestId": "req_xyz789",
    "serverTime": 1713256200000
  }
}
```

---

## 三、世界信息接口

### 3.1 获取今日晨报

**端点**: `GET /world/news`

**描述**: 获取当日世界晨报，包含四阵营新闻和世界头条

**请求参数**:
```
无（自动根据当前游戏日返回）
```

**响应数据**:
```typescript
interface DailyNewsResponse {
  day: number;                  // 游戏日
  date: string;                 // 游戏日期

  news: {
    canglong: FactionNews;
    shuanglang: FactionNews;
    jinque: FactionNews;
    border: FactionNews;
  };

  worldHeadline: NewsItem | null;

  playerNews: NewsItem[];       // 与玩家相关的新闻

  generatedAt: string;
}

interface FactionNews {
  faction: Faction;
  headline: NewsItem;
  items: NewsItem[];            // 最多5条新闻
  summary: string;              // 一句话总结
}

interface NewsItem {
  id: string;
  title: string;
  content: string;              // 小说风格内容
  type: NewsType;
  importance: 'minor' | 'normal' | 'major' | 'critical';
  relatedEntities: string[];
  playerRelevance: boolean;
}
```

**示例响应**:
```json
{
  "success": true,
  "data": {
    "day": 45,
    "date": "2026-04-16",
    "news": {
      "canglong": {
        "faction": "canglong",
        "headline": {
          "id": "news_cl_001",
          "title": "天枢皇子巡视北境",
          "content": "天枢皇子近日抵达北境要塞，亲自视察边境防务...",
          "type": "political",
          "importance": "major",
          "relatedEntities": ["tianshu", "north_fortress"],
          "playerRelevance": false
        },
        "items": [...],
        "summary": "帝国北境军事布局加强"
      },
      "shuanglang": {...},
      "jinque": {...},
      "border": {...}
    },
    "worldHeadline": null,
    "playerNews": [],
    "generatedAt": "2026-04-16T04:00:00Z"
  },
  "error": null,
  "metadata": {...}
}
```

---

### 3.2 获取世界状态

**端点**: `GET /world/state`

**描述**: 获取当前世界完整状态快照

**请求参数**:
```
Query Parameters:
  - compact: boolean (可选) - 是否返回压缩版本（不含NPC详情）
```

**响应数据**:
```typescript
interface WorldStateResponse {
  time: {
    day: number;
    year: number;
    month: number;
    season: string;
    phase: string;
  };

  historyStage: HistoryStage;

  balance: {
    powerIndex: Record<Faction, number>;
    balanceStatus: BalanceStatus;
    adjustmentNeeded: boolean;
  };

  factions: Record<Faction, FactionSummary>;

  activeEvents: WorldEventSummary[];

  cities: CitySummary[];
}

interface FactionSummary {
  name: string;
  leader: string;
  military: number;
  economy: number;
  stability: number;
  influence: number;
  relations: Record<Faction, string>;
}

interface WorldEventSummary {
  id: string;
  type: string;
  title: string;
  affectedFactions: Faction[];
  duration: number;
}

interface CitySummary {
  id: string;
  name: string;
  faction: Faction;
  population: number;
  prosperity: number;
}
```

---

### 3.3 获取阵营详细信息

**端点**: `GET /world/factions/{faction}`

**描述**: 获取指定阵营的详细信息

**路径参数**:
```
faction: 'canglong' | 'shuanglang' | 'jinque' | 'border'
```

**响应数据**:
```typescript
interface FactionDetailResponse {
  faction: Faction;

  // 基本信息
  name: string;
  description: string;
  leader: NPCSummary;

  // 四维实力
  stats: {
    military: number;
    economy: number;
    stability: number;
    influence: number;
  };

  // 对外关系
  relations: Record<Faction, {
    type: RelationType;
    value: number;
    description: string;
  }>;

  // 内部结构
  internalPolitics: {
    rulingParty: string;
    opposition: string[];
    tensionLevel: number;
    keyFigures: NPCSummary[];
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

  // 待处理事项
  pendingIssues: string[];
}

interface NPCSummary {
  id: string;
  name: string;
  role: string;
  faction: Faction;
}

interface Policy {
  id: string;
  name: string;
  type: string;
  description: string;
  effect: string;
  duration: number;
}
```

---

## 四、玩家信息接口

### 4.1 获取玩家完整状态

**端点**: `GET /player/status`

**描述**: 获取玩家当前完整状态

**请求头**:
```
Authorization: Bearer {player_token}
```

**响应数据**:
```typescript
interface PlayerStatusResponse {
  // 基础信息
  id: string;
  name: string;
  age: number;

  // 阵营信息
  faction: Faction | null;
  factionLevel: FactionLevel | null;
  titles: string[];

  // 等级
  level: number;
  experience: number;
  nextLevelExperience: number;

  // 十维属性
  attributes: {
    physique: number;
    agility: number;
    wisdom: number;
    willpower: number;
    perception: number;
    charisma: number;
    fame: number;
    infamy: number;
    luck: number;
  };

  // 阵营声望
  reputation: {
    canglong: { value: number; level: RelationshipLevel };
    shuanglang: { value: number; level: RelationshipLevel };
    jinque: { value: number; level: RelationshipLevel };
    border: { value: number; level: RelationshipLevel };
  };

  // 技能摘要
  skills: SkillSummary[];

  // 资源
  resources: {
    gold: number;
    food: number;
    materials: number;
  };

  // 位置
  location: {
    region: string;
    city: string | null;
    faction: Faction;
  };

  // 标签
  tags: string[];

  // 待处理事件数
  pendingEventsCount: number;
}

interface SkillSummary {
  name: string;
  category: 'strategy' | 'combat' | 'commerce' | 'survival';
  level: number;
  unlocked: boolean;
  canBreakthrough: boolean;
}
```

---

### 4.2 获取玩家待处理事件

**端点**: `GET /player/events`

**描述**: 获取玩家当前待处理的事件列表

**请求参数**:
```
Query Parameters:
  - status: 'pending' | 'all' (默认 'pending')
  - limit: number (默认 10, 最大 50)
  - offset: number (默认 0)
  - category: EventCategory (可选, 筛选特定类型)
```

**响应数据**:
```typescript
interface PlayerEventsResponse {
  total: number;
  pending: number;
  events: EventSummary[];

  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

interface EventSummary {
  id: string;
  type: EventType;
  category: EventCategory;
  title: string;
  description: string;
  scope: EventScope;

  // 选项预览（不含后果详情）
  choicesPreview: {
    index: number;
    label: string;
    description: string;
  }[];

  // 时间信息
  createdAt: string;
  expiresAt: string | null;
  remainingTime: number | null; // 剩余秒数

  // 相关实体
  relatedNPCs: string[];
  relatedFactions: Faction[];

  // 重要性
  importance: 'minor' | 'normal' | 'major' | 'critical';

  // 是否为主动触发（玩家行为导致）
  playerTriggered: boolean;
}
```

**示例响应**:
```json
{
  "success": true,
  "data": {
    "total": 3,
    "pending": 3,
    "events": [
      {
        "id": "event_001",
        "type": "faction_invite",
        "category": "faction_invite",
        "title": "苍龙使节的邀请",
        "description": "天都城来的使节龙使来到暮光村...",
        "scope": "personal",
        "choicesPreview": [
          {"index": 0, "label": "接受邀请，效忠苍龙", "description": "成为苍龙阵营成员"},
          {"index": 1, "label": "婉言谢绝", "description": "保持中立"},
          {"index": 2, "label": "拖延不决", "description": "3日后必须做出决定"}
        ],
        "createdAt": "2026-04-16T08:00:00Z",
        "expiresAt": null,
        "remainingTime": null,
        "relatedNPCs": ["longshi"],
        "relatedFactions": ["canglong"],
        "importance": "major",
        "playerTriggered": false
      }
    ],
    "pagination": {
      "limit": 10,
      "offset": 0,
      "hasMore": false
    }
  },
  "error": null,
  "metadata": {...}
}
```

---

### 4.3 获取事件详情

**端点**: `GET /player/events/{eventId}`

**描述**: 获取单个事件的完整详情，包括所有选项和后果预览

**路径参数**:
```
eventId: string
```

**响应数据**:
```typescript
interface EventDetailResponse {
  event: {
    id: string;
    type: EventType;
    category: EventCategory;
    title: string;
    description: string;
    narrativeText: string;      // 小说风格完整文本

    scope: EventScope;
    importance: string;

    choices: EventChoiceDetail[];

    triggerConditions?: EventTriggerCondition[];

    createdAt: string;
    expiresAt: string | null;
    remainingTime: number | null;

    relatedNPCs: NPCSummary[];
    relatedFactions: FactionSummary[];

    // 事件上下文（为什么触发）
    context: {
      reason: string;
      relatedHistory: string[];
    };
  };
}

interface EventChoiceDetail {
  index: number;
  label: string;
  description: string;

  // 执行条件（玩家是否满足）
  requirements?: {
    type: string;
    target: string;
    minValue: number;
    satisfied: boolean;         // 玩家当前是否满足
    shortfall?: number;         // 差距值
  }[];

  // 消耗预览
  costPreview: {
    gold?: number;
    influence?: number;
    reputation?: Partial<Record<Faction, number>>;
    relationships?: Record<string, number>;
    description: string;        // 消耗描述文本
  };

  // 获得预览
  rewardPreview: {
    gold?: number;
    influence?: number;
    reputation?: Partial<Record<Faction, number>>;
    relationships?: Record<string, number>;
    items?: string[];
    skills?: Record<string, number>;
    titles?: string[];
    tags?: string[];
    description: string;        // 获得描述文本
  };

  // 影响预览
  impactPreview: {
    unlocks?: string[];
    consequences?: string[];
    description: string;
  };

  // 预估后果（隐藏部分信息）
  estimatedConsequence: {
    shortTerm: string;
    longTerm: string;
    risks: string[];
  };

  // 后续事件提示
  followUpHint?: string;

  // 是否可选择
  canChoose: boolean;
  cannotChooseReason?: string;
}
```

---

### 4.4 获取决策历史

**端点**: `GET /player/history`

**描述**: 获取玩家过去的决策历史记录

**请求参数**:
```
Query Parameters:
  - startDate: string (ISO 8601, 可选)
  - endDate: string (ISO 8601, 可选)
  - eventType: EventType (可选)
  - faction: Faction (可选)
  - limit: number (默认 20, 最大 100)
  - offset: number (默认 0)
```

**响应数据**:
```typescript
interface DecisionHistoryResponse {
  total: number;
  decisions: DecisionRecord[];

  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };

  // 统计信息
  statistics: {
    totalDecisions: number;
    byCategory: Record<EventCategory, number>;
    byFaction: Record<Faction | 'none', number>;
    avgReputationChange: Record<Faction, number>;
  };
}

interface DecisionRecord {
  id: string;
  eventId: string;
  eventTitle: string;
  eventType: EventType;
  eventCategory: EventCategory;

  choiceIndex: number;
  choiceLabel: string;

  madeAt: string;
  gameDay: number;

  // 后果摘要
  consequences: {
    reputationChanges: Partial<Record<Faction, number>>;
    attributeChanges: Partial<Record<string, number>>;
    newTags: string[];
    triggeredEvents: string[];
    narrativeFeedback: string;
  };

  // 当时状态摘要
  context: {
    level: number;
    faction: Faction | null;
    worldStage: HistoryStage;
  };

  // 是否可撤销
  irreversible: boolean;
}
```

---

### 4.5 获取玩家资源详情

**端点**: `GET /player/resources`

**描述**: 获取玩家资源的详细信息，包括领地产出

**响应数据**:
```typescript
interface PlayerResourcesResponse {
  // 当前持有
  current: {
    gold: number;
    food: number;
    materials: number;
    specialItems: Record<string, number>;
  };

  // 领地产出（如果有领地）
  territoryIncome?: {
    territoryId: string;
    territoryName: string;
    daily: {
      gold: number;
      food: number;
      materials: number;
    };
    lastCollected: string;
    uncollected: {
      gold: number;
      food: number;
      materials: number;
    };
  };

  // 资源变化历史（最近7天）
  recentChanges: {
    date: string;
    goldChange: number;
    foodChange: number;
    materialsChange: number;
    reason: string;
  }[];
}
```

---

## 五、决策交互接口

### 5.1 提交决策

**端点**: `POST /player/decision`

**描述**: 玩家对事件做出决策选择

**请求体**:
```typescript
interface SubmitDecisionRequest {
  eventId: string;              // 事件ID
  choiceIndex: number;          // 选择的选项索引 (0, 1, 2...)

  // 可选：确认信息（防止误操作）
  confirmation?: {
    understoodRisks: boolean;   // 确认已了解风险
    acceptCosts: boolean;       // 确认接受消耗
  };
}
```

**请求示例**:
```json
{
  "eventId": "event_001",
  "choiceIndex": 0,
  "confirmation": {
    "understoodRisks": true,
    "acceptCosts": true
  }
}
```

**响应数据**:
```typescript
interface SubmitDecisionResponse {
  success: boolean;

  // 决策结果
  decision: {
    id: string;
    eventId: string;
    choiceIndex: number;
    madeAt: string;
  };

  // 即时后果
  immediateConsequences: {
    // 状态变化
    changes: {
      gold?: { before: number; after: number; change: number };
      influence?: { before: number; after: number; change: number };
      reputation?: Record<Faction, { before: number; after: number; change: number }>;
      attributes?: Record<string, { before: number; after: number; change: number }>;
      relationships?: Record<string, { before: number; after: number; change: number }>;
    };

    // 新获得
    acquired: {
      items?: string[];
      titles?: string[];
      tags?: string[];
      skills?: Record<string, number>;
    };

    // 新解锁
    unlocked: {
      events?: string[];
      skills?: string[];
      locations?: string[];
    };
  };

  //叙事反馈
  narrativeFeedback: string;

  // 触发的新事件
  triggeredEvents: {
    id: string;
    title: string;
    category: EventCategory;
    willTriggerAt: string;      // 预计触发时间
  }[];

  // 后续提示
  nextSteps?: {
    hint: string;
    recommendedAction: string;
  };

  // 如果失败
  failureReason?: string;
}
```

**示例响应**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "decision": {
      "id": "decision_001",
      "eventId": "event_001",
      "choiceIndex": 0,
      "madeAt": "2026-04-16T08:35:00Z"
    },
    "immediateConsequences": {
      "changes": {
        "gold": {"before": 50, "after": 150, "change": 100},
        "reputation": {
          "canglong": {"before": 20, "after": 50, "change": 30},
          "shuanglang": {"before": 10, "after": 0, "change": -10}
        }
      },
      "acquired": {
        "items": ["canglong_badge"],
        "tags": []
      },
      "unlocked": {
        "events": ["canglong_mission_001"]
      }
    },
    "narrativeFeedback": "你郑重接过纹章，使节满意地点头。从今以后，你的命运与苍龙帝国相连。",
    "triggeredEvents": [
      {
        "id": "event_002",
        "title": "首辅秋实的考验",
        "category": "faction_invite",
        "willTriggerAt": "2026-04-17T08:00:00Z"
      }
    ],
    "nextSteps": {
      "hint": "你现在可以参与苍龙帝国的阵营事件",
      "recommendedAction": "前往帝都，拜访首辅秋实"
    }
  },
  "error": null,
  "metadata": {...}
}
```

**错误场景**:
```json
// 事件已过期
{
  "success": false,
  "data": null,
  "error": {
    "code": "EVENT_EXPIRED",
    "message": "事件已过期",
    "details": {"eventId": "event_001", "expiredAt": "2026-04-15T23:59:59Z"},
    "retryable": false
  },
  "metadata": {...}
}

// 资源不足
{
  "success": false,
  "data": null,
  "error": {
    "code": "INSUFFICIENT_RESOURCES",
    "message": "金币不足",
    "details": {"required": 200, "current": 50},
    "retryable": false
  },
  "metadata": {...}
}

// 不满足选择条件
{
  "success": false,
  "data": null,
  "error": {
    "code": "INVALID_STATE",
    "message": "不满足选择条件",
    "details": {
      "requirement": {"type": "skill", "target": "combatTechnique", "minValue": 4},
      "current": {"skill": "combatTechnique", "level": 2}
    },
    "retryable": false
  },
  "metadata": {...}
}
```

---

### 5.2 获取决策后果详情

**端点**: `GET /player/decisions/{decisionId}/consequences`

**描述**: 获取已做出决策的完整后果详情

**路径参数**:
```
decisionId: string
```

**响应数据**:
```typescript
interface DecisionConsequenceResponse {
  decision: {
    id: string;
    eventId: string;
    eventTitle: string;
    choiceIndex: number;
    choiceLabel: string;
    madeAt: string;
    gameDay: number;
  };

  // 完整后果
  consequences: {
    actualCost: {
      gold?: number;
      influence?: number;
      reputation?: Partial<Record<Faction, number>>;
      relationships?: Record<string, number>;
      description: string;
    };

    actualReward: {
      gold?: number;
      influence?: number;
      reputation?: Partial<Record<Faction, number>>;
      relationships?: Record<string, number>;
      items?: string[];
      skills?: Record<string, number>;
      titles?: string[];
      tags?: string[];
      description: string;
    };

    actualImpact: {
      unlocks?: string[];
      consequences?: string[];
      triggeredEvents?: string[];
      description: string;
    };

    narrativeFeedback: string;
  };

  // 长期影响（已显现的）
  longTermEffects: {
    description: string;
    manifestedChanges: string[];
    pendingChanges: string[];
  };

  // 相关后续事件
  followUpEvents: {
    triggered: DecisionRecord[];
    pending: EventSummary[];
  };
}
```

---

## 六、NPC交互接口

### 6.1 获取NPC信息

**端点**: `GET /npcs/{npcId}`

**描述**: 获取指定NPC的详细信息

**路径参数**:
```
npcId: string
```

**响应数据**:
```typescript
interface NPCInfoResponse {
  npc: {
    id: string;
    name: string;
    age: number;
    gender: string;

    type: NPCType;
    role: NPCRole;

    faction: Faction | null;
    factionPosition: string | null;

    // 公开属性（玩家可见）
    publicAttributes: {
      physique: number;
      agility: number;
      wisdom: number;
      charisma: number;
      fame: number;
      infamy: number;
    };

    // 公开技能
    publicSkills: SkillSummary[];

    // 性格特征（玩家感知）
    perceivedPersonality: {
      ambition: number;
      loyalty: number;
      kindness: number;
      cunning: number;
      description: string;
    };

    // 当前状态
    currentStatus: {
      health: number;
      location: {
        region: string;
        city: string | null;
      };
      mood: string;
      isAlive: boolean;
    };

    // 与玩家关系
    relationshipWithPlayer: {
      value: number;
      level: RelationshipLevel;
      history: RelationshipEvent[];
      lastInteraction: string;
      interactionCount: number;
    };
  };
}
```

---

### 6.2 获取NPC关系网络

**端点**: `GET /npcs/{npcId}/relationships`

**描述**: 获取NPC的关系网络（与其他NPC和阵营的关系）

**路径参数**:
```
npcId: string
```

**响应数据**:
```typescript
interface NPCRelationshipsResponse {
  npcId: string;

  // 与玩家关系
  withPlayer: RelationshipEntry;

  // 与其他NPC关系（玩家已知部分）
  withNPCs: Record<string, {
    npcId: string;
    npcName: string;
    relationship: RelationshipEntry;
    knownToPlayer: boolean;     // 玩家是否知道这个关系
  }>;

  // 与阵营关系
  withFactions: Record<Faction, {
    value: number;
    level: RelationshipLevel;
    position: string | null;
    loyaltyLevel: string;
  }>;
}
```

---

### 6.3 与NPC对话

**端点**: `POST /npcs/{npcId}/interact`

**描述**: 与NPC进行互动对话

**路径参数**:
```
npcId: string
```

**请求体**:
```typescript
interface NPCInteractRequest {
  type: 'talk' | 'trade' | 'request' | 'challenge' | 'gift';

  // 对话内容
  message?: string;

  // 交易请求
  tradeOffer?: {
    give: { gold?: number; items?: string[] };
    request: { gold?: number; items?: string[] };
  };

  // 赠礼
  gift?: {
    gold?: number;
    items?: string[];
  };

  // 挑战类型
  challengeType?: 'duel' | 'debate' | 'competition';
}
```

**响应数据**:
```typescript
interface NPCInteractResponse {
  success: boolean;

  interaction: {
    type: string;
    npcId: string;
    timestamp: string;
  };

  // NPC响应
  npcResponse: {
    dialogue: string;           // NPC说的话（LLM生成）
    tone: 'friendly' | 'neutral' | 'hostile' | 'grateful' | 'angry';
    action?: string;            // NPC采取的行动
  };

  // 关系变化
  relationshipChange: {
    before: number;
    after: number;
    change: number;
    reason: string;
  };

  // 交易结果（如果是交易）
  tradeResult?: {
    completed: boolean;
    playerReceived: { gold?: number; items?: string[] };
    npcReceived: { gold?: number; items?: string[] };
  };

  // 赠礼效果（如果是赠礼）
  giftEffect?: {
    relationshipBonus: number;
    npcGratitude: string;
    specialEffect?: string;
  };

  // 挑战结果（如果是挑战）
  challengeResult?: {
    outcome: 'win' | 'lose' | 'draw';
    consequence: string;
    reputationChange: number;
  };

  // 触发事件
  triggeredEvents?: EventSummary[];
}
```

---

## 七、阵营交互接口

### 7.1 申请效忠阵营

**端点**: `POST /factions/{faction}/ally`

**描述**: 玩家申请效忠指定阵营

**路径参数**:
```
faction: Faction
```

**请求体**:
```typescript
interface AllyRequestRequest {
  // 效忠宣言（可选）
  declaration?: string;

  // 支持方式（可选，表明自己的价值）
  offering?: {
    type: 'military' | 'economic' | 'intelligence' | 'political';
    description: string;
    estimatedValue: number;
  };
}
```

**响应数据**:
```typescript
interface AllyRequestResponse {
  success: boolean;

  request: {
    faction: Faction;
    timestamp: string;
    status: 'pending' | 'accepted' | 'rejected';
  };

  // 阵营响应
  factionResponse: {
    from: string;               // 决定者NPC名称
    dialogue: string;
    attitude: 'welcoming' | 'cautious' | 'rejecting';
  };

  // 如果接受
  acceptance?: {
    factionLevel: FactionLevel;
    initialReputation: number;
    welcomeGift?: {
      gold?: number;
      items?: string[];
      title?: string;
    };
    firstMission?: EventSummary;
    narrativeFeedback: string;
  };

  // 如果拒绝
  rejection?: {
    reason: string;
    reputationChange: number;
    retryCondition?: string;
    narrativeFeedback: string;
  };

  // 如果待审
  pending?: {
    reviewBy: string;           // 审核者NPC名称
    estimatedReviewTime: string;
    requirements?: string[];
    narrativeFeedback: string;
  };
}
```

---

### 7.2 查询阵营声望详情

**端点**: `GET /factions/{faction}/reputation`

**描述**: 获取玩家在指定阵营的声望详情

**路径参数**:
```
faction: Faction
```

**响应数据**:
```typescript
interface FactionReputationResponse {
  faction: Faction;

  // 基础声望
  reputation: {
    value: number;
    level: RelationshipLevel;
    trend: 'rising' | 'stable' | 'falling';
    weeklyChange: number;
  };

  // 效忠状态
  allegiance: {
    isAlly: boolean;
    level: FactionLevel | null;
    position: string | null;
    joinedAt: string | null;
    daysSinceJoining: number | null;
  };

  // 可获得权限
  privileges: {
    available: string[];
    locked: string[];
    unlockConditions: Record<string, string>;
  };

  // 可获得任务
  availableMissions: {
    id: string;
    title: string;
    difficulty: string;
    reputationReward: number;
  }[];

  // 阵营内重要人物态度
  keyFiguresAttitude: {
    npcId: string;
    npcName: string;
    attitude: 'supportive' | 'neutral' | 'hostile';
    relationshipValue: number;
  }[];

  // 历史贡献
  contributions: {
    total: number;
    byType: Record<string, number>;
    recentActions: {
      action: string;
      reputationChange: number;
      timestamp: string;
    }[];
  };
}
```

---

## 八、系统接口

### 8.1 玩家登录/注册

**端点**: `POST /auth/login`

**描述**: 玩家登录或注册游戏

**请求体**:
```typescript
interface LoginRequest {
  // 外部身份
  provider: 'wechat' | 'email' | 'guest';
  identityToken: string;        // 外部平台的身份令牌

  // 新玩家信息（首次登录）
  newPlayer?: {
    name: string;
    startingFaction: Faction;   // 选择起点阵营
  };
}
```

**响应数据**:
```typescript
interface LoginResponse {
  success: boolean;

  // 认证信息
  auth: {
    token: string;              // 游戏访问令牌
    expiresAt: string;
    refreshToken: string;
  };

  // 玩家信息
  player: {
    id: string;
    name: string;
    isNew: boolean;
    faction: Faction | null;
    level: number;
  };

  // 游戏状态
  gameState: {
    currentDay: number;
    historyStage: HistoryStage;
    pendingEventsCount: number;
  };

  // 新玩家额外信息
  newPlayerWelcome?: {
    startingLocation: string;
    initialAttributes: PlayerAttributes;
    initialSkills: SkillSet;
    tutorialEvent: EventSummary;
    narrativeIntro: string;
  };
}
```

---

### 8.2 心跳检测

**端点**: `POST /heartbeat`

**描述**: 保持连接活跃，获取最新状态

**请求体**:
```typescript
interface HeartbeatRequest {
  lastKnownDay?: number;        // 客户端最后知道的游戏日
  clientTimestamp: string;
}
```

**响应数据**:
```typescript
interface HeartbeatResponse {
  serverTime: string;
  gameDay: number;
  historyStage: HistoryStage;

  // 是否有新事件
  hasNewEvents: boolean;
  newEventsCount: number;

  // 是否有状态变化
  hasStateChanges: boolean;
  stateChangesSummary?: {
    reputation?: Partial<Record<Faction, number>>;
    resources?: Partial<Record<string, number>>;
    level?: number;
  };

  // 是否需要刷新晨报
  needNewsRefresh: boolean;
}
```

---

### 8.3 获取版本信息

**端点**: `GET /version`

**描述**: 获取API和游戏版本信息

**响应数据**:
```typescript
interface VersionResponse {
  apiVersion: string;
  gameVersion: string;
  minimumClientVersion: string;

  // 维护信息
  maintenance?: {
    scheduled: boolean;
    startTime?: string;
    endTime?: string;
    message?: string;
  };

  // 更新公告
  updateNotice?: {
    version: string;
    changes: string[];
    releaseDate: string;
  };
}
```

---

## 九、错误处理

### 9.1 错误代码详解

| 错误代码 | HTTP状态码 | 说明 | 处理建议 |
|----------|------------|------|----------|
| INVALID_REQUEST | 400 | 请求参数无效 | 检查请求格式和参数 |
| UNAUTHORIZED | 401 | 未授权或令牌过期 | 刷新令牌或重新登录 |
| FORBIDDEN | 403 | 禁止访问（权限不足） | 检查玩家状态是否满足条件 |
| NOT_FOUND | 404 | 资源不存在 | 检查ID是否正确 |
| INTERNAL_ERROR | 500 | 服务器内部错误 | 等待后重试或联系支持 |
| RATE_LIMITED | 429 | 请求频率超限 | 降低请求频率，等待冷却 |
| SERVICE_UNAVAILABLE | 503 | 服务暂时不可用 | 等待后重试 |
| INVALID_STATE | 409 | 游戏状态无效 | 检查当前游戏状态 |
| EVENT_EXPIRED | 410 | 事件已过期 | 无法处理，接受结果 |
| INSUFFICIENT_RESOURCES | 402 | 资源不足 | 检查资源数量 |

### 9.2 重试策略

```typescript
interface RetryStrategy {
  // 可重试的错误
  retryableErrors: [
    'INTERNAL_ERROR',
    'SERVICE_UNAVAILABLE',
    'RATE_LIMITED'
  ];

  // 重试配置
  config: {
    maxRetries: 3;
    initialDelay: 1000;         // ms
    maxDelay: 10000;            // ms
    backoffMultiplier: 2;
  };

  // 不可重试的错误需要立即处理
  nonRetryableAction: {
    'UNAUTHORIZED': 'refresh_token',
    'FORBIDDEN': 'show_error_message',
    'INVALID_REQUEST': 'fix_request',
    'INSUFFICIENT_RESOURCES': 'show_resource_info',
    'EVENT_EXPIRED': 'accept_result'
  };
}
```

---

## 十、请求限流

### 10.1 限流规则

```
全局限流：
  - 每用户每秒最多 5 个请求
  - 每用户每分钟最多 100 个请求
  - 每用户每小时最多 1000 个请求

特定端点限流：
  - POST /player/decision: 每用户每10秒最多 1 次
  - POST /npcs/{npcId}/interact: 每用户每5秒最多 1 次
  - POST /factions/{faction}/ally: 每用户每小时最多 3 次
```

### 10.2 限流响应

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "RATE_LIMITED",
    "message": "请求频率超限",
    "details": {
      "limit": 100,
      "remaining": 0,
      "resetAt": "2026-04-16T08:40:00Z",
      "retryAfter": 60
    },
    "retryable": true
  },
  "metadata": {
    "timestamp": "2026-04-16T08:35:00Z",
    "version": "v1.0.0",
    "requestId": "req_xyz789",
    "serverTime": 1713256200000
  }
}
```

---

## 十一、WebSocket 接口（可选扩展）

### 11.1 WebSocket 连接

**端点**: `wss://api.agame.com/v1/ws`

**连接参数**:
```
Query Parameters:
  - token: string (认证令牌)
```

### 11.2 实时消息类型

```typescript
// 服务器推送消息
interface WSMessage {
  type: WSMessageType;
  data: any;
  timestamp: string;
}

type WSMessageType =
  | 'new_event'                 // 新事件触发
  | 'state_update'              // 状态更新
  | 'news_refresh'              // 晨报更新
  | 'npc_interaction'           // NPC主动互动
  | 'world_event'               // 世界级事件
  | 'faction_announcement';     // 阵营公告

// 新事件推送
interface NewEventMessage {
  type: 'new_event';
  data: {
    event: EventSummary;
    urgency: 'low' | 'normal' | 'high' | 'critical';
    notificationText: string;
  };
  timestamp: string;
}

// 状态更新推送
interface StateUpdateMessage {
  type: 'state_update';
  data: {
    changes: {
      reputation?: Partial<Record<Faction, number>>;
      resources?: Partial<Record<string, number>>;
      level?: number;
      attributes?: Partial<Record<string, number>>;
    };
    reason: string;
  };
  timestamp: string;
}
```

---

## 十二、API 安全

### 12.1 认证机制

```
Bearer Token 认证：
  - 每次请求需携带 Authorization: Bearer {token}
  - Token 有效期：24小时
  - Token刷新：使用 refresh_token 获取新 token

Token 格式：
  - JWT (JSON Web Token)
  - 包含：playerId, exp, iat
  - 签名：使用服务器私钥
```

### 12.2 数据安全

```
传输加密：
  - HTTPS 强制使用
  - TLS 1.2+ 要求

输入验证：
  - 所有输入参数类型检查
  - 字符串长度限制
  - 数值范围验证
  - 防止注入攻击

输出过滤：
  - 过滤敏感信息（如其他玩家的详细状态）
  - 根据玩家权限限制可见数据
```

---

## 十三、Mock 数据示例

### 13.1 玩家状态 Mock

```json
{
  "id": "player_abc123",
  "name": "张三",
  "age": 25,
  "faction": "border",
  "factionLevel": "friendly",
  "titles": ["暮光村居民"],
  "level": 15,
  "experience": 4500,
  "nextLevelExperience": 5000,
  "attributes": {
    "physique": 45,
    "agility": 50,
    "wisdom": 55,
    "willpower": 40,
    "perception": 60,
    "charisma": 35,
    "fame": 10,
    "infamy": 5,
    "luck": 50
  },
  "reputation": {
    "canglong": {"value": 20, "level": "neutral"},
    "shuanglang": {"value": 10, "level": "neutral"},
    "jinque": {"value": -5, "level": "neutral"},
    "border": {"value": 60, "level": "friendly"}
  },
  "skills": [
    {"name": "intelligenceAnalysis", "category": "strategy", "level": 2, "unlocked": true},
    {"name": "trade", "category": "commerce", "level": 1, "unlocked": true},
    {"name": "survival", "category": "survival", "level": 2, "unlocked": true}
  ],
  "resources": {
    "gold": 150,
    "food": 30,
    "materials": 20
  },
  "location": {
    "region": "borderlands",
    "city": "twilight_village",
    "faction": "border"
  },
  "tags": [],
  "pendingEventsCount": 2
}
```

### 13.2 事件详情 Mock

```json
{
  "event": {
    "id": "event_faction_invite_001",
    "type": "faction_invite",
    "category": "faction_invite",
    "title": "苍龙使节的邀请",
    "description": "天都城来的使节龙使来到暮光村，带来了大皇子天枢的亲笔信。",
    "narrativeText": "\"阁下在边境的名声，天枢殿下已有耳闻。如蒙不弃，愿效犬马之劳，苍龙帝国当以上宾之礼相待。\"使节留下一个锦盒，里面是一枚苍龙纹章和一百金币。",
    "scope": "personal",
    "importance": "major",
    "choices": [
      {
        "index": 0,
        "label": "接受邀请，效忠苍龙",
        "description": "成为苍龙阵营成员",
        "requirements": [],
        "costPreview": {"description": "无直接消耗"},
        "rewardPreview": {
          "gold": 100,
          "items": ["canglong_badge"],
          "reputation": {"canglong": 30},
          "description": "获得苍龙纹章、100金币、声望提升"
        },
        "impactPreview": {
          "unlocks": ["苍龙阵营事件"],
          "consequences": ["霜狼声望-10", "金雀花声望-5"],
          "description": "解锁苍龙相关事件，其他阵营声望略降"
        },
        "estimatedConsequence": {
          "shortTerm": "获得阵营身份和初始资源",
          "longTerm": "参与苍龙政治和军事活动",
          "risks": ["可能被其他阵营视为敌人"]
        },
        "canChoose": true
      },
      {
        "index": 1,
        "label": "婉言谢绝",
        "description": "保持中立，继续观望",
        "costPreview": {"description": "无消耗"},
        "rewardPreview": {"gold": 50, "description": "获得50金币谢礼"},
        "impactPreview": {
          "consequences": ["苍龙声望-5"],
          "description": "苍龙略失望但无敌意"
        },
        "estimatedConsequence": {
          "shortTerm": "保持独立身份",
          "longTerm": "可随时选择效忠",
          "risks": []
        },
        "canChoose": true
      }
    ],
    "createdAt": "2026-04-16T08:00:00Z",
    "expiresAt": null,
    "remainingTime": null,
    "relatedNPCs": [{"id": "npc_longshi", "name": "龙使", "role": "important"}],
    "relatedFactions": [{"faction": "canglong", "name": "苍龙帝国"}],
    "context": {
      "reason": "玩家边境声望达到60，触发阵营招募",
      "relatedHistory": []
    }
  }
}
```

---

*文档版本：MVP v1.0*
*创建日期：2026-04-16*
*适用于：Agame MVP阶段前后端API契约*