/**
 * 权力循环系统 - 派系权力平衡、权力斗争检测与解决
 *
 * 核心逻辑:
 * - 每日权力周期: 权力评估 → 斗争检测 → 重组
 * - 权力平衡计算: 基于军事、经济、稳定性的综合评分
 * - 权力斗争: 当权力差距小于阈值时触发
 * - LLM叙事生成: 为权力斗争事件生成叙述文本
 */

import prisma from '../models/prisma.js';
import { safeJsonParse, safeJsonStringify } from '../utils/index.js';
import { llmService } from '../services/llm/index.js';
import { FactionNames } from '../types/game.js';
import type { Faction } from '../types/game.js';

// ============================================
// 常量配置
// ============================================

export const POWER_CONFIG = {
  // 权力斗争阈值
  struggleThreshold: 15,       // 权力差距<15时触发斗争
  criticalThreshold: 5,        // 权力差距<5时为激烈斗争
  stabilityDecay: 2,           // 未发生斗争时稳定性恢复

  // 权力权重
  militaryWeight: 0.4,
  economyWeight: 0.3,
  stabilityWeight: 0.2,
  influenceWeight: 0.1,

  // 权力重组
  winnerGain: 5,              // 赢家获得权力加成
  loserLoss: 3,               // 输家失去权力
  loserStabilityLoss: 10,     // 输家稳定性损失
};

// ============================================
// 类型定义
// ============================================

export interface FactionPowerInfo {
  faction: Faction;
  name: string;
  military: number;
  economy: number;
  stability: number;
  influence: number;
  totalPower: number;
  powerRank: number;
}

export interface PowerStruggle {
  id: string;
  factions: [Faction, Faction];
  type: 'minor' | 'major' | 'critical';
  triggerReason: string;
  powerGap: number;
  status: 'active' | 'resolved' | 'escalated';
  winner?: Faction;
  resolution?: string;
  narrative?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface PowerCycleResult {
  day: number;
  factionPowers: FactionPowerInfo[];
  strugglesDetected: number;
  strugglesResolved: number;
  powerReorganized: boolean;
}

export interface PowerBalanceReport {
  factions: FactionPowerInfo[];
  powerGap: number;
  dominantFaction: Faction;
  weakestFaction: Faction;
  isStable: boolean;
  activeStruggles: number;
}

// ============================================
// 核心逻辑
// ============================================

/**
 * 计算派系的综合权力值
 */
function calculateFactionPower(factionData: {
  military: number;
  economy: number;
  stability: number;
  influence: number;
}): number {
  return Math.round(
    factionData.military * POWER_CONFIG.militaryWeight +
    factionData.economy * POWER_CONFIG.economyWeight +
    factionData.stability * POWER_CONFIG.stabilityWeight +
    factionData.influence * POWER_CONFIG.influenceWeight
  );
}

/**
 * 每日权力周期: 权力评估 → 斗争检测 → 重组
 */
export async function tickPowerCycle(): Promise<PowerCycleResult> {
  console.log('[Power] 开始每日权力周期...');

  // ---- 1. 获取当前世界状态 ----
  const worldState = await prisma.worldState.findFirst({
    orderBy: { day: 'desc' },
  });

  if (!worldState) {
    console.error('[Power] 未找到世界状态');
    return { day: 0, factionPowers: [], strugglesDetected: 0, strugglesResolved: 0, powerReorganized: false };
  }

  const factions = safeJsonParse<Record<string, { military: number; economy: number; stability: number; influence: number }>>(
    worldState.factions,
    {}
  );

  const factionList: Faction[] = ['canglong', 'shuanglang', 'jinque', 'border'];

  // ---- 2. 计算各方权力值 ----
  const factionPowers: FactionPowerInfo[] = factionList
    .filter(f => factions[f])
    .map(f => {
      const data = factions[f]!;
      const military = data.military ?? 50;
      const economy = data.economy ?? 50;
      const stability = data.stability ?? 50;
      const influence = data.influence ?? 50;

      return {
        faction: f,
        name: FactionNames[f],
        military,
        economy,
        stability,
        influence,
        totalPower: calculateFactionPower({ military, economy, stability, influence }),
        powerRank: 0,
      };
    })
    .sort((a, b) => b.totalPower - a.totalPower);

  // 设置排名
  factionPowers.forEach((fp, i) => { fp.powerRank = i + 1; });

  // ---- 3. 检测权力斗争 ----
  const activeStruggles = await detectPowerStruggles();
  const newStruggles: PowerStruggle[] = [];

  // 检查是否有新的斗争需要创建
  for (let i = 0; i < factionPowers.length - 1; i++) {
    for (let j = i + 1; j < factionPowers.length; j++) {
      const a = factionPowers[i]!;
      const b = factionPowers[j]!;
      const gap = a.totalPower - b.totalPower;

      // 只有权力接近的派系才会产生斗争
      if (gap <= POWER_CONFIG.struggleThreshold && gap >= 0) {
        const existingStruggle = activeStruggles.find(
          s => s.factions.includes(a.faction) && s.factions.includes(b.faction) && s.status === 'active'
        );

        if (!existingStruggle) {
          const struggleType = gap <= POWER_CONFIG.criticalThreshold ? 'critical' : gap <= 10 ? 'major' : 'minor';
          const newStruggle: PowerStruggle = {
            id: `struggle_${Date.now().toString(36)}_${a.faction}_${b.faction}`,
            factions: [a.faction, b.faction],
            type: struggleType,
            triggerReason: `权力差距 ${gap} 低于阈值 ${POWER_CONFIG.struggleThreshold}`,
            powerGap: gap,
            status: 'active',
            createdAt: new Date(),
          };
          newStruggles.push(newStruggle);

          // 生成斗争事件
          await generateStruggleEvent(newStruggle, a, b);
        }
      }
    }
  }

  // ---- 4. 解决已完成的斗争 ----
  const pendingResolutions = activeStruggles.filter(s => s.status === 'active');
  let resolvedCount = 0;

  for (const struggle of pendingResolutions) {
    // 简单解决: 权力高的一方获胜
    const resolved = await resolvePowerStruggle(struggle.id);
    if (resolved) resolvedCount++;
  }

  // ---- 5. 权力重组 ----
  let powerReorganized = false;
  if (newStruggles.length > 0 || resolvedCount > 0) {
    await reorganizePowerStructures(factionPowers, factionList, factions);
    powerReorganized = true;
  }

  console.log(`[Power] 权力周期完成: ${factionPowers.length} 个派系, ${newStruggles.length} 新斗争, ${resolvedCount} 已解决`);

  return {
    day: worldState.day,
    factionPowers,
    strugglesDetected: newStruggles.length,
    strugglesResolved: resolvedCount,
    powerReorganized,
  };
}

/**
 * 获取当前所有派系的权力平衡状态
 */
export async function getFactionPowerBalance(): Promise<PowerBalanceReport> {
  const worldState = await prisma.worldState.findFirst({
    orderBy: { day: 'desc' },
  });

  if (!worldState) {
    throw new Error('No world state found');
  }

  const factions = safeJsonParse<Record<string, { military: number; economy: number; stability: number; influence: number }>>(
    worldState.factions,
    {}
  );

  const factionList: Faction[] = ['canglong', 'shuanglang', 'jinque', 'border'];

  const factionPowers: FactionPowerInfo[] = factionList
    .filter(f => factions[f])
    .map(f => {
      const data = factions[f]!;
      const military = data.military ?? 50;
      const economy = data.economy ?? 50;
      const stability = data.stability ?? 50;
      const influence = data.influence ?? 50;

      return {
        faction: f,
        name: FactionNames[f],
        military,
        economy,
        stability,
        influence,
        totalPower: calculateFactionPower({ military, economy, stability, influence }),
        powerRank: 0,
      };
    })
    .sort((a, b) => b.totalPower - a.totalPower);

  factionPowers.forEach((fp, i) => { fp.powerRank = i + 1; });

  const dominant = factionPowers[0]!;
  const weakest = factionPowers[factionPowers.length - 1]!;
  const powerGap = dominant.totalPower - weakest.totalPower;

  const activeStruggles = await prisma.event.findMany({
    where: {
      type: 'political_decision',
      status: 'active',
      description: { contains: '权力斗争' },
    },
    select: { id: true },
  });

  return {
    factions: factionPowers,
    powerGap,
    dominantFaction: dominant.faction,
    weakestFaction: weakest.faction,
    isStable: powerGap > POWER_CONFIG.struggleThreshold,
    activeStruggles: activeStruggles.length,
  };
}

/**
 * 检测活跃的权力斗争
 */
export async function detectPowerStruggles(): Promise<PowerStruggle[]> {
  // 从 events 表中查找活跃的权力斗争事件
  const struggleEvents = await prisma.event.findMany({
    where: {
      type: { in: ['political_decision', 'military_conflict'] },
      status: { in: ['pending', 'active'] },
      description: { contains: '权力斗争' },
    },
    orderBy: { createdAt: 'desc' },
  });

  const struggles: PowerStruggle[] = [];

  for (const event of struggleEvents) {
    const affectedEntities = safeJsonParse<string[]>(event.affectedEntities, []);
    if (affectedEntities.length < 2) continue;

    const factionA = affectedEntities[0] as Faction;
    const factionB = affectedEntities[1] as Faction;

    struggles.push({
      id: event.id,
      factions: [factionA, factionB],
      type: event.title.includes('激烈') ? 'critical' : event.title.includes('重大') ? 'major' : 'minor',
      triggerReason: event.description,
      powerGap: 0,
      status: event.status === 'pending' ? 'active' : event.status as PowerStruggle['status'],
      createdAt: event.createdAt,
      narrative: event.narrativeText ?? undefined,
    });
  }

  return struggles;
}

/**
 * 解决特定的权力斗争
 */
export async function resolvePowerStruggle(struggleId: string): Promise<boolean> {
  const event = await prisma.event.findUnique({
    where: { id: struggleId },
  });

  if (!event) {
    console.warn(`[Power] 未找到斗争事件: ${struggleId}`);
    return false;
  }

  const affectedEntities = safeJsonParse<string[]>(event.affectedEntities, []);
  if (affectedEntities.length < 2) return false;

  const factionA = affectedEntities[0] as Faction;
  const factionB = affectedEntities[1] as Faction;

  // 获取当前权力值
  const worldState = await prisma.worldState.findFirst({ orderBy: { day: 'desc' } });
  if (!worldState) return false;

  const factions = safeJsonParse<Record<string, { military: number; economy: number; stability: number; influence: number }>>(
    worldState.factions,
    {}
  );

  const powerA = calculateFactionPower(factions[factionA] ?? { military: 50, economy: 50, stability: 50, influence: 50 });
  const powerB = calculateFactionPower(factions[factionB] ?? { military: 50, economy: 50, stability: 50, influence: 50 });

  const winner = powerA >= powerB ? factionA : factionB;
  const loser = winner === factionA ? factionB : factionA;

  // 生成解决叙事
  let narrative = '';
  try {
    const messages = [
      { role: 'system' as const, content: '你是一位历史学家，请根据以下信息生成一段简短的权力斗争解决叙述（100字以内）。' },
      {
        role: 'user' as const,
        content: `${FactionNames[winner]} 在与 ${FactionNames[loser]} 的权力斗争中获胜。斗争类型: ${event.title}。请生成一段叙述。`
      },
    ];
    const response = await llmService.generate({ messages, maxTokens: 200 });
    narrative = response.content;
  } catch {
    narrative = `${FactionNames[winner]} 在此次权力斗争中胜出，${FactionNames[loser]} 势力受到削弱。`;
  }

  // 更新事件状态
  await prisma.event.update({
    where: { id: struggleId },
    data: {
      status: 'completed',
      narrativeText: narrative,
      description: `${event.description} | 结果: ${FactionNames[winner]} 获胜`,
    },
  });

  // 更新世界状态中的权力值
  const updatedFactions = { ...factions };

  // 赢家获得权力加成
  if (updatedFactions[winner]) {
    updatedFactions[winner] = {
      ...updatedFactions[winner]!,
      military: (updatedFactions[winner]!.military ?? 50) + POWER_CONFIG.winnerGain,
      stability: (updatedFactions[winner]!.stability ?? 50) + 2,
    };
  }

  // 输家失去权力和稳定性
  if (updatedFactions[loser]) {
    updatedFactions[loser] = {
      ...updatedFactions[loser]!,
      military: Math.max(0, (updatedFactions[loser]!.military ?? 50) - POWER_CONFIG.loserLoss),
      stability: Math.max(0, (updatedFactions[loser]!.stability ?? 50) - POWER_CONFIG.loserStabilityLoss),
    };
  }

  await prisma.worldState.update({
    where: { day: worldState.day },
    data: { factions: safeJsonStringify(updatedFactions) },
  });

  console.log(`[Power] 斗争解决: ${FactionNames[winner]} 战胜 ${FactionNames[loser]}`);

  return true;
}

/**
 * 生成权力斗争事件
 */
async function generateStruggleEvent(
  struggle: PowerStruggle,
  factionA: FactionPowerInfo,
  factionB: FactionPowerInfo
): Promise<void> {
  let narrative = '';
  try {
    const messages = [
      { role: 'system' as const, content: '你是一位游戏叙事生成器。请根据以下信息生成一段权力斗争事件的描述（150字以内）。' },
      {
        role: 'user' as const,
        content: `${factionA.name} (权力值: ${factionA.totalPower}) 与 ${factionB.name} (权力值: ${factionB.totalPower}) 之间爆发了${struggle.type === 'critical' ? '激烈的' : struggle.type === 'major' ? '重大的' : '轻微的'}权力斗争。权力差距: ${struggle.powerGap}。请生成事件描述。`
      },
    ];
    const response = await llmService.generate({ messages, maxTokens: 300 });
    narrative = response.content;
  } catch {
    narrative = `${factionA.name} 与 ${factionB.name} 之间的权力关系趋于紧张。`;
  }

  await prisma.event.create({
    data: {
      id: struggle.id,
      type: 'political_decision',
      category: 'daily_life',
      title: `${struggle.type === 'critical' ? '激烈' : struggle.type === 'major' ? '重大' : '轻微'}权力斗争: ${factionA.name} vs ${factionB.name}`,
      description: struggle.triggerReason,
      narrativeText: narrative,
      choices: safeJsonStringify([]),
      affectedEntities: safeJsonStringify(struggle.factions),
      scope: 'national',
      status: 'active',
    },
  });

  console.log(`[Power] 创建权力斗争事件: ${struggle.id}`);
}

/**
 * 基于斗争结果重组权力结构
 */
async function reorganizePowerStructures(
  factionPowers: FactionPowerInfo[],
  factionList: Faction[],
  currentFactions: Record<string, { military: number; economy: number; stability: number; influence: number }>
): Promise<void> {
  const worldState = await prisma.worldState.findFirst({ orderBy: { day: 'desc' } });
  if (!worldState) return;

  const updatedFactions: Record<string, { military: number; economy: number; stability: number; influence: number }> = {
    ...currentFactions,
  };

  // 对每个派系进行稳定性调整
  for (const faction of factionList) {
    if (!updatedFactions[faction]) continue;

    const current = updatedFactions[faction]!;
    const stability = current.stability ?? 50;

    // 权力排名靠前的派系稳定性上升，靠后的下降
    const powerInfo = factionPowers.find(fp => fp.faction === faction);
    if (powerInfo) {
      if (powerInfo.powerRank === 1) {
        // 第一名稳定性恢复
        current.stability = Math.min(100, stability + POWER_CONFIG.stabilityDecay);
      } else if (powerInfo.powerRank === factionPowers.length) {
        // 最后一名稳定性下降
        current.stability = Math.max(0, stability - 1);
      }
    }

    updatedFactions[faction] = current;
  }

  await prisma.worldState.update({
    where: { day: worldState.day },
    data: { factions: safeJsonStringify(updatedFactions) },
  });
}
