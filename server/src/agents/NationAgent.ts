/**
 * 国家级Agent
 * 天命司（苍龙）、先祖议会（霜狼）、黄金议会（金雀花）
 */

import { BaseAgent } from './BaseAgent.js';
import { AgentConfig, NationAgentOutput, AGENT_CONFIGS } from './types.js';
import { promptBuilder } from './PromptBuilder.js';
import { outputValidator } from './OutputValidator.js';
import prisma from '../models/prisma.js';
import { FactionNames } from '../types/game.js';

export class NationAgent extends BaseAgent<NationAgentOutput> {
  private faction: 'canglong' | 'shuanglang' | 'jinque';

  constructor(config: AgentConfig, faction: 'canglong' | 'shuanglang' | 'jinque') {
    super(config);
    this.faction = faction;
  }

  /**
   * 执行国家级决策
   */
  async execute(): Promise<NationAgentOutput | null> {
    console.log(`[${this.config.id}] 开始执行国家级决策...`);

    // 获取阵营状态
    const factionState = await this.getFactionState(this.faction);
    if (!factionState) {
      console.error(`[${this.config.id}] 未找到阵营状态`);
      return this.getFallbackOutput();
    }

    // 获取阵营领袖
    const leader = await this.getNPC(factionState.leader);
    if (!leader) {
      console.error(`[${this.config.id}] 未找到阵营领袖`);
      return this.getFallbackOutput();
    }

    // 获取近期阵营事件
    const factionEvents = await this.getFactionEvents(this.faction);

    // 获取其他阵营状态（用于多国互动分析）
    const otherFactionsStatus = await this.getOtherFactionsStatus();

    // 获取与玩家相关的阵营关系（玩家在本阵营的声誉）
    const playerRelations = await this.getPlayerFactionRelations();

    // 构建Prompt
    const messages = promptBuilder.buildNationAgentPrompt({
      agentName: this.config.name,
      factionName: FactionNames[this.faction],
      leaderName: leader.name,
      powerIndex: factionState.military + factionState.economy + factionState.stability,
      militaryStrength: factionState.military,
      economicHealth: factionState.economy,
      politicalStability: factionState.stability,
      publicMorale: 60,
      diplomaticRelations: await this.getDiplomaticRelations(this.faction),
      factionEvents: factionEvents.map(e => `${e.title}: ${e.description}`).join('\n') || '无重大事件',
      otherFactionsStatus, // 新增：多国状态
      playerRelations // 新增：玩家关系
    });

    // 调用LLM
    const rawOutput = await this.callLLM(messages);

    // 验证输出
    const validation = outputValidator.validateNationOutput(rawOutput);
    if (!validation.valid) {
      console.error(`[${this.config.id}] 输出验证失败:`, validation.errors);
      return this.getFallbackOutput();
    }

    // 保存决策到数据库
    const output = rawOutput as NationAgentOutput;
    await this.saveDecisions(output);

    return output;
  }

  /**
   * 获取阵营事件
   */
  private async getFactionEvents(faction: string): Promise<Array<{ title: string; description: string }>> {
    const events = await prisma.event.findMany({
      where: {
        affectedEntities: { contains: faction }
      },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    return events.map(e => ({
      title: e.title,
      description: e.description
    }));
  }

  /**
   * 获取其他阵营状态（多国互动分析）
   */
  private async getOtherFactionsStatus(): Promise<string> {
    const worldState = await this.getWorldState();
    if (!worldState) return '暂无其他阵营信息';

    const factions = worldState.factions as Record<string, {
      name: string;
      leader: string;
      military: number;
      economy: number;
      stability: number;
      influence: number;
      relations?: Record<string, string>;
    }>;

    const lines: string[] = [];
    const otherFactions = ['canglong', 'shuanglang', 'jinque', 'border'].filter(f => f !== this.faction);

    for (const factionId of otherFactions) {
      const data = factions[factionId];
      if (!data) continue;

      const relationStatus = data.relations?.[this.faction] || '未知';
      const powerLevel = (data.military + data.economy + data.stability) / 3;
      const threatLevel = this.calculateThreatLevel(data, factions[this.faction] ?? { military: 50, economy: 50, stability: 50 });

      lines.push(`${data.name}: 军力${data.military}/经济${data.economy}/稳定${data.stability} | 势力${Math.round(powerLevel)} | 对我态度:${relationStatus} | 威胁等级:${threatLevel}`);
    }

    return lines.join('\n') || '暂无其他阵营信息';
  }

  /**
   * 计算威胁等级
   */
  private calculateThreatLevel(
    target: { military: number; economy: number; stability: number; relations?: Record<string, string> },
    self: { military: number; economy: number; stability: number }
  ): string {
    const relationStatus = target.relations?.[this.faction] || '中立';

    // 基础威胁计算
    const militaryGap = target.military - self.military;
    const overallPower = (target.military + target.economy + target.stability) / 3;

    let threatScore = 0;

    // 军力差距权重最高
    threatScore += militaryGap > 20 ? 40 : militaryGap > 10 ? 20 : militaryGap < -20 ? -20 : 0;

    // 关系状态影响
    if (relationStatus === '敌对' || relationStatus === 'war') {
      threatScore += 30;
    } else if (relationStatus === '盟友' || relationStatus === 'alliance') {
      threatScore -= 20;
    } else if (relationStatus === '贸易伙伴' || relationStatus === 'trade') {
      threatScore -= 10;
    }

    // 综合势力影响
    if (overallPower > 60) {
      threatScore += 15;
    } else if (overallPower < 40) {
      threatScore -= 15;
    }

    if (threatScore >= 50) return '高威胁';
    if (threatScore >= 25) return '中威胁';
    if (threatScore >= 0) return '低威胁';
    return '无害';
  }

  /**
   * 获取玩家在本阵营的关系
   */
  private async getPlayerFactionRelations(): Promise<string> {
    // 获取所有玩家
    const players = await prisma.player.findMany({
      where: {
        faction: this.faction
      },
      take: 5
    });

    if (players.length === 0) {
      return `本阵营暂无玩家成员`;
    }

    const lines: string[] = [];
    for (const player of players) {
      const reputation = JSON.parse(player.reputation as string) as Record<string, number>;
      const factionRep = reputation[this.faction] || 0;
      lines.push(`玩家${player.name}: 阵营声望${factionRep}, 等级${player.level}, 职位${player.factionLevel}`);
    }

    return `本阵营玩家成员:\n${lines.join('\n')}`;
  }

  /**
   * 获取外交关系
   */
  private async getDiplomaticRelations(faction: string): Promise<string> {
    const worldState = await this.getWorldState();
    if (!worldState) return '暂无外交信息';

    const factions = worldState.factions as Record<string, { relations?: Record<string, string> }>;
    const relations = factions[faction]?.relations || {};

    const lines: string[] = [];
    for (const [target, status] of Object.entries(relations)) {
      lines.push(`${FactionNames[target as keyof typeof FactionNames] || target}: ${status}`);
    }

    return lines.join('\n') || '暂无外交关系';
  }

  /**
   * 保存决策到数据库
   */
  private async saveDecisions(output: NationAgentOutput): Promise<void> {
    // 获取当前世界状态
    const worldState = await this.getWorldState();
    if (!worldState) {
      console.error(`[${this.config.id}] 无法获取世界状态，跳过状态更新`);
      return;
    }

    // 更新阵营状态到 WorldState
    await this.updateFactionState(worldState, output.factionStatus);

    // 创建决策事件
    for (const policy of output.policies) {
      await prisma.event.create({
        data: {
          id: `policy_${this.faction}_${Date.now().toString(36)}`,
          title: `${FactionNames[this.faction]}${policy.type}决策`,
          description: policy.description,
          type: 'political_decision',
          category: 'crisis_response',
          scope: 'national',
          status: 'active',
          choices: '[]',
          affectedEntities: JSON.stringify([this.faction])
        }
      });
    }

    // 处理外交决策的影响
    for (const diplomatic of output.diplomaticDecisions) {
      await this.processDiplomaticDecision(diplomatic);
    }

    // 记录 AgentTask
    await this.recordAgentTask(output);

    console.log(`[${this.config.id}] 已保存${output.policies.length}项决策，更新阵营状态`);
  }

  /**
   * 更新阵营状态到 WorldState
   */
  private async updateFactionState(
    worldState: {
      day: number;
      year: number;
      month: number;
      season: string;
      phase: string;
      historyStage: string;
      factions: Record<string, unknown>;
      cities: Record<string, unknown>;
    },
    newStatus: {
      militaryStrength: number;
      economicHealth: number;
      politicalStability: number;
      publicMorale: number;
    }
  ): Promise<void> {
    // 解析现有阵营数据
    const factions = worldState.factions as Record<string, {
      name: string;
      leader: string;
      military: number;
      economy: number;
      stability: number;
      influence: number;
      morale?: number;
      relations?: Record<string, string>;
    }>;

    // 更新本阵营状态
    const factionData = factions[this.faction] || {
      name: FactionNames[this.faction],
      leader: '未知',
      military: 50,
      economy: 50,
      stability: 50,
      influence: 50
    };

    // 应用新的状态值（保留历史趋势，平滑过渡）
    const smoothingFactor = 0.7; // 新值权重
    factions[this.faction] = {
      ...factionData,
      military: Math.round(factionData.military * (1 - smoothingFactor) + newStatus.militaryStrength * smoothingFactor),
      economy: Math.round(factionData.economy * (1 - smoothingFactor) + newStatus.economicHealth * smoothingFactor),
      stability: Math.round(factionData.stability * (1 - smoothingFactor) + newStatus.politicalStability * smoothingFactor),
      morale: newStatus.publicMorale,
      influence: Math.round((newStatus.militaryStrength + newStatus.economicHealth + newStatus.politicalStability) / 3)
    };

    // 创建新的 WorldState 快照
    await prisma.worldState.create({
      data: {
        day: worldState.day,
        year: worldState.year,
        month: worldState.month,
        season: worldState.season,
        phase: worldState.phase,
        historyStage: worldState.historyStage,
        snapshotId: `ws_${worldState.day}_${Date.now().toString(36)}`,
        previousSnapshotId: null,
        balance: JSON.stringify(this.calculateBalance(factions)),
        factions: JSON.stringify(factions),
        cities: JSON.stringify(worldState.cities)
      }
    });

    console.log(`[${this.config.id}] 已更新${FactionNames[this.faction]}阵营状态`);
  }

  /**
   * 计算势力平衡状态
   */
  private calculateBalance(factions: Record<string, { influence: number }>): {
    currentState: string;
    dominantFaction: string | null;
    balanceScore: number;
  } {
    const influences = Object.entries(factions).map(([key, data]) => ({
      faction: key,
      influence: data.influence
    }));

    const maxInfluence = Math.max(...influences.map(f => f.influence));
    const minInfluence = Math.min(...influences.map(f => f.influence));
    const avgInfluence = influences.reduce((sum, f) => sum + f.influence, 0) / influences.length;

    // 计算平衡度 (0-100, 100为完全平衡)
    const variance = influences.reduce((sum, f) => sum + Math.pow(f.influence - avgInfluence, 2), 0) / influences.length;
    const balanceScore = Math.max(0, Math.min(100, 100 - variance / 10));

    // 确定主导阵营
    const dominant = influences.find(f => f.influence === maxInfluence);
    const isBiased = maxInfluence - minInfluence > 20;
    const dominantFaction = isBiased ? dominant?.faction : null;

    return {
      currentState: isBiased ? `biased_${dominantFaction}` : 'balanced',
      dominantFaction: dominantFaction ?? null,
      balanceScore
    };
  }

  /**
   * 处理外交决策的影响
   */
  private async processDiplomaticDecision(decision: {
    targetFaction: string;
    action: 'alliance' | 'trade' | 'war' | 'neutrality';
    reason: string;
  }): Promise<void> {
    // 创建外交事件
    await prisma.event.create({
      data: {
        id: `diplomatic_${this.faction}_${decision.targetFaction}_${Date.now().toString(36)}`,
        title: `${FactionNames[this.faction]}对${FactionNames[decision.targetFaction as keyof typeof FactionNames] || decision.targetFaction}的${this.getDiplomaticActionLabel(decision.action)}`,
        description: decision.reason,
        type: 'diplomatic_summit',
        category: 'crisis_response',
        scope: 'national',
        status: 'active',
        choices: '[]',
        affectedEntities: JSON.stringify([this.faction, decision.targetFaction])
      }
    });

    // 更新外交关系状态
    const worldState = await this.getWorldState();
    if (worldState) {
      const factions = worldState.factions as Record<string, { relations?: Record<string, string> }>;
      const factionData = factions[this.faction] || {};
      const relations = factionData.relations || {};

      // 设置外交状态
      relations[decision.targetFaction] = this.getRelationStatus(decision.action);
      factions[this.faction] = { ...factionData, relations };
    }
  }

  /**
   * 获取外交行动标签
   */
  private getDiplomaticActionLabel(action: string): string {
    const labels: Record<string, string> = {
      alliance: '联盟提议',
      trade: '贸易协定',
      war: '战争宣言',
      neutrality: '中立声明'
    };
    return labels[action] || '外交行动';
  }

  /**
   * 获取外交状态字符串
   */
  private getRelationStatus(action: string): string {
    const statuses: Record<string, string> = {
      alliance: '盟友',
      trade: '贸易伙伴',
      war: '敌对',
      neutrality: '中立'
    };
    return statuses[action] || '未知';
  }

  /**
   * 记录 AgentTask
   */
  private async recordAgentTask(output: NationAgentOutput): Promise<void> {
    await prisma.agentTask.create({
      data: {
        agentId: this.config.id,
        taskType: 'nation_decision',
        targetId: this.faction,
        input: JSON.stringify({
          faction: this.faction,
          triggerTime: new Date().toISOString()
        }),
        output: JSON.stringify(output),
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date()
      }
    });
  }

  /**
   * 降级输出
   */
  protected getFallbackOutput(): NationAgentOutput {
    return {
      policies: [
        { type: 'economic', description: '维持现状，观察局势', priority: 'low' }
      ],
      diplomaticDecisions: [],
      factionStatus: {
        militaryStrength: 50,
        economicHealth: 50,
        politicalStability: 50,
        publicMorale: 50
      }
    };
  }
}

// 创建三个国家级Agent实例
export const tianmingSiAgent = new NationAgent(
  AGENT_CONFIGS.tianming_si!,
  'canglong'
);

export const xianzuYihuiAgent = new NationAgent(
  AGENT_CONFIGS.xianzu_yihui!,
  'shuanglang'
);

export const huangjinYihuiAgent = new NationAgent(
  AGENT_CONFIGS.huangjin_yihui!,
  'jinque'
);