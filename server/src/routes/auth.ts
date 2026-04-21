// Auth Routes - POST /v1/auth/*

import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import prisma from '../models/prisma.js';
import { createSuccessResponse, createErrorResponse, generateRequestId } from '../types/api.js';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import {
  DEFAULT_PLAYER_ATTRIBUTES,
  DEFAULT_NATION_REPUTATION,
  DEFAULT_PLAYER_RESOURCES,
  DEFAULT_PLAYER_LOCATION,
  DEFAULT_SKILL_SET,
  isValidNation,
} from '../types/game.js';
import { safeJsonStringify } from '../utils/index.js';

const router = Router();
const SALT_ROUNDS = 10;

// 对所有auth路由应用限流
router.use(authRateLimiter);

// POST /v1/auth/register - 用户注册（用户名+密码）
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const requestId = generateRequestId();
  const { username, password, email, name, startingFaction } = req.body;

  // 验证必填参数
  if (!username || !password) {
    res.status(400).json(createErrorResponse(
      'INVALID_REQUEST',
      '缺少必要参数',
      requestId,
      { required: ['username', 'password'] }
    ));
    return;
  }

  // 验证密码长度
  if (password.length < 6) {
    res.status(400).json(createErrorResponse(
      'INVALID_REQUEST',
      '密码长度至少6位',
      requestId
    ));
    return;
  }

  try {
    // 检查用户名是否已存在
    const existingUser = await prisma.player.findUnique({
      where: { userId: username },
    });

    if (existingUser) {
      if (existingUser.banned) {
        res.status(403).json(createErrorResponse(
          'ACCOUNT_BANNED',
          '该账号已被禁止登录',
          requestId
        ));
        return;
      }
      res.status(409).json(createErrorResponse(
        'CONFLICT',
      '用户名已存在',
      requestId
      ));
      return;
    }

    // 检查邮箱是否已存在（如果提供了邮箱）
    if (email) {
      const existingEmail = await prisma.player.findUnique({
        where: { email },
      });
      if (existingEmail) {
        res.status(409).json(createErrorResponse(
          'CONFLICT',
          '邮箱已存在',
          requestId
        ));
        return;
      }
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // 创建玩家
    const playerId = `player_${uuidv4().substring(0, 8)}`;
    const playerName = name || username;
    const playerFaction = startingFaction && isValidNation(startingFaction)
      ? startingFaction
      : 'border';

    const initialLocation = {
      ...DEFAULT_PLAYER_LOCATION,
      faction: playerFaction,
    };

    const initialReputation = {
      ...DEFAULT_NATION_REPUTATION,
      [playerFaction]: 20,
    };

    const player = await prisma.player.create({
      data: {
        id: playerId,
        userId: username,
        name: playerName,
        age: 18,
        email: email || null,
        passwordHash,
        isGuest: false,
        faction: playerFaction,
        factionLevel: 'friendly',
        titles: safeJsonStringify(['暮光村居民']),
        level: 1,
        experience: 0,
        attributes: safeJsonStringify(DEFAULT_PLAYER_ATTRIBUTES),
        reputation: safeJsonStringify(initialReputation),
        skills: safeJsonStringify(DEFAULT_SKILL_SET),
        relationships: '{}',
        tags: '[]',
        resources: safeJsonStringify(DEFAULT_PLAYER_RESOURCES),
        location: safeJsonStringify(initialLocation),
      },
    });

    // 获取世界状态
    const worldState = await prisma.worldState.findFirst({
      orderBy: { day: 'desc' },
    });

    // 生成token
    const token = generateToken(player.id);
    const refreshToken = generateRefreshToken(player.id);

    res.json(createSuccessResponse({
      success: true,
      auth: {
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        refreshToken,
      },
      player: {
        id: player.id,
        name: player.name,
        isNew: true,
        faction: player.faction,
        level: player.level,
      },
      gameState: {
        currentDay: worldState?.day ?? 1,
        historyStage: worldState?.historyStage ?? 'era_power_struggle',
        pendingEventsCount: 0,
      },
      newPlayerWelcome: {
        startingLocation: '暮光村',
        initialAttributes: DEFAULT_PLAYER_ATTRIBUTES,
        initialSkills: DEFAULT_SKILL_SET,
        narrativeIntro: '你站在暮光村的小路上，晨光穿过稀薄的云层，照亮了这座边境小镇...',
      },
    }, requestId));
  } catch (err) {
    console.error('[Register Error]', err);
    res.status(500).json(createErrorResponse(
      'INTERNAL_ERROR',
      '注册失败',
      requestId,
      undefined,
      true
    ));
  }
});

// POST /v1/auth/login - 用户登录（用户名+密码）
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const requestId = generateRequestId();
  const { username, password } = req.body;

  // 验证必填参数
  if (!username || !password) {
    res.status(400).json(createErrorResponse(
      'INVALID_REQUEST',
      '缺少必要参数',
      requestId,
      { required: ['username', 'password'] }
    ));
    return;
  }

  try {
    // 查找用户
    const player = await prisma.player.findUnique({
      where: { userId: username },
    });

    if (!player || !player.passwordHash) {
      res.status(401).json(createErrorResponse(
        'UNAUTHORIZED',
        '用户名或密码错误',
        requestId
      ));
      return;
    }

    // 检查是否被禁止登录
    if (player.banned) {
      res.status(403).json(createErrorResponse(
        'ACCOUNT_BANNED',
        '该账号已被禁止登录',
        requestId
      ));
      return;
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, player.passwordHash);
    if (!isValid) {
      res.status(401).json(createErrorResponse(
        'UNAUTHORIZED',
        '用户名或密码错误',
        requestId
      ));
      return;
    }

    // 获取世界状态
    const worldState = await prisma.worldState.findFirst({
      orderBy: { day: 'desc' },
    });

    // 统计待处理事件
    const pendingEventsCount = await prisma.event.count({
      where: { playerId: player.id, status: 'pending' },
    });

    // 生成token
    const token = generateToken(player.id);
    const refreshToken = generateRefreshToken(player.id);

    res.json(createSuccessResponse({
      success: true,
      auth: {
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        refreshToken,
      },
      player: {
        id: player.id,
        name: player.name,
        isNew: false,
        faction: player.faction,
        level: player.level,
      },
      gameState: {
        currentDay: worldState?.day ?? 1,
        historyStage: worldState?.historyStage ?? 'era_power_struggle',
        pendingEventsCount,
      },
    }, requestId));
  } catch (err) {
    console.error('[Login Error]', err);
    res.status(500).json(createErrorResponse(
      'INTERNAL_ERROR',
      '登录失败',
      requestId,
      undefined,
      true
    ));
  }
});

// POST /v1/auth/guest - 游客登录（MVP简化模式）
router.post('/guest', async (req: Request, res: Response): Promise<void> => {
  const requestId = generateRequestId();
  const { name, startingFaction } = req.body;

  // 游客模式：允许不传name，使用默认名称
  const playerName = name || `旅行者_${Math.floor(Math.random() * 10000)}`;
  const playerFaction = startingFaction && isValidNation(startingFaction)
    ? startingFaction
    : 'border';

  try {
    // 生成唯一的游客ID
    const guestId = `guest_${uuidv4().substring(0, 8)}`;
    const playerId = `player_${uuidv4().substring(0, 8)}`;

    // 创建初始位置
    const initialLocation = {
      ...DEFAULT_PLAYER_LOCATION,
      faction: playerFaction,
    };

    // 创建初始声望
    const initialReputation = {
      ...DEFAULT_NATION_REPUTATION,
      [playerFaction]: 20,
    };

    const player = await prisma.player.create({
      data: {
        id: playerId,
        userId: guestId,
        name: playerName,
        age: 18,
        isGuest: true,
        faction: playerFaction,
        factionLevel: 'friendly',
        titles: safeJsonStringify(['暮光村居民']),
        level: 1,
        experience: 0,
        attributes: safeJsonStringify(DEFAULT_PLAYER_ATTRIBUTES),
        reputation: safeJsonStringify(initialReputation),
        skills: safeJsonStringify(DEFAULT_SKILL_SET),
        relationships: '{}',
        tags: '[]',
        resources: safeJsonStringify(DEFAULT_PLAYER_RESOURCES),
        location: safeJsonStringify(initialLocation),
      },
    });

    // 获取世界状态
    const worldState = await prisma.worldState.findFirst({
      orderBy: { day: 'desc' },
    });

    // 生成token
    const token = generateToken(player.id);
    const refreshToken = generateRefreshToken(player.id);

    res.json(createSuccessResponse({
      success: true,
      auth: {
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        refreshToken,
      },
      player: {
        id: player.id,
        name: player.name,
        isNew: true,
        faction: player.faction,
        level: player.level,
      },
      gameState: {
        currentDay: worldState?.day ?? 1,
        historyStage: worldState?.historyStage ?? 'era_power_struggle',
        pendingEventsCount: 0,
      },
      newPlayerWelcome: {
        startingLocation: '暮光村',
        initialAttributes: DEFAULT_PLAYER_ATTRIBUTES,
        initialSkills: DEFAULT_SKILL_SET,
        narrativeIntro: '你站在暮光村的小路上，晨光穿过稀薄的云层，照亮了这座边境小镇...',
      },
    }, requestId));
  } catch (err) {
    console.error('[Guest Login Error]', err);
    res.status(500).json(createErrorResponse(
      'INTERNAL_ERROR',
      '游客登录失败',
      requestId,
      undefined,
      true
    ));
  }
});

// POST /v1/auth/refresh - 刷新token
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const requestId = generateRequestId();
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json(createErrorResponse(
      'INVALID_REQUEST',
      '缺少刷新令牌',
      requestId
    ));
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      res.status(401).json(createErrorResponse(
        'UNAUTHORIZED',
        '无效的刷新令牌',
        requestId
      ));
      return;
    }

    // 验证玩家是否存在
    const player = await prisma.player.findUnique({
      where: { id: payload.playerId },
    });

    if (!player) {
      res.status(404).json(createErrorResponse(
        'NOT_FOUND',
        '玩家不存在',
        requestId
      ));
      return;
    }

    // 检查是否被禁止登录
    if (player.banned) {
      res.status(403).json(createErrorResponse(
        'ACCOUNT_BANNED',
        '该账号已被禁止登录',
        requestId
      ));
      return;
    }

    // 生成新token
    const newToken = generateToken(player.id);
    const newRefreshToken = generateRefreshToken(player.id);

    res.json(createSuccessResponse({
      success: true,
      auth: {
        token: newToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        refreshToken: newRefreshToken,
      },
    }, requestId));
  } catch (err) {
    console.error('[Refresh Error]', err);
    res.status(500).json(createErrorResponse(
      'INTERNAL_ERROR',
      '刷新令牌失败',
      requestId,
      undefined,
      true
    ));
  }
});

export default router;