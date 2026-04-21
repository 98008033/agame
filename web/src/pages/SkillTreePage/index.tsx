import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { playerApi } from '../../services'
import { UserAvatarMenu, LanguageSwitcher } from '../../components'

// 技能线颜色
const skillLineColors: Record<string, string> = {
  strategy: '#4CAF50',
  combat: '#A1887F',
  commerce: '#FFB74D',
  survival: '#8D6E63',
}

const skillLineNameKeys: Record<string, string> = {
  strategy: 'skilltree.strategy',
  combat: 'skilltree.combat',
  commerce: 'skilltree.commerce',
  survival: 'skilltree.survival',
}

const categoryKeys: Array<{ key: string; tKey: string }> = [
  { key: 'all', tKey: 'common.all' },
  { key: 'strategy', tKey: 'skilltree.strategy' },
  { key: 'combat', tKey: 'skilltree.combat' },
  { key: 'commerce', tKey: 'skilltree.commerce' },
  { key: 'survival', tKey: 'skilltree.survival' },
]

// 技能树布局定义 - 水平展开
interface SkillNodeLayout {
  id: string
  x: number
  y: number
}

const NODE_W = 180
const NODE_H = 80

function getLayout(): SkillNodeLayout[] {
  // 3 rows, wider horizontal spread for web-friendly layout
  const startY = 70
  const rowH = 220
  const colGap = 260

  return [
    // Row 0: Survival (center)
    { id: 'survival', x: 410, y: startY },
    // Row 1: Tier 1 - wider spacing
    { id: 'strategy.intelligenceAnalysis', x: 150, y: startY + rowH },
    { id: 'combat.combatTechnique', x: 410, y: startY + rowH },
    { id: 'commerce.trade', x: 670, y: startY + rowH },
    // Row 2: Tier 2
    { id: 'strategy.politicalManipulation', x: 150, y: startY + rowH * 2 },
    { id: 'combat.militaryCommand', x: 410, y: startY + rowH * 2 },
    { id: 'commerce.industryManagement', x: 670, y: startY + rowH * 2 },
  ]
}

const connections: Array<{ from: string; to: string }> = [
  { from: 'survival', to: 'strategy.intelligenceAnalysis' },
  { from: 'survival', to: 'combat.combatTechnique' },
  { from: 'survival', to: 'commerce.trade' },
  { from: 'strategy.intelligenceAnalysis', to: 'strategy.politicalManipulation' },
  { from: 'combat.combatTechnique', to: 'combat.militaryCommand' },
  { from: 'commerce.trade', to: 'commerce.industryManagement' },
]

interface SkillData {
  id: string
  name: string
  nameEn: string
  description: string
  category: string
  maxLevel: number
  currentLevel: number
  currentExp: number
  expForNext: number
  unlocked: boolean
  canUnlock: boolean
  unlockReason?: string
  prerequisites: Array<{ skillId: string; minLevel: number }>
  subLevels: Array<{ level: number; title: string; description: string }>
}

interface SkillDetail {
  definition: {
    id: string
    name: string
    nameEn: string
    description: string
    category: string
    maxLevel: number
    prerequisites: Array<{ skillId: string; minLevel: number }>
    subLevels: Array<{ level: number; title: string; description: string }>
  }
  currentLevel: number
  currentExp: number
  expForNext: number
  unlocked: boolean
  canUnlock: boolean
  unlockReason?: string
  expHistory: Array<{ level: number; exp: number }>
}

export default function SkillTreePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [skills, setSkills] = useState<SkillData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null)
  const [detail, setDetail] = useState<SkillDetail | null>(null)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [unlockMsg, setUnlockMsg] = useState<string | null>(null)

  const loadTree = useCallback(async () => {
    try {
      const res = await playerApi.getSkillTree()
      if (res.data.success) {
        setSkills(res.data.data.skills || [])
      }
    } catch (err) {
      console.error('Failed to load skill tree:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTree()
  }, [loadTree])

  const loadDetail = async (skillId: string) => {
    try {
      const res = await playerApi.getSkillDetail(skillId)
      if (res.data.success) {
        setDetail(res.data.data)
        setSelectedSkill(skillId)
      }
    } catch (err) {
      console.error('Failed to load skill detail:', err)
    }
  }

  const handleUnlock = async () => {
    if (!selectedSkill || isUnlocking) return
    setIsUnlocking(true)
    setUnlockMsg(null)
    try {
      const res = await playerApi.unlockSkill(selectedSkill)
      if (res.data.success) {
        setUnlockMsg(res.data.data.message)
        loadTree()
        loadDetail(selectedSkill)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('skilltree.unlockFailed')
      setUnlockMsg(message)
    } finally {
      setIsUnlocking(false)
    }
  }

  const layout = getLayout()
  const layoutMap = new Map(layout.map(n => [n.id, n]))
  const filteredSkills = activeCategory === 'all'
    ? skills
    : skills.filter(s => s.category === activeCategory)
  const filteredIds = new Set(filteredSkills.map(s => s.id))

  const getStatusColor = (skill: SkillData) => {
    if (skill.unlocked) return '#4CAF50'
    if (skill.canUnlock) return '#FFB74D'
    return '#4A4A5A'
  }

  const selectedSkillData = skills.find(s => s.id === selectedSkill)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-[var(--text-muted)] text-lg">{t('common.loadingSkillTree')}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="header-modern">
        <div className="container-wide flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-modern text-sm"
            >
              ↩ {t('common.back')}
            </button>
            <h1 className="text-xl font-bold text-[var(--text-primary)] font-display">{t('skilltree.title')}</h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <UserAvatarMenu />
          </div>
        </div>
      </header>

      {/* Main Content - Two Column Layout on Desktop */}
      <main className="max-w-[1200px] mx-auto px-4 py-6">
        {/* 分类筛选 */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {categoryKeys.map(({ key, tKey }) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`px-4 py-2 rounded-lg text-base font-medium transition-all ${
                activeCategory === key
                  ? 'text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              style={activeCategory === key && key !== 'all'
                ? { backgroundColor: skillLineColors[key] }
                : activeCategory === key
                  ? { backgroundColor: 'var(--accent-purple)' }
                  : {}
              }
            >
              {t(tKey)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 技能树 SVG - 占2列 */}
          <div className="lg:col-span-2">
            <div className="card-modern p-4">
              <svg
                viewBox="0 0 1100 600"
                className="w-full h-auto"
                style={{ minWidth: 400 }}
              >
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* 连线 */}
                {connections.map((conn, idx) => {
                  const from = layoutMap.get(conn.from)
                  const to = layoutMap.get(conn.to)
                  if (!from || !to) return null
                  const fromSkill = skills.find(s => s.id === conn.from)
                  const toSkill = skills.find(s => s.id === conn.to)

                  // 连线颜色
                  let color = '#4A4A5A'
                  if (fromSkill?.unlocked && toSkill?.unlocked) color = skillLineColors[fromSkill.category] || '#4A4A5A'
                  else if (fromSkill?.unlocked && toSkill?.canUnlock) color = '#FFB74D'

                  // 连线透明度
                  const opacity = fromSkill?.unlocked ? 1 : 0.3

                  const x1 = from.x + NODE_W / 2
                  const y1 = from.y + NODE_H
                  const x2 = to.x + NODE_W / 2
                  const y2 = to.y
                  const midY = (y1 + y2) / 2

                  return (
                    <path
                      key={idx}
                      d={`M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`}
                      fill="none"
                      stroke={color}
                      strokeWidth={2}
                      opacity={opacity}
                      strokeDasharray={fromSkill?.unlocked ? 'none' : '5,5'}
                    />
                  )
                })}

                {/* 节点 */}
                {layout.map(node => {
                  const skill = skills.find(s => s.id === node.id)
                  if (!skill) return null
                  if (!filteredIds.has(skill.id)) return null

                  const color = getStatusColor(skill)
                  const isSelected = selectedSkill === skill.id
                  const lineColor = skillLineColors[skill.category] || '#4A4A5A'

                  return (
                    <g
                      key={node.id}
                      onClick={() => loadDetail(skill.id)}
                      className="cursor-pointer"
                      style={{ transition: 'transform 0.2s' }}
                    >
                      {/* 节点背景 */}
                      <rect
                        x={node.x}
                        y={node.y}
                        width={NODE_W}
                        height={NODE_H}
                        rx={10}
                        fill={skill.unlocked ? `${lineColor}20` : 'var(--bg-secondary)'}
                        stroke={color}
                        strokeWidth={isSelected ? 3 : 2}
                        filter={skill.canUnlock ? 'url(#glow)' : undefined}
                      />
                      {/* 技能名称 */}
                      <text
                        x={node.x + NODE_W / 2}
                        y={node.y + 30}
                        textAnchor="middle"
                        fill={skill.unlocked ? color : '#9E9E9E'}
                        fontSize={17}
                        fontWeight={skill.unlocked ? 'bold' : 'normal'}
                        fontFamily="inherit"
                      >
                        {skill.name}
                      </text>
                      {/* 等级 */}
                      <text
                        x={node.x + NODE_W / 2}
                        y={node.y + 55}
                        textAnchor="middle"
                        fill={skill.unlocked ? color : '#666'}
                        fontSize={14}
                        fontFamily="inherit"
                      >
                        {skill.unlocked
                          ? `Lv.${skill.currentLevel}`
                          : skill.canUnlock
                            ? t('skilltree.legend_canUnlock')
                            : t('skilltree.legend_locked')}
                      </text>
                    </g>
                  )
                })}
              </svg>

              {/* 图例 */}
              <div className="flex gap-4 mt-4 justify-center text-sm text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-4 h-4 rounded" style={{ backgroundColor: '#4CAF50' }} />
                  {t('skilltree.legend_unlocked')}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-4 h-4 rounded" style={{ backgroundColor: '#FFB74D' }} />
                  {t('skilltree.legend_canUnlock')}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-4 h-4 rounded" style={{ backgroundColor: '#4A4A5A' }} />
                  {t('skilltree.legend_locked')}
                </span>
              </div>
            </div>
          </div>

          {/* 技能详情侧边栏 - 占1列 */}
          <div className="lg:col-span-1">
            {detail ? (
              <div className="card-modern sticky top-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold font-display" style={{ color: getStatusColor(selectedSkillData!) }}>
                      {detail.definition.name}
                    </h2>
                    <p className="text-sm text-[var(--text-muted)]">{detail.definition.nameEn}</p>
                  </div>
                  <button
                    onClick={() => { setSelectedSkill(null); setDetail(null) }}
                    className="btn-modern text-sm"
                  >
                    {t('common.close')}
                  </button>
                </div>

                <p className="text-[var(--text-secondary)] mb-4">{detail.definition.description}</p>

                {/* 标签 */}
                <div className="flex gap-2 mb-4 flex-wrap">
                  <span className="tag-modern px-3 py-1.5 text-sm" style={{ backgroundColor: skillLineColors[detail.definition.category] + '30', color: skillLineColors[detail.definition.category] }}>
                    {t(skillLineNameKeys[detail.definition.category])}
                  </span>
                  {detail.unlocked && (
                    <span className="tag-modern px-3 py-1.5 text-sm" style={{ backgroundColor: '#4CAF5030', color: '#4CAF50' }}>
                      {t('skilltree.legend_unlocked')}
                    </span>
                  )}
                  {detail.canUnlock && (
                    <span className="tag-modern px-3 py-1.5 text-sm" style={{ backgroundColor: '#FFB74D30', color: '#FFB74D' }}>
                      {t('skilltree.legend_canUnlock')}
                    </span>
                  )}
                </div>

                {/* 当前等级与EXP */}
                {detail.unlocked && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-[var(--text-secondary)]">
                        {t('status.currentLevel', { level: detail.currentLevel })}
                      </span>
                      <span className="text-sm text-[var(--text-muted)]">
                        {t('skilltree.currentExp', { current: detail.currentExp, next: detail.expForNext })}
                      </span>
                    </div>
                    <div className="progress-modern">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${detail.expForNext > 0 ? Math.min((detail.currentExp / detail.expForNext) * 100, 100) : 100}%`,
                          backgroundColor: skillLineColors[detail.definition.category]
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* 前置条件 */}
                {detail.definition.prerequisites.length > 0 && (
                  <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2 font-display">{t('skilltree.prerequisites')}</h4>
                    {detail.definition.prerequisites.map((pr, idx) => {
                      const prereqSkill = skills.find(s => s.id === pr.skillId)
                      const met = prereqSkill ? prereqSkill.unlocked && prereqSkill.currentLevel >= pr.minLevel : false
                      const prereqDef = prereqSkill
                      return (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <span className={met ? 'text-[var(--accent-green)]' : 'text-[var(--text-muted)]'}>
                            {met ? '\u2713' : '\u2717'} {prereqDef?.name ?? pr.skillId} {t('skilltree.reachedLevel', { level: pr.minLevel })}
                          </span>
                        </div>
                      )
                    })}
                    {detail.unlockReason && !detail.canUnlock && !detail.unlocked && (
                      <p className="text-sm text-[var(--accent-red)] mt-2">{detail.unlockReason}</p>
                    )}
                  </div>
                )}

                {/* 解锁按钮 */}
                {!detail.unlocked && detail.canUnlock && (
                  <button
                    onClick={handleUnlock}
                    disabled={isUnlocking}
                    className="btn-modern w-full py-3 font-medium disabled:opacity-50"
                    style={{ borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }}
                  >
                    {isUnlocking ? t('skilltree.unlocking') : t('skilltree.unlockSkill')}
                  </button>
                )}

                {/* 解锁消息 */}
                {unlockMsg && (
                  <p className={`text-sm text-center mt-2 ${unlockMsg.startsWith('解锁') ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                    {unlockMsg}
                  </p>
                )}

                {/* 子等级列表 */}
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2 font-display">{t('skilltree.levelDetails')}</h4>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {detail.definition.subLevels.map((sub) => {
                      const isCurrentLevel = detail.unlocked && detail.currentLevel >= sub.level
                      const isFutureLevel = detail.unlocked && detail.currentLevel < sub.level
                      return (
                        <div
                          key={sub.level}
                          className="flex items-center gap-3 p-3 rounded-lg text-sm"
                          style={{
                            backgroundColor: isCurrentLevel ? `${skillLineColors[detail.definition.category]}15` : 'transparent',
                            opacity: isFutureLevel ? 0.5 : 1,
                          }}
                        >
                          <span
                            className="w-14 text-center font-medium text-base"
                            style={{ color: isCurrentLevel ? skillLineColors[detail.definition.category] : 'var(--text-muted)' }}
                          >
                            Lv.{sub.level}
                          </span>
                          <span className="font-medium text-[var(--text-primary)]">{sub.title}</span>
                          <span className="text-[var(--text-muted)] truncate">{sub.description}</span>
                          {isCurrentLevel && <span className="text-[var(--accent-green)] ml-auto">\u2713</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="card-modern sticky top-4 text-center py-16 px-6">
                <span className="text-5xl mb-4 block">🌳</span>
                <p className="text-[var(--text-muted)]">{t('skilltree.clickNodeHint')}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
