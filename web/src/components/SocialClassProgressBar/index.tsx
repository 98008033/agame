import { socialClassConfig, type SocialClass } from '../../stores/playerStore'

/**
 * SocialClassProgressBar - 显示6阶层等级进度
 * 包含当前阶层、下一级目标、进度条
 */
interface SocialClassProgressBarProps {
  currentClass: SocialClass
  level: number
  influence: number
  factionLevel: string
}

// 扩展的6阶层配置
const classOrder: SocialClass[] = ['commoner', 'gentry', 'noble', 'royalty']

const classRequirements: Record<string, { label: string; level: number; influence: number; factionLevel?: string }> = {
  commoner: { label: '平民', level: 1, influence: 0 },
  gentry: { label: '绅士', level: 5, influence: 50 },
  noble: { label: '贵族', level: 10, influence: 200, factionLevel: 'member' },
  royalty: { label: '王族', level: 20, influence: 500, factionLevel: 'leader' },
}

export default function SocialClassProgressBar({ currentClass, level, influence, factionLevel }: SocialClassProgressBarProps) {
  const currentIndex = classOrder.indexOf(currentClass)
  const nextClass = classOrder[currentIndex + 1]
  const nextReq = nextClass ? classRequirements[nextClass] : null

  // 计算当前阶层到下一阶层的进度
  let progress = 100
  if (nextReq) {
    const levelProgress = Math.min(level / nextReq.level, 1)
    const influenceProgress = Math.min(influence / nextReq.influence, 1)
    progress = Math.round(((levelProgress + influenceProgress) / 2) * 100)
  }

  const config = socialClassConfig[currentClass]

  return (
    <div className="card-modern">
      <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4 font-display">【社会阶层】</h3>

      {/* 当前阶层 */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{config.icon}</span>
        <div>
          <span className="text-lg font-bold text-[var(--accent-gold)] font-display">{config.name}</span>
          <p className="text-xs text-[var(--text-muted)]">当前阶层</p>
        </div>
      </div>

      {/* 进度条 */}
      {nextReq ? (
        <div>
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-2">
            <span>{config.name}</span>
            <span>→</span>
            <span>{classRequirements[nextClass].label}</span>
          </div>
          <div className="progress-modern mb-2">
            <div
              className="progress-fill progress-fill-gold"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            等级: {level}/{nextReq.level} · 影响力: {influence}/{nextReq.influence}
          </p>
          {nextReq.factionLevel && (
            <p className="text-xs text-[var(--text-muted)]">
              阵营地位: {factionLevel} / {nextReq.factionLevel} (需要)
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-[var(--accent-gold)] text-center">已达最高阶层</p>
      )}
    </div>
  )
}
