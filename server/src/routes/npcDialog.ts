// NPC Dialog Routes - POST/GET /v1/npc-dialog/*

import { Router, type Request, type Response } from 'express';
import { createSuccessResponse, createErrorResponse, generateRequestId } from '../types/api.js';
import {
  getAvailableNPCs,
  getNPCInfo,
  startDialog,
  sendMessage,
  getDialogHistory,
  endDialog,
} from '../services/npcDialogService.js';

const router = Router();

// GET /v1/npc-dialog/available - 获取可对话的NPC列表
router.get('/available', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  try {
    const npcs = await getAvailableNPCs(playerId);
    res.json(createSuccessResponse({ npcs, total: npcs.length }, requestId));
  } catch (err) {
    console.error('[NPC Dialog Available Error]', err);
    res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取可对话NPC列表失败', requestId, undefined, true));
  }
});

// GET /v1/npc-dialog/:npcId - 获取NPC详细信息
router.get('/:npcId', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;
  const npcId = req.params['npcId'];

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  if (!npcId) {
    res.status(400).json(createErrorResponse('INVALID_REQUEST', '缺少NPC ID', requestId));
    return;
  }

  try {
    const info = await getNPCInfo(npcId, playerId);
    res.json(createSuccessResponse({ npc: info }, requestId));
  } catch (err) {
    const message = (err as Error).message;
    if (message === 'NPC_NOT_FOUND') {
      res.status(404).json(createErrorResponse('NOT_FOUND', 'NPC不存在', requestId, { npcId }));
    } else if (message === 'NPC_DEAD') {
      res.status(400).json(createErrorResponse('INVALID_REQUEST', 'NPC已经死亡', requestId, { npcId }));
    } else {
      console.error('[NPC Dialog Info Error]', err);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取NPC信息失败', requestId, undefined, true));
    }
  }
});

// POST /v1/npc-dialog/:npcId/start - 开始对话
router.post('/:npcId/start', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;
  const npcId = req.params['npcId'];

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  if (!npcId) {
    res.status(400).json(createErrorResponse('INVALID_REQUEST', '缺少NPC ID', requestId));
    return;
  }

  try {
    const session = await startDialog(playerId, npcId);
    res.json(createSuccessResponse(session, requestId));
  } catch (err) {
    const message = (err as Error).message;
    if (message === 'NPC_NOT_FOUND') {
      res.status(404).json(createErrorResponse('NOT_FOUND', 'NPC不存在', requestId, { npcId }));
    } else if (message === 'NPC_DEAD') {
      res.status(400).json(createErrorResponse('INVALID_REQUEST', 'NPC已经死亡', requestId, { npcId }));
    } else if (message === 'PLAYER_NOT_FOUND') {
      res.status(404).json(createErrorResponse('NOT_FOUND', '玩家不存在', requestId));
    } else {
      console.error('[NPC Dialog Start Error]', err);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', '开始对话失败', requestId, undefined, true));
    }
  }
});

// POST /v1/npc-dialog/:npcId/message - 发送消息
router.post('/:npcId/message', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;
  const npcId = req.params['npcId'];

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  if (!npcId) {
    res.status(400).json(createErrorResponse('INVALID_REQUEST', '缺少NPC ID', requestId));
    return;
  }

  const { message } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    res.status(400).json(createErrorResponse('INVALID_REQUEST', '消息不能为空', requestId));
    return;
  }

  try {
    const result = await sendMessage(playerId, npcId, message);
    res.json(createSuccessResponse(result, requestId));
  } catch (err) {
    const message2 = (err as Error).message;
    if (message2 === 'NPC_NOT_FOUND') {
      res.status(404).json(createErrorResponse('NOT_FOUND', 'NPC不存在', requestId, { npcId }));
    } else if (message2 === 'NPC_DEAD') {
      res.status(400).json(createErrorResponse('INVALID_REQUEST', 'NPC已经死亡', requestId, { npcId }));
    } else if (message2 === 'PLAYER_NOT_FOUND') {
      res.status(404).json(createErrorResponse('NOT_FOUND', '玩家不存在', requestId));
    } else {
      console.error('[NPC Dialog Message Error]', err);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', '发送消息失败', requestId, undefined, true));
    }
  }
});

// GET /v1/npc-dialog/:npcId/history - 获取对话历史
router.get('/:npcId/history', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;
  const npcId = req.params['npcId'];

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  if (!npcId) {
    res.status(400).json(createErrorResponse('INVALID_REQUEST', '缺少NPC ID', requestId));
    return;
  }

  const limit = Math.min(parseInt(req.query['limit'] as string) || 50, 100);
  const offset = parseInt(req.query['offset'] as string) || 0;

  try {
    const history = await getDialogHistory(playerId, npcId, limit, offset);
    res.json(createSuccessResponse({
      ...history,
      pagination: { limit, offset, hasMore: offset + limit < history.total },
    }, requestId));
  } catch (err) {
    const message2 = (err as Error).message;
    if (message2 === 'NPC_NOT_FOUND') {
      res.status(404).json(createErrorResponse('NOT_FOUND', 'NPC不存在', requestId, { npcId }));
    } else {
      console.error('[NPC Dialog History Error]', err);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', '获取对话历史失败', requestId, undefined, true));
    }
  }
});

// POST /v1/npc-dialog/:npcId/end - 结束对话
router.post('/:npcId/end', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId ?? generateRequestId();
  const playerId = req.playerId;
  const npcId = req.params['npcId'];

  if (!playerId) {
    res.status(401).json(createErrorResponse('UNAUTHORIZED', '未授权访问', requestId));
    return;
  }

  if (!npcId) {
    res.status(400).json(createErrorResponse('INVALID_REQUEST', '缺少NPC ID', requestId));
    return;
  }

  try {
    const result = await endDialog(playerId, npcId);
    res.json(createSuccessResponse(result, requestId));
  } catch (err) {
    const message2 = (err as Error).message;
    if (message2 === 'NPC_NOT_FOUND') {
      res.status(404).json(createErrorResponse('NOT_FOUND', 'NPC不存在', requestId, { npcId }));
    } else {
      console.error('[NPC Dialog End Error]', err);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', '结束对话失败', requestId, undefined, true));
    }
  }
});

export default router;
