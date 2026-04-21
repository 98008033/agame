/**
 * 人物传记组件
 * 重要NPC生平故事，关系变化记录
 */

import { useTranslation } from 'react-i18next'
import type { Faction } from '../../stores/playerStore'

export interface BiographyEntry {
  id: string
  title: string
  content: string
  year?: number
  importance: 'major' | 'minor' | 'legendary'
}

export interface RelationshipChange {
  npcId: string
  npcName: string
  change: number
  reason: string
  timestamp: number
}

export interface CharacterBiographyProps {
  npcId: string
  npcName: string
  npcTitle: string
  npcFaction: Faction
  age: number
  status: 'alive' | 'dying' | 'dead' | 'exiled'
  biographyEntries: BiographyEntry[]
  relationshipHistory: RelationshipChange[]
  onClose: () => void
}

const factionInfo = {
  canglong: { nameKey: 'factions.canglong', icon: '🐉', glow: 'magic-glow-green' },
  shuanglang: { nameKey: 'factions.shuanglang', icon: '🐺', glow: 'magic-glow-blue' },
  jinque: { nameKey: 'factions.jinque', icon: '🌸', glow: 'magic-glow-gold' },
  border: { nameKey: 'factions.border', icon: '🏘️', glow: 'magic-glow-purple' },
}

export default function CharacterBiography({
  // npcId - reserved for future use
  npcName,
  npcTitle,
  npcFaction,
  age,
  status,
  biographyEntries,
  relationshipHistory,
  onClose,
}: CharacterBiographyProps) {
  const { t } = useTranslation()
  const faction = factionInfo[npcFaction]

  return (
    <div className="min-h-screen bg-[var(--pixel-bg-dark)]">
      {/* 传记封面 */}
      <header className={`paper-panel py-6 ${faction.glow}`}>
        <div className="max-w-md mx-auto px-4 text-center">
          {/* 阵营标识 */}
          <span className="text-3xl">{faction.icon}</span>

          {/* 姓名 */}
          <h1 className="text-2xl font-bold text-[var(--pixel-text-dark)] pixel-font mt-2">
            {t('character_biography.title', { name: npcName })}
          </h1>

          {/* 身份 */}
          <p className="text-[var(--pixel-bg-mid)] mt-1">
            {npcTitle} · {t(faction.nameKey)}
          </p>

          {/* 年龄和状态 */}
          <div className="flex justify-center gap-4 mt-3">
            <span className="text-sm text-[var(--pixel-bg-mid)]">
              {age}{t('character_biography.yearsOld')}
            </span>
            <span className={`text-sm px-2 py-1 rounded ${
              status === 'alive' ? 'bg-[var(--pixel-exp)] text-[var(--pixel-text-light)]' :
              status === 'dying' ? 'bg-[var(--pixel-health)] text-[var(--pixel-text-light)]' :
              status === 'dead' ? 'bg-[var(--pixel-bg-mid)] text-[var(--pixel-text-light)]' :
              'bg-[var(--pixel-warning)] text-[var(--pixel-text-dark)]'
            }`}>
              {status === 'alive' ? t('character_biography.statuses.alive') : status === 'dying' ? t('character_biography.statuses.dying') : status === 'dead' ? t('character_biography.statuses.dead') : t('character_biography.statuses.exiled')}
            </span>
          </div>

          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="mt-4 pixel-btn text-sm"
          >
            {t('character_biography.back')}
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        {/* 生平故事 */}
        <section className="mb-6">
          <h2 className="text-lg font-bold text-[var(--pixel-text-light)] pixel-font mb-4 stone-panel p-2">
            {t('character_biography.backStory')}
          </h2>

          {biographyEntries.map((entry, index) => (
            <div
              key={entry.id}
              className={`paper-panel p-4 mb-4 ${
                entry.importance === 'legendary' ? 'magic-glow-purple' :
                entry.importance === 'major' ? 'pixel-shadow-hover' : ''
              }`}
            >
              {/* 年份标记 */}
              {entry.year && (
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 rounded text-xs pixel-font ${
                    entry.importance === 'legendary' ? 'bg-[var(--pixel-legendary)] text-[var(--pixel-text-light)]' :
                    entry.importance === 'major' ? 'bg-[var(--pixel-bg-mid)] text-[var(--pixel-text-light)]' :
                    'bg-[var(--pixel-bg-paper)] text-[var(--pixel-text-dark)]'
                  }`}>
                    {entry.year}{t('character_biography.year')}
                  </span>
                  {entry.importance === 'legendary' && (
                    <span className="text-[var(--pixel-legendary)]">★ {t('character_biography.legendaryEvent')}</span>
                  )}
                </div>
              )}

              {/* 标题 */}
              <h3 className="text-lg font-medium text-[var(--pixel-text-dark)] mb-2">
                {entry.title}
              </h3>

              {/* 内容 */}
              <p className="text-[var(--pixel-text-dark)] leading-relaxed whitespace-pre-line">
                {entry.content}
              </p>

              {/* 连接符 */}
              {index < biographyEntries.length - 1 && (
                <div className="text-center mt-4 text-[var(--pixel-bg-mid)]">↓</div>
              )}
            </div>
          ))}
        </section>

        {/* 与你的关系变化 */}
        <section className="mb-6">
          <h2 className="text-lg font-bold text-[var(--pixel-text-light)] pixel-font mb-4 stone-panel p-2">
            {t('character_biography.relationshipChange')}
          </h2>

          {relationshipHistory.length === 0 ? (
            <div className="paper-panel p-4 text-center">
              <p className="text-[var(--pixel-bg-mid)]">
                {t('character_biography.noRelationship', { name: npcName })}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {relationshipHistory.map((change) => (
                <div
                  key={`${change.npcId}-${change.timestamp}`}
                  className="paper-panel p-3 flex items-center justify-between"
                >
                  <div>
                    <span className={`font-medium ${change.change > 0 ? 'text-[var(--pixel-exp)]' : 'text-[var(--pixel-health)]'}`}>
                      {change.change > 0 ? '↑' : '↓'} {Math.abs(change.change)}
                    </span>
                    <span className="text-[var(--pixel-text-dark)] ml-2">
                      {change.reason}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--pixel-bg-mid)]">
                    {t('character_biography.day', { day: change.timestamp })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 留白 - 等待玩家书写 */}
        {status === 'alive' && (
          <section className="mb-6">
            <h2 className="text-lg font-bold text-[var(--pixel-text-light)] pixel-font mb-4 stone-panel p-2">
              {t('character_biography.futureChapter')}
            </h2>
            <div className="paper-panel p-6 text-center">
              <p className="text-[var(--pixel-bg-mid)] italic">
                {t('character_biography.futureMessage')}
              </p>
              <div className="mt-4">
                <span className="text-2xl">📖</span>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}