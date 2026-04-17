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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[70vh] overflow-hidden shadow-xl">
        {/* 标题 */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">章节目录</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
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
              className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 ${
                currentChapter?.id === chapter.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-800">
                  第{chapter.number}回 · {chapter.title}
                </span>
                <span className="text-sm text-gray-500">第{chapter.day}日</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">{chapter.wordCount}字</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
