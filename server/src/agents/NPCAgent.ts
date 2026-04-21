/**
 * NPC Agent
 * NPC行为生成、对话响应
 */

import { BaseAgent } from './BaseAgent.js';
import { AgentConfig, NPCAgentOutput, AGENT_CONFIGS } from './types.js';
import { promptBuilder } from './PromptBuilder.js';
import { outputValidator } from './OutputValidator.js';
import prisma from '../models/prisma.js';
import { getRelationshipLevel } from '../types/game.js';

export interface NPCContext {
  npcId: string;
  playerAction?: string;
  triggerType: 'interaction' | 'daily' | 'event';
}

export class NPCAgent extends BaseAgent<NPCAgentOutput> {
  private npcId: string;

  constructor(config: AgentConfig, npcId: string) {
    super(config);
    this.npcId = npcId;
  }

  /**
   * 执行NPC行为
   */
  async execute(): Promise<NPCAgentOutput | null> {
    console.log(`[${this.npcId}] 开始执行NPC行为...`);

    // 获取NPC信息
    const npc = await this.getNPC(this.npcId);
    if (!npc) {
      console.error(`[${this.npcId}] 未找到NPC`);
      return this.getFallbackOutput();
    }

    // 获取NPC当前状态
    const status = npc.currentStatus as Record<string, unknown>;
    const location = (status.location as Record<string, unknown>) || { region: 'unknown', city: 'unknown' };
    const health = (status.health as number) || 100;
    const mood = (status.mood as string) || 'neutral';

    // 构建Prompt（简化版，无玩家交互）
    const messages = promptBuilder.buildNPCAgentPrompt({
      npcName: npc.name,
      npcDescription: `${npc.faction ? `${npc.faction}阵营` : '自由人'}NPC`,
      age: 30,
      gender: 'unknown',
      profession: 'unknown',
      faction: npc.faction || '无',
      personality: Object.entries(npc.personality).map(([k, v]) => `${k}:${v}`).join(','),
      location: `${location.region}/${location.city || '野外'}`,
      health,
      mood,
      relationshipValue: 0,
      relationshipLevel: 'neutral',
      recentMemories: '暂无近期记忆',
      playerAction: '日常检查'
    });

    // 调用LLM
    const rawOutput = await this.callLLM(messages);

    // 验证输出
    const validation = outputValidator.validateNPCOutput(rawOutput);
    if (!validation.valid) {
      console.error(`[${this.npcId}] 输出验证失败:`, validation.errors);
      return this.getFallbackOutput();
    }

    return rawOutput as NPCAgentOutput;
  }

  /**
   * 处理玩家交互
   */
  async handleInteraction(playerAction: string, _playerId: string): Promise<NPCAgentOutput | null> {
    console.log(`[${this.npcId}] 处理玩家交互...`);

    // 获取NPC信息
    const npc = await this.getNPC(this.npcId);
    if (!npc) {
      return this.getFallbackOutput();
    }

    // 获取玩家与NPC关系
    const relationship = await this.getRelationship(_playerId, this.npcId);

    // 获取NPC记忆
    const memories = await this.getNPCMemories(this.npcId, 5);

    // 获取NPC当前状态
    const status = npc.currentStatus as Record<string, unknown>;
    const location = (status.location as Record<string, unknown>) || { region: 'unknown', city: 'unknown' };

    // 构建Prompt
    const messages = promptBuilder.buildNPCAgentPrompt({
      npcName: npc.name,
      npcDescription: `${npc.faction ? `${npc.faction}阵营` : '自由人'}NPC`,
      age: 30,
      gender: 'unknown',
      profession: 'unknown',
      faction: npc.faction || '无',
      personality: Object.entries(npc.personality).map(([k, v]) => `${k}:${v}`).join(','),
      location: `${location.region}/${location.city || '野外'}`,
      health: (status.health as number) || 100,
      mood: (status.mood as string) || 'neutral',
      relationshipValue: relationship.value,
      relationshipLevel: getRelationshipLevel(relationship.value),
      recentMemories: memories.map(m => m.event).join('\n') || '暂无近期记忆',
      playerAction
    });

    // 调用LLM
    const rawOutput = await this.callLLM(messages);

    // 验证输出
    const validation = outputValidator.validateNPCOutput(rawOutput);
    if (!validation.valid) {
      console.error(`[${this.npcId}] 输出验证失败:`, validation.errors);
      return this.getFallbackOutput();
    }

    const output = rawOutput as NPCAgentOutput;

    // 更NPC记忆
    if (output.memoryUpdate) {
      await this.saveMemory(this.npcId, output.memoryUpdate);
    }

    // 更NPC状态
    await this.updateNPCStatus(this.npcId, output.behavior);

    return output;
  }

  /**
   * 获取玩家与NPC关系
   */
  private async getRelationship(playerId: string, npcId: string): Promise<{ value: number }> {
    const npc = await this.getNPC(npcId);
    if (!npc) return { value: 0 };

    try {
      const relationships = JSON.parse(npc.relationships as string) as Record<string, unknown>;
      const playerRelations = relationships['players'] as Record<string, number> | undefined;
      if (playerRelations && playerRelations[playerId]) {
        return { value: playerRelations[playerId] };
      }
    } catch {
      // Parse error, return default
    }

    // Also check the player's relationships field as fallback
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (player) {
      try {
        const playerRels = JSON.parse(player.relationships as string) as Record<string, number>;
        if (playerRels[npcId]) return { value: playerRels[npcId] };
      } catch {
        // Parse error
      }
    }

    return { value: 0 };
  }

  /**
   * 更新玩家与NPC关系
   */
  async updateRelationship(playerId: string, npcId: string, delta: number): Promise<void> {
    const npc = await this.getNPC(npcId);
    if (!npc) return;

    try {
      const relationships = JSON.parse(npc.relationships as string) as Record<string, unknown>;
      const playerRelations = (relationships['players'] as Record<string, number>) ?? {};
      const currentValue = playerRelations[playerId] ?? 0;
      playerRelations[playerId] = Math.max(-100, Math.min(100, currentValue + delta));
      relationships['players'] = playerRelations;

      await prisma.nPC.update({
        where: { id: npcId },
        data: { relationships: JSON.stringify(relationships) },
      });
    } catch (err) {
      console.error(`[NPCAgent] Failed to update relationship:`, err);
    }
  }

  /**
   * 获取NPC记忆
   */
  private async getNPCMemories(npcId: string, limit: number): Promise<Array<{ event: string; timestamp: number }>> {
    // 简化实现，从NPC的relationships字段获取历史
    const npc = await prisma.nPC.findUnique({ where: { id: npcId } });
    if (!npc) return [];

    const relationships = JSON.parse(npc.relationships as string) as Record<string, unknown>;
    const interactions = (relationships.interactions as Array<{ event: string; time: number }>) || [];

    return interactions.slice(0, limit).map(i => ({
      event: i.event,
      timestamp: i.time || Date.now()
    }));
  }

  /**
   * 保存NPC记忆
   */
  private async saveMemory(npcId: string, memory: { event: string; sentiment: number; importance: number }): Promise<void> {
    // 更NPC的relationships字段记录记忆
    const npc = await prisma.nPC.findUnique({ where: { id: npcId } });
    if (!npc) return;

    const relationships = JSON.parse(npc.relationships as string) as Record<string, unknown>;
    const interactions = (relationships.interactions as Array<unknown>) || [];

    interactions.push({
      event: memory.event,
      sentiment: memory.sentiment,
      importance: memory.importance,
      time: Date.now()
    });

    await prisma.nPC.update({
      where: { id: npcId },
      data: {
        relationships: JSON.stringify({ ...relationships, interactions })
      }
    });
  }

  /**
   * 更NPC状态
   */
  private async updateNPCStatus(npcId: string, behavior: { action: string; location: string }): Promise<void> {
    const npc = await prisma.nPC.findUnique({ where: { id: npcId } });
    if (!npc) return;

    const currentStatus = JSON.parse(npc.currentStatus as string) as Record<string, unknown>;
    currentStatus.lastAction = behavior.action;
    currentStatus.location = behavior.location;

    await prisma.nPC.update({
      where: { id: npcId },
      data: {
        currentStatus: JSON.stringify(currentStatus)
      }
    });
  }

  /**
   * 降级输出
   */
  protected getFallbackOutput(): NPCAgentOutput {
    return {
      behavior: {
        action: '保持沉默',
        location: '当前位置'
      },
      dialogue: {
        content: '...',
        tone: 'neutral'
      }
    };
  }
}

// 创建NPC Agent工厂函数
export function createNPCAgent(npcId: string): NPCAgent {
  return new NPCAgent(AGENT_CONFIGS.npc_agent!, npcId);
}