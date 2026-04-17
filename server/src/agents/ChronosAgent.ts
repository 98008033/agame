/**
 * Chronos Agent - 世界级Agent
 * 每日生成世界晨报和事件
 */

import cron from 'node-cron';
import prisma from '../models/prisma.js';
import { llmService } from '../services/llm/index.js';
import { promptBuilder } from './PromptBuilder.js';
import { safeJsonParse, safeJsonStringify } from '../utils/index.js';

export interface DailyNewsOutput {
  news: {
    canglong: { headline: { title: string; content: string; type: string; importance: string }; summary: string };
    shuanglang: { headline: { title: string; content: string; type: string; importance: string }; summary: string };
    jinque: { headline: { title: string; content: string; type: string; importance: string }; summary: string };
    border: { headline: { title: string; content: string; type: string; importance: string }; summary: string };
  };
}

export class ChronosAgent {
  private scheduledJob: cron.ScheduledTask | null = null;
  private status: 'idle' | 'running' | 'error' = 'idle';

  /**
   * 执行每日晨报生成
   */
  async generateDailyNews(): Promise<DailyNewsOutput | null> {
    this.status = 'running';
    console.log('[Chronos] 开始生成每日晨报...');

    try {
      // 获取当前世界状态
      const worldState = await prisma.worldState.findFirst({
        orderBy: { day: 'desc' }
      });

      if (!worldState) {
        console.error('[Chronos] 未找到世界状态');
        this.status = 'error';
        return null;
      }

      // 获取近期事件
      const recentEvents = await prisma.event.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        take: 5,
        orderBy: { createdAt: 'desc' }
      });

      const recentEventsText = recentEvents.map(e => `${e.title}: ${e.description}`).join('\n') || '无重大事件';

      // 构建Prompt
      const factionsData = safeJsonParse<Record<string, { military: number }>>(worldState.factions, {});
      const messages = promptBuilder.buildDailyNewsPrompt({
        day: worldState.day,
        date: `第${worldState.year}年 ${worldState.month}月`,
        canglongPower: factionsData.canglong?.military || 50,
        shuanglangPower: factionsData.shuanglang?.military || 50,
        jinquePower: factionsData.jinque?.military || 50,
        borderPower: factionsData.border?.military || 50,
        recentEvents: recentEventsText
      });

      // 调用LLM
      const response = await llmService.generate({ messages });

      // 解析输出
      let output: DailyNewsOutput;
      try {
        // 提取JSON
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          output = JSON.parse(jsonMatch[0]);
        } else {
          output = JSON.parse(response.content);
        }
      } catch {
        console.error('[Chronos] JSON解析失败，使用默认内容');
        output = this.getFallbackNews();
      }

      // 保存到数据库
      await prisma.dailyNews.create({
        data: {
          day: worldState.day,
          date: new Date().toISOString().split('T')[0] ?? '2026-04-01',
          news: safeJsonStringify(output.news),
          worldHeadline: safeJsonStringify(null),
          playerNews: safeJsonStringify([]),
          generatedBy: 'chronos'
        }
      });

      // 更新世界状态（推进一天）
      await prisma.worldState.create({
        data: {
          day: worldState.day + 1,
          year: worldState.year,
          month: worldState.month,
          season: worldState.season,
          phase: worldState.phase,
          historyStage: worldState.historyStage,
          snapshotId: `ws_${Date.now().toString(36)}`,
          previousSnapshotId: worldState.snapshotId,
          balance: worldState.balance,
          factions: worldState.factions,
          cities: worldState.cities,
          activeEvents: worldState.activeEvents,
          globalVariables: worldState.globalVariables
        }
      });

      this.status = 'idle';
      console.log('[Chronos] 每日晨报生成完成');

      return output;
    } catch (error) {
      this.status = 'error';
      console.error('[Chronos] 生成失败:', error);
      return null;
    }
  }

  /**
   * 启动定时调度
   */
  startSchedule(): void {
    // 每日早上6点执行
    this.scheduledJob = cron.schedule('0 6 * * *', async () => {
      await this.generateDailyNews();
    }, {
      timezone: 'Asia/Shanghai'
    });

    console.log('[Chronos] 调度已启动: 每日6:00');
  }

  /**
   * 停止调度
   */
  stopSchedule(): void {
    if (this.scheduledJob) {
      this.scheduledJob.stop();
      this.scheduledJob = null;
      console.log('[Chronos] 调度已停止');
    }
  }

  /**
   * 获取状态
   */
  getStatus(): { status: string; lastRun: Date | null } {
    return { status: this.status, lastRun: null };
  }

  /**
   * 降级模板（LLM失败时使用）
   */
  private getFallbackNews(): DailyNewsOutput {
    return {
      news: {
        canglong: {
          headline: { title: '帝都今日平静', content: '苍龙帝国帝都今日一切平静，各衙门照常运转。', type: 'social', importance: 'minor' },
          summary: '今日平稳'
        },
        shuanglang: {
          headline: { title: '部落议会召开', content: '霜狼联邦部落议会召开，讨论今冬猎场分配。', type: 'political', importance: 'minor' },
          summary: '议会正常进行'
        },
        jinque: {
          headline: { title: '花城贸易繁忙', content: '金雀花王国花城港口贸易繁忙，商船络绎不绝。', type: 'economic', importance: 'minor' },
          summary: '贸易繁荣'
        },
        border: {
          headline: { title: '边境风声平静', content: '边境联盟各村庄平静，村民忙着日常劳作。', type: 'social', importance: 'minor' },
          summary: '边境安宁'
        }
      }
    };
  }
}

// 创建默认实例
export const chronosAgent = new ChronosAgent();