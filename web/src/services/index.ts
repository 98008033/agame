import apiClient from './api'

// 世界状态相关API
export const worldApi = {
  // 获取世界状态
  getState: (compact?: boolean) => apiClient.get('/world/state', { params: { compact } }),
  // 获取今日晨报
  getNews: () => apiClient.get('/world/news'),
  // 获取阵营详情
  getFaction: (factionId: string) => apiClient.get(`/world/factions/${factionId}`),
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
}

// 认证相关API
export const authApi = {
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

export default {
  world: worldApi,
  chapter: chapterApi,
  npc: npcApi,
  player: playerApi,
  auth: authApi,
  system: systemApi,
}