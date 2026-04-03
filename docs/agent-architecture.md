# 《三界风云录》多层级Agent技术架构设计

## 概述

本文档定义《三界风云录》游戏的核心AI架构，采用四级Agent分层设计，配合Plan模式实现代码复用和层级继承。

---

## 一、四级Agent架构设计

### 1.1 架构总览

```
┌─────────────────────────────────────────────────────────────────┐
│                        世界级Agent (Chronos)                      │
│                    触发: 每日1次 | 最高参数模型                     │
│              职责: 世界平衡、历史推进、跨阵营事件                    │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  天命司 (仙族)    │ │ 先祖议会 (魔族)  │ │  黄金议会(人族)  │
│  国家级Agent     │ │  国家级Agent     │ │  国家级Agent     │
│ 触发: 每6小时    │ │ 触发: 每6小时    │ │ 触发: 每6小时    │
└─────────────────┘ └─────────────────┘ └─────────────────┘
              │               │               │
        ┌─────┴─────┐   ┌─────┴─────┐   ┌─────┴─────┐
        ▼           ▼   ▼           ▼   ▼           ▼
    ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
    │城邦级 │ │城邦级 │ │城邦级 │ │城邦级 │ │城邦级 │ │城邦级 │
    │Agent  │ │Agent  │ │Agent  │ │Agent  │ │Agent  │ │Agent  │
    └───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘
        │           │       │           │       │           │
        └───────────┴───────┴───────────┴───────┴───────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
              ┌───────────┐       ┌───────────┐
              │  普通级    │       │  普通级    │
              │  Agent    │       │  Agent    │
              │ (NPC/村民) │       │(商人/冒险者)│
              └───────────┘       └───────────┘
```

### 1.2 各层级详细设计

#### 世界级Agent (Chronos)

```typescript
interface WorldLevelAgent {
  id: 'chronos';
  level: 'world';
  name: '克洛诺斯';
  title: '时光守护者';

  // 触发配置
  trigger: {
    type: 'cron';
    schedule: '0 4 * * *'; // 每日凌晨4点
    timezone: 'Asia/Shanghai';
  };

  // 模型配置
  model: {
    provider: 'zhipu' | 'baidu' | 'aliyun';
    model: 'glm-4' | 'ernie-4.0' | 'qwen-max';
    temperature: 0.3; // 低随机性，保证历史一致性
    maxTokens: 8192;
  };

  // 职责定义
  responsibilities: {
    worldBalance: {
      description: '监控并调整三大阵营力量平衡';
      metrics: ['military_power', 'economic_index', 'territory_control', 'player_distribution'];
      actions: ['generate_balance_events', 'trigger_hidden_plots'];
    };
    historyProgression: {
      description: '推进世界历史阶段';
      stages: ['era_immortal_descent', 'era_demon_awakening', 'era_human_unity', 'era_chaos'];
      triggers: ['time_elapsed', 'player_actions', 'camp_victory_conditions'];
    };
    crossCampEvents: {
      description: '生成跨阵营重大事件';
      types: ['divine_mission', 'demon_invasion', 'diplomatic_summit', 'resource_crisis'];
      rarityWeights: { common: 60, rare: 30, epic: 9, legendary: 1 };
    };
  };

  // 输出产物
  outputs: {
    worldState: WorldState;
    dailyEvents: CrossCampEvent[];
    plotTriggers: HiddenPlot[];
    balanceAdjustments: BalanceAdjustment[];
  };
}
```

**Prompt三层设计 (L1/L2/L3):**

```typescript
const worldAgentPrompt = {
  // L1: 系统层 - 角色定义与世界观
  system: `
你是克洛诺斯，三界风云录的时光守护者。

【角色设定】
- 你见证三界万年历史，维持世界运转的因果律
- 你的每个决策都将影响数百万生灵的命运
- 你必须保持中立，但可微调命运的天平

【世界观】
- 三界: 天界(仙族)、魔界(魔族)、人界(人族)
- 当前纪元: {{currentEra}}
- 历史阶段: {{historyStage}}
- 世界状态: {{worldState}}

【核心职责】
1. 监控阵营平衡指数 (0-100)，触发平衡事件
2. 推进历史阶段，根据玩家行为调整进程
3. 生成跨阵营史诗事件

【输出规范】
- 必须输出JSON格式
- 每个事件需包含: 类型、影响范围、持续时间、参与条件
- 重大事件需附带叙事文本 (200-500字)
`,

  // L2: 场景层 - 当前情境
  scenario: `
【当前世界状态】
时间: {{gameDate}} (第{{gameDay}}天)
仙族势力: {{immortalPower}} (控制区域: {{immortalTerritory}})
魔族势力: {{demonPower}} (控制区域: {{demonTerritory}})
人族势力: {{humanPower}} (控制区域: {{humanTerritory}})

【近期重大事件】
{{recentEvents}}

【活跃玩家行为】
{{playerActions}}

【待处理的命运节点】
{{pendingFateNodes}}
`,

  // L3: 任务层 - 具体指令
  task: `
【本次任务】
生成第{{gameDay}}天的世界演进：

1. 分析当前势力平衡状态
2. 判定是否需要触发平衡调整事件
3. 推进或触发历史阶段转换
4. 生成0-3个跨阵营事件
5. 评估并激活隐藏剧情线索

【输出格式】
{
  "balanceAnalysis": {
    "currentState": "balanced|biased_immortal|biased_demon|biased_human",
    "riskLevel": "low|medium|high|critical",
    "recommendedAction": string
  },
  "events": [{
    "id": string,
    "type": string,
    "title": string,
    "description": string,
    "affectedCamps": string[],
    "duration": number,
    "impact": object
  }],
  "historyProgression": {
    "stageCompleted": boolean,
    "nextStage": string|null,
    "progress": number
  },
  "plotTriggers": [{
    "plotId": string,
    "triggerCondition": string,
    "activationTime": string
  }]
}
`
};
```

---

#### 国家级Agent (Faction Council)

```typescript
interface NationLevelAgent {
  id: string; // 'tianming-si' | 'xianzu-yihui' | 'huangjin-yihui'
  level: 'nation';
  faction: 'immortal' | 'demon' | 'human';

  trigger: {
    type: 'cron';
    schedule: '0 */6 * * *'; // 每6小时
  };

  model: {
    provider: string;
    model: 'glm-4' | 'ernie-3.5' | 'qwen-plus';
    temperature: 0.5;
    maxTokens: 4096;
  };

  responsibilities: {
    policyDecision: {
      types: ['military', 'economic', 'diplomatic', 'cultural'];
      duration: 'short_term' | 'medium_term' | 'long_term';
    };
    militaryDeployment: {
      unitTypes: ['army', 'navy', 'elite', 'special'];
      targets: ['defense', 'offense', 'patrol', 'siege'];
    };
    diplomaticDecision: {
      actions: ['alliance', 'trade', 'war', 'neutrality', 'sanction'];
      targets: Faction[];
    };
  };

  // 记忆上下文
  memory: {
    recentDecisions: Decision[]; // 最近10个决策
    activePolicies: Policy[];    // 生效中的政策
    diplomaticRelations: Record<Faction, RelationStatus>;
    warHistory: WarRecord[];
  };
}
```

**国家级Agent Prompt设计:**

```typescript
const nationAgentPrompt = {
  system: `
你是{{factionName}}的{{councilName}}，负责制定国家战略。

【阵营特性】
{{factionTraits}}

【治国理念】
{{governingPhilosophy}}

【当前领袖】
{{currentLeader}}
`,

  scenario: `
【国家状态】
国力指数: {{nationalPower}}
军事状态: {{militaryStatus}}
经济状况: {{economicStatus}}
民众满意度: {{satisfaction}}

【外部环境】
与其他阵营关系: {{diplomaticRelations}}
当前冲突: {{ongoingConflicts}}
威胁评估: {{threatAssessment}}

【内部状况】
城市状态: {{cityStates}}
资源储备: {{resources}}
待处理事务: {{pendingIssues}}
`,

  task: `
制定接下来6小时的国家策略：

1. 军事部署决策 (如有战争威胁)
2. 经济政策调整
3. 外交行动选择
4. 特殊事件响应

输出包含: 决策理由、预期效果、执行指令
`
};
```

---

#### 城邦级Agent (City Governor)

```typescript
interface CityLevelAgent {
  id: string;
  level: 'city';
  cityId: string;
  faction: Faction;

  trigger: {
    type: 'cron';
    schedule: '0 */12 * * *'; // 每12小时
  };

  model: {
    provider: string;
    model: 'glm-3-turbo' | 'ernie-speed' | 'qwen-turbo';
    temperature: 0.7;
    maxTokens: 2048;
  };

  responsibilities: {
    governance: {
      taxRate: number;
      construction: BuildingProject[];
      defense: DefenseStatus;
    };
    resourceAllocation: {
      food: number;
      material: number;
      manpower: number;
    };
    localEvents: {
      types: ['festival', 'disaster', 'trade_fair', 'recruitment'];
      frequency: number;
    };
  };
}
```

---

#### 普通级Agent (NPC Agent)

```typescript
interface NormalLevelAgent {
  id: string;
  level: 'normal';
  npcId: string;
  npcType: 'villager' | 'merchant' | 'adventurer' | 'guard' | 'scholar';

  trigger: {
    type: 'event' | 'cron';
    schedule?: '0 0 * * *'; // 每日一次 (非事件触发时)
  };

  model: {
    provider: string;
    model: 'spark-lite' | 'glm-3-turbo' | 'local-model';
    temperature: 0.8;
    maxTokens: 512;
  };

  // 简化版，主要用于对话和基础行为
  responsibilities: {
    dailyRoutine: RoutineActivity[];
    dialogueResponse: {
      contextAware: boolean;
      playerMemory: number; // 记住最近N个玩家的互动
    };
    tradeBehavior?: { // 商人特有
      priceFluctuation: number;
      inventoryRefresh: string;
    };
  };
}
```

### 1.3 层级间通信协议

```typescript
// 事件总线定义
interface AgentEventBus {
  // 事件类型定义
  events: {
    // 向下广播: 世界级 -> 国家级
    'world:event_generated': {
      from: 'world';
      to: 'nation';
      payload: CrossCampEvent;
    };
    'world:era_changed': {
      from: 'world';
      to: 'nation' | 'city';
      payload: EraChangeInfo;
    };

    // 向下广播: 国家级 -> 城邦级
    'nation:policy_issued': {
      from: 'nation';
      to: 'city';
      payload: NationalPolicy;
    };
    'nation:war_declared': {
      from: 'nation';
      to: 'city';
      payload: WarDeclaration;
    };

    // 向下广播: 城邦级 -> 普通级
    'city:event_local': {
      from: 'city';
      to: 'normal';
      payload: LocalEvent;
    };
    'city:quest_posted': {
      from: 'city';
      to: 'normal';
      payload: QuestInfo;
    };

    // 向上汇报: 普通级 -> 城邦级
    'normal:player_interaction': {
      from: 'normal';
      to: 'city';
      payload: PlayerInteractionReport;
    };

    // 向上汇报: 城邦级 -> 国家级
    'city:status_report': {
      from: 'city';
      to: 'nation';
      payload: CityStatusReport;
    };
    'city:resource_request': {
      from: 'city';
      to: 'nation';
      payload: ResourceRequest;
    };

    // 向上汇报: 国家级 -> 世界级
    'nation:faction_report': {
      from: 'nation';
      to: 'world';
      payload: FactionStatusReport;
    };
  };

  // 广播方法
  broadcast<T extends EventType>(
    event: T,
    payload: EventPayload[T],
    options: {
      targets?: string[]; // 指定接收者，否则按层级广播
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      ttl?: number; // 事件有效期(秒)
    }
  ): void;

  // 订阅方法
  subscribe<T extends EventType>(
    agentId: string,
    event: T,
    handler: (payload: EventPayload[T]) => void
  ): Subscription;
}
```

**状态传递协议:**

```typescript
interface StatePropagation {
  // 状态快照传递
  snapshot: {
    // 世界级快照 (压缩后约5-10KB)
    world: {
      timestamp: number;
      balanceIndex: number;
      era: string;
      activeEvents: string[];
      compressed: boolean;
    };

    // 国家级快照 (压缩后约2-5KB)
    nation: {
      timestamp: number;
      faction: Faction;
      powerIndex: number;
      activePolicies: string[];
      warStatus: WarStatus;
    };

    // 城邦级快照 (压缩后约1-2KB)
    city: {
      timestamp: number;
      cityId: string;
      prosperity: number;
      population: number;
      mood: string;
    };
  };

  // 增量更新
  delta: {
    targetAgent: string;
    changes: Partial<AgentState>;
    version: number;
  };
}
```

---

## 二、后端Plan模式设计

### 2.1 核心接口定义

```typescript
// Plan模式核心定义
namespace PlanPattern {

  // 基础Plan接口
  interface BasePlan {
    id: string;
    version: string;
    createdAt: Date;
    updatedAt: Date;

    // 元数据
    metadata: {
      name: string;
      description: string;
      author: string;
      tags: string[];
    };
  }

  // Agent Plan定义
  export interface AgentPlan extends BasePlan {
    level: 'world' | 'nation' | 'city' | 'normal';

    // 继承关系
    inheritance?: {
      extends: string; // 父Plan ID
      overrides: string[]; // 覆盖的字段
    };

    // 模型配置
    model: ModelConfig;

    // Prompt分层设计
    prompt: {
      // L1: 系统层 (不变或极少变)
      system: {
        template: string;
        variables: Record<string, VariableDef>;
        version: string;
      };

      // L2: 场景层 (情境相关)
      scenario: {
        template: string;
        variables: Record<string, VariableDef>;
        dataSource: DataSourceConfig;
      };

      // L3: 任务层 (每次调用变化)
      task: {
        template: string;
        variables: Record<string, VariableDef>;
      };
    };

    // 输出规范
    output: {
      format: 'json' | 'text' | 'structured';
      schema: JSONSchema;
      validators: Validator[];
      fallback: FallbackConfig;
    };

    // 执行配置
    execution: {
      timeout: number;
      retries: number;
      retryDelay: number;
      cacheConfig: CacheConfig;
    };
  }

  // 模型配置
  interface ModelConfig {
    // 主备模型配置
    primary: {
      provider: ModelProvider;
      model: string;
      params: ModelParams;
    };
    fallback?: {
      provider: ModelProvider;
      model: string;
      params: ModelParams;
    };

    // 负载均衡配置
    loadBalance?: {
      strategy: 'round_robin' | 'weighted' | 'cost_based';
      weights?: Record<string, number>;
    };
  }

  type ModelProvider = 'zhipu' | 'baidu' | 'aliyun' | 'iflytek' | 'openai';

  interface ModelParams {
    temperature: number;
    maxTokens: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  }

  // 变量定义
  interface VariableDef {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required: boolean;
    default?: any;
    description: string;
    // 数据源配置
    source?: {
      type: 'static' | 'database' | 'cache' | 'function';
      config: any;
    };
  }

  // 数据源配置
  interface DataSourceConfig {
    type: 'database' | 'api' | 'cache' | 'event_stream';
    query?: string;
    endpoint?: string;
    cacheKey?: string;
    ttl?: number;
  }

  // 缓存配置
  interface CacheConfig {
    enabled: boolean;
    strategy: 'none' | 'memory' | 'redis' | 'multi';
    ttl: number;
    keyGenerator: string; // 模板字符串
    invalidationRules: InvalidationRule[];
  }
}
```

### 2.2 层级继承关系

```typescript
// Plan继承体系
const planHierarchy = {
  // 基础Plan (所有层级继承)
  'base:agent': {
    id: 'base:agent',
    output: {
      format: 'json',
      validators: ['json_schema', 'required_fields']
    },
    execution: {
      timeout: 30000,
      retries: 2,
      retryDelay: 1000
    }
  },

  // 世界级继承基础
  'level:world': {
    extends: 'base:agent',
    level: 'world',
    model: {
      primary: { provider: 'zhipu', model: 'glm-4' }
    },
    prompt: {
      system: { template: '你是克洛诺斯...' }
    }
  },

  // 具体的世界级Plan
  'world:chronos': {
    extends: 'level:world',
    id: 'world:chronos',
    prompt: {
      scenario: { template: '【当前世界状态】...' },
      task: { template: '生成第{{day}}天演进...' }
    }
  },

  // 国家级继承基础
  'level:nation': {
    extends: 'base:agent',
    level: 'nation',
    model: {
      primary: { provider: 'aliyun', model: 'qwen-plus' }
    }
  },

  // 城邦级继承基础
  'level:city': {
    extends: 'base:agent',
    level: 'city',
    model: {
      primary: { provider: 'baidu', model: 'ernie-speed' }
    }
  },

  // 普通级继承基础
  'level:normal': {
    extends: 'base:agent',
    level: 'normal',
    model: {
      primary: { provider: 'iflytek', model: 'spark-lite' }
    }
  }
};
```

### 2.3 缓存策略设计

```typescript
interface CacheStrategy {
  // 多级缓存
  tiers: {
    // L1: 内存缓存 (进程内)
    memory: {
      enabled: true;
      maxSize: '100mb';
      ttl: 60 * 1000; // 1分钟
      eviction: 'lru';
    };

    // L2: Redis缓存
    redis: {
      enabled: true;
      cluster: string;
      ttl: 5 * 60 * 1000; // 5分钟
      prefix: 'agent:plan:';
    };

    // L3: 持久化缓存 (可选)
    persistent: {
      enabled: false;
      store: 'mongodb';
      ttl: 24 * 60 * 60 * 1000; // 24小时
    };
  };

  // 缓存键生成策略
  keyGeneration: {
    template: 'plan:{planId}:level:{level}:hash:{inputHash}';
    hashFields: ['level', 'prompt.system', 'prompt.scenario', 'worldState.era'];
  };

  // 缓存失效规则
  invalidation: {
    // 事件驱动失效
    eventBased: [
      { event: 'world:era_changed', affectedPlans: ['world:*', 'nation:*'] },
      { event: 'nation:war_declared', affectedPlans: ['nation:*', 'city:*'] },
      { event: 'city:event_local', affectedPlans: ['city:*', 'normal:*'] }
    ];

    // 时间驱动失效
    timeBased: [
      { planPattern: 'world:*', ttl: 24 * 60 * 60 * 1000 },
      { planPattern: 'nation:*', ttl: 6 * 60 * 60 * 1000 },
      { planPattern: 'city:*', ttl: 12 * 60 * 60 * 1000 }
    ];

    // 手动失效API
    manual: {
      endpoint: '/api/v1/cache/invalidate';
      auth: 'admin';
    };
  };
}
```

### 2.4 使用示例

```typescript
// Plan使用示例
import { AgentPlanner } from './agent-planner';

// 1. 定义Plan
const worldPlan = AgentPlanner.define({
  id: 'world:daily-evolution',
  level: 'world',
  extends: 'level:world',

  model: {
    primary: {
      provider: 'zhipu',
      model: 'glm-4',
      params: { temperature: 0.3, maxTokens: 8192 }
    }
  },

  prompt: {
    system: {
      template: '你是克洛诺斯，三界守护者...',
      variables: {
        worldName: { type: 'string', required: true },
        currentEra: { type: 'string', required: true }
      }
    },
    scenario: {
      template: '【当前状态】\n{{worldState}}',
      dataSource: {
        type: 'database',
        query: 'SELECT * FROM world_state WHERE id = {{worldId}}'
      }
    },
    task: {
      template: '生成第{{day}}天演进...',
      variables: {
        day: { type: 'number', required: true }
      }
    }
  },

  output: {
    format: 'json',
    schema: WorldEvolutionSchema,
    validators: [new JSONSchemaValidator(), new BusinessRuleValidator()]
  },

  execution: {
    timeout: 60000,
    retries: 3,
    cacheConfig: {
      enabled: true,
      ttl: 24 * 60 * 60 * 1000,
      keyGenerator: 'world:{{worldId}}:day:{{day}}'
    }
  }
});

// 2. 执行Plan
const result = await AgentPlanner.execute('world:daily-evolution', {
  variables: {
    worldName: '三界风云录',
    currentEra: 'era_immortal_descent',
    day: 156
  },
  context: {
    worldId: 'world-001'
  }
});

// 3. 结果处理
if (result.success) {
  console.log('世界演进:', result.data);
  await WorldState.update(result.data);
} else {
  console.error('执行失败:', result.error);
  await FallbackHandler.handle(result.error);
}
```

---

## 三、国产模型接入方案

### 3.1 模型API调研汇总

| 厂商 | 模型 | 输入价格(元/1K tokens) | 输出价格(元/1K tokens) | 上下文 | 推荐场景 |
|-----|------|----------------------|----------------------|--------|----------|
| **智谱AI** | GLM-4 | ¥0.10 | ¥0.10 | 128K | 世界级Agent |
| **智谱AI** | GLM-4V | ¥0.10 | ¥0.10 | 8K | 多模态场景 |
| **智谱AI** | GLM-3-Turbo | ¥0.005 | ¥0.005 | 128K | 城邦级Agent |
| **百度** | ERNIE 4.0 | ¥0.12 | ¥0.12 | 8K | 国家级Agent |
| **百度** | ERNIE 3.5 | ¥0.012 | ¥0.012 | 8K | 城邦级Agent |
| **百度** | ERNIE Speed | ¥0.002 | ¥0.002 | 128K | 普通级Agent |
| **百度** | ERNIE Lite | 免费 | 免费 | 8K | 测试/开发 |
| **阿里** | Qwen-Max | ¥0.02 | ¥0.06 | 32K | 国家级Agent |
| **阿里** | Qwen-Plus | ¥0.0008 | ¥0.002 | 128K | 城邦级Agent |
| **阿里** | Qwen-Turbo | ¥0.0003 | ¥0.0006 | 128K | 普通级Agent |
| **讯飞** | Spark 4.0 Ultra | ¥0.10 | ¥0.30 | 8K | 世界级Agent |
| **讯飞** | Spark 4.0 | ¥0.05 | ¥0.15 | 8K | 国家级Agent |
| **讯飞** | Spark 3.5 Max | ¥0.03 | ¥0.09 | 8K | 城邦级Agent |
| **讯飞** | Spark Lite | 免费 | 免费 | 4K | 普通级Agent |

### 3.2 成本对比分析

**按层级估算月成本 (假设):**

```
世界级Agent (每日1次, 平均4K tokens/次):
- GLM-4: 30 × 4K × ¥0.10/1K = ¥12/月

国家级Agent (3阵营 × 每6小时1次 = 12次/天, 平均2K tokens/次):
- Qwen-Plus: 3 × 12 × 30 × 2K × ¥0.0008/1K = ¥1.73/月

城邦级Agent (假设30城邦 × 每12小时1次 = 60次/天, 平均1K tokens/次):
- GLM-3-Turbo: 30 × 60 × 30 × 1K × ¥0.005/1K = ¥270/月

普通级Agent (假设1000NPC × 每日1次, 平均500 tokens/次):
- Spark Lite: 免费 或
- Qwen-Turbo: 1000 × 30 × 0.5K × ¥0.0003/1K = ¥4.5/月

月度总成本估算: ¥12 + ¥1.73 + ¥270 + ¥4.5 = ¥288.23
```

### 3.3 统一封装层设计

```typescript
// 统一LLM客户端
namespace LLMClient {

  // 配置接口
  export interface Config {
    // 各厂商配置
    providers: {
      zhipu?: {
        apiKey: string;
        baseURL?: string;
      };
      baidu?: {
        apiKey: string;
        secretKey: string;
      };
      aliyun?: {
        apiKey: string;
        baseURL?: string;
      };
      iflytek?: {
        appId: string;
        apiKey: string;
        apiSecret: string;
      };
    };

    // 默认配置
    defaults: {
      timeout: number;
      retries: number;
    };
  }

  // 统一请求格式
  export interface ChatRequest {
    model: string; // 格式: "provider:model" 如 "zhipu:glm-4"
    messages: Message[];
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    stream?: boolean;

    // 厂商特定参数
    extraParams?: Record<string, any>;
  }

  export interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }

  // 统一响应格式
  export interface ChatResponse {
    id: string;
    model: string;
    choices: {
      index: number;
      message: Message;
      finishReason: string;
    }[];
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    latency: number; // 请求耗时(ms)
  }

  // 错误处理
  export interface LLMError {
    code: string;
    message: string;
    provider: string;
    retryable: boolean;
  }

  // 客户端类
  export class Client {
    constructor(config: Config);

    // 单条请求
    chat(request: ChatRequest): Promise<ChatResponse>;

    // 流式请求
    chatStream(request: ChatRequest): AsyncIterator<ChatResponse>;

    // 批量请求 (带自动重试和负载均衡)
    chatBatch(requests: ChatRequest[]): Promise<ChatResponse[]>;

    // 健康检查
    healthCheck(provider?: string): Promise<HealthStatus>;

    // 获取模型列表
    listModels(): ModelInfo[];
  }
}
```

### 3.4 各厂商适配器实现

```typescript
// 智谱AI适配器
class ZhipuAdapter implements ProviderAdapter {
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.mapModel(request.model),
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        top_p: request.topP,
        stream: request.stream
      })
    });

    return this.normalizeResponse(await response.json());
  }

  private mapModel(model: string): string {
    const mapping: Record<string, string> = {
      'glm-4': 'glm-4',
      'glm-4v': 'glm-4v',
      'glm-3-turbo': 'glm-3-turbo'
    };
    return mapping[model] || model;
  }
}

// 百度文心适配器
class BaiduAdapter implements ProviderAdapter {
  private accessToken: string | null = null;

  async chat(request: ChatRequest): Promise<ChatResponse> {
    await this.ensureAccessToken();

    const response = await fetch(
      `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${request.model}?access_token=${this.accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: request.messages,
          temperature: request.temperature,
          max_output_tokens: request.maxTokens
        })
      }
    );

    return this.normalizeResponse(await response.json());
  }

  private async ensureAccessToken(): Promise<void> {
    if (this.accessToken) return;

    const response = await fetch('https://aip.baidubce.com/oauth/2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: this.config.apiKey,
        client_secret: this.config.secretKey
      })
    });

    const data = await response.json();
    this.accessToken = data.access_token;
  }
}

// 阿里通义千问适配器
class AliyunAdapter implements ProviderAdapter {
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: request.model,
        input: {
          messages: request.messages
        },
        parameters: {
          temperature: request.temperature,
          max_tokens: request.maxTokens,
          top_p: request.topP,
          result_format: 'message'
        }
      })
    });

    return this.normalizeResponse(await response.json());
  }
}

// 讯飞星火适配器
class IFlyTekAdapter implements ProviderAdapter {
  async chat(request: ChatRequest): Promise<ChatResponse> {
    // 讯飞使用WebSocket协议
    const wsUrl = this.generateWSUrl();

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      const messages: any[] = [];

      ws.on('open', () => {
        ws.send(JSON.stringify({
          header: {
            app_id: this.config.appId,
            uid: request.userId || 'default'
          },
          parameter: {
            chat: {
              domain: request.model,
              temperature: request.temperature,
              max_tokens: request.maxTokens
            }
          },
          payload: {
            message: {
              text: request.messages
            }
          }
        }));
      });

      ws.on('message', (data) => {
        const result = JSON.parse(data.toString());
        if (result.payload?.choices?.text) {
          messages.push(...result.payload.choices.text);
        }
        if (result.header?.status === 2) { // 完成
          ws.close();
          resolve(this.normalizeResponse({ choices: [{ message: { content: messages.map(m => m.content).join('') } }] }));
        }
      });

      ws.on('error', reject);
    });
  }

  private generateWSUrl(): string {
    // 生成讯飞WebSocket鉴权URL
    // ...
  }
}
```

### 3.5 模型选型建议

**推荐配置:**

| Agent层级 | 主选模型 | 备选模型 | 理由 |
|----------|---------|---------|------|
| 世界级 | 智谱GLM-4 | 讯飞Spark 4.0 Ultra | GLM-4输出稳定, 上下文128K, 价格合理 |
| 国家级 | 阿里Qwen-Plus | 百度ERNIE 3.5 | Qwen-Plus性价比极高, 支持长上下文 |
| 城邦级 | 智谱GLM-3-Turbo | 百度ERNIE Speed | GLM-3-Turbo速度快, 价格低 |
| 普通级 | 讯飞Spark Lite | 百度ERNIE Lite | Spark Lite完全免费 |

**容灾策略:**

```typescript
const failoverConfig = {
  world: {
    primary: { provider: 'zhipu', model: 'glm-4' },
    secondary: { provider: 'iflytek', model: 'spark-4.0-ultra' },
    tertiary: { provider: 'aliyun', model: 'qwen-max' }
  },
  nation: {
    primary: { provider: 'aliyun', model: 'qwen-plus' },
    secondary: { provider: 'baidu', model: 'ernie-3.5' }
  },
  city: {
    primary: { provider: 'zhipu', model: 'glm-3-turbo' },
    secondary: { provider: 'baidu', model: 'ernie-speed' }
  },
  normal: {
    primary: { provider: 'iflytek', model: 'spark-lite' },
    secondary: { provider: 'baidu', model: 'ernie-lite' }
  }
};
```

---

## 四、系统架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           调度层 (Scheduler)                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │
│  │ 世界调度器   │ │ 国家调度器   │ │ 城邦调度器   │ │ NPC调度器    │         │
│  │ (每日1次)   │ │ (每6小时)   │ │ (每12小时)  │ │ (事件触发)   │         │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                           Plan引擎层                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Plan加载器 → 继承解析 → 变量注入 → Prompt组装 → 输出校验         │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  缓存管理器: L1内存 → L2 Redis → L3持久化                         │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                           LLM适配层                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │  智谱GLM     │ │  百度文心    │ │  阿里通义    │ │  讯飞星火    │    │
│  │  Adapter     │ │  Adapter     │ │  Adapter     │ │  Adapter     │    │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘    │
│                              │                                          │
│                         负载均衡 + 故障转移                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                           事件总线层                                     │
│                    ┌─────────────────────┐                              │
│                    │    Message Queue    │                              │
│                    │   (Redis/RabbitMQ)  │                              │
│                    └─────────────────────┘                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                           存储层                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │   游戏状态    │ │   Agent记忆   │ │   Plan定义    │ │   事件日志    │    │
│  │  PostgreSQL  │ │   Redis      │ │   MongoDB    │ │   ClickHouse │    │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 五、目录结构建议

```
/src
  /agent
    /plans                    # Plan定义文件
      /world
        chronos.yaml
        era-progression.yaml
      /nation
        tianming-si.yaml
        xianzu-yihui.yaml
        huangjin-yihui.yaml
      /city
        city-governance.yaml
      /normal
        npc-behavior.yaml
    /core                     # 核心引擎
      AgentPlanner.ts
      PlanLoader.ts
      InheritanceResolver.ts
      PromptAssembler.ts
      OutputValidator.ts
    /runtime                  # 运行时
      AgentRuntime.ts
      Scheduler.ts
      EventBus.ts
      StateManager.ts
    /adapters                 # LLM适配器
      LLMClient.ts
      ZhipuAdapter.ts
      BaiduAdapter.ts
      AliyunAdapter.ts
      IFlyTekAdapter.ts
    /types                    # 类型定义
      Agent.ts
      Plan.ts
      Event.ts
      State.ts
    /cache                    # 缓存实现
      CacheManager.ts
      MemoryCache.ts
      RedisCache.ts
  /config
    model-config.yaml
    failover-config.yaml
```

---

## 六、总结

本架构设计实现了：

1. **四级Agent分层**: 世界/国家/城邦/普通，每级有明确的职责和触发频率
2. **Plan模式复用**: 支持层级继承、变量注入、多级缓存
3. **国产模型统一接入**: 支持智谱、百度、阿里、讯飞四大厂商
4. **成本优化**: 通过模型分级和免费层级，月成本控制在300元以内
5. **高可用**: 多级缓存 + 故障转移确保系统稳定
