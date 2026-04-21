import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNovelStore, type ReadingSettings } from '../../stores/novelStore'
import ChapterHeader from './ChapterHeader'
import SectionContent from './SectionContent'
import ReadingToolbar from './ReadingToolbar'
import ChapterList from './ChapterList'

// 字号映射
const fontSizeMap: Record<string, string> = {
  small: 'text-sm',
  medium: 'text-base',
  large: 'text-lg',
  xlarge: 'text-xl',
}

// 主题背景映射 - 像素奇幻风格
const themeBgMap: Record<string, string> = {
  light: 'bg-[var(--pixel-bg-light)]',
  dark: 'bg-[var(--pixel-bg-dark)]',
  sepia: 'bg-[var(--pixel-bg-paper)]',
}

export default function NovelReader() {
  const { t } = useTranslation()
  const {
    currentChapter,
    chapters,
    settings,
    bookmarks,
    loadChapter,
    updateSettings,
    addBookmark,
    removeBookmark,
    getNextChapter,
    getPrevChapter,
  } = useNovelStore()

  const [showChapterList, setShowChapterList] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)

  // 初始化加载第一章
  useEffect(() => {
    if (!currentChapter && chapters.length > 0) {
      loadChapter(chapters[0].day)
    }
  }, [currentChapter, chapters, loadChapter])

  // 监听滚动进度
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = docHeight > 0 ? scrollTop / docHeight : 0
      setScrollProgress(Math.min(progress, 1))
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!currentChapter) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--pixel-bg-dark)]">
        <p className="text-[var(--pixel-text-light)] pixel-font">{t('novel_reader.loading')}</p>
      </div>
    )
  }

  const nextChapter = getNextChapter()
  const prevChapter = getPrevChapter()
  const isBookmarked = bookmarks.includes(currentChapter.id)

  const handlePrev = () => {
    if (prevChapter) {
      loadChapter(prevChapter.day)
    }
  }

  const handleNext = () => {
    if (nextChapter) {
      loadChapter(nextChapter.day)
    }
  }

  const handleBookmarkToggle = () => {
    if (isBookmarked) {
      removeBookmark(currentChapter.id)
    } else {
      addBookmark(currentChapter.id)
    }
  }

  const handleSettingsChange = (newSettings: Partial<ReadingSettings>) => {
    updateSettings(newSettings)
  }

  return (
    <div className={`min-h-screen ${themeBgMap[settings.theme]} pb-20`}>
      {/* 章节头部 */}
      <ChapterHeader
        chapter={currentChapter}
        onPrev={handlePrev}
        onNext={handleNext}
        hasPrev={prevChapter !== null}
        hasNext={nextChapter !== null}
      />

      {/* 阅读进度条 - 像素风格 */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-[var(--pixel-bg-mid)] z-50">
        <div
          className="h-full bg-[var(--pixel-exp)] transition-all duration-150"
          style={{ width: `${scrollProgress * 100}%` }}
        />
      </div>

      {/* 章节内容 */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <article className={`${fontSizeMap[settings.fontSize]}`}>
          {currentChapter.sections.map((section) => (
            <SectionContent key={section.id} section={section} theme={settings.theme} />
          ))}
        </article>

        {/* 章节底部导航 - 像素风格 */}
        <div className="mt-12 pt-6 border-t-2 border-[var(--pixel-bg-mid)] flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={!prevChapter}
            className={`pixel-btn ${!prevChapter ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            ◀ {t('novel_reader.prevChapter')}
          </button>

          <button
            onClick={() => setShowChapterList(true)}
            className="pixel-btn bg-[var(--pixel-bg-mid)]"
          >
            {t('novel_reader.chapterList')}
          </button>

          <button
            onClick={handleNext}
            disabled={!nextChapter}
            className={`pixel-btn ${!nextChapter ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {t('novel_reader.nextChapter')} ▶
          </button>
        </div>
      </main>

      {/* 阅读工具栏 */}
      <ReadingToolbar
        settings={settings}
        onSettingsChange={handleSettingsChange}
        isBookmarked={isBookmarked}
        onBookmarkToggle={handleBookmarkToggle}
      />

      {/* 章节列表弹窗 */}
      <ChapterList
        chapters={chapters}
        currentChapter={currentChapter}
        onSelect={(chapter) => loadChapter(chapter.day)}
        isOpen={showChapterList}
        onClose={() => setShowChapterList(false)}
      />
    </div>
  )
}
