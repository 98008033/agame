import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayerStore, socialClassConfig } from '../../stores/playerStore'
import PlayerGrowth from '../../components/PlayerGrowth'
import { UserAvatarMenu } from '../../components'

// 阵营信息
const factionInfo = {
  canglong: { name: '苍龙帝国', icon: '🐉', color: 'var(--faction-canglong)' },
  shuanglang: { name: '霜狼联邦', icon: '🐺', color: 'var(--faction-shuanglang)' },
  jinque: { name: '金雀花王国', icon: '🌸', color: 'var(--faction-jinque)' },
  border: { name: '边境联盟', icon: '🏘️', color: 'var(--faction-border)' },
}

// 属性显示名称
const attributeNames: Record<string, string> = {
  physique: '体魄',
  agility: '敏捷',
  wisdom: '智慧',
  willpower: '意志',
  perception: '感知',
  charisma: '魅力',
  fame: '名望',
  infamy: '恶名',
  luck: '幸运',
}

// 属性颜色映射 - 使用现代配色
const attributeColors: Record<string, string> = {
  physique: 'var(--accent-red)',
  agility: 'var(--accent-green)',
  wisdom: 'var(--accent-blue)',
  willpower: 'var(--accent-purple)',
  perception: 'var(--accent-gold)',
  charisma: '#E91E63',
  fame: 'var(--accent-gold)',
  infamy: 'var(--text-muted)',
  luck: 'var(--accent-green)',
}

// 阵营等级显示
const factionLevelNames: Record<string, string> = {
  neutral: '中立',
  friendly: '友好',
  member: '成员',
  officer: '官员',
  leader: '领袖',
}

export default function StatusPage() {
  const navigate = useNavigate()
  const { player } = usePlayerStore()
  const [activeTab, setActiveTab] = useState<'status' | 'growth'>('status')

  // 如果没有玩家数据，显示创建角色入口
  if (!player || !player.id) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="card-modern p-8 text-center max-w-md">
          <span className="text-4xl mb-4 block">🎭</span>
          <p className="text-[var(--text-primary)] mb-2 text-lg">你还没有角色</p>
          <p className="text-[var(--text-muted)] mb-6">创建角色开始你的冒险之旅</p>
          <button
            onClick={() => navigate('/character/create')}
            className="btn-modern mb-4"
            style={{ borderColor: 'var(--accent-purple)' }}
          >
            创建角色
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            返回主页
          </button>
        </div>
      </div>
    )
  }

  const factionData = player.faction ? factionInfo[player.faction] : null

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
            <h1 className="text-lg font-bold text-[var(--text-primary)] font-display">状态面板</h1>
          </div>
          <UserAvatarMenu />
        </div>
      </header>

      <main className="container-modern py-6">
        {/* Tab切换 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'status'
                ? 'bg-[var(--accent-purple)] text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
            }`}
          >
            基础状态
          </button>
          <button
            onClick={() => setActiveTab('growth')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'growth'
                ? 'bg-[var(--accent-purple)] text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
            }`}
          >
            角色发展
          </button>
          <button
            onClick={() => navigate('/journal')}
            className="px-4 py-2 rounded-lg font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
          >
            个人日志
          </button>
        </div>

        {activeTab === 'status' ? (
          <>
        {/* 玩家基本信息 */}
        <div className="card-modern mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)] font-display">{player.name}</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Lv.{player.level} · {player.age}岁
              </p>
            </div>
            {factionData && (
              <div className="text-right" style={{ color: factionData.color }}>
                <span className="text-2xl">{factionData.icon}</span>
                <span className="ml-2 font-medium font-display">{factionData.name}</span>
              </div>
            )}
          </div>
          {player.faction && (
            <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.1)]">
              <div className="flex justify-between">
                <div>
                  <span className="text-sm text-[var(--text-muted)]">阵营地位：</span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {factionLevelNames[player.factionLevel]}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-[var(--text-muted)]">社会阶层：</span>
                  <span className="text-sm font-medium text-[var(--accent-gold)]">
                    {socialClassConfig[player.socialClass || 'commoner'].icon} {socialClassConfig[player.socialClass || 'commoner'].name}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 十维属性 */}
        <div className="card-modern mb-4">
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4 font-display">【十维属性】</h3>
          <div className="space-y-3">
            {Object.entries(player.attributes).map(([key, value]) => (
              <div key={key} className="flex items-center">
                <span className="w-12 text-sm text-[var(--text-secondary)]">{attributeNames[key]}</span>
                <div className="flex-1 mx-2 progress-modern">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(value, 100)}%`,
                      background: attributeColors[key] || 'var(--accent-blue)'
                    }}
                  />
                </div>
                <span className="w-10 text-sm text-[var(--text-primary)] font-medium text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 资源 */}
        <div className="card-modern mb-4">
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4 font-display">【资源】</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 card-modern-alt">
              <span className="text-2xl">💰</span>
              <span className="font-bold text-[var(--accent-gold)] ml-2 font-display">{player.resources.gold}</span>
              <p className="text-xs text-[var(--text-muted)] mt-2">金币</p>
            </div>
            <div className="text-center p-4 card-modern-alt">
              <span className="text-2xl">⭐</span>
              <span className="font-bold text-[var(--accent-purple)] ml-2 font-display">{player.resources.influence}</span>
              <p className="text-xs text-[var(--text-muted)] mt-2">影响力</p>
            </div>
          </div>
        </div>

        {/* 经验值 */}
        <div className="card-modern mb-4">
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 font-display">【等级进度】</h3>
          <div className="flex items-center">
            <span className="text-sm text-[var(--text-primary)]">Lv.{player.level}</span>
            <div className="flex-1 mx-2 progress-modern">
              <div
                className="progress-fill progress-fill-green"
                style={{ width: `${Math.min(player.experience, 100)}%` }}
              />
            </div>
            <span className="text-sm text-[var(--text-primary)]">{player.experience}/100</span>
          </div>
        </div>

        {/* 标签 */}
        {player.tags.length > 0 && (
          <div className="card-modern mb-4">
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 font-display">【标签】</h3>
            <div className="flex flex-wrap gap-2">
              {player.tags.map((tag) => (
                <span key={tag} className="tag-modern">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 出身信息 */}
        {player.origin && (
          <div className="card-modern">
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2 font-display">【出身】</h3>
            <p className="text-[var(--text-primary)]">{player.origin}</p>
          </div>
        )}
          </>
        ) : (
          <PlayerGrowth />
        )}
      </main>
    </div>
  )
}