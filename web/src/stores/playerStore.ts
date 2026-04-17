import { create } from 'zustand'
import { authApi, playerApi } from '../services'

/**
 * 玩家状态Store
 * 管理玩家完整状态：属性、技能、关系、资源
 */

// 阵营类型
export type Faction = 'canglong' | 'shuanglang' | 'jinque' | 'border'

// 关系等级
export type RelationshipLevel =
  | 'enemy'
  | 'hostile'
  | 'distrust'
  | 'neutral'
  | 'friendly'
  | 'respect'
  | 'admire'

// 阵营等级
export type FactionLevel = 'neutral' | 'friendly' | 'member' | 'officer' | 'leader'

// 出身类型
export type OriginType = 'merchant' | 'soldier' | 'scholar' | 'commoner' | 'noble'

// 出身配置
export interface OriginConfig {
  id: OriginType
  name: string
  description: string
  bonusAttributes: Partial<Record<string, number>>
  bonusSkills: string[]
  startingLocation: string
  startingResources: {
    gold: number
    influence: number
  }
}

// 十维属性
export interface PlayerAttributes {
  physique: number // 体魄
  agility: number // 敏捷
  wisdom: number // 智慧
  willpower: number // 意志
  perception: number // 感知
  charisma: number // 魅力
  fame: number // 名望
  infamy: number // 恶名
  luck: number // 幸运
}

// 简化玩家状态
export interface PlayerState {
  id: string | null
  name: string
  age: number
  origin: OriginType | null
  faction: Faction | null
  factionLevel: FactionLevel
  level: number
  experience: number
  attributes: PlayerAttributes
  resources: {
    gold: number
    influence: number
  }
  tags: string[]
  isNew: boolean
}

// Store状态
interface PlayerStoreState {
  player: PlayerState
  isCreating: boolean
  isLoading: boolean

  // 操作
  createCharacter: (data: {
    name: string
    age: number
    origin: OriginType
    faction: Faction
  }) => Promise<void>
  fetchStatus: () => Promise<void>
  updateAttributes: (attrs: Partial<PlayerAttributes>) => void
  updateResources: (resources: { gold?: number; influence?: number }) => void
  setFaction: (faction: Faction, level: FactionLevel) => void
  addExperience: (exp: number) => void
  addTag: (tag: string) => void
  removeTag: (tag: string) => void
}

// 出身配置表
export const originConfigs: OriginConfig[] = [
  {
    id: 'merchant',
    name: '商人之子',
    description: '出生在繁华的商业世家，从小耳濡目染商业之道。',
    bonusAttributes: { charisma: 10, perception: 10 },
    bonusSkills: ['trade', 'negotiation'],
    startingLocation: '金雀花城',
    startingResources: { gold: 200, influence: 30 },
  },
  {
    id: 'soldier',
    name: '军人后代',
    description: '父亲是帝国军官，从小接受严格的军事训练。',
    bonusAttributes: { physique: 15, agility: 10, willpower: 5 },
    bonusSkills: ['combat', 'strategy'],
    startingLocation: '铁壁关',
    startingResources: { gold: 50, influence: 20 },
  },
  {
    id: 'scholar',
    name: '书香门第',
    description: '家族世代藏书，自幼博览群书。',
    bonusAttributes: { wisdom: 15, perception: 10 },
    bonusSkills: ['intelligenceAnalysis', 'writing'],
    startingLocation: '帝都',
    startingResources: { gold: 100, influence: 25 },
  },
  {
    id: 'commoner',
    name: '平民出身',
    description: '普通的边境村民，自由成长，无拘无束。',
    bonusAttributes: { luck: 10 },
    bonusSkills: ['survival'],
    startingLocation: '暮光村',
    startingResources: { gold: 30, influence: 10 },
  },
  {
    id: 'noble',
    name: '贵族血脉',
    description: '拥有古老的贵族血统，虽然家族衰落但身份犹存。',
    bonusAttributes: { charisma: 10, fame: 10 },
    bonusSkills: ['etiquette', 'politics'],
    startingLocation: '帝都',
    startingResources: { gold: 150, influence: 40 },
  },
]

// 默认属性
const defaultAttributes: PlayerAttributes = {
  physique: 40,
  agility: 40,
  wisdom: 40,
  willpower: 40,
  perception: 40,
  charisma: 40,
  fame: 0,
  infamy: 0,
  luck: 50,
}

// 初始玩家状态
const initialPlayerState: PlayerState = {
  id: null,
  name: '',
  age: 18,
  origin: null,
  faction: null,
  factionLevel: 'neutral',
  level: 1,
  experience: 0,
  attributes: defaultAttributes,
  resources: {
    gold: 0,
    influence: 0,
  },
  tags: [],
  isNew: true,
}

export const usePlayerStore = create<PlayerStoreState>((set) => ({
  player: initialPlayerState,
  isCreating: false,
  isLoading: false,

  createCharacter: async (data) => {
    set({ isCreating: true })

    try {
      // 获取出身配置
      const originConfig = originConfigs.find((o) => o.id === data.origin)
      if (!originConfig) {
        set({ isCreating: false })
        return
      }

      // 调用后端API创建角色
      const response = await authApi.login('test', `user_${Date.now()}`, {
        name: data.name,
        startingFaction: data.faction,
      })

      if (response.data.success) {
        const { auth, player, newPlayerWelcome } = response.data.data

        // 保存token到localStorage
        localStorage.setItem('auth_token', auth.token)

        // 创建本地状态
        const newPlayer: PlayerState = {
          id: player.id,
          name: player.name,
          age: data.age,
          origin: data.origin,
          faction: player.faction as Faction,
          factionLevel: player.isNew ? 'friendly' : 'neutral',
          level: player.level,
          experience: 0,
          attributes: newPlayerWelcome?.initialAttributes || defaultAttributes,
          resources: originConfig.startingResources,
          tags: [`origin_${data.origin}`],
          isNew: player.isNew,
        }

        set({ player: newPlayer, isCreating: false })
      }
    } catch (error) {
      console.error('创建角色失败:', error)
      set({ isCreating: false })
    }
  },

  fetchStatus: async () => {
    set({ isLoading: true })
    try {
      const response = await playerApi.getStatus()
      if (response.data.success) {
        const data = response.data.data
        const player: PlayerState = {
          id: data.id,
          name: data.name,
          age: data.age,
          origin: null,
          faction: data.faction as Faction,
          factionLevel: data.factionLevel as FactionLevel,
          level: data.level,
          experience: data.experience,
          attributes: data.attributes,
          resources: data.resources,
          tags: data.tags,
          isNew: false,
        }
        set({ player, isLoading: false })
      }
    } catch (error) {
      console.error('获取玩家状态失败:', error)
      set({ isLoading: false })
    }
  },

  updateAttributes: (attrs) =>
    set((state) => ({
      player: {
        ...state.player,
        attributes: { ...state.player.attributes, ...attrs },
      },
    })),

  updateResources: (resources) =>
    set((state) => ({
      player: {
        ...state.player,
        resources: { ...state.player.resources, ...resources },
      },
    })),

  setFaction: (faction, level) =>
    set((state) => ({
      player: {
        ...state.player,
        faction,
        factionLevel: level,
      },
    })),

  addExperience: (exp) =>
    set((state) => ({
      player: {
        ...state.player,
        experience: state.player.experience + exp,
      },
    })),

  addTag: (tag) =>
    set((state) => ({
      player: {
        ...state.player,
        tags: [...state.player.tags, tag],
      },
    })),

  removeTag: (tag) =>
    set((state) => ({
      player: {
        ...state.player,
        tags: state.player.tags.filter((t) => t !== tag),
      },
    })),
}))
