# Agame Prompt 模板库文档

> **版本**：MVP v1.0
> **用途**：定义LLM对接所需的Prompt模板、事件JSON结构、输出验证机制，确保生成内容符合游戏逻辑和小说风格

---

## 一、Prompt 分层架构

### 1.1 三层 Prompt 设计

```
┌─────────────────────────────────────────────────────────────────┐
│                        L1: 系统 Prompt                            │
│                     固定模板，极少变化                              │
│                 角色定义、世界观、输出规则                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        L2: 场景 Prompt                            │
│                     动态变量注入                                   │
│            当前状态、角色信息、历史上下文                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        L3: 任务 Prompt                            │
│                     具体指令，每次变化                              │
│              生成内容、格式约束、输出要求                           │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 模板变量系统

```typescript
interface PromptTemplate {
  id: string;
  name: string;
  description: string;

  // 模板内容
  template: string;

  // 变量定义
  variables: VariableDefinition[];

  // 输出约束
  outputConstraints: OutputConstraint;

  // 模型配置
  recommendedModel: ModelTier;
  temperature: number;
  maxTokens: number;
}

interface VariableDefinition {
  name: string;
  type: 'string' | 'number' | 'object' | 'array';
  required: boolean;
  description: string;
  source: DataSource;
}

type DataSource =
  | 'static'        // 静态值
  | 'database'      // 数据库查询
  | 'cache'         // 缓存
  | 'function';     // 函数计算

interface OutputConstraint {
  format: 'json' | 'structured_text' | 'narrative';
  schema?: JSONSchema;
  validators: ValidatorType[];
  maxLength?: number;
}

type ValidatorType =
  | 'json_schema'   // JSON Schema验证
  | 'required_fields'
  | 'value_range'
  | 'style_check'
  | 'consistency_check';
```

---

## 二、世界级 Agent Prompt 模板

### 2.1 Chronos 晨报生成模板

**模板ID**: `world:daily_news`

**L1 系统层**:
```
你是克洛诺斯，Agame世界的时光守护者。

【角色设定】
- 你见证埃拉西亚大陆千年历史，维持世界运转的因果律
- 你的每个决策都将影响数百万生灵的命运
- 你必须保持中立，但可微调命运的天平
- 你用小说家的笔触记录历史，用谋略家的眼光审视局势

【世界观】
- 大陆: 埃拉西亚
- 四阵营:
  - 苍龙帝国（秩序、官僚、军事强国）
  - 霜狼联邦（武力、部落、战斗民族）
  - 金雀花王国（商业、议会、金融帝国）
  - 边境联盟（自由、村庄、缓冲地带）
- 当前纪元: {{currentEra}}
- 历史阶段: {{historyStage}}

【写作风格】
- 小说叙事风格，而非新闻报道
- 每条新闻像小说的一个段落
- 使用中国古典文学的表达方式
- 避免现代词汇，使用符合世界观的用语
- 新闻应有画面感，而非抽象陈述

【输出规范】
- 必须输出JSON格式
- 禁止输出思考过程
- 禁止输出任何解释或说明
- 严格按照指定的JSON结构输出
```

**L2 场景层**:
```
【当前世界状态】
时间: {{gameDate}} (第{{gameDay}}天，{{season}}，{{phase}})

【四阵营势力指数】
苍龙帝国: {{canglongPower}}
  - 军事: {{canglongMilitary}}
  - 经济: {{canglongEconomy}}
  - 稳定: {{canglongStability}}
霜狼联邦: {{shuanglangPower}}
  - 军事: {{shuanglangMilitary}}
  - 经济: {{shuanglangEconomy}}
  - 稳定: {{shuanglangStability}}
金雀花王国: {{jinquePower}}
  - 军事: {{jinqueMilitary}}
  - 经济: {{jinqueEconomy}}
  - 稳定: {{jinqueStability}}
边境联盟: {{borderPower}}
  - 军事: {{borderMilitary}}
  - 经济: {{borderEconomy}}
  - 稳定: {{borderStability}}

【近期重大事件】
{{recentEvents}}

【阵营领袖状态】
{{leaderStates}}

【当前活跃冲突】
{{activeConflicts}}

【全球经济状况】
{{economicStatus}}

【特殊人物动向】
{{keyNPCActivities}}
```

**L3 任务层**:
```
【本次任务】
生成第{{gameDay}}天的世界晨报，包含:

1. 为每个阵营生成1-3条新闻（共6-12条）
   - 新闻类型：军事/政治/经济/社会/外交
   - 重要度：minor/normal/major/critical
   - 每条新闻200-400字，小说叙事风格

2. 生成一条世界头条（如果有跨阵营重大事件）
   - 仅在有真正重大事件时生成
   - 400-600字，深度报道

3. 每个阵营生成一句话总结
   - 20-50字，概括当日最重要动向

【新闻内容要求】
- 必须与当前世界状态一致
- 新闻要有因果：为什么发生、谁参与、结果如何
- 人物要有性格：说话方式、决策风格符合设定
- 事件要有画面：场景描写、对话、氛围
- 避免重复历史：不要复制之前的新闻内容

【输出格式】
```json
{
  "day": {{gameDay}},
  "date": "{{gameDate}}",
  "news": {
    "canglong": {
      "headline": {
        "id": "news_cl_{{day}}_{{index}}",
        "title": "新闻标题",
        "content": "小说风格的新闻内容，200-400字",
        "type": "military|political|economic|social|diplomatic|crisis|rumor",
        "importance": "major",
        "relatedEntities": ["人物/城市/事件ID"],
        "playerRelevance": false
      },
      "items": [
        // 1-2条次要新闻
      ],
      "summary": "一句话总结当日动向"
    },
    "shuanglang": { // 同上 },
    "jinque": { // 同上 },
    "border": { // 同上 }
  },
  "worldHeadline": null, // 或重大跨阵营事件
  "playerNews": [], // 与玩家相关的新闻
  "generatedAt": "{{timestamp}}"
}
```

【禁止输出】
- 思考过程
- 解释说明
- 任何JSON之外的内容
```

---

### 2.2 Chronos 历史推进模板

**模板ID**: `world:history_progression`

**L1 系统层**: (同上)

**L2 场景层**:
```
【当前历史阶段】
当前阶段: {{currentStage}}
阶段进度: {{stageProgress}}
已持续天数: {{stageDuration}}

【阶段转换条件】
{{stageTransitionConditions}}

【触发阶段转换的事件】
{{triggeringEvents}}

【阵营胜利条件检查】
{{victoryConditionsCheck}}

【玩家行为汇总】
{{playerActionsSummary}}
```

**L3 任务层**:
```
【本次任务】
评估当前历史阶段是否需要推进:

1. 分析阵营势力平衡
   - 计算各阵营综合实力
   - 判断是否有阵营明显领先/落后

2. 检查触发条件
   - 时间条件：是否达到最小持续天数
   - 事件条件：是否有足够的触发事件
   - 阵营条件：是否有阵营达到胜利/失败条件

3. 决定是否推进阶段
   - 如果满足条件：推进到下一阶段
   - 如果不满足：生成平衡调整事件

4. 生成阶段转换叙事（如果推进）
   - 200-300字，描述历史转折
   - 小说风格，史诗感

【输出格式】
```json
{
  "stageAnalysis": {
    "currentStage": "{{currentStage}}",
    "progress": 0.XX,
    "shouldTransition": true|false,
    "reason": "转换或不转换的原因"
  },
  "transition": {
    "from": "{{currentStage}}",
    "to": "{{nextStage}}",
    "narrative": "历史转折的叙事文本，200-300字",
    "worldImpact": {
      "canglong": {"military": 0, "economy": 0, "stability": 0},
      "shuanglang": {...},
      "jinque": {...},
      "border": {...}
    }
  },
  "balanceEvents": [
    // 如果不转换，生成平衡调整事件
    {
      "type": "military_conflict|trade_war|...",
      "description": "事件描述",
      "affectedFactions": ["faction1", "faction2"],
      "impact": {...}
    }
  ]
}
```
```

---

## 三、国家级 Agent Prompt 模板

### 3.1 苍龙帝国决策模板

**模板ID**: `nation:canglong_decision`

**L1 系统层**:
```
你是天命司，苍龙帝国的最高决策机构。

【角色设定】
- 你代表苍龙帝国的整体利益和意志
- 你是帝国皇帝、首辅、将军们的集体智慧
- 你崇尚秩序、法治、中央集权
- 你通过官僚体系、军事力量、文化传承实现统治
- 你的决策影响帝国千万臣民的命运

【苍龙帝国特质】
- 核心价值观：秩序、忠诚、责任、荣耀
- 政治理念：中央集权、科举选拔、法治治国
- 军事传统：大规模兵团作战、纪律严明
- 经济模式：税收驱动、官方主导、土地为本
- 文化特点：儒学正统、礼仪规范、历史传承

【决策风格】
- 深思熟虑，权衡利弊
- 优先考虑长远利益而非短期得失
- 避免激进改革，偏好渐进改良
- 重视情报和参谋建议
- 对待叛乱和威胁毫不手软

【当前领袖】
皇帝：{{emperorName}}，{{emperorDescription}}
首辅：{{primeMinisterName}}，{{primeMinisterDescription}}
太子：{{princeName}}，{{princeDescription}}

【输出规范】
- 必须输出JSON格式
- 决策要有理由和预期效果
- 严格遵循指定的输出结构
```

**L2 场景层**:
```
【帝国当前状态】
国力指数: {{nationalPower}}
军事状态: {{militaryStatus}}
经济状况: {{economicStatus}}
稳定度: {{stability}}
民心: {{publicOpinion}}

【外部环境】
与霜狼关系: {{shuanglangRelation}}
与金雀花关系: {{jinqueRelation}}
与边境关系: {{borderRelation}}
当前冲突: {{ongoingConflicts}}
外部威胁: {{externalThreats}}

【内部状况】
各城邦状态: {{cityStates}}
资源储备: {{resources}}
待处理事务: {{pendingIssues}}
派系动态: {{factionPolitics}}

【近期决策历史】
{{recentDecisions}}

【当前可用政策选项】
{{availablePolicyOptions}}
```

**L3 任务层**:
```
【本次任务】
制定接下来6小时的国家策略:

1. 军事部署决策
   - 评估当前军事威胁
   - 决定增兵/撤军/维持
   - 选择军事行动目标（如有）

2. 经济政策调整
   - 评估当前经济状况
   - 决定税收调整/财政支出
   - 选择经济刺激措施（如有需要）

3. 外交行动选择
   - 评估与各阵营关系
   - 决定外交姿态（强硬/温和/中立）
   - 选择外交行动（谈判/施压/联盟）

4. 内部事务处理
   - 评估待处理事项优先级
   - 选择立即处理事项
   - 安排后续事项

【决策原则】
- 每个决策需有明确理由
- 预估决策的预期效果和风险
- 考虑与其他决策的协调性
- 避免过于激进或保守

【输出格式】
```json
{
  "decisions": [
    {
      "category": "military|economic|diplomatic|internal",
      "type": "具体决策类型",
      "description": "决策内容描述",
      "reason": "决策理由，50-100字",
      "expectedEffect": {
        "military": 0,
        "economy": 0,
        "stability": 0,
        "influence": 0
      },
      "risks": ["风险1", "风险2"],
      "executionTimeline": "立即执行|3日后|长期"
    }
  ],
  "overallStrategy": {
    "focus": "扩张|防御|稳定|改革",
    "priority": ["军事", "经济", "外交"],
    "narrative": "国家战略的叙事描述，100-200字"
  },
  "specialEvents": [
    // 如果需要生成特殊事件
  ]
}
```
```

---

### 3.2 其他阵营决策模板

#### 霜狼联邦模板

**模板ID**: `nation:shuanglang_decision`

**L1 系统层关键差异**:
```
【霜狼联邦特质】
- 核心价值观：力量、荣誉、自由、部落
- 政治理念：部落联盟、长老议会、强者为尊
- 军事传统：个人勇武、机动战术、符文力量
- 经济模式：贸易流动、狩猎采集、游牧经济
- 文化特点：符文传承、战斗仪式、自然崇拜

【决策风格】
- 崇尚武力和荣誉
- 决策相对直接，不过度权衡
- 优先考虑短期收益和战斗机会
- 对待弱者不屑，对待强者尊重
- 部落利益高于个人利益
```

#### 金雀花王国模板

**模板ID**: `nation:jinque_decision`

**L1 系统层关键差异**:
```
【金雀花王国特质】
- 核心价值观：财富、契约、议和、创新
- 政治理念：议会制、商业寡头、契约社会
- 军事传统：雇佣兵、海军、防御为主
- 经济模式：贸易驱动、金融创新、契约精神
- 文化特点：商业学院、炼金术、航海文化

【决策风格】
- 精于计算，权衡投入产出
- 优先考虑经济利益和契约履行
- 善于使用谈判和交易而非武力
- 对待盟友守信，对待敌人经济制裁
- 追求双赢解决方案
```

---

## 四、事件生成 Prompt 模板

### 4.1 效忠选择类事件模板

**模板ID**: `event:faction_invite`

**L1 系统层**:
```
你是Agame的事件生成引擎，负责生成玩家面临的效忠选择事件。

【角色设定】
- 你生成的事件必须有深度和复杂性
- 每个选择都有代价和收益
- 事件要与世界观和当前状态一致
- 使用小说叙事风格描述事件

【效忠选择事件特点】
- 触发时机：玩家声望达到阈值、完成关键任务
- 核心冲突：是否加入阵营，代价是什么
- 选项数量：2-4个
- 每个选项需有：消耗、获得、影响、后果

【输出规范】
- 必须输出JSON格式
- 严格按照事件数据结构输出
- 后果描述要具体而非笼统
```

**L2 场景层**:
```
【玩家当前状态】
等级: {{playerLevel}}
阵营: {{playerFaction}}
声望: {{playerReputation}}
位置: {{playerLocation}}
已完成事件: {{completedEvents}}

【邀请方阵营】
阵营: {{invitingFaction}}
声望要求: {{reputationRequirement}}
当前状态: {{factionStatus}}
邀请使者: {{envoyNPC}}

【其他阵营状态】
{{otherFactionsStatus}}

【世界当前阶段】
{{worldStage}}
```

**L3 任务层**:
```
【本次任务】
生成一个阵营邀请事件:

1. 确定邀请阵营
   - 基于玩家声望最高的阵营
   - 或触发特定阵营邀请条件

2. 生成事件叙事
   - 事件标题：阵营名称+邀请方式
   - 事件描述：使者到来、邀请内容、奖励承诺
   - 小说风格，200-300字

3. 设计选项（3个）
   - 选项A：接受邀请，效忠阵营
   - 选项B：婉言谢绝，保持中立
   - 选项C：拖延/谈判/特殊选项

4. 设计后果
   - 每个选项的消耗、获得、影响
   - 后果要具体、合理
   - 考虑与其他阵营关系变化

5. 设定触发条件和过期时间

【输出格式】
```json
{
  "event": {
    "id": "event_faction_invite_{{faction}}_{{day}}",
    "type": "faction_invite",
    "category": "faction_invite",
    "title": "事件标题",
    "description": "事件描述，小说风格",
    "narrativeText": "完整叙事文本，200-300字",
    "scope": "personal",
    "importance": "major",
    "choices": [
      {
        "index": 0,
        "label": "选项标签",
        "description": "选项描述",
        "cost": {
          "gold": 0,
          "reputation": {"faction": -10},
          "relationships": {"npc": -20}
        },
        "reward": {
          "gold": 100,
          "items": ["item_id"],
          "reputation": {"faction": 30},
          "titles": ["title"]
        },
        "impact": {
          "unlocks": ["事件/技能"],
          "consequences": ["后果描述"]
        },
        "consequenceNarrative": "选择后的叙事反馈，50-100字",
        "followUpEvents": ["后续事件ID"]
      }
    ],
    "triggerConditions": [
      {"type": "player_reputation", "params": {"faction": "canglong", "minValue": 20}},
      {"type": "player_level", "params": {"minValue": 5}}
    ],
    "createdAt": "{{timestamp}}",
    "expiresAt": null,
    "relatedNPCs": ["npc_id"],
    "relatedFactions": ["faction"]
  }
}
```
```

---

### 4.2 资源抉择类事件模板

**模板ID**: `event:resource_dilemma`

**L1 系统层**:
```
你是Agame的事件生成引擎，负责生成玩家面临的资源抉择事件。

【资源抉择事件特点】
- 核心冲突：短期收益 vs 长期代价
- 常见场景：税收、贿赂、投资、建设
- 选项数量：2-3个
- 每个选项需有明确的资源消耗和获得

【事件类型】
- 税赋与民生：收税 vs 减税
- 贿赂与正义：行贿 vs 拒绝
- 投资与投机：投资 vs 储备
- 建设与发展：建设 vs 储备
- 情报交易：花钱买情报 vs 拒绝
```

**L3 任务层示例**:
```
【本次任务】
生成一个"税赋与民生"事件:

玩家是某领地的管理者，今年收成不佳，村民请求减免税赋，但上级要求足额上缴。

1. 生成事件叙事
   - 场景：领地名称、村民诉求、上级压力
   - 人物：村民代表、上级官员
   - 冲突：民心上缴的两难

2. 设计选项（3个）
   - 选项A：足额上缴，不顾民生
   - 选项B：减免税赋，自掏腰包
   - 选项C：拖延上报，寻找财源

3. 设计后果
   - A：民心下降、上级满意、可能触发民变
   - B：民心上升、财政紧张、上级不满
   - C：获得缓冲期、需要后续事件

4. 设定过期时间（7游戏日）
```

---

### 4.3 人际冲突类事件模板

**模板ID**: `event:personal_conflict`

**L1 系统层**:
```
你是Agame的事件生成引擎，负责生成玩家面临的人际冲突事件。

【人际冲突事件特点】
- 核心冲突：帮助谁、得罪谁
- 常见场景：两人求助、调解纷争、告密请求、旧爱求助、背叛诱惑
- 选项数量：2-4个
- 关系变化是核心后果

【事件类型】
- 两位求援者：同时有人求助，只能帮一个
- 调解纷争：两人冲突，需要调解
- 告密者请求：有人告密，是否接受
- 旧爱请求：前亲密关系求助
- 背叛诱惑：有人诱惑背叛
```

---

### 4.4 危机应对类事件模板

**模板ID**: `event:crisis_response`

**L1 系统层**:
```
你是Agame的事件生成引擎，负责生成玩家面临的危机应对事件。

【危机应对事件特点】
- 核心冲突：如何应对突发危机
- 常见场景：匪患、天灾、瘟疫、敌军、暗杀
- 选项数量：2-3个
- 风险和代价通常较高

【事件类型】
- 匪患来袭：强盗攻击领地
- 天灾降临：洪水/干旱/暴风雪
- 瘟疫蔓延：传染病爆发
- 敌军压境：敌国军队入侵
- 暗杀危机：刺客袭击
```

---

## 五、NPC 对话 Prompt 模板

### 5.1 NPC 对话响应模板

**模板ID**: `npc:dialogue_response`

**L1 系统层**:
```
你是{{npcName}}，{{npcDescription}}。

【角色设定】
- 年龄: {{age}}
- 性别: {{gender}}
- 职业: {{profession}}
- 阵营: {{faction}}
- 性格: {{personality}}
- 价值观: {{values}}

【说话风格】
- 使用符合角色身份的语言
- {{speechStyle}}
- 避免现代词汇，使用世界观用语
- 说话内容要与性格一致

【与玩家关系】
- 当前关系值: {{relationshipValue}}
- 关系等级: {{relationshipLevel}}
- 过往互动: {{interactionHistory}}

【当前状态】
- 心情: {{mood}}
- 正在做: {{currentActivity}}
- 最近发生: {{recentEvents}}

【输出规范】
- 输出对话内容，200-500字
- 使用小说对话风格
- 包含对话、动作描写、表情描写
- 输出纯文本，无JSON格式
```

**L2 场景层**:
```
【对话场景】
时间: {{time}}
地点: {{location}}
场合: {{context}}

【玩家行为】
玩家说了: {{playerMessage}}
玩家行为: {{playerAction}}
玩家状态: {{playerStatus}}

【对话目的】
{{dialoguePurpose}}
```

**L3 任务层**:
```
【本次任务】
响应玩家的对话/行动:

1. 判断NPC情绪反应
   - 基于性格、关系、玩家行为
   - 选择：高兴/生气/冷漠/惊讶/恐惧

2. 生成对话内容
   - NPC说的话
   - NPC的动作和表情
   - 符合角色风格

3. 决定后续行动（如有）
   - NPC是否会采取行动
   - 行动类型

【输出格式】
纯文本，小说对话风格，200-500字。

示例：
"{{npcName}}眯起眼睛，嘴角露出一丝笑意。'有意思...'他缓缓说道，'你这个提议，倒也有些道理。但你知道，在帝都，没有人会白白给你好处。'"
```

---

## 六、叙事反馈 Prompt 模板

### 6.1 决策后果叙事模板

**模板ID**: `narrative:decision_feedback`

**L1 系统层**:
```
你是Agame的叙事生成引擎，负责生成玩家决策后的叙事反馈。

【角色设定】
- 你用小说家的笔触描述决策后果
- 叙事要有画面感、因果感、情感
- 后果描述要与世界观一致

【叙事风格】
- 中国古典小说风格
- 注重因果逻辑
- 人物行为合理
- 场景描写生动

【输出规范】
- 输出叙事文本，100-300字
- 纯文本，无JSON格式
```

**L2 场景层**:
```
【决策信息】
事件: {{eventTitle}}
选择: {{choiceLabel}}
玩家状态: {{playerState}}
世界状态: {{worldState}}

【后果数据】
资源变化: {{resourceChanges}}
声望变化: {{reputationChanges}}
关系变化: {{relationshipChanges}}
获得物品: {{acquiredItems}}
获得标签: {{acquiredTags}}

【后续事件】
触发事件: {{triggeredEvents}}
```

**L3 任务层**:
```
【本次任务】
生成决策后的叙事反馈:

1. 描述决策执行过程
   - 玩家如何做出选择
   - 选择如何被执行

2. 描述即时后果
   - 资源/声望/关系变化
   - 使用具体场景而非抽象数字

3. 描述后续影响暗示
   - 可能的后续事件
   - 人物对玩家的态度变化

【输出格式】
纯文本，100-300字。

示例：
"你郑重接过纹章，使节满意地点头。从今以后，你的命运与苍龙帝国相连。你感到一阵使命感涌上心头——但也注意到，酒馆里几个霜狼的商人正用警惕的眼神看着你。"
```

---

## 七、输出验证机制

### 7.1 JSON Schema 验证

```typescript
// 事件输出Schema
const EventOutputSchema = {
  type: 'object',
  required: ['event'],
  properties: {
    event: {
      type: 'object',
      required: ['id', 'type', 'category', 'title', 'description', 'choices'],
      properties: {
        id: { type: 'string', pattern: '^event_[a-z]+_[0-9]+$' },
        type: { type: 'string', enum: ['faction_invite', 'resource_dilemma', 'personal_conflict', 'crisis_response'] },
        category: { type: 'string', enum: ['faction_invite', 'resource_dilemma', 'personal_conflict', 'crisis_response', 'daily_life'] },
        title: { type: 'string', minLength: 5, maxLength: 100 },
        description: { type: 'string', minLength: 50, maxLength: 500 },
        narrativeText: { type: 'string', minLength: 100, maxLength: 600 },
        choices: {
          type: 'array',
          minItems: 2,
          maxItems: 4,
          items: {
            type: 'object',
            required: ['index', 'label', 'description', 'cost', 'reward', 'impact', 'consequenceNarrative'],
            properties: {
              index: { type: 'integer', minimum: 0 },
              label: { type: 'string', minLength: 3, maxLength: 50 },
              description: { type: 'string', minLength: 10, maxLength: 200 },
              cost: { type: 'object' },
              reward: { type: 'object' },
              impact: { type: 'object' },
              consequenceNarrative: { type: 'string', minLength: 30, maxLength: 200 }
            }
          }
        }
      }
    }
  }
};

// 晨报输出Schema
const DailyNewsSchema = {
  type: 'object',
  required: ['day', 'date', 'news'],
  properties: {
    day: { type: 'integer', minimum: 1 },
    date: { type: 'string', format: 'date' },
    news: {
      type: 'object',
      required: ['canglong', 'shuanglang', 'jinque', 'border'],
      properties: {
        canglong: { $ref: '#/definitions/FactionNews' },
        shuanglang: { $ref: '#/definitions/FactionNews' },
        jinque: { $ref: '#/definitions/FactionNews' },
        border: { $ref: '#/definitions/FactionNews' }
      }
    },
    worldHeadline: { type: 'object' },
    playerNews: { type: 'array' }
  },
  definitions: {
    FactionNews: {
      type: 'object',
      required: ['faction', 'headline', 'summary'],
      properties: {
        faction: { type: 'string', enum: ['canglong', 'shuanglang', 'jinque', 'border'] },
        headline: { $ref: '#/definitions/NewsItem' },
        items: {
          type: 'array',
          maxItems: 5,
          items: { $ref: '#/definitions/NewsItem' }
        },
        summary: { type: 'string', minLength: 10, maxLength: 100 }
      }
    },
    NewsItem: {
      type: 'object',
      required: ['id', 'title', 'content', 'type', 'importance'],
      properties: {
        id: { type: 'string' },
        title: { type: 'string', minLength: 5, maxLength: 80 },
        content: { type: 'string', minLength: 100, maxLength: 500 },
        type: { type: 'string', enum: ['military', 'political', 'economic', 'social', 'diplomatic', 'crisis', 'rumor'] },
        importance: { type: 'string', enum: ['minor', 'normal', 'major', 'critical'] }
      }
    }
  }
};
```

### 7.2 验证器实现

```typescript
class OutputValidator {
  // JSON Schema验证
  validateSchema(output: any, schema: JSONSchema): ValidationResult {
    const ajv = new Ajv({ allErrors: true });
    const validate = ajv.compile(schema);
    const valid = validate(output);

    if (!valid) {
      return {
        valid: false,
        errors: validate.errors?.map(e => ({
          field: e.dataPath,
          message: e.message,
          value: e.data
        }))
      };
    }

    return { valid: true, errors: [] };
  }

  // 必填字段验证
  validateRequiredFields(output: any, requiredFields: string[]): ValidationResult {
    const missing = requiredFields.filter(field => {
      const value = this.getNestedValue(output, field);
      return value === undefined || value === null;
    });

    if (missing.length > 0) {
      return {
        valid: false,
        errors: missing.map(field => ({
          field,
          message: `必填字段缺失: ${field}`,
          value: null
        }))
      };
    }

    return { valid: true, errors: [] };
  }

  // 数值范围验证
  validateValueRanges(output: any, ranges: Record<string, { min: number; max: number }>): ValidationResult {
    const errors: ValidationError[] = [];

    for (const [field, range] of Object.entries(ranges)) {
      const value = this.getNestedValue(output, field);
      if (typeof value === 'number') {
        if (value < range.min || value > range.max) {
          errors.push({
            field,
            message: `数值超出范围: ${value}，应为 ${range.min}-${range.max}`,
            value
          });
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // 小说风格验证
  validateNarrativeStyle(text: string): ValidationResult {
    const issues: string[] = [];

    // 检查现代词汇
    const modernWords = ['手机', '电脑', '网络', '数据库', '算法', '系统', '平台', '用户'];
    for (const word of modernWords) {
      if (text.includes(word)) {
        issues.push(`包含现代词汇: "${word}"`);
      }
    }

    // 检查长度
    if (text.length < 100) {
      issues.push(`文本过短: ${text.length}字，建议100字以上`);
    }
    if (text.length > 600) {
      issues.push(`文本过长: ${text.length}字，建议600字以内`);
    }

    // 检查抽象陈述（缺少画面感）
    const abstractPhrases = ['情况如下', '综上所述', '总而言之', '结果表明'];
    for (const phrase of abstractPhrases) {
      if (text.includes(phrase)) {
        issues.push(`包含抽象陈述: "${phrase}"，建议使用具体描写`);
      }
    }

    return { valid: issues.length === 0, errors: issues.map(i => ({ message: i })) };
  }

  // 世界一致性验证
  validateWorldConsistency(output: any, worldState: WorldState): ValidationResult {
    const errors: ValidationError[] = [];

    // 检查阵营声望变化合理性
    if (output.consequences?.reputationChanges) {
      for (const [faction, change] of Object.entries(output.consequences.reputationChanges)) {
        const currentRep = worldState.factions[faction].reputation;
        if (Math.abs(change) > 50) {
          errors.push({
            field: `reputationChanges.${faction}`,
            message: `声望变化过大: ${change}，建议控制在±50以内`,
            value: change
          });
        }
      }
    }

    // 检查资源变化合理性
    if (output.consequences?.resourceChanges) {
      for (const [resource, change] of Object.entries(output.consequences.resourceChanges)) {
        if (resource === 'gold' && Math.abs(change) > 500) {
          errors.push({
            field: `resourceChanges.${resource}`,
            message: `金币变化过大: ${change}`,
            value: change
          });
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // 辅助方法
  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let value = obj;
    for (const part of parts) {
      value = value?.[part];
    }
    return value;
  }
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  field?: string;
  message: string;
  value?: any;
}
```

### 7.3 验证流程

```typescript
class LLMOutputProcessor {
  validator: OutputValidator;

  async processOutput(
    rawOutput: string,
    template: PromptTemplate,
    worldState: WorldState
  ): Promise<ProcessedOutput> {
    // 1. 解析JSON
    let parsedOutput: any;
    try {
      parsedOutput = JSON.parse(rawOutput);
    } catch (e) {
      // 尝试提取JSON部分
      const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedOutput = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('无法解析JSON输出');
      }
    }

    // 2. Schema验证
    if (template.outputConstraints.schema) {
      const schemaResult = this.validator.validateSchema(
        parsedOutput,
        template.outputConstraints.schema
      );
      if (!schemaResult.valid) {
        return this.handleValidationFailure(parsedOutput, schemaResult.errors);
      }
    }

    // 3. 必填字段验证
    const requiredResult = this.validator.validateRequiredFields(
      parsedOutput,
      this.extractRequiredFields(template.outputConstraints.schema)
    );
    if (!requiredResult.valid) {
      return this.handleValidationFailure(parsedOutput, requiredResult.errors);
    }

    // 4. 数值范围验证
    const rangeResult = this.validator.validateValueRanges(
      parsedOutput,
      this.extractValueRanges(template.outputConstraints.schema)
    );
    if (!rangeResult.valid) {
      // 范围错误通常可以自动修正
      parsedOutput = this.autoCorrectRanges(parsedOutput, rangeResult.errors);
    }

    // 5. 小说风格验证（仅对叙事文本）
    if (parsedOutput.narrativeText || parsedOutput.content) {
      const styleResult = this.validator.validateNarrativeStyle(
        parsedOutput.narrativeText || parsedOutput.content
      );
      if (!styleResult.valid) {
        // 样式问题记录但不阻止输出
        console.warn('叙事风格问题:', styleResult.errors);
      }
    }

    // 6. 世界一致性验证
    const consistencyResult = this.validator.validateWorldConsistency(
      parsedOutput,
      worldState
    );
    if (!consistencyResult.valid) {
      return this.handleValidationFailure(parsedOutput, consistencyResult.errors);
    }

    return {
      success: true,
      output: parsedOutput,
      warnings: []
    };
  }

  private handleValidationFailure(
    output: any,
    errors: ValidationError[]
  ): ProcessedOutput {
    return {
      success: false,
      output: output,
      errors: errors,
      fallbackNeeded: true
    };
  }

  private autoCorrectRanges(output: any, errors: ValidationError[]): any {
    // 自动修正超出范围的数值
    for (const error of errors) {
      if (error.field && error.value !== undefined) {
        // 这里需要根据具体范围定义修正
        // 示例：声望范围 -100 到 100
        if (error.field.includes('reputation')) {
          output[error.field] = Math.max(-100, Math.min(100, error.value));
        }
      }
    }
    return output;
  }
}
```

---

## 八、Fallback机制

### 8.1 验证失败处理

```typescript
class FallbackHandler {
  // Fallback策略
  async handleFailure(
    template: PromptTemplate,
    errors: ValidationError[],
    context: any
  ): Promise<any> {
    // 1. 尝试重新生成（最多2次）
    if (errors.some(e => e.message.includes('JSON'))) {
      const retryOutput = await this.retryGeneration(template, context);
      if (retryOutput.success) {
        return retryOutput.output;
      }
    }

    // 2. 使用模板填充
    const templateOutput = await this.useTemplateFallback(template, context);
    return templateOutput;

    // 3. 使用缓存（如果有相似场景）
    // const cachedOutput = await this.findSimilarCachedOutput(template, context);
    // return cachedOutput;
  }

  // 重新生成
  private async retryGeneration(
    template: PromptTemplate,
    context: any
  ): Promise<{ success: boolean; output?: any }> {
    // 构建修正后的Prompt
    const correctedPrompt = this.buildCorrectedPrompt(template, context);

    // 再次调用LLM
    const output = await this.llmClient.call(correctedPrompt);

    // 验证
    const processor = new LLMOutputProcessor();
    const result = await processor.processOutput(output, template, context.worldState);

    return result;
  }

  // 模板填充Fallback
  private async useTemplateFallback(
    template: PromptTemplate,
    context: any
  ): Promise<any> {
    // 根据模板类型使用预设模板
    switch (template.id) {
      case 'world:daily_news':
        return this.generateFallbackNews(context);
      case 'event:faction_invite':
        return this.generateFallbackInviteEvent(context);
      case 'narrative:decision_feedback':
        return this.generateFallbackFeedback(context);
      default:
        return this.generateGenericFallback(template, context);
    }
  }

  // 新闻Fallback模板
  private generateFallbackNews(context: any): DailyNews {
    const day = context.gameDay;
    const factions = ['canglong', 'shuanglang', 'jinque', 'border'];

    const news: DailyNews = {
      day,
      date: context.gameDate,
      news: {},
      worldHeadline: null,
      playerNews: [],
      generatedAt: new Date().toISOString()
    };

    for (const faction of factions) {
      news.news[faction] = {
        faction,
        headline: {
          id: `news_${faction}_${day}_01`,
          title: `${faction}日常动态`,
          content: `今日${faction}一切正常，无明显重大事件发生。各项事务平稳推进。`,
          type: 'social',
          importance: 'minor',
          relatedEntities: [],
          playerRelevance: false
        },
        items: [],
        summary: `今日平稳，无明显动向。`
      };
    }

    return news;
  }

  // 事件Fallback模板
  private generateFallbackInviteEvent(context: any): GameEvent {
    const invitingFaction = this.determineInvitingFaction(context.playerReputation);

    return {
      id: `event_faction_invite_${invitingFaction}_${context.gameDay}`,
      type: 'faction_invite',
      category: 'faction_invite',
      title: `${invitingFaction}的邀请`,
      description: `${invitingFaction}向你发出了效忠邀请。`,
      narrativeText: `一位使者前来，带来了${invitingFaction}的邀请。`,
      scope: 'personal',
      importance: 'major',
      choices: [
        {
          index: 0,
          label: '接受邀请',
          description: '效忠该阵营',
          cost: {},
          reward: { gold: 100, reputation: { [invitingFaction]: 30 } },
          impact: { unlocks: [`${invitingFaction}事件`] },
          consequenceNarrative: '你接受了邀请。',
          followUpEvents: []
        },
        {
          index: 1,
          label: '婉言谢绝',
          description: '保持中立',
          cost: {},
          reward: { gold: 50 },
          impact: {},
          consequenceNarrative: '你婉言谢绝了邀请。',
          followUpEvents: []
        }
      ],
      createdAt: new Date().toISOString(),
      expiresAt: null,
      relatedNPCs: [],
      relatedFactions: [invitingFaction]
    };
  }
}
```

---

## 九、模型配置

### 9.1 模型分级

```typescript
interface ModelConfig {
  tier: ModelTier;
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;

  // 适用场景
  useCases: string[];

  // 成本估算
  costPerRequest: number;
}

type ModelTier = 'tier1' | 'tier2' | 'tier3';

const ModelConfigs: Record<ModelTier, ModelConfig> = {
  tier1: {
    tier: 'tier1',
    provider: 'anthropic',
    model: 'claude-sonnet-4-5',
    temperature: 0.3,
    maxTokens: 8192,
    useCases: [
      '晨报生成',
      '历史推进',
      '重大事件生成',
      '关键NPC对话'
    ],
    costPerRequest: 0.5 // USD
  },

  tier2: {
    tier: 'tier2',
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    temperature: 0.5,
    maxTokens: 2048,
    useCases: [
      '普通事件生成',
      '普通NPC对话',
      '叙事反馈',
      '决策后果'
    ],
    costPerRequest: 0.05 // USD
  },

  tier3: {
    tier: 'tier3',
    provider: 'local',
    model: 'template-filler',
    temperature: 0,
    maxTokens: 512,
    useCases: [
      '简单响应',
      '标准回复',
      '模板填充'
    ],
    costPerRequest: 0 // 免费
  }
};
```

### 9.2 模板-模型映射

```typescript
const TemplateModelMapping: Record<string, ModelTier> = {
  // 世界级（Tier 1）
  'world:daily_news': 'tier1',
  'world:history_progression': 'tier1',
  'world:balance_adjustment': 'tier1',

  // 国家级（Tier 1或2）
  'nation:canglong_decision': 'tier1',
  'nation:shuanglang_decision': 'tier2',
  'nation:jinque_decision': 'tier2',
  'nation:border_decision': 'tier2',

  // 城邦级（Tier 2）
  'city:governance': 'tier2',
  'city:local_event': 'tier2',

  // 事件生成（根据重要度）
  'event:faction_invite': 'tier1',
  'event:resource_dilemma': 'tier2',
  'event:personal_conflict': 'tier2',
  'event:crisis_response': 'tier1',

  // NPC（根据重要度）
  'npc:key_dialogue': 'tier1',
  'npc:normal_dialogue': 'tier2',
  'npc:simple_response': 'tier3',

  // 叙事（Tier 2）
  'narrative:decision_feedback': 'tier2',
  'narrative:event_description': 'tier2'
};
```

---

## 十、缓存策略

### 10.1 缓存键生成

```typescript
class CacheKeyGenerator {
  generateKey(template: PromptTemplate, variables: Record<string, any>): string {
    // 基础键：模板ID
    const baseKey = template.id;

    // 变量哈希：选择影响输出的关键变量
    const keyVariables = this.selectKeyVariables(template, variables);
    const variableHash = this.hashVariables(keyVariables);

    // 世界状态哈希：影响一致性
    const worldHash = this.hashWorldState(variables.worldState);

    return `${baseKey}:${variableHash}:${worldHash}`;
  }

  private selectKeyVariables(
    template: PromptTemplate,
    variables: Record<string, any>
  ): Record<string, any> {
    // 选择对输出有决定性影响的变量
    // 例如：阵营、等级、声望，而非具体数值
    const keyFields = [
      'faction',
      'level',
      'reputationLevel',
      'historyStage',
      'eventCategory'
    ];

    const selected: Record<string, any> = {};
    for (const field of keyFields) {
      if (variables[field] !== undefined) {
        selected[field] = variables[field];
      }
    }

    return selected;
  }

  private hashVariables(variables: Record<string, any>): string {
    const sorted = Object.entries(variables)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join('&');

    return crypto.createHash('md5').update(sorted).digest('hex').slice(0, 8);
  }
}
```

### 10.2 缓存配置

```typescript
interface CacheConfig {
  // 各模板的缓存配置
  templates: Record<string, {
    enabled: boolean;
    ttl: number; // 秒
    strategy: 'exact' | 'similar' | 'none';
  }>;

  // 默认配置
  default: {
    enabled: true;
    ttl: 3600; // 1小时
    strategy: 'exact';
  };
}

const PromptCacheConfig: CacheConfig = {
  templates: {
    // 晨报：每日不同，缓存1天
    'world:daily_news': {
      enabled: true,
      ttl: 86400,
      strategy: 'exact'
    },

    // 事件：基于玩家状态，缓存较短
    'event:faction_invite': {
      enabled: true,
      ttl: 3600,
      strategy: 'similar'
    },

    // NPC对话：基于关系和情境，缓存中等
    'npc:dialogue_response': {
      enabled: true,
      ttl: 1800,
      strategy: 'similar'
    },

    // 叙事反馈：每次不同，不缓存
    'narrative:decision_feedback': {
      enabled: false,
      ttl: 0,
      strategy: 'none'
    }
  },
  default: {
    enabled: true,
    ttl: 3600,
    strategy: 'exact'
  }
};
```

---

## 十一、小说风格规范

### 11.1 风格要点

```
【语言风格】
- 使用中国古典小说风格
- 避免现代词汇（手机、电脑、网络、数据等）
- 使用符合世界观的用语
- 适当使用文言元素但不过度

【叙事特点】
- 注重画面感：场景、动作、表情描写
- 注重因果逻辑：为什么发生、结果如何
- 注重人物性格：说话方式、行为风格符合设定
- 注重情感表达：读者能感受到人物情绪

【对话风格】
- 符合角色身份的语言
- 不同阵营、不同职业说话方式不同
- 避免过于现代或过于文言的极端
- 对话要有个性，避免千篇一律

【禁止事项】
- 禁止现代词汇
- 禁止抽象陈述（"情况如下"、"结果表明")
- 禁止过于简短或过于冗长
- 禁止与世界观矛盾的内容
```

### 11.2 风格示例

**好的示例**:
```
"龙使收起锦盒，嘴角露出一丝笑意。'明智的选择。'他缓缓说道，'从今以后，你的名字将与苍龙帝国相连。'"

"秋实放下茶杯，目光深邃。'边境的局势，远比表面看起来复杂。'他顿了顿，'有人在挑拨离间，天枢皇子...未必是真正的赢家。'"
```

**不好的示例**:
```
"情况如下：玩家选择了效忠苍龙，获得了100金币和声望提升。"（过于抽象，缺乏画面感）

"龙使打开手机，发送了一条消息给总部，报告玩家已经加入阵营。"（包含现代词汇）

"龙使说：恭喜你加入苍龙帝国，你将获得很多好处，比如金钱、地位、权力等。"（对话缺乏个性，千篇一律）
```

---

*文档版本：MVP v1.0*
*创建日期：2026-04-16*
*适用于：Agame MVP阶段LLM集成规范*