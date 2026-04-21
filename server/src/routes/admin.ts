// Admin Routes - Management Backend API
// All routes require admin authentication

import { Router, type Request, type Response } from 'express';
import prisma from '../models/prisma.js';
import { createSuccessResponse, createErrorResponse, generateRequestId } from '../types/api.js';
import { safeJsonParse, safeJsonStringify } from '../utils/index.js';
import { AGENT_TIER_CONFIGS } from '../services/llm/types.js';

const router = Router();

// ============================================
// 简化的管理员认证（MVP阶段使用固定密钥）
// ============================================

const ADMIN_SECRET = process.env['ADMIN_SECRET'] || 'admin_secret_key_mvp';

// 管理员认证中间件
function adminAuth(req: Request, res: Response, next: () => void): void {
  const authHeader = req.headers['authorization'];
  const adminToken = authHeader?.replace('Bearer ', '');

  if (!adminToken || adminToken !== ADMIN_SECRET) {
    res.status(401).json(createErrorResponse(
      'UNAUTHORIZED',
      '管理员认证失败',
      generateRequestId()
    ));
    return;
  }

  next();
}

// 应用管理员认证到所有路由
router.use(adminAuth);

// ============================================
// LLM配置管理
// ============================================

// GET /v1/admin/llm-config - 获取LLM配置
router.get('/llm-config', async (_req: Request, res: Response): Promise<void> => {
  const requestId = generateRequestId();

  try {
    const configs = await prisma.gameConfig.findMany({
      where: { key: { startsWith: 'llm_' } },
    });

    const llmConfig: Record<string, unknown> = {};
    for (const config of configs) {
      llmConfig[config.key.replace('llm_', '')] = safeJsonParse(config.value, {});
    }

    res.json(createSuccessResponse({
      configs: llmConfig,
      providers: ['openai', 'zhipu', 'qwen', 'ollama', 'local'],
      defaultProvider: llmConfig['default_provider'] || 'zhipu',
      agentTiers: {
        l1_world: AGENT_TIER_CONFIGS.l1_world,
        l2_nation: AGENT_TIER_CONFIGS.l2_nation,
        l3_city: AGENT_TIER_CONFIGS.l3_city,
        l4_npc: AGENT_TIER_CONFIGS.l4_npc,
      },
    }, requestId));
  } catch (err) {
    console.error('[Admin LLM Config Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取配置失败', requestId));
  }
});

// POST /v1/admin/llm-config - 更新LLM配置
router.post('/llm-config', async (req: Request, res: Response): Promise<void> => {
  const requestId = generateRequestId();
  const { provider, apiKey, baseURL, defaultModel } = req.body;

  try {
    // 更新或创建配置
    const updates = [];

    if (provider && apiKey) {
      updates.push(prisma.gameConfig.upsert({
        where: { key: `llm_${provider}_apiKey` },
        create: { key: `llm_${provider}_apiKey`, value: apiKey, description: `${provider} API密钥` },
        update: { value: apiKey },
      }));
    }

    if (provider && baseURL) {
      updates.push(prisma.gameConfig.upsert({
        where: { key: `llm_${provider}_baseURL` },
        create: { key: `llm_${provider}_baseURL`, value: baseURL, description: `${provider} API端点` },
        update: { value: baseURL },
      }));
    }

    if (provider && defaultModel) {
      updates.push(prisma.gameConfig.upsert({
        where: { key: `llm_${provider}_defaultModel` },
        create: { key: `llm_${provider}_defaultModel`, value: defaultModel, description: `${provider} 默认模型` },
        update: { value: defaultModel },
      }));
    }

    if (req.body['defaultProvider']) {
      updates.push(prisma.gameConfig.upsert({
        where: { key: 'llm_default_provider' },
        create: { key: 'llm_default_provider', value: req.body['defaultProvider'], description: '默认LLM供应商' },
        update: { value: req.body['defaultProvider'] },
      }));
    }

    await Promise.all(updates);

    res.json(createSuccessResponse({
      success: true,
      message: 'LLM配置已更新',
    }, requestId));
  } catch (err) {
    console.error('[Admin LLM Config Update Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '更新配置失败', requestId));
  }
});

// POST /v1/admin/llm-test - 测试LLM连接
router.post('/llm-test', async (req: Request, res: Response): Promise<void> => {
  const requestId = generateRequestId();
  const { apiKey, baseURL, model } = req.body;

  try {
    // OpenAI兼容格式测试
    const testURL = baseURL || 'https://api.openai.com/v1';
    const testEndpoint = `${testURL}/chat/completions`;

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      }),
    });

    if (response.ok) {
      res.json(createSuccessResponse({
        success: true,
        message: 'LLM连接测试成功',
        status: response.status,
      }, requestId));
    } else {
      const errorText = await response.text();
      res.json(createSuccessResponse({
        success: false,
        message: `LLM连接失败: ${response.status}`,
        error: errorText.slice(0, 200),
      }, requestId));
    }
  } catch (err) {
    console.error('[Admin LLM Test Error]', err);
    res.json(createSuccessResponse({
      success: false,
      message: '连接测试失败',
      error: String(err),
    }, requestId));
  }
});

// ============================================
// 用户管理
// ============================================

// GET /v1/admin/users - 获取用户列表
router.get('/users', async (req: Request, res: Response): Promise<void> => {
  const requestId = generateRequestId();
  const page = parseInt(req.query['page'] as string) || 1;
  const limit = Math.min(parseInt(req.query['limit'] as string) || 20, 100);
  const search = req.query['search'] as string;

  try {
    const where = search ? {
      OR: [
        { userId: { contains: search } },
        { name: { contains: search } },
        { email: { contains: search } },
      ],
    } : {};

    const total = await prisma.player.count({ where });
    const users = await prisma.player.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        isGuest: true,
        faction: true,
        level: true,
        createdAt: true,
        updatedAt: true,
        resources: true,
      },
    });

    const userList = users.map((u) => ({
      ...u,
      resources: safeJsonParse<Record<string, number>>(u.resources, {}),
    }));

    res.json(createSuccessResponse({
      users: userList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, requestId));
  } catch (err) {
    console.error('[Admin Users Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取用户列表失败', requestId));
  }
});

// GET /v1/admin/users/:userId - 获取用户详情
router.get('/users/:userId', async (req: Request, res: Response): Promise<void> => {
  const requestId = generateRequestId();
  const userId = req.params['userId'];

  try {
    const player = await prisma.player.findUnique({
      where: { id: userId },
    });

    if (!player) {
      res.status(404).json(createErrorResponse('NOT_FOUND', '用户不存在', requestId));
      return;
    }

    res.json(createSuccessResponse({
      player: {
        ...player,
        attributes: safeJsonParse<Record<string, number>>(player.attributes, {}),
        reputation: safeJsonParse<Record<string, number>>(player.reputation, {}),
        skills: safeJsonParse<Record<string, unknown>>(player.skills, {}),
        resources: safeJsonParse<Record<string, number>>(player.resources, {}),
        location: safeJsonParse<Record<string, unknown>>(player.location, {}),
        titles: safeJsonParse<string[]>(player.titles, []),
        tags: safeJsonParse<string[]>(player.tags, []),
      },
    }, requestId));
  } catch (err) {
    console.error('[Admin User Detail Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取用户详情失败', requestId));
  }
});

// PUT /v1/admin/users/:userId - 编辑用户数据
router.put('/users/:userId', async (req: Request, res: Response): Promise<void> => {
  const requestId = generateRequestId();
  const userId = req.params['userId'];
  const updates = req.body;

  try {
    const player = await prisma.player.findUnique({
      where: { id: userId },
    });

    if (!player) {
      res.status(404).json(createErrorResponse('NOT_FOUND', '用户不存在', requestId));
      return;
    }

    // 构建更新数据
    const data: Record<string, unknown> = {};

    if (updates['name']) data['name'] = updates['name'];
    if (updates['email']) data['email'] = updates['email'];
    if (updates['faction']) data['faction'] = updates['faction'];
    if (updates['level']) data['level'] = updates['level'];
    if (updates['experience']) data['experience'] = updates['experience'];

    // JSON字段更新
    if (updates['resources']) {
      data['resources'] = safeJsonStringify(updates['resources']);
    }
    if (updates['attributes']) {
      data['attributes'] = safeJsonStringify(updates['attributes']);
    }
    if (updates['reputation']) {
      data['reputation'] = safeJsonStringify(updates['reputation']);
    }

    await prisma.player.update({
      where: { id: userId },
      data,
    });

    res.json(createSuccessResponse({
      success: true,
      message: '用户数据已更新',
    }, requestId));
  } catch (err) {
    console.error('[Admin User Update Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '更新用户失败', requestId));
  }
});

// ============================================
// 用户删除 + 禁止登录
// ============================================

// DELETE /v1/admin/users/:userId - 删除用户
router.delete('/users/:userId', async (req: Request, res: Response): Promise<void> => {
  const requestId = generateRequestId();
  const userId = req.params['userId'];

  try {
    const player = await prisma.player.findUnique({
      where: { id: userId },
    });

    if (!player) {
      res.status(404).json(createErrorResponse('NOT_FOUND', '用户不存在', requestId));
      return;
    }

    // Prisma cascades will delete related events, decisions, game_actions
    await prisma.player.delete({ where: { id: userId } });

    res.json(createSuccessResponse({
      success: true,
      message: `用户 ${player.name} 已删除`,
    }, requestId));
  } catch (err) {
    console.error('[Admin Delete User Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '删除用户失败', requestId));
  }
});

// POST /v1/admin/users/:userId/ban - 禁止登录
router.post('/users/:userId/ban', async (req: Request, res: Response): Promise<void> => {
  const requestId = generateRequestId();
  const userId = req.params['userId'];

  try {
    const player = await prisma.player.findUnique({
      where: { id: userId },
    });

    if (!player) {
      res.status(404).json(createErrorResponse('NOT_FOUND', '用户不存在', requestId));
      return;
    }

    if (player.banned) {
      res.json(createSuccessResponse({
        success: true,
        message: `用户 ${player.name} 已被禁止登录`,
        alreadyBanned: true,
      }, requestId));
      return;
    }

    await prisma.player.update({
      where: { id: userId },
      data: { banned: true },
    });

    res.json(createSuccessResponse({
      success: true,
      message: `用户 ${player.name} 已被禁止登录`,
    }, requestId));
  } catch (err) {
    console.error('[Admin Ban User Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '禁止登录失败', requestId));
  }
});

// POST /v1/admin/users/:userId/unban - 解除禁止
router.post('/users/:userId/unban', async (req: Request, res: Response): Promise<void> => {
  const requestId = generateRequestId();
  const userId = req.params['userId'];

  try {
    const player = await prisma.player.findUnique({
      where: { id: userId },
    });

    if (!player) {
      res.status(404).json(createErrorResponse('NOT_FOUND', '用户不存在', requestId));
      return;
    }

    if (!player.banned) {
      res.json(createSuccessResponse({
        success: true,
        message: `用户 ${player.name} 未被禁止`,
      }, requestId));
      return;
    }

    await prisma.player.update({
      where: { id: userId },
      data: { banned: false },
    });

    res.json(createSuccessResponse({
      success: true,
      message: `用户 ${player.name} 已解除禁止`,
    }, requestId));
  } catch (err) {
    console.error('[Admin Unban User Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '解除禁止失败', requestId));
  }
});

// ============================================
// 充值管理
// ============================================

// POST /v1/admin/recharge - 添加金币
router.post('/recharge', async (req: Request, res: Response): Promise<void> => {
  const requestId = generateRequestId();
  const { playerId, amount, reason } = req.body;

  if (!playerId || !amount || amount <= 0) {
    res.status(400).json(createErrorResponse('INVALID_REQUEST', '参数无效', requestId));
    return;
  }

  try {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) {
      res.status(404).json(createErrorResponse('NOT_FOUND', '玩家不存在', requestId));
      return;
    }

    // 更新资源
    const currentResources = safeJsonParse<Record<string, number>>(player.resources, {});
    const newGold = (currentResources['gold'] || 0) + amount;

    await prisma.player.update({
      where: { id: playerId },
      data: {
        resources: safeJsonStringify({ ...currentResources, gold: newGold }),
      },
    });

    // 记录充值日志
    await prisma.gameAction.create({
      data: {
        playerId,
        actionType: 'admin_recharge',
        apCost: 0,
        parameters: safeJsonStringify({ amount, reason, admin: 'system' }),
        rewards: safeJsonStringify({ gold: amount }),
        narrativeFeedback: reason || '管理员充值',
        gameDay: 1,
      },
    });

    res.json(createSuccessResponse({
      success: true,
      message: `已为玩家添加${amount}金币`,
      newBalance: newGold,
    }, requestId));
  } catch (err) {
    console.error('[Admin Recharge Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '充值失败', requestId));
  }
});

// GET /v1/admin/recharge-logs - 查看充值记录
router.get('/recharge-logs', async (req: Request, res: Response): Promise<void> => {
  const requestId = generateRequestId();
  const page = parseInt(req.query['page'] as string) || 1;
  const limit = Math.min(parseInt(req.query['limit'] as string) || 20, 100);

  try {
    const total = await prisma.gameAction.count({
      where: { actionType: 'admin_recharge' },
    });

    const logs = await prisma.gameAction.findMany({
      where: { actionType: 'admin_recharge' },
      orderBy: { executedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { player: { select: { id: true, name: true, userId: true } } },
    });

    const rechargeLogs = logs.map((log) => ({
      id: log.id,
      playerId: log.playerId,
      playerName: log.player.name,
      playerUserId: log.player.userId,
      amount: safeJsonParse<Record<string, number>>(log.rewards, {}).gold || 0,
      reason: log.narrativeFeedback,
      executedAt: log.executedAt.toISOString(),
    }));

    res.json(createSuccessResponse({
      logs: rechargeLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, requestId));
  } catch (err) {
    console.error('[Admin Recharge Logs Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取充值记录失败', requestId));
  }
});

// ============================================
// 世界运行日志
// ============================================

// GET /v1/admin/logs/agent - Agent执行日志
router.get('/logs/agent', async (req: Request, res: Response): Promise<void> => {
  const requestId = generateRequestId();
  const page = parseInt(req.query['page'] as string) || 1;
  const limit = Math.min(parseInt(req.query['limit'] as string) || 20, 100);
  const agentId = req.query['agentId'] as string;
  const status = req.query['status'] as string;

  try {
    const where: Record<string, unknown> = {};
    if (agentId) where['agentId'] = agentId;
    if (status) where['status'] = status;

    const total = await prisma.agentTask.count({ where });

    const tasks = await prisma.agentTask.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const agentLogs = tasks.map((task) => ({
      id: task.id,
      agentId: task.agentId,
      taskType: task.taskType,
      targetId: task.targetId,
      status: task.status,
      input: safeJsonParse<Record<string, unknown>>(task.input, {}),
      output: safeJsonParse<Record<string, unknown>>(task.output || '{}', {}),
      startedAt: task.startedAt?.toISOString(),
      completedAt: task.completedAt?.toISOString(),
      createdAt: task.createdAt.toISOString(),
    }));

    res.json(createSuccessResponse({
      logs: agentLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, requestId));
  } catch (err) {
    console.error('[Admin Agent Logs Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取Agent日志失败', requestId));
  }
});

// GET /v1/admin/logs/world - 世界状态变化记录
router.get('/logs/world', async (req: Request, res: Response): Promise<void> => {
  const requestId = generateRequestId();
  const page = parseInt(req.query['page'] as string) || 1;
  const limit = Math.min(parseInt(req.query['limit'] as string) || 20, 100);

  try {
    const total = await prisma.worldState.count();

    const states = await prisma.worldState.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const worldLogs = states.map((state) => ({
      id: state.id,
      day: state.day,
      year: state.year,
      month: state.month,
      season: state.season,
      phase: state.phase,
      historyStage: state.historyStage,
      snapshotId: state.snapshotId,
      createdAt: state.createdAt.toISOString(),
    }));

    res.json(createSuccessResponse({
      logs: worldLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, requestId));
  } catch (err) {
    console.error('[Admin World Logs Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取世界日志失败', requestId));
  }
});

// ============================================
// 系统监控
// ============================================

// GET /v1/admin/system/status - 系统状态
router.get('/system/status', async (_req: Request, res: Response): Promise<void> => {
  const requestId = generateRequestId();

  try {
    // 统计数据
    const playerCount = await prisma.player.count();
    const guestCount = await prisma.player.count({ where: { isGuest: true } });
    const registeredCount = await prisma.player.count({ where: { isGuest: false } });
    const eventCount = await prisma.event.count();
    const pendingEvents = await prisma.event.count({ where: { status: 'pending' } });
    const worldStateCount = await prisma.worldState.count();
    const agentTaskCount = await prisma.agentTask.count();

    // 最新世界状态
    const latestWorld = await prisma.worldState.findFirst({
      orderBy: { day: 'desc' },
    });

    res.json(createSuccessResponse({
      database: {
        connected: true,
        players: playerCount,
        guests: guestCount,
        registered: registeredCount,
        events: eventCount,
        pendingEvents: pendingEvents,
        worldStates: worldStateCount,
        agentTasks: agentTaskCount,
      },
      world: latestWorld ? {
        currentDay: latestWorld.day,
        year: latestWorld.year,
        month: latestWorld.month,
        historyStage: latestWorld.historyStage,
      } : null,
      server: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
      },
    }, requestId));
  } catch (err) {
    console.error('[Admin System Status Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取系统状态失败', requestId));
  }
});

export default router;