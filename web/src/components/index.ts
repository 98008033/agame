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

// 动画数字组件
export { default as AnimatedNumber } from './AnimatedNumber'

// 社会阶层进度条
export { default as SocialClassProgressBar } from './SocialClassProgressBar'

// NPC关系卡片
export { default as NPCRelationshipCard } from './NPCRelationshipCard'

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