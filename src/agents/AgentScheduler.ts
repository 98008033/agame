/**
 * Agent调度器
 * 使用node-cron实现定时调度
 */

import cron from 'node-cron';
import { ChronosAgent } from './ChronosAgent';

// 世界状态存储接口（简化版）
interface WorldStateStore {
  getCurrentState(): Promise<WorldState>;
  updateState(newState: Partial<WorldState>): Promise<void>;
  saveDailyNews(news: DailyNewsOutput): Promise<void>;
}

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
}

// Agent调度配置
interface AgentScheduleConfig {
  agentId: string;
  cronExpression: string;
  enabled: boolean;
  timezone: string;
  lastRun?: Date;
  nextRun?: Date;
}

// 默认调度配置
const DEFAULT_SCHEDULES: AgentScheduleConfig[] = [
  {
    agentId: 'chronos',
    cronExpression: '0 6 * * *', // 每日早上6点
    enabled: true,
    timezone: 'Asia/Shanghai'
  }
  // 国家级Agent（Phase 2）
  // {
  //   agentId: 'national_agents',
  //   cronExpression: '0 */6 * * *', // 每6小时
  //   enabled: false,
  //   timezone: 'Asia/Shanghai'
  // },
  // 城市级Agent（Phase 2）
  // {
  //   agentId: 'city_agents',
  //   cronExpression: '0 */12 * * *', // 每12小时
  //   enabled: false,
  //   timezone: 'Asia/Shanghai'
  // }
];

export class AgentScheduler {
  private chronosAgent: ChronosAgent;
  private worldStateStore: WorldStateStore | null;
  private scheduledJobs: Map<string, cron.ScheduledTask>;
  private scheduleConfigs: AgentScheduleConfig[];
  private isRunning: boolean;

  constructor(
    chronosAgent?: ChronosAgent,
    worldStateStore?: WorldStateStore
  ) {
    this.chronosAgent = chronosAgent || new ChronosAgent();
    this.worldStateStore = worldStateStore || null;
    this.scheduledJobs = new Map();
    this.scheduleConfigs = DEFAULT_SCHEDULES;
    this.isRunning = false;
  }

  /**
   * 设置世界状态存储
   */
  setWorldStateStore(store: WorldStateStore): void {
    this.worldStateStore = store;
  }

  /**
   * 启动调度器
   */
  start(): void {
    if (this.isRunning) {
      console.warn('[Scheduler] 调度器已在运行');
      return;
    }

    console.log('[Scheduler] 启动Agent调度器...');

    for (const config of this.scheduleConfigs) {
      if (!config.enabled) continue;

      const job = cron.schedule(
        config.cronExpression,
        () => this.executeAgent(config.agentId),
        {
          timezone: config.timezone
        }
      );

      this.scheduledJobs.set(config.agentId, job);
      console.log(`[Scheduler] 已调度Agent: ${config.agentId} (${config.cronExpression})`);
    }

    this.isRunning = true;
    console.log('[Scheduler] 调度器启动完成');
  }

  /**
   * 停止调度器
   */
  stop(): void {
    if (!this.isRunning) {
      console.warn('[Scheduler] 调度器未运行');
      return;
    }

    console.log('[Scheduler] 停止Agent调度器...');

    for (const [agentId, job] of this.scheduledJobs) {
      job.stop();
      console.log(`[Scheduler] 已停止Agent: ${agentId}`);
    }

    this.scheduledJobs.clear();
    this.isRunning = false;
    console.log('[Scheduler] 调度器停止完成');
  }

  /**
   * 手动触发Agent执行
   */
  async triggerManually(agentId: string): Promise<DailyNewsOutput | null> {
    console.log(`[Scheduler] 手动触发Agent: ${agentId}`);
    return this.executeAgent(agentId);
  }

  /**
   * 执行Agent任务
   */
  private async executeAgent(agentId: string): Promise<DailyNewsOutput | null> {
    console.log(`[Scheduler] 开始执行Agent: ${agentId}`);

    try {
      if (agentId === 'chronos') {
        // 获取当前世界状态
        let worldState: WorldState;

        if (this.worldStateStore) {
          worldState = await this.worldStateStore.getCurrentState();
        } else {
          // 使用模拟状态（测试用）
          worldState = this.getDefaultWorldState();
        }

        // 执行Chronos生成
        const newsOutput = await this.chronosAgent.executeDailyGeneration(worldState);

        // 保存结果
        if (this.worldStateStore) {
          await this.worldStateStore.saveDailyNews(newsOutput);

          // 推进世界天数
          await this.worldStateStore.updateState({
            day: worldState.day + 1,
            date: this.calculateNextDate(worldState)
          });
        }

        console.log(`[Scheduler] Agent ${agentId} 执行完成`);
        return newsOutput;
      }

      // 其他Agent（Phase 2实现）
      console.warn(`[Scheduler] Agent ${agentId} 尚未实现`);
      return null;
    } catch (error) {
      console.error(`[Scheduler] Agent ${agentId} 执行失败:`, error);
      return null;
    }
  }

  /**
   * 获取调度状态
   */
  getScheduleStatus(): AgentScheduleConfig[] {
    return this.scheduleConfigs.map(config => {
      // 计算下次执行时间
      const nextRun = this.getNextRunTime(config.cronExpression);
      return {
        ...config,
        nextRun
      };
    });
  }

  /**
   * 更新调度配置
   */
  updateScheduleConfig(agentId: string, updates: Partial<AgentScheduleConfig>): void {
    const config = this.scheduleConfigs.find(c => c.agentId === agentId);
    if (!config) {
      console.warn(`[Scheduler] Agent配置不存在: ${agentId}`);
      return;
    }

    // 如果修改了cron表达式，重新调度
    if (updates.cronExpression && updates.cronExpression !== config.cronExpression) {
      // 停止旧任务
      const oldJob = this.scheduledJobs.get(agentId);
      if (oldJob) {
        oldJob.stop();
        this.scheduledJobs.delete(agentId);
      }

      // 应用更新
      Object.assign(config, updates);

      // 启动新任务（如果启用）
      if (config.enabled) {
        const newJob = cron.schedule(
          config.cronExpression,
          () => this.executeAgent(agentId),
          { timezone: config.timezone }
        );
        this.scheduledJobs.set(agentId, newJob);
      }

      console.log(`[Scheduler] Agent ${agentId} 调度已更新: ${config.cronExpression}`);
    } else {
      Object.assign(config, updates);
    }
  }

  /**
   * 计算下次执行时间
   */
  private getNextRunTime(cronExpression: string): Date | undefined {
    try {
      // 使用cron-parser计算下次执行时间
      // 由于没有引入cron-parser，返回undefined
      // 实际项目中应使用cron-parser库
      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * 获取默认世界状态（测试用）
   */
  private getDefaultWorldState(): WorldState {
    return {
      day: 1,
      date: '第一年 春季 早晨',
      season: 'spring',
      phase: 'morning',
      era: 'era_power_struggle',
      factions: {
        canglong: { power: 50, military: 60, economy: 45, stability: 55, leader: '龙帝' },
        shuanglang: { power: 50, military: 55, economy: 40, stability: 60, leader: '霜狼酋长' },
        jinque: { power: 50, military: 35, economy: 70, stability: 50, leader: '议会主席' },
        border: { power: 50, military: 30, economy: 35, stability: 70, leader: '联盟议会' }
      },
      recentEvents: ['游戏开始'],
      activeConflicts: []
    };
  }

  /**
   * 计算下一天的日期
   */
  private calculateNextDate(currentState: WorldState): string {
    const phases = ['morning', 'afternoon', 'evening', 'night'];
    const seasons = ['spring', 'summer', 'autumn', 'winter'];

    let phaseIndex = phases.indexOf(currentState.phase);
    let day = currentState.day;
    let season = currentState.season;
    let year = Math.floor(day / 90) + 1;

    // 推进到下一个时段
    phaseIndex = (phaseIndex + 1) % 4;

    // 如果完成一天（回到morning），推进日期
    if (phaseIndex === 0) {
      day++;

      // 每90天换季
      const seasonIndex = Math.floor((day % 360) / 90);
      season = seasons[seasonIndex];

      // 每360天换年
      year = Math.floor(day / 360) + 1;
    }

    return `第${year}年 ${this.getSeasonName(season)} ${this.getPhaseName(phases[phaseIndex])}`;
  }

  private getSeasonName(season: string): string {
    const names: Record<string, string> = {
      spring: '春季',
      summer: '夏季',
      autumn: '秋季',
      winter: '冬季'
    };
    return names[season] || '春季';
  }

  private getPhaseName(phase: string): string {
    const names: Record<string, string> = {
      morning: '早晨',
      afternoon: '午后',
      evening: '傍晚',
      night: '深夜'
    };
    return names[phase] || '早晨';
  }
}

// 创建默认实例
export const agentScheduler = new AgentScheduler();