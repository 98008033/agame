import { useState, useEffect } from 'react'
import type { GameEvent, DecisionResult } from '../../stores/eventStore'
import ChoiceOption from './ChoiceOption'

interface EventCardProps {
  event: GameEvent
  onDecision: (eventId: string, choiceIndex: number) => Promise<DecisionResult>
  onClose?: () => void
}

// 阵营颜色映射
const factionColors = {
  canglong: 'bg-yellow-100 text-yellow-700',
  shuanglang: 'bg-blue-100 text-blue-700',
  jinque: 'bg-green-100 text-green-700',
  border: 'bg-amber-100 text-amber-700',
}

const factionLabels = {
  canglong: '苍龙帝国',
  shuanglang: '霜狼联邦',
  jinque: '金雀花王国',
  border: '边境联盟',
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
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<DecisionResult | null>(null)
  const [showConfirmAnimation, setShowConfirmAnimation] = useState(false)
  const [previousResources] = useState({ gold: 0, influence: 0 })

  const handleSubmit = async () => {
    if (selectedChoice === null) return

    // 触发确认动画
    setShowConfirmAnimation(true)
    setIsSubmitting(true)

    // 等待动画完成一半后再提交
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

  // 显示结果
  if (result) {
    return (
      <div className={`bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 animate-success-pop ${result.success ? '' : 'animate-fail-shake'}`}>
        <div className="text-center">
          <div className={`text-4xl mb-4 animate-reward-pop ${result.success ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
            {result.success ? '✓' : '✗'}
          </div>
          <h3 className={`text-xl font-bold mb-4 animate-slideUp ${result.success ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
            {result.success ? '决策成功' : '决策失败'}
          </h3>

          {/* 叙事反馈 */}
          <div
            className="text-gray-600 mb-6 p-4 bg-gray-50 rounded-lg animate-slideUp"
            style={{ fontFamily: 'serif', animationDelay: '0.1s' }}
          >
            {result.narrativeFeedback}
          </div>

          {/* 后果显示 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {result.consequences.gold !== undefined && (
              <div className="p-3 bg-yellow-50 rounded animate-reward-pop" style={{ animationDelay: '0.2s' }}>
                <span className="text-yellow-600">💰 金币</span>
                <AnimatedValue
                  value={result.consequences.gold}
                  previousValue={previousResources.gold}
                />
              </div>
            )}
            {result.consequences.influence !== undefined && (
              <div className="p-3 bg-purple-50 rounded animate-reward-pop" style={{ animationDelay: '0.3s' }}>
                <span className="text-purple-600">⭐ 影响力</span>
                <AnimatedValue
                  value={result.consequences.influence}
                  previousValue={previousResources.influence}
                />
              </div>
            )}
            {/* 关系变化 */}
            {result.consequences.reputation && Object.entries(result.consequences.reputation).length > 0 && (
              <div className="p-3 bg-blue-50 rounded animate-reward-pop col-span-2" style={{ animationDelay: '0.4s' }}>
                <span className="text-blue-600">👑 声望变化</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(result.consequences.reputation).map(([faction, change]) => (
                    <span key={faction} className="animate-relation-pulse inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-100">
                      <span>{factionLabels[faction as keyof typeof factionLabels]?.slice(0, 2) || faction}</span>
                      <span className={change > 0 ? 'text-green-600' : 'text-red-600'}>
                        {change > 0 ? '+' : ''}{change}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {/* 新标签 */}
            {result.consequences.newTags && result.consequences.newTags.length > 0 && (
              <div className="p-3 bg-green-50 rounded animate-reward-pop col-span-2" style={{ animationDelay: '0.5s' }}>
                <span className="text-green-600">🏷️ 新标签</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {result.consequences.newTags.map((tag) => (
                    <span key={tag} className="px-2 py-1 rounded bg-green-100 text-green-700 animate-slideIn">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
          >
            继续
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
      {/* 事件头部 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {event.faction && (
              <span className={`px-2 py-1 rounded text-sm ${factionColors[event.faction]}`}>
                {factionLabels[event.faction]}
              </span>
            )}
            <h2 className="text-lg font-bold text-gray-800">{event.title}</h2>
          </div>
          <div className="text-sm text-gray-500">第{event.triggeredAt}日</div>
        </div>
      </div>

      {/* 事件内容 */}
      <div className="p-6">
        {/* 描述 */}
        <p className="text-gray-600 mb-4">{event.description}</p>

        {/* 小说风格叙事 */}
        <div
          className="p-4 bg-gray-50 rounded-lg mb-6 text-gray-700"
          style={{ fontFamily: 'serif' }}
        >
          {event.narrativeText}
        </div>

        {/* 选择面板 */}
        <div className="space-y-3 mb-6">
          <h3 className="text-sm font-medium text-gray-500">【你的选择】</h3>
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
            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-all">
              暂不处理
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={selectedChoice === null || isSubmitting}
            className={`px-6 py-2 rounded-lg transition-all ${
              showConfirmAnimation ? 'animate-decision-confirm ring-2 ring-[var(--accent-gold)]' : ''
            } ${
              selectedChoice !== null && !isSubmitting
                ? 'bg-blue-500 text-white hover:bg-blue-600 hover:scale-105'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <span className="animate-pulse flex items-center gap-2">
                <span className="animate-ap-consume">⚡</span>
                处理中...
              </span>
            ) : '确认选择'}
          </button>
        </div>
      </div>
    </div>
  )
}
