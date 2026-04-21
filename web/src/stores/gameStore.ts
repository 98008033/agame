import { create } from 'zustand'
import { worldApi } from '../services'

/**
 * 游戏状态管理
 * 管理当前游戏进度
 */
interface GameState {
  currentDay: number
  historyStage: string
  fetchWorldTime: () => Promise<void>
}

export const useGameStore = create<GameState>((set) => ({
  currentDay: 1,
  historyStage: 'era_power_struggle',

  fetchWorldTime: async () => {
    try {
      const response = await worldApi.getState()
      if (response.data.success) {
        const { time, historyStage } = response.data.data
        set({
          currentDay: time.day,
          historyStage,
        })
      }
    } catch (error) {
      console.error('获取世界时间失败:', error)
    }
  },
}))
