/**
 * 个人日志组件
 * 玩家参与的事件记录，带选择分支
 */

import { useEffect } from 'react'
import { useNarrativeCarrierStore } from '../../stores/narrativeCarrierStore'

export default function PersonalJournal() {
  const {
    journalEntries,
    journalLoading,
    selectedEntryId,
    loadJournal,
    selectJournalEntry,
  } = useNarrativeCarrierStore()

  useEffect(() => {
    loadJournal()
  }, [loadJournal])

  if (journalLoading) {
    return (
      <div className="min-h-screen bg-[var(--pixel-bg-dark)] flex items-center justify-center">
        <p className="text-[var(--pixel-text-light)] pixel-font">加载日志中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--pixel-bg-dark)]">
      {/* 日志标题 */}
      <header className="stone-panel py-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4">
          <h1 className="text-xl font-bold text-[var(--pixel-text-light)] pixel-font text-center">
            【个人日志】
          </h1>
        </div>
      </header>

      {/* 日志列表 */}
      <main className="max-w-md mx-auto px-4 py-6">
        {journalEntries.length === 0 ? (
          <div className="paper-panel p-6 text-center">
            <p className="text-[var(--pixel-text-dark)]">
              你的日志还是空的。当你做出重要决定后，这里会记录你的故事。
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {journalEntries.map((entry) => (
              <div
                key={entry.id}
                onClick={() => selectJournalEntry(entry.id)}
                className={`paper-panel p-4 cursor-pointer transition-all ${
                  selectedEntryId === entry.id ? 'pixel-shadow-hover' : 'pixel-shadow'
                }`}
              >
                {/* 日期和类型 */}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-[var(--pixel-bg-mid)]">
                    第{entry.day}日
                  </span>
                  <span className="px-2 py-1 bg-[var(--pixel-bg-mid)] text-[var(--pixel-text-light)] text-xs rounded pixel-font">
                    {entry.eventType}
                  </span>
                </div>

                {/* 标题 */}
                <h3 className="text-lg font-bold text-[var(--pixel-text-dark)] pixel-font mb-2">
                  {entry.title}
                </h3>

                {/* 你的选择 */}
                <div className="bg-[var(--pixel-bg-paper)] p-2 rounded mb-2">
                  <span className="text-sm text-[var(--pixel-bg-mid)]">你的选择：</span>
                  <span className="text-sm font-medium text-[var(--pixel-text-dark)] ml-2">
                    「{entry.choiceText}」
                  </span>
                </div>

                {/* 后果摘要 */}
                {entry.consequences && (
                  <div className="flex gap-2 text-xs">
                    {entry.consequences.gold && (
                      <span className={`${entry.consequences.gold > 0 ? 'text-[var(--pixel-warning)]' : 'text-[var(--pixel-health)]'}`}>
                        💰 {entry.consequences.gold > 0 ? '+' : ''}{entry.consequences.gold}
                      </span>
                    )}
                    {entry.consequences.influence && (
                      <span className={`${entry.consequences.influence > 0 ? 'text-[var(--pixel-legendary)]' : 'text-[var(--pixel-health)]'}`}>
                        ⭐ {entry.consequences.influence > 0 ? '+' : ''}{entry.consequences.influence}
                      </span>
                    )}
                    {entry.relatedNPCs.length > 0 && (
                      <span className="text-[var(--pixel-mana)]">
                        🧑 {entry.relatedNPCs.length}人
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 当前选中详情 */}
      {selectedEntryId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="paper-panel max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
            {(() => {
              const entry = journalEntries.find(e => e.id === selectedEntryId)
              if (!entry) return null

              return (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-[var(--pixel-text-dark)] pixel-font">
                      {entry.title}
                    </h2>
                    <button
                      onClick={() => selectJournalEntry(null)}
                      className="text-[var(--pixel-bg-mid)] hover:text-[var(--pixel-text-dark)]"
                    >
                      ✕
                    </button>
                  </div>

                  {/* 原始情境 */}
                  <div className="mb-4">
                    <p className="text-[var(--pixel-text-dark)] leading-relaxed whitespace-pre-line">
                      {entry.description}
                    </p>
                  </div>

                  {/* 你的选择 */}
                  <div className="bg-[var(--pixel-bg-mid)] p-3 rounded mb-4">
                    <h4 className="text-sm text-[var(--pixel-text-light)] mb-2">你的选择</h4>
                    <p className="text-[var(--pixel-text-light)] font-medium">
                      「{entry.choiceText}」
                    </p>
                  </div>

                  {/* 叙事反馈 */}
                  <div className="mb-4 stone-panel p-3">
                    <p className="text-[var(--pixel-text-light)] leading-relaxed whitespace-pre-line">
                      {entry.narrativeFeedback}
                    </p>
                  </div>

                  {/* 影响详情 */}
                  {entry.consequences && (
                    <div className="border-t-2 border-[var(--pixel-bg-mid)] pt-4">
                      <h4 className="text-sm font-medium text-[var(--pixel-text-dark)] mb-3">
                        影响记录
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {entry.consequences.gold !== undefined && (
                          <div className="text-center p-2 bg-[var(--pixel-bg-paper)] rounded">
                            <span className="text-lg">💰</span>
                            <span className={`font-bold ml-1 ${entry.consequences.gold > 0 ? 'text-[var(--pixel-warning)]' : 'text-[var(--pixel-health)]'}`}>
                              {entry.consequences.gold > 0 ? '+' : ''}{entry.consequences.gold}
                            </span>
                          </div>
                        )}
                        {entry.consequences.influence !== undefined && (
                          <div className="text-center p-2 bg-[var(--pixel-bg-paper)] rounded">
                            <span className="text-lg">⭐</span>
                            <span className={`font-bold ml-1 ${entry.consequences.influence > 0 ? 'text-[var(--pixel-legendary)]' : 'text-[var(--pixel-health)]'}`}>
                              {entry.consequences.influence > 0 ? '+' : ''}{entry.consequences.influence}
                            </span>
                          </div>
                        )}
                      </div>
                      {entry.consequences.newTags && entry.consequences.newTags.length > 0 && (
                        <div className="mt-3">
                          <span className="text-sm text-[var(--pixel-bg-mid)]">获得标签：</span>
                          {entry.consequences.newTags.map(tag => (
                            <span key={tag} className="ml-2 px-2 py-1 bg-[var(--pixel-legendary)] text-[var(--pixel-text-light)] text-xs rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 涉及人物 */}
                  {entry.relatedNPCs.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm text-[var(--pixel-bg-mid)] mb-2">涉及人物</h4>
                      <div className="flex gap-2">
                        {entry.relatedNPCs.map(npc => (
                          <span key={npc} className="px-2 py-1 bg-[var(--pixel-bg-mid)] text-[var(--pixel-text-light)] text-sm rounded pixel-font">
                            {npc}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}