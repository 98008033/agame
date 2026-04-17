import type { Chapter } from '../../stores/novelStore'

interface ChapterHeaderProps {
  chapter: Chapter
  onPrev?: () => void
  onNext?: () => void
  hasPrev: boolean
  hasNext: boolean
}

export default function ChapterHeader({
  chapter,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: ChapterHeaderProps) {
  return (
    <header className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-200 py-4 z-40">
      <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
        {/* 章节导航 */}
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className={`px-3 py-1 rounded ${
            hasPrev
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-gray-50 text-gray-400 cursor-not-allowed'
          }`}
        >
          ◀ 上一回
        </button>

        {/* 章节标题 */}
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-800" style={{ fontFamily: 'serif' }}>
            第{chapter.number}回 · {chapter.title}
          </h1>
          <p className="text-sm text-gray-500">
            第{chapter.day}日 · {chapter.wordCount}字
          </p>
        </div>

        {/* 下一章 */}
        <button
          onClick={onNext}
          disabled={!hasNext}
          className={`px-3 py-1 rounded ${
            hasNext
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-gray-50 text-gray-400 cursor-not-allowed'
          }`}
        >
          下一回 ▶
        </button>
      </div>
    </header>
  )
}
