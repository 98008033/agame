import { useNavigate } from 'react-router-dom'
import type { Chapter } from '../../stores/novelStore'
import { UserAvatarMenu } from '../index'

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
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 stone-panel py-4 z-40">
      <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
        {/* 返回主页 + 章节导航 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="pixel-btn text-sm bg-[var(--pixel-bg-mid)]"
            title="返回主页"
          >
            ↩ 返回
          </button>
          <button
            onClick={onPrev}
            disabled={!hasPrev}
            className={`pixel-btn text-sm ${
              hasPrev ? '' : 'opacity-50 cursor-not-allowed'
            }`}
          >
            ◀ 上一回
          </button>
        </div>

        {/* 章节标题 */}
        <div className="text-center">
          <h1 className="text-xl font-bold text-[var(--pixel-text-light)] pixel-font">
            第{chapter.number}回 · {chapter.title}
          </h1>
          <p className="text-sm text-[var(--pixel-bg-paper)]">
            第{chapter.day}日 · {chapter.wordCount}字
          </p>
        </div>

        {/* 用户菜单 + 下一回 */}
        <div className="flex items-center gap-2">
          <button
            onClick={onNext}
            disabled={!hasNext}
            className={`pixel-btn text-sm ${
              hasNext ? '' : 'opacity-50 cursor-not-allowed'
            }`}
          >
            下一回 ▶
          </button>
          <UserAvatarMenu />
        </div>
      </div>
    </header>
  )
}
