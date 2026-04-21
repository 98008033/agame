/**
 * Agent调度器
 * 统一管理所有Agent的定时调度
 */

import * as cron from 'node-cron';
import prisma from '../models/prisma.js';
import { wsNotificationService } from '../services/websocket.js';
import { chronosAgent } from './ChronosAgent.js';
import {
  tianmingSiAgent,
  xianzuYihuiAgent,
  huangjinYihuiAgent
} from './NationAgent.js';
import {
  tianduAgent,
  frostCityAgent,
  flowerCityAgent,
  twilightVillageAgent
} from './CityAgent.js';

export interface SchedulerStatus {
  running: boolean;
  agents: Record<string, {
    status: string;
    lastRun: Date | null;
    nextRun: Date | null;
    successCount: number;
    errorCount: number;
  }>;
}

interface AgentRunState {
  lastRun: Date | null;
  successCount: number;
  errorCount: number;
}

export class AgentScheduler {
  private running: boolean = false;
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private agents: Map<string, { trigger: () => Promise<unknown> }> = new Map();
  private runStates: Map<string, AgentRunState> = new Map();

  constructor() {
    // 注册所有Agent
    this.registerAgent('chronos', () => chronosAgent.generateDailyNews());
    this.registerAgent('tianming_si', () => tianmingSiAgent.trigger());
    this.registerAgent('xianzu_yihui', () => xianzuYihuiAgent.trigger());
    this.registerAgent('huangjin_yihui', () => huangjinYihuiAgent.trigger());
    this.registerAgent('tiandu', () => tianduAgent.trigger());
    this.registerAgent('frost_city', () => frostCityAgent.trigger());
    this.registerAgent('flower_city', () => flowerCityAgent.trigger());
    this.registerAgent('twilight_village', () => twilightVillageAgent.trigger());
  }

  /**
   * 注册Agent
   */
  private registerAgent(id: string, triggerFn: () => Promise<unknown>): void {
    this.agents.set(id, { trigger: triggerFn });
    this.runStates.set(id, { lastRun: null, successCount: 0, errorCount: 0 });
  }

  /**
   * 启动所有调度
   */
  start(): void {
    if (this.running) {
      console.log('[Scheduler] 已在运行中');
      return;
    }

    console.log('[Scheduler] 启动所有Agent调度...');
    this.running = true;

    // 世界级Agent - 每日6:00
    this.startAgentSchedule('chronos', '0 6 * * *');

    // 国家级Agent - 每6小时，错峰执行
    this.startAgentSchedule('tianming_si', '0 0,6,12,18 * * *');
    this.startAgentSchedule('xianzu_yihui', '0 2,8,14,20 * * *');
    this.startAgentSchedule('huangjin_yihui', '0 4,10,16,22 * * *');

    // 城邦级Agent - 每12小时
    this.startAgentSchedule('tiandu', '0 0,12 * * *');
    this.startAgentSchedule('frost_city', '0 1,13 * * *');
    this.startAgentSchedule('flower_city', '0 2,14 * * *');
    this.startAgentSchedule('twilight_village', '0 3,15 * * *');

    console.log('[Scheduler] 所有Agent调度已启动');
  }

  /**
   * 启动单个Agent调度
   */
  private startAgentSchedule(id: string, cronExpression: string): void {
    const agent = this.agents.get(id);
    if (!agent) {
      console.error(`[Scheduler] Agent ${id} 未注册`);
      return;
    }

    const job = cron.schedule(cronExpression, async () => {
      console.log(`[Scheduler] 触发 Agent: ${id}`);
      try {
        const output = await agent.trigger();
        const runState = this.runStates.get(id);
        if (runState) {
          runState.lastRun = new Date();
          runState.successCount++;
        }
        // Process agent output: create events + push WebSocket
        await this.processAgentOutput(id, output);
      } catch (error) {
        console.error(`[Scheduler] Agent ${id} 执行失败:`, error);
        const runState = this.runStates.get(id);
        if (runState) {
          runState.lastRun = new Date();
          runState.errorCount++;
        }
      }
    }, {
      timezone: 'Asia/Shanghai'
    });

    this.jobs.set(id, job);
    console.log(`[Scheduler] ${id} 调度已启动: ${cronExpression}`);
  }

  /**
   * Process agent output: create game events and push WebSocket notifications
   */
  private async processAgentOutput(agentId: string, output: unknown): Promise<void> {
    if (!output || typeof output !== 'object') return;

    const obj = output as Record<string, unknown>;

    // Handle Nation agent output (policies, diplomatic decisions)
    if (Array.isArray(obj.policies) || Array.isArray(obj.diplomaticDecisions)) {
      await this.processNationOutput(agentId, obj);
      return;
    }

    // Handle City agent output (local events)
    if (Array.isArray(obj.localEvents)) {
      await this.processCityOutput(agentId, obj);
      return;
    }

    // Handle Chronos output (daily news) - already saves to DB in ChronosAgent
    // Just broadcast a notification
    if (obj.news) {
      wsNotificationService.notifyWorldEvent(
        '每日晨报已生成',
        `第${await this.getCurrentGameDay()}天的世界动态已更新`,
      );
    }
  }

  private async processNationOutput(agentId: string, obj: Record<string, unknown>): Promise<void> {
    const factionMap: Record<string, string> = {
      tianming_si: 'canglong',
      xianzu_yihui: 'shuanglang',
      huangjin_yihui: 'jinque',
    };
    const faction = factionMap[agentId] ?? 'unknown';
    const policies = obj.policies as Array<{ type: string; description: string; priority: string }>;
    const diplomaticDecisions = obj.diplomaticDecisions as Array<{ targetFaction: string; action: string; reason: string }>;

    // Create events for players in this faction
    const players = await prisma.player.findMany({
      where: { faction },
      take: 20,
    });

    for (const player of players) {
      const eventDate = new Date();
      eventDate.setDate(eventDate.getDate() + 1);

      const policySummaries = policies?.slice(0, 3).map(p => `${p.type}:${p.description}`).join('\n') || '无新政策';
      const diplomaticSummary = diplomaticDecisions?.slice(0, 2).map(d => `对${d.targetFaction}:${d.action}`).join('\n') || '无外交变动';

      await prisma.event.create({
        data: {
          id: `nation_event_${agentId}_${Date.now().toString(36)}_${player.id.slice(0, 8)}`,
          playerId: player.id,
          type: 'political_decision',
          category: 'daily_life',
          title: `${faction}最新动态`,
          description: `你的${faction === player.faction ? '阵营' : '关注势力'}发布了新政策与外交决策。`,
          narrativeText: `【政策】\n${policySummaries}\n\n【外交】\n${diplomaticSummary}`,
          choices: JSON.stringify([
            { index: 0, label: '关注政策', description: '了解更多', consequences: [], narrativeOutcome: '你仔细阅读了相关政策。' },
            { index: 1, label: '暂不理会', description: '继续日常', consequences: [], narrativeOutcome: '你选择将注意力放在自己的事务上。' },
          ]),
          scope: 'regional',
          status: 'pending',
          expiresAt: eventDate,
        },
      });
    }

    // Broadcast high-priority diplomatic actions
    const wars = diplomaticDecisions?.filter(d => d.action === 'war');
    if (wars && wars.length > 0) {
      for (const war of wars) {
        wsNotificationService.notifyFactionWar(faction, war.targetFaction, war.action);
      }
    }

    console.log(`[Scheduler] ${agentId}: Created events for ${players.length} players`);
  }

  private async processCityOutput(agentId: string, obj: Record<string, unknown>): Promise<void> {
    const localEvents = obj.localEvents as Array<{ type: string; title: string; description: string }>;

    if (!localEvents || localEvents.length === 0) return;

    const players = await prisma.player.findMany({ take: 20 });

    for (const player of players) {
      for (const localEvent of localEvents) {
        const eventDate = new Date();
        eventDate.setDate(eventDate.getDate() + 1);

        await prisma.event.create({
          data: {
            id: `city_event_${agentId}_${Date.now().toString(36)}_${player.id.slice(0, 8)}`,
            playerId: player.id,
            type: 'personal_event',
            category: 'daily_life',
            title: localEvent.title,
            description: localEvent.description,
            narrativeText: `${agentId}发生了新的本地事件：${localEvent.title}\n\n${localEvent.description}`,
            choices: JSON.stringify([
              { index: 0, label: '参与', description: '前往参与', consequences: [], narrativeOutcome: '你积极参与了此次活动。' },
              { index: 1, label: '观望', description: '暂不参与', consequences: [], narrativeOutcome: '你选择先观察情况。' },
            ]),
            scope: 'local',
            status: 'pending',
            expiresAt: eventDate,
          },
        });
      }
    }

    // Broadcast significant local events
    const disasters = localEvents.filter(e => e.type === 'disaster');
    if (disasters.length > 0) {
      wsNotificationService.notifyWorldEvent(
        '城邦紧急事件',
        disasters.map(d => d.title).join(', '),
      );
    }

    console.log(`[Scheduler] ${agentId}: Created ${localEvents.length} local events for ${players.length} players`);
  }

  private async getCurrentGameDay(): Promise<number> {
    const worldState = await prisma.worldState.findFirst({ orderBy: { day: 'desc' } });
    return worldState?.day ?? 1;
  }

  /**
   * 停止所有调度
   */
  stop(): void {
    if (!this.running) {
      console.log('[Scheduler] 未在运行');
      return;
    }

    console.log('[Scheduler] 停止所有Agent调度...');
    for (const [id, job] of this.jobs) {
      job.stop();
      console.log(`[Scheduler] ${id} 调度已停止`);
    }

    this.jobs.clear();
    this.running = false;
    console.log('[Scheduler] 所有Agent调度已停止');
  }

  /**
   * 手动触发Agent
   */
  async triggerAgent(id: string): Promise<unknown> {
    const agent = this.agents.get(id);
    if (!agent) {
      throw new Error(`Agent ${id} 未注册`);
    }

    console.log(`[Scheduler] 手动触发 Agent: ${id}`);
    try {
      const output = await agent.trigger();
      const runState = this.runStates.get(id);
      if (runState) {
        runState.lastRun = new Date();
        runState.successCount++;
      }
      await this.processAgentOutput(id, output);
      return output;
    } catch (error) {
      const runState = this.runStates.get(id);
      if (runState) {
        runState.lastRun = new Date();
        runState.errorCount++;
      }
      throw error;
    }
  }

  /**
   * 获取调度状态
   */
  getStatus(): SchedulerStatus {
    const agentsStatus: Record<string, { status: string; lastRun: Date | null; nextRun: Date | null; successCount: number; errorCount: number }> = {};

    for (const [id] of this.agents) {
      const runState = this.runStates.get(id);
      agentsStatus[id] = {
        status: this.jobs.has(id) ? 'running' : 'stopped',
        lastRun: runState?.lastRun ?? null,
        nextRun: null,
        successCount: runState?.successCount ?? 0,
        errorCount: runState?.errorCount ?? 0,
      };
    }

    return {
      running: this.running,
      agents: agentsStatus
    };
  }

  /**
   * 获取已注册的Agent列表
   */
  getRegisteredAgents(): string[] {
    return Array.from(this.agents.keys());
  }
}

// 创建默认调度器实例
export const agentScheduler = new AgentScheduler();
