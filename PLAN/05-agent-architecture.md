# Agent架构设计

## 五、Agent架构设计

### 5.1 四级Agent体系

```
┌─────────────────────────────────────────────────────────────────┐
│                        世界级Agent (Chronos)                      │
│                    触发: 每日1次 | 最高参数模型                     │
│              职责: 世界平衡、历史推进、跨阵营事件                    │
│                 模型: 智谱GLM-4 / 讯飞Spark 4.0 Ultra              │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  天命司 (苍龙)    │ │ 先祖议会 (霜狼)  │ │ 黄金议会(金雀花) │
│  国家级Agent     │ │  国家级Agent     │ │  国家级Agent     │
│ 触发: 每6小时    │ │ 触发: 每6小时    │ │ 触发: 每6小时    │
│ 模型: 阿里Qwen-Plus│ │ 模型: 百度ERNIE 3.5│ │ 模型: 阿里Qwen-Plus│
└─────────────────┘ └─────────────────┘ └─────────────────┘
              │               │               │
        ┌─────┴─────┐   ┌─────┴─────┐   ┌─────┴─────┐
        ▼           ▼   ▼           ▼   ▼           ▼
    ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
    │城邦级 │ │城邦级 │ │城邦级 │ │城邦级 │ │城邦级 │ │城邦级 │
    │Agent  │ │Agent  │ │Agent  │ │Agent  │ │Agent  │ │Agent  │
    │每12小时│ │每12小时│ │每12小时│ │每12小时│ │每12小时│ │每12小时│
    │GLM-3  │ │ERNIE  │ │GLM-3  │ │ERNIE  │ │GLM-3  │ │ERNIE  │
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
              │ 事件触发   │       │ 事件触发   │
              │Spark Lite │       │ERNIE Lite │
              └───────────┘       └───────────┘
```

### 5.2 各层级详细设计

#### 5.2.1 世界级Agent (Chronos)

**职责：**
- 世界平衡监控与调整
- 历史阶段推进（暗流涌动→剑拔弩张→战火纷飞→尘埃落定）
- 跨阵营重大事件生成
- 隐藏剧情线索管理

**配置：**
```typescript
interface WorldLevelAgent {
  id: 'chronos';
  name: '命运织网者';
  trigger: { type: 'cron'; schedule: '0 3 * * *' };
  model: {
    primary: { provider: 'zhipu'; model: 'glm-4'; temperature: 0.3 };
    fallback: { provider: 'iflytek'; model: 'spark-4.0-ultra' };
  };
  maxTokens: 8192;
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
`,

  // L3: 任务层 - 具体指令
  task: `
【本次任务】
生成第{{gameDay}}天的世界演进：

1. 分析当前势力平衡状态
2. 判定是否需要触发平衡调整事件
3. 推进或触发历史阶段转换
4. 生成0-3个跨阵营事件

【输出格式】
{
  "balanceAnalysis": {
    "currentState": "balanced|biased_immortal|biased_demon|biased_human",
    "riskLevel": "low|medium|high|critical",
    "recommendedAction": string
  },
  "events": [...],
  "historyProgression": { "stageCompleted": boolean, "progress": number }
}
`
};
```

#### 5.2.2 国家级Agent

| 阵营 | Agent名称 | 触发频率 | 主选模型 | 备选模型 |
|------|----------|----------|----------|----------|
| 苍龙帝国 | 天命司 | 每6小时 | 阿里Qwen-Plus | 百度ERNIE 3.5 |
| 霜狼联邦 | 先祖议会 | 每6小时 | 百度ERNIE 3.5 | 阿里Qwen-Plus |
| 金雀花王国 | 黄金议会 | 每6小时 | 阿里Qwen-Plus | 百度ERNIE 3.5 |

```typescript
interface NationLevelAgent {
  id: string; // 'tianming-si' | 'xianzu-yihui' | 'huangjin-yihui'
  trigger: { type: 'cron'; schedule: '0 */6 * * *' };
  model: {
    primary: { provider: 'aliyun'; model: 'qwen-plus' };
    fallback: { provider: 'baidu'; model: 'ernie-3.5' };
  };
  responsibilities: {
    policyDecision: ['military', 'economic', 'diplomatic', 'cultural'];
    militaryDeployment: ['army', 'navy', 'elite', 'special'];
    diplomaticDecision: ['alliance', 'trade', 'war', 'neutrality'];
  };
}
```

#### 5.2.3 城邦级Agent

**职责：**
- 地方治理决策
- 资源调配与分配
- 地方事件生成
- 向上级汇报城邦状态

**配置：**
```typescript
interface CityLevelAgent {
  id: string;
  cityId: string;
  faction: 'canglong' | 'shuanglang' | 'jinque' | 'border';
  trigger: { type: 'cron'; schedule: '0 */12 * * *' };
  model: {
    primary: { provider: 'zhipu'; model: 'glm-3-turbo' };
    fallback: { provider: 'baidu'; model: 'ernie-speed' };
  };
  responsibilities: {
    governance: ['tax', 'construction', 'defense', 'welfare'];
    resourceAllocation: ['food', 'material', 'manpower'];
    localEvents: ['festival', 'disaster', 'trade_fair', 'recruitment'];
  };
}
```

#### 5.2.4 普通级Agent (NPC)

**配置：**
```typescript
interface NormalLevelAgent {
  id: string;
  npcId: string;
  npcType: 'villager' | 'merchant' | 'adventurer' | 'guard' | 'scholar';
  trigger: { type: 'event' | 'cron'; schedule: '0 0 * * *' };
  model: {
    primary: { provider: 'iflytek'; model: 'spark-lite' }; // 免费
    fallback: { provider: 'baidu'; model: 'ernie-lite' }; // 免费
  };
  maxTokens: 512;
}
```

### 5.3 Agent生命周期管理

#### 5.3.1 生命周期状态机

```
┌─────────┐    init     ┌──────────┐   activate   ┌──────────┐
│  INIT   │────────────▶│ STANDBY  │─────────────▶│ RUNNING  │
└─────────┘             └──────────┘              └─────┬────┘
                                                       │
    ┌──────────────────────────────────────────────────┤
    │                                                  │
    ▼                                                  │
┌──────────┐   terminate   ┌──────────┐               │
│ TERMINATED│◀─────────────│  ERROR   │◀──────────────┘
└──────────┘               └────┬─────┘      exception
     ▲                          │
     │                          │ recover
     │    cleanup    ┌──────────┘
     └───────────────┘
```

#### 5.3.2 状态说明

| 状态 | 说明 | 触发条件 |
|------|------|----------|
| `INIT` | 初始化中 | Agent实例创建时 |
| `STANDBY` | 待机状态 | 初始化完成，等待激活 |
| `RUNNING` | 运行中 | 唤醒周期到达或事件触发 |
| `ERROR` | 错误状态 | LLM调用失败、超时或解析错误 |
| `TERMINATED` | 终止 | Agent完成使命或系统关闭 |

#### 5.3.3 唤醒调度机制

```typescript
interface AgentSchedulerConfig {
  // 世界级Agent：每日凌晨3:00
  chronos: { type: 'cron'; expression: '0 3 * * *' };

  // 国家级Agent：每6小时，错峰执行
  nations: {
    type: 'interval';
    hours: 6;
    offset: { canglong: 0; shuanglang: 2; jinque: 4 };
  };

  // 城邦级Agent：每12小时
  cities: { type: 'interval'; hours: 12 };

  // 普通级Agent：事件驱动 + 每日同步
  npcs: { eventDriven: true; dailySync: '0 6 * * *' };
}
```

### 5.4 Agent间通信协议

#### 5.4.1 消息总线架构

基于Redis Pub/Sub的事件总线：

```
┌─────────────────────────────────────────────────────────────┐
│                     Event Bus (Redis Pub/Sub)                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────┐    publish     ┌──────────────┐          │
│   │   Chronos    │────────────────▶│   Channel    │          │
│   │  (Publisher) │                 │  "world:*"   │          │
│   └──────────────┘                 └──────────────┘          │
│                                          │                   │
│              ┌───────────────────────────┼─────────────────┐ │
│              │ subscribe                 │                 │ │
│              ▼                           ▼                 ▼ │
│        ┌──────────┐              ┌──────────┐        ┌────────┴┐
│        │ 国家级   │              │ 城邦级   │        │ 普通级  │
│        │(Consumer)│              │(Consumer)│        │(Consumer)│
│        └──────────┘              └──────────┘        └─────────┘
└─────────────────────────────────────────────────────────────┘
```

#### 5.4.2 消息格式标准

```typescript
interface AgentMessage {
  id: string;
  timestamp: number;
  source: AgentId;       // 'chronos' | 'canglong' | 'city_xxx' | 'npc_xxx'
  target: AgentId | 'broadcast';
  type: MessageType;
  payload: unknown;
  ttl: number;
}

type MessageType =
  | 'STATE_SYNC'      // 状态同步
  | 'EVENT_TRIGGER'   // 事件触发
  | 'POLICY_ISSUED'   // 政策发布（国家级→城邦级）
  | 'STATUS_REPORT'   // 状态汇报（下级→上级）
  | 'DECISION_REQ'    // 决策请求
  | 'BALANCE_ALERT';  // 平衡警报
```

#### 5.4.3 层级间通信规则

| 方向 | 事件类型 | 说明 |
|------|----------|------|
| 世界级→国家级 | `world:event_generated` | 跨阵营重大事件通知 |
| 国家级→城邦级 | `nation:policy_issued` | 国家政策下发 |
| 城邦级→普通级 | `city:event_local` | 地方事件通知 |
| 普通级→城邦级 | `normal:player_interaction` | 玩家交互上报 |
| 城邦级→国家级 | `city:status_report` | 城邦状态汇报 |
| 国家级→世界级 | `nation:faction_report` | 阵营状态汇报 |

### 5.5 NPC记忆系统

#### 5.5.1 记忆架构

```typescript
interface NPCMemory {
  id: string;
  turn: number;           // 游戏回合
  timestamp: number;      // 实际时间戳
  event: string;          // 事件描述
  sentiment: number;      // -1 ~ 1
  importance: number;     // 0 ~ 1
  tags: string[];
}

class NPCMemorySystem {
  private shortTerm: CircularBuffer<NPCMemory>;  // 最近5天
  private longTerm: VectorStore<NPCMemory>;      // 向量数据库存储

  async remember(event: MemoryEvent): Promise<void> {
    const memory = this.createMemory(event);
    this.shortTerm.push(memory);
    if (memory.importance > 0.7) {
      await this.longTerm.store(memory);
    }
  }

  async retrieve(query: string, context: Context): Promise<NPCMemory[]> {
    const recent = this.shortTerm.filter(m =>
      m.tags.some(t => query.includes(t))
    );
    const relevant = await this.longTerm.similaritySearch(query, 5);
    return this.mergeMemories(recent, relevant);
  }
}
```

#### 5.5.2 情感衰减

```typescript
// 普通事件随时间衰减，重大事件永久保留
applyEmotionalDecay(memory: NPCMemory): number {
  const daysPassed = (Date.now() - memory.timestamp) / (24 * 3600 * 1000);
  if (memory.importance > 0.8) return memory.sentiment;
  return memory.sentiment * Math.exp(-0.1 * daysPassed);
}
```

### 5.6 国产模型接入方案

#### 5.6.1 模型选型矩阵

| Agent层级 | 主选模型 | 备选模型 | 上下文 | 日调用量 | 月成本 |
|-----------|----------|----------|--------|----------|--------|
| 世界级 | 智谱GLM-4 (¥0.10/1K) | 讯飞Spark 4.0 Ultra | 128K | 30次 | ~¥12 |
| 国家级 | 阿里Qwen-Plus (¥0.0008/1K) | 百度ERNIE 3.5 | 128K | 108次 | ~¥2 |
| 城邦级 | 智谱GLM-3-Turbo (¥0.005/1K) | 百度ERNIE Speed | 128K | 1800次 | ~¥270 |
| 普通级 | 讯飞Spark Lite (免费) | 百度ERNIE Lite (免费) | 4K | 30000次 | ¥0 |
| **总计** | | | | | **~¥284** |

#### 5.6.2 统一LLM客户端接口

```typescript
interface LLMClient {
  chat(request: ChatRequest): Promise<ChatResponse>;
  chatStream(request: ChatRequest): AsyncIterator<ChatResponse>;
  healthCheck(provider?: string): Promise<HealthStatus>;
}

interface ChatRequest {
  model: string; // 格式: "provider:model" 如 "zhipu:glm-4"
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

// 厂商适配器
class ZhipuAdapter implements LLMProvider {
  async chat(req: ChatRequest): Promise<ChatResponse> {
    const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: req.model,
        messages: req.messages,
        temperature: req.temperature,
        max_tokens: req.maxTokens
      })
    });
    return this.normalizeResponse(await res.json());
  }
}
```

#### 5.6.3 容灾策略

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

### 5.7 错误处理与降级策略

```typescript
enum AgentErrorType {
  LLM_TIMEOUT = 'LLM_TIMEOUT',
  LLM_RATE_LIMIT = 'LLM_RATE_LIMIT',
  LLM_INVALID_RESPONSE = 'LLM_INVALID_RESPONSE',
  STATE_SYNC_FAILED = 'STATE_SYNC_FAILED',
}

const FallbackStrategies: Record<AgentErrorType, FallbackStrategy> = {
  [AgentErrorType.LLM_TIMEOUT]: {
    async execute(agent, error) {
      // 1. 尝试备用模型
      const fallbackModel = agent.getFallbackModel();
      if (fallbackModel) {
        return await agent.retryWithModel(fallbackModel);
      }
      // 2. 使用缓存响应
      const cached = await agent.cache.getLastValid();
      if (cached) return cached;
      // 3. 使用默认决策
      return agent.getDefaultDecision();
    }
  },

  [AgentErrorType.LLM_RATE_LIMIT]: {
    async execute(agent, error) {
      // 降级到免费模型
      agent.switchToFreeModel();
      return await agent.retry();
    }
  },

  [AgentErrorType.STATE_SYNC_FAILED]: {
    async execute(agent, error) {
      agent.useCachedState();
      agent.scheduleSyncRetry();
    }
  },
};
```

### 5.8 性能优化

#### 5.8.1 缓存策略

```typescript
interface CacheStrategy {
  tiers: {
    memory: { maxSize: '100mb'; ttl: 60 * 1000 };      // L1: 1分钟
    redis: { ttl: 5 * 60 * 1000; prefix: 'agent:' };    // L2: 5分钟
    persistent: { ttl: 24 * 60 * 60 * 1000 };           // L3: 24小时
  };
  keyGeneration: {
    template: 'agent:{level}:{agentId}:hash:{inputHash}';
  };
  invalidation: {
    eventBased: [
      { event: 'world:era_changed', affected: ['world:*', 'nation:*'] },
      { event: 'nation:war_declared', affected: ['nation:*', 'city:*'] },
    ];
  };
}
```

#### 5.8.2 批处理优化

```typescript
class BatchProcessor {
  // 将相似情境的NPC合并为一次调用
  async batchNPCBehaviors(npcs: NPCAgent[], context: Context): Promise<Behavior[]> {
    const groups = this.groupBySimilarity(npcs, context);
    const results = await Promise.all(
      groups.map(async group => {
        const prompt = this.buildBatchPrompt(group.npcs, context);
        const response = await this.llm.generate(prompt);
        return this.parseBatchResponse(response, group.npcs);
      })
    );
    return results.flat();
  }
}
```

### 5.9 附录：Agent配置模板

```yaml
# chronos.yaml - 世界级Agent
agent:
  id: chronos
  name: "命运织网者"
  level: world

schedule:
  cron: "0 3 * * *"
  timezone: "Asia/Shanghai"

model:
  primary:
    provider: zhipu
    model: glm-4
    temperature: 0.3
    maxTokens: 8192
  fallback:
    provider: iflytek
    model: spark-4.0-ultra

memory:
  shortTermCapacity: 100
  longTermEnabled: true
```

```yaml
# tianming-si.yaml - 国家级Agent
agent:
  id: tianming-si
  name: "天命司"
  level: nation
  faction: canglong

schedule:
  interval: 6h
  offset: 0

model:
  primary:
    provider: aliyun
    model: qwen-plus
    temperature: 0.5
    maxTokens: 4096
  fallback:
    provider: baidu
    model: ernie-3.5

objectives:
  short: ["monitor_succession", "maintain_stability"]
  medium: ["influence_borderlands"]
  long: ["unify_continent"]
```

```yaml
# city.yaml - 城邦级Agent
agent:
  id: city-beijing
  name: "京师太守"
  level: city
  faction: canglong

schedule:
  interval: 12h

model:
  primary:
    provider: zhipu
    model: glm-3-turbo
    temperature: 0.7
    maxTokens: 2048
  fallback:
    provider: baidu
    model: ernie-speed
```

```yaml
# npc.yaml - 普通级Agent
agent:
  id: npc-villager-001
  name: "张老汉"
  level: normal
  type: villager

trigger:
  type: event
  dailySync: "0 6 * * *"

model:
  primary:
    provider: iflytek
    model: spark-lite  # 免费
  fallback:
    provider: baidu
    model: ernie-lite  # 免费
```
