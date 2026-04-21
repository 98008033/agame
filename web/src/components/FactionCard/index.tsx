import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { factionApi } from '../../services'

export interface FactionCardData {
  id: string
  name: string
  icon: string
  color: string
  description: string
  reputation?: number
  memberCount?: number
  isJoined?: boolean
}

interface FactionCardProps {
  faction: FactionCardData
  showProgress?: boolean
  showJoin?: boolean
}

const factionLevels = [
  { min: -100, name: '死敌', color: 'text-[var(--accent-red)]' },
  { min: -75, name: '敌对', color: 'text-[var(--accent-red)]' },
  { min: -50, name: '冷漠', color: 'text-[var(--text-muted)]' },
  { min: -25, name: '疏远', color: 'text-[var(--text-muted)]' },
  { min: 0, name: '中立', color: 'text-[var(--text-secondary)]' },
  { min: 25, name: '友好', color: 'text-[var(--accent-green)]' },
  { min: 50, name: '信任', color: 'text-[var(--accent-green)]' },
  { min: 75, name: '尊敬', color: 'text-[var(--accent-gold)]' },
  { min: 90, name: '盟友', color: 'text-[var(--accent-gold)]' },
]

function getLevel(rep: number) {
  let result = factionLevels[0]
  for (const level of factionLevels) {
    if (rep >= level.min) result = level
  }
  return result
}

export default function FactionCard({ faction, showProgress = false, showJoin = false }: FactionCardProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isJoined, setIsJoined] = useState(faction.isJoined ?? false)
  const reputation = faction.reputation ?? 0
  const level = getLevel(reputation)
  const progressPercent = ((reputation + 100) / 200) * 100

  return (
    <div
      className="card-modern cursor-pointer hover:scale-[1.02] transition-all"
      style={{ borderColor: faction.color + '60' }}
      onClick={() => navigate(`/factions/${faction.id}`)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{faction.icon}</span>
          <div>
            <h3 className="font-bold text-[var(--text-primary)] font-display" style={{ color: faction.color }}>
              {faction.name}
            </h3>
            <div className="flex items-center gap-1 mt-1">
              <span className={`text-xs font-medium font-display ${level.color}`}>{level.name}</span>
              {isJoined && <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--accent-green)]/20 text-[var(--accent-green)]">{t('internalFactions.joined')}</span>}
            </div>
          </div>
        </div>
        {faction.memberCount !== undefined && (
          <span className="text-xs text-[var(--text-muted)]">{'\ud83d\udc65'} {faction.memberCount}</span>
        )}
      </div>
      <p className="text-xs text-[var(--text-secondary)] mt-2">{faction.description}</p>
      {showProgress && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[var(--text-muted)]">{t('internalFactions.reputation')}</span>
            <span className="font-bold font-display">{reputation}/100</span>
          </div>
          <div className="progress-modern">
            <div className="progress-fill transition-all duration-500" style={{ width: `${progressPercent}%`, backgroundColor: faction.color }} />
          </div>
        </div>
      )}
      {showJoin && (
        <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
          {!isJoined ? (
            <button className="btn-modern text-xs" onClick={async () => {
              try { await factionApi.joinFaction(faction.id); setIsJoined(true) } catch {}
            }}>
              {t('internalFactions.join')}
            </button>
          ) : (
            <button className="btn-modern text-xs" onClick={async () => {
              try { await factionApi.leaveFaction(); setIsJoined(false) } catch {}
            }}>
              {t('internalFactions.switch')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
