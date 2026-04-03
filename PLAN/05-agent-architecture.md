# Agent架构设计

## 五、Agent架构设计

### 5.1 三层Agent体系

```
┌───────────────────────────────────────────────────┐
│            主脑 Agent (Chronos)                    │
│  "命运织网者"                                      │
│  职责：世界平衡、随机事件注入、长期趋势调控          │
│  唤醒：每现实日1次（凌晨3:00）                      │
│  隐藏身份：偶尔以"影先生"旅人身份接触玩家            │
└───────────────────────┬───────────────────────────┘
                        │
         ┌──────────────┼──────────────┐
         ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  苍龙帝国   │ │  霜狼联邦   │ │  金雀花王国 │
│  "天命司"   │ │ "先祖议会"  │ │ "黄金议会"  │
│             │ │             │ │             │
│ 职责：      │ │ 职责：      │ │ 职责：      │
│ 内政外交    │ │ 内政外交    │ │ 内政外交    │
│ 皇子夺嫡    │ │ 改革内斗    │ │ 商业扩张    │
│ 军事部署    │ │ 部族平衡    │ │ 航海贸易    │
│ NPC调度     │ │ NPC调度     │ │ NPC调度     │
│             │ │             │ │             │
│ 唤醒：      │ │ 唤醒：      │ │ 唤醒：      │
│ 每6小时     │ │ 每6小时     │ │ 每6小时     │
└──────┬──────┘ └──────┬──────┘ └──────┬──────┘
       │               │               │
       ▼               ▼               ▼
┌───────────────────────────────────────────────────┐
│              NPC Agent 层                          │
│  每个国家6个关键NPC + 边境联盟6个NPC               │
│  职责：执行国家Agent的策略目标                      │
│  唤醒：事件触发 + 每日1次状态同步                   │
│  特性：有记忆、有情感、会记住玩家的选择              │
└───────────────────────────────────────────────────┘
```

### 5.2 Agent生命周期管理

#### 5.2.1 生命周期状态机

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

┌──────────┐  suspend  ┌──────────┐
│ RUNNING  │──────────▶│SUSPENDED │
│   ◀──────────────────│          │
│   resume             └──────────┘
```

#### 5.2.2 状态说明

| 状态 | 说明 | 触发条件 |
|------|------|----------|
| `INIT` | 初始化中 | Agent实例创建时 |
| `STANDBY` | 待机状态 | 初始化完成，等待激活 |
| `RUNNING` | 运行中 | 唤醒周期到达或事件触发 |
| `SUSPENDED` | 挂起 | 低优先级任务让出资源 |
| `ERROR` | 错误状态 | LLM调用失败、超时或解析错误 |
| `TERMINATED` | 终止 | Agent完成使命或系统关闭 |

#### 5.2.3 唤醒调度机制

```typescript
// Agent调度器配置
interface AgentSchedulerConfig {
  // 主脑Agent：每日凌晨3:00
  chronos: {
    type: 'cron';
    expression: '0 3 * * *';  // 每天3:00
    timezone: 'Asia/Shanghai';
  };

  // 国家Agent：每6小时
  kingdoms: {
    type: 'interval';
    hours: 6;
    offset: {  // 错峰执行，避免同时唤醒
      canglong: 0;
      shuanglang: 2;
      jinque: 4;
    };
  };

  // NPC Agent：事件驱动 + 每日同步
  npcs: {
    eventDriven: true;
    dailySync: '0 6 * * *';  // 每日6:00
  };
}

// 唤醒任务队列
class AgentScheduler {
  private queue: PriorityQueue<WakeTask>;
  private running: Map<string, AgentInstance>;

  async schedule(agentId: string, priority: number): Promise<void> {
    const task: WakeTask = {
      id: generateId(),
      agentId,
      priority,
      scheduledAt: Date.now(),
      maxExecutionTime: 30000,  // 30秒超时
    };
    this.queue.enqueue(task);
  }

  async execute(task: WakeTask): Promise<void> {
    const agent = this.running.get(task.agentId);
    if (!agent || agent.status === 'RUNNING') return;

    agent.status = 'RUNNING';
    try {
      await withTimeout(
        agent.run(),
        task.maxExecutionTime,
        'Agent execution timeout'
      );
      agent.lastRunAt = Date.now();
      agent.runCount++;
    } catch (error) {
      await this.handleError(agent, error);
    } finally {
      agent.status = 'STANDBY';
    }
  }
}
```

### 5.3 Agent间通信协议

#### 5.3.1 消息总线架构

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
│                    ┌─────────────────────┼─────────────────┐ │
│                    │ subscribe           │                 │ │
│                    ▼                     ▼                 ▼ │
│              ┌──────────┐          ┌──────────┐      ┌────────┴┐
│              │ 天命司   │          │先祖议会  │      │黄金议会 │
│              │(Consumer)│          │(Consumer)│      │(Consumer)│
│              └──────────┘          └──────────┘      └─────────┘
│                    │                     │                 │
│                    └─────────────────────┼─────────────────┘
│                                          ▼
│                                    ┌──────────────┐
│                                    │   NPC Agents │
│                                    │  (Consumers) │
│                                    └──────────────┘
└─────────────────────────────────────────────────────────────┘
```

#### 5.3.2 消息格式标准

```typescript
// 基础消息接口
interface AgentMessage {
  id: string;                    // 消息唯一ID
  timestamp: number;             // Unix时间戳（毫秒）
  source: AgentId;               // 发送者
  target: AgentId | 'broadcast'; // 接收者或广播
  type: MessageType;             // 消息类型
  payload: unknown;              // 消息内容
  ttl: number;                   // 生存时间（秒）
  signature?: string;            // 消息签名（防篡改）
}

type AgentId =
  | 'chronos'
  | 'canglong'
  | 'shuanglang'
  | 'jinque'
  | 'border'
  | `npc_${string}`;

type MessageType =
  | 'STATE_SYNC'      // 状态同步
  | 'EVENT_TRIGGER'   // 事件触发
  | 'DECISION_REQ'    // 决策请求
  | 'DECISION_RES'    // 决策响应
  | 'MEMORY_UPDATE'   // 记忆更新
  | 'BALANCE_ALERT'   // 平衡警报
  | 'COMMAND';        // 系统命令

// 具体消息类型示例
interface StateSyncMessage extends AgentMessage {
  type: 'STATE_SYNC';
  payload: {
    kingdomId: string;
    stats: KingdomStats;
    relations: RelationMap;
    activeEvents: Event[];
    version: number;  // 状态版本，用于冲突解决
  };
}

interface EventTriggerMessage extends AgentMessage {
  type: 'EVENT_TRIGGER';
  payload: {
    eventType: EventType;
    severity: 'minor' | 'major' | 'critical';
    affectedKingdoms: string[];
    description: string;
    metadata: Record<string, unknown>;
  };
}

interface DecisionRequestMessage extends AgentMessage {
  type: 'DECISION_REQ';
  payload: {
    context: DecisionContext;
    options: DecisionOption[];
    deadline: number;  // 决策截止时间
  };
}
```

#### 5.3.3 状态同步机制

```typescript
// 状态同步管理器
class StateSyncManager {
  private stateVersion: Map<string, number> = new Map();
  private pendingSync: Map<string, StateSyncMessage> = new Map();

  // 增量同步：只传输变更的部分
  async syncDelta(
    agentId: string,
    currentState: AgentState,
    lastSyncedVersion: number
  ): Promise<DeltaSync> {
    const changes = await this.computeDelta(
      agentId,
      lastSyncedVersion
    );

    return {
      version: this.stateVersion.get(agentId) || 0,
      changes,
      fullState: changes.length > 10  // 变更过多则发送全量
        ? currentState
        : undefined,
    };
  }

  // 冲突解决：last-write-wins + 语义合并
  async resolveConflict(
    localVersion: number,
    remoteVersion: number,
    localState: AgentState,
    remoteState: AgentState
  ): Promise<AgentState> {
    if (remoteVersion > localVersion) {
      return remoteState;
    }

    // 版本相同但内容不同，进行语义合并
    return this.semanticMerge(localState, remoteState);
  }

  private semanticMerge(local: AgentState, remote: AgentState): AgentState {
    // 数值属性：取平均值
    // 集合属性：取并集
    // 事件队列：按时间戳合并排序
    return {
      ...remote,
      stats: this.mergeStats(local.stats, remote.stats),
      events: this.mergeEvents(local.events, remote.events),
    };
  }
}
```

### 5.4 主脑Agent——Chronos详细设计

#### 5.4.1 核心职责

1. **平衡监控**：追踪四阵营实力对比，检测极端状态，生成纠偏事件
2. **随机性注入**：每日概率触发大事件（天灾、异族入侵、神器现世、瘟疫）
3. **长期趋势调控**：追踪文明周期，确保世界不走向极端
4. **玩家影响力评估**：评估玩家对世界的影响，决定反制/助力策略
5. **历史推进**：按预设阶段推进世界历史（和平→紧张→冲突→大战→重建...）

#### 5.4.2 世界历史阶段

```
Phase 1: 暗流涌动（第1-30游戏日）
  - 三国暗中渗透灰烬谷
  - 小规模摩擦
  - 玩家建立自己的势力

Phase 2: 剑拔弩张（第31-60游戏日）
  - 三国矛盾公开化
  - 灰烬谷成为焦点
  - 玩家必须选择立场

Phase 3: 战火纷飞（第61-90游戏日）
  - 三国大战爆发
  - 灰烬谷成为主战场
  - 玩家的选择决定战争走向

Phase 4: 尘埃落定（第91+游戏日）
  - 根据之前的走向产生结局
  - 新的格局形成
  - 可以开始新的赛季
```

#### 5.4.3 隐藏机制

- 暗中调整各国资源产出
- 触发"历史事件"改变格局
- 影响各国NPC的决策倾向
- 通过"影先生"等马甲接触玩家
- 当某一阵营过于强大时，注入削弱事件

#### 5.4.4 Chronos实现

```typescript
class ChronosAgent extends BaseAgent {
  private worldBalance: WorldBalanceAnalyzer;
  private eventInjector: RandomEventInjector;
  private trendController: TrendController;

  async run(): Promise<void> {
    const worldState = await this.loadWorldState();

    // 1. 分析世界平衡
    const balanceReport = await this.worldBalance.analyze(worldState);
    if (balanceReport.imbalance > 0.3) {
      await this.generateBalancingEvent(balanceReport);
    }

    // 2. 注入随机事件
    if (Math.random() < 0.3) {  // 30%概率
      await this.eventInjector.inject(worldState);
    }

    // 3. 推进历史阶段
    await this.advancePhase(worldState);

    // 4. 更新世界趋势
    await this.trendController.update(worldState);

    // 5. 广播状态同步
    await this.broadcastStateSync(worldState);
  }

  private async generateBalancingEvent(report: BalanceReport): Promise<void> {
    const strongest = report.strongestKingdom;
    const event = this.createWeakeningEvent(strongest);
    await this.publishEvent(event);
  }
}
```

### 5.5 国家Agent详细设计

#### 5.5.1 通用国家Agent架构

```typescript
abstract class KingdomAgent extends BaseAgent {
  protected kingdomId: string;
  protected personality: AgentPersonality;
  protected strategy: StrategyEngine;
  protected memory: AgentMemory;

  // 决策流程
  async decide(context: DecisionContext): Promise<Decision> {
    // 1. 感知环境
    const perception = await this.perceive(context);

    // 2. 检索相关记忆
    const relevantMemories = await this.memory.retrieve(
      perception.keyFactors
    );

    // 3. 生成候选决策
    const candidates = await this.strategy.generateOptions(
      perception,
      relevantMemories
    );

    // 4. 评估并选择
    const decision = await this.evaluateAndSelect(candidates);

    // 5. 记录决策
    await this.memory.recordDecision(decision, context);

    return decision;
  }

  // 每6小时执行的主循环
  async run(): Promise<void> {
    const worldState = await this.loadState();

    // 评估内外局势
    const assessment = await this.assessSituation(worldState);

    // 生成策略目标
    const objectives = await this.generateObjectives(assessment);

    // 调度NPC执行
    await this.dispatchNPCs(objectives);

    // 与其他国家交互
    await this.interactWithOtherKingdoms(worldState);
  }
}
```

#### 5.5.2 苍龙帝国Agent——"天命司"

**人格**：冷酷但公正的棋手，相信天命所归

**决策逻辑**：

```typescript
class CanglongAgent extends KingdomAgent {
  private successionCrisis: SuccessionTracker;

  async assessSituation(world: WorldState): Promise<Situation> {
    return {
      internal: {
        crisis: await this.successionCrisis.level(),  // 夺嫡程度
        stability: world.kingdoms.canglong.stability,
        factionBalance: await this.assessFactions(),
      },
      external: {
        shuanglangThreat: this.calculateThreat(world, 'shuanglang'),
        jinqueThreat: this.calculateThreat(world, 'jinque'),
      },
      border: {
        playerStance: world.player.faction,
        influence: world.border.influence.canglong,
        opportunity: this.calculateOpportunity(world),
      },
    };
  }

  protected async generateObjectives(situation: Situation): Promise<Objective[]> {
    const objectives: Objective[] = [];

    // 优先级1：内政危机
    if (situation.internal.crisis > 0.7) {
      objectives.push({
        type: 'INTERNAL',
        action: 'stabilize_succession',
        priority: 10,
      });
    }

    // 优先级2：外部威胁
    if (situation.external.shuanglangThreat > 0.6 ||
        situation.external.jinqueThreat > 0.6) {
      objectives.push({
        type: 'DEFENSE',
        action: 'fortify_border',
        priority: 9,
      });
    }

    // 优先级3：灰烬谷扩张
    if (situation.border.opportunity > 0.5) {
      objectives.push({
        type: 'EXPANSION',
        action: 'influence_borderlands',
        priority: 7,
      });
    }

    return objectives.sort((a, b) => b.priority - a.priority);
  }
}
```

#### 5.5.3 霜狼联邦Agent——"先祖议会"

**人格**：热血战士与睿智符文师的混合体

**当前目标**：
- 短期：解决改革派vs保守派的内部矛盾
- 中期：在灰烬谷建立军事存在
- 长期：为联邦找到可持续发展的道路（不再依赖掠夺）

#### 5.5.4 金雀花王国Agent——"黄金议会"

**人格**：精明但贪婪的商业帝国

**当前目标**：
- 短期：控制灰烬谷的贸易节点
- 中期：经济殖民灰烬谷
- 长期：建立以金雀花为中心的经济秩序

#### 5.5.5 边境联盟Agent——"谷主意志"

**人格**：务实的生存主义者

**特殊性**：不是单一Agent，而是模拟各村落村长大会的"集体决策"
- 各村落有自己的小目标
- 大事需要投票决定
- 玩家作为其中一个村落的村长，有投票权（权重取决于你的实力）

```typescript
class BorderAllianceAgent extends KingdomAgent {
  private villages: Village[];

  async collectiveDecision(proposal: Proposal): Promise<Decision> {
    const votes: Vote[] = [];

    for (const village of this.villages) {
      const vote = await village.vote(proposal);
      votes.push({
        village: village.id,
        choice: vote.choice,
        weight: village.calculateWeight(),  // 基于实力
      });
    }

    // 玩家投票
    votes.push({
      village: 'player',
      choice: await this.getPlayerVote(proposal),
      weight: this.calculatePlayerWeight(),
    });

    // 计票
    return this.tallyVotes(votes);
  }
}
```

### 5.6 NPC Agent详细设计

#### 5.6.1 NPC档案结构

```json
{
  "id": "npc_001",
  "name": "李青云",
  "origin": "canglong",
  "role": "exiled_general",
  "personality": {
    "traits": ["proud", "loyal", "stubborn"],
    "values": ["honor", "loyalty", "martial_arts"],
    "fears": ["betrayal", "being_forgotten"],
    "speech_style": "正式文言，偶尔用军事术语"
  },
  "relationships": {
    "canglong": -80,
    "player": 20,
    "npc_002": "hatred",
    "npc_003": "respect"
  },
  "abilities": {
    "combat": 85,
    "strategy": 70,
    "admin": 40,
    "diplomacy": 55
  },
  "goals": ["clear_name", "find_family", "establish_merit"],
  "memory": [
    {"turn": 12, "event": "被玩家收留", "sentiment": 0.8},
    {"turn": 25, "event": "玩家拒绝帮其复仇", "sentiment": -0.3}
  ],
  "current_state": "在村口等待决定..."
}
```

#### 5.6.2 NPC记忆系统

```typescript
interface NPCMemory {
  id: string;
  turn: number;           // 游戏回合
  timestamp: number;      // 实际时间戳
  event: string;          // 事件描述
  sentiment: number;      // -1 ~ 1，情感倾向
  importance: number;     // 0 ~ 1，重要性
  tags: string[];         // 标签，用于检索
}

class NPCMemorySystem {
  private shortTerm: CircularBuffer<NPCMemory>;  // 最近5天
  private longTerm: VectorStore<NPCMemory>;      // 永久存储

  async remember(event: MemoryEvent): Promise<void> {
    const memory: NPCMemory = {
      id: generateId(),
      turn: event.turn,
      timestamp: Date.now(),
      event: event.description,
      sentiment: event.sentiment,
      importance: this.calculateImportance(event),
      tags: await this.extractTags(event),
    };

    // 存入短期记忆
    this.shortTerm.push(memory);

    // 重要事件存入长期记忆
    if (memory.importance > 0.7) {
      await this.longTerm.store(memory);
    }
  }

  async retrieve(query: string, context: Context): Promise<NPCMemory[]> {
    // 1. 从短期记忆获取最近相关事件
    const recent = this.shortTerm.filter(m =>
      m.tags.some(t => query.includes(t))
    );

    // 2. 从长期记忆语义检索
    const relevant = await this.longTerm.similaritySearch(
      query,
      5,
      { filter: { npcId: context.npcId } }
    );

    // 3. 合并并按时间排序
    return this.mergeMemories(recent, relevant);
  }

  // 情感衰减：普通事件随时间衰减
  applyEmotionalDecay(memory: NPCMemory): number {
    const daysPassed = (Date.now() - memory.timestamp) / (24 * 3600 * 1000);
    if (memory.importance > 0.8) {
      return memory.sentiment;  // 重大事件不衰减
    }
    return memory.sentiment * Math.exp(-0.1 * daysPassed);
  }
}
```

#### 5.6.3 NPC行为生成

```typescript
class NPCAgent extends BaseAgent {
  private profile: NPCProfile;
  private memory: NPCMemorySystem;
  private emotion: EmotionEngine;

  async generateBehavior(context: InteractionContext): Promise<Behavior> {
    // 1. 检索相关记忆
    const memories = await this.memory.retrieve(
      context.situation,
      { npcId: this.profile.id }
    );

    // 2. 计算当前情感状态
    const emotionalState = this.emotion.calculate(memories, context);

    // 3. 构建LLM Prompt
    const prompt = this.buildPrompt({
      profile: this.profile,
      memories: memories.slice(0, 5),  // 最近5条相关记忆
      emotion: emotionalState,
      context,
    });

    // 4. 调用LLM生成行为
    const response = await this.llm.generate(prompt, {
      temperature: 0.8,
      maxTokens: 500,
    });

    // 5. 解析并验证
    return this.parseBehavior(response);
  }

  private buildPrompt(input: PromptInput): string {
    return `
你是《Agame》中的NPC角色：${input.profile.name}

角色设定：
- 性格：${input.profile.personality.traits.join(', ')}
- 价值观：${input.profile.personality.values.join(', ')}
- 说话风格：${input.profile.personality.speech_style}

当前情感状态：${input.emotion.state}

相关记忆：
${input.memories.map(m => `- ${m.event} (${m.sentiment > 0 ? '正面' : '负面'})`).join('\n')}

当前情境：
${input.context.situation}

玩家行动：
${input.context.playerAction}

请生成你的反应，包括：
1. 内心想法（不会显示给玩家）
2. 说出口的话
3. 采取的行动
4. 关系值变化

输出JSON格式。
    `.trim();
  }
}
```

### 5.7 Agent与LLM集成

#### 5.7.1 LLM调用分层

```
┌─────────────────────────────────────────────────────────┐
│ Tier 1: 重大事件 (Claude 3.5 Sonnet / GPT-4)            │
│ - 晨报生成                                              │
│ - 历史阶段转换                                          │
│ - 重大外交决策                                          │
│ - 复杂叙事事件                                          │
│ 日调用：~10次                                           │
├─────────────────────────────────────────────────────────┤
│ Tier 2: 常规事件 (GPT-3.5 / Claude 3 Haiku)             │
│ - NPC对话                                               │
│ - 普通决策                                              │
│ - 事件响应                                              │
│ 日调用：~500次                                          │
├─────────────────────────────────────────────────────────┤
│ Tier 3: 本地处理 (模板/规则引擎)                        │
│ - 标准回复                                              │
│ - 数值计算                                              │
│ - 简单确认                                              │
│ 日调用：无LLM成本                                        │
└─────────────────────────────────────────────────────────┘
```

#### 5.7.2 Prompt工程规范

```typescript
// Prompt构建器
class PromptBuilder {
  private systemPrompt: string;
  private worldContext: string;

  build(agent: Agent, task: Task): LLMPrompt {
    return {
      system: this.buildSystemPrompt(agent),
      user: this.buildUserPrompt(task),
      temperature: this.getTemperature(task.type),
      maxTokens: this.getMaxTokens(task.type),
    };
  }

  private buildSystemPrompt(agent: Agent): string {
    return `
你是策略游戏《Agame》的AI Agent：${agent.name}

世界观背景：
${this.worldContext}

你的角色设定：
${agent.personality.description}

你的职责：
${agent.responsibilities.join('\n')}

规则：
1. 必须基于当前世界状态做决策
2. 保持角色性格一致性
3. 考虑历史记忆的影响
4. 输出必须是有效的JSON格式
5. 不要输出思考过程
    `.trim();
  }

  private getTemperature(taskType: TaskType): number {
    switch (taskType) {
      case 'CREATIVE': return 0.9;   // 创意任务需要更高温度
      case 'DECISION': return 0.3;   // 决策任务需要更确定性
      case 'DIALOGUE': return 0.7;   // 对话适中
      default: return 0.5;
    }
  }
}
```

#### 5.7.3 LLM响应缓存

```typescript
class LLMCache {
  private redis: Redis;
  private ttl: number = 3600;  // 1小时

  async get(key: string): Promise<LLMResponse | null> {
    const cached = await this.redis.get(`llm:${key}`);
    if (!cached) return null;

    const { response, timestamp } = JSON.parse(cached);

    // 检查是否过期
    if (Date.now() - timestamp > this.ttl * 1000) {
      await this.redis.del(`llm:${key}`);
      return null;
    }

    return response;
  }

  async set(key: string, response: LLMResponse): Promise<void> {
    await this.redis.set(
      `llm:${key}`,
      JSON.stringify({ response, timestamp: Date.now() }),
      'EX',
      this.ttl
    );
  }

  // 生成缓存键（基于状态哈希）
  generateKey(prompt: string, context: Context): string {
    const hash = createHash('sha256')
      .update(prompt + JSON.stringify(context))
      .digest('hex')
      .slice(0, 16);
    return hash;
  }
}
```

### 5.8 错误处理与降级策略

#### 5.8.1 错误分类与处理

```typescript
enum AgentErrorType {
  LLM_TIMEOUT = 'LLM_TIMEOUT',
  LLM_RATE_LIMIT = 'LLM_RATE_LIMIT',
  LLM_INVALID_RESPONSE = 'LLM_INVALID_RESPONSE',
  STATE_SYNC_FAILED = 'STATE_SYNC_FAILED',
  MEMORY_RETRIEVAL_FAILED = 'MEMORY_RETRIEVAL_FAILED',
}

class AgentErrorHandler {
  private fallbackStrategies: Map<AgentErrorType, FallbackStrategy>;

  async handle(agent: Agent, error: AgentError): Promise<void> {
    const strategy = this.fallbackStrategies.get(error.type);
    if (!strategy) {
      throw error;  // 无策略则抛出
    }

    await strategy.execute(agent, error);
  }
}

// 具体降级策略
const FallbackStrategies: Record<AgentErrorType, FallbackStrategy> = {
  [AgentErrorType.LLM_TIMEOUT]: {
    async execute(agent, error) {
      // 使用缓存的响应或模板
      const cached = await agent.cache.getLastValid();
      if (cached) {
        return cached;
      }
      // 使用保守的默认决策
      return agent.getDefaultDecision();
    }
  },

  [AgentErrorType.LLM_RATE_LIMIT]: {
    async execute(agent, error) {
      // 降级到更低成本的模型
      agent.switchModel('tier2');
      return await agent.retry();
    }
  },

  [AgentErrorType.LLM_INVALID_RESPONSE]: {
    async execute(agent, error) {
      // 重试，降低temperature
      return await agent.retry({ temperature: 0.2 });
    }
  },

  [AgentErrorType.STATE_SYNC_FAILED]: {
    async execute(agent, error) {
      // 使用本地缓存状态继续运行
      agent.useCachedState();
      // 异步重试同步
      agent.scheduleSyncRetry();
    }
  },
};
```

#### 5.8.2 健康检查与自愈

```typescript
class AgentHealthMonitor {
  private agents: Map<string, AgentHealth>;

  async checkHealth(agentId: string): Promise<HealthStatus> {
    const agent = this.agents.get(agentId);
    const checks = await Promise.all([
      this.checkLLMConnection(),
      this.checkDatabaseConnection(),
      this.checkMemoryUsage(),
      this.checkResponseTime(agentId),
    ]);

    const healthy = checks.every(c => c.passed);

    return {
      status: healthy ? 'HEALTHY' : 'DEGRADED',
      checks,
      lastHealthyAt: healthy ? Date.now() : agent.lastHealthyAt,
    };
  }

  async selfHeal(agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);

    // 尝试重启Agent
    try {
      await agent.restart();
      return true;
    } catch (error) {
      // 重启失败，通知运维
      await this.alertOps(agentId, error);
      return false;
    }
  }
}
```

### 5.9 性能优化与成本控制

#### 5.9.1 成本估算

| 场景 | 模型 | 日调用 | 月成本(估算) |
|------|------|--------|-------------|
| 晨报生成 | Claude 3.5 Sonnet | 30次 | ~$30 |
| 重大事件 | Claude 3.5 Sonnet | 50次 | ~$15 |
| NPC对话 | GPT-3.5 | 1500次 | ~$20 |
| 普通事件 | GPT-3.5 | 1000次 | ~$15 |
| NPC行为 | GPT-3.5 | 500次 | ~$10 |
| **总计** | | | **~$90/月** |

#### 5.9.2 优化策略

```typescript
// 1. 智能批处理
class BatchProcessor {
  async batchNPCBehaviors(npcs: NPCAgent[], context: Context): Promise<Behavior[]> {
    // 将相似情境的NPC合并为一次调用
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

// 2. 预测生成
class PredictiveGenerator {
  private playerChoiceModel: ChoicePredictionModel;

  async pregenerateOutcomes(event: Event): Promise<Outcome[]> {
    // 预测玩家可能的选择
    const predictedChoices = await this.playerChoiceModel.predict(event);

    // 提前生成结果
    const outcomes = await Promise.all(
      predictedChoices.map(choice =>
        this.generateOutcome(event, choice)
      )
    );

    // 缓存结果
    await this.cacheOutcomes(event.id, outcomes);

    return outcomes;
  }
}

// 3. 动态降级
class DynamicDegradation {
  async shouldDegrade(agent: Agent): Promise<boolean> {
    const metrics = await this.getMetrics();

    // 成本超过阈值时降级
    if (metrics.dailyCost > this.costThreshold) {
      return true;
    }

    // 响应时间过长时降级
    if (metrics.avgLatency > this.latencyThreshold) {
      return true;
    }

    return false;
  }
}
```

---

## 附录：Agent配置模板

```yaml
# chronos.yaml
agent:
  id: chronos
  name: "命运织网者"
  type: overseer

schedule:
  cron: "0 3 * * *"
  timezone: "Asia/Shanghai"

llm:
  tier: 1
  model: "claude-3-5-sonnet"
  temperature: 0.7
  maxTokens: 2000

memory:
  shortTermCapacity: 100
  longTermEnabled: true

balancing:
  enabled: true
  threshold: 0.3
  actions: ["weaken_strongest", "boost_weakest", "trigger_neutral_event"]
```

```yaml
# canglong.yaml
agent:
  id: canglong
  name: "天命司"
  type: kingdom
  kingdom: canglong

personality:
  traits: ["calculating", "just", "arrogant"]
  values: ["destiny", "order", "merit"]

schedule:
  interval: 6h
  offset: 0

objectives:
  short: ["monitor_succession", "maintain_stability"]
  medium: ["influence_borderlands"]
  long: ["unify_continent"]
```
