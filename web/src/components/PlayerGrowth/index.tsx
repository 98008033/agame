import { useTranslation } from 'react-i18next'
import { usePlayerStore, skillDefinitions, skillExpThresholds, socialClassConfig, type SkillId, type SkillCategory, type SocialClass } from '../../stores/playerStore'

// 技能类别配置
const categoryConfig: Record<SkillCategory, { name: string; icon: string; color: string }> = {
  strategy: { name: 'social_class.skillLines.strategy', icon: '🎯', color: 'var(--accent-purple)' },
  combat: { name: 'social_class.skillLines.combat', icon: '⚔️', color: 'var(--accent-red)' },
  business: { name: 'social_class.skillLines.commerce', icon: '💰', color: 'var(--accent-gold)' },
  general: { name: 'social_class.skillLines.general', icon: '🏕️', color: 'var(--accent-green)' },
}

// 社会阶层进度条
function SocialTierBar() {
  const { t } = useTranslation()
  const player = usePlayerStore((s) => s.player)
  const tiers: SocialClass[] = ['commoner', 'gentry', 'noble', 'royalty']
  const currentTierIndex = tiers.indexOf(player.socialClass || 'commoner')

  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[rgba(255,255,255,0.1)]">
      <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3">{t('social_class.title')}</h3>
      <div className="flex items-center gap-2 mb-3">
        {tiers.map((tier, idx) => {
          const config = socialClassConfig[tier]
          const isActive = idx <= currentTierIndex
          return (
            <div key={tier} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isActive
                    ? 'bg-[var(--accent-gold)] text-[var(--bg-primary)]'
                    : 'bg-[var(--bg-card)] text-[var(--text-muted)]'
                }`}
              >
                {config.icon}
              </div>
              {idx < 3 && (
                <div className={`w-8 h-1 ${idx < currentTierIndex ? 'bg-[var(--accent-gold)]' : 'bg-[var(--bg-card)]'}`} />
              )}
            </div>
          )
        })}
      </div>
      <p className="text-sm text-[var(--text-secondary)]">
        {t('social_class.current', { name: socialClassConfig[player.socialClass || 'commoner'].name })}
        {player.socialClass !== 'royalty' && (
          <span className="text-[var(--text-muted)] ml-2">
            ({t('social_class.nextHint', { level: socialClassConfig[tiers[currentTierIndex + 1]].requirements.level })})
          </span>
        )}
      </p>
    </div>
  )
}

// 单个技能卡片
function SkillCard({ skillId }: { skillId: SkillId }) {
  const { t } = useTranslation()
  const player = usePlayerStore((s) => s.player)
  const canUnlockSkill = usePlayerStore((s) => s.canUnlockSkill)
  const unlockSkill = usePlayerStore((s) => s.unlockSkill)

  const definition = skillDefinitions.find((d) => d.id === skillId)
  if (!definition) return null

  const playerSkill = player.skills.find((s) => s.skillId === skillId)
  const isUnlocked = Boolean(playerSkill)
  const level = playerSkill?.level || 0
  const experience = playerSkill?.experience || 0

  const category = categoryConfig[definition.category]
  const maxLevel = definition.maxLevel
  const nextLevelExp = level < maxLevel ? skillExpThresholds[level + 1] : skillExpThresholds[maxLevel]
  const currentLevelExp = skillExpThresholds[level]
  const progressPercent = level >= maxLevel ? 100 : ((experience - currentLevelExp) / (nextLevelExp - currentLevelExp)) * 100

  // 检查是否可以解锁
  const canUnlock = !isUnlocked && canUnlockSkill(skillId)

  // 前置技能名称
  const prereqSkill = definition.prerequisite
    ? skillDefinitions.find((d) => d.id === definition.prerequisite)
    : null

  return (
    <div
      className={`bg-[var(--bg-secondary)] rounded-xl p-3 border ${
        isUnlocked ? 'border-[rgba(255,255,255,0.1)]' : 'border-[rgba(255,255,255,0.05)] opacity-70'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">{definition.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-[var(--text-primary)]">{definition.name}</h4>
            {isUnlocked && (
              <span className="text-sm font-medium" style={{ color: category.color }}>
                L{level}/{maxLevel}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)]">{definition.description}</p>
        </div>
      </div>

      {isUnlocked && (
        <div className="mt-2">
          {/* 进度条 */}
          <div className="h-1.5 bg-[var(--bg-card)] rounded-full overflow-hidden">
            <div
              className="h-full transition-all"
              style={{
                width: `${progressPercent}%`,
                background: category.color,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
            <span>{experience} EXP</span>
            {level < maxLevel ? (
              <span>{t('social_class.nextLevel', { exp: nextLevelExp })}</span>
            ) : (
              <span className="text-[var(--accent-purple)]">{t('social_class.maxLevel')}</span>
            )}
          </div>
        </div>
      )}

      {!isUnlocked && (
        <div className="mt-2 flex items-center justify-between">
          {prereqSkill && (
            <span className="text-xs text-[var(--text-muted)]">
              {t('social_class.skillRequirement', { name: prereqSkill.name, level: definition.prerequisiteLevel })}
            </span>
          )}
          {canUnlock && (
            <button
              onClick={() => unlockSkill(skillId)}
              className="btn-modern text-xs px-3 py-1"
              style={{ borderColor: category.color }}
            >
              {t('social_class.unlock')}
            </button>
          )}
          {!canUnlock && prereqSkill && (
            <span className="text-xs text-[var(--text-muted)]">{t('social_class.notMet')}</span>
          )}
        </div>
      )}
    </div>
  )
}

// 技能路径卡片（显示一个类别的所有技能）
function SkillPathSection({ category }: { category: SkillCategory }) {
  const { t } = useTranslation()
  const config = categoryConfig[category]
  const skillsInCategory = skillDefinitions.filter((d) => d.category === category)

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{config.icon}</span>
        <h3 className="font-bold text-[var(--text-primary)]" style={{ color: config.color }}>
          {t(config.name)}
        </h3>
      </div>
      <div className="space-y-2">
        {skillsInCategory.map((skill) => (
          <SkillCard key={skill.id} skillId={skill.id} />
        ))}
      </div>
    </div>
  )
}

// 成长时间线
function MilestoneTimeline() {
  const { t } = useTranslation()
  const player = usePlayerStore((s) => s.player)
  // 基于玩家等级动态计算里程碑
  const milestones = [
    { level: 1, title: t('social_class.milestones.enter'), icon: '🌟' },
    { level: 5, title: t('social_class.milestones.emerge'), icon: '⭐' },
    { level: 10, title: t('social_class.milestones.famous'), icon: '🌟' },
    { level: 15, title: t('social_class.milestones.renowned'), icon: '💫' },
    { level: 20, title: t('social_class.milestones.legend'), icon: '✨' },
  ]

  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[rgba(255,255,255,0.1)]">
      <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3">{t('social_class.growthMilestones')}</h3>
      <div className="space-y-2">
        {milestones.map((m, idx) => {
          const completed = player.level >= m.level
          const current = player.level >= m.level && (idx === milestones.length - 1 || player.level < milestones[idx + 1].level)
          return (
            <div key={m.level} className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  completed
                    ? 'bg-[var(--accent-green)] text-white'
                    : 'bg-[var(--bg-card)] text-[var(--text-muted)]'
                }`}
              >
                {completed ? m.icon : '○'}
              </div>
              <div className="flex-1">
                <span className={`text-sm ${completed ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                  {m.title}
                </span>
                {current && (
                  <span className="text-xs text-[var(--accent-gold)] ml-2">{t('social_class.current')}</span>
                )}
              </div>
              <span className="text-xs text-[var(--text-muted)]">Lv.{m.level}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// 当前目标（基于技能系统动态生成）
function CurrentGoals() {
  const { t } = useTranslation()
  const player = usePlayerStore((s) => s.player)
  const canUnlockSkill = usePlayerStore((s) => s.canUnlockSkill)

  // 找出可以解锁但未解锁的技能
  const unlockableSkills = skillDefinitions.filter(
    (d) => !player.skills.find((s) => s.skillId === d.id) && canUnlockSkill(d.id)
  )

  // 找出接近升级的技能（经验超过50%）
  const levelingSkills = player.skills.filter((s) => {
    const def = skillDefinitions.find((d) => d.id === s.skillId)
    if (!def || s.level >= def.maxLevel) return false
    const nextExp = skillExpThresholds[s.level + 1]
    const currExp = skillExpThresholds[s.level]
    return s.experience >= currExp + (nextExp - currExp) * 0.5
  })

  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[rgba(255,255,255,0.1)]">
      <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3">{t('social_class.currentGoal')}</h3>
      <ul className="space-y-2 text-sm">
        {unlockableSkills.length > 0 ? (
          unlockableSkills.map((skill) => (
            <li key={skill.id} className="flex items-center gap-2 text-[var(--text-secondary)]">
              <span className="text-[var(--accent-purple)]">•</span>
              {t('social_class.unlockSkill', { name: `${skill.icon} ${skill.name}` })}
            </li>
          ))
        ) : (
          <li className="flex items-center gap-2 text-[var(--text-secondary)]">
            <span className="text-[var(--accent-green)]">•</span>
            {t('social_class.keepExp')}
          </li>
        )}
        {levelingSkills.map((s) => {
          const def = skillDefinitions.find((d) => d.id === s.skillId)
          return def ? (
            <li key={s.skillId} className="flex items-center gap-2 text-[var(--text-secondary)]">
              <span className="text-[var(--accent-gold)]">•</span>
              {def.icon} {def.name} {t('social_class.approachingLevel', { level: s.level + 1 })}
            </li>
          ) : null
        })}
        {player.socialClass !== 'royalty' && (
          <li className="flex items-center gap-2 text-[var(--text-secondary)]">
            <span className="text-[var(--accent-blue)]">•</span>
            {t('social_class.promoteTo', { name: socialClassConfig[
              ['commoner', 'gentry', 'noble', 'royalty'][
                ['commoner', 'gentry', 'noble', 'royalty'].indexOf(player.socialClass || 'commoner') + 1
              ] as SocialClass
            ].name })}
          </li>
        )}
      </ul>
    </div>
  )
}

export default function PlayerGrowth() {
  const { t } = useTranslation()
  const player = usePlayerStore((s) => s.player)

  if (!player || !player.id) {
    return (
      <div className="text-center text-[var(--text-muted)] py-8">
        {t('social_class.noCharacterHint')}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 社会阶层 */}
      <SocialTierBar />

      {/* 三条人生线技能 */}
      <div className="mb-2">
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">{t('social_class.skillTreeTitle')}</h3>
      </div>
      <SkillPathSection category="strategy" />
      <SkillPathSection category="combat" />
      <SkillPathSection category="business" />
      <SkillPathSection category="general" />

      {/* 成长里程碑 */}
      <MilestoneTimeline />

      {/* 当前目标 */}
      <CurrentGoals />
    </div>
  )
}