/**
 * Prompt构建器
 * 支持L1/L2/L3三层Prompt设计和增量数据组装
 */

import { ChatMessage } from '../llm/types';

// Prompt模板定义
interface PromptTemplate {
  id: string;
  name: string;
  tier: 'tier1' | 'tier2' | 'tier3';
  system: string; // L1系统层
  scenarioTemplate: string; // L2场景层模板
  taskTemplate: string; // L3任务层模板
  outputFormat: string; // 输出格式说明
}

// 预定义模板
export const PROMPT_TEMPLATES: Record<string, PromptTemplate> = {
  // 世界级：晨报生成
  'world:daily_news': {
    id: 'world:daily_news',
    name: 'Chronos晨报生成',
    tier: 'tier1',
    system: `你是克洛诺斯，Agame世界的时光守护者。

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
- 严格按照指定的JSON结构输出`,

    scenarioTemplate: `【当前世界状态】
时间: {{gameDate}} (第{{gameDay}}天，{{season}}，{{phase}})

【四阵营势力指数】
苍龙帝国: {{canglongPower}} (军事:{{canglongMilitary}}, 经济:{{canglongEconomy}}, 稳定:{{canglongStability}})
霜狼联邦: {{shuanglangPower}} (军事:{{shuanglangMilitary}}, 经济:{{shuanglangEconomy}}, 稳定:{{shuanglangStability}})
金雀花王国: {{jinquePower}} (军事:{{jinqueMilitary}}, 经济:{{jinqueEconomy}}, 稳定:{{jinqueStability}})
边境联盟: {{borderPower}} (军事:{{borderMilitary}}, 经济:{{borderEconomy}}, 稳定:{{borderStability}})

【近期重大事件】
{{recentEvents}}

【阵营领袖状态】
{{leaderStates}}

【当前活跃冲突】
{{activeConflicts}}`,

    taskTemplate: `【本次任务】
生成第{{gameDay}}天的世界晨报，包含:

1. 为每个阵营生成1-3条新闻（共6-12条）
   - 新闻类型：军事/政治/经济/社会/外交
   - 重要度：minor/normal/major/critical
   - 每条新闻200-400字，小说叙事风格

2. 每个阵营生成一句话总结
   - 20-50字，概括当日最重要动向

【新闻内容要求】
- 必须与当前世界状态一致
- 新闻要有因果：为什么发生、谁参与、结果如何
- 人物要有性格：说话方式、决策风格符合设定
- 事件要有画面：场景描写、对话、氛围
- 避免重复历史：不要复制之前的新闻内容`,

    outputFormat: `{
  "day": {{gameDay}},
  "date": "{{gameDate}}",
  "news": {
    "canglong": {
      "headline": {"id": "news_cl_{{day}}_01", "title": "标题", "content": "小说风格内容200-400字", "type": "military|political|economic|social|diplomatic", "importance": "major", "relatedEntities": [], "playerRelevance": false},
      "items": [],
      "summary": "一句话总结"
    },
    "shuanglang": {...},
    "jinque": {...},
    "border": {...}
  },
  "worldHeadline": null,
  "playerNews": [],
  "generatedAt": "{{timestamp}}"
}`
  },

  // 事件生成
  'event:faction_invite': {
    id: 'event:faction_invite',
    name: '阵营邀请事件生成',
    tier: 'tier1',
    system: `你是Agame的事件生成引擎，负责生成玩家面临的效忠选择事件。

【角色设定】
- 你生成的事件必须有深度和复杂性
- 每个选择都有代价和收益
- 事件要与世界观和当前状态一致
- 使用小说叙事风格描述事件

【输出规范】
- 必须输出JSON格式
- 严格按照事件数据结构输出
- 后果描述要具体而非笼统`,

    scenarioTemplate: `【玩家当前状态】
等级: {{playerLevel}}
阵营: {{playerFaction}}
声望: {{playerReputation}}
位置: {{playerLocation}}

【邀请方阵营】
阵营: {{invitingFaction}}
声望要求: {{reputationRequirement}}
邀请使者: {{envoyNPC}}

【世界当前阶段】
{{worldStage}}`,

    taskTemplate: `【本次任务】
生成一个阵营邀请事件:

1. 生成事件叙事
   - 事件标题：阵营名称+邀请方式
   - 事件描述：使者到来、邀请内容、奖励承诺
   - 小说风格，200-300字

2. 设计选项（3个）
   - 选项A：接受邀请，效忠阵营
   - 选项B：婉言谢绝，保持中立
   - 选项C：拖延/谈判/特殊选项

3. 设计后果
   - 每个选项的消耗、获得、影响
   - 后果要具体、合理`,

    outputFormat: `{
  "event": {
    "id": "event_faction_invite_{{faction}}_{{day}}",
    "type": "faction_invite",
    "category": "faction_invite",
    "title": "事件标题",
    "description": "事件描述",
    "narrativeText": "完整叙事文本200-300字",
    "scope": "personal",
    "importance": "major",
    "choices": [
      {"index": 0, "label": "选项", "description": "描述", "cost": {}, "reward": {}, "impact": {}, "consequenceNarrative": "后果叙事"}
    ],
    "createdAt": "{{timestamp}}",
    "relatedNPCs": [],
    "relatedFactions": ["faction"]
  }
}`
  },

  // NPC对话响应
  'npc:dialogue_response': {
    id: 'npc:dialogue_response',
    name: 'NPC对话响应',
    tier: 'tier2',
    system: `你是{{npcName}}，{{npcDescription}}。

【角色设定】
- 年龄: {{age}}
- 性别: {{gender}}
- 职业: {{profession}}
- 阵营: {{faction}}
- 性格: {{personality}}

【说话风格】
- 使用符合角色身份的语言
- {{speechStyle}}
- 避免现代词汇，使用世界观用语
- 说话内容要与性格一致

【与玩家关系】
- 当前关系值: {{relationshipValue}}
- 关系等级: {{relationshipLevel}}

【输出规范】
- 输出对话内容，200-500字
- 使用小说对话风格
- 包含对话、动作描写、表情描写`,

    scenarioTemplate: `【对话场景】
时间: {{time}}
地点: {{location}}
场合: {{context}}

【玩家行为】
玩家说了: {{playerMessage}}
玩家状态: {{playerStatus}}`,

    taskTemplate: `【本次任务】
响应玩家的对话/行动:

1. 判断NPC情绪反应
   - 基于性格、关系、玩家行为
   - 选择：高兴/生气/冷漠/惊讶/恐惧

2. 生成对话内容
   - NPC说的话
   - NPC的动作和表情
   - 符合角色风格`,

    outputFormat: `纯文本，小说对话风格，200-500字。`
  }
};

// 变量数据源类型
type DataSource = 'static' | 'database' | 'cache' | 'computed';

interface VariableConfig {
  name: string;
  source: DataSource;
  defaultValue?: string | number | object;
}

export class PromptBuilder {
  /**
   * 构建完整Prompt
   * 组合L1/L2/L3三层
   */
  buildMessages(
    templateId: string,
    variables: Record<string, string | number | object>
  ): ChatMessage[] {
    const template = PROMPT_TEMPLATES[templateId];
    if (!template) {
      throw new Error(`模板不存在: ${templateId}`);
    }

    // L1: 系统层（固定）
    const systemPrompt = template.system;

    // L2: 场景层（变量注入）
    const scenarioPrompt = this.fillTemplate(template.scenarioTemplate, variables);

    // L3: 任务层（变量注入）
    const taskPrompt = this.fillTemplate(template.taskTemplate, variables);

    // 组合完整Prompt
    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${scenarioPrompt}\n\n${taskPrompt}\n\n【输出格式】\n${template.outputFormat}` }
    ];
  }

  /**
   * 构建增量Prompt
   * 仅传入变化的数据，减少Token消耗
   */
  buildIncrementalMessages(
    templateId: string,
    baseVariables: Record<string, string | number | object>,
    deltaVariables: Record<string, string | number | object>
  ): ChatMessage[] {
    // 合并基础变量和增量变量
    const mergedVariables = { ...baseVariables, ...deltaVariables };

    // 对于增量生成，L2场景层仅传入变化的字段
    const template = PROMPT_TEMPLATES[templateId];
    if (!template) {
      throw new Error(`模板不存在: ${templateId}`);
    }

    const systemPrompt = template.system;

    // 构建增量场景层
    let scenarioPrompt = '【变化状态】\n';
    for (const [key, value] of Object.entries(deltaVariables)) {
      scenarioPrompt += `${key}: ${this.formatValue(value)}\n`;
    }

    const taskPrompt = this.fillTemplate(template.taskTemplate, mergedVariables);

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${scenarioPrompt}\n\n${taskPrompt}\n\n【输出格式】\n${template.outputFormat}` }
    ];
  }

  /**
   * 批量构建Prompt
   * 用于批量NPC决策等场景
   */
  buildBatchMessages(
    templateId: string,
    variablesList: Record<string, string | number | object>[]
  ): ChatMessage[][] {
    return variablesList.map(vars => this.buildMessages(templateId, vars));
  }

  /**
   * 获取模板层级
   */
  getTemplateTier(templateId: string): 'tier1' | 'tier2' | 'tier3' {
    const template = PROMPT_TEMPLATES[templateId];
    return template?.tier || 'tier2';
  }

  /**
   * 模板变量填充
   */
  private fillTemplate(
    template: string,
    variables: Record<string, string | number | object>
  ): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(placeholder, this.formatValue(value));
    }

    return result;
  }

  /**
   * 格式化变量值
   */
  private formatValue(value: string | number | object): string {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number') {
      return String(value);
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  }
}

// 创建默认实例
export const promptBuilder = new PromptBuilder();