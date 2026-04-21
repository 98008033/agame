import { useNavigate } from 'react-router-dom'

export interface NationData {
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

interface NationCardProps {
  nation: NationData
  showProgress?: boolean
}

// 国家等级配置
const nationLevels = [
  { min: -100, name: '死敌', icon: '\ud83d\udc80', color: 'text-[var(--accent-red)]' },
  { min: -75, name: '敌对', icon: '\u2694\ufe0f', color: 'text-[var(--accent-red)]' },
  { min: -50, name: '冷漠', icon: '\u2744\ufe0f', color: 'text-[var(--text-muted)]' },
  { min: -25, name: '疏远', icon: '\ud83d\ude10', color: 'text-[var(--text-muted)]' },
  { min: 0, name: '中立', icon: '\ud83e\udd1d', color: 'text-[var(--text-secondary)]' },
  { min: 25, name: '友好', icon: '\ud83d\ude0a', color: 'text-[var(--accent-green)]' },
  { min: 50, name: '信任', icon: '\ud83e\udd1d', color: 'text-[var(--accent-green)]' },
  { min: 75, name: '尊敬', icon: '\ud83d\ude4f', color: 'text-[var(--accent-gold)]' },
  { min: 90, name: '盟友', icon: '\u2b50', color: 'text-[var(--accent-gold)]' },
]

function getLevelForReputation(rep: number) {
  let result = nationLevels[0]
  for (const level of nationLevels) {
    if (rep >= level.min) {
      result = level
    }
  }
  return result
}

export default function NationCard({ nation, showProgress = false }: NationCardProps) {
  const navigate = useNavigate()
  const reputation = nation.reputation ?? 0
  const level = getLevelForReputation(reputation)

  // 声誉进度条百分比 (-100 ~ +100 → 0 ~ 100%)
  const progressPercent = ((reputation + 100) / 200) * 100

  return (
    <div
      className="card-modern cursor-pointer hover:scale-[1.02] transition-all"
      style={{ borderColor: nation.color + '60' }}
      onClick={() => navigate(`/nations/${nation.id}`)}
    >
      {/* 国家头部 */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{nation.icon}</span>
        <div className="flex-1">
          <h3 className="font-bold text-[var(--text-primary)] font-display" style={{ color: nation.color }}>
            {nation.name}
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
        {nation.playerRank && (
          <div className="text-right">
            <span className="text-xs text-[var(--text-muted)]">排名</span>
            <span className="block text-lg font-bold text-[var(--accent-gold)] font-display">
              #{nation.playerRank}
            </span>
          </div>
        )}
      </div>

      {/* 描述 */}
      <p className="text-xs text-[var(--text-secondary)] mb-3">{nation.description}</p>

      {/* 声誉进度条 */}
      {showProgress && (
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[var(--text-muted)]">声誉</span>
            <span className="font-medium font-display" style={{ color: nation.color }}>
              {reputation}/100
            </span>
          </div>
          <div className="progress-modern">
            <div
              className="progress-fill transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: nation.color
              }}
            />
          </div>
        </div>
      )}

      {/* 成员数 */}
      {nation.memberCount !== undefined && (
        <div className="mt-2 text-xs text-[var(--text-muted)]">
          <span>👥 {nation.memberCount} 成员</span>
        </div>
      )}
    </div>
  )
}
