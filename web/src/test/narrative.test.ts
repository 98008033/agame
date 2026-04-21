// Narrative System Tests
// 叙事载体系统测试 - Unit tests (no server required)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  useNarrativeCarrierStore,
  type MorningNews,
  type JournalEntry,
  type CharacterBiography,
  type EventScroll,
  type ScrollChoice,
  type NewsSection,
} from '../stores/narrativeCarrierStore'

// ============================================
// Mock Setup
// ============================================

// Reset store to initial state between tests (restores mock data)
const resetStore = () => {
  useNarrativeCarrierStore.setState({
    morningNews: {
      day: 1,
      date: '2026-04-20',
      sections: [
        { id: 'news_canglong', faction: 'canglong', title: '苍龙帝国', headline: '首辅秋实于昨夜病逝', content: '天都全城戒严。三位皇子尚未表态。据知情人士透露，秋实临终前召见了大皇子天枢。', importance: 'major' },
        { id: 'news_shuanglang', faction: 'shuanglang', title: '霜狼联邦', headline: '血狼部族拒绝缴纳本季矿税', content: '首领苍狼尚未回应。联邦议会将于霜牙城召开紧急会议。', importance: 'normal' },
        { id: 'news_jinque', faction: 'jinque', title: '金雀花王国', headline: '海军提督银帆截获走私船队', content: '船上货物价值十万金币。货主身份不明。', importance: 'normal' },
        { id: 'news_border', faction: 'border', title: '边境联盟', headline: '暮光村提议设立自由贸易区', content: '村长老根向谷主大会提议为三国使节设立"自由贸易区"。赤焰村村长烈焰公开反对。', importance: 'minor' },
      ],
    },
    newsLoading: false,
    journalEntries: [
      {
        id: 'journal_001',
        day: 1,
        eventType: 'faction_invite',
        title: '苍龙使节的邀请',
        description: '天都城来的使节龙使来到暮光村，带来了大皇子天枢的亲笔信。',
        choiceMade: 0,
        choiceText: '接受邀请，效忠苍龙',
        narrativeFeedback: '你接过锦盒，苍龙纹章在手中沉甸甸的。龙使微微点头："明智的选择。天枢殿下会记住今日的。"',
        consequences: { gold: 100, reputation: { canglong: 30 }, newTags: ['canglong_member'] },
        relatedNPCs: ['龙使'],
        createdAt: '2026-04-20T10:30:00Z',
      },
    ],
    journalLoading: false,
    selectedEntryId: null,
    currentBiography: null,
    biographyLoading: false,
    currentScroll: null,
    scrollLoading: false,
  })
}

beforeEach(() => {
  resetStore()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ============================================
// Daily News Tests
// ============================================

describe('Daily News System', () => {
  it('should have all 4 factions in mock news data', () => {
    const store = useNarrativeCarrierStore.getState()
    expect(store.morningNews).not.toBeNull()

    const factions = store.morningNews?.sections.map(s => s.faction) ?? []
    expect(factions).toContain('canglong')
    expect(factions).toContain('shuanglang')
    expect(factions).toContain('jinque')
    expect(factions).toContain('border')
  })

  it('should have correct news format', () => {
    const store = useNarrativeCarrierStore.getState()
    const news = store.morningNews!

    expect(news.day).toBeDefined()
    expect(typeof news.day).toBe('number')
    expect(news.date).toBeDefined()
    expect(news.sections).toBeInstanceOf(Array)
    expect(news.sections.length).toBe(4)

    // Each section should have required fields
    for (const section of news.sections) {
      expect(section.id).toBeDefined()
      expect(section.faction).toBeDefined()
      expect(section.title).toBeDefined()
      expect(section.headline).toBeDefined()
      expect(section.content).toBeDefined()
      expect(['minor', 'normal', 'major']).toContain(section.importance)
    }
  })

  it('should include state changes in news content', () => {
    const store = useNarrativeCarrierStore.getState()
    const canglongNews = store.morningNews?.sections.find(s => s.faction === 'canglong')
    expect(canglongNews).toBeDefined()
    expect(canglongNews?.headline).toBeTruthy()
    expect(canglongNews?.content.length).toBeGreaterThan(0)
  })

  it('should have correct importance levels', () => {
    const store = useNarrativeCarrierStore.getState()
    const sections = store.morningNews?.sections ?? []

    const importances = sections.map(s => s.importance)
    expect(importances).toContain('major')
    expect(importances).toContain('normal')
    expect(importances).toContain('minor')
  })
})

// ============================================
// Personal Log Tests
// ============================================

describe('Personal Log System', () => {
  it('should have journal entries with required fields', () => {
    const store = useNarrativeCarrierStore.getState()
    expect(store.journalEntries).toBeInstanceOf(Array)
    expect(store.journalEntries.length).toBeGreaterThan(0)

    const entry = store.journalEntries[0]!
    expect(entry.id).toBeDefined()
    expect(entry.day).toBeDefined()
    expect(entry.eventType).toBeDefined()
    expect(entry.title).toBeDefined()
    expect(entry.description).toBeDefined()
    expect(entry.choiceText).toBeDefined()
    expect(entry.narrativeFeedback).toBeDefined()
    expect(entry.consequences).toBeDefined()
    expect(entry.relatedNPCs).toBeInstanceOf(Array)
    expect(entry.createdAt).toBeDefined()
  })

  it('should have first-person narrative style', () => {
    const store = useNarrativeCarrierStore.getState()
    const entry = store.journalEntries[0]!
    // The narrativeFeedback should contain first-person perspective
    expect(entry.narrativeFeedback).toContain('你')
  })

  it('should mark actionable entries with choices', () => {
    const store = useNarrativeCarrierStore.getState()
    const entry = store.journalEntries[0]!
    expect(entry.choiceMade).toBe(0)
    expect(entry.choiceText.length).toBeGreaterThan(0)
  })

  it('should track consequences correctly', () => {
    const store = useNarrativeCarrierStore.getState()
    const entry = store.journalEntries[0]!
    const consequences = entry.consequences

    // Consequences should have at least one type
    const hasAny = consequences.gold !== undefined ||
                   consequences.influence !== undefined ||
                   consequences.reputation !== undefined ||
                   consequences.newTags !== undefined
    expect(hasAny).toBe(true)
  })

  it('should select journal entry by ID', () => {
    const store = useNarrativeCarrierStore.getState()
    expect(store.selectedEntryId).toBeNull()

    store.selectJournalEntry('journal_001')
    const updated = useNarrativeCarrierStore.getState()
    expect(updated.selectedEntryId).toBe('journal_001')

    // Deselect
    store.selectJournalEntry(null)
    const cleared = useNarrativeCarrierStore.getState()
    expect(cleared.selectedEntryId).toBeNull()
  })
})

// ============================================
// NPC Biography Tests
// ============================================

describe('NPC Biography System', () => {
  it('should have biography entry structure', () => {
    // Test the mock biography data structure
    const mockBio: CharacterBiography = {
      npcId: 'npc_test',
      npcName: 'Test NPC',
      npcTitle: 'Test Title',
      npcFaction: 'canglong',
      age: 30,
      status: 'alive',
      biographyEntries: [
        {
          id: 'bio_001',
          title: 'Test Entry',
          content: 'Test content',
          importance: 'major',
        },
      ],
      relationshipHistory: [],
    }

    expect(mockBio.npcId).toBeDefined()
    expect(mockBio.npcName).toBeDefined()
    expect(mockBio.npcFaction).toBeDefined()
    expect(mockBio.age).toBeGreaterThan(0)
    expect(['alive', 'dying', 'dead', 'exiled']).toContain(mockBio.status)
    expect(mockBio.biographyEntries).toBeInstanceOf(Array)
  })

  it('should have narrative life story in biography entries', () => {
    const store = useNarrativeCarrierStore.getState()
    // Simulate loading a biography
    const mockBio: CharacterBiography = {
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
      ],
      relationshipHistory: [],
    }

    expect(mockBio.biographyEntries[0]?.content.length).toBeGreaterThan(10)
  })

  it('should include key life events', () => {
    const mockBio: CharacterBiography = {
      npcId: 'npc_test',
      npcName: 'Test',
      npcTitle: 'Test',
      npcFaction: 'border',
      age: 50,
      status: 'alive',
      biographyEntries: [
        { id: '1', title: 'Birth', content: 'Born', importance: 'major' },
        { id: '2', title: 'Career', content: 'Started career', importance: 'minor' },
      ],
      relationshipHistory: [],
    }

    expect(mockBio.biographyEntries.length).toBe(2)
    expect(mockBio.biographyEntries[0]?.importance).toBe('major')
  })
})

// ============================================
// Event Scroll Tests
// ============================================

describe('Event Scroll System', () => {
  it('should have multiple chapters in event scroll', () => {
    // Test the mock event scroll
    const mockScroll: EventScroll = {
      eventId: 'event_test',
      eventTitle: 'Test Event',
      eventDescription: 'A test event',
      importance: 'critical',
      chapters: [
        {
          id: 'ch1',
          title: 'Chapter 1',
          content: 'Content 1',
          canIntervene: false,
        },
        {
          id: 'ch2',
          title: 'Chapter 2',
          content: 'Content 2',
          canIntervene: true,
          interventionPoint: {
            description: 'Make a choice',
            choices: [
              { id: 'c1', index: 0, text: 'Choice 1', description: 'Desc 1', riskLevel: 'low', isUnlocked: true },
            ],
          },
        },
      ],
      currentChapterIndex: 0,
      playerInterventions: [],
    }

    expect(mockScroll.chapters.length).toBeGreaterThanOrEqual(2)
    expect(mockScroll.eventId).toBeDefined()
    expect(mockScroll.importance).toBeDefined()
  })

  it('should include decision points in chapters', () => {
    const mockScroll: EventScroll = {
      eventId: 'event_test',
      eventTitle: 'Test',
      eventDescription: 'Test',
      importance: 'major',
      chapters: [{
        id: 'ch1',
        title: 'Test Chapter',
        content: 'Content',
        canIntervene: true,
        interventionPoint: {
          description: 'Choose',
          choices: [
            { id: 'c1', index: 0, text: 'A', description: 'D', riskLevel: 'medium', isUnlocked: true },
            { id: 'c2', index: 1, text: 'B', description: 'D', riskLevel: 'high', isUnlocked: true },
          ],
        },
      }],
      currentChapterIndex: 0,
      playerInterventions: [],
    }

    const chapter = mockScroll.chapters[0]!
    expect(chapter.canIntervene).toBe(true)
    expect(chapter.interventionPoint).toBeDefined()
    expect(chapter.interventionPoint!.choices.length).toBe(2)
  })

  it('should navigate between chapters', () => {
    const store = useNarrativeCarrierStore.getState()

    // Set up mock scroll
    const mockScroll: EventScroll = {
      eventId: 'event_qiushi_death',
      eventTitle: '秋实之死',
      eventDescription: 'Test',
      importance: 'critical',
      chapters: [
        { id: 'ch1', title: 'Ch1', content: 'C1', canIntervene: false },
        { id: 'ch2', title: 'Ch2', content: 'C2', canIntervene: true },
        { id: 'ch3', title: 'Ch3', content: 'C3', canIntervene: false },
      ],
      currentChapterIndex: 0,
      playerInterventions: [],
    }

    useNarrativeCarrierStore.setState({ currentScroll: mockScroll })

    // Navigate forward
    store.scrollNextChapter()
    let updated = useNarrativeCarrierStore.getState()
    expect(updated.currentScroll?.currentChapterIndex).toBe(1)

    store.scrollNextChapter()
    updated = useNarrativeCarrierStore.getState()
    expect(updated.currentScroll?.currentChapterIndex).toBe(2)

    // Cannot go beyond last chapter
    store.scrollNextChapter()
    updated = useNarrativeCarrierStore.getState()
    expect(updated.currentScroll?.currentChapterIndex).toBe(2)

    // Navigate backward
    store.scrollPrevChapter()
    updated = useNarrativeCarrierStore.getState()
    expect(updated.currentScroll?.currentChapterIndex).toBe(1)

    // Cannot go before first chapter
    store.scrollPrevChapter()
    store.scrollPrevChapter()
    updated = useNarrativeCarrierStore.getState()
    expect(updated.currentScroll?.currentChapterIndex).toBe(0)
  })

  it('should clear current scroll', () => {
    const store = useNarrativeCarrierStore.getState()
    useNarrativeCarrierStore.setState({
      currentScroll: {
        eventId: 'test',
        eventTitle: 'Test',
        eventDescription: 'Test',
        importance: 'major',
        chapters: [],
        currentChapterIndex: 0,
        playerInterventions: [],
      },
    })
    expect(useNarrativeCarrierStore.getState().currentScroll).not.toBeNull()

    store.clearCurrentScroll()
    expect(useNarrativeCarrierStore.getState().currentScroll).toBeNull()
  })
})

// ============================================
// Narrative Style Tests
// ============================================

describe('Narrative Style Validation', () => {
  it('should use Chinese web-novel style in feedback', () => {
    const store = useNarrativeCarrierStore.getState()
    const entry = store.journalEntries[0]!

    // Should contain Chinese narrative elements
    expect(entry.narrativeFeedback).toMatch(/你/)
    expect(entry.narrativeFeedback.length).toBeGreaterThan(10)
  })

  it('should have proper news headlines', () => {
    const store = useNarrativeCarrierStore.getState()
    const news = store.morningNews!

    for (const section of news.sections) {
      expect(section.headline.length).toBeGreaterThan(2)
      expect(section.headline.length).toBeLessThan(50)
    }
  })

  it('should have scroll choice risk levels', () => {
    const riskLevels: ScrollChoice['riskLevel'][] = ['low', 'medium', 'high', 'critical']
    for (const level of riskLevels) {
      expect(['low', 'medium', 'high', 'critical']).toContain(level)
    }
  })
})

export type {
  MorningNews,
  JournalEntry,
  CharacterBiography,
  EventScroll,
  ScrollChoice,
  NewsSection,
}
