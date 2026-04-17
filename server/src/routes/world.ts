// World Routes - GET /v1/world/*

import { Router, type Request, type Response } from 'express';
import prisma from '../models/prisma.js';
import { createSuccessResponse, createErrorResponse, generateRequestId } from '../types/api.js';
import { isValidFaction, FactionNames } from '../types/game.js';
import { safeJsonParse } from '../utils/index.js';

const router = Router();

// GET /v1/world/news - 获取今日晨报
router.get('/news', async (_req: Request, res: Response): Promise<void> => {
  const requestId = generateRequestId();

  try {
    // 获取当前世界状态以确定游戏日
    const worldState = await prisma.worldState.findFirst({
      orderBy: { day: 'desc' },
    });

    if (!worldState) {
      res.status(404).json(createErrorResponse(
        'NOT_FOUND',
        '世界状态不存在',
        requestId
      ));
      return;
    }

    // 获取当日晨报
    const dailyNews = await prisma.dailyNews.findUnique({
      where: { day: worldState.day },
    });

    if (!dailyNews) {
      // 如果晨报不存在，返回空晨报（MVP阶段可能由Agent生成）
      res.json(createSuccessResponse({
        day: worldState.day,
        date: new Date().toISOString(),
        news: {
          canglong: {
            faction: 'canglong',
            headline: null,
            items: [],
            summary: '暂无新闻',
          },
          shuanglang: {
            faction: 'shuanglang',
            headline: null,
            items: [],
            summary: '暂无新闻',
          },
          jinque: {
            faction: 'jinque',
            headline: null,
            items: [],
            summary: '暂无新闻',
          },
          border: {
            faction: 'border',
            headline: null,
            items: [],
            summary: '暂无新闻',
          },
        },
        worldHeadline: null,
        playerNews: [],
        generatedAt: new Date().toISOString(),
      }, requestId));
      return;
    }

    res.json(createSuccessResponse({
      day: dailyNews.day,
      date: dailyNews.date,
      news: safeJsonParse<Record<string, unknown>>(dailyNews.news, {}),
      worldHeadline: dailyNews.worldHeadline ? safeJsonParse<Record<string, unknown>>(dailyNews.worldHeadline, {}) : null,
      playerNews: safeJsonParse<Array<Record<string, unknown>>>(dailyNews.playerNews, []),
      generatedAt: dailyNews.generatedAt.toISOString(),
    }, requestId));
  } catch (err) {
    console.error('[World News Error]', err);
    res.status(500).json(createErrorResponse(
      'INTERNAL_ERROR',
      '获取晨报失败',
      requestId,
      undefined,
      true
    ));
  }
});

// GET /v1/world/state - 获取世界状态
router.get('/state', async (req: Request, res: Response): Promise<void> => {
  const requestId = generateRequestId();
  const compact = req.query['compact'] === 'true';

  try {
    const worldState = await prisma.worldState.findFirst({
      orderBy: { day: 'desc' },
    });

    if (!worldState) {
      res.status(404).json(createErrorResponse(
        'NOT_FOUND',
        '世界状态不存在',
        requestId
      ));
      return;
    }

    const factionsData = safeJsonParse<Record<string, {
      name: string;
      leader: string;
      military: number;
      economy: number;
      stability: number;
      influence: number;
      relations: Record<string, string>;
    }>>(worldState.factions, {});

    const balanceData = safeJsonParse<Record<string, unknown>>(worldState.balance, {});
    const citiesData = safeJsonParse<Record<string, unknown>>(worldState.cities, {});
    const activeEventsData = safeJsonParse<Array<Record<string, unknown>>>(worldState.activeEvents, []);

    const response = {
      time: {
        day: worldState.day,
        year: worldState.year,
        month: worldState.month,
        season: worldState.season,
        phase: worldState.phase,
      },
      historyStage: worldState.historyStage,
      balance: balanceData,
      factions: Object.fromEntries(
        Object.entries(factionsData).map(([faction, data]) => [
          faction,
          {
            name: data.name ?? FactionNames[faction as keyof typeof FactionNames],
            leader: data.leader ?? '未知',
            military: data.military ?? 50,
            economy: data.economy ?? 50,
            stability: data.stability ?? 50,
            influence: data.influence ?? 50,
            relations: data.relations ?? {},
          },
        ])
      ),
      activeEvents: activeEventsData,
      cities: compact ? [] : citiesData,
    };

    res.json(createSuccessResponse(response, requestId));
  } catch (err) {
    console.error('[World State Error]', err);
    res.status(500).json(createErrorResponse(
      'INTERNAL_ERROR',
      '获取世界状态失败',
      requestId,
      undefined,
      true
    ));
  }
});

// GET /v1/world/factions/:faction - 获取阵营详情
router.get('/factions/:faction', async (req: Request, res: Response): Promise<void> => {
  const requestId = generateRequestId();
  const factionParam = req.params['faction'] ?? '';

  if (!isValidFaction(factionParam)) {
    res.status(400).json(createErrorResponse(
      'INVALID_REQUEST',
      '无效的阵营ID',
      requestId,
      { faction: factionParam }
    ));
    return;
  }

  try {
    const worldState = await prisma.worldState.findFirst({
      orderBy: { day: 'desc' },
    });

    if (!worldState) {
      res.status(404).json(createErrorResponse(
        'NOT_FOUND',
        '世界状态不存在',
        requestId
      ));
      return;
    }

    const factionsData = safeJsonParse<Record<string, unknown>>(worldState.factions, {});
    const factionData = factionsData[factionParam] as Record<string, unknown> | undefined;

    if (!factionData) {
      res.status(404).json(createErrorResponse(
        'NOT_FOUND',
        '阵营不存在',
        requestId,
        { faction: factionParam }
      ));
      return;
    }

    // MVP阶段返回基础信息
    res.json(createSuccessResponse({
      faction: factionParam,
      ...factionData,
    }, requestId));
  } catch (err) {
    console.error('[Faction Detail Error]', err);
    res.status(500).json(createErrorResponse(
      'INTERNAL_ERROR',
      '获取阵营信息失败',
      requestId,
      undefined,
      true
    ));
  }
});

export default router;