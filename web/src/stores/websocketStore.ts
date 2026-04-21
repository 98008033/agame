import { create } from 'zustand'

/**
 * WebSocket状态管理Store
 * 管理连接状态、消息队列、通知
 */

// WebSocket消息类型
export type WSMessageType =
  | 'connected'
  | 'disconnected'
  | 'event_new'
  | 'event_update'
  | 'world_update'
  | 'player_death'
  | 'notification'
  | 'agent_task'
  | 'ping'
  | 'pong'

// WebSocket消息结构
export interface WSMessage {
  type: WSMessageType
  data: unknown
  timestamp: string
}

// 通知类型
export interface WSNotification {
  id: string
  type: 'info' | 'warning' | 'danger' | 'success'
  title: string
  message: string
  duration?: number // ms, 0 = persistent
  timestamp: Date
}

// 连接状态
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'

interface WebSocketStoreState {
  // 连接状态
  status: ConnectionStatus
  reconnectAttempts: number
  lastConnectedAt: Date | null
  gaveUp: boolean // 达到最大重连次数后不再重试

  // 消息队列（最近100条）
  messages: WSMessage[]

  // 通知队列
  notifications: WSNotification[]

  // 操作
  setStatus: (status: ConnectionStatus) => void
  addMessage: (message: WSMessage) => void
  clearMessages: () => void
  addNotification: (notification: WSNotification) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  incrementReconnect: () => void
  resetReconnect: () => void
  setGaveUp: (gaveUp: boolean) => void
}

const MAX_MESSAGES = 100

export const useWebSocketStore = create<WebSocketStoreState>((set) => ({
  status: 'disconnected',
  reconnectAttempts: 0,
  lastConnectedAt: null,
  gaveUp: false,
  messages: [],
  notifications: [],

  setStatus: (status) => {
    set({ status })
    if (status === 'connected') {
      set({ lastConnectedAt: new Date(), reconnectAttempts: 0 })
    }
  },

  addMessage: (message) => {
    set((state) => {
      const messages = [...state.messages, message]
      // 保持最近100条
      if (messages.length > MAX_MESSAGES) {
        messages.splice(0, messages.length - MAX_MESSAGES)
      }
      return { messages }
    })
  },

  clearMessages: () => set({ messages: [] }),

  addNotification: (notification) => {
    set((state) => ({
      notifications: [...state.notifications, notification]
    }))
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter(n => n.id !== id)
    }))
  },

  clearNotifications: () => set({ notifications: [] }),

  incrementReconnect: () => {
    set((state) => ({ reconnectAttempts: state.reconnectAttempts + 1 }))
  },

  resetReconnect: () => set({ reconnectAttempts: 0, gaveUp: false }),

  setGaveUp: (gaveUp) => set({ gaveUp }),
}))

// 生成通知ID
export function generateNotificationId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

// 创建通知的辅助函数
export function createNotification(
  type: WSNotification['type'],
  title: string,
  message: string,
  duration: number = 5000
): WSNotification {
  return {
    id: generateNotificationId(),
    type,
    title,
    message,
    duration,
    timestamp: new Date(),
  }
}