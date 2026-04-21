import type { ChapterSection } from '../../stores/novelStore'
import { getSectionStyle } from './sectionStyles'

interface SectionContentProps {
  section: ChapterSection
  theme: 'light' | 'dark' | 'sepia'
}

export default function SectionContent({ section }: SectionContentProps) {
  const style = getSectionStyle(section.type, section.faction)

  return (
    <div className={`mb-6 ${style.bgClass || 'paper-panel'} p-4 ${style.glowClass || ''}`}>
      {/* 节标题 */}
      <h3 className={`text-lg font-bold mb-3 text-center pixel-font ${style.titleColor}`}>
        {section.type === 'faction_news' && section.faction && (
          <span className="mr-2">{style.icon}</span>
        )}
        {section.title}
      </h3>

      {/* 分隔线 */}
      {section.type !== 'intro' && (
        <div className={`w-24 h-1 mx-auto mb-4 ${style.borderColor.replace('border-', 'bg-')}`} />
      )}

      {/* 内容 */}
      <div className="text-justify leading-relaxed whitespace-pre-line text-[var(--pixel-text-dark)]">
        {section.content}
      </div>
    </div>
  )
}
