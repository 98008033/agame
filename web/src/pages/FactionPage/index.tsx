import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { factionApi } from '../../services'
import { FactionCard } from '../../components'
import { UserAvatarMenu } from '../../components'

// 内部派系配置
const internalFactionConfig = {
  canglong: [
    { id: 'tianshu', icon: '\u2696\ufe0f', color: 'var(--faction-canglong)', descKey: 'internalFactions.tianshuDesc' },
    { id: 'pojun', icon: '\u2694\ufe0f', color: 'var(--accent-red)', descKey: 'internalFactions.pojunDesc' },
    { id: 'wenqu', icon: '\ud83d\udcdc', color: 'var(--accent-blue)', descKey: 'internalFactions.wenquDesc' },
  ],
  shuanglang: [
    { id: 'reform', icon: '\ud83d\udd25', color: 'var(--accent-orange)', descKey: 'internalFactions.reformDesc' },
    { id: 'tradition', icon: '\u2744\ufe0f', color: 'var(--faction-shuanglang)', descKey: 'internalFactions.traditionDesc' },
  ],
  jinque: [
    { id: 'noble', icon: '\ud83d\udc51', color: 'var(--accent-gold)', descKey: 'internalFactions.nobleDesc' },
    { id: 'commoner', icon: '\ud83c\udf3e', color: 'var(--accent-green)', descKey: 'internalFactions.commonerDesc' },
  ],
  border: [
    { id: 'merchant', icon: '\ud83d\udcb0', color: 'var(--accent-gold)', descKey: 'internalFactions.merchantDesc' },
    { id: 'mercenary', icon: '\u2694\ufe0f', color: 'var(--accent-red)', descKey: 'internalFactions.mercenaryDesc' },
    { id: 'autonomy', icon: '\ud83c\udfd8\ufe0f', color: 'var(--text-secondary)', descKey: 'internalFactions.autonomyDesc' },
  ],
}

function getFactionsForNation(nationId: string) {
  return internalFactionConfig[nationId as keyof typeof internalFactionConfig] || []
}

// 列表页
function FactionList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [playerNation, setPlayerNation] = useState<string>('border')
  const [factions, setFactions] = useState<Array<{
    id: string; name: string; icon: string; color: string; description: string;
    reputation?: number; memberCount?: number; isJoined?: boolean;
  }>>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        // 获取玩家所属国家
        const playerStatus = await (await import('../../services')).playerApi.getStatus()
        const nation = playerStatus.data?.data?.faction || 'border'
        setPlayerNation(nation)

        const factionList = getFactionsForNation(nation)
        const results = await Promise.allSettled(
          factionList.map(async (fc) => {
            try {
              const resp = await factionApi.getFaction(fc.id)
              if (resp.data.success) {
                const data = resp.data.data
                return {
                  id: fc.id, name: data.name || t(`internalFactions.${fc.id}`),
                  icon: fc.icon, color: fc.color, description: data.description || t(fc.descKey),
                  reputation: data.reputation ?? 0, memberCount: data.memberCount,
                  isJoined: data.isJoined ?? false,
                }
              }
            } catch { /* fallback */ }
            return {
              id: fc.id, name: t(`internalFactions.${fc.id}`), icon: fc.icon,
              color: fc.color, description: t(fc.descKey),
            }
          })
        )
        setFactions(results.filter(r => r.status === 'fulfilled').map(r => r.value))
      } catch (error) {
        console.error('Failed to load factions:', error)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [t])

  if (isLoading) return <div className="text-center py-8 text-[var(--text-muted)]">{t('common.loading')}</div>

  if (factions.length === 0) {
    return <div className="text-center py-8 text-[var(--text-muted)]">{t('internalFactions.noFactions')}</div>
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-secondary)] mb-4">
        {t('internalFactions.description')}: <span className="font-bold">{t(`factions.${playerNation}`)}</span>
      </p>
      {factions.map((faction) => (
        <FactionCard key={faction.id} faction={faction} showJoin showProgress />
      ))}
    </div>
  )
}

// 详情页
function FactionDetail() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [factionData, setFactionData] = useState<{
    name: string; description: string; reputation: number; memberCount?: number;
    members?: Array<{ name: string; reputation: number }>; isJoined: boolean;
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        const resp = await factionApi.getFaction(id)
        if (resp.data.success) {
          const data = resp.data.data
          setFactionData({
            name: data.name || t(`internalFactions.${id}`),
            description: data.description || t(`internalFactions.${id}Desc`),
            reputation: data.reputation ?? 0, memberCount: data.memberCount,
            members: data.members, isJoined: data.isJoined ?? false,
          })
        }
      } catch {
        setFactionData({ name: t(`internalFactions.${id}`), description: '', reputation: 0, isJoined: false })
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id, t])

  if (isLoading) return <div className="text-center py-8 text-[var(--text-muted)]">{t('common.loading')}</div>
  if (!factionData) return <div className="text-center py-8">{t('common.error')}</div>

  const reputation = factionData.reputation
  const progressPercent = ((reputation + 100) / 200) * 100

  return (
    <div className="space-y-4">
      <button onClick={() => navigate('/factions')} className="btn-modern text-sm">
        {'\u2190 '}{t('common.backToList')}
      </button>

      <div className="card-modern">
        <h2 className="text-xl font-bold font-display mb-2">{factionData.name}</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-4">{factionData.description}</p>

        {/* 声望进度 */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[var(--text-muted)]">{t('internalFactions.reputation')}</span>
            <span className="font-bold font-display">{reputation}/100</span>
          </div>
          <div className="progress-modern" style={{ height: '12px' }}>
            <div className="progress-fill transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        {/* 加入/离开按钮 */}
        <div className="mt-4 flex gap-2">
          {!factionData.isJoined ? (
            <button className="btn-modern btn-primary" onClick={async () => {
              await factionApi.joinFaction(id!)
              setFactionData(prev => prev ? { ...prev, isJoined: true } : null)
            }}>
              {t('internalFactions.join')}
            </button>
          ) : (
            <button className="btn-modern" onClick={async () => {
              await factionApi.leaveFaction()
              setFactionData(prev => prev ? { ...prev, isJoined: false } : null)
            }}>
              {t('internalFactions.leave')}
            </button>
          )}
        </div>
      </div>

      {/* 成员列表 */}
      {factionData.members && factionData.members.length > 0 && (
        <div className="card-modern">
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 font-display">
            {t('internalFactions.members')}
          </h3>
          <div className="space-y-2">
            {factionData.members.slice(0, 20).map((member, i) => (
              <div key={member.name} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-secondary)]">
                <span className="text-[var(--text-muted)] font-medium">#{i + 1}</span>
                <span className="font-medium text-[var(--text-primary)]">{member.name}</span>
                <span className="text-sm font-bold font-display">{member.reputation}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// 主页面
export default function FactionPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <header className="header-modern">
        <div className="container-modern flex items-center justify-between">
          <h1 className="text-lg font-bold text-[var(--text-primary)] font-display">
            {t('dashboard.quickEntries.factions')}
          </h1>
          <UserAvatarMenu />
        </div>
      </header>
      <main className="container-modern py-6">
        {id ? <FactionDetail /> : <FactionList />}
      </main>
    </div>
  )
}
