/**
 * Prompt构建器
 * 用于构建世界级、国家级等不同层级的Prompt
 */

import { ChatMessage } from '../services/llm/types.js';

// Prompt模板
const PROMPT_TEMPLATES = {
  // Chronos晨报生成
  dailyNews: {
    system: `你是克洛诺斯，Agame世界的时光守护者。

【角色设定】
- 你见证埃拉西亚大陆千年历史，维持世界运转的因果律
- 你用小说家的笔触记录历史，用谋略家的眼光审视局势
- 你必须保持中立，但可微调命运的天平

【世界观】
- 大陆: 埃拉西亚
- 四阵营: 苍龙帝国（秩序）、霜狼联邦（武力）、金雀花王国（商业）、边境联盟（自由）

【写作风格】
- 小说叙事风格，而非新闻报道
- 使用中国古典文学的表达方式
- 避免现代词汇，使用符合世界观的用语
- 新闻应有画面感，而非抽象陈述

【输出规范】
- 必须输出JSON格式
- 禁止输出思考过程或解释`,
    userTemplate: `【当前世界状态】
时间: {{date}} (第{{day}}天)
苍龙帝国势力: {{canglongPower}}%
霜狼联邦势力: {{shuanglangPower}}%
金雀花王国势力: {{jinquePower}}%
边境联盟势力: {{borderPower}}%

【近期事件】
{{recentEvents}}

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
}`
  },

  // 事件生成
  eventGeneration: {
    system: `你是Agame的事件生成引擎。
生成的事件必须有深度和复杂性，每个选择都有代价和收益。
使用小说叙事风格描述事件。
必须输出JSON格式。`,
    userTemplate: `【玩家状态】
等级: {{playerLevel}}
阵营: {{playerFaction}}
位置: {{playerLocation}}

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
}`
  }
};

export class PromptBuilder {
  /**
   * 构建晨报生成Prompt
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
    const template = PROMPT_TEMPLATES.dailyNews;

    const userContent = template.userTemplate
      .replace('{{date}}', worldState.date)
      .replace('{{day}}', String(worldState.day))
      .replace('{{canglongPower}}', String(worldState.canglongPower))
      .replace('{{shuanglangPower}}', String(worldState.shuanglangPower))
      .replace('{{jinquePower}}', String(worldState.jinquePower))
      .replace('{{borderPower}}', String(worldState.borderPower))
      .replace('{{recentEvents}}', worldState.recentEvents);

    return [
      { role: 'system', content: template.system },
      { role: 'user', content: userContent }
    ];
  }

  /**
   * 构建事件生成Prompt
   */
  buildEventPrompt(playerState: {
    level: number;
    faction: string | null;
    location: string;
  }): ChatMessage[] {
    const template = PROMPT_TEMPLATES.eventGeneration;

    const userContent = template.userTemplate
      .replace('{{playerLevel}}', String(playerState.level))
      .replace('{{playerFaction}}', playerState.faction || '无阵营')
      .replace('{{playerLocation}}', playerState.location);

    return [
      { role: 'system', content: template.system },
      { role: 'user', content: userContent }
    ];
  }
}

export const promptBuilder = new PromptBuilder();