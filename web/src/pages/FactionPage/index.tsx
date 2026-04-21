import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { worldApi } from '../../services'
import FactionCard from '../../components/FactionCard'
import { UserAvatarMenu } from '../../components'

// 派系配置
const factionConfig = {
  canglong: { name: '苍龙帝国', icon: '🐉', color: 'var(--faction-canglong)', description: '东方巨龙帝国，拥有悠久的历史和强大的军事力量。以武力和秩序统治大陆。' },
  shuanglang: { name: '霜狼联邦', icon: '🐺', color: 'var(--faction-shuanglang)', description: '北方游牧部落联盟，崇尚自由和力量。善于贸易和外交。' },
  jinque: { name: '金雀花王国', icon: '🌸', color: 'var(--faction-jinque)', description: '西方魔法王国，拥有先进的文化和科技。注重知识和艺术。' },
  border: { name: '边境联盟', icon: '🏘️', color: 'var(--faction-border)', description: '南方边境各城的松散联盟。务实且灵活，重视生存和独立。' },
}

// 派系等级徽章配置
const factionLevelBadges = [
  { min: -100, name: '死敌', color: 'bg-[var(--accent-red)]', textColor: 'text-white' },
  { min: -75, name: '敌对', color: 'bg-[var(--accent-red)]/80', textColor: 'text-white' },
  { min: -50, name: '冷漠', color: 'bg-[var(--text-muted)]/50', textColor: 'text-[var(--text-primary)]' },
  { min: -25, name: '疏远', color: 'bg-[var(--text-muted)]/30', textColor: 'text-[var(--text-secondary)]' },
  { min: 0, name: '中立', color: 'bg-[var(--bg-elevated)]', textColor: 'text-[var(--text-secondary)]' },
  { min: 25, name: '友好', color: 'bg-[var(--accent-green)]/30', textColor: 'text-[var(--accent-green)]' },
  { min: 50, name: '信任', color: 'bg-[var(--accent-green)]/50', textColor: 'text-white' },
  { min: 75, name: '尊敬', color: 'bg-[var(--accent-gold)]/50', textColor: 'text-[var(--accent-gold)]' },
  { min: 90, name: '盟友', color: 'bg-[var(--accent-gold)]', textColor: 'text-white' },
]

function getLevelBadge(rep: number) {
  let result = factionLevelBadges[0]
  for (const badge of factionLevelBadges) {
    if (rep >= badge.min) result = badge
  }
  return result
}

// 列表页
function FactionList() {
  const navigate = useNavigate()
  const [factions, setFactions] = useState<Array<{
    id: string
    name: string
    icon: string
    color: string
    description: string
    reputation?: number
    playerRank?: number
    memberCount?: number
  }>>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadFactions = async () => {
      try {
        // 获取所有派系信息
        const results = await Promise.allSettled(
          Object.entries(factionConfig).map(async ([id, config]) => {
            try {
              const response = await worldApi.getFaction(id)
              if (response.data.success) {
                const data = response.data.data
                return {
                  id,
                  name: data.name || config.name,
                  icon: config.icon,
                  color: config.color,
                  description: data.description || config.description,
                  reputation: data.reputation ?? 0,
                  memberCount: data.memberCount,
                }
              }
            } catch {
              // API未就绪，返回配置数据
            }
            return {
              id,
              name: config.name,
              icon: config.icon,
              color: config.color,
              description: config.description,
            }
          })
        )

        const factionList = results
          .filter((r): r is PromiseFulfilledResult<unknown> => r.status === 'fulfilled')
          .map((r) => r.value as { id: string; name: string; icon: string; color: string; description: string; reputation?: number; memberCount?: number })

        setFactions(factionList)
      } catch (error) {
        console.error('Failed to load factions:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadFactions()
  }, [])

  if (isLoading) {
    return (
      <div className="text-center py-8 text-[var(--text-muted)]">加载中...</div>
    )
  }

  return (
    <div className="space-y-4">
      {factions.map((faction) => (
        <FactionCard key={faction.id} faction={faction} showProgress />
      ))}
    </div>
  )
}

// 详情页
function FactionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const config = id ? factionConfig[id as keyof typeof factionConfig] : null

  const [factionData, setFactionData] = useState<{
    reputation: number
    memberCount?: number
    members?: Array<{ name: string; rank: number; reputation: number }>
    leaderboard?: Array<{ name: string; rank: number; reputation: number; level: number }>
    description: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!id || !config) return

    const loadFactionDetail = async () => {
      try {
        const response = await worldApi.getFaction(id)
        if (response.data.success) {
          const data = response.data.data
          setFactionData({
            reputation: data.reputation ?? 0,
            memberCount: data.memberCount,
            members: data.members,
            leaderboard: data.leaderboard,
            description: data.description || config.description,
          })
        }
      } catch (error) {
        console.error('Failed to load faction detail:', error)
        // 使用默认数据
        setFactionData({
          reputation: 0,
          description: config.description,
        })
      } finally {
        setIsLoading(false)
      }
    }
    loadFactionDetail()
  }, [id])

  if (!config) {
    return (
      <div className="text-center py-8">
        <p className="text-[var(--text-muted)]">派系不存在</p>
        <button onClick={() => navigate('/factions')} className="btn-modern mt-4">返回派系列表</button>
      </div>
    )
  }

  if (isLoading) {
    return <div className="text-center py-8 text-[var(--text-muted)]">加载中...</div>
  }

  const reputation = factionData?.reputation ?? 0
  const badge = getLevelBadge(reputation)
  const progressPercent = ((reputation + 100) / 200) * 100

  return (
    <div className="space-y-4">
      {/* 返回按钮 */}
      <button onClick={() => navigate('/factions')} className="btn-modern text-sm">
        ← 返回派系列表
      </button>

      {/* 派系信息 */}
      <div className="card-modern" style={{ borderColor: config.color + '60' }}>
        <div className="flex items-center gap-4 mb-4">
          <span className="text-4xl">{config.icon}</span>
          <div>
            <h2 className="text-xl font-bold font-display" style={{ color: config.color }}>
              {config.name}
            </h2>
            {/* 等级徽章 */}
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium font-display mt-1 ${badge.color} ${badge.textColor}`}>
              {badge.name}
            </div>
          </div>
        </div>

        <p className="text-sm text-[var(--text-secondary)] mb-4">{factionData?.description || config.description}</p>

        {/* 声誉进度 */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[var(--text-muted)]">声誉</span>
            <span className="font-bold font-display" style={{ color: config.color }}>
              {reputation}/100
            </span>
          </div>
          <div className="progress-modern" style={{ height: '12px' }}>
            <div
              className="progress-fill transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: config.color
              }}
            />
          </div>
        </div>

        {/* 成员数 */}
        {factionData?.memberCount !== undefined && (
          <p className="text-xs text-[var(--text-muted)]">👥 {factionData.memberCount} 成员</p>
        )}
      </div>

      {/* 排行榜 TOP10 */}
      {factionData?.leaderboard && factionData.leaderboard.length > 0 ? (
        <div className="card-modern">
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 font-display">【排行榜 TOP10】</h3>
          <div className="space-y-2">
            {factionData.leaderboard.slice(0, 10).map((member, index) => (
              <div
                key={member.name}
                className={`flex items-center justify-between p-2 rounded-lg ${
                  index < 3 ? 'bg-[var(--bg-secondary)]' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 text-center font-bold font-display ${
                    index === 0 ? 'text-[var(--accent-gold)]' :
                    index === 1 ? 'text-[var(--text-secondary)]' :
                    index === 2 ? 'text-orange-600' :
                    'text-[var(--text-muted)]'
                  }`}>
                    {index + 1}
                  </span>
                  <span className="font-medium text-[var(--text-primary)]">{member.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-[var(--text-muted)]">Lv.{member.level}</span>
                  <span className="ml-2 text-sm font-bold font-display" style={{ color: config.color }}>
                    {member.reputation}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card-modern-alt text-center py-6">
          <p className="text-sm text-[var(--text-muted)]">暂无排行榜数据</p>
        </div>
      )}

      {/* 成员列表 */}
      {factionData?.members && factionData.members.length > 0 ? (
        <div className="card-modern">
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 font-display">【成员列表】</h3>
          <div className="space-y-2">
            {factionData.members.map((member) => {
              const memberBadge = getLevelBadge(member.reputation)
              return (
                <div key={member.name} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-secondary)]">
                  <div className="flex items-center gap-3">
                    <span className="text-[var(--text-muted)] font-medium">#{member.rank}</span>
                    <span className="font-medium text-[var(--text-primary)]">{member.name}</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${memberBadge.color} ${memberBadge.textColor}`}>
                    {memberBadge.name} ({member.reputation})
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="card-modern-alt text-center py-6">
          <p className="text-sm text-[var(--text-muted)]">暂无成员数据</p>
        </div>
      )}
    </div>
  )
}

// 主页面
export default function FactionPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="header-modern">
        <div className="container-modern flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-[var(--text-primary)] font-display">
              {id ? '派系详情' : '派系总览'}
            </h1>
          </div>
          <UserAvatarMenu />
        </div>
      </header>

      <main className="container-modern py-6">
        {id ? <FactionDetail /> : <FactionList />}
      </main>
    </div>
  )
}
