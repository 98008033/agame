# Agame 社会生态系统整合设计

> **核心理念**：Agame的社会是一个有机整体——玩家、NPC、团体、经济、权力、关系六大要素相互交织，形成动态运转的社会机器。本文档整合所有社会系统设计，定义数据流和协调机制。

---

## 一、社会生态系统总览

### 1.1 六大核心系统

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Agame 社会生态系统架构                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌──────────────────────────────────────────────────────────────────────┐ │
│    │                         社会运行机制（动力层）                          │ │
│    │                                                                        │ │
│    │  经济循环 ──────── 权力循环 ──────── 关系循环                          │ │
│    │  （生产分配消费）  （权力运用争夺）  （关系建立变化）                    │ │
│    └──────────────────────────────────────────────────────────────────────┘ │
│                              │                                               │
│                              │ 矛盾积累 → 事件爆发                            │
│                              ▼                                               │
│    ┌──────────────────────────────────────────────────────────────────────┐ │
│    │                         实体系统（角色层）                              │ │
│    │                                                                        │ │
│    │  玩家存在系统 ───── NPC人生系统 ───── 团体系统                         │ │
│    │  （选择驱动成长）  （命运驱动成长）  （职业共同体）                      │ │
│    └──────────────────────────────────────────────────────────────────────┘ │
│                              │                                               │
│                              │ 实体位置 → 社会参与                            │
│                              ▼                                               │
│    ┌──────────────────────────────────────────────────────────────────────┐ │
│    │                         基础设施（支撑层）                              │ │
│    │                                                                        │ │
│    │  Template NPC ───── 经济系统 ───── 城市生态                            │ │
│    │  （技能驱动行为）  （双资源MVP）   （功能NPC分布）                       │ │
│    └──────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 系统对应文档

| 系统 | 文档来源 | 核心内容 |
|------|----------|----------|
| **社会运行机制** | PLAN/33 | 经济循环、权力循环、关系循环、矛盾爆发模型 |
| **玩家存在系统** | PLAN/34 | 玩家身份定位、三条成长线、阵营效忠、继承机制 |
| **NPC人生系统** | PLAN/35 | 七大人生阶段、职业发展、婚姻家庭、继承传承 |
| **职业团体系统** | PLAN/35-profession-guild | 四阵营团体体系、加入流程、团体功能 |
| **玩家融入系统** | PLAN/36-player-guild | 五层交互、六阶段融入、团体帮助、角色定位 |
| **经济系统** | PLAN/16 | 双资源、社会阶层、阵营声望 |
| **Template NPC** | PLAN/27 | 技能挂载、对话模板、升级路径 |
| **城市生态** | PLAN/28 | 城市NPC分布、各阵营NPC特色 |
| **NPC生命周期** | PLAN/13 | 年龄阶段、死亡系统、继承规则 |

---

## 二、系统间的核心数据流

### 2.1 玩家 → NPC → 团体 数据流

```
玩家行动 → 关系变化 → 团体影响 → 社会反馈

详细流程：
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  1. 玩家行动                                                              │
│     ├── 完成NPC请求 → 关系+10~25                                          │
│     ├── 加入团体 → 获得"成员"身份                                         │
│     ├── 提升技能 → 解锁新叙事视角                                          │
│     ├── 阵营效忠 → 阵营声望+30                                            │
│     └── 帮助NPC → 影响力+10~20                                            │
│                                                                          │
│  2. 关系变化                                                              │
│     ├── 关系≥40 → NPC愿意帮助                                             │
│     ├── 关系≥60 → NPC主动提供情报                                         │
│     ├── 关系≥80 → NPC生死相助                                             │
│     └── 关系自然衰减（每月-2，超3月-5）                                    │
│                                                                          │
│  3. 团体影响                                                              │
│     ├── 团体成员身份 → 获得技能学习渠道                                    │
│     ├── 团体贡献→ 晋升机会                                                │
│     ├── 团体领袖身份 → 参与阵营决策                                        │
│     └── 团体声誉加持 → NPC态度改善                                         │
│                                                                          │
│  4. 社会反馈                                                              │
│     ├── 阵营声望变化 → 交易价格调整                                        │
│     ├── 社会阶层变化 → 可参与事件类型变化                                  │
│     ├── 晨报传播 → 世界认知玩家                                            │
│     └── NPC记忆 → 后续互动参考                                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 NPC → NPC 自动数据流

```
NPC自主行为 → 关系网络变化 → 矛盾积累 → 事件爆发

详细流程：
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  1. NPC自主行为（非玩家驱动）                                             │
│     ├── 生产者NPC → 产出资源（农民产粮食、铁匠产器具）                     │
│     ├── 分配者NPC → 流通资源（商人贸易、税官征收）                         │
│     ├── 权力NPC → 行使权力（官员决策、将军调兵）                           │
│     └── 关系NPC → 维护关系（婚姻、师徒、联盟）                             │
│                                                                          │
│  2. 关系网络变化                                                          │
│     ├── 共同利益 → 关系上升（合作成功+10）                                │
│     ├── 利益冲突 → 关系下降（竞争失败-10）                                 │
│     ├── 身份变化 → 关系调整（升职后原盟友可能疏远）                        │
│     └── 社会压力 → 关系被迫变化（阵营敌对导致关系下降）                    │
│                                                                          │
│  3. 矛盾积累                                                              │
│     ├── 资源矛盾：供给<需求×80%持续3月 → 矛盾值+30                        │
│     ├── 权力矛盾：职位空缺>2月 → 矛盾值+20                                 │
│     ├── 关系矛盾：敌对关系且利益冲突 → 矛盾值+15                          │
│     ├── 阶层张力：上层压迫>下层容忍 → 张力值累积                          │
│                                                                          │
│  4. 事件爆发                                                              │
│     ├── 矛盾值≥阈值 → 自然爆发事件                                        │
│     ├── 事件后果 → 矛盾释放/加剧                                          │
│     ├── 社会重组 → 新矛盾开始积累                                          │
│     └── 晨报报道 → 玩家得知世界变化                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.3 团体 → 阵营 数据流

```
团体活动 → 阵营决策 → 社会政策 → 影响全体

详细流程：
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  1. 团体活动                                                              │
│     ├── 团体聚会 → 成员关系网扩展                                         │
│     ├── 团体培训 → 成员技能提升                                            │
│     ├── 团体大会 → 领袖选拔/政策讨论                                       │
│     └── 团体竞争 → 成员地位变化                                            │
│                                                                          │
│  2. 阵营决策                                                              │
│     ├── 团体领袖建议 → 阵营Agent考虑                                       │
│     ├── 多团体共识 → 形成政策倾向                                          │
│     ├── 团体利益冲突 → 派系斗争                                            │
│     └── 团体集体发声 → 影响舆论                                            │
│                                                                          │
│  3. 社会政策                                                              │
│     ├── 经济政策 → 税率/价格/贸易规则                                      │
│     ├── 权力政策 → 职位任命/继承规则                                       │
│     ├── 军事政策 → 征兵/部署/战争决策                                      │
│     └── 文化政策 → 教育/信仰/价值观                                        │
│                                                                          │
│  4. 影响全体                                                              │
│     ├── NPC经济状态变化 → 消费能力调整                                     │
│     ├── NPC权力状态变化 → 地位升降                                         │
│     ├── 玩家机会变化 → 可参与事件调整                                      │
│     └── 世界格局变化 → 阵营关系调整                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 三、核心数据模型整合

### 3.1 统一玩家数据模型

整合PLAN/34、PLAN/16、PLAN/36的设计：

```typescript
interface Player {
  // === 基础信息 (PLAN/34) ===
  id: string;
  name: string;
  age: number;                 // 18-80，遵循NPC人生阶段
  origin: 'border';            // 玩家起点固定为边境联盟
  gender: 'male' | 'female';

  // === 技能系统 (PLAN/34) ===
  skills: {
    strategy: number;          // 谋略线 0-10
    combat: number;            // 武力线 0-10
    business: number;          // 经营线 0-10
    survival: number;          // 生存技能（固定起点L1）
    // 技能等级 = 叙事钥匙，解锁新故事入口
  };

  // === 资源系统 (PLAN/16) ===
  resources: {
    gold: number;              // 金币，软上限2000
    influence: number;         // 影响力，软上限500
    // MVP双资源，延后：情报(P1)、资源点数(P2)
  };

  // === 社会位置 (PLAN/34 + PLAN/16) ===
  socialPosition: {
    tier: 'civilian' | 'gentleman' | 'noble' | 'royal';
    // 阶层判定：经济×0.3 + 政治×0.3 + 社交×0.2 + 声誉×0.15 + 阵营×0.05
    tierFactors: {
      economicPower: number;
      politicalInfluence: number;
      socialNetwork: number;
      reputation: number;
      factionSupport: number;
    };
    factionAllegiance?: string; // 效忠阵营ID
    allegianceType?: 'full' | 'partial' | 'neutral';
  };

  // === 阵营声望 (PLAN/16) ===
  factionRep: {
    canglong: number;          // -100 ~ +100
    shuanglang: number;
    jinque: number;
    border: number;
  };

  // === 关系网络 (PLAN/34 + PLAN/16) ===
  relationships: Relationship[];
  // MVP限制：最多20个重要NPC关系

  // === 团体关系 (PLAN/36) ===
  guildRelations: PlayerGuildRelation[];
  // 多团体组合：主团体(贡献者/领导者) + 辅团体(普通成员)

  // === 继承人系统 (PLAN/34) ===
  heirs: Heir[];
  designatedHeir?: string;

  // === 历史轨迹 (PLAN/34) ===
  history: {
    choices: ChoiceRecord[];
    events: EventRecord[];
    relationships: RelationRecord[];
  };
}

// 关系详细结构
interface Relationship {
  npcId: string;
  level: number;               // -100 ~ +100
  type: 'kinship' | 'political' | 'economic' | 'social' | 'conflict';
  bindings: {
    mutualBenefit: string[];
    conflictInterest: string[];
    debt: string[];
    obligation: string[];
  };
  lastInteract: Date;
  isImportant: boolean;        // MVP限制20个
  decayTimer: number;          // 衰减计时器
}

// 团体关系详细结构 (PLAN/36)
interface PlayerGuildRelation {
  guildId: string;
  level: 'observer' | 'acquaintance' | 'applicant' | 'member' |
          'active' | 'core' | 'leader';
  joinDate: Date | null;
  currentIdentity: {
    title: string;
    position: string | null;
    rank: number;
  };
  contribution: {
    total: number;
    tasks: number;
    donations: number;
    teaching: number;
    leadership: number;
  };
  participation: {
    eventsJoined: number;
    lastActive: Date;
    isActive: boolean;
  };
  relationsBuilt: {
    memberId: string;
    relationType: 'mentor' | 'peer' | 'student' | 'client' |
                  'partner' | 'competitor';
    relationValue: number;
  }[];
}
```

### 3.2 统一NPC数据模型

整合PLAN/35、PLAN/13、PLAN/27、PLAN/28的设计：

```typescript
interface NPC {
  // === 基础信息 ===
  id: string;
  name: string;
  type: 'agent' | 'template';  // Agent(自主决策) vs Template(技能驱动)
  role: string;                // 职业角色

  // === 人生阶段 (PLAN/35) ===
  lifeStage: 'infant' | 'child' | 'youth' | 'adult' |
             'middle' | 'elder' | 'terminal';
  age: number;                 // 0-80+
  birthDate: Date;

  // === 家庭关系 (PLAN/35) ===
  family: {
    parents: string[];
    spouse: string | null;
    children: string[];
    siblings: string[];
  };

  // === 技能系统 (PLAN/27) ===
  skills: MountedSkill[];      // 挂载的技能列表
  skillLevels: Record<string, number>; // 技能ID → 等级(1-4)

  // === 职业与地位 (PLAN/35 + PLAN/28) ===
  occupation: {
    current: string;
    history: string[];
    guild?: string;            // 所属团体
    guildRank?: string;        // 团体内等级
  };

  status: {
    tier: 'bottom' | 'middle' | 'upper' | 'top'; // 社会地位层级
    influence: number;
    reputation: number;
  };

  // === 权力结构 (PLAN/33) ===
  power: {
    military: number;
    legitimacy: number;
    resourceControl: number;
    authority: {
      domain: string[];
      subordinates: string[];
      dependents: string[];
    };
  };

  // === 经济角色 (PLAN/33) ===
  economicRole: 'producer' | 'distributor' | 'consumer' | 'taxer';
  productionCapacity?: {
    type: string;
    efficiency: number;
    cycle: string;
  };

  // === 关系网络 (PLAN/33) ===
  relationships: Map<string, SocialNetwork>;

  // === 健康与状态 ===
  health: {
    current: number;           // 0-100
    deathProbability: number;
    conditions: string[];
  };

  // === 继承系统 (PLAN/35 + PLAN/13) ===
  inheritance: {
    heir: string | null;
    will: string | null;
    assets: Asset[];
  };

  // === 人生事件记录 (PLAN/35) ===
  lifeEvents: {
    type: string;
    date: Date;
    description: string;
    playerInvolved: boolean;
  }[];

  // === Agent特有属性 ===
  personality?: PersonalityProfile; // Agent NPC的性格
  memory?: Memory[];               // Agent NPC的记忆
  goals?: string[];                // Agent NPC的目标
}

// 技能挂载结构 (PLAN/27)
interface MountedSkill {
  skillId: string;
  level: number;                // 1-4: 入门/精通/大师/传奇
  modifiers: string[];          // NPC特有的技能变体
}

// 社会网络结构 (PLAN/33)
interface SocialNetwork {
  strength: number;             // -100 ~ +100
  nature: {
    type: 'kinship' | 'political' | 'economic' | 'social' | 'conflict';
    direction: 'mutual' | 'asymmetric' | 'opposing';
    durability: 'permanent' | 'long-term' | 'short-term' | 'transactional';
  };
  bindings: {
    mutualBenefit: string[];
    conflictInterest: string[];
    debt: string[];
    obligation: string[];
  };
}
```

### 3.3 统一团体数据模型

整合PLAN/35-profession-guild、PLAN/36的设计：

```typescript
interface Guild {
  // === 基础信息 ===
  id: string;
  name: string;
  type: 'guild' | 'academy' | 'union' | 'military' | 'network' | 'council';
  faction?: 'canglong' | 'shuanglang' | 'jinque' | 'border' | 'international';

  // === 组织形态 ===
  structure: 'tight' | 'loose' | 'elite' | 'secret';
  politicalStance: 'faction_bound' | 'faction_tilt' | 'faction_neutral';

  // === 位置 ===
  headquarter: string;          // 总部城市ID

  // === 加入条件 (PLAN/36) ===
  requirements: {
    skills?: { skillId: string; minLevel: number }[];
    resources?: { type: string; amount: number }[];
    relations?: { npcId: string; minRelation: number }[];
    factionRep?: { faction: string; minRep: number }[];
    special?: string;
  };

  // === 成员等级体系 ===
  ranks: GuildRank[];

  // === 成员列表 ===
  members: {
    npcId: string;
    rank: string;
    joinDate: Date;
    contribution: number;
  }[];
  totalMembers: number;

  // === 提供的资源 (PLAN/36) ===
  benefits: {
    skillLearning: boolean;
    resourceAccess: boolean;
    information: boolean;
    taskChannel: boolean;
    socialNetwork: boolean;
    protection: boolean;
    title: boolean;
    politicalInfluence: boolean;
  };

  // === 成员义务 ===
  obligations: {
    fee?: number;
    service?: string;
    teaching?: boolean;
    confidentiality?: boolean;
    loyalty?: boolean;
  };

  // === 团体状态 ===
  status: {
    influence: number;          // 团体影响力 0-100
    reputation: number;         // 团体声誉
    isActive: boolean;
    treasury: number;           // 团体资金
  };

  // === 关键人物 ===
  keyMembers: {
    leader?: string;            // 团体领袖NPC ID
    managers: string[];
  };
}

// 团体等级结构
interface GuildRank {
  id: string;
  name: string;
  level: number;
  title: string;

  promotionRequirements: {
    skills?: { skillId: string; minLevel: number }[];
    contribution?: number;
    time?: number;              // 在团体时间（游戏月）
    special?: string;
  };

  privileges: string[];
  duties: string[];
}
```

### 3.4 社会状态数据模型

整合PLAN/33的设计：

```typescript
interface SocialState {
  // === 经济循环状态 ===
  economy: {
    production: Map<string, number>;     // 区域 → 总产出
    distribution: {
      trades: Trade[];
      prices: Map<string, number>;       // 商品 → 价格
      shortages: Map<string, number>;    // 商品 → 缺口比例
    };
    consumption: Map<string, number>;    // 阶层 → 消费量
    taxation: {
      collected: number;
      rates: Map<string, number>;        // 阵营 → 税率
    };
  };

  // === 权力循环状态 ===
  power: {
    distribution: Map<string, number>;   // NPC → 权力值
    vacancies: Array<{
      position: string;
      severity: number;
    }>;
    recentChanges: Array<{
      npcId: string;
      reason: string;
      delta: number;
    }>;
  };

  // === 关系循环状态 ===
  relationships: {
    networkState: Map<string, Map<string, number>>;
    pendingChanges: Array<{
      from: string;
      to: string;
      reason: string;
      delta: number;
    }>;
  };

  // === 矛盾积累状态 ===
  conflicts: {
    resourceConflicts: Map<string, number>;
    powerConflicts: Map<string, number>;
    relationshipConflicts: Map<string, number>;
    stratumTensions: Map<string, number>; // 阵营 → 阶层张力值
  };

  // === 阵营关系 ===
  factionRelations: {
    canglong_shuanglang: number;
    canglong_jinque: number;
    shuanglang_jinque: number;
    border_all: number;
  };
}
```

---

## 四、系统协调机制

### 4.1 时间同步机制

所有系统共享统一的时间尺度：

```
现实时间 → 游戏时间
1小时   ≈  半个游戏日
1天     ≈  1个游戏月
1个月   ≈  1个游戏年

各系统更新频率：
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  每游戏日更新（每现实小时）：                                  │
│  ├── 经济系统：资源产出结算                                   │
│  ├── 关系系统：日常互动计数器                                 │
│  ├── Template NPC：状态更新                                  │
│  └── 晨报生成：当日事件汇总                                   │
│                                                              │
│  每游戏周更新（每现实半天）：                                  │
│  ├── 团体系统：团体活动触发                                   │
│  ├── NPC人生：技能学习进度                                    │
│  ├── 玩家成长：技能经验结算                                   │
│  └── 关系衰减：超时不互动检测                                 │
│                                                              │
│  每游戏月更新（每现实一天）：                                  │
│  ├── 社会运行：矛盾值结算                                     │
│  ├── 阶层系统：阶层稳定性检查                                 │
│  ├── NPC人生：年龄增长、人生阶段更新                          │
│  ├── 团体系统：贡献统计、等级晋升检查                         │
│  └── 经济平衡：资源软上限衰减                                 │
│                                                              │
│  每游戏季更新（每现实三天）：                                  │
│  ├── 社会运行：矛盾爆发检测                                   │
│  ├── 权力循环：权力真空检测                                   │
│  └── NPC人生：婚姻/生育事件检测                               │
│                                                              │
│  每游戏年更新（每现实月）：                                    │
│  ├── NPC人生：死亡概率结算                                    │
│  ├── 阵营决策：年度政策评估                                   │
│  ├── 团体大会：领袖选举/年度总结                              │
│  └── Chronos：世界格局调整                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 数据一致性约束

```
核心一致性规则：

1. 关系值一致性
   ├── 玩家→NPC关系值 = NPC→玩家关系值（双向绑定）
   ├── 团体成员关系 → 自动计入NPC关系网络
   └── 关系变化 → 同时更新双方记录

2. 阵营声望一致性
   ├── 阵营效忠 → 该阵营声望≥30
   ├── 阵营背叛 → 原阵营声望-80
   └── 团体效忠 → 团体所属阵营声望影响

3. 阶层一致性
   ├── 阶层判定 → 基于统一公式计算
   ├── 阶层变化 → 触发权限和事件类型变化
   └── NPC阶层 → 影响其社会关系网络

4. 技能一致性
   ├── 技能等级 → 统一的L1-L10体系
   ├── 技能学习 → 团体内学习效率提升
   └── 技能继承 → 继承人继承×70%

5. 经济一致性
   ├── 金币流动 → 每次变化有叙事反馈
   ├── 资源上限 → 超限自动衰减
   └── NPC经济 → 产出/消费计入社会循环
```

### 4.3 事件优先级仲裁

当多个系统同时触发事件时：

```
事件优先级规则：

优先级1（立即执行）：
├── 玩家主动触发的事件（选择响应）
├── NPC死亡的继承事件
├── 团体入会/驱逐事件
└── 阵营效忠/背叛事件

优先级2（当游戏日执行）：
├── 关系变化事件（帮助/背叛）
├── 技能提升事件（突破）
├── 阶层变化事件（晋升/下降）
└── 团体活动事件（聚会/任务）

优先级3（当游戏周执行）：
├── 婚姻/生育事件
├── 团体竞争事件
├── NPC职业变化事件
└── 矛盾积累结算

优先级4（当游戏月执行）：
├── 社会矛盾爆发事件
├── 权力争夺事件
├── 阵营政策变化事件
└── NPC年龄阶段转换事件

优先级5（当游戏季执行）：
├── 大规模冲突事件（战争/民变）
├── 阵营关系重大变化
└── 历史转折点事件

冲突仲裁：
├── 同优先级 → 按重要性（影响范围）排序
├── 玩家相关 → 优先玩家可见事件
├── 连锁事件 → 按因果链顺序执行
└── 每日上限 → 最多3个重要事件展示给玩家
```

---

## 五、系统衔接验证清单

### 5.1 玩家系统衔接验证

```
玩家存在系统 ←→ NPC人生系统：
├── ✓ 玩家年龄遵循NPC人生阶段规则
├── ✓ 玩家技能继承遵循NPC遗传公式（子女潜力）
├── ✓ 玩家继承人遵循NPC继承规则
└── ✓ 玩家与NPC共享阵营效忠机制

玩家存在系统 ←→ 团体系统：
├── ✓ 玩家团体身份计入社会位置判定
├── ✓ 团体贡献影响玩家阶层晋升
├── ✓ 团体领袖身份影响阵营声望
└── ✓ 团体技能学习计入玩家成长系统

玩家存在系统 ←→ 经济系统：
├── ✓ 玩家金币计入社会经济循环
├── ✓ 玩家影响力计入社会关系循环
├── ✓ 玩家阶层由经济实力+政治影响力+社交网络共同判定
└── ✓ 玩家资源变化有叙事反馈

玩家存在系统 ←→ 社会运行机制：
├── ✓ 玩家行为影响矛盾积累（如大规模购买触发资源矛盾）
├── ✓ 玩家选择影响事件爆发（如支持某派系加剧权力矛盾）
├── ✓ 玩家存在感体现在晨报传播
└── ✓ 玩家继承触发社会权力变化
```

### 5.2 NPC系统衔接验证

```
NPC人生系统 ←→ 团体系统：
├── ✓ NPC职业发展路径包含团体晋升
├── ✓ NPC团体身份计入社会地位
├── ✓ NPC团体关系影响其关系网络
└── ✓ NPC团体贡献计入继承资格

NPC人生系统 ←→ 社会运行机制：
├── ✓ NPC人生事件由社会逻辑驱动（而非随机）
├── ✓ NPC成功/失败由社会因素积累决定
├── ✓ NPC婚姻由社会匹配度决定
└── ✓ NPC死亡触发社会权力变化

NPC人生系统 ←→ Template NPC系统：
├── ✓ Template NPC遵循NPC人生阶段规则
├── ✓ Template NPC技能等级遵循人生成长曲线
├── ✓ Template NPC可晋升为Agent NPC
└── ✓ Template NPC状态计入社会经济循环

NPC人生系统 ←→ 城市生态：
├── ✓ NPC职业与城市功能匹配
├── ✓ NPC分布遵循城市生态需求
├── ✓ NPC生命周期影响城市人口平衡
└── ✓ NPC死亡触发城市职位空缺
```

### 5.3 团体系统衔接验证

```
团体系统 ←→ 社会运行机制：
├── ✓ 团体活动计入社会循环（经济活动→经济循环）
├── ✓ 团体决策影响阵营政策
├── ✓ 团体竞争计入权力矛盾积累
└── ✓ 团体声誉影响社会张力

团体系统 ←→ 经济系统：
├── ✓ 团体入会费计入社会资金流动
├── ✓ 团体贡献计入玩家影响力判定
├── ✓ 团体资源影响成员经济实力
└── ✓ 团体垄断影响市场价格

团体系统 ←→ Template NPC系统：
├── ✓ 团体成员NPC使用Template技能系统
├── ✓ 团体技能传承使用Template技能挂载
├── ✓ 团体NPC升级遵循Template升级路径
└── ✓ 团体领袖可能为Agent NPC
```

---

## 六、补充缺失元素

### 6.1 原设计缺失 → 补充设计

| 原缺失内容 | 补充来源 | 补充设计 |
|------------|----------|----------|
| **玩家与NPC关系的社会约束** | PLAN/33关系循环 | 高关系不仅是好处，还有责任约束（不救则崩溃、敌对联动） |
| **团体成员间的自动关系** | PLAN/33关系循环 | 团体成员自动建立"同业关系"，团体竞争产生"派系关系" |
| **NPC的团体晋升路径** | PLAN/35职业发展 | 补充：团体内等级→团体领袖→阵营决策参与 |
| **玩家团体的退出机制** | PLAN/36退出机制 | 正常退出、违约退出、被驱逐三种方式及后果 |
| **团体与阵营的绑定关系** | PLAN/35-profession-guild | 补充：阵营绑定型团体、阵营倾向型、阵营中立型 |
| **经济循环中的玩家角色** | PLAN/33经济循环 | 玩家是"特殊消费者"，大规模购买影响供需 |
| **社会张力对玩家的影响** | PLAN/33阶层张力 | 玩家可被卷入民变/起义事件，需选择立场 |
| **继承危机的玩家参与** | PLAN/33权力争夺 | 玩家可推荐/支持继承人，影响争夺结果 |

### 6.2 补充设计详情

**补充1：玩家与NPC关系的社会约束**

```
高关系NPC对玩家的约束机制：

关系≥60的NPC：
├── 玩家伤害其阵营 → 关系-20~40
├── NPC遇险玩家不救 → 关系降至≤20
└── NPC请求玩家拒绝 → 关系-10~20

关系≥80的NPC：
├── NPC的仇敌可能成为玩家敌人（关系继承-30）
├── NPC的请求玩家几乎必须响应
├── NPC死亡 → 玩家可能获得遗产/嘱托
└── NPC背叛 → 玩家声誉可能受损

叙事反馈：
"老锤是你的生死之交，但他发现你帮助了他的竞争对手..."
→ 关系从+80降至+40
→ 老锤的态度从"无条件信任"变为"谨慎合作"
```

**补充2：团体成员间的自动关系**

```
加入团体自动建立的关系：

同业关系（基础）：
├── 团体成员自动获得"同业者"标签
├── 同业者初始关系：+20
├── 同业者更愿意合作（任务协作+10）
└── 同业者竞争时关系可能下降

派系关系（团体内部）：
├── 团体内部有派系（如改革派vs传统派）
├── 同派系成员关系+10
├── 对派系成员关系-10
└── 派系冲突可能引发团体分裂

上下级关系（团体内等级）：
├── 上级→下级：指导/提携关系
├── 下级→上级：效忠/服从关系
├── 上级支持 → 下级晋升更快
└── 下级背叛 → 上级关系剧烈下降
```

**补充3：团体与阵营绑定关系**

```
团体政治立场分类：

阵营绑定型（加入=效忠）：
├── 苍龙正规军团 → 效忠苍龙帝国
├── 霜狼战团 → 效忠霜狼联邦
├── 金雀花海军 → 效忠金雀花王国
└── 边境民兵队 → 效忠边境联盟

阵营倾向型（倾向但不强制）：
├── 五行学院 → 倾向苍龙，但不强制效忠
├── 银行公会 → 倾向金雀花
├── 铁匠工会 → 倾向所属阵营
└── 团体活动可能影响阵营声望

阵营中立型（跨阵营）：
├── 大陆商会 → 中立，服务所有阵营
├── 治愈师联盟 → 中立，人道组织
├── 佣兵国际 → 中立，任务驱动
└── 加入不影响阵营关系，但可能被质疑
```

---

## 七、MVP实现路径

### 7.1 MVP阶段（P0）实现范围

```
必须实现的核心功能：

┌─────────────────────────────────────────────────────────────┐
│                     MVP核心功能矩阵                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  玩家系统：                                                   │
│  ├── 三条成长线基础（谋略L1-3、武力L1-3、经营L1-3）           │
│  ├── 阵营效忠基础机制                                         │
│  ├── 关系系统（-100~+100，20个重要NPC限制）                   │
│  └── 基础继承机制                                             │
│                                                              │
│  NPC系统：                                                    │
│  ├── Template NPC技能挂载系统                                 │
│  ├── NPC人生阶段（青年、壮年、老年简化版）                     │
│  ├── NPC死亡与继承                                            │
│  └── 城市功能NPC分布                                          │
│                                                              │
│  团体系统：                                                    │
│  ├── 5个核心团体（铁匠工会、佣兵工会、商会、五行学院、谷主大会）│
│  ├── 基础加入流程（申请→考验→加入）                            │
│  ├── 团体资源提供（技能学习、人脉建立）                         │
│  └── 团体定期活动（月度聚会）                                  │
│                                                              │
│  经济系统：                                                    │
│  ├── 双资源（金币、影响力）                                    │
│  ├── 资源获取/消耗API                                          │
│  ├── 每日结算Cron                                             │
│  └── 社会阶层判定                                             │
│                                                              │
│  社会运行：                                                    │
│  ├── 关系自然衰减                                             │
│  ├── 资源矛盾检测（简化版）                                    │
│  └── 阶层下降风险                                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 P1阶段扩展范围

```
P1阶段扩展功能：

玩家系统：
├── 完整三条成长线（L1-10）
├── 技能解锁叙事视角机制
├── 深层关系约束（关系≥60的责任）
└── 完整继承人培养系统

NPC系统：
├── 完整七大人生阶段
├── 婚姻与家庭系统
├── NPC自动关系变化机制
└── Template→Agent升级机制

团体系统：
├── 完整团体体系（四阵营所有团体）
├── 团体内等级晋升
├── 团体竞争事件
├── 团体退出机制
└── 团体影响阵营决策

社会运行：
├── 完整经济循环（生产→分配→消费）
├── 权力争夺过程模拟
├── 关系利益绑定
└── 事件因果链
```

### 7.3 P2阶段完整范围

```
P2阶段完整实现：

├── 完整社会循环（经济+权力+关系）
├── NPC大规模社会模拟
├── 阶层张力系统
├── 完整继承危机机制
├── 社会动态事件爆发模型
├── 团体生命周期（兴盛/衰落/分裂）
├── 跨阵营团体与阵营关系平衡
└── Chronos社会平衡干预
```

---

## 八、总结：社会生态系统核心原则

### 8.1 七大核心原则

```
1. 社会自动运转原则
   社会不是静态背景，而是动态运转的机器
   NPC的行为有社会逻辑支撑，而非随机

2. 矛盾积累爆发原则
   事件是矛盾积累的自然爆发，而非凭空注入
   矛盾释放后形成新的矛盾，社会持续变化

3. 实体社会位置原则
   玩家和NPC的社会位置由多种因素共同决定
   阶层不是标签，而是动态的社会位置

4. 关系双向绑定原则
   关系不是单向获取，而是双向绑定
   高关系带来好处，也带来约束和责任

5. 团体社会桥梁原则
   团体是玩家融入社会的核心桥梁
   团体不只是资源渠道，而是身份和人脉的来源

6. 继承传承延续原则
   死亡不是结束，而是传承的开始
   继承人延续玩家的故事，NPC的遗产继续影响社会

7. 数据一致性原则
   所有系统共享统一的数据模型
   时间尺度、关系值、阶层判定保持一致
```

### 8.2 设计验证清单

**每个功能加入前，问自己：**

1. 这个机制是否让社会看起来"自己运转"？
2. NPC的行为是否有社会逻辑支撑？
3. 事件是否是矛盾积累的自然爆发？
4. 社会变化是否有因果关系？
5. 这个机制能否在叙事中体现？
6. 数据是否在所有系统中保持一致？
7. 玩家的选择是否有社会范围的后果？

---

## 附录：系统文档索引

| 序号 | 文档 | 核心内容 | 整合状态 |
|------|------|----------|----------|
| 1 | PLAN/33 | 社会运行机制 | ✓ 已整合 |
| 2 | PLAN/34 | 玩家存在与成长系统 | ✓ 已整合 |
| 3 | PLAN/35 | NPC人生成长系统 | ✓ 已整合 |
| 4 | PLAN/35-profession-guild | 职业团体系统 | ✓ 已整合 |
| 5 | PLAN/36-player-guild | 玩家融入团体系统 | ✓ 已整合 |
| 6 | PLAN/16 | 经济与社会系统MVP | ✓ 已整合 |
| 7 | PLAN/27 | Template NPC系统 | ✓ 已整合 |
| 8 | PLAN/28 | 城市NPC生态系统 | ✓ 已整合 |
| 9 | PLAN/13 | NPC生命周期系统 | ✓ 已整合 |

---

*文档版本：v1.0*
*创建日期：2026-04-17*
*适用范围：Agame 社会生态系统整合设计*