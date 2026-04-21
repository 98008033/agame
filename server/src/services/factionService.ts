import prisma from '../models/prisma.js';
import {
  InternalFaction,
  InternalFactionNames,
  InternalFactionDescriptions,
  NationFactions,
  getInternalFactionLevel,
  Nation,
  isValidNation,
} from '../types/game.js';
import { safeJsonParse, safeJsonStringify } from '../utils/index.js';

// 派系配置
interface FactionConfig {
  id: InternalFaction;
  name: string;
  description: string;
  icon: string;
  color: string;
}

function getFactionConfig(id: InternalFaction): FactionConfig {
  const iconMap: Record<InternalFaction, string> = {
    tianshu: '⚖️', pojun: '⚔️', wenqu: '📜',
    reform: '🔥', tradition: '❄️',
    noble: '👑', commoner: '🌾',
    merchant: '💰', mercenary: '⚔️', autonomy: '🏘️',
  };
  const colorMap: Record<InternalFaction, string> = {
    tianshu: '#8B4513', pojun: '#DC2626', wenqu: '#2563EB',
    reform: '#F59E0B', tradition: '#0EA5E9',
    noble: '#D97706', commoner: '#059669',
    merchant: '#CA8A04', mercenary: '#DC2626', autonomy: '#6B7280',
  };
  return {
    id,
    name: InternalFactionNames[id],
    description: InternalFactionDescriptions[id],
    icon: iconMap[id],
    color: colorMap[id],
  };
}

// 获取某国家下的所有派系
export function getNationFactions(nationId: string): {
  nationId: string;
  nationName: string;
  factions: Array<{ id: string; name: string; description: string; icon: string; color: string }>;
} {
  if (!isValidNation(nationId)) throw new Error('Invalid nation');
  const factionIds = NationFactions[nationId as Nation] as InternalFaction[];
  return {
    nationId,
    nationName: nationId,
    factions: factionIds.map(id => {
      const cfg = getFactionConfig(id);
      return { id: cfg.id, name: cfg.name, description: cfg.description, icon: cfg.icon, color: cfg.color };
    }),
  };
}

// 获取玩家在派系的声望
export async function getFactionReputation(playerId: string, factionId: string): Promise<{
  factionId: string;
  reputation: number;
  level: string;
  isJoined: boolean;
}> {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) throw new Error('Player not found');

  const rep = safeJsonParse<Record<string, number>>(player.internalReputation, {});
  const reputation = rep[factionId] ?? 0;
  const level = getInternalFactionLevel(reputation);
  const isJoined = player.internalFaction === factionId;

  return { factionId, reputation, level, isJoined };
}

// 加入派系
export async function joinFaction(playerId: string, factionId: string): Promise<{
  success: boolean;
  previousFaction: string | null;
}> {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) throw new Error('Player not found');
  if (!player.faction) throw new Error('Player must join a nation first');

  // 验证派系属于玩家的国家
  const nationFactions = NationFactions[player.faction as Nation] as InternalFaction[] | undefined;
  if (!nationFactions?.includes(factionId as InternalFaction)) {
    throw new Error('Faction not in player nation');
  }

  const previousFaction = player.internalFaction;
  await prisma.player.update({
    where: { id: playerId },
    data: {
      internalFaction: factionId,
      internalFactionLevel: 'neutral',
    },
  });

  return { success: true, previousFaction };
}

// 离开派系
export async function leaveFaction(playerId: string): Promise<{ success: boolean }> {
  await prisma.player.update({
    where: { id: playerId },
    data: { internalFaction: null },
  });
  return { success: true };
}

// 修改派系声望
export async function modifyFactionReputation(
  playerId: string,
  factionId: string,
  delta: number
): Promise<{ newReputation: number; newLevel: string }> {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) throw new Error('Player not found');

  const rep = safeJsonParse<Record<string, number>>(player.internalReputation, {});
  const current = rep[factionId] ?? 0;
  const newValue = Math.max(-100, Math.min(100, current + delta));
  rep[factionId] = newValue;

  await prisma.player.update({
    where: { id: playerId },
    data: { internalReputation: safeJsonStringify(rep) },
  });

  return { newReputation: newValue, newLevel: getInternalFactionLevel(newValue) };
}

// 获取派系成员列表
export async function getFactionMembers(
  factionId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ total: number; members: Array<{ id: string; name: string; level: number; reputation: number }> }> {
  const offset = (page - 1) * limit;

  const players = await prisma.player.findMany({
    where: { internalFaction: factionId },
    select: { id: true, name: true, level: true, internalReputation: true },
    skip: offset,
    take: limit,
    orderBy: { level: 'desc' },
  });

  const total = await prisma.player.count({ where: { internalFaction: factionId } });

  const members = players.map(p => {
    const rep = safeJsonParse<Record<string, number>>(p.internalReputation, {});
    return {
      id: p.id,
      name: p.name,
      level: p.level,
      reputation: rep[factionId] ?? 0,
    };
  });

  return { total, members };
}

// 获取派系详情（含玩家声望）
export async function getFactionDetail(
  playerId: string,
  factionId: string
): Promise<{
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  memberCount: number;
  playerReputation: number;
  playerLevel: string;
  isJoined: boolean;
}> {
  const config = getFactionConfig(factionId as InternalFaction);
  const memberCount = await prisma.player.count({ where: { internalFaction: factionId } });
  const { reputation: playerReputation, level: playerLevel, isJoined } = await getFactionReputation(playerId, factionId);

  return {
    id: config.id,
    name: config.name,
    description: config.description,
    icon: config.icon,
    color: config.color,
    memberCount,
    playerReputation,
    playerLevel,
    isJoined,
  };
}
