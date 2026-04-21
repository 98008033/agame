/**
 * 事件长卷组件
 * 重大事件的长篇叙事，玩家可介入节点
 */

import type { EventChoice } from '../../stores/eventStore'

export interface ScrollChapter {
  id: string
  title: string
  content: string
  canIntervene: boolean
  interventionPoint?: {
    description: string
    choices: EventChoice[]
  }
}

export interface EventScrollProps {
  eventId: string
  eventTitle: string
  eventDescription: string
  importance: 'major' | 'critical'
  chapters: ScrollChapter[]
  currentChapterIndex: number
  onIntervene: (choiceIndex: number) => void
  onNextChapter: () => void
  onPrevChapter: () => void
  onClose: () => void
}

export default function EventScroll({
  // eventId - reserved for future use
  eventTitle,
  eventDescription,
  importance,
  chapters,
  currentChapterIndex,
  onIntervene,
  onNextChapter,
  onPrevChapter,
  onClose,
}: EventScrollProps) {
  const currentChapter = chapters[currentChapterIndex]

  return (
    <div className="min-h-screen bg-[var(--pixel-bg-dark)]">
      {/* 长卷标题 */}
      <header className={`stone-panel py-4 sticky top-0 z-10 ${importance === 'critical' ? 'magic-glow-purple' : 'pixel-shadow'}`}>
        <div className="max-w-lg mx-auto px-4">
          {/* 返回按钮 */}
          <button
            onClick={onClose}
            className="text-[var(--pixel-text-light)] mb-2 pixel-font"
          >
            ◀ 返回事件列表
          </button>

          {/* 标题 */}
          <h1 className="text-xl font-bold text-[var(--pixel-text-light)] pixel-font text-center">
            【事件长卷】{eventTitle}
          </h1>

          {/* 重要性标记 */}
          <div className="flex justify-center mt-2">
            <span className={`px-3 py-1 rounded text-sm pixel-font ${
              importance === 'critical'
                ? 'bg-[var(--pixel-legendary)] text-[var(--pixel-text-light)] magic-glow-purple'
                : 'bg-[var(--pixel-bg-paper)] text-[var(--pixel-text-dark)]'
            }`}>
              {importance === 'critical' ? '★ 史诗事件' : '◆ 重要事件'}
            </span>
          </div>

          {/* 章节进度 */}
          <div className="flex justify-center gap-2 mt-3">
            {chapters.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded ${
                  index === currentChapterIndex
                    ? 'bg-[var(--pixel-text-light)]'
                    : index < currentChapterIndex
                      ? 'bg-[var(--pixel-exp)]'
                      : 'bg-[var(--pixel-bg-mid)]'
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* 长卷内容 */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {/* 简介面板 */}
        <div className="paper-panel p-4 mb-6">
          <p className="text-[var(--pixel-text-dark)] text-sm leading-relaxed">
            {eventDescription}
          </p>
        </div>

        {/* 当前章节 */}
        <div className="paper-panel p-6 mb-6">
          {/* 章节标题 */}
          <h2 className="text-lg font-bold text-[var(--pixel-text-dark)] pixel-font mb-4 text-center">
            第{currentChapterIndex + 1}章 · {currentChapter.title}
          </h2>

          <div className="pixel-divider mb-4" />

          {/* 章节内容 */}
          <div className="text-[var(--pixel-text-dark)] leading-relaxed whitespace-pre-line">
            {currentChapter.content}
          </div>
        </div>

        {/* 介入节点 */}
        {currentChapter.canIntervene && currentChapter.interventionPoint && (
          <div className="stone-panel p-4 mb-6 magic-glow-purple">
            <h3 className="text-lg font-bold text-[var(--pixel-text-light)] pixel-font mb-3 text-center">
              ⚠️ 关键时刻
            </h3>
            <p className="text-[var(--pixel-text-light)] text-center mb-4">
              {currentChapter.interventionPoint.description}
            </p>

            {/* 选择列表 */}
            <div className="space-y-3">
              {currentChapter.interventionPoint.choices.map((choice, index) => (
                <button
                  key={choice.id}
                  onClick={() => onIntervene(index)}
                  disabled={!choice.isUnlocked}
                  className={`w-full p-4 rounded text-left transition-all ${
                    choice.isUnlocked
                      ? 'paper-panel cursor-pointer hover:pixel-shadow-hover'
                      : 'bg-[var(--pixel-bg-mid)] text-[var(--pixel-bg-paper)] cursor-not-allowed opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[var(--pixel-text-dark)]">
                      {choice.text}
                    </span>
                    {/* 风险等级 */}
                    <span className={`px-2 py-1 rounded text-xs ${
                      choice.riskLevel === 'critical' ? 'bg-[var(--pixel-health)] text-[var(--pixel-text-light)]' :
                      choice.riskLevel === 'high' ? 'bg-[var(--pixel-warning)] text-[var(--pixel-text-dark)]' :
                      choice.riskLevel === 'medium' ? 'bg-[var(--pixel-bg-mid)] text-[var(--pixel-text-light)]' :
                      'bg-[var(--pixel-exp)] text-[var(--pixel-text-light)]'
                    }`}>
                      {choice.riskLevel === 'critical' ? '极险' :
                       choice.riskLevel === 'high' ? '高风险' :
                       choice.riskLevel === 'medium' ? '中风险' : '低风险'}
                    </span>
                  </div>

                  {/* 描述 */}
                  <p className="text-sm text-[var(--pixel-bg-mid)] mt-1">
                    {choice.description}
                  </p>

                  {/* 技能需求 */}
                  {choice.skillRequirement && !choice.isUnlocked && (
                    <p className="text-sm text-[var(--pixel-health)] mt-2">
                      需要：{choice.skillRequirement.skillName} Lv.{choice.skillRequirement.level}
                      ({choice.skillRequirement.reason})
                    </p>
                  )}

                  {/* 代价和收益预览 */}
                  <div className="flex gap-4 mt-2 text-xs">
                    {choice.costs && (
                      <div className="text-[var(--pixel-health)]">
                        代价：{choice.costs.description}
                      </div>
                    )}
                    {choice.rewards && choice.isUnlocked && (
                      <div className="text-[var(--pixel-exp)]">
                        收益：{choice.rewards.description}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* 不介入选项 */}
            <button
              onClick={() => onNextChapter()}
              className="w-full mt-4 pixel-btn text-center"
            >
              继续观望（不介入）
            </button>
          </div>
        )}

        {/* 章节导航 */}
        {!currentChapter.canIntervene && (
          <div className="flex justify-between mb-6">
            <button
              onClick={onPrevChapter}
              disabled={currentChapterIndex === 0}
              className={`pixel-btn ${currentChapterIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              ◀ 上章
            </button>
            <button
              onClick={onNextChapter}
              disabled={currentChapterIndex === chapters.length - 1}
              className={`pixel-btn ${currentChapterIndex === chapters.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              下章 ▶
            </button>
          </div>
        )}

        {/* 结尾 */}
        {currentChapterIndex === chapters.length - 1 && !currentChapter.canIntervene && (
          <div className="paper-panel p-6 text-center">
            <h3 className="text-lg font-bold text-[var(--pixel-text-dark)] pixel-font mb-2">
              【本卷终】
            </h3>
            <p className="text-[var(--pixel-bg-mid)] italic">
              这段历史已被记录。你的选择将影响后世对此事的记述...
            </p>
          </div>
        )}
      </main>
    </div>
  )
}