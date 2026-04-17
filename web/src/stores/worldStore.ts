import { create } from 'zustand'
import { worldApi } from '../services'

/**
 * 世界状态Store
 * 管理世界时间、阵营状态、城市信息
 */

// 阵营类型
export type Faction = 'canglong' | 'shuanglang' | 'jinque' | 'border'

// 阵营信息
export interface FactionInfo {
  name: string
  leader: string
  military: number
  economy: number
  stability: number
  influence: number
  relations: Record<Faction, string>
}

// 城市信息
export interface CityInfo {
  id: string
  name: string
  faction: Faction
  population: number
  prosperity: number
}

// 世界时间
export interface WorldTime {
  day: number
  year: number
  month: number
  season: string
  phase: string
}

// 世界状态
export interface WorldState {
  time: WorldTime
  historyStage: string
  factions: Record<Faction, FactionInfo>
  cities: Record<string, CityInfo>
  activeEvents: Array<Record<string, unknown>>
}

// Store状态
interface WorldStoreState {
  worldState: WorldState | null
  isLoading: boolean
  error: string | null

  // 操作
  fetchWorldState: () => Promise<void>
  setWorldState: (state: WorldState) => void
}

export const useWorldStore = create<WorldStoreState>((set) => ({
  worldState: null,
  isLoading: false,
  error: null,

  fetchWorldState: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await worldApi.getState()
      if (response.data.success) {
        set({ worldState: response.data.data, isLoading: false })
      }
    } catch (error) {
      console.error('获取世界状态失败:', error)
      set({
        error: '获取世界状态失败',
        isLoading: false,
      })
    }
  },

  setWorldState: (state) => set({ worldState: state }),
}))