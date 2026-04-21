import { Router, type Request, type Response } from 'express';
import {
  getNationFactions,
  getFactionReputation,
  joinFaction,
  leaveFaction,
  modifyFactionReputation,
  getFactionMembers,
  getFactionDetail,
} from '../services/factionService.js';
import { createSuccessResponse, createErrorResponse, generateRequestId } from '../types/api.js';

const router = Router();

// GET /v1/factions/nation/:nationId - 获取某国家下的所有派系
router.get('/nation/:nationId', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  try {
    const result = await getNationFactions(req.params['nationId']!);
    res.json(createSuccessResponse(result, requestId));
  } catch (err) {
    console.error('[Faction List Error]', err);
    res.status(400).json(createErrorResponse('INVALID_REQUEST', (err as Error).message, requestId));
  }
});

// GET /v1/factions/:factionId - 获取派系详情（需登录）
router.get('/:factionId', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;
  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }
  try {
    const result = await getFactionDetail(playerId, req.params['factionId']!);
    res.json(createSuccessResponse(result, requestId));
  } catch (err) {
    console.error('[Faction Detail Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取派系详情失败', requestId));
  }
});

// GET /v1/factions/:factionId/reputation - 获取玩家在派系的声望（需登录）
router.get('/:factionId/reputation', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;
  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }
  try {
    const result = await getFactionReputation(playerId, req.params['factionId']!);
    res.json(createSuccessResponse(result, requestId));
  } catch (err) {
    console.error('[Faction Reputation Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取声望失败', requestId));
  }
});

// POST /v1/factions/:factionId/join - 加入派系（需登录）
router.post('/:factionId/join', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;
  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }
  try {
    const result = await joinFaction(playerId, req.params['factionId']!);
    res.json(createSuccessResponse(result, requestId));
  } catch (err) {
    console.error('[Join Faction Error]', err);
    res.status(400).json(createErrorResponse('INVALID_REQUEST', (err as Error).message, requestId));
  }
});

// POST /v1/factions/leave - 离开当前派系（需登录）
router.post('/leave', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;
  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }
  try {
    const result = await leaveFaction(playerId);
    res.json(createSuccessResponse(result, requestId));
  } catch (err) {
    console.error('[Leave Faction Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '离开派系失败', requestId));
  }
});

// POST /v1/factions/:factionId/interact - 修改声望（需登录）
router.post('/:factionId/interact', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;
  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }
  const { delta } = req.body;
  if (typeof delta !== 'number') {
    res.status(400).json(createErrorResponse('INVALID_REQUEST', '缺少delta参数', requestId));
    return;
  }
  try {
    const result = await modifyFactionReputation(playerId, req.params['factionId']!, delta);
    res.json(createSuccessResponse(result, requestId));
  } catch (err) {
    console.error('[Modify Reputation Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '修改声望失败', requestId));
  }
});

// GET /v1/factions/:factionId/members - 派系成员列表（需登录）
router.get('/:factionId/members', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  if (!req.playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }
  const page = parseInt(req.query['page'] as string) || 1;
  const limit = Math.min(parseInt(req.query['limit'] as string) || 20, 50);
  try {
    const result = await getFactionMembers(req.params['factionId']!, page, limit);
    res.json(createSuccessResponse(result, requestId));
  } catch (err) {
    console.error('[Faction Members Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取成员列表失败', requestId));
  }
});

export default router;
