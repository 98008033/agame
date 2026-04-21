// Action Routes - POST /v1/actions/*
// P0-B15: 关键接口限流保护

import { Router, type Request, type Response } from 'express';
import prisma from '../models/prisma.js';
import { createSuccessResponse, createErrorResponse, generateRequestId } from '../types/api.js';
import {
  type ActionType,
  type ActionDefinition,
  type ActionResult,
  BASIC_ACTIONS,
  MAX_ACTION_POINTS,
  MAX_STORED_AP,
} from '../types/game.js';
import { safeJsonParse, safeJsonStringify } from '../utils/index.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import { gainSkillExp } from '../services/skillService.js';

const router = Router();

// 决策执行限流：每用户每10秒最多1次（PLAN/11规范）
const actionRateLimiter = createRateLimiter({
  windowMs: 10 * 1000,  // 10秒窗口
  maxRequests: 1,       // 最多1次决策
  keyGenerator: (req: Request) => `${req.playerId || req.ip}:action`,
  message: '决策提交过于频繁，请10秒后再试',
});

// 获取行动定义列表
const ACTION_DEFINITIONS: Record<ActionType, ActionDefinition> = {} as Record<ActionType, ActionDefinition>;
for (const action of BASIC_ACTIONS) {
  ACTION_DEFINITIONS[action.type] = action;
}

// GET /v1/actions/list - 获取可用行动列表
router.get('/list', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  try {
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) {
      res.status(404).json(createErrorResponse('NOT_FOUND', '玩家不存在', requestId));
      return;
    }

    const resources = safeJsonParse<Record<string, number>>(player.resources, {});

    // 构建可用行动列表
    const availableActions = BASIC_ACTIONS.map((action) => {
      // 检查解锁条件
      let unlocked = true;
      const requirements = action.requirements ?? [];

      for (const req of requirements) {
        if (req.type === 'resource' && typeof req.value === 'number') {
          const goldReq = req.value;
          if ((resources['gold'] ?? 0) < goldReq) {
            unlocked = false;
            break;
          }
        }
      }

      return {
        type: action.type,
        category: action.category,
        name: action.name!,
        description: action.description!,
        apCost: action.apCost,
        unlocked,
        requirements: action.requirements ?? [],
        rewardsPreview: {
          resources: action.rewards.resources,
          narrative: action.rewards.narrative,
        },
      };
    });

    res.json(createSuccessResponse({
      actions: availableActions,
      total: availableActions.length,
    }, requestId));
  } catch (err) {
    console.error('[Actions List Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取行动列表失败', requestId, undefined, true));
  }
});

// GET /v1/actions/status - 获取AP状态
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  try {
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) {
      res.status(404).json(createErrorResponse('NOT_FOUND', '玩家不存在', requestId));
      return;
    }

    // 检查是否需要重置AP（新的一天）
    const now = new Date();
    const lastReset = player.lastAPResetAt;
    const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

    let currentAP = player.actionPoints;
    let storedAP = player.storedAP;

    // 如果超过24小时，重置AP
    if (hoursSinceReset >= 24) {
      // 存储未使用的AP（最多3）
      const unusedAP = Math.min(currentAP, MAX_STORED_AP);
      storedAP = Math.min(storedAP + unusedAP, MAX_STORED_AP);
      currentAP = MAX_ACTION_POINTS;

      await prisma.player.update({
        where: { id: playerId },
        data: {
          actionPoints: currentAP,
          storedAP,
          lastAPResetAt: now,
        },
      });
    }

    // 获取今日已执行的行动
    const todayActions = await prisma.gameAction.findMany({
      where: {
        playerId,
        executedAt: { gte: lastReset },
      },
      orderBy: { executedAt: 'desc' },
    });

    const totalApUsed = todayActions.reduce((sum, action) => sum + action.apCost, 0);

    res.json(createSuccessResponse({
      currentAP,
      storedAP,
      maxDaily: MAX_ACTION_POINTS,
      maxStored: MAX_STORED_AP,
      totalApUsed,
      remainingAP: currentAP,
      lastResetAt: lastReset.toISOString(),
      nextResetAt: new Date(lastReset.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      todayActions: todayActions.map(a => ({
        type: a.actionType,
        apCost: a.apCost,
        success: a.success,
        narrative: a.narrativeFeedback,
        executedAt: a.executedAt.toISOString(),
      })),
    }, requestId));
  } catch (err) {
    console.error('[AP Status Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取AP状态失败', requestId, undefined, true));
  }
});

// POST /v1/actions/execute - 执行行动（严格限流）
router.post('/execute', actionRateLimiter, async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  const { actionType, targetId, parameters } = req.body;

  if (!actionType) {
    res.status(400).json(createErrorResponse('INVALID_REQUEST', '缺少行动类型', requestId));
    return;
  }

  const actionDef = ACTION_DEFINITIONS[actionType as ActionType];
  if (!actionDef) {
    res.status(400).json(createErrorResponse('INVALID_REQUEST', '无效的行动类型', requestId, { actionType }));
    return;
  }

  try {
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) {
      res.status(404).json(createErrorResponse('NOT_FOUND', '玩家不存在', requestId));
      return;
    }

    // 检查AP是否足够
    const apCost = actionDef.apCost;
    if (player.actionPoints < apCost) {
      res.status(400).json(createErrorResponse('INVALID_REQUEST', '行动点不足', requestId, {
        required: apCost,
        current: player.actionPoints,
      }));
      return;
    }

    // 获取当前世界状态
    const worldState = await prisma.worldState.findFirst({ orderBy: { day: 'desc' } });
    const gameDay = worldState?.day ?? 1;

    // 计算奖励
    let rewards: Record<string, unknown> = {};
    let narrativeFeedback = actionDef.rewards.narrative;
    let success = true;

    const resources = safeJsonParse<Record<string, number>>(player.resources, {});

    // 根据行动类型计算具体奖励
    switch (actionType as ActionType) {
      case 'practice_skill':
        // 随机技能经验 +2~5
        const expGain = Math.floor(Math.random() * 4) + 2;
        const targetSkill = (targetId as string) ?? 'survival';
        try {
          const skillResult = await gainSkillExp(playerId, targetSkill, expGain, 'practice_skill');
          rewards = { skillExp: { skill: targetSkill, exp: expGain, leveledUp: skillResult.leveledUp } };
          narrativeFeedback = skillResult.leveledUp
            ? `你的 ${targetSkill} 升至 Lv.${skillResult.newLevel}！`
            : `你投入时间训练，技艺精进。获得 ${expGain} 经验。`;
        } catch {
          rewards = { skillExp: { skill: targetSkill, exp: expGain } };
          narrativeFeedback = `你投入时间训练 ${targetSkill}，技艺有所提升。获得 ${expGain} 经验。`;
        }
        break;

      case 'hunt_monsters':
        // 金币 +30~100
        const goldGain = Math.floor(Math.random() * 71) + 30;
        resources['gold'] = (resources['gold'] ?? 0) + goldGain;
        rewards = { resources: { gold: goldGain } };
        narrativeFeedback = `战斗激烈，你击退了敌人，获得了 ${goldGain} 金币。`;

        // 10%受伤风险
        if (Math.random() < 0.1) {
          success = true; // 受伤但成功
          narrativeFeedback += '（你在战斗中受了轻伤）';
        }
        break;

      case 'visit_npc':
        if (targetId) {
          const npc = await prisma.nPC.findUnique({ where: { id: targetId } });
          if (npc) {
            // 关系 +5~10
            const relationGain = Math.floor(Math.random() * 6) + 5;
            rewards = { relationship: { npcId: targetId, value: relationGain } };
            narrativeFeedback = `你拜访了${npc.name}，交流甚欢。关系提升 ${relationGain}。`;
          } else {
            narrativeFeedback = '你四处走动，与人攀谈，增长了见识。';
          }
        } else {
          narrativeFeedback = '你四处走动，与人攀谈，增长了见识。';
        }
        break;

      case 'work_job':
        // 金币 +30~50
        const workGold = Math.floor(Math.random() * 21) + 30;
        resources['gold'] = (resources['gold'] ?? 0) + workGold;
        rewards = { resources: { gold: workGold } };
        narrativeFeedback = `辛苦工作一天，收获了 ${workGold} 金币。`;
        break;

      case 'handle_event':
        // 需要有待处理事件
        if (targetId) {
          const event = await prisma.event.findFirst({
            where: { id: targetId, playerId, status: 'pending' },
          });
          if (event) {
            rewards = { eventId: targetId };
            narrativeFeedback = `你处理了"${event.title}"事件。`;
            // 更新事件状态为处理中（实际决策需要单独调用）
          } else {
            narrativeFeedback = '指定的事件不存在或已处理。';
          }
        }
        break;
    }

    // 更新玩家资源
    await prisma.player.update({
      where: { id: playerId },
      data: {
        actionPoints: player.actionPoints - apCost,
        resources: safeJsonStringify(resources),
      },
    });

    // 记录行动
    const gameAction = await prisma.gameAction.create({
      data: {
        playerId,
        actionType,
        apCost,
        parameters: safeJsonStringify(parameters ?? {}),
        rewards: safeJsonStringify(rewards),
        success,
        narrativeFeedback,
        gameDay,
      },
    });

    // 构建返回结果
    const result: ActionResult = {
      success,
      action: actionType as ActionType,
      apConsumed: apCost,
      apRemaining: player.actionPoints - apCost,
      rewards: {
        ...actionDef.rewards,
        ...(rewards as Record<string, unknown>),
      },
      narrativeFeedback,
      timestamp: gameAction.executedAt.toISOString(),
    };

    res.json(createSuccessResponse(result, requestId));
  } catch (err) {
    console.error('[Action Execute Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '执行行动失败', requestId, undefined, true));
  }
});

// GET /v1/actions/history - 获取行动历史
router.get('/history', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  const limit = Math.min(parseInt(req.query['limit'] as string) || 20, 100);
  const offset = parseInt(req.query['offset'] as string) || 0;

  try {
    const total = await prisma.gameAction.count({ where: { playerId } });
    const actions = await prisma.gameAction.findMany({
      where: { playerId },
      orderBy: { executedAt: 'desc' },
      take: limit,
      skip: offset,
    });

    res.json(createSuccessResponse({
      total,
      actions: actions.map(a => ({
        id: a.id,
        type: a.actionType,
        apCost: a.apCost,
        success: a.success,
        rewards: safeJsonParse<Record<string, unknown>>(a.rewards, {}),
        narrative: a.narrativeFeedback,
        gameDay: a.gameDay,
        executedAt: a.executedAt.toISOString(),
      })),
      pagination: { limit, offset, hasMore: offset + limit < total },
    }, requestId));
  } catch (err) {
    console.error('[Action History Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取行动历史失败', requestId, undefined, true));
  }
});

export default router;