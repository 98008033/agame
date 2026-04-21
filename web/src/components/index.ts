// 组件导出

// NovelReader组件
export { default as NovelReader } from './NovelReader'
export { default as ChapterHeader } from './NovelReader/ChapterHeader'
export { default as SectionContent } from './NovelReader/SectionContent'
export { default as ReadingToolbar } from './NovelReader/ReadingToolbar'
export { default as ChapterList } from './NovelReader/ChapterList'
export { getSectionStyle, factionColors, sectionTypeStyles } from './NovelReader/sectionStyles'

// EventCard组件
export { default as EventCard } from './EventCard'

// 用户头像菜单组件
export { default as UserAvatarMenu } from './UserAvatarMenu'

// WebSocket通知组件
export { default as NotificationToast } from './NotificationToast'

// 叙事载体组件
export {
  WorldMorningNews,
  PersonalJournal,
  CharacterBiographyComponent,
  EventScrollComponent,
} from './NarrativeCarriers'

export type {
  MorningNewsData,
  NewsSection,
  JournalEntry,
  CharacterBiographyData,
  BiographyEntry,
  RelationshipChange,
  EventScrollData,
  ScrollChapter,
  ScrollChoice,
} from './NarrativeCarriers'