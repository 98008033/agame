import { useState, useEffect } from 'react'
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

// 主题背景映射
const themeBgMap: Record<string, string> = {
  light: 'bg-white',
  dark: 'bg-gray-900',
  sepia: 'bg-amber-50',
}

export default function NovelReader() {
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
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">加载中...</p>
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

      {/* 阅读进度条 */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 z-50">
        <div
          className="h-full bg-blue-500 transition-all duration-150"
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

        {/* 章节底部导航 */}
        <div className="mt-12 pt-6 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={!prevChapter}
            className={`px-4 py-2 rounded ${
              prevChapter
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
          >
            ◀ 上一回
          </button>

          <button
            onClick={() => setShowChapterList(true)}
            className="px-4 py-2 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
          >
            回目列表
          </button>

          <button
            onClick={handleNext}
            disabled={!nextChapter}
            className={`px-4 py-2 rounded ${
              nextChapter
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
          >
            下一回 ▶
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
