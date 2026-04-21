import type { Chapter } from '../../stores/novelStore'

interface ChapterListProps {
  chapters: Chapter[]
  currentChapter: Chapter | null
  onSelect: (chapter: Chapter) => void
  isOpen: boolean
  onClose: () => void
}

export default function ChapterList({
  chapters,
  currentChapter,
  onSelect,
  isOpen,
  onClose,
}: ChapterListProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="paper-panel max-w-md w-full max-h-[70vh] overflow-hidden">
        {/* 标题 */}
        <div className="p-4 border-b-2 border-[var(--pixel-bg-mid)] flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--pixel-text-dark)] pixel-font">章节目录</h2>
          <button
            onClick={onClose}
            className="text-[var(--pixel-bg-mid)] hover:text-[var(--pixel-text-dark)] text-xl"
          >
            ✕
          </button>
        </div>

        {/* 章节列表 */}
        <div className="overflow-y-auto max-h-[60vh]">
          {chapters.map((chapter) => (
            <button
              key={chapter.id}
              onClick={() => {
                onSelect(chapter)
                onClose()
              }}
              className={`w-full p-4 text-left border-b-2 border-[var(--pixel-bg-paper)] hover:bg-[var(--pixel-bg-paper)] transition-colors ${
                currentChapter?.id === chapter.id ? 'bg-[var(--pixel-bg-paper)] border-l-4 border-l-[var(--pixel-exp)]' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-[var(--pixel-text-dark)] pixel-font">
                  第{chapter.number}回 · {chapter.title}
                </span>
                <span className="text-sm text-[var(--pixel-bg-mid)]">第{chapter.day}日</span>
              </div>
              <p className="text-sm text-[var(--pixel-bg-mid)] mt-1">{chapter.wordCount}字</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
