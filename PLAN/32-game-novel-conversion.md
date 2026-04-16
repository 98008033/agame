# Agame 游戏小说转换算法文档

> **版本**：MVP v1.0
> **优先级**：P1（核心功能）
> **设计目标**：定义游戏状态到小说叙事的转换规则，建立数值变化→叙事模板的映射机制

---

## 一、转换系统核心架构

### 1.1 转换流程总览

```
┌─────────────────────────────────────────────────────────────┐
│                 游戏状态→小说转换架构                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────┐     ┌────────────┐     ┌────────────┐      │
│  │ 游戏状态   │────→│ 事件提取   │────→│ 叙事模板   │      │
│  │ (JSON)    │     │ (EventList)│     │ (Template) │      │
│  └────────────┘     └────────────┘     └────────────┘      │
│         │                  │                  │            │
│         ▼                  ▼                  ▼            │
│  PlayerState         EventAnalyzer       TemplateMatcher   │
│  NPCState           ────────────        ──────────────     │
│  WorldState         - 重要性排序        - 事件类型匹配      │
│  FactionState       - 类型识别          - 阵营风格匹配      │
│                     - 人物关联          - 角色模板匹配      │
│                                                              │
│                      ┌────────────┐                         │
│                      │ 小说生成   │                         │
│                      │ (LLM)     │                         │
│                      └────────────┘                         │
│                             │                               │
│                             ▼                               │
│                     NovelChapter                           │
│                     ─────────────                           │
│                     - 3000-5000字                           │
│                     - 四节结构                              │
│                     - 风格一致                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 数据流向

```typescript
// 转换系统数据流向
interface ConversionPipeline {
  // 输入：游戏状态快照
  input: {
    playerState: PlayerState;      // 玩家当前状态
    npcStates: NPCState[];         // NPC状态列表
    worldState: WorldState;        // 世界状态
    factionStates: FactionState[]; // 阵营状态
    eventHistory: ProcessedEvent[];// 已处理事件历史
    playerActions: PlayerAction[]; // 玩家当日行为日志
  };

  // 中间：事件分析
  intermediate: {
    events: AnalyzedEvent[];       // 分析后的事件列表
    priorities: EventPriority[];   // 事件优先级排序
    templates: TemplateMatch[];    // 模板匹配结果
    context: NarrativeContext;     // 叙事上下文
  };

  // 输出：小说章节
  output: NovelChapter;
}
```

---

## 二、Event对象→小说段落转换规则

### 2.1 事件类型识别与转换

```typescript
// 事件类型映射
enum EventType {
  WAR = 'war',              // 战争 → 战略叙事
  POLITICAL = 'political',  // 政治 → 权谋叙事
  TRADE = 'trade',          // 贸易 → 商业叙事
  DIPLOMACY = 'diplomacy',  // 外交 → 谈判叙事
  PERSONAL = 'personal',    // 个人 → 人物叙事
  CRISIS = 'crisis',        // 危机 → 紧张叙事
  ROMANCE = 'romance',      // 关系 → 情感叙事
  MYSTERY = 'mystery',      // 神秘 → 悬念叙事
}

// 事件→叙事段落转换器
interface EventToNarrativeConverter {
  // 根据事件类型选择叙事模板
  selectTemplate(event: GameEvent): NarrativeTemplate;

  // 提取关键信息
  extractKeyInfo(event: GameEvent): KeyInfo;

  // 生成交代性叙事
  generatePrelude(event: GameEvent): string;

  // 生成核心叙事
  generateCoreNarrative(event: GameEvent, choice: EventChoice): string;

  // 生成后果叙事
  generateAftermath(event: GameEvent, result: EventResult): string;
}
```

### 2.2 各类型事件转换模板

#### 战争事件转换

```typescript
// 战争事件模板
const warEventTemplate = {
  // 前奏模板
  prelude: `
    {factionA}与{factionB}的{conflictType}已持续{duration}。
    {location}，两军对峙。
    {leaderA}站在{positionA}，目光锁定{direction}。
    {leaderB}则在{positionB}，{expressionB}。
    {atmosphere}弥漫在空气中——
    这是{warType}的前夜。
  `,

  // 核心模板
  core: `
    {trigger}。
    {leaderA}{actionA}，{resultA}。
    {leaderB}{reactionB}。
    战场上的{battleDetail}。
    {decisiveMoment}。
    {outcome}。
  `,

  // 后果模板
  aftermath: `
    {location}的{aftermathState}。
    {winner}占据了{gain}。
    {loser}失去了{loss}。
    {casualtyReport}。
    这场{warType}，将改变{region}的未来。
  `,

  // 变量映射
  variables: {
    factionA: (event) => event.factions[0].name,
    factionB: (event) => event.factions[1].name,
    conflictType: (event) => event.data.conflictType,
    duration: (event) => event.data.duration,
    location: (event) => event.data.location,
    // ...
  },
};

// 示例输出
const warNarrativeExample = `
苍龙帝国与霜狼联邦的边境争端已持续三月。
铁壁关，两军对峙。
铁壁将军站在城墙之上，目光锁定北方的冰原。
霜狼·屠灭则在冰原上，战斧高悬。
凛冽的风雪弥漫在空气中——
这是第三次边境战争的前夜。

黎明时分，霜狼率先出击。
屠灭一声吼叫，血狼骑兵如潮水涌向城墙。
铁壁将军下令放箭，箭雨如蝗。
战场上的厮杀声，穿透风雪，传到三十里外。
双方僵持了整整一天。
黄昏时，苍龙援军抵达。

铁壁关的城墙染上了血色。
苍龙守住了关隘，但付出了代价。
霜狼损失了三千骑兵，撤退到冰原深处。
这场边境冲突，将改变两国未来十年的关系。
`;
```

#### 政治事件转换

```typescript
// 政治事件模板
const politicalEventTemplate = {
  prelude: `
    {faction}的{location}，{politicalContext}。
    {leader}{leaderState}。
    {situationDesc}。
    {hiddenTension}。
  `,

  core: `
    {trigger}。
    {factionA}的{factionAAction}。
    {factionB}的{factionBResponse}。
    {keyDecision}。
    {stakeholderReactions}。
  `,

  aftermath: `
    {outcomeDesc}。
    {winner}获得了{gainDesc}。
    {loser}面临{lossDesc}。
    {futureHint}。
  `,
};

// 示例：夺嫡事件
const politicalNarrativeExample = `
苍龙帝都，皇宫深处。
老皇帝病重三月，朝堂之上，气氛凝重。
天枢站在大殿一侧，神情平静，眼神深邃。
二皇子破军则在另一侧，与军方将领低声交谈。
三皇子文曲坐在母后身边，面带微笑。
这表面的平静之下，夺嫡的暗流正在涌动。

忽然，一道旨意传来。
"大皇子天枢，暂代监国。"
破军的眼中闪过阴霾，军方将领开始低声议论。
文曲的笑容微微僵住。
首辅秋实站起身，躬身应命。
朝堂上，三分势力，三分心思。

天枢获得了监国的权力。
破军失去了名义上的优势，但握有军权。
文曲暂时观望，等待时机。
这场夺嫡之争，才刚刚进入白热化。
`;
```

#### 贸易事件转换

```typescript
// 贸易事件模板
const tradeEventTemplate = {
  prelude: `
    {location}的{marketDesc}。
    {traderA}与{traderB}正在{tradeContext}。
    {commodityDesc}。
    {marketAtmosphere}。
  `,

  core: `
    {negotiationStart}。
    {traderA}{offerA}。
    {traderB}{counterB}。
    {negotiationDetail}。
    {finalAgreement}。
  `,

  aftermath: `
    {tradeOutcome}。
    {profitDesc}。
    {relationshipChange}。
    {futureBusiness}。
  `,
};
```

### 2.3 事件转换算法实现

```typescript
// 事件转换核心算法
class EventNarrativeConverter {
  // 主转换函数
  convert(event: GameEvent, context: NarrativeContext): EventNarrative {
    // 1. 识别事件类型
    const eventType = this.identifyEventType(event);

    // 2. 选择对应模板
    const template = this.selectTemplate(eventType);

    // 3. 提取关键信息
    const keyInfo = this.extractKeyInfo(event, context);

    // 4. 应用阵营风格
    const styledTemplate = this.applyFactionStyle(
      template,
      event.faction,
      context.factionNarrativeStyles
    );

    // 5. 填充模板变量
    const narrative = this.fillTemplate(styledTemplate, keyInfo);

    // 6. 生成段落
    return this.formatNarrative(narrative);
  }

  // 事件类型识别
  identifyEventType(event: GameEvent): EventType {
    // 根据事件数据判断类型
    if (event.data.conflictType) return EventType.WAR;
    if (event.data.politicalContext) return EventType.POLITICAL;
    if (event.data.tradeContext) return EventType.TRADE;
    if (event.data.diplomacyType) return EventType.DIPLOMACY;
    if (event.data.personalMatter) return EventType.PERSONAL;
    if (event.data.crisisType) return EventType.CRISIS;
    if (event.data.relationshipChange) return EventType.ROMANCE;
    if (event.data.mysteryElement) return EventType.MYSTERY;

    // 默认类型
    return EventType.PERSONAL;
  }

  // 关键信息提取
  extractKeyInfo(event: GameEvent, context: NarrativeContext): KeyInfo {
    return {
      // 人物信息
      characters: this.extractCharacters(event),
      // 地点信息
      locations: this.extractLocations(event),
      // 时间信息
      timing: this.extractTiming(event, context.currentDay),
      // 数据变化
      dataChanges: this.extractDataChanges(event),
      // 后果信息
      consequences: this.extractConsequences(event),
    };
  }
}
```

---

## 三、数值变化→叙事描述模板

### 3.1 金币变化叙事模板

```typescript
// 金币变化→叙事映射
const goldChangeNarratives = {
  // 大额收益
  largeGain: {
    threshold: 500,
    templates: [
      "意外收获了一大笔财富。",
      "这笔交易的收益，超出所有人的预期。",
      "命运眷顾，今日财运亨通。",
      "金山银山般的收获，足以改变一切。",
    ],
  },

  // 中额收益
  mediumGain: {
    threshold: 100,
    templates: [
      "收获了一笔可观的收益。",
      "这笔交易的利润还不错。",
      "财运不错，今日有所得。",
      "不错的收获，足以应付近期的开销。",
    ],
  },

  // 小额收益
  smallGain: {
    threshold: 50,
    templates: [
      "收获了一笔小财。",
      "今日略有盈余。",
      "小赚一笔，聊胜于无。",
      "财运平平，但总算没亏。",
    ],
  },

  // 大额损失
  largeLoss: {
    threshold: 500,
    templates: [
      "一笔巨款就这样没了。",
      "损失惨重，这笔账算不通。",
      "千金散尽，换来的却是一场空。",
      "破财消灾？这笔损失，太大。",
    ],
  },

  // 中额损失
  mediumLoss: {
    threshold: 100,
    templates: [
      "损失了一笔不小的数目。",
      "这笔投资，没能收回成本。",
      "亏了不少，但还不算致命。",
      "财运不佳，今日有失。",
    ],
  },

  // 小额损失
  smallLoss: {
    threshold: 50,
    templates: [
      "小亏了一笔。",
      "略微亏损，算在预期之内。",
      "损失不大，可以承受。",
      "财运平平，略有损失。",
    ],
  },
};

// 金币叙事生成器
function generateGoldNarrative(
  change: number,
  context: NarrativeContext
): string {
  const absChange = Math.abs(change);

  if (change > 0) {
    // 收益
    if (absChange >= 500) {
      return randomSelect(goldChangeNarratives.largeGain.templates);
    } else if (absChange >= 100) {
      return randomSelect(goldChangeNarratives.mediumGain.templates);
    } else {
      return randomSelect(goldChangeNarratives.smallGain.templates);
    }
  } else {
    // 损失
    if (absChange >= 500) {
      return randomSelect(goldChangeNarratives.largeLoss.templates);
    } else if (absChange >= 100) {
      return randomSelect(goldChangeNarratives.mediumLoss.templates);
    } else {
      return randomSelect(goldChangeNarratives.smallLoss.templates);
    }
  }
}
```

### 3.2 影响力变化叙事模板

```typescript
// 影响力变化→叙事映射
const influenceChangeNarratives = {
  // 大幅提升
  largeGain: {
    threshold: 50,
    templates: [
      "声名鹊起，一时风头无两。",
      "影响力大涨，众人纷纷侧目。",
      "一鸣惊人，从此在[地区]无人不知。",
      "名望提升，地位随之稳固。",
    ],
  },

  // 中幅提升
  mediumGain: {
    threshold: 20,
    templates: [
      "声望有所提升。",
      "影响力略有增长，更多人开始注意到你。",
      "名声渐起，在[圈子]里开始有了分量。",
      "小有名气，前途看好。",
    ],
  },

  // 小幅提升
  smallGain: {
    threshold: 10,
    templates: [
      "略有声名。",
      "影响力微增，但还不够重要。",
      "小有名气，默默积累。",
      "起步阶段，还需努力。",
    ],
  },

  // 大幅下降
  largeLoss: {
    threshold: 50,
    templates: [
      "声名扫地，一夜之间跌落谷底。",
      "影响力大损，众叛亲离。",
      "名望骤降，往日的荣光已成过去。",
      "众议纷纷，质疑声四起。",
    ],
  },

  // 中幅下降
  mediumLoss: {
    threshold: 20,
    templates: [
      "声望受损，舆论开始转向。",
      "影响力下降，处境有些艰难。",
      "名望动摇，需要重建信任。",
      "略有争议，需要解释。",
    ],
  },

  // 小幅下降
  smallLoss: {
    threshold: 10,
    templates: [
      "微有争议，但不致命。",
      "声名略损，可以挽回。",
      "影响力小跌，不足挂齿。",
      "小有波折，整体平稳。",
    ],
  },
};
```

### 3.3 关系值变化叙事模板

```typescript
// 关系值变化→叙事映射
const relationChangeNarratives = {
  // 大幅友好
  largeFriendlyGain: {
    threshold: 30,
    templates: [
      "{npc}对你的态度发生了根本转变。",
      "与{npc}的关系，一夜之间变得亲密。",
      "{npc}开始信任你，把后背交给你。",
      "一段深厚的友谊，就这样建立起来。",
    ],
  },

  // 中幅友好
  mediumFriendlyGain: {
    threshold: 15,
    templates: [
      "与{npc}的关系有所改善。",
      "{npc}对你更加友善了。",
      "你和{npc}之间，多了一些默契。",
      "{npc}开始把你当成可以信任的人。",
    ],
  },

  // 小幅友好
  smallFriendlyGain: {
    threshold: 5,
    templates: [
      "与{npc}的关系略有改善。",
      "{npc}对你客气了一些。",
      "你和{npc}之间，少了一些隔阂。",
      "{npc}不再那么冷淡了。",
    ],
  },

  // 大幅敌意
  largeHostileGain: {
    threshold: 30,
    templates: [
      "{npc}对你彻底翻脸。",
      "与{npc}的关系，一夜之间破裂。",
      "{npc}把你当成敌人，处处针对。",
      "一段关系就这样结束，{npc}成了你的对手。",
    ],
  },

  // 中幅敌意
  mediumHostileGain: {
    threshold: 15,
    templates: [
      "与{npc}的关系恶化。",
      "{npc}对你开始有了敌意。",
      "你和{npc}之间，出现了裂痕。",
      "{npc}的态度变得冷淡，甚至带着刺。",
    ],
  },

  // 小幅敌意
  smallHostileGain: {
    threshold: 5,
    templates: [
      "与{npc}的关系略微恶化。",
      "{npc}对你有些不满。",
      "你和{npc}之间，有了些小摩擦。",
      "{npc}的态度冷淡了一些。",
    ],
  },
};

// 关系叙事生成器（包含对话风格映射）
function generateRelationNarrative(
  npcId: string,
  change: number,
  npc: NPCState,
  context: NarrativeContext
): string {
  const absChange = Math.abs(change);
  const direction = change > 0 ? 'friendly' : 'hostile';

  let template: string;

  if (direction === 'friendly') {
    if (absChange >= 30) template = randomSelect(relationChangeNarratives.largeFriendlyGain.templates);
    else if (absChange >= 15) template = randomSelect(relationChangeNarratives.mediumFriendlyGain.templates);
    else template = randomSelect(relationChangeNarratives.smallFriendlyGain.templates);
  } else {
    if (absChange >= 30) template = randomSelect(relationChangeNarratives.largeHostileGain.templates);
    else if (absChange >= 15) template = randomSelect(relationChangeNarratives.mediumHostileGain.templates);
    else template = randomSelect(relationChangeNarratives.smallHostileGain.templates);
  }

  // 填充NPC名称
  return template.replace('{npc}', npc.name);
}
```

### 3.4 技能经验变化叙事模板

```typescript
// 技能成长叙事
const skillGrowthNarratives = {
  // 技能升级（等级提升）
  levelUp: {
    templates: [
      "经过不懈努力，你的{skill}终于有了突破。",
      "{skill}的修炼达到新的境界。",
      "你对{skill}的理解加深，运用更加自如。",
      "{skill}进阶成功，曾经的难点不再困难。",
    ],
  },

  // 技能经验增长
  expGain: {
    thresholds: {
      large: { threshold: 50, templates: ["{skill}的掌握程度大幅提升。"] },
      medium: { threshold: 20, templates: ["{skill}有所精进。"] },
      small: { threshold: 10, templates: ["{skill}略有进步。"] },
    },
  },
};

// 属性变化叙事
const attributeChangeNarratives = {
  physique: {
    templates: {
      gain: ["身体更健壮了。", "体魄有所增强。", "体格更结实了。"],
      loss: ["体力下降了。", "身体状态欠佳。", "体魄有些衰退。"],
    },
  },
  wisdom: {
    templates: {
      gain: ["见识有所增长。", "智慧提升了。", "头脑更灵活了。"],
      loss: ["判断力下降。", "思路不如从前清晰。", "智慧有所衰退。"],
    },
  },
  // 其他属性...
};
```

---

## 四、关系变化→对话风格映射

### 4.1 关系等级→对话风格映射表

```typescript
// 关系等级定义
enum RelationLevel {
  ENEMY = 'enemy',       // -100 ~ -60：敌对
  HOSTILE = 'hostile',   // -60 ~ -30：敌意
  UNFRIENDLY = 'unfriendly', // -30 ~ -10：不友善
  NEUTRAL = 'neutral',   // -10 ~ +10：中立
  ACQUAINTANCE = 'acquaintance', // +10 ~ +30：认识
  FRIENDLY = 'friendly', // +30 ~ +60：友善
  FRIEND = 'friend',     // +60 ~ +80：友好
  CLOSE = 'close',       // +80 ~ +100：亲密
}

// 对话风格映射
const dialogueStyleMapping: Record<RelationLevel, DialogueStyle> = {
  enemy: {
    tone: 'hostile',
    greeting: ['"你还敢来？"', '"滚！"', '"别让我看见你。"', '"你不该出现在这里。"'],
    response: ['冷笑', '怒视', '沉默', '嘲讽'],
    action: ['转身离开', '摆出战斗姿态', '冷眼旁观', '指手画脚'],
    subtext: '明示敌意，暗示威胁',
  },

  hostile: {
    tone: 'cold',
    greeting: ['"...你来做什么？"', '"有话快说。"', '"没什么好谈的。"', '"别浪费时间。"'],
    response: ['冷淡', '不耐烦', '简短', '敷衍'],
    action: ['斜眼看', '转身', '不耐烦地等待', '打断'],
    subtext: '暗示敌意，表面冷淡',
  },

  unfriendly: {
    tone: 'distant',
    greeting: ['"...有什么事？"', '"说说看。"', '"有事说事。"', '"你..."'],
    response: ['客气但不热情', '简短', '保留三分', '观望'],
    action: ['微微点头', '站定', '不主动', '保持距离'],
    subtext: '保持距离，暂不表态',
  },

  neutral: {
    tone: 'neutral',
    greeting: ['"你好。"', '"...嗯。"', '"来谈谈吧。"', '"可以聊聊。"'],
    response: ['正常', '不主动', '随情况而定', '商业气息'],
    action: ['点头', '邀请坐下', '保持礼貌', '观察'],
    subtext: '可谈可走，全看利益',
  },

  acquaintance: {
    tone: 'polite',
    greeting: ['"你好啊。"', '"好久不见。"', '"来了？"', '"坐吧。"'],
    response: ['客气', '热情适中', '愿意多聊', '略带关心'],
    action: ['主动招呼', '让座', '倒茶', '询问近况'],
    subtext: '略有好感，愿意接触',
  },

  friendly: {
    tone: 'warm',
    greeting: ['"你来了！"', "老朋友！", '"快进来。"', '"等你好久了。"'],
    response: ['热情', '主动分享', '坦诚', '愿意帮忙'],
    action: ['起身迎接', '握手', '倒好茶', '主动询问'],
    subtext: '真心欢迎，可以信任',
  },

  friend: {
    tone: 'close',
    greeting: ['"兄弟/姐妹来了！"', '"快坐，我来泡茶。"', '"正想你呢。"', '"你怎么才来！"'],
    response: ['无保留', '主动关心', '分享秘密', '坦诚'],
    action: ['拥抱', '热烈招待', '促膝交谈', '主动帮忙'],
    subtext: '深厚情谊，彼此信任',
  },

  close: {
    tone: 'intimate',
    greeting: ['"...你来就好。"', '"我一直在等你。"', '"终于来了。"', '"你...还好吗？"'],
    response: ['无保留', '情感流露', '依赖', '愿意牺牲'],
    action: ['紧握双手', '眼眶湿润', '轻声问候', '关心细节'],
    subtext: '生死之交，命运绑定',
  },
};
```

### 4.2 对话生成示例

```typescript
// 根据关系生成对话
function generateDialogue(
  npc: NPCState,
  relationValue: number,
  topic: DialogueTopic,
  context: NarrativeContext
): GeneratedDialogue {
  // 1. 确定关系等级
  const relationLevel = getRelationLevel(relationValue);

  // 2. 获取对应风格
  const style = dialogueStyleMapping[relationLevel];

  // 3. 选择开场白
  const greeting = randomSelect(style.greeting);

  // 4. 根据阵营调整语气
  const factionAdjustedStyle = applyFactionDialogueStyle(
    style,
    npc.faction,
    context.factionDialogueStyles
  );

  // 5. 生成对话内容
  const dialogueContent = generateDialogueContent(
    greeting,
    topic,
    factionAdjustedStyle,
    context
  );

  // 6. 添加动作描写
  const actionNarrative = generateActionNarrative(
    randomSelect(style.action),
    npc,
    context
  );

  return {
    greeting: dialogueContent.greeting,
    body: dialogueContent.body,
    action: actionNarrative,
    subtext: style.subtext,
  };
}

// 示例输出
const dialogueExample = {
  // 关系值：+65（友好）
  relation: RelationLevel.FRIEND,

  // 生成结果
  output: `
【烈火】
"兄弟来了！"烈火起身迎接，眼中有光。
他快步走向门口，与玩家握手，
那力度很重，像是要把某种默契传递过来。

"正想你呢。改革的事，有个新消息——
血狼那边的态度，变了。"

他倒好茶，让玩家坐下。
整个动作流畅自然，没有客套。
这是老朋友的姿态，不需要虚礼。

玩家注意到，烈火的眼神中有期待。
那种期待，像是希望从玩家这里得到某种支持。
或者，某种认同。
  `,
};
```

---

## 五、玩家行为日志→小说素材抽取规则

### 5.1 行为日志数据结构

```typescript
// 玩家行为日志
interface PlayerActionLog {
  id: string;
  playerId: string;
  gameDay: number;
  timestamp: Date;

  // 行为类型
  actionType: PlayerActionType;

  // 行为详情
  details: {
    target?: string;       // 目标（NPC/地点/物品）
    choice?: string;       // 选择内容
    result?: string;       // 结果
    consequences?: string[]; // 后果列表
  };

  // 数据变化
  dataChanges: {
    gold?: number;
    influence?: number;
    attributes?: Record<string, number>;
    skills?: Record<string, number>;
    relations?: Record<string, number>;
    factionRep?: Record<string, number>;
  };

  //叙事重要性评分（由系统计算）
  narrativeImportance: number; // 1-10
}

// 行为类型
enum PlayerActionType {
  EVENT_CHOICE = 'event_choice',    // 事件选择
  NPC_DIALOGUE = 'npc_dialogue',    // NPC对话
  SKILL_TRAINING = 'skill_training', // 技能训练
  TRADE = 'trade',                  // 交易
  TRAVEL = 'travel',                 // 旅行
  COMBAT = 'combat',                 //战斗
  RESOURCE_MANAGEMENT = 'resource_mgmt', //资源管理
  FACTION_ACTION = 'faction_action', //阵营行动
}
```

### 5.2 行为重要性评分算法

```typescript
// 行为重要性评分器
class ActionImportanceScorer {
  score(action: PlayerActionLog, context: NarrativeContext): number {
    let score = 0;

    // 1. 行为类型权重
    score += this.getTypeWeight(action.actionType);

    // 2. 数据变化幅度
    score += this.getDataChangeWeight(action.dataChanges);

    // 3. 目标重要性
    if (action.details.target) {
      score += this.getTargetImportance(action.details.target, context);
    }

    // 4. 后果数量和严重性
    score += this.getConsequenceWeight(action.details.consequences);

    // 5. 与当前剧情关联度
    score += this.getPlotRelevance(action, context.activeStorylines);

    // 6. 独特性（非重复行为加分）
    score += this.getUniquenessWeight(action, context.recentActions);

    // 限制范围1-10
    return Math.max(1, Math.min(10, score));
  }

  getTypeWeight(actionType: PlayerActionType): number {
    const weights = {
      event_choice: 4,      // 事件选择最重要
      faction_action: 3,    // 阵营行动次之
      npc_dialogue: 2,      // 对话中等
      combat: 2,            //战斗中等
      trade: 1,             // 交易较低
      skill_training: 1,    // 训练较低
      travel: 1,            // 旅行较低
      resource_mgmt: 0.5,   // 资源管理最低
    };
    return weights[actionType] || 1;
  }

  getDataChangeWeight(changes: DataChanges): number {
    let weight = 0;

    // 金币大幅变化
    if (Math.abs(changes.gold || 0) >= 500) weight += 2;

    // 影响力大幅变化
    if (Math.abs(changes.influence || 0) >= 30) weight += 2;

    // 关系大幅变化
    for (const [npcId, value] of Object.entries(changes.relations || {})) {
      if (Math.abs(value) >= 20) weight += 1;
    }

    // 阵营声望大幅变化
    for (const [faction, value] of Object.entries(changes.factionRep || {})) {
      if (Math.abs(value) >= 15) weight += 1;
    }

    return weight;
  }
}
```

### 5.3 行为→叙事片段抽取算法

```typescript
// 行为抽取器
class ActionNarrativeExtractor {
  // 从当日行为中抽取小说素材
  extractDailyActions(
    actions: PlayerActionLog[],
    context: NarrativeContext
  ): NarrativeMaterial[] {
    // 1. 过滤重要性≥ 5的行为
    const significantActions = actions.filter(
      a => a.narrativeImportance >= 5
    );

    // 2. 按重要性排序
    significantActions.sort(
      (a, b) => b.narrativeImportance - a.narrativeImportance
    );

    // 3. 选择前3个行为（控制篇幅）
    const selectedActions = significantActions.slice(0, 3);

    // 4. 为每个行为生成叙事片段
    return selectedActions.map(action =>
      this.generateNarrativeFragment(action, context)
    );
  }

  // 生成单个叙事片段
  generateNarrativeFragment(
    action: PlayerActionLog,
    context: NarrativeContext
  ): NarrativeMaterial {
    const fragment: NarrativeMaterial = {
      actionId: action.id,
      type: action.actionType,
      importance: action.narrativeImportance,
      content: '',
    };

    switch (action.actionType) {
      case PlayerActionType.EVENT_CHOICE:
        fragment.content = this.generateEventChoiceNarrative(action, context);
        break;

      case PlayerActionType.NPC_DIALOGUE:
        fragment.content = this.generateDialogueNarrative(action, context);
        break;

      case PlayerActionType.COMBAT:
        fragment.content = this.generateCombatNarrative(action, context);
        break;

      case PlayerActionType.TRADE:
        fragment.content = this.generateTradeNarrative(action, context);
        break;

      default:
        fragment.content = this.generateGenericNarrative(action, context);
    }

    return fragment;
  }

  // 事件选择叙事生成
  generateEventChoiceNarrative(
    action: PlayerActionLog,
    context: NarrativeContext
  ): string {
    const event = context.events.find(e => e.id === action.details.target);
    if (!event) return '';

    // 生成选择描述
    const choiceNarrative = `
在【${event.title}】中，${context.playerName}做出了选择。
${action.details.choice}。

${this.generateDataChangeNarrative(action.dataChanges, context)}
    `;

    return choiceNarrative;
  }
}
```

### 5.4 行为叙事示例

```typescript
// 示例：玩家行为日志
const playerActionExample: PlayerActionLog = {
  id: 'action_001',
  playerId: 'player_001',
  gameDay: 15,
  timestamp: new Date('2026-04-16T08:00:00'),

  actionType: PlayerActionType.EVENT_CHOICE,

  details: {
    target: 'event_101',
    choice: '支持主战派，提供情报换取军事保护',
    result: '成功',
    consequences: [
      '获得苍龙军事庇护',
      '情报网消耗30%',
      '霜狼联邦关系-10',
    ],
  },

  dataChanges: {
    gold: -50,
    influence: +20,
    relations: {
      'npc_iron_wall': +15,
      'npc_fire': +10,
      'faction_shuanglang': -10,
    },
    factionRep: {
      'canglong': +15,
    },
  },

  narrativeImportance: 7,
};

// 生成叙事片段
const narrativeFragmentExample = `
【玩家纪事】

在【元老院紧急会议】中，玩家做出了抉择。

他选择支持主战派，用情报换取军事保护。
这个决定，换来的是铁壁将军的承诺——边境领地将获得苍龙军队的驻守。
代价是情报网的消耗，以及霜狼联邦的不满。

铁壁将军对玩家的评价上升了。
烈火也看到了玩家的诚意。
而霜狼联邦的使者北风，态度变得冷淡。

玩家的影响力上升了。
苍龙帝国的声望提高了。
这是夺嫡之争中，一个普通人的站位——
他将自己的命运，绑在了苍龙的战车上。
`;
```

---

## 六、章节生成集成算法

### 6.1 完整章节生成流程

```typescript
// 章节生成器
class ChapterGenerator {
  async generateChapter(
    day: number,
    gameState: GameState,
    previousChapter?: Chapter
  ): Promise<Chapter> {
    // 1. 收集当日事件
    const dailyEvents = this.collectDailyEvents(gameState, day);

    // 2. 收集玩家行为
    const playerActions = this.collectPlayerActions(gameState, day);

    // 3. 事件重要性排序
    const prioritizedEvents = this.prioritizeEvents(dailyEvents);

    // 4. 抽取玩家叙事素材
    const playerNarratives = this.extractPlayerNarratives(playerActions);

    // 5. 生成本章内容各节
    const sections = {
      intro: await this.generateIntro(day, gameState),
      mainSection: await this.generateMainSection(prioritizedEvents, gameState),
      heroSection: await this.generateHeroSection(gameState, day),
      rumorSection: await this.generateRumorSection(gameState),
      playerSection: await this.generatePlayerSection(playerNarratives),
    };

    // 6. 组装章节
    const chapter = this.assembleChapter(sections, day, previousChapter);

    // 7. 一致性检查
    const consistencyReport = this.checkConsistency(chapter, gameState);
    if (!consistencyReport.valid) {
      chapter = this.fixConsistency(chapter, consistencyReport.issues);
    }

    return chapter;
  }

  // 四国风云节生成
  async generateMainSection(
    events: PrioritizedEvent[],
    gameState: GameState
  ): Promise<SectionContent> {
    const factionNarratives: FactionNarrative[] = [];

    // 为每个阵营生成叙事
    for (const faction of ['canglong', 'shuanglang', 'jinque', 'border']) {
      const factionEvents = events.filter(e => e.faction === faction);
      const narrative = await this.generateFactionNarrative(
        faction,
        factionEvents,
        gameState
      );
      factionNarratives.push(narrative);
    }

    // 组装成节
    return this.assembleFactionSection(factionNarratives);
  }

  // 英雄列传节生成
  async generateHeroSection(
    gameState: GameState,
    day: number
  ): Promise<SectionContent> {
    // 选择2-3个主角NPC
    const selectedHeroes = this.selectHeroesForDay(gameState, day);

    // 为每个主角生成故事
    const heroStories = await Promise.all(
      selectedHeroes.map(hero =>
        this.generateHeroStory(hero, gameState, day)
      )
    );

    return this.assembleHeroSection(heroStories);
  }
}
```

### 6.2 生成质量控制

```typescript
// 质量检查器
class QualityChecker {
  check(chapter: Chapter, gameState: GameState): QualityReport {
    const issues: QualityIssue[] = [];

    // 1. 字数检查
    issues.push(...this.checkWordCount(chapter));

    // 2. 人物一致性检查
    issues.push(...this.checkCharacterConsistency(chapter, gameState));

    // 3. 时间线检查
    issues.push(...this.checkTimeline(chapter, gameState));

    // 4. 阵营风格检查
    issues.push(...this.checkFactionStyle(chapter));

    // 5. 悬念密度检查
    issues.push(...this.checkSuspenseDensity(chapter));

    // 6. 语言风格检查
    issues.push(...this.checkLanguageStyle(chapter));

    return {
      valid: issues.length === 0,
      issues,
      score: this.calculateQualityScore(issues),
    };
  }
}
```

---

## 七、MVP简化实现

### 7.1 MVP阶段转换规则简化

```
MVP简化策略：
──────────────────────────────────────────────────────────────

【保留核心】
- 事件类型识别（5种基本类型）
- 数值变化叙事（金币/影响力/关系）
- 阵营风格适配（4阵营基本风格）
- 玩家行为抽取（重要性≥ 5的行为）

【暂缓实现】
- 复杂的人物一致性检查
- 多维度悬念密度控制
- 高级对话风格生成
- 实时质量反馈系统

【MVP输出】
- 每章3000字（而非5000字）
- 简化四节结构
- 模板化叙事为主，LLM辅助
```

---

*文档版本：MVP v1.0*
*创建日期：2026-04-16*
*状态：已完成*