import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { worldApi } from '../../services'
import NationCard from '../../components/NationCard'
import { UserAvatarMenu } from '../../components'

// 国家配置 (使用 i18n key)
const nationConfig = {
  canglong: { nameKey: 'factions.canglong', icon: '\ud83d\udc09', color: 'var(--faction-canglong)', descKey: 'factions.canglongDesc' },
  shuanglang: { nameKey: 'factions.shuanglang', icon: '\ud83d\udc3a', color: 'var(--faction-shuanglang)', descKey: 'factions.shuanglangDesc' },
  jinque: { nameKey: 'factions.jinque', icon: '\ud83c\udf38', color: 'var(--faction-jinque)', descKey: 'factions.jinqueDesc' },
  border: { nameKey: 'factions.border', icon: '\ud83c\udfd8\ufe0f', color: 'var(--faction-border)', descKey: 'factions.borderDesc' },
}

// 国家等级徽章配置 (使用 i18n key)
const nationLevelBadges = [
  { min: -100, nameKey: 'faction_badges.mortal_enemy', color: 'bg-[var(--accent-red)]', textColor: 'text-white' },
  { min: -75, nameKey: 'faction_badges.hostile', color: 'bg-[var(--accent-red)]/80', textColor: 'text-white' },
  { min: -50, nameKey: 'faction_badges.cold', color: 'bg-[var(--text-muted)]/50', textColor: 'text-[var(--text-primary)]' },
  { min: -25, nameKey: 'faction_badges.distant', color: 'bg-[var(--text-muted)]/30', textColor: 'text-[var(--text-secondary)]' },
  { min: 0, nameKey: 'faction_badges.neutral', color: 'bg-[var(--bg-elevated)]', textColor: 'text-[var(--text-secondary)]' },
  { min: 25, nameKey: 'faction_badges.friendly', color: 'bg-[var(--accent-green)]/30', textColor: 'text-[var(--accent-green)]' },
  { min: 50, nameKey: 'faction_badges.trusted', color: 'bg-[var(--accent-green)]/50', textColor: 'text-white' },
  { min: 75, nameKey: 'faction_badges.respected', color: 'bg-[var(--accent-gold)]/50', textColor: 'text-[var(--accent-gold)]' },
  { min: 90, nameKey: 'faction_badges.ally', color: 'bg-[var(--accent-gold)]', textColor: 'text-white' },
]

function getLevelBadge(rep: number) {
  let result = nationLevelBadges[0]
  for (const badge of nationLevelBadges) {
    if (rep >= badge.min) result = badge
  }
  return result
}

// 列表页
function NationList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [nations, setNations] = useState<Array<{
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
    const loadNations = async () => {
      try {
        const results = await Promise.allSettled(
          Object.entries(nationConfig).map(async ([id, config]) => {
            try {
              const response = await worldApi.getFaction(id)
              if (response.data.success) {
                const data = response.data.data
                return {
                  id,
                  name: data.name || t(config.nameKey),
                  icon: config.icon,
                  color: config.color,
                  description: data.description || t(config.descKey),
                  reputation: data.reputation ?? 0,
                  memberCount: data.memberCount,
                }
              }
            } catch {
              // Fallback to config
            }
            return {
              id,
              name: t(config.nameKey),
              icon: config.icon,
              color: config.color,
              description: t(config.descKey),
            }
          })
        )

        const nationList = results
          .filter((r): r is PromiseFulfilledResult<unknown> => r.status === 'fulfilled')
          .map((r) => r.value as { id: string; name: string; icon: string; color: string; description: string; reputation?: number; memberCount?: number })

        setNations(nationList)
      } catch (error) {
        console.error('Failed to load nations:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadNations()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isLoading) {
    return (
      <div className="text-center py-8 text-[var(--text-muted)]">{t('common.loading')}</div>
    )
  }

  return (
    <div className="space-y-4">
      {nations.map((nation) => (
        <NationCard key={nation.id} nation={nation} showProgress />
      ))}
    </div>
  )
}

// 详情页
function NationDetail() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const config = id ? nationConfig[id as keyof typeof nationConfig] : null

  const [nationData, setNationData] = useState<{
    reputation: number
    memberCount?: number
    members?: Array<{ name: string; rank: number; reputation: number }>
    leaderboard?: Array<{ name: string; rank: number; reputation: number; level: number }>
    description: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!id || !config) return

    const loadNationDetail = async () => {
      try {
        const response = await worldApi.getFaction(id)
        if (response.data.success) {
          const data = response.data.data
          setNationData({
            reputation: data.reputation ?? 0,
            memberCount: data.memberCount,
            members: data.members,
            leaderboard: data.leaderboard,
            description: data.description || t(config.descKey),
          })
        }
      } catch (error) {
        console.error('Failed to load nation detail:', error)
        setNationData({
          reputation: 0,
          description: t(config.descKey),
        })
      } finally {
        setIsLoading(false)
      }
    }
    loadNationDetail()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!config) {
    return (
      <div className="text-center py-8">
        <p className="text-[var(--text-muted)]">{t('common.error')}</p>
        <button onClick={() => navigate('/nations')} className="btn-modern mt-4">{t('common.backToList')}</button>
      </div>
    )
  }

  if (isLoading) {
    return <div className="text-center py-8 text-[var(--text-muted)]">{t('common.loading')}</div>
  }

  const reputation = nationData?.reputation ?? 0
  const badge = getLevelBadge(reputation)
  const progressPercent = ((reputation + 100) / 200) * 100

  return (
    <div className="space-y-4">
      {/* 返回按钮 */}
      <button onClick={() => navigate('/nations')} className="btn-modern text-sm">
        {'\u2190 '}{t('common.backToList')}
      </button>

      {/* 国家信息 */}
      <div className="card-modern" style={{ borderColor: config.color + '60' }}>
        <div className="flex items-center gap-4 mb-4">
          <span className="text-4xl">{config.icon}</span>
          <div>
            <h2 className="text-xl font-bold font-display" style={{ color: config.color }}>
              {t(config.nameKey)}
            </h2>
            {/* 等级徽章 */}
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium font-display mt-1 ${badge.color} ${badge.textColor}`}>
              {t(badge.nameKey)}
            </div>
          </div>
        </div>

        <p className="text-sm text-[var(--text-secondary)] mb-4">{nationData?.description || t(config.descKey)}</p>

        {/* 声誉进度 */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[var(--text-muted)]">{t('attributes.fame')}</span>
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
        {nationData?.memberCount !== undefined && (
          <p className="text-xs text-[var(--text-muted)]">{t('faction_levels.member')}: {nationData.memberCount}</p>
        )}
      </div>

      {/* 排行榜 TOP10 */}
      {nationData?.leaderboard && nationData.leaderboard.length > 0 ? (
        <div className="card-modern">
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 font-display">{'\u3010'}{t('news.title')} TOP10{'\u3011'}</h3>
          <div className="space-y-2">
            {nationData.leaderboard.slice(0, 10).map((member, index) => (
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
          <p className="text-sm text-[var(--text-muted)]">{t('common.noData')}</p>
        </div>
      )}

      {/* 成员列表 */}
      {nationData?.members && nationData.members.length > 0 ? (
        <div className="card-modern">
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 font-display">{'\u3010'}{t('event_history.eventList')}{'\u3011'}</h3>
          <div className="space-y-2">
            {nationData.members.map((member) => {
              const memberBadge = getLevelBadge(member.reputation)
              return (
                <div key={member.name} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-secondary)]">
                  <div className="flex items-center gap-3">
                    <span className="text-[var(--text-muted)] font-medium">#{member.rank}</span>
                    <span className="font-medium text-[var(--text-primary)]">{member.name}</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${memberBadge.color} ${memberBadge.textColor}`}>
                    {t(memberBadge.nameKey)} ({member.reputation})
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="card-modern-alt text-center py-6">
          <p className="text-sm text-[var(--text-muted)]">{t('common.noData')}</p>
        </div>
      )}
    </div>
  )
}

// 主页面
export default function NationPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="header-modern">
        <div className="container-modern flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-[var(--text-primary)] font-display">
              {t('dashboard.quickEntries.nations')}
            </h1>
          </div>
          <UserAvatarMenu />
        </div>
      </header>

      <main className="container-modern py-6">
        {id ? <NationDetail /> : <NationList />}
      </main>
    </div>
  )
}
