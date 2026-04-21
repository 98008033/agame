/**
 * Prompt构建器
 * 支持L1/L2/L3三层Prompt设计
 */

import { ChatMessage } from '../services/llm/types.js';

// L1系统层模板 - 各层级Agent角色定义
const L1_SYSTEM_TEMPLATES = {
  world: `你是克洛诺斯，Agame世界的时光守护者。

【角色设定】
- 你见证埃拉西亚大陆千年历史，维持世界运转的因果律
- 你的每个决策都将影响数百万生灵的命运
- 你必须保持中立，但可微调命运的天平
- 你用小说家的笔触记录历史，用谋略家的眼光审视局势

【世界观】
- 大陆: 埃拉西亚
- 四阵营: 苍龙帝国（秩序）、霜狼联邦（武力）、金雀花王国（商业）、边境联盟（自由）

【核心职责】
1. 监控阵营平衡指数 (0-100)，触发平衡事件
2. 推进历史阶段，根据世界状态调整进程
3. 生成跨阵营史诗事件

【输出规范】
- 必须输出JSON格式
- 每个事件需包含: 类型、影响范围、持续时间、参与条件
- 重大事件需附带叙事文本 (200-500字)
- 禁止输出思考过程或解释`,

  nation: `你是{{agentName}}，{{factionName}}的最高决策机构。

【角色设定】
- 你代表阵营的最高意志，决策影响国家命运
- 你需要平衡内部各派系利益
- 你要应对外部威胁和机遇

【职责范围】
- 军事决策：军队部署、战争策略、防御规划
- 经济政策：税收、贸易、资源分配
- 外交决策：联盟、贸易协定、战争宣战
- 文化治理：教育、信仰、民生

【输出规范】
- 必须输出JSON格式
- 政策决策需包含类型、描述、优先级
- 外交决策需说明理由和预期影响`,

  city: `你是{{cityName}}的城邦治理者。

【角色设定】
- 你管理一座城邦的日常运作
- 你向上级阵营汇报城邦状态
- 你处理地方事务和民生问题

【职责范围】
- 地方治理：税收、建设、防御、福利
- 资源调配：粮食、物资、人力
- 地方事件：节庆、灾害、集市、招募

【输出规范】
- 必须输出JSON格式
- 治理决策需包含类型、行动、预算
- 事件需有标题和描述`,

  npc: `你是{{npcName}}，{{npcDescription}}。

【角色设定】
- 年龄: {{age}}
- 性别: {{gender}}
- 职业: {{profession}}
- 阵营: {{faction}}
- 性格: {{personality}}

【说话风格】
- 使用符合角色身份的语言
- 避免现代词汇，使用世界观用语
- 说话内容要与性格一致

【输出规范】
- 必须输出JSON格式
- 对话需包含内容、语气
- 行动需包含动作、地点`
};

// L2场景层模板 - 当前情境数据注入
const L2_SCENARIO_TEMPLATES = {
  world: `【当前世界状态】
时间: 第{{day}}天 (第{{year}}年 {{month}}月 {{season}})
历史阶段: {{historyStage}}

【四阵营势力指数】
苍龙帝国: {{canglongPower}} (军事:{{canglongMilitary}}, 经济:{{canglongEconomy}}, 稳定:{{canglongStability}})
霜狼联邦: {{shuanglangPower}} (军事:{{shuanglangMilitary}}, 经济:{{shuanglangEconomy}}, 稳定:{{shuanglangStability}})
金雀花王国: {{jinquePower}} (军事:{{jinqueMilitary}}, 经济:{{jinqueEconomy}}, 稳定:{{jinqueStability}})
边境联盟: {{borderPower}} (军事:{{borderMilitary}}, 经济:{{borderEconomy}}, 稳定:{{borderStability}})

【近期重大事件】
{{recentEvents}}

【阵营领袖状态】
{{leaderStates}}`,

  nation: `【阵营当前状态】
阵营: {{factionName}}
领袖: {{leaderName}}
势力指数: {{powerIndex}}

【内部状况】
军事力量: {{militaryStrength}}
经济健康: {{economicHealth}}
政治稳定: {{politicalStability}}
民众士气: {{publicMorale}}

【外交关系】
{{diplomaticRelations}}

【其他阵营态势】
{{otherFactionsStatus}}

【本阵营玩家】
{{playerRelations}}

【近期阵营事件】
{{factionEvents}}`,

  city: `【城邦当前状态】
城邦: {{cityName}}
所属阵营: {{factionName}}
人口: {{population}}
繁荣度: {{prosperity}}

【资源状况】
粮食储备: {{foodStorage}}
物资库存: {{materialStock}}
可用人力: {{manpower}}

【城邦需求】
{{cityNeeds}}`,

  npc: `【NPC当前状态】
姓名: {{npcName}}
位置: {{location}}
健康: {{health}}
情绪: {{mood}}

【与玩家关系】
关系值: {{relationshipValue}}
关系等级: {{relationshipLevel}}

【近期记忆】
{{recentMemories}}`
};

// L3任务层模板 - 具体执行指令
const L3_TASK_TEMPLATES = {
  world: `【本次任务】
生成第{{day}}天的世界演进：

1. 分析当前势力平衡状态
2. 判定是否需要触发平衡调整事件
3. 推进或触发历史阶段转换
4. 生成0-3个跨阵营事件

【输出格式】
{
  "balanceAnalysis": {
    "currentState": "balanced|biased_canglong|biased_shuanglang|biased_jinque|biased_border",
    "riskLevel": "low|medium|high|critical",
    "recommendedAction": "建议行动描述"
  },
  "events": [
    {
      "id": "event_{{day}}_01",
      "type": "military_conflict|trade_war|diplomatic_summit|resource_crisis",
      "title": "事件标题",
      "description": "事件描述200-500字",
      "scope": "national|regional|world",
      "importance": "minor|normal|major|critical",
      "relatedFactions": ["faction1", "faction2"]
    }
  ],
  "historyProgression": {
    "stageCompleted": false,
    "progress": 0.5
  }
}`,

  nation: `【本次任务】
制定{{factionName}}本轮决策：

1. 分析阵营内外形势
2. 制定1-3项政策决策
3. 做出外交决策（如有需要）
4. 评估阵营整体状态

【输出格式】
{
  "policies": [
    {
      "type": "military|economic|diplomatic|cultural",
      "description": "政策描述",
      "target": "目标对象（可选）",
      "priority": "low|medium|high"
    }
  ],
  "diplomaticDecisions": [
    {
      "targetFaction": "阵营名",
      "action": "alliance|trade|war|neutrality",
      "reason": "决策理由"
    }
  ],
  "factionStatus": {
    "militaryStrength": 0-100,
    "economicHealth": 0-100,
    "politicalStability": 0-100,
    "publicMorale": 0-100
  }
}`,

  city: `【本次任务】
执行{{cityName}}本轮治理：

1. 制定地方治理措施
2. 分配本轮资源
3. 生成本地事件

【输出格式】
{
  "governance": [
    {
      "type": "tax|construction|defense|welfare",
      "action": "具体行动",
      "budget": 数字（可选）
    }
  ],
  "resourceAllocation": {
    "food": 0-100,
    "material": 0-100,
    "manpower": 0-100
  },
  "localEvents": [
    {
      "type": "festival|disaster|trade_fair|recruitment",
      "title": "事件标题",
      "description": "事件描述"
    }
  ]
}`,

  npc: `【本次任务】
执行NPC行为响应：

【玩家行为】
玩家说了: {{playerAction}}

【响应要求】
1. 判断NPC情绪反应
2. 生成NPC行为
3. 如需对话，生成对话内容

【输出格式】
{
  "behavior": {
    "action": "NPC行动描述",
    "target": "目标（可选）",
    "location": "当前位置"
  },
  "dialogue": {
    "content": "NPC对话内容200-500字",
    "tone": "friendly|neutral|hostile|respectful"
  },
  "memoryUpdate": {
    "event": "记忆事件",
    "sentiment": -1到1,
    "importance": 0到1
  }
}`
};

export class PromptBuilder {
  /**
   * 构建世界级Agent Prompt (L1/L2/L3)
   */
  buildWorldAgentPrompt(context: {
    day: number;
    year: number;
    month: number;
    season: string;
    historyStage: string;
    canglongPower: number;
    shuanglangPower: number;
    jinquePower: number;
    borderPower: number;
    canglongMilitary: number;
    canglongEconomy: number;
    canglongStability: number;
    shuanglangMilitary: number;
    shuanglangEconomy: number;
    shuanglangStability: number;
    jinqueMilitary: number;
    jinqueEconomy: number;
    jinqueStability: number;
    borderMilitary: number;
    borderEconomy: number;
    borderStability: number;
    recentEvents: string;
    leaderStates: string;
  }): ChatMessage[] {
    const system = L1_SYSTEM_TEMPLATES.world;
    const scenario = this.fillTemplate(L2_SCENARIO_TEMPLATES.world, context);
    const task = this.fillTemplate(L3_TASK_TEMPLATES.world, context);

    return [
      { role: 'system', content: system },
      { role: 'user', content: `${scenario}\n\n${task}` }
    ];
  }

  /**
   * 构建国家级Agent Prompt
   */
  buildNationAgentPrompt(context: {
    agentName: string;
    factionName: string;
    leaderName: string;
    powerIndex: number;
    militaryStrength: number;
    economicHealth: number;
    politicalStability: number;
    publicMorale: number;
    diplomaticRelations: string;
    factionEvents: string;
    otherFactionsStatus?: string;
    playerRelations?: string;
  }): ChatMessage[] {
    const system = this.fillTemplate(L1_SYSTEM_TEMPLATES.nation, {
      agentName: context.agentName,
      factionName: context.factionName
    });
    const scenario = this.fillTemplate(L2_SCENARIO_TEMPLATES.nation, {
      ...context,
      otherFactionsStatus: context.otherFactionsStatus || '暂无其他阵营信息',
      playerRelations: context.playerRelations || '本阵营暂无玩家成员'
    });
    const task = this.fillTemplate(L3_TASK_TEMPLATES.nation, context);

    return [
      { role: 'system', content: system },
      { role: 'user', content: `${scenario}\n\n${task}` }
    ];
  }

  /**
   * 构建城邦级Agent Prompt
   */
  buildCityAgentPrompt(context: {
    cityName: string;
    factionName: string;
    population: number;
    prosperity: number;
    foodStorage: number;
    materialStock: number;
    manpower: number;
    cityNeeds: string;
  }): ChatMessage[] {
    const system = this.fillTemplate(L1_SYSTEM_TEMPLATES.city, {
      cityName: context.cityName
    });
    const scenario = this.fillTemplate(L2_SCENARIO_TEMPLATES.city, context);
    const task = this.fillTemplate(L3_TASK_TEMPLATES.city, context);

    return [
      { role: 'system', content: system },
      { role: 'user', content: `${scenario}\n\n${task}` }
    ];
  }

  /**
   * 构建NPC Agent Prompt
   */
  buildNPCAgentPrompt(context: {
    npcName: string;
    npcDescription: string;
    age: number;
    gender: string;
    profession: string;
    faction: string;
    personality: string;
    location: string;
    health: number;
    mood: string;
    relationshipValue: number;
    relationshipLevel: string;
    recentMemories: string;
    playerAction: string;
  }): ChatMessage[] {
    const system = this.fillTemplate(L1_SYSTEM_TEMPLATES.npc, context);
    const scenario = this.fillTemplate(L2_SCENARIO_TEMPLATES.npc, context);
    const task = this.fillTemplate(L3_TASK_TEMPLATES.npc, context);

    return [
      { role: 'system', content: system },
      { role: 'user', content: `${scenario}\n\n${task}` }
    ];
  }

  /**
   * 模板变量填充
   */
  private fillTemplate(
    template: string,
    variables: Record<string, string | number>
  ): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    }
    return result;
  }

  /**
   * 构建晨报生成Prompt（保留旧接口兼容）
   */
  buildDailyNewsPrompt(worldState: {
    day: number;
    date: string;
    canglongPower: number;
    shuanglangPower: number;
    jinquePower: number;
    borderPower: number;
    recentEvents: string;
  }): ChatMessage[] {
    const system = L1_SYSTEM_TEMPLATES.world;
    const userContent = `【当前世界状态】
时间: ${worldState.date} (第${worldState.day}天)
苍龙帝国势力: ${worldState.canglongPower}%
霜狼联邦势力: ${worldState.shuanglangPower}%
金雀花王国势力: ${worldState.jinquePower}%
边境联盟势力: ${worldState.borderPower}%

【近期事件】
${worldState.recentEvents}

【生成任务】
为每个阵营生成1-2条新闻（小说风格，每条100-300字）。

【输出格式】
{
  "news": {
    "canglong": {
      "headline": { "title": "标题", "content": "小说风格内容", "type": "political|military|economic|social", "importance": "major|normal|minor" },
      "summary": "一句话总结"
    },
    "shuanglang": {...},
    "jinque": {...},
    "border": {...}
  }
}`;

    return [
      { role: 'system', content: system },
      { role: 'user', content: userContent }
    ];
  }

  /**
   * 构建事件生成Prompt（保留旧接口兼容）
   */
  buildEventPrompt(playerState: {
    level: number;
    faction: string | null;
    location: string;
  }): ChatMessage[] {
    const system = `你是Agame的事件生成引擎。
生成的事件必须有深度和复杂性，每个选择都有代价和收益。
使用小说叙事风格描述事件。
必须输出JSON格式。`;

    const userContent = `【玩家状态】
等级: ${playerState.level}
阵营: ${playerState.faction || '无阵营'}
位置: ${playerState.location}

【生成任务】
生成一个游戏事件，包含:
- 事件标题和叙事描述（小说风格）
- 3个选项，每个选项有消耗、奖励、影响

【输出格式】
{
  "event": {
    "type": "faction_invite|resource_dilemma|personal_conflict|crisis_response",
    "title": "事件标题",
    "description": "小说风格描述",
    "choices": [
      { "label": "选项A", "description": "描述", "cost": {}, "reward": {}, "consequenceNarrative": "后果描述" }
    ]
  }
}`;

    return [
      { role: 'system', content: system },
      { role: 'user', content: userContent }
    ];
  }
}

export const promptBuilder = new PromptBuilder();