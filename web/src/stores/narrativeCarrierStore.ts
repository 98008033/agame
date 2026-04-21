import { create } from 'zustand'
import { narrativeApi } from '../services'

/**
 * 叙事载体Store
 * 管理四种叙事形式：世界晨报、个人日志、人物传记、事件长卷
 */

// ============ 类型定义 ============

export type Faction = 'canglong' | 'shuanglang' | 'jinque' | 'border'

// 世界晨报
export interface NewsSection {
  id: string
  faction: Faction
  title: string
  headline: string
  content: string
  importance: 'minor' | 'normal' | 'major'
}

export interface MorningNews {
  day: number
  date: string
  sections: NewsSection[]
}

// 个人日志
export interface JournalEntry {
  id: string
  day: number
  eventType: string
  title: string
  description: string
  choiceMade: number
  choiceText: string
  narrativeFeedback: string
  consequences: {
    gold?: number
    influence?: number
    reputation?: Partial<Record<Faction, number>>
    newTags?: string[]
  }
  relatedNPCs: string[]
  createdAt: string
}

// 人物传记
export interface BiographyEntry {
  id: string
  title: string
  content: string
  year?: number
  importance: 'minor' | 'major' | 'legendary'
}

export interface RelationshipChange {
  npcId: string
  npcName: string
  change: number
  reason: string
  timestamp: number
}

export interface CharacterBiography {
  npcId: string
  npcName: string
  npcTitle: string
  npcFaction: Faction
  age: number
  status: 'alive' | 'dying' | 'dead' | 'exiled'
  biographyEntries: BiographyEntry[]
  relationshipHistory: RelationshipChange[]
}

// 事件长卷
export interface ScrollChoice {
  id: string
  index: number
  text: string
  description: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  isUnlocked: boolean
  skillRequirement?: {
    skillId: string
    skillName: string
    level: number
    reason: string
  }
  costs?: {
    gold?: number
    influence?: number
    description: string
  }
  rewards?: {
    gold?: number
    influence?: number
    description: string
  }
}

export interface ScrollChapter {
  id: string
  title: string
  content: string
  canIntervene: boolean
  interventionPoint?: {
    description: string
    choices: ScrollChoice[]
  }
}

export interface EventScroll {
  eventId: string
  eventTitle: string
  eventDescription: string
  importance: 'major' | 'critical'
  chapters: ScrollChapter[]
  currentChapterIndex: number
  playerInterventions: Array<{
    chapterIndex: number
    choiceIndex: number
    result: string
  }>
}

// ============ Store状态 ============

interface NarrativeCarrierState {
  // 世界晨报
  morningNews: MorningNews | null
  newsLoading: boolean

  // 个人日志
  journalEntries: JournalEntry[]
  journalLoading: boolean
  selectedEntryId: string | null

  // 人物传记
  currentBiography: CharacterBiography | null
  biographyLoading: boolean

  // 事件长卷
  currentScroll: EventScroll | null
  scrollLoading: boolean

  // 操作方法
  loadMorningNews: (day?: number) => Promise<void>
  loadJournal: (limit?: number) => Promise<void>
  selectJournalEntry: (entryId: string | null) => void
  loadBiography: (npcId: string) => Promise<void>
  loadEventScroll: (eventId: string) => Promise<void>
  scrollNextChapter: () => void
  scrollPrevChapter: () => void
  submitIntervention: (choiceIndex: number) => Promise<void>
  clearCurrentBiography: () => void
  clearCurrentScroll: () => void
}

// ============ Mock数据 ============

const mockMorningNews: MorningNews = {
  day: 1,
  date: '2026-04-20',
  sections: [
    {
      id: 'news_canglong',
      faction: 'canglong',
      title: '苍龙帝国',
      headline: '首辅秋实于昨夜病逝',
      content: '天都全城戒严。三位皇子尚未表态。据知情人士透露，秋实临终前召见了大皇子天枢。',
      importance: 'major',
    },
    {
      id: 'news_shuanglang',
      faction: 'shuanglang',
      title: '霜狼联邦',
      headline: '血狼部族拒绝缴纳本季矿税',
      content: '首领苍狼尚未回应。联邦议会将于霜牙城召开紧急会议。',
      importance: 'normal',
    },
    {
      id: 'news_jinque',
      faction: 'jinque',
      title: '金雀花王国',
      headline: '海军提督银帆截获走私船队',
      content: '船上货物价值十万金币。货主身份不明。',
      importance: 'normal',
    },
    {
      id: 'news_border',
      faction: 'border',
      title: '边境联盟',
      headline: '暮光村提议设立自由贸易区',
      content: '村长老根向谷主大会提议为三国使节设立"自由贸易区"。赤焰村村长烈焰公开反对。',
      importance: 'minor',
    },
  ],
}

const mockJournalEntries: JournalEntry[] = [
  {
    id: 'journal_001',
    day: 1,
    eventType: 'faction_invite',
    title: '苍龙使节的邀请',
    description: '天都城来的使节龙使来到暮光村，带来了大皇子天枢的亲笔信。',
    choiceMade: 0,
    choiceText: '接受邀请，效忠苍龙',
    narrativeFeedback: '你接过锦盒，苍龙纹章在手中沉甸甸的。龙使微微点头："明智的选择。天枢殿下会记住今日的。"',
    consequences: {
      gold: 100,
      reputation: { canglong: 30 },
      newTags: ['canglong_member'],
    },
    relatedNPCs: ['龙使'],
    createdAt: '2026-04-20T10:30:00Z',
  },
]

const mockBiography: CharacterBiography = {
  npcId: 'npc_tianshu',
  npcName: '天枢',
  npcTitle: '大皇子',
  npcFaction: 'canglong',
  age: 42,
  status: 'alive',
  biographyEntries: [
    {
      id: 'bio_001',
      title: '嫡长子',
      content: '天枢，苍龙帝国大皇子，生母为先皇后。自幼接受皇家教育，精通经史，性情沉稳。',
      year: 0,
      importance: 'major',
    },
    {
      id: 'bio_002',
      title: '夺嫡之争',
      content: '父皇病重后，天枢与二皇子破军、三皇子文曲形成三足鼎立。天枢有首辅秋实支持，但不得军心。',
      importance: 'major',
    },
  ],
  relationshipHistory: [
    {
      npcId: 'player',
      npcName: '你',
      change: 10,
      reason: '接受了苍龙使节的邀请',
      timestamp: 1,
    },
  ],
}

const mockEventScroll: EventScroll = {
  eventId: 'event_qiushi_death',
  eventTitle: '秋实之死',
  eventDescription: '苍龙帝国首辅秋实病逝，引发帝国权力格局剧烈变动。',
  importance: 'critical',
  chapters: [
    {
      id: 'scroll_ch1',
      title: '雨夜',
      content: '秋实走的那天晚上，天都在下雨。首辅府的大门紧闭了整整三天。第四天打开时，出来的是秋实的长子秋铭。他穿着孝服，眼睛红肿，但腰杆笔直。\n\n"家父遗言：首辅之位，交由朝廷定夺。"',
      canIntervene: false,
    },
    {
      id: 'scroll_ch2',
      title: '三子反应',
      content: '这句话传到天枢耳中时，他正在批阅奏折。他放下笔，沉默了很久。秋实是他最大的政治靠山。现在靠山没了。\n\n同一时间，破军在军营中大笑。"老头子终于走了。兵部该换人了。"',
      canIntervene: true,
      interventionPoint: {
        description: '你作为暮光村的外来者，有机会介入这场权力博弈...',
        choices: [
          {
            id: 'choice_0',
            index: 0,
            text: '秘密会见天枢，表达支持',
            description: '向天枢表明你的立场，获得他的信任',
            riskLevel: 'medium',
            isUnlocked: true,
          },
          {
            id: 'choice_1',
            index: 1,
            text: '向破军传递秋实临终密信的消息',
            description: '破军可能会利用这个信息',
            riskLevel: 'high',
            isUnlocked: true,
          },
          {
            id: 'choice_2',
            index: 2,
            text: '保持观望，不介入帝都事务',
            description: '安全但可能错失机会',
            riskLevel: 'low',
            isUnlocked: true,
          },
        ],
      },
    },
  ],
  currentChapterIndex: 0,
  playerInterventions: [],
}

// ============ Store实现 ============

export const useNarrativeCarrierStore = create<NarrativeCarrierState>((set, get) => ({
  morningNews: mockMorningNews,
  newsLoading: false,
  journalEntries: mockJournalEntries,
  journalLoading: false,
  selectedEntryId: null,
  currentBiography: null,
  biographyLoading: false,
  currentScroll: null,
  scrollLoading: false,

  loadMorningNews: async (day?: number) => {
    set({ newsLoading: true })
    try {
      const response = await narrativeApi.getMorningNews(day)
      if (response.data.success) {
        set({ morningNews: response.data.data, newsLoading: false })
      }
    } catch (error) {
      console.error('加载晨报失败:', error)
      // 使用mock数据
      set({ newsLoading: false })
    }
  },

  loadJournal: async (limit?: number) => {
    set({ journalLoading: true })
    try {
      const response = await narrativeApi.getJournal(limit)
      if (response.data.success) {
        set({ journalEntries: response.data.data.entries, journalLoading: false })
      }
    } catch (error) {
      console.error('加载日志失败:', error)
      set({ journalLoading: false })
    }
  },

  selectJournalEntry: (entryId) => set({ selectedEntryId: entryId }),

  loadBiography: async (npcId: string) => {
    set({ biographyLoading: true })
    try {
      const response = await narrativeApi.getBiography(npcId)
      if (response.data.success) {
        set({ currentBiography: response.data.data, biographyLoading: false })
      }
    } catch (error) {
      console.error('加载传记失败:', error)
      // 使用mock数据进行演示
      if (npcId === 'npc_tianshu') {
        set({ currentBiography: mockBiography, biographyLoading: false })
      } else {
        set({ biographyLoading: false })
      }
    }
  },

  loadEventScroll: async (eventId: string) => {
    set({ scrollLoading: true })
    try {
      const response = await narrativeApi.getEventScroll(eventId)
      if (response.data.success) {
        set({ currentScroll: response.data.data, scrollLoading: false })
      }
    } catch (error) {
      console.error('加载长卷失败:', error)
      // 使用mock数据进行演示
      if (eventId === 'event_qiushi_death') {
        set({ currentScroll: mockEventScroll, scrollLoading: false })
      } else {
        set({ scrollLoading: false })
      }
    }
  },

  scrollNextChapter: () => {
    const { currentScroll } = get()
    if (currentScroll && currentScroll.currentChapterIndex < currentScroll.chapters.length - 1) {
      set({
        currentScroll: {
          ...currentScroll,
          currentChapterIndex: currentScroll.currentChapterIndex + 1,
        },
      })
    }
  },

  scrollPrevChapter: () => {
    const { currentScroll } = get()
    if (currentScroll && currentScroll.currentChapterIndex > 0) {
      set({
        currentScroll: {
          ...currentScroll,
          currentChapterIndex: currentScroll.currentChapterIndex - 1,
        },
      })
    }
  },

  submitIntervention: async (choiceIndex: number) => {
    const { currentScroll } = get()
    if (!currentScroll) return

    try {
      const response = await narrativeApi.submitIntervention(
        currentScroll.eventId,
        currentScroll.currentChapterIndex,
        choiceIndex
      )
      if (response.data.success) {
        const result = response.data.data.result
        set({
          currentScroll: {
            ...currentScroll,
            playerInterventions: [
              ...currentScroll.playerInterventions,
              {
                chapterIndex: currentScroll.currentChapterIndex,
                choiceIndex,
                result,
              },
            ],
          },
        })
        // 自动推进到下一章
        get().scrollNextChapter()
      }
    } catch (error) {
      console.error('提交介入失败:', error)
      // 模拟成功推进
      get().scrollNextChapter()
    }
  },

  clearCurrentBiography: () => set({ currentBiography: null }),
  clearCurrentScroll: () => set({ currentScroll: null }),
}))