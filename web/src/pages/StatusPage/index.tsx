import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePlayerStore, socialClassConfig } from '../../stores/playerStore'
import PlayerGrowth from '../../components/PlayerGrowth'
import AnimatedNumber from '../../components/AnimatedNumber'
import SocialClassProgressBar from '../../components/SocialClassProgressBar'
import NPCRelationshipCard from '../../components/NPCRelationshipCard'
import { UserAvatarMenu } from '../../components'

// 阵营信息
const factionInfo = {
  canglong: { name: '苍龙帝国', icon: '🐉', color: 'var(--faction-canglong)', nameI18n: 'factions.canglong' },
  shuanglang: { name: '霜狼联邦', icon: '🐺', color: 'var(--faction-shuanglang)', nameI18n: 'factions.shuanglang' },
  jinque: { name: '金雀花王国', icon: '🌸', color: 'var(--faction-jinque)', nameI18n: 'factions.jinque' },
  border: { name: '边境联盟', icon: '🏘️', color: 'var(--faction-border)', nameI18n: 'factions.border' },
}

// 属性显示名称
const attributeNames: Record<string, string> = {
  physique: 'attributes.physique',
  agility: 'attributes.agility',
  wisdom: 'attributes.wisdom',
  willpower: 'attributes.willpower',
  perception: 'attributes.perception',
  charisma: 'attributes.charisma',
  fame: 'attributes.fame',
  infamy: 'attributes.infamy',
  luck: 'attributes.luck',
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
  neutral: 'faction_levels.neutral',
  friendly: 'faction_levels.friendly',
  member: 'faction_levels.member',
  officer: 'faction_levels.officer',
  leader: 'faction_levels.leader',
}

export default function StatusPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { player } = usePlayerStore()
  const [activeTab, setActiveTab] = useState<'status' | 'growth' | 'relationships'>('status')

  // 追踪变化
  const [prevResources, setPrevResources] = useState({ gold: 0, influence: 0 })
  const [prevAttributes, setPrevAttributes] = useState<Record<string, number>>({})
  const [changedAttributes, setChangedAttributes] = useState<Record<string, 'increase' | 'decrease'>>({})
  const prevPlayerRef = useRef<string>('')

  // 监听玩家数据变化，记录变化
  useEffect(() => {
    if (!player.id) return

    const playerKey = JSON.stringify({
      gold: player.resources.gold,
      influence: player.resources.influence,
      attributes: player.attributes,
    })

    if (playerKey !== prevPlayerRef.current && prevPlayerRef.current !== '') {
      // 检测属性变化
      const changes: Record<string, 'increase' | 'decrease'> = {}
      for (const [key, value] of Object.entries(player.attributes)) {
        const prev = prevAttributes[key]
        if (prev !== undefined && prev !== value) {
          changes[key] = value > prev ? 'increase' : 'decrease'
        }
      }
      setChangedAttributes(changes)

      // 3秒后清除变化状态
      setTimeout(() => setChangedAttributes({}), 3000)
    }

    if (playerKey !== prevPlayerRef.current) {
      setPrevResources({ gold: player.resources.gold, influence: player.resources.influence })
      setPrevAttributes({ ...player.attributes })
      prevPlayerRef.current = playerKey
    }
  }, [player.resources, player.attributes, player.id])

  // 如果没有玩家数据，显示创建角色入口
  if (!player || !player.id) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="card-modern p-8 text-center max-w-md">
          <span className="text-4xl mb-4 block">🎭</span>
          <p className="text-[var(--text-primary)] mb-2 text-lg">{t('common.noCharacter')}</p>
          <p className="text-[var(--text-muted)] mb-6">{t('common.createCharacterHint')}</p>
          <button
            onClick={() => navigate('/character/create')}
            className="btn-modern mb-4"
            style={{ borderColor: 'var(--accent-purple)' }}
          >
            {t('common.createCharacter')}
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            {t('common.backToDashboard')}
          </button>
        </div>
      </div>
    )
  }

  const factionData = player.faction ? factionInfo[player.faction] : null

  // 资源软上限
  const goldSoftCap = 1000
  const influenceSoftCap = 500

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
              ↩ {t('common.back')}
            </button>
            <h1 className="text-lg font-bold text-[var(--text-primary)] font-display">{t('status.title')}</h1>
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
            {t('status.basicStatus')}
          </button>
          <button
            onClick={() => setActiveTab('growth')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'growth'
                ? 'bg-[var(--accent-purple)] text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
            }`}
          >
            {t('status.characterDevelopment')}
          </button>
          <button
            onClick={() => setActiveTab('relationships')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'relationships'
                ? 'bg-[var(--accent-purple)] text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
            }`}
          >
            {t('status.npcRelationships')}
          </button>
          <button
            onClick={() => navigate('/journal')}
            className="px-4 py-2 rounded-lg font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
          >
            {t('status.personalJournal')}
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
                Lv.{player.level} · {t('status.yearsOld', { age: player.age })}
              </p>
            </div>
            {factionData && (
              <div className="text-right" style={{ color: factionData.color }}>
                <span className="text-2xl">{factionData.icon}</span>
                <span className="ml-2 font-medium font-display">{t(factionData.nameI18n)}</span>
              </div>
            )}
          </div>
          {player.faction && (
            <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.1)]">
              <div className="flex justify-between">
                <div>
                  <span className="text-sm text-[var(--text-muted)]">{t('status.factionStatus')}</span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {t(factionLevelNames[player.factionLevel])}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-[var(--text-muted)]">{t('status.socialClass')}</span>
                  <span className="text-sm font-medium text-[var(--accent-gold)]">
                    {socialClassConfig[player.socialClass || 'commoner'].icon} {socialClassConfig[player.socialClass || 'commoner'].name}
                  </span>
                </div>
              </div>
              {/* 派系入口按钮 */}
              <button
                onClick={() => navigate('/factions')}
                className="w-full mt-3 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]"
                style={{
                  backgroundColor: factionData.color + '20',
                  color: factionData.color,
                  border: `1px solid ${factionData.color}40`
                }}
              >
                🏰 {t('status.viewFactionDetail')}
              </button>
            </div>
          )}
        </div>

        {/* 资源 - 带进度条和动画 */}
        <div className="card-modern mb-4">
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4 font-display">{t('status.resourcesTitle')}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <AnimatedNumber
                value={player.resources.gold}
                prevValue={prevResources.gold}
                label={t('common.gold')}
                icon="💰"
                colorClass="text-[var(--accent-gold)]"
              />
              {/* 进度条 */}
              <div className="mt-2 progress-modern">
                <div
                  className="progress-fill progress-fill-gold"
                  style={{ width: `${Math.min((player.resources.gold / goldSoftCap) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1 text-center">
                {player.resources.gold}/{goldSoftCap}
              </p>
            </div>
            <div className="relative">
              <AnimatedNumber
                value={player.resources.influence}
                prevValue={prevResources.influence}
                label={t('common.influence')}
                icon="⭐"
                colorClass="text-[var(--accent-purple)]"
              />
              {/* 进度条 */}
              <div className="mt-2 progress-modern">
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min((player.resources.influence / influenceSoftCap) * 100, 100)}%`,
                    backgroundColor: 'var(--accent-purple)'
                  }}
                />
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1 text-center">
                {player.resources.influence}/{influenceSoftCap}
              </p>
            </div>
          </div>
        </div>

        {/* 十维属性 - 带变化高亮 */}
        <div className="card-modern mb-4">
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4 font-display">{t('status.attributesTitle')}</h3>
          <div className="space-y-3">
            {Object.entries(player.attributes).map(([key, value]) => {
              const changeType = changedAttributes[key]
              const animClass = changeType === 'increase' ? 'animate-attr-flash' :
                changeType === 'decrease' ? 'animate-attr-flash-decrease' : ''

              return (
                <div key={key} className={`flex items-center rounded-lg transition-all duration-300 ${animClass}`}>
                  <span className="w-12 text-sm text-[var(--text-secondary)]">{t(attributeNames[key])}</span>
                  <div className="flex-1 mx-2 progress-modern">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(value, 100)}%`,
                        background: attributeColors[key] || 'var(--accent-blue)'
                      }}
                    />
                  </div>
                  <span className={`w-10 text-sm font-medium text-right ${changeType ? 'font-bold' : ''}`}
                    style={changeType ? { color: changeType === 'increase' ? 'var(--accent-green)' : 'var(--accent-red)' } : {}}>
                    {value}
                  </span>
                  {changeType && (
                    <span className="ml-1 text-xs animate-float-up"
                      style={{ color: changeType === 'increase' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {changeType === 'increase' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* 社会阶层进度 */}
        <SocialClassProgressBar
          currentClass={player.socialClass || 'commoner'}
          level={player.level}
          influence={player.resources.influence}
          factionLevel={player.factionLevel}
        />

        {/* 经验值 */}
        <div className="card-modern mb-4">
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 font-display">{t('status.levelProgress')}</h3>
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
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 font-display">{t('status.tagsTitle')}</h3>
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
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2 font-display">{t('status.originTitle')}</h3>
            <p className="text-[var(--text-primary)]">{player.origin}</p>
          </div>
        )}
          </>
        ) : activeTab === 'relationships' ? (
          <NPCRelationshipsTab />
        ) : (
          <PlayerGrowth />
        )}
      </main>
    </div>
  )
}

// NPC关系Tab组件
function NPCRelationshipsTab() {
  const { t } = useTranslation()
  const [npcs, setNpcs] = useState<Array<{ id: string; name: string; faction?: string; role?: string; relationship?: { level: string; value: number } }>>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadNpcs = async () => {
      try {
        const { npcApi } = await import('../../services')
        const response = await npcApi.getList()
        if (response.data.success) {
          const data = response.data.data
          // 筛选出有关系的NPC
          const relatedNpcs = (data.npcs || data).filter(
            (n: Record<string, unknown>) => n.relationship && (n.relationship as Record<string, unknown>).value > 0
          )
          setNpcs(relatedNpcs.length > 0 ? relatedNpcs : [])
        }
      } catch (error) {
        console.error('Failed to load NPCs:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadNpcs()
  }, [])

  if (isLoading) {
    return <div className="loading-state">{t('common.loading')}</div>
  }

  if (npcs.length === 0) {
    return (
      <div className="empty-state card-modern-alt">
        <span className="empty-state-icon">👥</span>
        <p className="empty-state-title">{t('status.noNpcData')}</p>
        <p className="text-sm">{t('status.noNpcDataHint')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2 font-display">{t('status.npcDetailTitle')}</h3>
      {npcs.map((npc) => (
        <NPCRelationshipCard key={npc.id} npc={npc} />
      ))}
    </div>
  )
}
