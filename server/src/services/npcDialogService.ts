/**
 * NPC Dialog Service
 * 管理玩家与NPC的对话会话，包括对话生成、历史记录、关系上下文
 * 使用 DialogMessage 数据库表存储对话历史
 */

import prisma from '../models/prisma.js';
import { llmService } from '../services/llm/index.js';
import { safeJsonParse, safeJsonStringify } from '../utils/index.js';
import { getRelationshipLevel, type RelationshipLevel } from '../types/game.js';
import type { ChatMessage } from '../services/llm/types.js';

// ============================================
// Types
// ============================================

/** Legacy dialog message type (kept for backward compatibility) */
export interface DialogMessage {
  role: 'player' | 'npc';
  content: string;
  timestamp: string;
}

export interface DialogContext {
  npcId: string;
  playerId: string;
  messages: DialogMessage[];
  relationshipValue: number;
  npcMood: string;
  lastTopic: string;
}

export interface NPCDialogResponse {
  dialogue: string;
  tone: string;
  relationshipDelta: number;
  mood: string;
  memoryStored: boolean;
  contextUpdated: boolean;
}

/** Available NPC for dialog listing */
export interface AvailableNPC {
  id: string;
  name: string;
  age: number;
  gender: string;
  role: string;
  faction: string | null;
  factionPosition: string | null;
  relationshipValue: number;
  relationshipLevel: string;
  isAlive: boolean;
}

/** Detailed NPC info for dialog */
export interface NPCDialogInfo {
  id: string;
  name: string;
  age: number;
  gender: string;
  role: string;
  faction: string | null;
  factionPosition: string | null;
  personality: Record<string, number>;
  currentStatus: Record<string, unknown>;
  relationship: {
    value: number;
    level: string;
  };
}

/** Dialog session start result */
export interface DialogSession {
  success: boolean;
  sessionId: string;
  npc: {
    id: string;
    name: string;
  };
  openingMessage: string;
}

/** Single message response */
export interface DialogMessageResponse {
  success: boolean;
  npcResponse: string;
  relationshipChange: number;
}

/** Dialog history entry from database */
export interface DialogHistoryEntry {
  id: number;
  role: string;
  content: string;
  createdAt: string;
}

/** Dialog history result */
export interface DialogHistory {
  messages: DialogHistoryEntry[];
  total: number;
}

// ============================================
// Constants
// ============================================

const MAX_DIALOG_HISTORY = 10; // Keep last N messages in context
const RELATIONSHIP_TONE_MODIFIERS: Record<RelationshipLevel, string[]> = {
  enemy: ['冷漠', '敌视', '不耐烦'],
  hostile: ['警惕', '防备', '冷淡'],
  distrust: ['谨慎', '保留', '客气但疏远'],
  neutral: ['平静', '礼貌', '中立'],
  friendly: ['友好', '热情', '温和'],
  respect: ['尊重', '恭敬', '信任'],
  admire: ['敬佩', '亲如家人', '毫无保留'],
};

// ============================================
// Helper Functions
// ============================================

function getPlayerRelationshipValue(npcRelationships: string): number {
  try {
    const rels = JSON.parse(npcRelationships) as Record<string, unknown>;
    const players = rels['players'] as Record<string, number> | undefined;
    if (!players) return 0;
    const values = Object.values(players);
    return values.length > 0 ? Math.max(...values) : 0;
  } catch {
    return 0;
  }
}

function buildNPCPersonalityPrompt(personality: Record<string, number>): string {
  const traits: string[] = [];
  if (personality['ambition'] != null) {
    traits.push(`野心: ${personality['ambition'] > 60 ? '野心勃勃' : personality['ambition'] < 40 ? '淡泊名利' : '适度进取'}`);
  }
  if (personality['loyalty'] != null) {
    traits.push(`忠诚: ${personality['loyalty'] > 60 ? '忠心耿耿' : personality['loyalty'] < 40 ? '见风使舵' : '立场摇摆'}`);
  }
  if (personality['kindness'] != null) {
    traits.push(`善良: ${personality['kindness'] > 60 ? '心地善良' : personality['kindness'] < 40 ? '冷酷无情' : '善恶分明'}`);
  }
  if (personality['cunning'] != null) {
    traits.push(`狡诈: ${personality['cunning'] > 60 ? '老谋深算' : personality['cunning'] < 40 ? '直率坦诚' : '心思缜密'}`);
  }
  return traits.join('，') || '性格平凡';
}

function buildRelationshipDescription(_value: number, level: string): string {
  const descriptions: Record<string, string> = {
    enemy: '对你充满敌意',
    hostile: '对你怀有敌意',
    distrust: '对你充满戒备',
    neutral: '与你素不相识',
    friendly: '对你态度友善',
    respect: '对你颇为敬重',
    admire: '对你极为钦佩',
  };
  return descriptions[level] ?? '与你关系一般';
}

/**
 * 估算对话情感变化（简单启发式）
 */
function estimateSentimentChange(text: string): number {
  const positive = ['谢谢', '感谢', '好', '不错', '朋友', '信任', '帮助', '欢迎', '高兴', '敬佩'];
  const negative = ['滚', '讨厌', '恶心', '敌人', '背叛', '杀', '恨', '拒绝', '愤怒', '不屑'];

  let delta = 0;
  for (const word of positive) {
    if (text.includes(word)) delta += 2;
  }
  for (const word of negative) {
    if (text.includes(word)) delta -= 3;
  }

  // Base positive interaction bonus
  if (delta === 0) delta = 1;

  return Math.max(-10, Math.min(10, delta));
}

// ============================================
// Core Functions (Public API)
// ============================================

/**
 * 获取可与玩家对话的NPC列表
 */
export async function getAvailableNPCs(_playerId: string): Promise<AvailableNPC[]> {
  const npcs = await prisma.nPC.findMany({
    orderBy: [{ role: 'desc' }, { name: 'asc' }],
  });

  const availableNPCs: AvailableNPC[] = [];

  for (const npc of npcs) {
    const currentStatus = safeJsonParse<Record<string, unknown>>(npc.currentStatus, {});
    const isAlive = (currentStatus['isAlive'] as boolean) ?? true;

    if (!isAlive) continue;

    const relationshipValue = getPlayerRelationshipValue(npc.relationships);

    availableNPCs.push({
      id: npc.id,
      name: npc.name,
      age: npc.age,
      gender: npc.gender,
      role: npc.role,
      faction: npc.faction,
      factionPosition: npc.factionPosition,
      relationshipValue,
      relationshipLevel: getRelationshipLevel(relationshipValue),
      isAlive: true,
    });
  }

  return availableNPCs;
}

/**
 * 获取NPC详细信息，包括关系等级
 */
export async function getNPCInfo(npcId: string, _playerId: string): Promise<NPCDialogInfo> {
  const npc = await prisma.nPC.findUnique({
    where: { id: npcId },
  });

  if (!npc) {
    throw new Error('NPC_NOT_FOUND');
  }

  const currentStatus = safeJsonParse<Record<string, unknown>>(npc.currentStatus, {});
  const personality = safeJsonParse<Record<string, number>>(npc.personality, {});
  const isAlive = (currentStatus['isAlive'] as boolean) ?? true;

  if (!isAlive) {
    throw new Error('NPC_DEAD');
  }

  const relationshipValue = getPlayerRelationshipValue(npc.relationships);

  return {
    id: npc.id,
    name: npc.name,
    age: npc.age,
    gender: npc.gender,
    role: npc.role,
    faction: npc.faction,
    factionPosition: npc.factionPosition,
    personality,
    currentStatus,
    relationship: {
      value: relationshipValue,
      level: getRelationshipLevel(relationshipValue),
    },
  };
}

/**
 * 开始与NPC的对话会话，生成开场白
 */
export async function startDialog(playerId: string, npcId: string): Promise<DialogSession> {
  const npcInfo = await getNPCInfo(npcId, playerId);

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) {
    throw new Error('PLAYER_NOT_FOUND');
  }

  // Get recent dialog history for context
  const recentMessages = await prisma.dialogMessage.findMany({
    where: { playerId, npcId },
    orderBy: { createdAt: 'desc' },
    take: 6,
  });
  const historyContext = recentMessages.reverse().map(m =>
    m.role === 'player' ? `玩家说: ${m.content}` : `${npcInfo.name}说: ${m.content}`
  ).join('\n');

  const personalityDesc = buildNPCPersonalityPrompt(npcInfo.personality);
  const relationshipDesc = buildRelationshipDescription(npcInfo.relationship.value, npcInfo.relationship.level);

  const systemPrompt = `你是${npcInfo.name}，一个${npcInfo.age}岁的${npcInfo.gender}。
你是${npcInfo.faction ?? '自由人'}阵营的成员${npcInfo.factionPosition ? `，担任${npcInfo.factionPosition}职位` : ''}。
你的性格特点：${personalityDesc}。
你与玩家的关系：${relationshipDesc}（关系值: ${npcInfo.relationship.value}）。
请以该NPC的身份和语气回复玩家，保持角色一致性。回复应当简洁自然，符合你的性格和当前关系。`;

  const userPrompt = historyContext
    ? `玩家来找你交谈。以下是你们最近的对话：\n${historyContext}\n\n请用一句话开场白回应玩家的到来。`
    : `玩家第一次来找你交谈。请用一句话作为开场白，体现你的性格和对玩家的态度。`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const llmResponse = await llmService.generate({
    messages,
    temperature: 0.8,
    maxTokens: 256,
    agentTier: 'l4_npc',
  });

  const openingMessage = llmResponse.content.trim();

  await prisma.dialogMessage.create({
    data: {
      playerId,
      npcId,
      role: 'npc',
      content: openingMessage,
    },
  });

  return {
    success: true,
    sessionId: `${playerId}_${npcId}_${Date.now()}`,
    npc: { id: npcInfo.id, name: npcInfo.name },
    openingMessage,
  };
}

/**
 * 发送消息给NPC，获取LLM生成的回复
 */
export async function sendMessage(
  playerId: string,
  npcId: string,
  message: string
): Promise<DialogMessageResponse> {
  const npcInfo = await getNPCInfo(npcId, playerId);

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) {
    throw new Error('PLAYER_NOT_FOUND');
  }

  const recentMessages = await prisma.dialogMessage.findMany({
    where: { playerId, npcId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  const historyContext = recentMessages.reverse().map(m =>
    m.role === 'player' ? `玩家: ${m.content}` : `${npcInfo.name}: ${m.content}`
  ).join('\n');

  // Save player message
  await prisma.dialogMessage.create({
    data: {
      playerId,
      npcId,
      role: 'player',
      content: message.trim(),
    },
  });

  const personalityDesc = buildNPCPersonalityPrompt(npcInfo.personality);
  const relationshipDesc = buildRelationshipDescription(npcInfo.relationship.value, npcInfo.relationship.level);

  const systemPrompt = `你是${npcInfo.name}，一个${npcInfo.age}岁的${npcInfo.gender}。
你是${npcInfo.faction ?? '自由人'}阵营的成员${npcInfo.factionPosition ? `，担任${npcInfo.factionPosition}职位` : ''}。
你的性格特点：${personalityDesc}。
你与玩家的关系：${relationshipDesc}（关系值: ${npcInfo.relationship.value}）。
请以该NPC的身份和语气回复玩家，保持角色一致性。`;

  const userPrompt = historyContext
    ? `对话历史：\n${historyContext}\n\n玩家刚刚说: "${message.trim()}"\n\n请以${npcInfo.name}的身份回复。`
    : `玩家说: "${message.trim()}"\n\n请以${npcInfo.name}的身份回复。`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const llmResponse = await llmService.generate({
    messages,
    temperature: 0.8,
    maxTokens: 512,
    agentTier: 'l4_npc',
  });

  const npcResponse = llmResponse.content.trim();

  await prisma.dialogMessage.create({
    data: {
      playerId,
      npcId,
      role: 'npc',
      content: npcResponse,
    },
  });

  const relationshipChange = estimateSentimentChange(npcResponse);

  if (relationshipChange !== 0) {
    await updateNPCRelationship(npcId, playerId, relationshipChange);
  }

  return {
    success: true,
    npcResponse,
    relationshipChange,
  };
}

/**
 * 获取与特定NPC的对话历史
 */
export async function getDialogHistory(
  playerId: string,
  npcId: string,
  limit: number = 50,
  offset: number = 0
): Promise<DialogHistory> {
  const npc = await prisma.nPC.findUnique({ where: { id: npcId } });
  if (!npc) {
    throw new Error('NPC_NOT_FOUND');
  }

  const total = await prisma.dialogMessage.count({
    where: { playerId, npcId },
  });

  const messages = await prisma.dialogMessage.findMany({
    where: { playerId, npcId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  return {
    messages: messages.reverse().map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
    total,
  };
}

/**
 * 结束与NPC的对话会话
 * MVP: 对话历史持久存储，结束会话仅做确认
 */
export async function endDialog(_playerId: string, npcId: string): Promise<{ success: boolean }> {
  const npc = await prisma.nPC.findUnique({ where: { id: npcId } });
  if (!npc) {
    throw new Error('NPC_NOT_FOUND');
  }

  return { success: true };
}

// ============================================
// Legacy / Internal Functions
// ============================================

/**
 * 获取玩家与NPC的关系值 (legacy placeholder)
 */
export function getPlayerNpcRelationship(_playerId: string, _npcId: string): { value: number; level: RelationshipLevel } {
  return { value: 0, level: 'neutral' };
}

/**
 * 获取NPC对话上下文 (legacy - reads from NPC relationships JSON)
 */
export async function getDialogContext(playerId: string, npcId: string): Promise<DialogContext> {
  const npc = await prisma.nPC.findUnique({ where: { id: npcId } });
  if (!npc) {
    throw new Error('NPC not found');
  }

  const npcRelationships = safeJsonParse<Record<string, unknown>>(npc.relationships, {});
  const playerRelations = npcRelationships['players'] as Record<string, number> | undefined;
  const relationshipValue = playerRelations?.[playerId] ?? 0;

  const npcStatus = safeJsonParse<Record<string, unknown>>(npc.currentStatus, {});
  const mood = (npcStatus['mood'] as string) ?? 'neutral';

  const dialogHistory = npcRelationships['dialogHistory'] as DialogMessage[] | undefined;
  const recentMessages = (dialogHistory ?? []).slice(-MAX_DIALOG_HISTORY);
  const lastTopic = (npcStatus['lastTopic'] as string) ?? '';

  return {
    npcId,
    playerId,
    messages: recentMessages,
    relationshipValue,
    npcMood: mood,
    lastTopic,
  };
}

/**
 * 生成NPC对话响应（LLM驱动, legacy）
 */
export async function generateDialogResponse(
  context: DialogContext,
  playerMessage: string
): Promise<NPCDialogResponse> {
  const npc = await prisma.nPC.findUnique({ where: { id: context.npcId } });
  if (!npc) {
    throw new Error('NPC not found');
  }

  const personality = safeJsonParse<Record<string, number>>(npc.personality, {});
  const personalityDesc = Object.entries(personality)
    .map(([k, v]) => `${k}:${Math.round((v as number) / 10)}`)
    .join(', ');

  const toneOptions = RELATIONSHIP_TONE_MODIFIERS[getRelationshipLevel(context.relationshipValue)];
  const currentTone = toneOptions[Math.floor(Math.random() * toneOptions.length)] ?? 'neutral';

  const systemPrompt = `你是${npc.name}，一个${npc.faction || '自由'}阵营的NPC。
年龄: ${npc.age}, 类型: ${npc.type}, 职业/角色: ${npc.factionPosition || '普通'}
性格特征: ${personalityDesc || '未知'}
当前心情: ${context.npcMood}
你与对话者的关系值: ${context.relationshipValue} (-100到+100, ${currentTone})
${context.lastTopic ? `上一个话题: ${context.lastTopic}` : ''}

请用符合角色设定的语气和性格回应。回复要简洁自然，不超过3句话。
不要提到自己是AI或语言模型。`;

  const conversationHistory = context.messages.slice(-6).map(m =>
    m.role === 'player' ? `你: ${m.content}` : `${npc.name}: ${m.content}`
  ).join('\n');

  const fullPrompt = conversationHistory
    ? `${conversationHistory}\n你: ${playerMessage}`
    : playerMessage;

  try {
    const response = await llmService.generate({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: fullPrompt },
      ],
      maxTokens: 200,
      temperature: 0.8,
    });

    const relationshipDelta = estimateSentimentChange(response.content);

    return {
      dialogue: response.content.trim(),
      tone: currentTone,
      relationshipDelta,
      mood: context.npcMood,
      memoryStored: false,
      contextUpdated: false,
    };
  } catch (err) {
    console.error('[NPCDialog] LLM call failed, using fallback');
    return {
      dialogue: `${npc.name}沉默了片刻，没有回应。`,
      tone: 'neutral',
      relationshipDelta: 0,
      mood: context.npcMood,
      memoryStored: false,
      contextUpdated: false,
    };
  }
}

/**
 * 保存对话历史和更新关系 (legacy - writes to NPC relationships JSON)
 */
export async function saveDialogInteraction(
  playerId: string,
  npcId: string,
  playerMessage: string,
  response: NPCDialogResponse
): Promise<void> {
  const npc = await prisma.nPC.findUnique({ where: { id: npcId } });
  if (!npc) return;

  const npcRelationships = safeJsonParse<Record<string, unknown>>(npc.relationships, {});
  const npcStatus = safeJsonParse<Record<string, unknown>>(npc.currentStatus, {});

  const dialogHistory = npcRelationships['dialogHistory'] as DialogMessage[] | undefined;
  const updatedHistory: DialogMessage[] = dialogHistory ? [...dialogHistory] : [];
  updatedHistory.push({ role: 'player', content: playerMessage, timestamp: new Date().toISOString() });
  updatedHistory.push({ role: 'npc', content: response.dialogue, timestamp: new Date().toISOString() });

  if (updatedHistory.length > MAX_DIALOG_HISTORY * 2) {
    updatedHistory.splice(0, updatedHistory.length - MAX_DIALOG_HISTORY * 2);
  }

  const playerRelations = (npcRelationships['players'] as Record<string, number>) ?? {};
  const currentRel = playerRelations[playerId] ?? 0;
  const newRel = Math.max(-100, Math.min(100, currentRel + response.relationshipDelta));
  playerRelations[playerId] = newRel;

  npcStatus['mood'] = response.mood;
  npcStatus['lastInteraction'] = new Date().toISOString();
  npcStatus['interactionCount'] = ((npcStatus['interactionCount'] as number) ?? 0) + 1;

  await prisma.nPC.update({
    where: { id: npcId },
    data: {
      relationships: safeJsonStringify({ ...npcRelationships, players: playerRelations, dialogHistory: updatedHistory }),
      currentStatus: safeJsonStringify(npcStatus),
    },
  });

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (player) {
    const playerRelationships = safeJsonParse<Record<string, number>>(player.relationships, {});
    playerRelationships[npcId] = newRel;
    await prisma.player.update({
      where: { id: playerId },
      data: { relationships: safeJsonStringify(playerRelationships) },
    });
  }

  await prisma.gameAction.create({
    data: {
      playerId,
      actionType: 'npc_dialog',
      apCost: 0,
      parameters: safeJsonStringify({ npcId, message: playerMessage }),
      rewards: safeJsonStringify({ dialogue: response.dialogue, tone: response.tone, relationshipDelta: response.relationshipDelta }),
      narrativeFeedback: `${npc.name}: ${response.dialogue}`,
      gameDay: 0,
      success: true,
    },
  });
}

/**
 * 保存NPC记忆（重要对话摘要）
 */
export async function storeNPCMemory(
  npcId: string,
  memory: { event: string; importance: number; sentiment: number }
): Promise<void> {
  const npc = await prisma.nPC.findUnique({ where: { id: npcId } });
  if (!npc) return;

  const npcRelationships = safeJsonParse<Record<string, unknown>>(npc.relationships, {});
  const memories = npcRelationships['memories'] as Array<unknown> | undefined;
  const updatedMemories = memories ? [...memories] : [];

  updatedMemories.push({
    ...memory,
    timestamp: Date.now(),
  });

  const filtered = updatedMemories.filter(m => {
    const mem = m as Record<string, unknown>;
    return (mem['importance'] as number) >= 3;
  }).slice(-20);

  await prisma.nPC.update({
    where: { id: npcId },
    data: {
      relationships: safeJsonStringify({ ...npcRelationships, memories: filtered }),
    },
  });
}

/**
 * 获取NPC记忆
 */
export async function getNPCMemories(npcId: string, limit = 10): Promise<Array<Record<string, unknown>>> {
  const npc = await prisma.nPC.findUnique({ where: { id: npcId } });
  if (!npc) return [];

  const npcRelationships = safeJsonParse<Record<string, unknown>>(npc.relationships, {});
  const memories = npcRelationships['memories'] as Array<Record<string, unknown>> | undefined;

  return (memories ?? []).sort((a, b) => {
    const ta = (a['timestamp'] as number) ?? 0;
    const tb = (b['timestamp'] as number) ?? 0;
    return tb - ta;
  }).slice(0, limit);
}

// ============================================
// Internal Helpers
// ============================================

/**
 * 更新NPC与玩家的关系值
 */
async function updateNPCRelationship(npcId: string, playerId: string, delta: number): Promise<void> {
  const npc = await prisma.nPC.findUnique({ where: { id: npcId } });
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
    console.error(`[NPCDialogService] Failed to update relationship:`, err);
  }
}
