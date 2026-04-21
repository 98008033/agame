import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { playerApi } from '../../services'
import { UserAvatarMenu } from '../../components'

// 技能线颜色
const skillLineColors: Record<string, string> = {
  strategy: '#4CAF50',
  combat: '#A1887F',
  commerce: '#FFB74D',
  survival: '#8D6E63',
}

const skillLineNames: Record<string, string> = {
  strategy: '谋略',
  combat: '武力',
  commerce: '经营',
  survival: '生存',
}

const categoryNames: Record<string, string> = {
  all: '全部',
  strategy: '谋略',
  combat: '武力',
  commerce: '经营',
  survival: '生存',
}

// 技能树布局定义
interface SkillNodeLayout {
  id: string
  x: number
  y: number
}

const NODE_W = 140
const NODE_H = 60

function getLayout(): SkillNodeLayout[] {
  // 4 rows: survival(root) -> tier1(3) -> tier2(3)
  const gap = 200
  const startY = 40
  const rowH = 160

  return [
    // Row 0: Survival (center)
    { id: 'survival', x: 370, y: startY },
    // Row 1: Tier 1
    { id: 'strategy.intelligenceAnalysis', x: 170, y: startY + rowH },
    { id: 'combat.combatTechnique', x: 370, y: startY + rowH },
    { id: 'commerce.trade', x: 570, y: startY + rowH },
    // Row 2: Tier 2
    { id: 'strategy.politicalManipulation', x: 170, y: startY + rowH * 2 },
    { id: 'combat.militaryCommand', x: 370, y: startY + rowH * 2 },
    { id: 'commerce.industryManagement', x: 570, y: startY + rowH * 2 },
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
      const message = err instanceof Error ? err.message : '解锁失败'
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

  const getConnectionColor = (fromId: string, toId: string) => {
    const from = skills.find(s => s.id === fromId)
    const to = skills.find(s => s.id === toId)
    if (!from || !to) return '#4A4A5A'
    if (from.unlocked && to.unlocked) return skillLineColors[from.category] || '#4A4A5A'
    if (from.unlocked && to.canUnlock) return '#FFB74D'
    return '#4A4A5A'
  }

  const getConnectionOpacity = (fromId: string, toId: string) => {
    const from = skills.find(s => s.id === fromId)
    if (!from) return 0.2
    if (from.unlocked) return 1
    return 0.3
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-[var(--text-muted)] text-lg">加载技能树中...</div>
      </div>
    )
  }

  const selectedSkillData = skills.find(s => s.id === selectedSkill)

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="header-modern">
        <div className="container-modern flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-modern text-sm"
            >
              ↩ 返回
            </button>
            <h1 className="text-lg font-bold text-[var(--text-primary)] font-display">技能树</h1>
          </div>
          <UserAvatarMenu />
        </div>
      </header>

      <main className="container-modern py-6">
        {/* 分类筛选 */}
        <div className="flex gap-2 mb-4">
          {Object.entries(categoryNames).map(([key, name]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
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
              {name}
            </button>
          ))}
        </div>

        {/* 技能树 SVG */}
        <div className="card-modern p-4 overflow-x-auto">
          <svg
            width={900}
            height={400}
            viewBox="0 0 900 400"
            className="mx-auto"
            style={{ minWidth: 700 }}
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
              const color = getConnectionColor(conn.from, conn.to)
              const opacity = getConnectionOpacity(conn.from, conn.to)
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
                  strokeDasharray={!from || skills.find(s => s.id === conn.from)?.unlocked ? 'none' : '5,5'}
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
                    rx={8}
                    fill={skill.unlocked ? `${lineColor}20` : 'var(--bg-secondary)'}
                    stroke={color}
                    strokeWidth={isSelected ? 3 : 2}
                    filter={skill.canUnlock ? 'url(#glow)' : undefined}
                  />
                  {/* 技能名称 */}
                  <text
                    x={node.x + NODE_W / 2}
                    y={node.y + 22}
                    textAnchor="middle"
                    fill={skill.unlocked ? color : '#9E9E9E'}
                    fontSize={13}
                    fontWeight={skill.unlocked ? 'bold' : 'normal'}
                    fontFamily="inherit"
                  >
                    {skill.name}
                  </text>
                  {/* 等级 */}
                  <text
                    x={node.x + NODE_W / 2}
                    y={node.y + 42}
                    textAnchor="middle"
                    fill={skill.unlocked ? color : '#666'}
                    fontSize={11}
                    fontFamily="inherit"
                  >
                    {skill.unlocked
                      ? `Lv.${skill.currentLevel}`
                      : skill.canUnlock
                        ? '可解锁'
                        : '未解锁'}
                  </text>
                </g>
              )
            })}
          </svg>

          {/* 图例 */}
          <div className="flex gap-4 mt-4 justify-center text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#4CAF50' }} />
              已解锁
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#FFB74D' }} />
              可解锁
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#4A4A5A' }} />
              未解锁
            </span>
          </div>
        </div>

        {/* 技能详情面板 */}
        {detail && (
          <div className="card-modern mt-4">
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
                关闭
              </button>
            </div>

            <p className="text-[var(--text-secondary)] mb-4">{detail.definition.description}</p>

            {/* 标签 */}
            <div className="flex gap-2 mb-4">
              <span className="tag-modern" style={{ backgroundColor: skillLineColors[detail.definition.category] + '30', color: skillLineColors[detail.definition.category] }}>
                {skillLineNames[detail.definition.category]}
              </span>
              {detail.unlocked && (
                <span className="tag-modern" style={{ backgroundColor: '#4CAF5030', color: '#4CAF50' }}>
                  已解锁
                </span>
              )}
              {detail.canUnlock && (
                <span className="tag-modern" style={{ backgroundColor: '#FFB74D30', color: '#FFB74D' }}>
                  可解锁
                </span>
              )}
            </div>

            {/* 当前等级与EXP */}
            {detail.unlocked && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[var(--text-secondary)]">
                    当前等级: Lv.{detail.currentLevel}
                  </span>
                  <span className="text-sm text-[var(--text-muted)]">
                    {detail.currentExp} / {detail.expForNext} EXP
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
                <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2 font-display">前置条件</h4>
                {detail.definition.prerequisites.map((pr, idx) => {
                  const prereqSkill = skills.find(s => s.id === pr.skillId)
                  const met = prereqSkill ? prereqSkill.unlocked && prereqSkill.currentLevel >= pr.minLevel : false
                  const prereqDef = prereqSkill
                  return (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className={met ? 'text-[var(--accent-green)]' : 'text-[var(--text-muted)]'}>
                        {met ? '\u2713' : '\u2717'} {prereqDef?.name ?? pr.skillId} 达到 Lv.{pr.minLevel}
                      </span>
                    </div>
                  )
                })}
                {detail.unlockReason && !detail.canUnlock && !detail.unlocked && (
                  <p className="text-xs text-[var(--accent-red)] mt-2">{detail.unlockReason}</p>
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
                {isUnlocking ? '解锁中...' : '解锁技能'}
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
              <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2 font-display">等级详情</h4>
              <div className="space-y-2">
                {detail.definition.subLevels.map((sub) => {
                  const isCurrentLevel = detail.unlocked && detail.currentLevel >= sub.level
                  const isFutureLevel = detail.unlocked && detail.currentLevel < sub.level
                  return (
                    <div
                      key={sub.level}
                      className="flex items-center gap-3 p-2 rounded-lg text-sm"
                      style={{
                        backgroundColor: isCurrentLevel ? `${skillLineColors[detail.definition.category]}15` : 'transparent',
                        opacity: isFutureLevel ? 0.5 : 1,
                      }}
                    >
                      <span
                        className="w-16 text-center font-medium"
                        style={{ color: isCurrentLevel ? skillLineColors[detail.definition.category] : 'var(--text-muted)' }}
                      >
                        Lv.{sub.level}
                      </span>
                      <span className="font-medium text-[var(--text-primary)]">{sub.title}</span>
                      <span className="text-[var(--text-muted)] text-xs">{sub.description}</span>
                      {isCurrentLevel && <span className="text-[var(--accent-green)] ml-auto">\u2713</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
