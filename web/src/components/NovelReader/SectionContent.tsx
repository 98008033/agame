import type { ChapterSection } from '../../stores/novelStore'
import { getSectionStyle } from './sectionStyles'

interface SectionContentProps {
  section: ChapterSection
  theme: 'light' | 'dark' | 'sepia'
}

export default function SectionContent({ section, theme }: SectionContentProps) {
  const style = getSectionStyle(section.type, section.faction)

  return (
    <div className={`mb-6 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
      {/* 节标题 */}
      <h3
        className={`text-lg font-bold mb-3 text-center ${style.titleColor}`}
        style={{ fontFamily: 'serif' }}
      >
        {section.type === 'faction_news' && section.faction && (
          <span className="mr-2">{style.icon}</span>
        )}
        {section.title}
      </h3>

      {/* 分隔线 */}
      {section.type !== 'intro' && <div className="w-32 h-px bg-gray-300 mx-auto mb-4" />}

      {/* 内容 */}
      <div
        className="text-justify leading-relaxed whitespace-pre-line"
        style={{ fontFamily: 'serif' }}
      >
        {section.content}
      </div>
    </div>
  )
}
