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

// 社会阶层
export type SocialClass = 'commoner' | 'gentry' | 'noble' | 'royalty'

// 技能类型
export type SkillCategory = 'strategy' | 'combat' | 'business' | 'general'

// 技能ID
export type SkillId =
  | 'intelligence_analysis' // 情报分析（谋略1-3）
  | 'political_control' // 政治操控（谋略4-6）
  | 'combat_technique' // 战斗技巧（武力1-3）
  | 'military_command' // 军事指挥（武力4-6）
  | 'business_trade' // 商业贸易（经营1-3）
  | 'industry_management' // 产业管理（经营4-6）
  | 'survival' // 生存能力（通用1-3）

// 技能定义
export interface SkillDefinition {
  id: SkillId
  name: string
  category: SkillCategory
  maxLevel: number
  prerequisite?: SkillId
  prerequisiteLevel?: number
  description: string
  icon: string
}

// 玩家技能状态
export interface PlayerSkill {
  skillId: SkillId
  level: number
  experience: number
  unlockedAt?: string
}

// 技能配置表
export const skillDefinitions: SkillDefinition[] = [
  {
    id: 'survival',
    name: '生存能力',
    category: 'general',
    maxLevel: 3,
    description: '基础生存技能，野外生存、基础交流',
    icon: '🏕️',
  },
  {
    id: 'intelligence_analysis',
    name: '情报分析',
    category: 'strategy',
    maxLevel: 3,
    description: '发现隐藏的叙事线索，收集情报',
    icon: '🔍',
  },
  {
    id: 'political_control',
    name: '政治操控',
    category: 'strategy',
    maxLevel: 6,
    prerequisite: 'intelligence_analysis',
    prerequisiteLevel: 3,
    description: '参与高层会议，影响决策，建立派系',
    icon: '🏛️',
  },
  {
    id: 'combat_technique',
    name: '战斗技巧',
    category: 'combat',
    maxLevel: 3,
    description: '街头格斗、护送任务、击退野兽',
    icon: '⚔️',
  },
  {
    id: 'military_command',
    name: '军事指挥',
    category: 'combat',
    maxLevel: 6,
    prerequisite: 'combat_technique',
    prerequisiteLevel: 3,
    description: '指挥小队作战，战术布局，攻城战',
    icon: '🎖️',
  },
  {
    id: 'business_trade',
    name: '商业贸易',
    category: 'business',
    maxLevel: 3,
    description: '小商贩、跑腿送货、简单买卖',
    icon: '💰',
  },
  {
    id: 'industry_management',
    name: '产业管理',
    category: 'business',
    maxLevel: 6,
    prerequisite: 'business_trade',
    prerequisiteLevel: 3,
    description: '管理矿山农场，雇佣工人，扩大生产',
    icon: '🏭',
  },
]

// 社会阶层配置
export const socialClassConfig: Record<SocialClass, { name: string; icon: string; requirements: { level: number; influence: number; factionLevel?: FactionLevel } }> = {
  commoner: { name: '平民', icon: '👤', requirements: { level: 1, influence: 0 } },
  gentry: { name: '绅士', icon: '🎩', requirements: { level: 5, influence: 50 } },
  noble: { name: '贵族', icon: '👑', requirements: { level: 10, influence: 200, factionLevel: 'member' } },
  royalty: { name: '王族', icon: '🏰', requirements: { level: 20, influence: 500, factionLevel: 'leader' } },
}

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
  socialClass: SocialClass
  level: number
  experience: number
  attributes: PlayerAttributes
  skills: PlayerSkill[]
  resources: {
    gold: number
    influence: number
    food?: number
    materials?: number
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
  setPlayer: (player: Partial<PlayerState>) => void
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
  // 技能操作
  addSkillExp: (skillId: SkillId, exp: number) => void
  unlockSkill: (skillId: SkillId) => void
  getSkillLevel: (skillId: SkillId) => number
  canUnlockSkill: (skillId: SkillId) => boolean
  // 社会阶层
  updateSocialClass: () => void
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
  socialClass: 'commoner',
  level: 1,
  experience: 0,
  attributes: defaultAttributes,
  skills: [{ skillId: 'survival', level: 1, experience: 0 }], // 默认拥有生存技能
  resources: {
    gold: 0,
    influence: 0,
    food: 0,
    materials: 0,
  },
  tags: [],
  isNew: true,
}

// 技能经验阈值（每级需要多少经验）
export const skillExpThresholds: Record<number, number> = {
  1: 0,
  2: 100,
  3: 300,
  4: 600,
  5: 1000,
  6: 1500,
}

export const usePlayerStore = create<PlayerStoreState>((set, get) => ({
  player: initialPlayerState,
  isCreating: false,
  isLoading: false,

  setPlayer: (playerData) =>
    set((state) => ({
      player: { ...state.player, ...playerData, isNew: false },
    })),

  createCharacter: async (data) => {
    set({ isCreating: true })

    try {
      // 获取出身配置
      const originConfig = originConfigs.find((o) => o.id === data.origin)
      if (!originConfig) {
        set({ isCreating: false })
        return
      }

      // 调用后端API创建角色（使用游客登录接口）
      const response = await authApi.guest(data.name, data.faction)

      if (response.data.success) {
        const { auth, player, newPlayerWelcome } = response.data.data

        // 保存token和userId到localStorage
        localStorage.setItem('auth_token', auth.token)
        localStorage.setItem('user_id', player.id)

        // 创建本地状态
        const newPlayer: PlayerState = {
          id: player.id,
          name: player.name,
          age: data.age,
          origin: data.origin,
          faction: player.faction as Faction,
          factionLevel: player.isNew ? 'friendly' : 'neutral',
          socialClass: 'commoner',
          level: player.level,
          experience: 0,
          attributes: newPlayerWelcome?.initialAttributes || defaultAttributes,
          skills: [{ skillId: 'survival', level: 1, experience: 0 }],
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
        // 兼容后端返回的resources结构
        const backendResources = data.resources || {}
        const player: PlayerState = {
          id: data.id,
          name: data.name,
          age: data.age,
          origin: null,
          faction: data.faction as Faction,
          factionLevel: data.factionLevel as FactionLevel,
          socialClass: data.socialClass || 'commoner',
          level: data.level,
          experience: data.experience,
          attributes: data.attributes,
          skills: data.skills || [{ skillId: 'survival', level: 1, experience: 0 }],
          resources: {
            gold: backendResources.gold || 0,
            influence: backendResources.influence || 10, // 默认影响力
            food: backendResources.food,
            materials: backendResources.materials,
          },
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

  // 技能操作
  addSkillExp: (skillId, exp) =>
    set((state) => {
      const skills = [...state.player.skills]
      const existingSkill = skills.find((s) => s.skillId === skillId)

      if (existingSkill) {
        existingSkill.experience += exp
        const definition = skillDefinitions.find((d) => d.id === skillId)
        if (definition) {
          const nextLevel = existingSkill.level + 1
          if (nextLevel <= definition.maxLevel && existingSkill.experience >= skillExpThresholds[nextLevel]) {
            existingSkill.level = nextLevel
          }
        }
      }
      return { player: { ...state.player, skills } }
    }),

  unlockSkill: (skillId) =>
    set((state) => {
      const skills = [...state.player.skills]
      if (!skills.find((s) => s.skillId === skillId)) {
        skills.push({ skillId, level: 1, experience: 0, unlockedAt: new Date().toISOString() })
      }
      return { player: { ...state.player, skills } }
    }),

  getSkillLevel: (skillId) => {
    const skill = get().player.skills.find((s) => s.skillId === skillId)
    return skill?.level || 0
  },

  canUnlockSkill: (skillId) => {
    const definition = skillDefinitions.find((d) => d.id === skillId)
    if (!definition) return false
    if (!definition.prerequisite) return true
    const prereqLevel = get().getSkillLevel(definition.prerequisite)
    return prereqLevel >= (definition.prerequisiteLevel || 1)
  },

  // 社会阶层更新
  updateSocialClass: () =>
    set((state) => {
      const { level, factionLevel } = state.player
      const influence = state.player.resources.influence
      let newClass: SocialClass = 'commoner'

      if (level >= 20 && influence >= 500 && (factionLevel === 'leader' || factionLevel === 'officer')) {
        newClass = 'royalty'
      } else if (level >= 10 && influence >= 200 && (factionLevel === 'member' || factionLevel === 'officer' || factionLevel === 'leader')) {
        newClass = 'noble'
      } else if (level >= 5 && influence >= 50) {
        newClass = 'gentry'
      }

      return { player: { ...state.player, socialClass: newClass } }
    }),
}))
