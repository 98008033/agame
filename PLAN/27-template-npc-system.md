# Agame Template NPC 技能与对话模板

> **核心理念**：Template NPC是"半智能"NPC，他们不具备完整Agent的自主决策能力，但通过**技能挂载系统**和**对话模板**实现可信的行为表现。他们像RPG游戏中的标准NPC一样工作——有预设的功能，但能根据情境变化。

---

## 一、Template NPC 定义

### 1.1 什么是Template NPC

Template NPC是介于完全自主的Agent和静态脚本NPC之间的存在：

| 特性 | Agent NPC | Template NPC | 静态NPC |
|------|-----------|--------------|---------|
| **决策能力** | 完全自主，LLM驱动 | 技能驱动，有限选择 | 无，纯脚本 |
| **对话生成** | 实时生成 | 模板+变量填充 | 固定文本 |
| **行为变化** | 根据完整上下文动态调整 | 根据技能等级和状态变化 | 固定行为 |
| **记忆** | 完整记忆系统 | 关键状态记录 | 无记忆 |
| **计算成本** | 高（每次调用LLM） | 低（模板匹配） | 无 |

### 1.2 何时使用Template NPC

**使用Template的场景**：
- 功能性NPC（铁匠、商人、医者）
- 执行明确任务的NPC（士兵、斥候、密探）
- 不需要深度决策的配角（弟子、副手、学徒）
- 大量存在的普通角色（村民、水手、佣兵）

**升级为Agent的条件**：
- 角色地位显著提升（副将晋升为将军）
- 玩家与其建立了深度关系
- 剧情需要其做出复杂决策
- 成为事件链的关键人物

---

## 二、Template NPC 技能系统

### 2.1 技能挂载机制

Template NPC通过挂载技能获得行为能力。技能就像"插件"，决定NPC能做什么、会做什么。

```typescript
interface TemplateNPC {
  id: string;
  name: string;
  role: string;
  type: 'template';

  // 挂载的技能列表
  skills: MountedSkill[];

  // 技能等级
  skillLevels: Record<string, number>; // 技能ID -> 等级(1-4)

  // 当前状态
  state: NPCState;

  // 对话模板
  dialogueTemplates: DialogueTemplate[];
}

interface MountedSkill {
  skillId: string;      // 技能定义ID
  level: number;        // 1-4: 入门/精通/大师/传奇
  modifiers: string[];  // 该NPC的技能变体
}
```

### 2.2 标准技能定义

每个技能定义包含：
- **功能效果**：技能能做什么
- **对话模板集**：不同等级对应的对话风格
- **行为树**：技能触发的行为模式

```typescript
interface SkillDefinition {
  id: string;
  name: string;
  category: 'combat' | 'craft' | 'magic' | 'social' | 'gathering';

  // 技能等级定义
  levels: {
    1: LevelDefinition;  // 入门
    2: LevelDefinition;  // 精通
    3: LevelDefinition;  // 大师
    4: LevelDefinition;  // 传奇
  };

  // 可执行动作
  actions: SkillAction[];
}

interface LevelDefinition {
  title: string;           // 等级称号
  capabilities: string[];  // 能力描述
  dialogueStyle: string;   // 对话风格提示
  successRate: number;     // 基础成功率
}
```

---

## 三、核心技能定义

### 3.1 锻造技能（铁匠系）

```typescript
const smithingSkill: SkillDefinition = {
  id: 'smithing',
  name: '锻造',
  category: 'craft',

  levels: {
    1: {
      title: '铁匠学徒',
      capabilities: ['修理普通装备', '打造基础工具', '识别常见矿石'],
      dialogueStyle: '语气谦逊，经常询问玩家需求，会推荐基础装备',
      successRate: 0.7
    },
    2: {
      title: '资深铁匠',
      capabilities: ['打造精良武器', '强化装备', '识别稀有矿石'],
      dialogueStyle: '自信专业，会给装备建议，偶尔谈论锻造心得',
      successRate: 0.85
    },
    3: {
      title: '锻造大师',
      capabilities: ['打造魔法武器', '修复古代装备', '开发新配方'],
      dialogueStyle: '沉稳威严，话语不多但每句有价值，重视材料品质',
      successRate: 0.95
    },
    4: {
      title: '传奇铸甲师',
      capabilities: ['打造神器', '创造新锻造流派', '赋予装备灵魂'],
      dialogueStyle: '近乎沉默，通过行动说话，偶尔说出富含哲理的话',
      successRate: 1.0
    }
  },

  actions: [
    {
      id: 'repair',
      name: '修理装备',
      condition: '装备耐久 < 100%',
      cost: '根据装备等级计算',
      effect: '恢复装备耐久'
    },
    {
      id: 'craft',
      name: '打造装备',
      condition: '拥有材料 + 技能等级 >= 装备等级',
      cost: '材料 + 金币',
      effect: '生成新装备'
    },
    {
      id: 'upgrade',
      name: '强化装备',
      condition: '技能等级 >= 2',
      cost: '强化材料 + 金币',
      effect: '提升装备属性'
    }
  ]
};
```

**对话模板示例（铁匠）**：

```yaml
# 入门级铁匠对话模板
dialogue_templates:
  greeting:
    - "客官需要点什么？小的这儿能修装备、打些基础家伙什。"
    - "欢迎光临！有什么我能帮忙的吗？"
    - "您是来修装备还是买东西？"

  repair_offer:
    - "这{equipment}磨损得厉害啊，{cost}帮您修好，成吗？"
    - "修这个得花{cost}，您看行不？"

  craft_offer:
    - "您有材料的话，我能帮您打{equipment}，手工费{cost}。"
    - "打这个需要{materials}，您备齐了我就能开工。"

  skill_too_low:
    - "这活儿有点难，我得再练练...要不您找别的师傅看看？"
    - "哎呀，这个我还做不来，对不住了。"

  success:
    - "成了！您看看满意不？"
    - "搞定，拿好嘞！"

  failure:
    - "哎呀，手滑了...材料没坏，我再来一次。"
    - "这材料比我想象的难对付..."
```

### 3.2 治愈技能（医者系）

```typescript
const healingSkill: SkillDefinition = {
  id: 'healing',
  name: '治愈',
  category: 'magic',

  levels: {
    1: {
      title: '见习医者',
      capabilities: ['治疗轻伤', '识别常见疾病', '制作基础药剂'],
      dialogueStyle: '关心体贴，详细询问症状，谨慎下药',
      successRate: 0.7
    },
    2: {
      title: '资深医师',
      capabilities: ['治疗重伤', '解毒', '治愈常见疾病'],
      dialogueStyle: '专业冷静，快速诊断，给出明确建议',
      successRate: 0.85
    },
    3: {
      title: '治愈大师',
      capabilities: ['治疗魔法伤害', '复活濒死者', '治愈瘟疫'],
      dialogueStyle: '温和慈悲，话不多但给人安心感，重视生命价值',
      successRate: 0.95
    },
    4: {
      title: '圣愈之手',
      capabilities: ['起死回生', '净化邪恶诅咒', '群体治愈'],
      dialogueStyle: '近乎神圣，言语简洁有力，行动优先',
      successRate: 1.0
    }
  },

  actions: [
    {
      id: 'heal',
      name: '治疗',
      condition: '目标受伤',
      cost: '根据伤势计算',
      effect: '恢复生命值'
    },
    {
      id: 'cure_disease',
      name: '治疗疾病',
      condition: '目标患病 + 技能等级 >= 疾病等级',
      cost: '药剂 + 金币',
      effect: '移除疾病状态'
    },
    {
      id: 'resurrect',
      name: '复活',
      condition: '技能等级 >= 3 + 死亡时间 < 限制',
      cost: '大量资源',
      effect: '复活目标'
    }
  ]
};
```

**对话模板示例（医者）**：

```yaml
dialogue_templates:
  greeting:
    - "哪里不舒服？让我看看。"
    - "看病还是买药？"

  diagnosis:
    - "这是{condition}，需要{treatment}，费用{cost}。"
    - "伤得不轻啊...得花{cost}治疗，您看行吗？"

  heal_success:
    - "好了，休养几天就没事了。"
    - "毒已经清了，回去多喝水。"

  heal_failure:
    - "这伤势太重了...我尽力了。"
    - "需要更高级的治疗师..."

  no_cure:
    - "这病我治不了，您得去找{cure_location}。"
    - "我的水平不够...抱歉。"
```

### 3.3 情报收集技能（密探系）

```typescript
const intelligenceSkill: SkillDefinition = {
  id: 'intelligence',
  name: '情报收集',
  category: 'social',

  levels: {
    1: {
      title: '新手密探',
      capabilities: ['收集公开信息', '识别明显谎言', '跟踪目标'],
      dialogueStyle: '谨慎小心，说话模棱两可，不轻易透露身份',
      successRate: 0.6
    },
    2: {
      title: '资深密探',
      capabilities: ['渗透组织', '获取机密', '建立情报网'],
      dialogueStyle: '善于伪装，能融入不同角色，话语有目的性',
      successRate: 0.8
    },
    3: {
      title: '情报大师',
      capabilities: ['操控信息流', '识破复杂阴谋', '管理大型情报网'],
      dialogueStyle: '深藏不露，每句话都经过计算，让人捉摸不透',
      successRate: 0.9
    },
    4: {
      title: '影之主',
      capabilities: ['预知威胁', '操控局势', '无中生有'],
      dialogueStyle: '几乎不说话，但每个动作都有深意',
      successRate: 1.0
    }
  },

  actions: [
    {
      id: 'gather_info',
      name: '收集情报',
      condition: '目标区域可进入',
      cost: '时间 + 风险',
      effect: '获取情报'
    },
    {
      id: 'infiltrate',
      name: '渗透',
      condition: '技能等级 >= 2',
      cost: '高风险',
      effect: '进入敌对组织'
    }
  ]
};
```

### 3.4 符文铭刻技能（符文师系）

```typescript
const runeCraftingSkill: SkillDefinition = {
  id: 'rune_crafting',
  name: '符文铭刻',
  category: 'magic',

  levels: {
    1: {
      title: '符文学徒',
      capabilities: ['识别基础符文', '铭刻简单增益符文'],
      dialogueStyle: '对符文充满热情，经常谈论符文理论',
      successRate: 0.7
    },
    2: {
      title: '符文师',
      capabilities: ['铭刻战斗符文', '组合符文效果', '修复损坏符文'],
      dialogueStyle: '自信专业，会根据需求推荐符文组合',
      successRate: 0.85
    },
    3: {
      title: '符文大师',
      capabilities: ['创造新符文', '铭刻灵魂绑定符文', '解除强大诅咒'],
      dialogueStyle: '沉稳内敛，重视符文与使用者的契合',
      successRate: 0.95
    },
    4: {
      title: '符文贤者',
      capabilities: ['铭刻传说级符文', '理解符文本源', '与祖灵沟通'],
      dialogueStyle: '与祖灵对话般的状态，言语神秘',
      successRate: 1.0
    }
  }
};
```

### 3.5 契约法术技能（契约法师系）

```typescript
const pactMagicSkill: SkillDefinition = {
  id: 'pact_magic',
  name: '契约法术',
  category: 'magic',

  levels: {
    1: {
      title: '契约学徒',
      capabilities: ['签订简单契约', '理解契约条款', '检测契约陷阱'],
      dialogueStyle: '谨慎小心，反复确认条款，担心代价',
      successRate: 0.65
    },
    2: {
      title: '契约法师',
      capabilities: ['谈判契约条件', '修改现有契约', '召唤低级异界存在'],
      dialogueStyle: '专业冷静，善于谈判，明确说明代价',
      successRate: 0.8
    },
    3: {
      title: '契约大师',
      capabilities: ['签订强力契约', '召唤中级异界存在', '解除他人契约'],
      dialogueStyle: '深沉神秘，对契约代价有深刻理解',
      successRate: 0.9
    },
    4: {
      title: '契约仲裁者',
      capabilities: ['创造新契约形式', '召唤大能存在', '强制履行契约'],
      dialogueStyle: '与异界存在相似的气质，言语带有力量',
      successRate: 0.95
    }
  }
};
```

---

## 四、对话模板系统

### 4.1 模板结构

对话模板采用分层结构：

```yaml
dialogue_system:
  # 1. 基础模板（所有NPC通用）
  base_templates:
    greeting: [...]
    farewell: [...]
    unknown_topic: [...]

  # 2. 职业模板（按职业分类）
  profession_templates:
    blacksmith:
      greeting: [...]
      repair: [...]
      craft: [...]
    healer:
      greeting: [...]
      diagnose: [...]
      treat: [...]

  # 3. 阵营模板（按阵营调整语气）
  faction_templates:
    canglong:  # 苍龙：正式、礼貌
      speech_pattern: "使用敬语，引用典故，注重礼节"
    shuanglang:  # 霜狼：直率、豪爽
      speech_pattern: "简洁有力，使用俗语，重承诺"
    jinque:  # 金雀花：商业、务实
      speech_pattern: "直接谈价，强调利益，讲究契约"
    border:  # 边境：灵活、随意
      speech_pattern: "随和亲切，夹杂各地口音，实用主义"

  # 4. 个性模板（NPC个体差异）
  personality_templates:
    cheerful:  # 开朗
      modifiers: ["经常使用感叹号", "主动分享信息", "热情推荐"]
    stern:  # 严肃
      modifiers: ["话语简短", "只说必要信息", "不轻易笑"]
    cunning:  # 狡猾
      modifiers: ["话中有话", "经常反问", "暗示而非明说"]
```

### 4.2 变量填充系统

模板支持动态变量：

```typescript
interface DialogueContext {
  // 玩家信息
  player: {
    name: string;
    reputation: number;  // 与NPC的关系值
    faction: string;
    rank: string;
  };

  // 游戏世界状态
  world: {
    season: string;
    timeOfDay: string;
    recentEvents: string[];
    factionRelations: Record<string, number>;
  };

  // NPC自身状态
  npc: {
    mood: string;
    health: number;
    currentTask: string;
    memory: string[];  // 与该玩家的关键记忆
  };

  // 对话具体情境
  context: {
    topic: string;
    previousDialogue: string;
    playerChoice: string;
  };
}

// 模板示例
const greetingTemplate = `
  {% if player.reputation > 50 %}
    哎呀，{player.name}！好久不见，快请进！
  {% elif player.reputation > 0 %}
    欢迎，{player.name}。有什么需要吗？
  {% else %}
    你是...{player.name}是吧？有什么事？
  {% endif %}

  {% if world.timeOfDay == 'morning' %}
    一大早就有客人，今天运气不错。
  {% elif world.timeOfDay == 'night' %}
    这么晚了还出门，小心点。
  {% endif %}
`;
```

### 4.3 情境响应模板

不同情境下的响应模板：

```yaml
# 交易相关
trading:
  offer_accepted:
    - "成交！这是您的{item}。"
    - "好，{price}就{price}，交个朋友。"

  offer_rejected:
    - "这价格太低了，我亏不起。"
    - "要不您再看看别的？"

  out_of_stock:
    - "{item}暂时缺货，过几天再来看看？"
    - "最近{reason}，这东西不好进货。"

# 任务相关
quest:
  offer_quest:
    - "我正需要人帮忙{item}，您有兴趣吗？报酬{reward}。"
    - "有个活儿，{difficulty}程度，接吗？"

  quest_complete:
    - "办得好！这是说好的{reward}。"
    - "果然没看错您，辛苦了！"

  quest_failed:
    - "这事儿没办成...没事，还有机会。"
    - "唉，看来这事比想的难。"

# 信息相关
information:
  give_info:
    - "我听说{information}，您感兴趣吗？"
    - "最近{topic}那边不太平..."

  ask_payment:
    - "这消息值{cost}，您看..."
    - "情报不免费，{cost}如何？"
```

---

## 五、Template NPC 升级路径

### 5.1 技能提升

Template NPC的技能等级可以通过以下方式提升：

```typescript
interface SkillImprovement {
  // 提升途径
  sources: {
    practice: {           // 实践提升
      description: '执行相关任务获得经验';
      rate: '慢但稳定';
    };
    training: {           // 训练提升
      description: '向更高级的NPC学习';
      rate: '中等，需要资源';
    };
    inspiration: {        // 顿悟提升
      description: '特殊事件触发突破';
      rate: '快但不可控';
    };
    player_assist: {      // 玩家协助
      description: '玩家提供资源或指导';
      rate: '快，依赖玩家';
    };
  };

  // 技能退化（长期不使用）
  degradation: {
    condition: '连续X个游戏月不使用该技能';
    effect: '技能等级可能下降1级（不会低于1）';
    prevention: '定期练习或使用技能书保持';
  };
}
```

### 5.2 晋升为Agent

当Template NPC满足条件时，可以升级为Agent NPC：

```typescript
interface PromotionToAgent {
  // 升级条件
  conditions: {
    position: '担任关键职位（村长、将军、首领等）';
    relationship: '与玩家建立深度关系（声望>80，有共同经历）';
    plot: '成为重要事件链的核心人物';
    skill: '某项技能达到大师级（3级）以上';
  };

  // 升级效果
  effects: {
    decisionMaking: '获得完整LLM决策能力';
    memory: '接入完整记忆系统';
    autonomy: '可以自主发起行动和事件';
    dialogue: '对话完全由LLM实时生成';
  };

  // 保留内容
  preserved: {
    skills: '保留所有已学习的技能';
    relationships: '保留所有关系数据';
    history: '保留完整历史记录';
    personality: '保留性格特征，作为LLM的system prompt';
  };
}
```

---

## 六、阵营特定模板

### 6.1 苍龙帝国模板

```yaml
faction: canglong
templates:
  speech_patterns:
    - 使用敬语："您"、"贵客"、"承蒙"
    - 引用典故：经常引用史书、先帝之言
    - 等级意识：对不同地位的人用不同语气

  common_phrases:
    greeting_high: ["贵客临门，有失远迎", "敢问大人有何吩咐"]
    greeting_equal: ["幸会", "久仰大名"]
    greeting_low: ["有什么需要效劳的", "请问有何贵干"]
    farewell: ["慢走", "恭送", "后会有期"]
    thanks: ["感激不尽", "铭记于心", "没齿难忘"]
```

### 6.2 霜狼联邦模板

```yaml
faction: shuanglang
templates:
  speech_patterns:
    - 简洁有力：短句为主，少修饰
    - 重视承诺：经常提到"荣誉"、"誓言"
    - 直来直去：不绕弯子，有问题直接说

  common_phrases:
    greeting: ["来了", "喝一口？", "有事直说"]
    agreement: ["一言为定", "以荣誉起誓", "就这么办"]
    challenge: ["比划比划？", "敢不敢赌一把？"]
    farewell: ["保重", "战场上见", "别死在外面"]
```

### 6.3 金雀花王国模板

```yaml
faction: jinque
templates:
  speech_patterns:
    - 谈价优先：先谈价格再谈感情
    - 契约精神：频繁提及"合约"、"条款"
    - 利益导向：每句话都暗示成本和收益

  common_phrases:
    greeting: ["有好买卖？", "预算多少？", "带来什么商机？"]
    negotiate: ["这个价格...", "要不这样，各退一步", "长期合作可以优惠"]
    contract: ["白纸黑字", "按合约办", "违约可是要赔的"]
    farewell: ["下次有好货找我", "保持联系", "期待合作"]
```

### 6.4 边境联盟模板

```yaml
faction: border
templates:
  speech_patterns:
    - 随和灵活：看人说人话，看鬼说鬼话
    - 实用主义：怎么方便怎么来
    - 包容混杂：言语中夹杂各地口音和用词

  common_phrases:
    greeting: ["来啦？", "吃点喝点？", "外面情况咋样？"]
    neutral: ["各退一步海阔天空", "有钱一起赚", "多个朋友多条路"]
    warning: ["最近不太平，小心点", "听说那边有麻烦", "别惹事"]
    farewell: ["路上小心", "活着回来", "有事找我"]
```

---

## 七、示例：完整Template NPC定义

### 7.1 铁匠·老锤（暮光村）

```yaml
npc_id: npc_border_smith_001
name: 老锤
type: template
role: 铁匠
location: 铁匠村
faction: border

# 挂载技能
skills:
  - id: smithing
    level: 2  # 资深铁匠
    modifiers: ["擅长修理农具", "能打造简单兵器"]

# 基础属性
attributes:
  age: 55
  mood: 沉稳
  health: 0.8

# 对话模板配置
dialogue_config:
  base: professional_blacksmith
  faction: border
  personality: stern_but_kind

# 记忆（简化版）
memory:
  - "玩家第一次来修了一把锄头"
  - "玩家帮村长跑腿后获得优惠"

# 行为树
behavior_tree:
  schedule:
    morning: "在铁匠铺工作"
    afternoon: "继续工作或去酒馆"
    evening: "酒馆喝酒"
    night: "回家睡觉"

  interactions:
    - trigger: "玩家携带损坏装备接近"
      action: "主动询问是否需要修理"
    - trigger: "玩家询问特殊装备"
      action: "推荐去苍龙找更好的铁匠"
```

### 7.2 妙手（苍龙帝国御医）

```yaml
npc_id: npc_canglong_healer_001
name: 妙手
type: template
role: 御医兼治愈师
location: 苍龙帝都
faction: canglong

skills:
  - id: healing
    level: 3  # 治愈大师
    modifiers: ["擅长治疗宫廷人物", "对政治伤害有经验"]

dialogue_config:
  base: professional_healer
  faction: canglong
  personality: gentle_professional

memory:
  - "曾被卷入皇子夺嫡的投毒事件"
  - "治愈过玩家一次重伤"
```

---

## 八、与Agent系统的协作

### 8.1 Template向Agent传递信息

Template NPC可以将重要信息传递给上级Agent：

```typescript
interface InformationRelay {
  // Template NPC感知到的重要信息
  trigger: {
    type: 'player_action' | 'world_event' | 'npc_interaction';
    importance: number;  // 1-10
    content: string;
  };

  // 上报路径
  relayPath: {
    template: 'Template NPC';           // 发现者
    superior: 'City/Normal Agent';      // 上级（城邦级/普通级Agent）
    decision: 'National Agent';         // 决策者（国家级Agent）
  };

  // 示例
  example: {
    situation: '玩家在边境大量收购武器';
    templateAction: '记录交易，标记玩家行为异常';
    relayTo: '边境村长Agent → 边境联盟领袖Agent';
    agentDecision: '领袖Agent决定调查玩家意图';
  };
}
```

### 8.2 Agent对Template的指令

Agent可以向Template NPC下达指令：

```typescript
interface AgentDirective {
  // 指令类型
  types: {
    task: '执行特定任务（收集情报、护送等）';
    watch: '监视特定目标';
    report: '定期汇报信息';
    prepare: '准备某事（如备战、囤积物资）';
  };

  // 指令执行
  execution: {
    template: '接收指令并执行';
    autonomy: '在技能范围内自主决策细节';
    reporting: '完成后向上级Agent汇报';
  };
}
```

---

## 九、总结

Template NPC系统的设计原则：

1. **够用即可**：Template NPC不需要真正的智能，只需要表现得足够可信
2. **技能驱动**：通过技能定义行为能力，通过等级体现成长
3. **模板+变量**：对话使用模板填充变量，既多样又可控
4. **可升级性**：关键Template NPC可以晋升为Agent，保持世界活力
5. **与Agent协作**：Template是Agent的"手足"，执行简单任务，上报重要信息

这套系统让大量NPC能够低成本地运转，同时为关键角色的深度交互留出空间。
