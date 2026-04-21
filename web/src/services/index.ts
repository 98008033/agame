import apiClient from './api'
import { adminClient } from './api'

// 世界状态相关API
export const worldApi = {
  // 获取世界状态
  getState: (compact?: boolean) => apiClient.get('/world/state', { params: { compact } }),
  // 获取今日晨报
  getNews: () => apiClient.get('/world/news'),
  // 获取阵营详情
  getFaction: (factionId: string) => apiClient.get(`/world/factions/${factionId}`),
  // 世界地图
  getWorldMap: () => apiClient.get('/world/map'),
  getCityDetail: (cityId: string) => apiClient.get(`/world/cities/${cityId}`),
}

// 章节/小说相关API (映射到world/news)
export const chapterApi = {
  // 获取今日晨报 (小说章节)
  getToday: () => apiClient.get('/world/news'),
  // 获取历史章节 - MVP暂不支持
  getHistory: (day: number) => apiClient.get(`/world/news?day=${day}`),
}

// NPC相关API
export const npcApi = {
  // 获取NPC列表
  getList: (faction?: string, role?: string) =>
    apiClient.get('/npcs', { params: { faction, role } }),
  // 获取NPC详情
  getDetail: (npcId: string) => apiClient.get(`/npcs/${npcId}`),
  // 与NPC互动
  interact: (npcId: string, type: string, message?: string) =>
    apiClient.post(`/npcs/${npcId}/interact`, { type, message }),
  // 获取NPC关系网络
  getRelationships: (npcId: string) => apiClient.get(`/npcs/${npcId}/relationships`),
}

// 玩家相关API
export const playerApi = {
  // 获取玩家状态
  getStatus: () => apiClient.get('/player/status'),
  // 获取玩家待处理事件
  getEvents: (status?: string, limit?: number, offset?: number) =>
    apiClient.get('/player/events', { params: { status, limit, offset } }),
  // 获取事件详情
  getEventDetail: (eventId: string) => apiClient.get(`/player/events/${eventId}`),
  // 提交决策
  submitDecision: (eventId: string, choiceIndex: number) =>
    apiClient.post('/player/decision', { eventId, choiceIndex }),
  // 获取决策历史
  getHistory: (limit?: number, offset?: number) =>
    apiClient.get('/player/history', { params: { limit, offset } }),
  // 遗产/继承相关
  getUnclaimedLegacies: () => apiClient.get('/player/legacy/unclaimed'),
  claimLegacy: (legacyId: string) => apiClient.post(`/player/legacy/${legacyId}/claim`),
  createLegacyRecord: (data?: { name?: string; level?: number; inheritanceType?: string }) =>
    apiClient.post('/player/legacy/create', data),
  // 技能树相关
  getSkillTree: () => apiClient.get('/player/skills/tree'),
  getSkillDetail: (skillId: string) => apiClient.get(`/player/skills/${skillId}`),
  unlockSkill: (skillId: string) => apiClient.post(`/player/skills/${skillId}/unlock`),
  getAvailableSkills: () => apiClient.get('/player/skills/available'),
}

// 事件系统API
export const eventsApi = {
  // 生成事件
  generate: (templateId?: string, category?: string) =>
    apiClient.post('/events/generate', { templateId, category }),
  // 提交决策
  decide: (eventId: string, choiceIndex: number) =>
    apiClient.post('/events/decide', { eventId, choiceIndex }),
  // 检查可触发事件
  checkTriggers: () => apiClient.post('/events/check-triggers'),
  // 获取事件模板列表
  getTemplates: (category?: string) =>
    apiClient.get('/events/templates', { params: { category } }),
}

// 认证相关API
export const authApi = {
  // 游客登录（用于角色创建）
  guest: (name?: string, startingFaction?: string) =>
    apiClient.post('/auth/guest', { name, startingFaction }),
  // 登录/注册
  login: (provider: string, identityToken: string, newPlayer?: { name: string; startingFaction?: string }) =>
    apiClient.post('/auth/login', { provider, identityToken, newPlayer }),
  // 注册
  register: (provider: string, identityToken: string, newPlayer: { name: string; startingFaction?: string }) =>
    apiClient.post('/auth/register', { provider, identityToken, newPlayer }),
  // 刷新token
  refresh: (refreshToken: string) =>
    apiClient.post('/auth/refresh', { refreshToken }),
}

// 系统状态API
export const systemApi = {
  // 获取系统健康状态
  getHealth: () => apiClient.get('/system/health'),
}

// 叙事载体相关API - 四种叙事形式
export const narrativeApi = {
  // 世界晨报 - 每日四阵营新闻
  getMorningNews: (day?: number) =>
    apiClient.get('/narrative/news', { params: { day } }),

  // 个人日志 - 玩家事件记录
  getJournal: (limit?: number, offset?: number) =>
    apiClient.get('/narrative/journal', { params: { limit, offset } }),
  getJournalEntry: (entryId: string) =>
    apiClient.get(`/narrative/journal/${entryId}`),

  // 人物传记 - NPC生平故事
  getBiography: (npcId: string) =>
    apiClient.get(`/narrative/biography/${npcId}`),
  getRelationshipHistory: (npcId: string, limit?: number) =>
    apiClient.get(`/narrative/biography/${npcId}/relationships`, { params: { limit } }),

  // 事件长卷 - 重大事件叙事
  getEventScroll: (eventId: string) =>
    apiClient.get(`/narrative/scroll/${eventId}`),
  getScrollChapter: (eventId: string, chapterIndex: number) =>
    apiClient.get(`/narrative/scroll/${eventId}/chapter/${chapterIndex}`),
  submitIntervention: (eventId: string, chapterIndex: number, choiceIndex: number) =>
    apiClient.post(`/narrative/scroll/${eventId}/intervene`, { chapterIndex, choiceIndex }),
}

// 行动系统API - 每日行动清单
export const actionApi = {
  // 获取可用行动列表
  getList: () => apiClient.get('/actions/list'),
  // 获取AP状态
  getStatus: () => apiClient.get('/actions/status'),
  // 执行行动
  execute: (actionType: string, targetId?: string, parameters?: Record<string, unknown>) =>
    apiClient.post('/actions/execute', { actionType, targetId, parameters }),
  // 获取行动历史
  getHistory: (limit?: number, offset?: number) =>
    apiClient.get('/actions/history', { params: { limit, offset } }),
}

// 管理后台API (使用独立客户端，发送 X-Admin-Secret header)
export const adminApi = {
  // LLM配置
  getLLMConfig: () => adminClient.get('/admin/llm-config'),
  updateLLMConfig: (data: { provider?: string; apiKey?: string; baseURL?: string; defaultModel?: string; defaultProvider?: string }) =>
    adminClient.post('/admin/llm-config', data),
  testLLM: (data: { apiKey: string; baseURL?: string; model?: string }) =>
    adminClient.post('/admin/llm-test', data),

  // 用户管理
  getUsers: (page?: number, limit?: number, search?: string) =>
    adminClient.get('/admin/users', { params: { page, limit, search } }),
  getUserDetail: (userId: string) => adminClient.get(`/admin/users/${userId}`),
  updateUser: (userId: string, data: Record<string, unknown>) =>
    adminClient.put(`/admin/users/${userId}`, data),
  deleteUser: (userId: string) =>
    adminClient.delete(`/admin/users/${userId}`),
  banUser: (userId: string, reason?: string) =>
    adminClient.post(`/admin/users/${userId}/ban`, { reason }),
  unbanUser: (userId: string) =>
    adminClient.post(`/admin/users/${userId}/unban`),

  // 充值管理
  recharge: (playerId: string, amount: number, reason?: string) =>
    adminClient.post('/admin/recharge', { playerId, amount, reason }),
  getRechargeLogs: (page?: number, limit?: number) =>
    adminClient.get('/admin/recharge-logs', { params: { page, limit } }),

  // 世界日志
  getAgentLogs: (page?: number, limit?: number, agentId?: string, status?: string) =>
    adminClient.get('/admin/logs/agent', { params: { page, limit, agentId, status } }),
  getWorldLogs: (page?: number, limit?: number) =>
    adminClient.get('/admin/logs/world', { params: { page, limit } }),

  // 系统监控
  getSystemStatus: () => adminClient.get('/admin/system/status'),
}

// NPC Dialog API - 对话系统
export const npcDialogApi = {
  getAvailable: () => apiClient.get('/npc-dialog/available'),
  getNPCInfo: (npcId: string) => apiClient.get(`/npc-dialog/${npcId}`),
  startDialog: (npcId: string) => apiClient.post(`/npc-dialog/${npcId}/start`),
  sendMessage: (npcId: string, message: string) => apiClient.post(`/npc-dialog/${npcId}/message`, { message }),
  getHistory: (npcId: string, limit?: number) => apiClient.get(`/npc-dialog/${npcId}/history`, { params: { limit } }),
  endDialog: (npcId: string) => apiClient.post(`/npc-dialog/${npcId}/end`),
}

// 派系系统API - 内部派系管理
export const factionApi = {
  getNationFactions: (nationId: string) => apiClient.get(`/factions/nation/${nationId}`),
  getFaction: (id: string) => apiClient.get(`/factions/${id}`),
  getFactionReputation: (factionId: string) => apiClient.get(`/factions/${factionId}/reputation`),
  joinFaction: (factionId: string) => apiClient.post(`/factions/${factionId}/join`),
  leaveFaction: () => apiClient.post('/factions/leave'),
  getFactionMembers: (factionId: string, page?: number) =>
    apiClient.get(`/factions/${factionId}/members`, { params: { page } }),
}

export default {
  world: worldApi,
  chapter: chapterApi,
  npc: npcApi,
  player: playerApi,
  events: eventsApi,
  auth: authApi,
  system: systemApi,
  narrative: narrativeApi,
  action: actionApi,
  npcDialog: npcDialogApi,
  faction: factionApi,
}