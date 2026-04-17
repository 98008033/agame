import type { ReadingSettings } from '../../stores/novelStore'

interface ReadingToolbarProps {
  settings: ReadingSettings
  onSettingsChange: (settings: Partial<ReadingSettings>) => void
  isBookmarked: boolean
  onBookmarkToggle: () => void
}

type FontSizeOption = 'small' | 'medium' | 'large' | 'xlarge'
type ThemeOption = 'light' | 'dark' | 'sepia'

const fontSizeOptions: { value: FontSizeOption; label: string }[] = [
  { value: 'small', label: '小' },
  { value: 'medium', label: '中' },
  { value: 'large', label: '大' },
  { value: 'xlarge', label: '特大' },
]

const themeOptions: { value: ThemeOption; label: string }[] = [
  { value: 'light', label: '日间' },
  { value: 'dark', label: '夜间' },
  { value: 'sepia', label: '复古' },
]

export default function ReadingToolbar({
  settings,
  onSettingsChange,
  isBookmarked,
  onBookmarkToggle,
}: ReadingToolbarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* 字号选择 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">字号:</span>
          <div className="flex gap-1">
            {fontSizeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onSettingsChange({ fontSize: option.value })}
                className={`px-2 py-1 text-sm rounded ${
                  settings.fontSize === option.value
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 主题选择 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">主题:</span>
          <div className="flex gap-1">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onSettingsChange({ theme: option.value })}
                className={`px-2 py-1 text-sm rounded ${
                  settings.theme === option.value
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 书签 */}
        <button
          onClick={onBookmarkToggle}
          className={`px-3 py-1 rounded ${
            isBookmarked
              ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {isBookmarked ? '📖 已收藏' : '📑 收藏'}
        </button>
      </div>
    </div>
  )
}
