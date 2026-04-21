import { useNavigate } from 'react-router-dom'

export interface FactionData {
  id: string
  name: string
  icon: string
  color: string
  bgColor: string
  description: string
  reputation?: number  // -100 ~ +100
  playerRank?: number
  memberCount?: number
  level?: number
  levelName?: string
}

interface FactionCardProps {
  faction: FactionData
  showProgress?: boolean
}

// 派系等级配置
const factionLevels = [
  { min: -100, name: '死敌', icon: '💀', color: 'text-[var(--accent-red)]' },
  { min: -75, name: '敌对', icon: '⚔️', color: 'text-[var(--accent-red)]' },
  { min: -50, name: '冷漠', icon: '❄️', color: 'text-[var(--text-muted)]' },
  { min: -25, name: '疏远', icon: '😐', color: 'text-[var(--text-muted)]' },
  { min: 0, name: '中立', icon: '🤝', color: 'text-[var(--text-secondary)]' },
  { min: 25, name: '友好', icon: '😊', color: 'text-[var(--accent-green)]' },
  { min: 50, name: '信任', icon: '🤝', color: 'text-[var(--accent-green)]' },
  { min: 75, name: '尊敬', icon: '🙏', color: 'text-[var(--accent-gold)]' },
  { min: 90, name: '盟友', icon: '⭐', color: 'text-[var(--accent-gold)]' },
]

function getLevelForReputation(rep: number) {
  let result = factionLevels[0]
  for (const level of factionLevels) {
    if (rep >= level.min) {
      result = level
    }
  }
  return result
}

export default function FactionCard({ faction, showProgress = false }: FactionCardProps) {
  const navigate = useNavigate()
  const reputation = faction.reputation ?? 0
  const level = getLevelForReputation(reputation)

  // 声誉进度条百分比 (-100 ~ +100 → 0 ~ 100%)
  const progressPercent = ((reputation + 100) / 200) * 100

  return (
    <div
      className="card-modern cursor-pointer hover:scale-[1.02] transition-all"
      style={{ borderColor: faction.color + '60' }}
      onClick={() => navigate(`/factions/${faction.id}`)}
    >
      {/* 派系头部 */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{faction.icon}</span>
        <div className="flex-1">
          <h3 className="font-bold text-[var(--text-primary)] font-display" style={{ color: faction.color }}>
            {faction.name}
          </h3>
          {level && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-sm">{level.icon}</span>
              <span className={`text-xs font-medium font-display ${level.color}`}>
                {level.name}
              </span>
            </div>
          )}
        </div>
        {faction.playerRank && (
          <div className="text-right">
            <span className="text-xs text-[var(--text-muted)]">排名</span>
            <span className="block text-lg font-bold text-[var(--accent-gold)] font-display">
              #{faction.playerRank}
            </span>
          </div>
        )}
      </div>

      {/* 描述 */}
      <p className="text-xs text-[var(--text-secondary)] mb-3">{faction.description}</p>

      {/* 声誉进度条 */}
      {showProgress && (
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[var(--text-muted)]">声誉</span>
            <span className="font-medium font-display" style={{ color: faction.color }}>
              {reputation}/100
            </span>
          </div>
          <div className="progress-modern">
            <div
              className="progress-fill transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: faction.color
              }}
            />
          </div>
        </div>
      )}

      {/* 成员数 */}
      {faction.memberCount !== undefined && (
        <div className="mt-2 text-xs text-[var(--text-muted)]">
          <span>👥 {faction.memberCount} 成员</span>
        </div>
      )}
    </div>
  )
}
