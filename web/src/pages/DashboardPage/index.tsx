import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { usePlayerStore } from '../../stores/playerStore'
import { useGameStore } from '../../stores/gameStore'
import { actionApi, playerApi } from '../../services'
import { UserAvatarMenu, LanguageSwitcher, DashboardEntryCard } from '../../components'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const player = usePlayerStore((s) => s.player)
  const currentDay = useGameStore((s) => s.currentDay)
  const historyStage = useGameStore((s) => s.historyStage)

  const hasCharacter = !!player.id

  // AP状态
  const { data: apStatus } = useQuery({
    queryKey: ['ap-status-dashboard'],
    queryFn: async () => {
      if (!hasCharacter) return null
      const response = await actionApi.getStatus()
      if (response.data.success) return response.data.data
      return null
    },
    enabled: hasCharacter,
  })

  // 最近决策历史
  const { data: recentHistory } = useQuery({
    queryKey: ['player-history-dashboard'],
    queryFn: async () => {
      if (!hasCharacter) return []
      const response = await playerApi.getHistory(undefined, 3)
      if (response.data.success) return response.data.data.history || []
      return []
    },
    enabled: hasCharacter,
  })

  const modules = [
    {
      id: 'plan',
      title: t('dashboard.modules.plan.title'),
      desc: t('dashboard.modules.plan.desc'),
      icon: '📋',
      path: '/plan',
      accent: 'var(--accent-purple)',
      highlight: true,
    },
    {
      id: 'news',
      title: t('dashboard.modules.news.title'),
      desc: t('dashboard.modules.news.desc'),
      icon: '📰',
      path: '/news',
      accent: 'var(--accent-blue)'
    },
    {
      id: 'status',
      title: t('dashboard.modules.status.title'),
      desc: t('dashboard.modules.status.desc'),
      icon: '👤',
      path: '/status',
      accent: 'var(--accent-green)'
    },
    {
      id: 'novel',
      title: t('dashboard.modules.novel.title'),
      desc: t('dashboard.modules.novel.desc'),
      icon: '📖',
      path: '/novel',
      accent: 'var(--accent-gold)'
    },
    {
      id: 'game',
      title: t('dashboard.modules.game.title'),
      desc: t('dashboard.modules.game.desc'),
      icon: '⚔️',
      path: '/game',
      accent: 'var(--accent-red)'
    },
  ]

  // 快捷入口 - 仅在有角色时显示
  const quickEntries = hasCharacter ? [
    { id: 'actions', title: t('dashboard.quickEntries.actions'), icon: '🎯', path: '/actions', accent: 'var(--accent-purple)' },
    { id: 'dialog', title: t('dashboard.quickEntries.dialog'), icon: '💬', path: '/dialog', accent: 'var(--accent-blue)' },
    { id: 'event-history', title: t('dashboard.quickEntries.eventHistory'), icon: '📜', path: '/event-history', accent: 'var(--accent-gold)' },
    { id: 'factions', title: t('dashboard.quickEntries.factions'), icon: '🏯', path: '/factions', accent: 'var(--faction-canglong)' },
    { id: 'nations', title: t('dashboard.quickEntries.nations'), icon: '🏰', path: '/nations', accent: 'var(--accent-gold)' },
    { id: 'map', title: t('dashboard.quickEntries.map'), icon: '🗺️', path: '/map', accent: 'var(--accent-green)' },
    { id: 'skills', title: t('dashboard.quickEntries.skills'), icon: '🌳', path: '/skills', accent: 'var(--accent-gold)' },
  ] : []

  const stageNames: Record<string, string> = {
    era_power_struggle: t('dashboard.era.power_struggle'),
    era_war_prep: t('dashboard.era.war_prep'),
    era_chaos: t('dashboard.era.chaos'),
    era_resolution: t('dashboard.era.resolution')
  }

  const getFactionLocation = () => {
    if (player?.faction === 'border') return '边境联盟·暮光村'
    return player?.faction || t('dashboard.subtitle_unknown')
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="header-modern">
        <div className="container-wide flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--accent-gold)] font-display">Agame</h1>
            <p className="text-[var(--text-secondary)] text-sm">
              {t('dashboard.day', { day: currentDay })} · {stageNames[historyStage] || t('dashboard.era.unknown')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <UserAvatarMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1200px] mx-auto px-4 py-6">
        {/* AP状态 - 仅在有角色时显示 */}
        {hasCharacter && apStatus && (
          <section className="mb-6">
            <div className="card-modern">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <h3 className="font-bold text-[var(--accent-purple)] font-display">{t('dashboard.ap.title')}</h3>
                    <span className="text-sm text-[var(--text-secondary)]">
                      {t('dashboard.ap.current')}: {apStatus.current}/{apStatus.max} · {t('dashboard.ap.consumed')}: {apStatus.consumed}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/actions')}
                  className="btn-modern text-sm"
                  style={{ borderColor: 'var(--accent-purple)' }}
                >
                  {t('dashboard.ap.button')}
                </button>
              </div>
              {/* AP进度条 */}
              <div className="progress-modern mt-3">
                <div
                  className="progress-fill transition-all duration-500"
                  style={{
                    width: `${(apStatus.current / Math.max(apStatus.max, 1)) * 100}%`,
                    backgroundColor: apStatus.current > apStatus.max * 0.5 ? 'var(--accent-purple)' : apStatus.current > apStatus.max * 0.25 ? 'var(--accent-gold)' : 'var(--accent-red)'
                  }}
                />
              </div>
            </div>
          </section>
        )}

        {/* Welcome Section */}
        <section className="mb-8">
          <div className="card-modern-alt border-[var(--accent-gold)]/30">
            <h2 className="text-2xl font-bold text-[var(--accent-gold)] mb-2 font-display">
              {t('dashboard.welcome', { name: player?.name || '旅行者' })}
            </h2>
            <p className="text-[var(--text-primary)]">
              {t('dashboard.subtitle', { location: getFactionLocation() })}
            </p>
            <p className="text-[var(--text-muted)] mt-2">
              {t('dashboard.tagline')}
            </p>
          </div>
        </section>

        {/* Function Modules */}
        <section>
          <h3 className="text-[var(--text-secondary)] font-medium mb-4">{t('dashboard.modules.title')}</h3>

          {/* 新玩家提示 - 创建角色入口 */}
          {!player?.id && (
            <div className="mb-6 card-modern bg-[var(--accent-purple)]/20 border-[var(--accent-purple)]">
              <div className="text-center">
                <span className="text-4xl mb-3 block">🎭</span>
                <h4 className="text-xl font-bold text-[var(--text-primary)] mb-2">{t('dashboard.noCharacter.title')}</h4>
                <p className="text-[var(--text-secondary)] mb-4">{t('dashboard.noCharacter.desc')}</p>
                <button
                  onClick={() => navigate('/character/create')}
                  className="btn-primary px-6 py-3 font-bold"
                >
                  {t('dashboard.noCharacter.button')}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {modules.map((mod) => (
              <DashboardEntryCard
                key={mod.id}
                icon={mod.icon}
                title={mod.title}
                description={mod.desc}
                accent={mod.accent}
                path={mod.path}
                priority={mod.highlight ? 'high' : 'normal'}
                size="large"
              />
            ))}
          </div>
        </section>

        {/* 快捷入口 - 仅在有角色时显示 */}
        {hasCharacter && quickEntries.length > 0 && (
          <section className="mt-8">
            <h3 className="text-[var(--text-secondary)] font-medium mb-4">{t('dashboard.quickEntries.title')}</h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {quickEntries.map((entry) => (
                <DashboardEntryCard
                  key={entry.id}
                  icon={entry.icon}
                  title={entry.title}
                  accent={entry.accent}
                  path={entry.path}
                  size="compact"
                />
              ))}
            </div>
          </section>
        )}

        {/* 最近决策历史 - 仅在有角色时显示 */}
        {hasCharacter && recentHistory && recentHistory.length > 0 && (
          <section className="mt-8">
            <h3 className="text-[var(--text-secondary)] font-medium mb-4">{t('dashboard.recentHistory.title')}</h3>
            <div className="space-y-2">
              {recentHistory.map((item: Record<string, unknown>, index: number) => (
                <div key={index} className="card-modern-alt flex items-center justify-between">
                  <div>
                    <span className="font-medium text-sm text-[var(--text-primary)]">{String(item.eventTitle || item.eventId || t('dashboard.recentHistory.default_event'))}</span>
                    <p className="text-xs text-[var(--text-muted)] mt-1">{String(item.result || item.description || t('dashboard.recentHistory.default_result'))}</p>
                  </div>
                  {item.timestamp && (
                    <span className="text-xs text-[var(--text-muted)]">{String(item.timestamp).slice(0, 16)}</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Quick Stats */}
        <section className="mt-8">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-xl block mb-1">💰</span>
              <p className="text-[var(--accent-gold)] font-bold text-lg">{player?.resources?.gold || 0}</p>
              <p className="text-[var(--text-muted)] text-xs">{t('dashboard.stats.gold')}</p>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-xl block mb-1">📬</span>
              <p className="text-[var(--accent-red)] font-bold text-lg">
                {player?.pendingEventsCount && player.pendingEventsCount > 0 ? `${player.pendingEventsCount} 个` : '暂无'}
              </p>
              <p className="text-[var(--text-muted)] text-xs">{t('dashboard.stats.pendingEvents')}</p>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-xl block mb-1">🛡️</span>
              <p className="text-[var(--accent-green)] font-bold text-lg">
                {player?.faction ? `${player.faction}` : '未加入'}
              </p>
              <p className="text-[var(--text-muted)] text-xs">{t('dashboard.stats.factionReputation')}</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
