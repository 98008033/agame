import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameEvent, DecisionResult } from '../../stores/eventStore'
import ChoiceOption from './ChoiceOption'

interface EventCardProps {
  event: GameEvent
  onDecision: (eventId: string, choiceIndex: number) => Promise<DecisionResult>
  onClose?: () => void
}

//  faction颜色映射 (使用CSS变量色)
const factionColorsMap: Record<string, { bg: string; text: string }> = {
  canglong: { bg: 'rgba(34,197,94,0.15)', text: 'var(--faction-canglong)' },
  shuanglang: { bg: 'rgba(14,165,233,0.15)', text: 'var(--faction-shuanglang)' },
  jinque: { bg: 'rgba(249,115,22,0.15)', text: 'var(--faction-jinque)' },
  border: { bg: 'rgba(168,85,247,0.15)', text: 'var(--faction-border)' },
}

// 数值变化动画组件
function AnimatedValue({ value, previousValue, prefix = '', suffix = '' }: {
  value: number
  previousValue?: number
  prefix?: string
  suffix?: string
}) {
  const [animClass, setAnimClass] = useState('')
  const change = value - (previousValue || 0)

  useEffect(() => {
    if (change !== 0) {
      setAnimClass(change > 0 ? 'animate-number-flash text-[var(--accent-green)]' : 'animate-number-flash text-[var(--accent-red)]')
      setTimeout(() => setAnimClass(''), 800)
    }
  }, [change])

  return (
    <span className={`font-bold ml-2 ${animClass}`}>
      {prefix}{change !== 0 && change > 0 ? '+' : ''}{change}{suffix}
    </span>
  )
}

export default function EventCard({ event, onDecision, onClose }: EventCardProps) {
  const { t } = useTranslation()
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<DecisionResult | null>(null)
  const [showConfirmAnimation, setShowConfirmAnimation] = useState(false)
  const [previousResources] = useState({ gold: 0, influence: 0 })

  const handleSubmit = async () => {
    if (selectedChoice === null) return

    setShowConfirmAnimation(true)
    setIsSubmitting(true)

    await new Promise(resolve => setTimeout(resolve, 250))

    try {
      const decisionResult = await onDecision(event.id, selectedChoice)
      setResult(decisionResult)
    } catch (error) {
      console.error('决策失败:', error)
    }
    setIsSubmitting(false)
    setShowConfirmAnimation(false)
  }

  const factionColor = event.faction ? factionColorsMap[event.faction] : null

  // 显示结果
  if (result) {
    return (
      <div className={`rounded-lg shadow-xl max-w-2xl w-full p-6 animate-success-pop ${result.success ? '' : 'animate-fail-shake'}`}
        style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="text-center">
          <div className={`text-4xl mb-4 animate-reward-pop ${result.success ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
            {result.success ? '✓' : '✗'}
          </div>
          <h3 className={`text-xl font-bold mb-4 animate-slideUp ${result.success ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
            {result.success ? t('event.decisionSuccess') : t('event.decisionFailed')}
          </h3>

          {/* 叙事反馈 */}
          <div
            className="mb-6 p-4 rounded-lg animate-slideUp"
            style={{ fontFamily: 'serif', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', animationDelay: '0.1s' }}
          >
            {result.narrativeFeedback}
          </div>

          {/* 后果显示 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {result.consequences.gold !== undefined && (
              <div className="p-3 rounded animate-reward-pop" style={{ background: 'rgba(245,158,11,0.1)', animationDelay: '0.2s' }}>
                <span style={{ color: 'var(--accent-gold)' }}>💰 {t('event.goldReward')}</span>
                <AnimatedValue
                  value={result.consequences.gold}
                  previousValue={previousResources.gold}
                />
              </div>
            )}
            {result.consequences.influence !== undefined && (
              <div className="p-3 rounded animate-reward-pop" style={{ background: 'rgba(139,92,246,0.1)', animationDelay: '0.3s' }}>
                <span style={{ color: 'var(--accent-purple)' }}>⭐ {t('event.influenceReward')}</span>
                <AnimatedValue
                  value={result.consequences.influence}
                  previousValue={previousResources.influence}
                />
              </div>
            )}
            {result.consequences.reputation && Object.entries(result.consequences.reputation).length > 0 && (
              <div className="p-3 rounded animate-reward-pop col-span-2" style={{ background: 'rgba(59,130,246,0.1)', animationDelay: '0.4s' }}>
                <span style={{ color: 'var(--accent-blue)' }}>👑 {t('event.reputationChange')}</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(result.consequences.reputation).map(([faction, change]) => (
                    <span key={faction} className="animate-relation-pulse inline-flex items-center gap-1 px-2 py-1 rounded"
                      style={{ background: 'rgba(59,130,246,0.15)' }}>
                      <span>{t(`factions.${faction}`).slice(0, 2)}</span>
                      <span className={change > 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}>
                        {change > 0 ? '+' : ''}{change}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {result.consequences.newTags && result.consequences.newTags.length > 0 && (
              <div className="p-3 rounded animate-reward-pop col-span-2" style={{ background: 'rgba(16,185,129,0.1)', animationDelay: '0.5s' }}>
                <span style={{ color: 'var(--accent-green)' }}>🏷️ {t('event.newTag')}</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {result.consequences.newTags.map((tag) => (
                    <span key={tag} className="px-2 py-1 rounded animate-slideIn"
                      style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-6 py-2 text-white rounded-lg transition-all"
            style={{ background: 'var(--accent-blue)' }}
          >
            {t('event.continue')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg shadow-xl max-w-2xl w-full"
      style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.1)' }}>
      {/* 事件头部 */}
      <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {event.faction && factionColor && (
              <span className="px-2 py-1 rounded text-sm"
                style={{ background: factionColor.bg, color: factionColor.text }}>
                {t(`factions.${event.faction}`)}
              </span>
            )}
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{event.title}</h2>
          </div>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('event.dayTriggered', { day: event.triggeredAt })}</div>
        </div>
      </div>

      {/* 事件内容 */}
      <div className="p-6">
        {/* 描述 */}
        <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>{event.description}</p>

        {/* 小说风格叙事 */}
        <div
          className="p-4 rounded-lg mb-6"
          style={{ fontFamily: 'serif', background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
        >
          {event.narrativeText}
        </div>

        {/* 选择面板 */}
        <div className="space-y-3 mb-6">
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{t('event.yourChoice')}</h3>
          {event.choices.map((choice) => (
            <ChoiceOption
              key={choice.id}
              text={choice.text}
              description={choice.description}
              riskLevel={choice.riskLevel}
              isUnlocked={choice.isUnlocked}
              costs={choice.costs}
              rewards={choice.rewards}
              skillRequirement={choice.skillRequirement}
              cannotChooseReason={choice.cannotChooseReason}
              isSelected={selectedChoice === choice.index}
              onSelect={() => setSelectedChoice(choice.index)}
            />
          ))}
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-3">
          {onClose && (
            <button onClick={onClose} className="px-4 py-2 transition-all"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}>
              {t('event.noChoice')}
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={selectedChoice === null || isSubmitting}
            className={`px-6 py-2 rounded-lg transition-all ${
              showConfirmAnimation ? 'animate-decision-confirm ring-2 ring-[var(--accent-gold)]' : ''
            } ${
              selectedChoice !== null && !isSubmitting
                ? 'text-white hover:scale-105'
                : 'cursor-not-allowed'
            }`}
            style={{
              background: selectedChoice !== null && !isSubmitting ? 'var(--accent-blue)' : 'var(--bg-elevated)',
              color: selectedChoice !== null && !isSubmitting ? 'white' : 'var(--text-muted)',
            }}
          >
            {isSubmitting ? (
              <span className="animate-pulse flex items-center gap-2">
                <span className="animate-ap-consume">⚡</span>
                {t('event.processing')}
              </span>
            ) : t('event.confirmChoice')}
          </button>
        </div>
      </div>
    </div>
  )
}
