import { create } from 'zustand'
import { playerApi } from '../services'

/**
 * 游戏事件Store
 * 管理玩家待处理事件、决策历史
 */

// 阵营类型
export type Faction = 'canglong' | 'shuanglang' | 'jinque' | 'border'

// 风险等级
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

// 事件类型
export type EventType =
  | 'faction_invite'
  | 'faction_mission'
  | 'npc_interaction'
  | 'world_event'
  | 'personal_event'

// 事件选择项
export interface EventChoice {
  id: string
  index: number
  text: string
  description: string
  // 技能需求
  skillRequirement?: {
    skillId: string
    skillName: string
    level: number
    reason: string
  }
  // 代价
  costs?: {
    gold?: number
    influence?: number
    reputation?: Partial<Record<Faction, number>>
    description: string
  }
  // 收益预览
  rewards?: {
    gold?: number
    influence?: number
    reputation?: Partial<Record<Faction, number>>
    items?: string[]
    description: string
  }
  // 风险等级
  riskLevel: RiskLevel
  // 是否可选择
  isUnlocked: boolean
  cannotChooseReason?: string
}

// 游戏事件
export interface GameEvent {
  id: string
  type: EventType
  source: 'chronos' | 'national' | 'npc' | 'player'
  faction?: Faction
  title: string
  description: string
  narrativeText: string
  // 选择项
  choices: EventChoice[]
  // 时间信息
  triggeredAt: number // 游戏日
  expiresAt?: number
  // 重要性
  importance: 'minor' | 'normal' | 'major' | 'critical'
  // 涉及NPC
  relatedNPCs: string[]
}

// 决策结果
export interface DecisionResult {
  eventId: string
  choiceIndex: number
  success: boolean
  narrativeFeedback: string
  consequences: {
    gold?: number
    influence?: number
    reputation?: Partial<Record<Faction, number>>
    newTags?: string[]
  }
  triggeredEvents?: string[]
}

// Store状态
interface EventState {
  // 当前活跃事件
  activeEvents: GameEvent[]
  // 当前选中事件（详情显示）
  currentEvent: GameEvent | null
  // 决策历史
  decisionHistory: DecisionResult[]
  // 加载状态
  isLoading: boolean
  // 当前处理中的事件ID
  processingEventId: string | null

  // 操作
  loadActiveEvents: () => Promise<void>
  setCurrentEvent: (event: GameEvent | null) => void
  makeDecision: (eventId: string, choiceIndex: number) => Promise<DecisionResult>
  setActiveEvents: (events: GameEvent[]) => void
}

// Mock数据用于测试
const mockEvents: GameEvent[] = [
  {
    id: 'event_001',
    type: 'faction_invite',
    source: 'npc',
    faction: 'canglong',
    title: '苍龙使节的邀请',
    description: '天都城来的使节龙使来到暮光村，带来了大皇子天枢的亲笔信。',
    narrativeText:
      '"阁下在边境的名声，天枢殿下已有耳闻。如蒙不弃，愿效犬马之劳，苍龙帝国当以上宾之礼相待。"使节留下一个锦盒，里面是一枚苍龙纹章和一百金币。',
    choices: [
      {
        id: 'choice_0',
        index: 0,
        text: '接受邀请，效忠苍龙',
        description: '成为苍龙阵营成员',
        rewards: {
          gold: 100,
          items: ['canglong_badge'],
          reputation: { canglong: 30 },
          description: '获得苍龙纹章、100金币、声望提升',
        },
        riskLevel: 'medium',
        isUnlocked: true,
      },
      {
        id: 'choice_1',
        index: 1,
        text: '婉言谢绝',
        description: '保持中立，继续观望',
        rewards: {
          gold: 50,
          description: '获得50金币谢礼',
        },
        costs: {
          reputation: { canglong: -5 },
          description: '苍龙略失望但无敌意',
        },
        riskLevel: 'low',
        isUnlocked: true,
      },
      {
        id: 'choice_2',
        index: 2,
        text: '拖延不决',
        description: '暂不表态，观望后续',
        costs: {
          description: '3日后必须做出决定',
        },
        riskLevel: 'low',
        isUnlocked: true,
      },
    ],
    triggeredAt: 1,
    importance: 'major',
    relatedNPCs: ['longshi'],
  },
  {
    id: 'event_002',
    type: 'npc_interaction',
    source: 'npc',
    title: '老根的考验',
    description: '暮光村村长老根找到你，提出了一个看似简单的问题。',
    narrativeText: '"年轻人，三国都想我们这块地。你站哪边？"老根的眼神清澈，却也带着某种深意。',
    choices: [
      {
        id: 'choice_0',
        index: 0,
        text: '我站暮光村这边',
        description: '宣誓守护边境自由',
        rewards: {
          reputation: { border: 20 },
          description: '获得边境联盟信任',
        },
        riskLevel: 'low',
        isUnlocked: true,
      },
      {
        id: 'choice_1',
        index: 1,
        text: '我...还在考虑',
        description: '保持模糊态度',
        riskLevel: 'low',
        isUnlocked: true,
      },
    ],
    triggeredAt: 1,
    importance: 'normal',
    relatedNPCs: ['laogen'],
  },
]

export const useEventStore = create<EventState>((set) => ({
  activeEvents: mockEvents,
  currentEvent: null,
  decisionHistory: [],
  isLoading: false,
  processingEventId: null,

  loadActiveEvents: async () => {
    set({ isLoading: true })
    try {
      const response = await playerApi.getEvents('pending', 20, 0)
      if (response.data.success) {
        const data = response.data.data
        // 将API返回的事件转换为GameEvent格式
        const events: GameEvent[] = data.events.map((e: {
          id: string;
          type: string;
          category: string;
          title: string;
          description: string;
          scope: string;
          choicesPreview: Array<{ index: number; label: string; description: string }>;
          createdAt: string;
          expiresAt?: string;
          importance: string;
        }) => ({
          id: e.id,
          type: e.type as EventType,
          source: 'chronos' as const,
          title: e.title,
          description: e.description,
          narrativeText: e.description,
          choices: e.choicesPreview.map((c) => ({
            id: `choice_${c.index}`,
            index: c.index,
            text: c.label,
            description: c.description,
            riskLevel: 'medium' as RiskLevel,
            isUnlocked: true,
          })),
          triggeredAt: 1,
          importance: e.importance as 'minor' | 'normal' | 'major' | 'critical',
          relatedNPCs: [],
        }))
        set({ activeEvents: events, isLoading: false })
      }
    } catch (error) {
      console.error('加载事件失败:', error)
      // 如果API失败，回退到mock数据
      set({ isLoading: false })
    }
  },

  setCurrentEvent: (event) => set({ currentEvent: event }),

  makeDecision: async (eventId, choiceIndex) => {
    set({ processingEventId: eventId })

    try {
      const response = await playerApi.submitDecision(eventId, choiceIndex)
      if (response.data.success) {
        const data = response.data.data
        const result: DecisionResult = {
          eventId,
          choiceIndex,
          success: true,
          narrativeFeedback: data.narrativeFeedback || '你做出了选择，命运之轮开始转动...',
          consequences: {
            gold: data.immediateConsequences?.changes?.gold,
            reputation: data.immediateConsequences?.changes?.reputation,
          },
          triggeredEvents: data.triggeredEvents,
        }

        set((state) => ({
          decisionHistory: [...state.decisionHistory, result],
          activeEvents: state.activeEvents.filter((e) => e.id !== eventId),
          currentEvent: null,
          processingEventId: null,
        }))

        return result
      }
    } catch (error) {
      console.error('提交决策失败:', error)
    }

    // 如果API失败，返回模拟结果
    const result: DecisionResult = {
      eventId,
      choiceIndex,
      success: true,
      narrativeFeedback: '你做出了选择，命运之轮开始转动...',
      consequences: {},
    }

    set((state) => ({
      decisionHistory: [...state.decisionHistory, result],
      activeEvents: state.activeEvents.filter((e) => e.id !== eventId),
      currentEvent: null,
      processingEventId: null,
    }))

    return result
  },

  setActiveEvents: (events) => set({ activeEvents: events }),
}))
