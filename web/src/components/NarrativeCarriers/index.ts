/**
 * 叙事载体组件导出
 * 四种叙事载体：世界晨报、个人日志、人物传记、事件长卷
 */

export { default as WorldMorningNews } from './WorldMorningNews'
export { default as PersonalJournal } from './PersonalJournal'
export { default as CharacterBiographyComponent } from './CharacterBiography'
export { default as EventScrollComponent } from './EventScroll'

// 类型从 narrativeCarrierStore 导出（使用别名避免冲突）
export type {
  MorningNews as MorningNewsData,
  NewsSection,
  JournalEntry,
  CharacterBiography as CharacterBiographyData,
  BiographyEntry,
  RelationshipChange,
  EventScroll as EventScrollData,
  ScrollChapter,
  ScrollChoice,
} from '../../stores/narrativeCarrierStore'