/**
 * Chronos Agent - 世界级Agent
 * 负责每日世界事件生成和小说章节生成
 */

import { LLMClient, createLLMClient } from '../services/llm/LLMClient';
import { promptBuilder } from '../services/prompt/PromptBuilder';
import { outputValidator, ValidationResult } from '../utils/OutputValidator';
import { ModelTier } from '../services/llm/types';

// 世界状态接口（简化版）
interface WorldState {
  day: number;
  date: string;
  season: string;
  phase: string;
  era: string;
  factions: {
    canglong: FactionState;
    shuanglang: FactionState;
    jinque: FactionState;
    border: FactionState;
  };
  recentEvents: string[];
  activeConflicts: string[];
}

interface FactionState {
  power: number;
  military: number;
  economy: number;
  stability: number;
  leader: string;
}

// 晨报输出接口
interface DailyNewsOutput {
  day: number;
  date: string;
  news: Record<string, FactionNews>;
  worldHeadline: NewsItem | null;
  playerNews: NewsItem[];
  generatedAt: string;
}

interface FactionNews {
  headline: NewsItem;
  items: NewsItem[];
  summary: string;
}

interface NewsItem {
  id: string;
  title: string;
  content: string;
  type: string;
  importance: string;
  relatedEntities: string[];
  playerRelevance: boolean;
}

// 降级模板（LLM失败时使用）
const FALLBACK_DAILY_NEWS: DailyNewsOutput = {
  day: 1,
  date: '第一年 春季 早晨',
  news: {
    canglong: {
      headline: {
        id: 'news_cl_1_01',
        title: '苍龙帝国日常',
        content: '帝都今日平静，各衙门照常运转。御林军在城门外例行巡检，商旅有序进出。',
        type: 'social',
        importance: 'minor',
        relatedEntities: [],
        playerRelevance: false
      },
      items: [],
      summary: '今日平稳，无明显动向。'
    },
    shuanglang: {
      headline: {
        id: 'news_sl_1_01',
        title: '霜狼联邦日常',
        content: '部落长老在议事厅讨论今冬猎场分配。年轻战士在冰原上练习骑射。',
        type: 'social',
        importance: 'minor',
        relatedEntities: [],
        playerRelevance: false
      },
      items: [],
      summary: '今日平稳，无明显动向。'
    },
    jinque: {
      headline: {
        id: 'news_jq_1_01',
        title: '金雀花王国日常',
        content: '议会今日休会，商人们在港口区讨论新一季的货运计划。',
        type: 'economic',
        importance: 'minor',
        relatedEntities: [],
        playerRelevance: false
      },
      items: [],
      summary: '今日平稳，无明显动向。'
    },
    border: {
      headline: {
        id: 'news_bd_1_01',
        title: '边境联盟日常',
        content: '边境小镇传来几声牧歌，村民们忙着修缮围栏，准备应对可能的暴雨。',
        type: 'social',
        importance: 'minor',
        relatedEntities: [],
        playerRelevance: false
      },
      items: [],
      summary: '今日平稳，无明显动向。'
    }
  },
  worldHeadline: null,
  playerNews: [],
  generatedAt: new Date().toISOString()
};

export class ChronosAgent {
  private llmClient: LLMClient;
  private agentId: string;
  private status: 'idle' | 'running' | 'error';
  private lastRunTime: Date | null;
  private lastRunResult: DailyNewsOutput | null;
  private errorCount: number;

  constructor(llmClient?: LLMClient) {
    this.llmClient = llmClient || createLLMClient();
    this.agentId = 'chronos';
    this.status = 'idle';
    this.lastRunTime = null;
    this.lastRunResult = null;
    this.errorCount = 0;
  }

  /**
   * 执行每日世界生成
   * 核心任务：生成晨报和小说章节
   */
  async executeDailyGeneration(worldState: WorldState): Promise<DailyNewsOutput> {
    this.status = 'running';
    console.log(`[Chronos] 开始第${worldState.day}天世界生成...`);

    try {
      // 1. 准备变量数据
      const variables = this.prepareVariables(worldState);

      // 2. 构建Prompt
      const messages = promptBuilder.buildMessages('world:daily_news', variables);

      // 3. 调用LLM（使用tier1模型）
      const response = await this.llmClient.chatWithRetry(
        { model: 'glm-4', messages },
        'tier1' as ModelTier,
        3 // 最大重试次数
      );

      // 4. 验证输出
      const validationResult = outputValidator.validateDailyNews(response.content);

      if (!validationResult.valid) {
        console.warn('[Chronos] 输出验证失败:', validationResult.errors);
        // 尝试自动修正
        const correctedOutput = this.tryCorrectOutput(response.content, validationResult);
        if (correctedOutput) {
          this.lastRunResult = correctedOutput;
        } else {
          // 使用降级模板
          console.warn('[Chronos] 使用降级模板');
          this.lastRunResult = this.applyFallback(worldState);
        }
      } else {
        // 解析成功输出
        this.lastRunResult = JSON.parse(response.content) as DailyNewsOutput;
      }

      // 5. 记录成功
      this.lastRunTime = new Date();
      this.errorCount = 0;
      this.status = 'idle';

      console.log(`[Chronos] 第${worldState.day}天世界生成完成`);

      return this.lastRunResult;
    } catch (error) {
      // 6. 错误处理
      this.errorCount++;
      this.status = 'error';
      console.error('[Chronos] 生成失败:', error);

      // 使用降级模板
      this.lastRunResult = this.applyFallback(worldState);
      this.lastRunTime = new Date();

      return this.lastRunResult;
    }
  }

  /**
   * 生成特定阵营的详细事件
   */
  async generateFactionEvents(
    worldState: WorldState,
    faction: string
  ): Promise<NewsItem[]> {
    const variables = {
      ...this.prepareVariables(worldState),
      targetFaction: faction
    };

    const messages = promptBuilder.buildMessages('world:daily_news', variables);

    try {
      const response = await this.llmClient.chatWithRetry(
        { model: 'glm-4', messages },
        'tier1' as ModelTier
      );

      const output = JSON.parse(response.content);
      return output.news[faction]?.items || [];
    } catch (error) {
      console.error(`[Chronos] 阵营${faction}事件生成失败:`, error);
      return [];
    }
  }

  /**
   * 增量生成（仅生成变化部分）
   * 减少Token消耗
   */
  async executeIncrementalGeneration(
    worldState: WorldState,
    deltaChanges: Record<string, unknown>
  ): Promise<Partial<DailyNewsOutput>> {
    const baseVariables = this.prepareVariables(worldState);

    const messages = promptBuilder.buildIncrementalMessages(
      'world:daily_news',
      baseVariables,
      deltaChanges
    );

    try {
      const response = await this.llmClient.chatWithRetry(
        { model: 'glm-4', messages },
        'tier1' as ModelTier
      );

      return JSON.parse(response.content) as Partial<DailyNewsOutput>;
    } catch (error) {
      console.error('[Chronos] 增量生成失败:', error);
      return {};
    }
  }

  /**
   * 获取Agent状态
   */
  getStatus(): {
    agentId: string;
    status: 'idle' | 'running' | 'error';
    lastRunTime: Date | null;
    errorCount: number;
  } {
    return {
      agentId: this.agentId,
      status: this.status,
      lastRunTime: this.lastRunTime,
      errorCount: this.errorCount
    };
  }

  /**
   * 获取上次运行结果
   */
  getLastResult(): DailyNewsOutput | null {
    return this.lastRunResult;
  }

  /**
   * 准备Prompt变量
   */
  private prepareVariables(worldState: WorldState): Record<string, string | number | object> {
    return {
      gameDay: worldState.day,
      gameDate: worldState.date,
      season: worldState.season,
      phase: worldState.phase,
      currentEra: worldState.era,

      // 阵营势力数据
      canglongPower: worldState.factions.canglong.power,
      canglongMilitary: worldState.factions.canglong.military,
      canglongEconomy: worldState.factions.canglong.economy,
      canglongStability: worldState.factions.canglong.stability,

      shuanglangPower: worldState.factions.shuanglang.power,
      shuanglangMilitary: worldState.factions.shuanglang.military,
      shuanglangEconomy: worldState.factions.shuanglang.economy,
      shuanglangStability: worldState.factions.shuanglang.stability,

      jinquePower: worldState.factions.jinque.power,
      jinqueMilitary: worldState.factions.jinque.military,
      jinqueEconomy: worldState.factions.jinque.economy,
      jinqueStability: worldState.factions.jinque.stability,

      borderPower: worldState.factions.border.power,
      borderMilitary: worldState.factions.border.military,
      borderEconomy: worldState.factions.border.economy,
      borderStability: worldState.factions.border.stability,

      // 其他状态
      recentEvents: worldState.recentEvents.join('\n'),
      activeConflicts: worldState.activeConflicts.join('\n'),
      leaderStates: '各阵营领袖状态正常',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 尝试自动修正输出
   */
  private tryCorrectOutput(
    rawOutput: string,
    validationResult: ValidationResult
  ): DailyNewsOutput | null {
    try {
      // 提取JSON
      const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      let output = JSON.parse(jsonMatch[0]);

      // 自动修正数值范围
      const ranges: Record<string, { min: number; max: number }> = {
        'day': { min: 1, max: 1000 }
      };

      output = outputValidator.autoCorrectRanges(output, ranges);

      return output as DailyNewsOutput;
    } catch {
      return null;
    }
  }

  /**
   * 应用降级模板
   */
  private applyFallback(worldState: WorldState): DailyNewsOutput {
    // 复制降级模板并更新日期
    const fallback = JSON.parse(JSON.stringify(FALLBACK_DAILY_NEWS));
    fallback.day = worldState.day;
    fallback.date = worldState.date;
    fallback.generatedAt = new Date().toISOString();

    return fallback;
  }
}

// 创建默认实例
export const chronosAgent = new ChronosAgent();