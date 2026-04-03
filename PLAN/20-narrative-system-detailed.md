# 《三界风云录》叙事系统设计文档

> 版本：MVP v1.0
> 设计目标：打造"活的历史小说"体验，让玩家每天阅读3000-5000字的历史演义风格小说章节

---

## 一、叙事系统核心架构

### 1.1 系统定位

```
┌─────────────────────────────────────────────────────────────┐
│                     叙事系统定位                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  传统游戏叙事          三界风云录叙事                         │
│  ─────────────         ───────────────                       │
│  预设剧情              动态生成的小说                         │
│  玩家是主角            玩家是历史参与者                        │
│  一次性体验            每日连载更新                           │
│  固定视角              多视角切换                             │
│                                                              │
│  核心体验：每天打开游戏 = 打开一本正在连载的历史小说           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 叙事内容三层结构

```
┌─────────────────────────────────────────────────────────────┐
│                    叙事内容金字塔                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│         ┌─────────────┐                                     │
│         │   主线叙事   │  ← 四国大事件、战争、政治           │
│         │  (国家Agent) │     每天1-2条，300-500字            │
│         └──────┬──────┘                                     │
│                │                                            │
│         ┌──────┴──────┐                                     │
│         │   支线叙事   │  ← 主角NPC个人故事、人际关系         │
│         │  (主角系统)  │     每天2-3条，200-400字             │
│         └──────┬──────┘                                     │
│                │                                            │
│         ┌──────┴──────┐                                     │
│         │   玩家插叙   │  ← 玩家行动被记录在叙事中            │
│         │  (玩家事件)  │     根据玩家行为动态插入             │
│         └─────────────┘                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 叙事生成流程

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  世界状态  │───→│  事件识别  │───→│  叙事生成  │───→│  小说章节  │
│  收集    │    │  与筛选   │    │  (LLM)   │    │  输出    │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
      │              │              │              │
      ▼              ▼              ▼              ▼
  读取所有Agent   按重要性排序   历史演义风格    3000-5000字
  的状态变化     筛选Top 5-8    多视角切换      分章节呈现
```

---

## 二、每日小说生成系统

### 2.1 小说章节结构

每章标准结构（约3000-5000字）：

```
第X回 [章节标题]

【卷首语】（50-100字）
以说书人/史官口吻引出本章主题

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【第一节：四国风云】（800-1200字）

◆ 苍龙帝国
[国家大事叙述，300-400字]

◆ 霜狼联邦
[国家大事叙述，200-300字]

◆ 金雀花王国
[国家大事叙述，200-300字]

◆ 边境联盟
[地区动态叙述，100-200字]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【第二节：英雄列传】（1000-1500字）

主角NPC视角故事（选择2-3个主角）：

【天枢传】（或【苍狼传】/【金潮传】/【老根传】）
[主角个人故事线，400-600字]

【另一主角传】
[主角个人故事线，400-600字]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【第三节：江湖异闻】（500-800字）

次要NPC动态、民间传闻、神秘事件

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【第四节：玩家纪事】（300-500字）

[如果玩家有重要行动则插入，否则省略]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【本回终】
留下悬念或预告下回内容
```

### 2.2 小说生成Prompt模板

#### 主Prompt：章节生成器

```typescript
const chapterGenerationPrompt = `
你是一位历史演义小说作家，正在为《三界风云录》撰写第{chapterNumber}回。

## 世界背景
这是一个类似《三国演义》的奇幻世界，有四个势力：
- 苍龙帝国：东方风格，中央集权，重礼法，元素魔法
- 霜狼联邦：北方部落，崇尚武力，符文战魂
- 金雀花王国：商业王国，契约魔法，海上贸易
- 边境联盟（灰烬谷）：三不管地带，自由都市，玩家起点

## 当前时间
游戏第{gameDay}天，{season}，{weather}

## 本章需要涵盖的事件（按重要性排序）
{events}

## 四国主角当前状态
1. 苍龙主角：{canglongHero.name} - {canglongHero.status}
   当前故事线：{canglongHero.storyline}

2. 霜狼主角：{shuanglangHero.name} - {shuanglangHero.status}
   当前故事线：{shuanglangHero.storyline}

3. 金雀花主角：{jinqueHero.name} - {jinqueHero.status}
   当前故事线：{jinqueHero.storyline}

4. 边境主角：{borderHero.name} - {borderHero.status}
   当前故事线：{borderHero.storyline}

## 玩家相关事件
{playerEvents}

## 前几章关键剧情回顾
{previousPlotSummary}

## 写作要求

1. **风格要求**：
   - 仿《三国演义》历史演义风格
   - 文白夹杂，有古典韵味但易于理解
   - 善用"话说"、"且说"、"正是"等说书人口吻

2. **结构要求**：
   - 总字数：3000-5000字
   - 分四节：四国风云、英雄列传、江湖异闻、玩家纪事
   - 每节之间用"━━━━━━━━━━━━━━━━━━━━━━━"分隔

3. **叙事视角**：
   - 全知视角为主，可穿插人物内心独白
   - 适当使用交叉叙事（同一时间不同地点）
   - 主角列传采用半传记体

4. **人物塑造**：
   - 保持人物性格一致性（参考人物设定）
   - 通过对话和行动展现性格
   - 重要决策要有内心挣扎描写

5. **情节安排**：
   - 每章要有起承转合
   - 至少设置一个悬念或伏笔
   - 战争/冲突场面要有战略描写

6. **输出格式**：
   ```
   第X回 [七字或八字章节名]

   【卷首语】
   ...

   【第一节：四国风云】
   ...

   【第二节：英雄列传】
   ...

   【第三节：江湖异闻】
   ...

   【第四节：玩家纪事】（可选）
   ...

   【本回终】
   ...
   ```

请生成完整的一回小说内容。
`;
```

#### 辅助Prompt：人物描写生成器

```typescript
const characterDescriptionPrompt = `
为以下NPC生成一段人物出场描写：

NPC：{name}
身份：{title}
性格：{personality}
当前状态：{status}

要求：
1. 80-150字
2. 仿《三国演义》人物出场描写风格
3. 包含外貌、气质、旁人评价
4. 使用对偶、排比等修辞手法

示例：
"只见那人身长八尺，面如冠玉，头戴纶巾，身披鹤氅，飘飘然有神仙之概。
眉宇间一股英气，谈吐处满座皆惊。旁观众人暗叹：'此真王佐之才也！'"
`;
```

#### 辅助Prompt：对话生成器

```typescript
const dialogueGenerationPrompt = `
为以下场景生成对话：

场景：{scene}
参与人物：{characters}
对话目的：{purpose}
人物关系：{relationships}

要求：
1. 符合各人物性格特点
2. 有潜台词和言外之意
3. 适当使用古典白话
4. 300-500字
5. 包含动作和神态描写

对话风格参考：
- 谋士：引经据典，言辞委婉
- 武将：直来直去，豪迈粗犷
- 商人：精明算计，话留三分
- 文人：诗词典故，清高自许
`;
```

### 2.3 记忆管理方案

#### 长期记忆架构

```
┌─────────────────────────────────────────────────────────────┐
│                    叙事记忆分层系统                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 1: 核心记忆（永久存储）                                │
│  ─────────────────────────────                               │
│  • 人物死亡、国家覆灭等重大事件                               │
│  • 主角NPC的关键转折点                                       │
│  • 玩家的重大选择及其后果                                     │
│  • 国际关系的基本格局                                         │
│                                                              │
│  Layer 2: 中期记忆（最近30天）                                │
│  ─────────────────────────────                               │
│  • 近期发生的战争、政变、联盟                                 │
│  • 主角NPC的故事线进展                                        │
│  • 活跃NPC的关系变化                                          │
│  • 正在进行中的事件链                                         │
│                                                              │
│  Layer 3: 短期记忆（最近7天）                                 │
│  ─────────────────────────────                               │
│  • 上一章的具体剧情                                           │
│  • 刚刚发生的小冲突                                           │
│  • 临时的关系波动                                             │
│  • 未解决的小悬念                                             │
│                                                              │
│  Layer 4: 上下文记忆（当天）                                   │
│  ─────────────────────────────                               │
│  • 当天发生的事件                                             │
│  • 当天的人物互动                                             │
│  • 当天的决策结果                                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 记忆压缩策略

```typescript
interface NarrativeMemory {
  // Layer 1: 核心记忆（摘要形式）
  coreMemory: {
    majorEvents: Array<{
      id: string;
      type: 'death' | 'war' | 'alliance' | 'betrayal' | 'coronation';
      description: string;  // 50字以内摘要
      timestamp: number;
      importance: number;   // 1-10
    }>;
    characterArcs: Map<string, string>;  // 人物ID -> 故事线摘要
    worldState: string;  // 世界格局一句话描述
  };

  // Layer 2-3: 近期记忆（详细摘要）
  recentHistory: Array<{
    day: number;
    summary: string;     // 200字以内章节摘要
    keyEvents: string[]; // 关键事件列表
    activeCharacters: string[]; // 活跃人物
  }>;

  // Layer 4: 当前上下文（完整细节）
  currentContext: {
    pendingEvents: Event[];
    ongoingConflicts: Conflict[];
    characterStates: Map<string, CharacterState>;
  };
}

// 记忆压缩示例
function compressChapter(chapter: Chapter): string {
  return `
    第${chapter.number}回：${chapter.title}
    关键事件：${chapter.keyEvents.map(e => e.summary).join('；')}
    人物动态：${chapter.activeCharacters.map(c =>
      `${c.name}${c.action ? `（${c.action}）` : ''}`
    ).join('、')}
    悬念：${chapter.cliffhanger || '无'}
  `;
}
```

#### 记忆检索策略

```typescript
// 为Prompt生成记忆上下文
function generateMemoryContext(
  currentDay: number,
  focusCharacters: string[],
  memorySystem: NarrativeMemory
): string {
  const parts: string[] = [];

  // 1. 世界格局（始终包含）
  parts.push(`【世界格局】${memorySystem.coreMemory.worldState}`);

  // 2. 相关人物的关键转折
  for (const charId of focusCharacters) {
    const arc = memorySystem.coreMemory.characterArcs.get(charId);
    if (arc) {
      parts.push(`【${charId}故事线】${arc}`);
    }
  }

  // 3. 最近7天摘要
  const recent = memorySystem.recentHistory
    .filter(h => currentDay - h.day <= 7)
    .map(h => `第${h.day}天：${h.summary}`)
    .join('\n');
  parts.push(`【近期剧情】\n${recent}`);

  // 4. 昨天的重要细节
  const yesterday = memorySystem.recentHistory.find(
    h => h.day === currentDay - 1
  );
  if (yesterday) {
    parts.push(`【昨日回顾】${yesterday.summary}`);
  }

  return parts.join('\n\n');
}
```

---

## 三、"实时造英雄"机制

### 3.1 主角NPC系统

#### 四国主角设定

```
┌─────────────────────────────────────────────────────────────┐
│                      四国主角配置                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  【苍龙帝国】天枢                                            │
│  ─────────────────                                           │
│  身份：大皇子，嫡长子，42岁                                   │
│  标签：隐忍、城府深、不得军心                                 │
│  主线：夺嫡之争                                              │
│  故事弧：隐忍待发 → 危机爆发 → 绝地反击 → 登基/失败           │
│  内心冲突：正统身份 vs 实际权力，兄弟之情 vs 皇位之争          │
│                                                              │
│  【霜狼联邦】苍狼                                            │
│  ─────────────────                                           │
│  身份：联邦首领，40岁                                         │
│  标签：魅力、远见、改革派                                     │
│  主线：联邦现代化改革 vs 保守势力                             │
│  故事弧：改革起步 → 阻力重重 → 危机抉择 → 联邦新生/分裂       │
│  内心冲突：传统荣誉 vs 现实生存，个人理想 vs 部族利益          │
│                                                              │
│  【金雀花王国】金潮                                          │
│  ─────────────────                                           │
│  身份：银行家/议长，50岁                                      │
│  标签：精明、有原则、被贵族敌视                               │
│  主线：商业资本 vs 传统贵族                                   │
│  故事弧：商业帝国 → 政治危机 → 背水一战 → 新秩序/旧贵族复辟   │
│  内心冲突：商业利益 vs 政治责任，个人野心 vs 王国未来          │
│                                                              │
│  【边境联盟】老根                                            │
│  ─────────────────                                           │
│  身份：暮光村村长，63岁                                       │
│  标签：睿智、务实、年老体衰                                   │
│  主线：灰烬谷的独立与生存                                     │
│  故事弧：和平维持 → 三国渗透 → 危机抉择 → 独立建国/选择效忠   │
│  内心冲突：和平理想 vs 现实威胁，个人中立 vs 被迫站队          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 主角故事线设计

```typescript
interface HeroStoryline {
  heroId: string;
  currentAct: number;      // 当前幕（1-5）
  currentScene: number;    // 当前场景

  // 五幕结构
  acts: Array<{
    name: string;          // 幕名称
    theme: string;         // 主题
    goal: string;          // 本幕目标
    obstacles: string[];   // 障碍
    climax: string;        // 高潮
    resolution: string;    // 结局（可能成功或失败）
  }>;

  // 关系网络
  relationships: Map<string, {
    characterId: string;
    type: 'ally' | 'enemy' | 'rival' | 'mentor' | 'family';
    strength: number;      // -100 to 100
    dynamic: string;       // 关系动态描述
  }>;

  // 内心状态
  innerState: {
    motivation: string;    // 当前动机
    fear: string;          // 内心恐惧
    conflict: string;      // 内在冲突
    growth: number;        // 成长度（0-100）
  };

  // 当前困境
  currentDilemma: {
    situation: string;     // 处境描述
    options: Array<{
      description: string;
      consequence: string;
      alignment: 'pragmatic' | 'idealistic' | 'ruthless' | 'honorable';
    }>;
    deadline: number;      // 决策截止（游戏日）
  };
}

// 天枢故事线示例
const tianshuStoryline: HeroStoryline = {
  heroId: 'tianshu',
  currentAct: 1,
  currentScene: 3,
  acts: [
    {
      name: '隐忍待发',
      theme: '等待与观察',
      goal: '在父皇病重、弟弟虎视眈眈的情况下保住地位',
      obstacles: ['破军的军权', '文曲的母后支持', '秋实的突然死亡'],
      climax: '父皇病危，必须在皇位继承上表态',
      resolution: '成功联合关键势力 / 被边缘化'
    },
    {
      name: '危机爆发',
      theme: '生死存亡',
      goal: '在夺嫡白热化中存活并占据优势',
      obstacles: ['破军的军事政变威胁', '文曲的合法继承权', '朝中大臣的摇摆'],
      climax: '皇位继承的最终对决',
      resolution: '登基 / 失败流亡 / 死亡'
    },
    // ... 更多幕
  ],
  // ... 其他属性
};
```

### 3.2 主角小说生成系统

#### 主角视角章节结构

```
第X章 [主角名]·[章节主题]

【题记】（可选）
一句反映主角心境的诗句或名言

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【场景一：现状】（500-800字）
主角当前处境描述
内心独白
环境渲染

【场景二：冲突】（800-1200字）
与他人的互动/冲突
对话和行动
主角的决策过程

【场景三：转折】（500-800字）
事件的结果
主角的感悟/变化
为下一章埋下伏笔

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【本章人物关系变化】
与XX的关系：友好 → 紧张
与XX的关系：陌生 → 认识

【本章属性变化】
政治智慧 +1
声望 +5

【下章预告】
（可选）暗示下章发展
```

#### 主角视角Prompt

```typescript
const heroPerspectivePrompt = `
你为《三界风云录》撰写${heroName}视角的个人章节。

## 主角信息
姓名：${heroName}
身份：${heroTitle}
性格：${heroPersonality}
当前处境：${heroSituation}

## 故事进度
当前幕：${currentAct.name}（${currentAct.theme}）
本幕目标：${currentAct.goal}
当前困境：${currentDilemma.situation}

## 关键关系
${relationships.map(r => `- ${r.characterId}：${r.type}（亲密度${r.strength}）`).join('\n')}

## 内心状态
动机：${innerState.motivation}
恐惧：${innerState.fear}
冲突：${innerState.conflict}

## 本章事件
${currentEvents}

## 写作要求

1. **视角要求**：
   - 第三人称限知视角（跟随主角）
   - 深入主角内心，展现其思考和情感
   - 主角不知道的信息不要写

2. **叙事节奏**：
   - 场景一：铺垫（主角日常/当前状态）
   - 场景二：冲突（事件爆发/人际互动）
   - 场景三：转折（决策与后果/内心变化）

3. **对话要求**：
   - 符合人物身份和性格
   - 有潜台词，言外之意
   - 适当使用古典白话

4. **心理描写**：
   - 主角的犹豫和挣扎
   - 回忆和联想
   - 对未来的担忧或期待

5. **篇幅要求**：
   - 总字数：1500-2500字
   - 场景一：500-800字
   - 场景二：800-1200字
   - 场景三：500-800字

请生成完整的个人章节内容。
`;
```

### 3.3 主角与普通NPC的交互机制

#### 交互层次设计

```
┌─────────────────────────────────────────────────────────────┐
│                  主角-NPC交互层次                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Level 4: 命运交织（关键NPC）                                │
│  ─────────────────────────────                               │
│  • 与主角的故事线深度绑定                                     │
│  • 主角的决策会直接影响其命运                                 │
│  • 在主角个人章节中有大量戏份                                 │
│  • 示例：天枢的心腹谋士、破军的副将                          │
│                                                              │
│  Level 3: 重要互动（盟友/敌人）                               │
│  ─────────────────────────────                               │
│  • 定期与主角互动                                            │
│  • 关系会影响主角的目标达成                                   │
│  • 在关键节点出现                                            │
│  • 示例：朝中有影响力的大臣、敌国使者                        │
│                                                              │
│  Level 2: 日常互动（下属/同僚）                               │
│  ─────────────────────────────                               │
│  • 在主角的日常场景中出现                                     │
│  • 提供信息或服务                                            │
│  • 偶尔影响小决策                                            │
│  • 示例：府中管家、侍卫、传令兵                              │
│                                                              │
│  Level 1: 背景提及（路人/传闻）                               │
│  ─────────────────────────────                               │
│  • 只在对话或叙述中被提及                                     │
│  • 不直接互动                                                │
│  • 丰富世界背景                                              │
│  • 示例：远方将领、民间传闻人物                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 交互事件生成

```typescript
interface HeroNPCInteraction {
  id: string;
  heroId: string;
  npcId: string;
  level: 1 | 2 | 3 | 4;

  // 交互内容
  scene: {
    setting: string;       // 场景设定
    trigger: string;       // 触发原因
    heroMood: string;      // 主角心情
    npcMood: string;       // NPC心情
  };

  // 对话结构
  dialogue: Array<{
    speaker: string;
    content: string;
    emotion: string;
    subtext: string;       // 潜台词
  }>;

  // 结果
  outcome: {
    relationshipChange: number;
    heroInsight: string;   // 主角获得的认知
    plotImpact: string;    // 对主线的潜在影响
  };
}

// 生成交互事件
function generateInteraction(
  hero: Hero,
  npc: NPC,
  context: WorldContext
): HeroNPCInteraction {
  // 根据关系等级和当前情境生成交互
  // 使用LLM生成具体对话内容
}
```

### 3.4 主角继承和更替机制

#### 主角死亡/更替处理

```typescript
interface HeroSuccession {
  // 当前主角状态
  currentHero: {
    id: string;
    status: 'active' | 'dying' | 'dead' | 'exiled';
    cause?: string;        // 死亡/失势原因
  };

  // 潜在继承者
  candidates: Array<{
    id: string;
    name: string;
    title: string;
    claimStrength: number; // 继承合法性 1-10
    capability: number;    // 能力值 1-10
    support: number;       // 支持度 1-10
    storyline: string;     // 潜在新故事线
  }>;

  // 继承结果
  successor: {
    id: string;
    successionType: 'inheritance' | 'usurpation' | 'election' | 'conquest';
    transitionEvent: string; // 权力交接事件描述
    newStoryline: HeroStoryline;
  };
}

// 主角更替流程
async function handleHeroSuccession(
  deceasedHero: Hero,
  worldState: WorldState
): Promise<HeroSuccession> {
  // 1. 确定潜在继承者
  const candidates = findSuccessionCandidates(deceasedHero);

  // 2. 使用LLM生成交接叙事
  const successionNarrative = await generateSuccessionStory(
    deceasedHero,
    candidates,
    worldState
  );

  // 3. 生成新主角的故事线
  const newStoryline = generateNewHeroStoryline(
    successionNarrative.successor,
    deceasedHero.legacy
  );

  // 4. 更新世界状态
  await updateWorldState(successionNarrative);

  return successionNarrative;
}
```

#### 主角更替叙事示例

```
【天枢失势/死亡后的继承】

如果天枢在夺嫡中失败：
- 继承者：破军（二皇子）或文曲（三皇子）
- 叙事焦点转移：从夺嫡之争转向新皇帝的治国挑战
- 天枢视角终结：最后一章描写天枢的末路（流放/死亡/隐匿）

如果天枢成功登基：
- 继续天枢的故事线
- 新主题：从"争夺权力"到"运用权力"
- 新冲突：治国理政中的新挑战（叛乱、天灾、外敌）
```

---

## 四、叙事内容协调机制

### 4.1 主线、支线、插叙的协调

#### 内容优先级算法

```typescript
interface NarrativePriority {
  event: GameEvent;
  priority: number;
  category: 'main' | 'sub' | 'player';
}

function calculatePriority(event: GameEvent): NarrativePriority {
  let priority = 0;

  // 基础重要性
  priority += event.importance * 10;

  // 时效性（越新越高）
  const ageInDays = currentDay - event.day;
  priority += Math.max(0, 7 - ageInDays) * 5;

  // 主角关联度
  if (event.involvedHeroes.includes(currentHeroId)) {
    priority += 20;
  }

  // 玩家关联度
  if (event.involvedPlayers.includes(currentPlayerId)) {
    priority += 30;
  }

  // 悬念延续（未解决的事件优先级更高）
  if (!event.resolved) {
    priority += 15;
  }

  // 分类
  let category: 'main' | 'sub' | 'player';
  if (event.type === 'war' || event.type === 'coup') {
    category = 'main';
  } else if (event.involvedPlayers.length > 0) {
    category = 'player';
  } else {
    category = 'sub';
  }

  return { event, priority, category };
}

// 每日内容选择
function selectDailyContent(
  allEvents: GameEvent[],
  targetWordCount: number
): NarrativeContent {
  // 计算所有事件优先级
  const priorities = allEvents.map(calculatePriority);

  // 按优先级排序
  priorities.sort((a, b) => b.priority - a.priority);

  // 选择内容
  const selectedEvents = {
    main: priorities.filter(p => p.category === 'main').slice(0, 4),
    sub: priorities.filter(p => p.category === 'sub').slice(0, 3),
    player: priorities.filter(p => p.category === 'player').slice(0, 2)
  };

  // 根据字数分配空间
  return allocateWordCount(selectedEvents, targetWordCount);
}
```

#### 叙事节奏控制

```typescript
interface NarrativePacing {
  // 每章的节奏安排
  rhythm: Array<{
    type: 'exposition' | 'rising' | 'climax' | 'falling' | 'resolution';
    length: number;        // 字数
    content: string[];     // 包含的事件ID
  }>;

  // 每周的节奏（7天为一个周期）
  weeklyArc: {
    day1: 'setup';         // 铺垫新冲突
    day2: 'development';   // 冲突发展
    day3: 'development';
    day4: 'turning';       // 转折点
    day5: 'climax';        // 小高潮
    day6: 'resolution';    // 解决
    day7: 'transition';    // 过渡，引入新线索
  };
}

// 根据当前游戏日调整叙事节奏
function adjustPacingForDay(
  day: number,
  pendingEvents: GameEvent[]
): NarrativePacing {
  const dayInWeek = day % 7;

  switch (dayInWeek) {
    case 1: // 周一：新开始
      return { rhythm: [/* 以介绍新事件为主 */] };
    case 5: // 周五：小高潮
      return { rhythm: [/* 以冲突和转折为主 */] };
    case 7: // 周日：悬念
      return { rhythm: [/* 以悬念和预告为主 */] };
    default:
      return { rhythm: [/* 平衡发展 */] };
  }
}
```

### 4.2 叙事一致性保障

#### 人物一致性检查

```typescript
interface CharacterConsistency {
  characterId: string;

  // 核心特质（不可轻易改变）
  coreTraits: string[];

  // 可变特质（可以发展）
  developmentTraits: Array<{
    trait: string;
    currentValue: number;
    arcDirection: 'increasing' | 'decreasing' | 'fluctuating';
  }>;

  // 关键记忆
  keyMemories: Array<{
    event: string;
    emotionalImpact: number;
    effect: string;
  }>;
}

// 检查生成内容的一致性
function checkCharacterConsistency(
  generatedText: string,
  character: CharacterConsistency
): ConsistencyReport {
  const issues: string[] = [];

  // 1. 检查核心特质是否被违反
  for (const trait of character.coreTraits) {
    if (textContradictsTrait(generatedText, trait)) {
      issues.push(`违反核心特质：${trait}`);
    }
  }

  // 2. 检查发展特质是否跳跃
  for (const trait of character.developmentTraits) {
    const change = detectTraitChange(generatedText, trait.trait);
    if (Math.abs(change) > 2) {  // 单次变化过大
      issues.push(`${trait.trait}变化过快：${change}`);
    }
  }

  // 3. 检查关键记忆是否被忽视
  for (const memory of character.keyMemories) {
    if (shouldReferenceMemory(generatedText, memory) &&
        !referencesMemory(generatedText, memory)) {
      issues.push(`未体现关键记忆的影响：${memory.event}`);
    }
  }

  return { valid: issues.length === 0, issues };
}
```

---

## 五、成本估算与优化

### 5.1 LLM调用成本分析

#### 每日成本估算

```
┌─────────────────────────────────────────────────────────────┐
│                    每日LLM调用成本                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  调用类型              次数    模型        单次成本    日成本  │
│  ─────────────────────────────────────────────────────────  │
│  主章节生成            1      Claude      $0.15      $0.15  │
│  主角个人章节          2-4    Claude      $0.08      $0.24  │
│  晨报生成              1      GPT-4       $0.05      $0.05  │
│  NPC对话生成          10-20   GPT-3.5     $0.002     $0.03  │
│  描述生成             5-10    GPT-3.5     $0.001     $0.01  │
│                                                              │
│  每日总成本（每活跃用户）：约 $0.50                           │
│  每月成本（每活跃用户）：约 $15                               │
│                                                              │
│  1000 DAU 预估月成本：$15,000                                │
│  10000 DAU 预估月成本：$150,000                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 成本优化策略

```typescript
// 分层模型策略
const modelTiers = {
  tier1: {
    model: 'claude-sonnet-4-6',
    useFor: ['main_chapter', 'hero_chapter', 'major_events'],
    costPer1kTokens: 0.015
  },
  tier2: {
    model: 'gpt-4',
    useFor: ['morning_news', 'event_descriptions', 'npc_dialogues'],
    costPer1kTokens: 0.005
  },
  tier3: {
    model: 'gpt-3.5-turbo',
    useFor: ['routine_dialogues', 'simple_descriptions', 'summaries'],
    costPer1kTokens: 0.0005
  }
};

// 缓存策略
interface NarrativeCache {
  // 模板缓存
  templates: Map<string, string>;

  // 生成内容缓存（短时间重复请求）
  generatedContent: Map<string, {
    content: string;
    timestamp: number;
    ttl: number;
  }>;

  // 摘要缓存
  summaries: Map<string, string>;
}

// 批量生成策略
async function batchGenerate(
  requests: GenerationRequest[],
  batchSize: number = 5
): Promise<GeneratedContent[]> {
  // 合并相似请求，减少调用次数
  const batched = mergeSimilarRequests(requests);

  // 并行生成
  const results = await Promise.all(
    batched.map(batch => generateBatch(batch))
  );

  return results.flat();
}
```

### 5.2 质量保障机制

#### 人工审核流程

```
┌─────────────────────────────────────────────────────────────┐
│                   叙事内容审核流程                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  自动生成 ──→ AI初审 ──→ 人工抽检 ──→ 发布 ──→ 反馈收集    │
│     │          │          │         │         │           │
│     │          │          │         │         │           │
│     ▼          ▼          ▼         ▼         ▼           │
│   LLM生成   检查规则：   10%样本    定时     玩家反馈      │
│             - 一致性    人工阅读   发布    - 点赞/踩       │
│             - 敏感词    - 质量评分         - 举报         │
│             - 逻辑bug   - 修改建议         - 评论         │
│                                                              │
│  紧急处理：发现问题 → 立即下线 → 修正 → 重新发布            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 六、技术实现接口

### 6.1 TypeScript接口定义

```typescript
// 叙事系统核心接口

interface NarrativeEngine {
  // 生成每日小说章节
  generateDailyChapter(params: ChapterGenerationParams): Promise<Chapter>;

  // 生成主角个人章节
  generateHeroChapter(heroId: string, day: number): Promise<HeroChapter>;

  // 生成晨报
  generateMorningNews(day: number): Promise<NewsArticle[]>;

  // 记录玩家事件到叙事
  recordPlayerEvent(event: PlayerEvent): Promise<void>;

  // 获取叙事历史
  getNarrativeHistory(filters: HistoryFilters): Promise<Chapter[]>;
}

interface ChapterGenerationParams {
  day: number;
  season: Season;
  weather: Weather;
  mainEvents: GameEvent[];
  heroEvents: HeroEvent[];
  playerEvents: PlayerEvent[];
  previousChapter?: Chapter;
}

interface Chapter {
  id: string;
  number: number;
  day: number;
  title: string;
  content: string;
  sections: ChapterSection[];
  keyEvents: string[];
  involvedCharacters: string[];
  cliffhanger?: string;
  generatedAt: Date;
}

interface ChapterSection {
  type: 'intro' | 'main' | 'hero' | 'rumor' | 'player' | 'ending';
  title: string;
  content: string;
  wordCount: number;
}

interface HeroChapter {
  id: string;
  heroId: string;
  chapterNumber: number;
  day: number;
  title: string;
  content: string;
  scenes: Scene[];
  relationshipChanges: RelationshipChange[];
  attributeChanges: AttributeChange[];
}

interface Scene {
  order: number;
  setting: string;
  characters: string[];
  content: string;
  mood: string;
}

// 主角系统接口
interface HeroSystem {
  // 获取主角当前故事线
  getHeroStoryline(heroId: string): HeroStoryline;

  // 推进主角故事
  advanceHeroStory(heroId: string, event: StoryEvent): Promise<void>;

  // 生成交互事件
  generateInteraction(heroId: string, npcId: string): Promise<HeroNPCInteraction>;

  // 处理主角更替
  handleSuccession(deceasedHeroId: string): Promise<HeroSuccession>;
}

// 记忆管理接口
interface NarrativeMemoryManager {
  // 存储章节摘要
  storeChapterSummary(chapter: Chapter): Promise<void>;

  // 获取记忆上下文
  getMemoryContext(
    day: number,
    focusCharacters: string[],
    depth: 'core' | 'recent' | 'full'
  ): Promise<string>;

  // 压缩历史记忆
  compressMemory(cutoffDay: number): Promise<void>;

  // 检索相关记忆
  queryMemory(query: MemoryQuery): Promise<MemoryEntry[]>;
}
```

### 6.2 数据库Schema（简化）

```sql
-- 章节表
CREATE TABLE chapters (
  id UUID PRIMARY KEY,
  number INTEGER NOT NULL,
  game_day INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  word_count INTEGER NOT NULL,
  key_events JSONB NOT NULL,
  involved_characters UUID[] NOT NULL,
  cliffhanger TEXT,
  generated_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP
);

-- 主角故事线表
CREATE TABLE hero_storylines (
  id UUID PRIMARY KEY,
  hero_id UUID REFERENCES characters(id),
  current_act INTEGER NOT NULL,
  current_scene INTEGER NOT NULL,
  acts JSONB NOT NULL,
  relationships JSONB NOT NULL,
  inner_state JSONB NOT NULL,
  current_dilemma JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 叙事记忆表
CREATE TABLE narrative_memories (
  id UUID PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- 'core', 'recent', 'character'
  entity_id UUID, -- 人物ID或NULL表示全局
  content TEXT NOT NULL,
  game_day INTEGER NOT NULL,
  importance INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 玩家叙事事件表
CREATE TABLE player_narrative_events (
  id UUID PRIMARY KEY,
  player_id UUID REFERENCES players(id),
  game_day INTEGER NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  chapter_id UUID REFERENCES chapters(id),
  recorded_at TIMESTAMP DEFAULT NOW()
);
```

---

## 七、MVP简化版实现计划

### 7.1 第一阶段：核心叙事

**目标**：实现每日晨报 + 简单事件叙事

**功能清单**：
- [ ] 每日晨报生成（500-800字）
- [ ] 玩家事件记录
- [ ] 基础记忆管理（最近7天）
- [ ] 简单的人物一致性检查

**Prompt策略**：
- 使用GPT-4生成晨报
- 使用模板+LLM填充生成事件描述

### 7.2 第二阶段：主角系统

**目标**：实现1个完整的主角故事线

**功能清单**：
- [ ] 天枢故事线实现（5幕结构）
- [ ] 主角视角章节生成
- [ ] 主角-NPC交互系统
- [ ] 故事线推进逻辑

### 7.3 第三阶段：完整体验

**目标**：实现3000-5000字的完整小说章节

**功能清单**：
- [ ] 四国主角全部上线
- [ ] 完整章节结构（四节）
- [ ] 长期记忆系统
- [ ] 叙事一致性保障

---

## 八、附录

### 8.1 参考Prompt示例

**完整章节生成Prompt（精简版）**：

```
你是《三界风云录》的史官，正在为第{day}天的世界撰写历史演义。

世界状态：
- 苍龙帝国：老皇帝病重，天枢、破军、文曲三子夺嫡
- 霜狼联邦：苍狼推行改革，血狼部族反对
- 金雀花王国：金潮与旧冠的商业vs贵族之争
- 边境联盟：三国渗透加剧，老根维持中立

今日发生的事件：
{events}

主角动态：
{heroUpdates}

写作要求：
1. 仿《三国演义》风格，文白夹杂
2. 分四节：四国风云（800字）、英雄列传（1000字）、江湖异闻（500字）、玩家纪事（300字）
3. 总字数3000-4000字
4. 每章结尾留悬念
5. 人物性格要一致

请生成完整章节。
```

### 8.2 叙事质量检查清单

- [ ] 人物性格与前文一致
- [ ] 时间线逻辑通顺
- [ ] 地理设定正确
- [ ] 政治关系准确
- [ ] 无明显历史错误
- [ ] 语言风格统一
- [ ] 无敏感内容
- [ ] 章节之间有衔接
- [ ] 悬念设置合理
- [ ] 字数符合要求

---

*文档版本：MVP v1.0*
*最后更新：2026-04-03*
