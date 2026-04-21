import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { usePlayerStore } from '../../stores/playerStore'
import { useGameStore } from '../../stores/gameStore'
import { actionApi, playerApi } from '../../services'
import { UserAvatarMenu } from '../../components'

export default function DashboardPage() {
  const navigate = useNavigate()
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
      title: '今日计划',
      desc: '安排今日行动，消耗AP完成任务',
      icon: '📋',
      path: '/plan',
      accent: 'var(--accent-purple)',
      highlight: true,
    },
    {
      id: 'news',
      title: '每日晨报',
      desc: '了解天下大事，掌握各方动向',
      icon: '📰',
      path: '/news',
      accent: 'var(--accent-blue)'
    },
    {
      id: 'status',
      title: '个人状态',
      desc: '查看属性、声望、资源',
      icon: '👤',
      path: '/status',
      accent: 'var(--accent-green)'
    },
    {
      id: 'novel',
      title: '小说阅读',
      desc: '沉浸式剧情体验',
      icon: '📖',
      path: '/novel',
      accent: 'var(--accent-gold)'
    },
    {
      id: 'game',
      title: '游戏决策',
      desc: '处理待办事件',
      icon: '⚔️',
      path: '/game',
      accent: 'var(--accent-red)'
    },
  ]

  // 快捷入口 - 仅在有角色时显示
  const quickEntries = hasCharacter ? [
    { id: 'actions', title: '今日行动', icon: '🎯', path: '/actions', accent: 'var(--accent-purple)' },
    { id: 'event-history', title: '事件历史', icon: '📜', path: '/event-history', accent: 'var(--accent-gold)' },
    { id: 'factions', title: '派系总览', icon: '🏰', path: '/factions', accent: 'var(--faction-canglong)' },
  ] : []

  const stageNames: Record<string, string> = {
    era_power_struggle: '权力博弈期',
    era_war_prep: '战争酝酿期',
    era_chaos: '动荡期',
    era_resolution: '决局期'
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="header-modern">
        <div className="container-wide flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--accent-gold)] font-display">Agame</h1>
            <p className="text-[var(--text-secondary)] text-sm">
              第{currentDay}日 · {stageNames[historyStage] || '未知时期'}
            </p>
          </div>
          {/* 用户头像菜单 */}
          <UserAvatarMenu />
        </div>
      </header>

      {/* Main Content */}
      <main className="container-wide py-6">
        {/* AP状态 - 仅在有角色时显示 */}
        {hasCharacter && apStatus && (
          <section className="mb-6">
            <div className="card-modern">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <h3 className="font-bold text-[var(--accent-purple)] font-display">行动点数 AP</h3>
                    <span className="text-sm text-[var(--text-secondary)]">
                      当前: {apStatus.current}/{apStatus.max} · 已消耗: {apStatus.consumed}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/actions')}
                  className="btn-modern text-sm"
                  style={{ borderColor: 'var(--accent-purple)' }}
                >
                  今日行动
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
              欢迎，{player?.name || '旅行者'}
            </h2>
            <p className="text-[var(--text-primary)]">
              你当前位于{player?.faction === 'border' ? '边境联盟·暮光村' : player?.faction || '未知之地'}
            </p>
            <p className="text-[var(--text-muted)] mt-2">
              乱世之中，每一步选择都将影响你的命运...
            </p>
          </div>
        </section>

        {/* Function Modules */}
        <section>
          <h3 className="text-[var(--text-secondary)] font-medium mb-4">功能入口</h3>

          {/* 新玩家提示 - 创建角色入口 */}
          {!player?.id && (
            <div className="mb-6 card-modern bg-[var(--accent-purple)]/20 border-[var(--accent-purple)]">
              <div className="text-center">
                <span className="text-4xl mb-3 block">🎭</span>
                <h4 className="text-xl font-bold text-[var(--text-primary)] mb-2">创建你的角色</h4>
                <p className="text-[var(--text-secondary)] mb-4">开始你的冒险之旅，选择阵营与出身</p>
                <button
                  onClick={() => navigate('/character/create')}
                  className="btn-primary px-6 py-3 font-bold"
                >
                  立即创建
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {modules.map((mod) => (
              <button
                key={mod.id}
                onClick={() => navigate(mod.path)}
                className={`card-modern text-left ${
                  mod.highlight ? 'col-span-2 ring-2 ring-[var(--accent-purple)]/50 bg-[var(--accent-purple)]/10' : ''
                }`}
                style={{ borderColor: mod.highlight ? mod.accent : undefined }}
              >
                <span className="text-3xl mb-3 block">{mod.icon}</span>
                <h4 className="text-xl font-bold text-[var(--text-primary)] mb-1 font-display">{mod.title}</h4>
                <p className="text-[var(--text-secondary)] text-sm">{mod.desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* 快捷入口 - 仅在有角色时显示 */}
        {hasCharacter && quickEntries.length > 0 && (
          <section className="mt-8">
            <h3 className="text-[var(--text-secondary)] font-medium mb-4">快捷入口</h3>
            <div className="grid grid-cols-3 gap-3">
              {quickEntries.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => navigate(entry.path)}
                  className="card-modern text-center hover:scale-[1.02] transition-all"
                  style={{ borderColor: entry.accent + '60' }}
                >
                  <span className="text-2xl block mb-1">{entry.icon}</span>
                  <span className="font-medium text-[var(--text-primary)] font-display">{entry.title}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 最近决策历史 - 仅在有角色时显示 */}
        {hasCharacter && recentHistory && recentHistory.length > 0 && (
          <section className="mt-8">
            <h3 className="text-[var(--text-secondary)] font-medium mb-4">最近决策</h3>
            <div className="space-y-2">
              {recentHistory.map((item: Record<string, unknown>, index: number) => (
                <div key={index} className="card-modern-alt flex items-center justify-between">
                  <div>
                    <span className="font-medium text-sm text-[var(--text-primary)]">{String(item.eventTitle || item.eventId || '事件')}</span>
                    <p className="text-xs text-[var(--text-muted)] mt-1">{String(item.result || item.description || '已处理')}</p>
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
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="card-modern-alt">
              <p className="text-[var(--text-muted)] text-sm">金币</p>
              <p className="text-[var(--accent-gold)] font-bold text-xl">{player?.resources?.gold || 0}</p>
            </div>
            <div className="card-modern-alt">
              <p className="text-[var(--text-muted)] text-sm">待处理事件</p>
              <p className="text-[var(--accent-red)] font-bold text-xl">0</p>
            </div>
            <div className="card-modern-alt">
              <p className="text-[var(--text-muted)] text-sm">阵营声望</p>
              <p className="text-[var(--accent-green)] font-bold text-xl">
                {player?.factionLevel === 'friendly' ? '友好' : player?.factionLevel || '中立'}
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
