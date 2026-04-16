# Agame 前端组件架构文档

> **版本**：MVP v1.0
> **优先级**：P0（开发必须）
> **设计目标**：定义Web游戏前端的组件结构、状态管理、路由设计，确保小说阅读与游戏交互的无缝结合

---

## 一、技术栈选择

### 1.1 核心框架

```
┌─────────────────────────────────────────────────────────────┐
│                    前端技术栈架构                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  框架层                                                      │
│  ───────────────────────────────────────────────────────    │
│  React 18+ / Vue 3+（推荐React）                             │
│  TypeScript 5.0+                                             │
│                                                              │
│  状态管理                                                    │
│  ───────────────────────────────────────────────────────    │
│  Zustand（轻量全局状态）                                      │
│  React Query（服务端状态缓存）                                │
│                                                              │
│  路由                                                        │
│  ───────────────────────────────────────────────────────    │
│  React Router v6                                             │
│                                                              │
│  UI组件库                                                    │
│  ───────────────────────────────────────────────────────    │
│  Tailwind CSS（样式系统）                                     │
│  Radix UI / Headless UI（无样式组件基础）                     │
│  Framer Motion（动画）                                        │
│                                                              │
│  数据请求                                                    │
│  ───────────────────────────────────────────────────────    │
│  Axios（HTTP客户端）                                          │
│  WebSocket / SSE（实时状态同步）                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 MVP阶段精简方案

```
MVP技术栈（最小可行产品）：
- React 18 + TypeScript
- Zustand（状态管理）
- Tailwind CSS（样式）
- Axios（数据请求）
- 无复杂动画，先保证核心功能
```

---

## 二、应用架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    Agame 前端架构                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                      ┌─────────────┐                         │
│                      │   App.tsx   │                         │
│                      │  (Root容器)  │                         │
│                      └──────┬──────┘                         │
│                              │                               │
│         ┌────────────────────┼────────────────────┐         │
│         │                    │                    │         │
│  ┌──────┴──────┐      ┌──────┴──────┐      ┌──────┴──────┐ │
│  │  NovelView  │      │  GameView   │      │ StatusPanel │ │
│  │  小说阅读   │      │  游戏交互   │      │  状态面板   │ │
│  └──────┬──────┘      └──────┬──────┘      └──────┬──────┘ │
│         │                    │                    │         │
│  ┌──────┴──────┐      ┌──────┴──────┐      ┌──────┴──────┐ │
│  │ ChapterCard │      │ EventCard   │      │ AttributeBar│ │
│  │ 章节卡片   │      │ 事件卡片    │      │ 属性条     │ │
│  └────────────┘      └──────┬──────┘      └──────────────┘ │
│                              │                               │
│                      ┌──────┴──────┐                         │
│                      │ ChoicePanel │                         │
│                      │ 选择面板    │                         │
│                      └─────────────┘                         │
│                                                              │
│  ───────────────────────────────────────────────────────    │
│  状态层（Zustand Stores）                                    │
│  ───────────────────────────────────────────────────────    │
│  usePlayerStore    玩家状态                                  │
│  useNovelStore     小说数据                                  │
│  useGameStore      游戏事件                                  │
│  useUIStore        UI状态                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 路由结构

```typescript
// 路由配置
const routes = {
  // 主页
  '/': HomePage,                    // 游戏入口，选择阵营

  // 小说阅读
  '/novel': NovelPage,              // 小说主页
  '/novel/chapter/:day': ChapterPage, // 指定章节
  '/novel/archive': ArchivePage,    // 章节存档

  // 游戏交互
  '/game': GamePage,                // 游戏主界面
  '/game/event/:id': EventPage,     // 单个事件详情
  '/game/npc/:id': NPCDialogPage,   // NPC对话界面

  // 状态管理
  '/status': StatusPage,            // 状态总览
  '/status/attributes': AttributesPage, // 十维属性
  '/status/skills': SkillsPage,     // 技能列表
  '/status/relations': RelationsPage,   // NPC关系网
  '/status/inventory': InventoryPage,   // 物品栏

  // 系统
  '/settings': SettingsPage,        // 设置（字体、主题）
  '/help': HelpPage,                // 帮助/教程
};

// 路由守卫
const routeGuards = {
  // 需要登录的路由
  protected: ['/game', '/status', '/novel/chapter'],
  // 需要阵营选择的路由
  requiresFaction: ['/game', '/novel/chapter/:day'],
};
```

---

## 三、核心组件设计

### 3.1 小说阅读组件

#### 组件层级

```
NovelPage
├── NovelHeader          小说标题栏
│   ├── ChapterNav       章节导航（上一章/下一章）
│   ├── ReadingProgress  阅读进度指示
│   └── SettingsToggle   设置开关按钮
│
├── ChapterContent       章节内容容器
│   ├── ChapterTitle     章节标题
│   ├── ChapterIntro     卷首语
│   ├── SectionDivider   章节分隔线
│   ├── MainSection      四国风云节
│   ├── HeroSection      英雄列传节
│   ├── RumorSection     江湖异闻节
│   └── PlayerSection    玩家纪事节
│   └── ChapterEnd       本章终/悬念预告
│
├── ReadingToolbar       阅读工具栏
│   ├── FontSizeControl  字号调节
│   ├── ThemeToggle      日间/夜间模式
│   ├── BookmarkButton   收藏章节
│   └── ShareButton      分享按钮
│
└── ChapterFooter        章节底部
    ├── PrevChapter      上一章按钮
    ├── NextChapter      下一章按钮
    └── ChapterList      章节列表弹窗
```

#### 组件接口定义

```typescript
// 小说阅读组件接口
interface NovelPageProps {
  // 当前游戏日
  currentDay: number;
}

interface ChapterContentProps {
  // 章节数据
  chapter: {
    id: string;
    number: number;
    day: number;
    title: string;
    content: string;
    sections: ChapterSection[];
    wordCount: number;
  };
  // 阅读设置
  settings: ReadingSettings;
}

interface ReadingSettings {
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  theme: 'light' | 'dark' | 'sepia';
  lineHeight: number;       // 行间距倍数
  paragraphSpacing: number; // 段间距
  fontFamily: 'serif' | 'sans-serif' | 'mono';
}

// 小说Store
interface NovelStore {
  // 状态
  currentChapter: Chapter | null;
  chapters: Chapter[];
  readingSettings: ReadingSettings;
  bookmarks: string[];      // 收藏的章节ID

  // 操作
  loadChapter: (day: number) => Promise<void>;
  updateSettings: (settings: Partial<ReadingSettings>) => void;
  addBookmark: (chapterId: string) => void;
  removeBookmark: (chapterId: string) => void;
  getNextChapter: () => Chapter | null;
  getPrevChapter: () => Chapter | null;
}
```

#### 小说阅读界面布局

```
┌─────────────────────────────────────────────────────────────┐
│  第X回 · [章节标题]            ◀  ▶  📖  ⚙️              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  【卷首语】                                                  │
│  以说书人/史官口吻引出本章主题...                             │
│                                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━             │
│                                                              │
│  【第一节：四国风云】                                        │
│                                                              │
│  ◆ 苍龙帝国                                                 │
│  [国家大事叙述，300-400字]                                   │
│                                                              │
│  ◆ 霜狼联邦                                                 │
│  [国家大事叙述...]                                           │
│                                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━             │
│                                                              │
│  【第二节：英雄列传】                                        │
│                                                              │
│  【天枢传】                                                  │
│  [主角个人故事线...]                                         │
│                                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━             │
│                                                              │
│  【第三节：江湖异闻】                                        │
│  [次要NPC动态...]                                            │
│                                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━             │
│                                                              │
│  【第四节：玩家纪事】                                        │
│  [如果玩家有重要行动则插入...]                                │
│                                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━             │
│                                                              │
│  【本回终】                                                  │
│  下回预告：...                                               │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│         ◀ 上一回          回目          下一回 ▶            │
└─────────────────────────────────────────────────────────────┘

字号选项：[小] [中] [大] [特大]
主题选项：[日间] [夜间] [复古]
```

---

### 3.2 游戏事件卡片组件

#### 组件层级

```
EventCard
├── EventHeader           事件头部
│   ├── EventSource       事件来源（阵营图标）
│   ├── EventTitle        事件标题
│   └── EventTimestamp    时间标记
│
├── EventBody             事件内容
│   ├── EventDescription  事件描述文本
│   ├── ContextHighlight  关键信息高亮
│   └── NPCMention        涉及NPC引用
│
├── ChoicePanel           选择面板
│   ├── ChoiceOption      单个选项（可多个）
│   │   ├── ChoiceText    选项文本
│   │   ├── SkillBadge    技能需求徽章
│   │   ├── CostIndicator 代价提示
│   │   └── RiskLevel     风险等级指示
│   └── ChoiceCounter     已选择次数（可选）
│
└── EventFooter           事件底部
    ├── AcceptButton      确认按钮
    ├── DeclineButton     拒绝按钮（可选）
    └── EventHelp         帮助提示
```

#### 组件接口定义

```typescript
// 游戏事件卡片接口
interface EventCardProps {
  event: GameEvent;
  onChoice: (choiceId: string) => Promise<void>;
  playerSkills: Skill[];
}

interface GameEvent {
  id: string;
  type: EventType;
  source: 'chronos' | 'national' | 'npc' | 'player';
  faction?: Faction;
  title: string;
  description: string;

  // 选择项
  choices: EventChoice[];

  // 触发条件（用于显示技能需求）
  requirements?: EventRequirement[];

  // 时间信息
  triggeredAt: number;     // 游戏日
  expiresAt?: number;      // 过期时间

  // 后果预览（可选显示）
  consequencePreview?: ConsequencePreview[];
}

interface EventChoice {
  id: string;
  text: string;

  // 技能需求显示
  skillRequirement?: {
    skillId: string;
    level: number;
    reason: string;        // 为什么需要这个技能
  };

  // 代价提示
  costs?: {
    gold?: number;
    influence?: number;
    resource?: string;
  };

  // 风险等级
  riskLevel: 'low' | 'medium' | 'high' | 'critical';

  // 是否解锁（基于玩家技能）
  isUnlocked: boolean;

  // 已选择次数（用于统计）
  selectedCount?: number;
}

interface EventRequirement {
  type: 'skill' | 'attribute' | 'resource' | 'relation';
  id: string;
  value: number;
  description: string;
}
```

#### 事件卡片UI布局

```
┌─────────────────────────────────────────────────────────────┐
│  [苍龙图标] 元老院紧急会议                    第15日 ·辰时    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  大法官秋实召集紧急会议。边境斥候报告，                       │
│  霜狼联邦的侦察骑兵在北部边境集结，                           │
│  数量已达三千。                                              │
│                                                              │
│  朝中分成两派：                                               │
│  ─────────────────────────────────────────────              │
│  · 主战派（二皇子）：先发制人                                 │
│  · 主和派（首辅）：派使节谈判                                 │
│                                                              │
│  你的领地在边境线上，战事一起首当其冲...                       │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  【你的选择】                                                │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ ◉ 支持主战派，提供情报换取军事保护                      │ │
│  │   ───────────────────────────────────────────         │ │
│  │   风险：中等                                           │ │
│  │   代价：情报网消耗                                      │ │
│  │   收益：军事庇护 + 苍龙声望                             │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ ◉ 支持主和派，主动请缨作为谈判地点                      │ │
│  │   ───────────────────────────────────────────         │ │
│  │   风险：低                                             │ │
│  │   代价：领地临时占用                                    │ │
│  │   收益：外交声望                                        │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ ◉ 暗中通知霜狼联邦，两头下注                           │ │
│  │   ───────────────────────────────────────────         │ │
│  │   🔒 需要：谋略 L3+                                     │ │
│  │   风险：极高                                           │ │
│  │   后果：若被发现将被视为叛徒                            │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ ◉ 紧急疏散村民，谁都不帮                               │ │
│  │   ───────────────────────────────────────────         │ │
│  │   风险：低                                             │ │
│  │   后果：中立，但失去机会                                │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                        [确认选择]                            │
└─────────────────────────────────────────────────────────────┘
```

---

### 3.3 状态面板组件

#### 组件层级

```
StatusPanel
├── StatusHeader          状态头部
│   ├── PlayerName        玩家名称
│   ├── PlayerLevel       等级显示
│   └── FactionBadge      阵营徽章
│
├── AttributesSection     属性区
│   ├── AttributeGrid     十维属性网格
│   │   ├── AttributeBar  单个属性条
│   │   │   ├── AttrName  属性名称
│   │   │   ├── AttrValue 当前值
│   │   │   ├── AttrMax   最大值（100）
│   │   │   └── AttrBar   进度条
│
├── SkillsSection         技能区
│   ├── SkillList         技能列表
│   │   ├── SkillCard     单个技能卡片
│   │   │   ├── SkillName 技能名称
│   │   │   ├── SkillLevel 技能等级（1-6）
│   │   │   ├── SkillIcon 技能图标
│   │   │   └── SkillExp  经验进度
│
├── RelationsSection      关系区
│   ├── RelationFilter    关系筛选（友好/敌对）
│   ├── RelationList      NPC关系列表
│   │   ├── RelationCard  单个NPC关系
│   │   │   ├── NPCAvatar NPC头像
│   │   │   ├── NPCName   NPC名称
│   │   │   ├── RelationValue 关系值
│   │   │   └── RelationBar 关系进度条
│
└── ResourcesSection      资源区
    ├── GoldDisplay       金币显示
    ├── InfluenceDisplay  影响力显示
    └── InventoryPreview  物品预览
```

#### 组件接口定义

```typescript
// 状态面板接口
interface StatusPanelProps {
  player: PlayerState;
  compact?: boolean;       // 紧凑模式（侧边栏）
}

// 玩家状态Store
interface PlayerStore {
  // 十维属性
  attributes: {
    physique: number;      // 体魄
    agility: number;       // 敏捷
    wisdom: number;        // 智慧
    willpower: number;     // 意志
    perception: number;    // 感知
    charisma: number;      // 魅力
    fame: number;          // 名望
    infamy: number;        // 恶名
    luck: number;          // 幸运
    factionRep: number;    // 阵营声望
  };

  // 技能
  skills: Skill[];

  // NPC关系
  relations: Map<string, number>;

  // 资源
  resources: {
    gold: number;
    influence: number;
  };

  // 阵营
  faction: Faction | null;
  factionReputation: Map<FactionId, number>;

  // 身份标签
  tags: string[];

  // 操作
  updateAttribute: (attr: string, value: number) => void;
  updateSkill: (skillId: string, exp: number) => void;
  updateRelation: (npcId: string, value: number) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
}
```

#### 状态面板UI布局（紧凑模式）

```
┌─────────────────────────────┐
│  [玩家名] · Lv.3            │
│  [金雀花徽章]               │
├─────────────────────────────┤
│  【十维属性】               │
│                              │
│  体魄 ████████░░ 80         │
│  敏捷 ██████░░░░ 60         │
│  智慧 █████████░ 90         │
│  意志 ███████░░░ 70         │
│  感知 █████████░ 90         │
│  魅力 ██████░░░░ 60         │
│  名望 ███░░░░░░░ 30         │
│  恶名 ░░░░░░░░░░ 0          │
│  幸运 █████░░░░░ 50         │
│                              │
├─────────────────────────────┤
│  【核心技能】               │
│                              │
│  商业交易 L3 ████████░ 80%  │
│  察言观色 L2 █████░░░░ 50%  │
│  契约签订 L1 ███░░░░░░ 30%  │
│                              │
├─────────────────────────────┤
│  【关键关系】               │
│                              │
│  金潮      ████████░ +80    │
│  旧冠      ░░░░░░░░░ -10    │
│  银帆      █████░░░░ +50    │
│                              │
├─────────────────────────────┤
│  💰 金币: 1,250             │
│  ⭐ 影响力: 85              │
├─────────────────────────────┤
│  【标签】                   │
│  商会成员 · 改革派支持      │
└─────────────────────────────┘
```

---

### 3.4 NPC对话组件

#### 组件层级

```
NPCDialogPage
├── DialogHeader          对话头部
│   ├── NPCPortrait       NPC头像
│   ├── NPCNameTitle      NPC名称+头衔
│   ├── RelationIndicator 关系指示
│   └── DialogTopic       当前话题
│
├── DialogHistory         对话历史
│   ├── DialogMessage     单条消息
│   │   ├── MessageAvatar 发言者头像
│   │   ├── MessageContent 消息内容
│   │   ├── MessageAction NPC行动描述
│   │   └── MessageTime   时间戳
│
├── DialogOptions         对话选项
│   ├── DialogChoice      选择项
│   │   ├── ChoiceContent 选择文本
│   │   ├── SkillHint     技能提示
│   │   ├── RiskHint      风险提示
│   └── EndDialogButton   结束对话
│
└── DialogFooter          对话底部
    ├── TextInput         文字输入（可选）
    └── QuickActions      快捷操作（交易/送礼/离开）
```

#### NPC对话界面布局

```
┌─────────────────────────────────────────────────────────────┐
│  [头像] 金潮 · 银行家/议长                   关系：友好(+80) │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ───────────────────────────────────────────────────────    │
│                                                              │
│  【金潮】                                                    │
│  "听说你在香料城的生意做得不错。"                             │
│  他放下手中的茶杯，目光中带着审视。                           │
│                                                              │
│  ───────────────────────────────────────────────────────    │
│                                                              │
│  【你】                                                      │
│  "多亏了您的支持，金潮阁下。"                                 │
│                                                              │
│  ───────────────────────────────────────────────────────    │
│                                                              │
│  【金潮】                                                    │
│  "支持是有代价的。自由贸易法案下周表决，                      │
│  我需要有人在议会中替我说几句话。"                            │
│  他微微一笑："你懂我的意思吗？"                               │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  【回应选项】                                                │
│                                                              │
│  ◉ "我明白了，阁下需要什么？"                                │
│    ─────────────────────────────────────                    │
│    [商业 L2] 可议价                                          │
│                                                              │
│  ◉ "这...恐怕超出了我的能力范围"                             │
│    ─────────────────────────────────────                    │
│    风险：关系-10                                              │
│                                                              │
│  ◉ "我可以尝试，但需要更多时间准备"                          │
│    ─────────────────────────────────────                    │
│    [谋略 L1] 留有余地                                        │
│                                                              │
│  ◉ [察言观色] 观察他的真实意图                               │
│    ─────────────────────────────────────                    │
│    🔒 需要：察言观色 L2                                      │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│         [交易]    [送礼]    [离开对话]                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 四、状态管理设计

### 4.1 Store分层结构

```typescript
// 全局状态架构
interface GlobalStores {
  // 玩家状态（高频读写）
  playerStore: PlayerStore;

  // 小说数据（中等频率）
  novelStore: NovelStore;

  // 游戏事件（事件驱动）
  eventStore: EventStore;

  // UI状态（低频率）
  uiStore: UIStore;
}

// 事件Store
interface EventStore {
  // 当前活跃事件
  activeEvents: GameEvent[];

  // 已处理事件历史
  processedEvents: ProcessedEvent[];

  // 待定事件（有截止时间）
  pendingEvents: GameEvent[];

  // 操作
  loadActiveEvents: () => Promise<void>;
  processChoice: (eventId: string, choiceId: string) => Promise<EventResult>;
  getEventHistory: (filters: EventFilters) => ProcessedEvent[];
}

// UI Store
interface UIStore {
  // 当前页面
  currentPage: PageType;

  // 小说阅读设置
  readingSettings: ReadingSettings;

  // 通知队列
  notifications: Notification[];

  // 模态框状态
  modals: {
    settings: boolean;
    help: boolean;
    chapterList: boolean;
    npcDialog: boolean;
  };

  // 加载状态
  loading: {
    novel: boolean;
    events: boolean;
    player: boolean;
  };

  // 操作
  setPage: (page: PageType) => void;
  showModal: (modal: string) => void;
  hideModal: (modal: string) => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
}
```

### 4.2 数据同步策略

```typescript
// 服务端状态缓存（React Query）
const queryKeys = {
  novel: ['novel', 'chapter', day],
  player: ['player', 'state'],
  events: ['events', 'active'],
  relations: ['relations', 'npc'],
};

// 缓存策略
const cacheConfig = {
  novel: {
    staleTime: 24 * 60 * 60 * 1000, // 24小时（章节不变）
    cacheTime: 7 * 24 * 60 * 60 * 1000, // 7天
  },
  player: {
    staleTime: 5 * 60 * 1000, // 5分钟
    cacheTime: 60 * 60 * 1000, // 1小时
    refetchOnWindowFocus: true,
  },
  events: {
    staleTime: 0, // 实时获取
    refetchInterval: 30 * 1000, // 30秒轮询
  },
};

// 实时状态同步（WebSocket）
interface RealtimeSync {
  // 连接
  connect: () => void;
  disconnect: () => void;

  // 事件订阅
  subscribe: {
    'player:update': (state: PlayerState) => void;
    'event:new': (event: GameEvent) => void;
    'novel:update': (chapter: Chapter) => void;
    'npc:dialog': (message: DialogMessage) => void;
  };
}
```

---

## 五、响应式设计

### 5.1 设备适配策略

```typescript
// 响应式布局断点
const breakpoints = {
  mobile: 640,    // 手机
  tablet: 768,    // 平板
  desktop: 1024,  // 桌面
  wide: 1280,     // 宽屏
};

// 布局模式
type LayoutMode = 'mobile' | 'tablet' | 'desktop';

// 各设备布局策略
const layouts = {
  mobile: {
    novel: 'scroll',              // 小说：单列滚动
    status: 'collapsed',          // 状态：折叠，点击展开
    events: 'stacked',            // 事件：堆叠卡片
    nav: 'bottom',                // 导航：底部固定
  },
  tablet: {
    novel: 'scroll',              // 小说：单列滚动
    status: 'sidebar-collapsed',  // 状态：侧边栏折叠
    events: 'stacked',            // 事件：堆叠卡片
    nav: 'sidebar',               // 导航：侧边栏
  },
  desktop: {
    novel: 'two-column',          // 小说：两列（内容+状态）
    status: 'sidebar-full',       // 状态：完整侧边栏
    events: 'grid',               // 事件：网格布局
    nav: 'sidebar',               // 导航：侧边栏
  },
};
```

### 5.2 桌面端两栏布局

```
┌─────────────────────────────────────────────────────────────┐
│  [导航栏]                                                   │
├─────────────────────────────────────────────────────────────┤
│                              │                               │
│  ┌─────────────────────────┐ │ ┌─────────────────────────┐ │
│  │                         │ │ │                         │ │
│  │    小说阅读区           │ │ │    状态面板             │ │
│  │    (主内容区)           │ │ │    (侧边栏)             │ │
│  │                         │ │ │                         │ │
│  │    章节内容             │ │ │  十维属性               │ │
│  │    3000-5000字          │ │ │  核心技能               │ │
│  │                         │ │ │  关键关系               │ │
│  │                         │ │ │  资源                   │ │
│  │                         │ │ │                         │ │
│  │                         │ │ │  ───────────────        │ │
│  │                         │ │ │                         │ │
│  │                         │ │ │  【当前事件】           │ │
│  │                         │ │ │  事件卡片迷你版         │ │
│  │                         │ │ │                         │ │
│  │                         │ │ │                         │ │
│  └─────────────────────────┘ │ └─────────────────────────┘ │
│                              │                               │
│  ┌─────────────────────────┐ │                               │
│  │    阅读工具栏           │ │                               │
│  │    [字号][主题][收藏]   │ │                               │
│  └─────────────────────────┘ │                               │
│                              │                               │
├─────────────────────────────────────────────────────────────┤
│  ◀ 上一回    [回目列表]    下一回 ▶                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 六、MVP实现优先级

### 6.1 P0必须实现（第一周）

```
组件优先级P0：
──────────────────────────────────────────────────────────────
1. NovelPage              小说阅读主界面
   ├── ChapterContent     章节内容渲染
   ├── ReadingToolbar     基础工具栏（字号/主题）
   └── ChapterNavigation  章节导航

2. EventCard              事件卡片（核心交互）
   ├── EventBody          事件描述
   ├── ChoicePanel        选择面板
   └── ConsequenceDisplay 后果显示

3. StatusPanel            状态面板（精简版）
   ├── AttributeGrid      十维属性网格
   ├── ResourceDisplay    金币/影响力
   └── FactionBadge       阵营徽章

4. Stores                 状态管理
   ├── PlayerStore        玩家状态
   ├── NovelStore         小说数据
   └── EventStore         事件数据
```

### 6.2 P1次要实现（第二周）

```
组件优先级P1：
──────────────────────────────────────────────────────────────
1. NPCDialogPage          NPC对话界面
2. SkillsPanel            技能详情面板
3. RelationsPanel         关系网络面板
4. ChapterArchive         章节存档
5. SettingsPage           设置页面
6. HomePage               游戏入口页
```

---

## 七、样式系统规范

### 7.1 Tailwind配置

```typescript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      // 阵营颜色
      colors: {
        faction: {
          canglong: '#D4AF37',    // 金色（苍龙）
          shuanglang: '#4169E1',  // 蓝色（霜狼）
          jinque: '#228B22',      // 绿色（金雀花）
          border: '#8B4513',      // 褐色（边境）
        },
        // 小说阅读
        novel: {
          bg: '#F5F5DC',          // 米色背景
          text: '#333333',        // 正文色
          accent: '#8B0000',      // 强调色
        },
        // 风险等级
        risk: {
          low: '#22C55E',
          medium: '#EAB308',
          high: '#F97316',
          critical: '#EF4444',
        },
      },
      // 小说字体
      fontFamily: {
        novel: ['Noto Serif SC', 'serif'],
        ui: ['Inter', 'sans-serif'],
      },
      // 字号预设
      fontSize: {
        'novel-sm': ['14px', { lineHeight: '1.8' }],
        'novel-md': ['16px', { lineHeight: '2' }],
        'novel-lg': ['18px', { lineHeight: '2.2' }],
        'novel-xl': ['20px', { lineHeight: '2.4' }],
      },
    },
  },
};
```

### 7.2 组件样式规范

```css
/* 小说阅读样式 */
.novel-content {
  font-family: 'Noto Serif SC', serif;
  text-align: justify;
  word-break: break-word;
}

.novel-section-title {
  font-weight: bold;
  margin-bottom: 1em;
  text-align: center;
}

.novel-divider {
  border: none;
  border-top: 1px dashed #ccc;
  margin: 2em 0;
}

/* 事件卡片样式 */
.event-card {
  border-radius: 8px;
  border: 1px solid #e5e5e5;
  padding: 1.5rem;
  max-width: 600px;
}

.choice-option {
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.choice-option:hover {
  background-color: #f5f5f5;
}

.choice-option.locked {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 状态面板样式 */
.attribute-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.attribute-progress {
  height: 8px;
  border-radius: 4px;
  background-color: #e5e5e5;
}

.attribute-fill {
  height: 100%;
  border-radius: 4px;
  background-color: #3b82f6;
}
```

---

## 八、组件库索引

### 8.1 核心组件列表

| 组件名 | 功能 | 文件路径 | 优先级 |
|--------|------|----------|--------|
| NovelPage | 小说阅读主界面 | components/novel/NovelPage.tsx | P0 |
| ChapterContent | 章节内容渲染 | components/novel/ChapterContent.tsx | P0 |
| ReadingToolbar | 阅读工具栏 | components/novel/ReadingToolbar.tsx | P0 |
| EventCard | 事件卡片 | components/game/EventCard.tsx | P0 |
| ChoicePanel | 选择面板 | components/game/ChoicePanel.tsx | P0 |
| StatusPanel | 状态面板 | components/status/StatusPanel.tsx | P0 |
| AttributeGrid | 属性网格 | components/status/AttributeGrid.tsx | P0 |
| NPCDialogPage | NPC对话 | components/dialog/NPCDialogPage.tsx | P1 |
| SkillsPanel | 技能面板 | components/status/SkillsPanel.tsx | P1 |
| RelationsPanel | 关系面板 | components/status/RelationsPanel.tsx | P1 |

### 8.2 Store列表

| Store名 | 功能 | 文件路径 |
|---------|------|----------|
| usePlayerStore | 玩家状态 | stores/playerStore.ts |
| useNovelStore | 小说数据 | stores/novelStore.ts |
| useEventStore | 事件数据 | stores/eventStore.ts |
| useUIStore | UI状态 | stores/uiStore.ts |

---

*文档版本：MVP v1.0*
*创建日期：2026-04-16*
*状态：已完成*