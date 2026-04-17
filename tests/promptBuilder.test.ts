/**
 * PromptBuilder 测试
 */

import { promptBuilder, PROMPT_TEMPLATES } from '../src/services/prompt/PromptBuilder';

describe('PromptBuilder', () => {
  test('应该能获取正确的模板层级', () => {
    expect(promptBuilder.getTemplateTier('world:daily_news')).toBe('tier1');
    expect(promptBuilder.getTemplateTier('npc:dialogue_response')).toBe('tier2');
  });

  test('应该能正确构建晨报Prompt', () => {
    const variables = {
      gameDay: 1,
      gameDate: '第一年 春季 早晨',
      season: 'spring',
      phase: 'morning',
      canglongPower: 50,
      canglongMilitary: 60,
      canglongEconomy: 45,
      canglongStability: 55,
      shuanglangPower: 50,
      shuanglangMilitary: 55,
      shuanglangEconomy: 40,
      shuanglangStability: 60,
      jinquePower: 50,
      jinqueMilitary: 35,
      jinqueEconomy: 70,
      jinqueStability: 50,
      borderPower: 50,
      borderMilitary: 30,
      borderEconomy: 35,
      borderStability: 70,
      recentEvents: '游戏开始',
      activeConflicts: '',
      leaderStates: '各阵营领袖状态正常',
      timestamp: new Date().toISOString()
    };

    const messages = promptBuilder.buildMessages('world:daily_news', variables);

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
    expect(messages[0].content).toContain('克洛诺斯');
    expect(messages[1].content).toContain('第一年 春季 早晨');
  });

  test('应该能正确处理缺失模板', () => {
    expect(() => {
      promptBuilder.buildMessages('nonexistent:template', {});
    }).toThrow('模板不存在');
  });

  test('应该能正确构建增量Prompt', () => {
    const baseVariables = {
      gameDay: 5,
      gameDate: '第五天',
      canglongPower: 50
    };

    const deltaVariables = {
      canglongPower: 55,
      canglongMilitary: 65
    };

    const messages = promptBuilder.buildIncrementalMessages(
      'world:daily_news',
      baseVariables,
      deltaVariables
    );

    expect(messages).toHaveLength(2);
    expect(messages[1].content).toContain('变化状态');
    expect(messages[1].content).toContain('canglongPower: 55');
  });
});

describe('PROMPT_TEMPLATES', () => {
  test('应该包含所有必需模板', () => {
    expect(PROMPT_TEMPLATES['world:daily_news']).toBeDefined();
    expect(PROMPT_TEMPLATES['event:faction_invite']).toBeDefined();
    expect(PROMPT_TEMPLATES['npc:dialogue_response']).toBeDefined();
  });

  test('模板应该有完整的结构', () => {
    const template = PROMPT_TEMPLATES['world:daily_news'];
    expect(template.system).toBeDefined();
    expect(template.scenarioTemplate).toBeDefined();
    expect(template.taskTemplate).toBeDefined();
    expect(template.outputFormat).toBeDefined();
  });
});