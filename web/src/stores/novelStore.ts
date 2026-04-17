import { create } from 'zustand'
import { worldApi } from '../services'

/**
 * 小说数据Store
 * 管理章节列表、阅读设置、书签等
 */

// 阅读设置
export interface ReadingSettings {
  fontSize: 'small' | 'medium' | 'large' | 'xlarge'
  theme: 'light' | 'dark' | 'sepia'
  lineHeight: number
  fontFamily: 'serif' | 'sans-serif'
}

// 章节结构
export interface Chapter {
  id: string
  number: number
  day: number
  title: string
  content: string
  sections: ChapterSection[]
  wordCount: number
  createdAt: string
}

export interface ChapterSection {
  id: string
  type: 'intro' | 'faction_news' | 'hero' | 'rumor' | 'player' | 'ending'
  title: string
  content: string
  faction?: 'canglong' | 'shuanglang' | 'jinque' | 'border'
}

// Store状态
interface NovelState {
  // 当前章节
  currentChapter: Chapter | null
  // 章节列表
  chapters: Chapter[]
  // 阅读设置
  settings: ReadingSettings
  // 书签列表
  bookmarks: string[]
  // 阅读进度
  readingProgress: Record<string, number>
  // 加载状态
  isLoading: boolean

  // 操作
  loadChapter: (day: number) => Promise<void>
  updateSettings: (settings: Partial<ReadingSettings>) => void
  addBookmark: (chapterId: string) => void
  removeBookmark: (chapterId: string) => void
  updateProgress: (chapterId: string, progress: number) => void
  getNextChapter: () => Chapter | null
  getPrevChapter: () => Chapter | null
  setChapters: (chapters: Chapter[]) => void
}

// 默认设置
const defaultSettings: ReadingSettings = {
  fontSize: 'medium',
  theme: 'light',
  lineHeight: 1.8,
  fontFamily: 'serif',
}

// Mock数据用于测试
const mockChapters: Chapter[] = [
  {
    id: 'chapter_1',
    number: 1,
    day: 1,
    title: '暮光初现',
    content: '',
    sections: [
      {
        id: 'section_intro',
        type: 'intro',
        title: '卷首语',
        content:
          '三国交界之处，暮光村静静矗立。这里是自由之地，也是纷争之源。\n\n当暮光洒下，金色、紫色、红色交织成一片独特的风景。而在这风景之下，无数命运的齿轮正在悄然转动...',
      },
      {
        id: 'section_canglong',
        type: 'faction_news',
        title: '苍龙帝国',
        faction: 'canglong',
        content:
          '帝都的夜色总是来得特别沉重。\n\n天枢府中，烛火摇曳，映照着墙上那幅先帝亲笔题写的"隐忍"二字。大皇子天枢端坐案前，手中握着一封密信——来自边境铁壁关的急报。',
      },
      {
        id: 'section_shuanglang',
        type: 'faction_news',
        title: '霜狼联邦',
        faction: 'shuanglang',
        content:
          '狼嚎谷的风从不停歇。\n\n那声音像远古狼王的呼唤，穿透两座雪山的阻隔，直抵人心。血狼部族的战士们三三两两走过红土广场，身上的伤疤是他们的勋章，眼中的战意是他们的灵魂。',
      },
      {
        id: 'section_ending',
        type: 'ending',
        title: '本回终',
        content: '下回预告：苍龙使节将抵达暮光村，命运的抉择即将开始...',
      },
    ],
    wordCount: 800,
    createdAt: '2026-04-01',
  },
  {
    id: 'chapter_2',
    number: 2,
    day: 2,
    title: '使节来访',
    content: '',
    sections: [
      {
        id: 'section_intro_2',
        type: 'intro',
        title: '卷首语',
        content:
          '清晨的暮光村，炊烟袅袅升起。\n\n龙使的车队缓缓驶入村口，带着苍龙帝国的威严与期望。',
      },
    ],
    wordCount: 600,
    createdAt: '2026-04-02',
  },
]

export const useNovelStore = create<NovelState>((set, get) => ({
  currentChapter: null,
  chapters: mockChapters,
  settings: defaultSettings,
  bookmarks: [],
  readingProgress: {},
  isLoading: false,

  loadChapter: async (day: number) => {
    set({ isLoading: true })
    try {
      // 调用后端API获取新闻
      const response = await worldApi.getNews()
      if (response.data.success) {
        const newsData = response.data.data
        // 将新闻数据转换为章节格式
        const sections: ChapterSection[] = [
          {
            id: 'section_intro',
            type: 'intro',
            title: '卷首语',
            content: `第${day}日，世界仍在运转。各方势力暗流涌动，命运的齿轮悄然转动...`,
          },
        ]

        // 添加各阵营新闻
        const factions = ['canglong', 'shuanglang', 'jinque', 'border'] as const
        const factionNames = {
          canglong: '苍龙帝国',
          shuanglang: '霜狼联邦',
          jinque: '金雀花王国',
          border: '边境联盟',
        }

        for (const faction of factions) {
          const factionNews = newsData.news?.[faction]
          if (factionNews?.headline) {
            sections.push({
              id: `section_${faction}`,
              type: 'faction_news',
              title: factionNames[faction],
              faction,
              content: `${factionNews.headline.title}\n\n${factionNews.headline.content}`,
            })
          }
        }

        sections.push({
          id: 'section_ending',
          type: 'ending',
          title: '本回终',
          content: '下回预告：新的故事即将展开...',
        })

        const chapter: Chapter = {
          id: `chapter_${day}`,
          number: day,
          day,
          title: `第${day}日 - 世界晨报`,
          content: '',
          sections,
          wordCount: sections.reduce((sum, s) => sum + s.content.length, 0),
          createdAt: newsData.date,
        }

        set({ currentChapter: chapter, isLoading: false })
      }
    } catch (error) {
      console.error('加载章节失败:', error)
      // 如果API失败，回退到mock数据
      const chapter = get().chapters.find((c) => c.day === day)
      if (chapter) {
        set({ currentChapter: chapter, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    }
  },

  updateSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    })),

  addBookmark: (chapterId) =>
    set((state) => ({
      bookmarks: [...state.bookmarks, chapterId],
    })),

  removeBookmark: (chapterId) =>
    set((state) => ({
      bookmarks: state.bookmarks.filter((id) => id !== chapterId),
    })),

  updateProgress: (chapterId, progress) =>
    set((state) => ({
      readingProgress: { ...state.readingProgress, [chapterId]: progress },
    })),

  getNextChapter: () => {
    const { currentChapter, chapters } = get()
    if (!currentChapter) return null
    const currentIndex = chapters.findIndex((c) => c.id === currentChapter.id)
    if (currentIndex < chapters.length - 1) {
      return chapters[currentIndex + 1]
    }
    return null
  },

  getPrevChapter: () => {
    const { currentChapter, chapters } = get()
    if (!currentChapter) return null
    const currentIndex = chapters.findIndex((c) => c.id === currentChapter.id)
    if (currentIndex > 0) {
      return chapters[currentIndex - 1]
    }
    return null
  },

  setChapters: (chapters) => set({ chapters }),
}))
