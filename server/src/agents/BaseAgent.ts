/**
 * Agent基类
 * 提供所有Agent的通用功能
 */

import * as cron from 'node-cron';
import prisma from '../models/prisma.js';
import { llmService } from '../services/llm/index.js';
import {
  AgentConfig,
  AgentStatus
} from './types.js';

export abstract class BaseAgent<TOutput = unknown> {
  protected config: AgentConfig;
  protected status: AgentStatus = 'init';
  protected scheduledJob: cron.ScheduledTask | null = null;
  protected lastRunTime: Date | null = null;
  protected errorCount: number = 0;
  protected readonly maxErrors = 3;

  constructor(config: AgentConfig) {
    this.config = config;
    this.status = 'standby';
  }

  /**
   * 执行Agent核心逻辑
   */
  abstract execute(): Promise<TOutput | null>;

  /**
   * 获取Agent配置
   */
  getConfig(): AgentConfig {
    return this.config;
  }

  /**
   * 获取Agent状态
   */
  getStatus(): { status: AgentStatus; lastRun: Date | null; errorCount: number } {
    return {
      status: this.status,
      lastRun: this.lastRunTime,
      errorCount: this.errorCount
    };
  }

  /**
   * 启动定时调度
   */
  startSchedule(): void {
    if (this.config.trigger.type === 'cron' && this.config.trigger.schedule) {
      this.scheduledJob = cron.schedule(this.config.trigger.schedule, async () => {
        await this.runWithRetry();
      }, {
        timezone: 'Asia/Shanghai'
      });
      console.log(`[${this.config.id}] 调度已启动: ${this.config.trigger.schedule}`);
    }
    this.status = 'running';
  }

  /**
   * 停止调度
   */
  stopSchedule(): void {
    if (this.scheduledJob) {
      this.scheduledJob.stop();
      this.scheduledJob = null;
      console.log(`[${this.config.id}] 调度已停止`);
    }
    this.status = 'standby';
  }

  /**
   * 手动触发执行
   */
  async trigger(): Promise<TOutput | null> {
    return await this.runWithRetry();
  }

  /**
   * 带重试的执行
   */
  protected async runWithRetry(): Promise<TOutput | null> {
    this.status = 'running';
    console.log(`[${this.config.id}] 开始执行...`);

    try {
      const output = await this.execute();
      this.lastRunTime = new Date();
      this.errorCount = 0;
      this.status = 'standby';
      console.log(`[${this.config.id}] 执行完成`);
      return output;
    } catch (error) {
      this.errorCount++;
      console.error(`[${this.config.id}] 执行失败 (错误计数: ${this.errorCount}):`, error);

      if (this.errorCount >= this.maxErrors) {
        this.status = 'error';
        console.error(`[${this.config.id}] 达到最大错误数，进入错误状态`);
      } else {
        this.status = 'standby';
      }

      return this.getFallbackOutput();
    }
  }

  /**
   * 获取降级输出
   */
  protected abstract getFallbackOutput(): TOutput | null;

  /**
   * 调用LLM并验证输出
   */
  protected async callLLM(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>): Promise<unknown> {
    const response = await llmService.generate({
      messages,
      temperature: this.config.model.primary.temperature,
      maxTokens: this.config.maxTokens
    });

    // 解析JSON
    const content = response.content;
    let parsed: unknown;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(content);
      }
    } catch {
      throw new Error('JSON解析失败');
    }

    return parsed;
  }

  /**
   * 获取世界状态
   */
  protected async getWorldState(): Promise<{
    day: number;
    year: number;
    month: number;
    season: string;
    phase: string;
    historyStage: string;
    factions: Record<string, unknown>;
    cities: Record<string, unknown>;
  } | null> {
    const state = await prisma.worldState.findFirst({
      orderBy: { day: 'desc' }
    });

    if (!state) return null;

    return {
      day: state.day,
      year: state.year,
      month: state.month,
      season: state.season,
      phase: state.phase,
      historyStage: state.historyStage,
      factions: JSON.parse(state.factions as string) as Record<string, unknown>,
      cities: JSON.parse(state.cities as string) as Record<string, unknown>
    };
  }

  /**
   * 获取阵营状态
   */
  protected async getFactionState(faction: string): Promise<{
    name: string;
    leader: string;
    military: number;
    economy: number;
    stability: number;
    influence: number;
  } | null> {
    const worldState = await this.getWorldState();
    if (!worldState) return null;

    const factions = worldState.factions as Record<string, {
      name: string;
      leader: string;
      military: number;
      economy: number;
      stability: number;
      influence: number;
    }>;

    return factions[faction] || null;
  }

  /**
   * 获取近期事件
   */
  protected async getRecentEvents(days: number = 7): Promise<Array<{
    title: string;
    description: string;
    createdAt: Date;
  }>> {
    const events = await prisma.event.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        }
      },
      take: 10,
      orderBy: { createdAt: 'desc' }
    });

    return events.map(e => ({
      title: e.title,
      description: e.description,
      createdAt: e.createdAt
    }));
  }

  /**
   * 获取NPC信息
   */
  protected async getNPC(npcId: string): Promise<{
    id: string;
    name: string;
    faction: string | null;
    attributes: Record<string, number>;
    personality: Record<string, number>;
    currentStatus: Record<string, unknown>;
    relationships: string;
  } | null> {
    const npc = await prisma.nPC.findUnique({
      where: { id: npcId }
    });

    if (!npc) return null;

    return {
      id: npc.id,
      name: npc.name,
      faction: npc.faction,
      attributes: JSON.parse(npc.attributes as string) as Record<string, number>,
      personality: JSON.parse(npc.personality as string) as Record<string, number>,
      currentStatus: JSON.parse(npc.currentStatus as string) as Record<string, unknown>,
      relationships: npc.relationships as string,
    };
  }
}