/**
 * 影响追踪器 - 决策链路追踪与影响时间线
 *
 * 功能:
 * - 决策创建时记录状态快照 (before/after)
 * - 查询单个决策的后续影响
 * - 获取玩家影响时间线
 */

import prisma from '../models/prisma.js';
import { safeJsonParse, safeJsonStringify } from '../utils/index.js';

// ============================================
// Types
// ============================================

export interface StateSnapshot {
  resources: Record<string, number>;
  reputation: Record<string, number>;
  tags: string[];
  level: number;
}

export interface DecisionImpact {
  decisionId: number;
  eventId: string;
  eventTitle: string;
  choiceLabel: string;
  madeAt: string;
  gameDay: number;
  stateBefore: StateSnapshot;
  stateAfter: StateSnapshot;
  changes: Record<string, { before: number; after: number; delta: number }>;
  downstreamEffects: DownstreamEffect[];
}

export interface DownstreamEffect {
  type: 'event_chain' | 'reputation_shift' | 'relationship_change' | 'resource_impact';
  description: string;
  occurredAt: string;
  gameDay: number;
}

export interface ImpactTimelineEntry {
  id: number;
  type: 'decision' | 'impact' | 'cascade';
  title: string;
  description: string;
  changes: Record<string, number>;
  gameDay: number;
  occurredAt: string;
  linkedDecisionId?: number;
  linkedEventId?: string;
}

// ============================================
// Core Logic
// ============================================

/**
 * 捕获玩家当前状态快照
 */
async function captureState(playerId: string): Promise<StateSnapshot> {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) {
    throw new Error('Player not found');
  }

  return {
    resources: safeJsonParse<Record<string, number>>(player.resources, {}),
    reputation: safeJsonParse<Record<string, number>>(player.reputation, {}),
    tags: safeJsonParse<string[]>(player.tags, []),
    level: player.level,
  };
}

/**
 * 在决策创建前记录状态快照
 * 返回状态快照JSON，应在decision的context中保存
 */
export async function snapshotBeforeDecision(playerId: string): Promise<StateSnapshot> {
  return captureState(playerId);
}

/**
 * 在决策完成后记录影响记录
 */
export async function recordDecisionImpact(
  playerId: string,
  decisionId: number,
  eventId: string,
  stateBefore: StateSnapshot
): Promise<void> {
  const stateAfter = await captureState(playerId);

  // 计算变化
  const changes: Record<string, { before: number; after: number; delta: number }> = {};

  // 资源变化
  for (const [key, after] of Object.entries(stateAfter.resources)) {
    const before = stateBefore.resources[key] ?? 0;
    if (after !== before) {
      changes[key] = { before, after, delta: after - before };
    }
  }

  // 声誉变化
  for (const [key, after] of Object.entries(stateAfter.reputation)) {
    const before = stateBefore.reputation[key] ?? 0;
    if (after !== before) {
      changes[`rep_${key}`] = { before, after, delta: after - before };
    }
  }

  // 等级变化
  if (stateAfter.level !== stateBefore.level) {
    changes.level = { before: stateBefore.level, after: stateAfter.level, delta: stateAfter.level - stateBefore.level };
  }

  // 创建影响记录
  await prisma.gameAction.create({
    data: {
      playerId,
      actionType: 'decision_impact',
      apCost: 0,
      parameters: safeJsonStringify({
        decisionId,
        eventId,
        stateBefore,
        stateAfter,
      }),
      rewards: safeJsonStringify({ changes }),
      narrativeFeedback: `决策影响已记录: ${Object.keys(changes).length} 项状态变化`,
      gameDay: 0,
      success: true,
    },
  });
}

/**
 * 获取单个决策的影响详情
 */
export async function getDecisionImpact(
  playerId: string,
  decisionId: number
): Promise<DecisionImpact | null> {
  // 获取决策记录
  const decision = await prisma.decision.findFirst({
    where: { id: decisionId, playerId },
    include: { event: true },
  });

  if (!decision) return null;

  // 查找对应的影响记录
  const impactAction = await prisma.gameAction.findFirst({
    where: {
      playerId,
      actionType: 'decision_impact',
    },
    orderBy: { executedAt: 'asc' },
  });

  // 解析快照数据
  let stateBefore: StateSnapshot | null = null;
  let stateAfter: StateSnapshot | null = null;
  const changes: Record<string, { before: number; after: number; delta: number }> = {};

  if (impactAction) {
    const params = safeJsonParse<Record<string, unknown>>(impactAction.parameters, {});
    stateBefore = params['stateBefore'] as StateSnapshot | null;
    stateAfter = params['stateAfter'] as StateSnapshot | null;
    const rewards = safeJsonParse<Record<string, Record<string, { before: number; after: number; delta: number }>>>(impactAction.rewards, {});
    Object.assign(changes, rewards['changes'] ?? {});
  }

  // 如果没有影响记录，从决策 context 中提取
  if (!stateBefore) {
    const context = safeJsonParse<Record<string, unknown>>(decision.context, {});
    stateBefore = context['snapshotBefore'] as StateSnapshot | null;
  }

  // 查找下游影响（该决策之后发生的相关事件）
  const downstreamEffects: DownstreamEffect[] = [];
  const eventsAfter = await prisma.event.findMany({
    where: {
      playerId,
      createdAt: { gt: decision.madeAt },
    },
    take: 5,
    orderBy: { createdAt: 'asc' },
  });

  for (const event of eventsAfter) {
    // 检查事件描述是否提及原事件
    if (event.description.includes(event.title) || event.type === 'personal_event') {
      downstreamEffects.push({
        type: 'event_chain',
        description: `后续事件: ${event.title}`,
        occurredAt: event.createdAt.toISOString(),
        gameDay: 0,
      });
    }
  }

  return {
    decisionId: decision.id,
    eventId: decision.eventId,
    eventTitle: decision.event.title,
    choiceLabel: decision.choiceLabel,
    madeAt: decision.madeAt.toISOString(),
    gameDay: decision.gameDay,
    stateBefore: stateBefore ?? { resources: {}, reputation: {}, tags: [], level: 0 },
    stateAfter: stateAfter ?? { resources: {}, reputation: {}, tags: [], level: 0 },
    changes,
    downstreamEffects,
  };
}

/**
 * 获取玩家影响时间线
 */
export async function getPlayerImpactTimeline(
  playerId: string,
  limit = 50,
  offset = 0
): Promise<{ timeline: ImpactTimelineEntry[]; total: number }> {
  // 获取决策影响记录
  const impactActions = await prisma.gameAction.findMany({
    where: {
      playerId,
      actionType: 'decision_impact',
    },
    orderBy: { executedAt: 'desc' },
    skip: offset,
    take: limit,
  });

  const timeline: ImpactTimelineEntry[] = [];

  for (const action of impactActions) {
    const params = safeJsonParse<Record<string, unknown>>(action.parameters, {});
    const rewards = safeJsonParse<Record<string, unknown>>(action.rewards, {});
    const decisionId = params['decisionId'] as number | undefined;
    const eventId = params['eventId'] as string | undefined;
    const changes = rewards['changes'] as Record<string, { before: number; after: number; delta: number }> | undefined;

    // 简化变更数据
    const simplifiedChanges: Record<string, number> = {};
    if (changes) {
      for (const [key, val] of Object.entries(changes)) {
        simplifiedChanges[key] = val.delta;
      }
    }

    // 获取关联事件标题
    let title = '决策影响';
    if (eventId) {
      const event = await prisma.event.findFirst({
        where: { id: eventId },
        select: { title: true },
      });
      if (event) title = event.title;
    }

    timeline.push({
      id: action.id,
      type: 'decision',
      title,
      description: action.narrativeFeedback,
      changes: simplifiedChanges,
      gameDay: action.gameDay,
      occurredAt: action.executedAt.toISOString(),
      linkedDecisionId: decisionId,
      linkedEventId: eventId,
    });
  }

  const total = await prisma.gameAction.count({
    where: { playerId, actionType: 'decision_impact' },
  });

  return { timeline, total };
}
