import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { playerApi } from '../../services'

// 继承类型映射
const inheritanceTypeLabels: Record<string, string> = {
  blood: '血脉传承',
  mentor: '师徒传承',
  designated: '指定继承',
  random: '随机继承',
}

// 技能路径名称映射
const skillPathLabels: Record<string, string> = {
  survival: '生存',
  'strategy.intelligenceAnalysis': '情报分析',
  'strategy.politicalManipulation': '政治手腕',
  'combat.combatTechnique': '战斗技巧',
  'combat.militaryCommand': '军事指挥',
  'commerce.trade': '贸易',
  'commerce.industryManagement': '工业管理',
}

interface LegacyPackage {
  gold: number
  resources: Record<string, number>
  skillExp: Record<string, number>
  relationshipCarryover: Record<string, number>
  tags: string[]
  bonusAttributes: Record<string, number>
}

interface LegacyRecord {
  id: string
  playerId: string
  deceasedName: string
  deceasedLevel: number
  inheritanceType: string
  legacyPackage: LegacyPackage
  totalValue: number
  claimed: boolean
  claimedBy: string | null
  createdAt: string
}

export default function LegacyPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [claimedLegacy, setClaimedLegacy] = useState<{
    deceasedName: string
    bonus: Record<string, unknown>
  } | null>(null)

  // 获取未领取遗产列表
  const { data, isLoading, error } = useQuery({
    queryKey: ['unclaimed-legacies'],
    queryFn: async () => {
      const res = await playerApi.getUnclaimedLegacies()
      return (res.data.data?.legacies ?? []) as LegacyRecord[]
    },
  })

  // 领取遗产 mutation
  const claimMutation = useMutation({
    mutationFn: async (legacyId: string) => {
      const res = await playerApi.claimLegacy(legacyId)
      return res.data.data as { success: boolean; message: string; appliedBonus?: Record<string, unknown> }
    },
    onSuccess: (data, legacyId) => {
      if (data.success) {
        const legacy = data.legacies?.find((l: LegacyRecord) => l.id === legacyId)
        const targetLegacy = legacy ?? data.legacy
        setClaimedLegacy({
          deceasedName: targetLegacy?.deceasedName ?? '未知',
          bonus: data.appliedBonus ?? {},
        })
        queryClient.invalidateQueries({ queryKey: ['unclaimed-legacies'] })
      }
    },
  })

  const legacies: LegacyRecord[] = data ?? []
  const unclaimedLegacies = legacies.filter((l) => !l.claimed)

  // 格式化资源显示
  const formatResource = (key: string, value: number) => {
    if (key === 'gold') return `${t('legacy.resourceNames.gold')} +${value}`
    const labels: Record<string, string> = {
      wood: t('legacy.resourceNames.wood'),
      stone: t('legacy.resourceNames.stone'),
      iron: t('legacy.resourceNames.iron'),
      food: t('legacy.resourceNames.food'),
      cloth: t('legacy.resourceNames.cloth'),
    }
    return `${labels[key] ?? key} +${value}`
  }

  // 处理领取
  const handleClaim = (legacy: LegacyRecord) => {
    claimMutation.mutate(legacy.id)
  }

  // 返回登录/重新开始
  const handleGoBack = () => {
    navigate('/login')
  }

  const handleCreateNew = () => {
    navigate('/character/create')
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* 页面标题 */}
        <div className="text-center mb-6">
          <span className="text-5xl block mb-2">🏛️</span>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {t('legacy.title')}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {t('legacy.subtitle')}
          </p>
        </div>

        {/* 领取成功提示 */}
        {claimedLegacy && (
          <div className="card-modern border border-[var(--accent-gold)] mb-4 animate-slideUp">
            <div className="text-center">
              <span className="text-3xl block mb-1">✨</span>
              <h2 className="text-lg font-bold text-[var(--accent-gold)] mb-2">
                {t('legacy.success')}
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                {t('legacy.successMessage', { name: claimedLegacy.deceasedName })}
              </p>
              <div className="stone-panel p-3 text-left space-y-1 text-sm">
                {(claimedLegacy.bonus as any)?.gold > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">{t('legacy.resourceNames.gold')}</span>
                    <span className="text-[var(--accent-gold)] font-bold">+{(claimedLegacy.bonus as any).gold}</span>
                  </div>
                )}
                {(claimedLegacy.bonus as any)?.resources && Object.entries((claimedLegacy.bonus as any).resources).map(([key, val]) =>
                  (val as number) > 0 ? (
                    <div key={key} className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">{formatResource(key, 0).split(' ')[0]}</span>
                      <span className="text-[var(--text-primary)] font-bold">+{String(val)}</span>
                    </div>
                  ) : null
                )}
                {(claimedLegacy.bonus as any)?.tags && (claimedLegacy.bonus as any).tags.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">{t('legacy.tag')}</span>
                    <span className="text-[var(--accent-purple)]">
                      {(claimedLegacy.bonus as any).tags.join(', ')}
                    </span>
                  </div>
                )}
                {(claimedLegacy.bonus as any)?.bonusAttributes?.luck && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">{t('legacy.luck')}</span>
                    <span className="text-[var(--accent-gold)] font-bold">
                      +{(claimedLegacy.bonus as any).bonusAttributes.luck}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 遗产列表加载中 */}
        {isLoading && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <span>{t('common.loadingLegacy')}</span>
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <div className="error-state">
            <p className="error-state-title">{t('legacy.loadingFailed')}</p>
            <p>{String(error)}</p>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['unclaimed-legacies'] })}
              className="btn-modern mt-3"
            >
              {t('common.retry')}
            </button>
          </div>
        )}

        {/* 无遗产空状态 */}
        {!isLoading && !error && unclaimedLegacies.length === 0 && !claimedLegacy && (
          <div className="empty-state card-modern">
            <span className="empty-state-icon">📜</span>
            <p className="empty-state-title">{t('legacy.noLegacy')}</p>
            <p className="text-sm" style={{ maxWidth: '320px' }}>
              {t('legacy.noLegacyHint')}
            </p>
            <div className="space-y-3">
              <button
                onClick={handleCreateNew}
                className="w-full btn-modern btn-primary py-3"
              >
                {t('legacy.createNewCharacter')}
              </button>
              <button
                onClick={handleGoBack}
                className="w-full btn-modern py-3"
              >
                {t('legacy.backToLogin')}
              </button>
            </div>
          </div>
        )}

        {/* 遗产卡片列表 */}
        {!isLoading && unclaimedLegacies.length > 0 && (
          <div className="space-y-4">
            {unclaimedLegacies.map((legacy) => (
              <div
                key={legacy.id}
                className="card-modern border-l-4 border-l-[var(--accent-gold)]"
              >
                {/* 死者信息 */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">
                      {legacy.deceasedName}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Lv.{legacy.deceasedLevel} · {t(`legacy.types.${legacy.inheritanceType}`) ?? t('legacy.unknownInheritance')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-[var(--text-muted)]">{t('legacy.totalValue')}</div>
                    <div className="text-xl font-bold text-[var(--accent-gold)]">
                      {legacy.totalValue}
                    </div>
                  </div>
                </div>

                {/* 遗产内容详情 */}
                <div className="stone-panel p-3 space-y-2 text-sm">
                  {/* 金币 */}
                  {legacy.legacyPackage.gold > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">💰 {t('legacy.resourceNames.gold')}</span>
                      <span className="text-[var(--accent-gold)] font-bold">
                        {legacy.legacyPackage.gold}
                      </span>
                    </div>
                  )}

                  {/* 其他资源 */}
                  {Object.entries(legacy.legacyPackage.resources).map(([key, value]) =>
                    value > 0 ? (
                      <div key={key} className="flex justify-between">
                        <span className="text-[var(--text-secondary)]">
                          {formatResource(key, value).split(' ')[0]}
                        </span>
                        <span className="text-[var(--text-primary)]">
                          +{value}
                        </span>
                      </div>
                    ) : null
                  )}

                  {/* 技能经验 */}
                  {Object.entries(legacy.legacyPackage.skillExp).map(([path, exp]) =>
                    exp > 0 ? (
                      <div key={path} className="flex justify-between">
                        <span className="text-[var(--text-secondary)]">
                          📚 {t(`legacy.skills.${path}`) ?? path} {t('legacy.exp')}
                        </span>
                        <span className="text-[var(--accent-green)]">
                          +{exp} EXP
                        </span>
                      </div>
                    ) : null
                  )}

                  {/* 关系保留 */}
                  {Object.keys(legacy.legacyPackage.relationshipCarryover).length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">🤝 NPC关系</span>
                      <span className="text-[var(--accent-blue)]">
                        {t('legacy.relationsKept', { count: Object.keys(legacy.legacyPackage.relationshipCarryover).length })}
                      </span>
                    </div>
                  )}

                  {/* 继承标签 */}
                  {legacy.legacyPackage.tags.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">🏷️ {t('legacy.inheritTags')}</span>
                      <span className="text-[var(--accent-purple)]">
                        {legacy.legacyPackage.tags.join(', ')}
                      </span>
                    </div>
                  )}

                  {/* 属性加成 */}
                  {Object.entries(legacy.legacyPackage.bonusAttributes).map(([key, value]) =>
                    value ? (
                      <div key={key} className="flex justify-between">
                        <span className="text-[var(--text-secondary)]">
                          ⭐ {key === 'luck' ? t('legacy.luck') : key} {t('legacy.bonus')}
                        </span>
                        <span className="text-[var(--accent-gold)] font-bold">
                          +{String(value)}
                        </span>
                      </div>
                    ) : null
                  )}
                </div>

                {/* 领取按钮 */}
                <button
                  onClick={() => handleClaim(legacy)}
                  disabled={claimMutation.isPending}
                  className="w-full btn-modern btn-primary mt-3 py-3 text-base font-semibold"
                >
                  {claimMutation.isPending ? t('legacy.claiming') : t('legacy.claimLegacy', { name: legacy.deceasedName })}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 底部操作 */}
        {unclaimedLegacies.length > 0 && (
          <div className="space-y-3 mt-4">
            <button
              onClick={handleCreateNew}
              className="w-full btn-modern py-3"
            >
              {t('legacy.createWithoutLegacy')}
            </button>
            <button
              onClick={handleGoBack}
              className="w-full btn-modern py-3 text-[var(--text-secondary)]"
            >
              {t('legacy.backToLogin')}
            </button>
          </div>
        )}

        {/* 底部提示 */}
        <p className="text-xs text-[var(--text-muted)] text-center mt-6 opacity-70">
          {t('legacy.legacyHint')}
        </p>
      </div>
    </div>
  )
}
