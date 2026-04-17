import { create } from 'zustand'

/**
 * UI状态管理
 * 管理界面显示状态、加载状态、通知等
 */
interface UIState {
  // 加载状态
  isLoading: boolean
  loadingMessage: string | null
  // 当前视图模式
  viewMode: 'novel' | 'game'
  // 通知消息
  notifications: Array<{ id: string; type: 'success' | 'error' | 'info'; message: string }>
  // Actions
  setLoading: (loading: boolean, message?: string) => void
  setViewMode: (mode: 'novel' | 'game') => void
  addNotification: (notification: { type: 'success' | 'error' | 'info'; message: string }) => void
  removeNotification: (id: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  isLoading: false,
  loadingMessage: null,
  viewMode: 'novel',
  notifications: [],

  setLoading: (loading, message) => set({ isLoading: loading, loadingMessage: message || null }),
  setViewMode: (mode) => set({ viewMode: mode }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [...state.notifications, { ...notification, id: Date.now().toString() }],
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}))
