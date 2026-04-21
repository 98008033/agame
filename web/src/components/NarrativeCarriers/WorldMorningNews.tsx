/**
 * 世界晨报组件
 * 每日生成四阵营新闻，小说章节式排版
 */

import { useTranslation } from 'react-i18next'
import type { ChapterSection } from '../../stores/novelStore'
import { getSectionStyle } from '../NovelReader/sectionStyles'

export interface MorningNewsProps {
  day: number
  date: string
  sections: ChapterSection[]
  onReadDetail?: (sectionId: string) => void
}

export default function WorldMorningNews({ day, date, sections, onReadDetail }: MorningNewsProps) {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen bg-[var(--pixel-bg-dark)]">
      {/* 报头 */}
      <header className="paper-panel py-4 mb-4">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold text-[var(--pixel-text-dark)] pixel-font mb-2">
            {t('morning_news.title')}
          </h1>
          <p className="text-sm text-[var(--pixel-bg-mid)]">
            {t('morning_news.issue', { day, date })}
          </p>
          <div className="pixel-divider mt-2" />
        </div>
      </header>

      {/* 新闻内容 */}
      <main className="max-w-4xl mx-auto px-4">
        {sections.map((section) => {
          const style = getSectionStyle(section.type, section.faction)

          return (
            <article
              key={section.id}
              className={`mb-6 p-4 ${style.bgClass || 'paper-panel'} ${style.glowClass || ''}`}
            >
              {/* 节标题 */}
              <h3 className={`text-lg font-bold mb-3 pixel-font ${style.titleColor}`}>
                {section.type === 'faction_news' && section.faction && (
                  <span className="mr-2">{style.icon}</span>
                )}
                {section.title}
              </h3>

              {/* 分隔线 */}
              <div className={`w-24 h-1 ${style.borderColor.replace('border-', 'bg-')} mb-4`} />

              {/* 内容 */}
              <div className="text-justify leading-relaxed whitespace-pre-line text-[var(--pixel-text-dark)]">
                {section.content}
              </div>

              {/* 阅读详情按钮 */}
              {section.type === 'faction_news' && onReadDetail && (
                <button
                  onClick={() => onReadDetail(section.id)}
                  className="mt-4 pixel-btn text-sm"
                >
                  [{t('morning_news.readDetail')}]
                </button>
              )}
            </article>
          )
        })}
      </main>

      {/* 底部操作 */}
      <footer className="max-w-4xl mx-auto px-4 pb-8">
        <div className="paper-panel p-4 flex justify-between items-center">
          <button className="pixel-btn">
            ◀ {t('morning_news.yesterdayNews')}
          </button>
          <span className="text-[var(--pixel-text-dark)] pixel-font">
            {t('morning_news.preview')}
          </span>
          <button className="pixel-btn">
            {t('morning_news.tomorrowNews')} ▶
          </button>
        </div>
      </footer>
    </div>
  )
}