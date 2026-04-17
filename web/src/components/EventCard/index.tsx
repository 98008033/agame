import { useState } from 'react'
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

export default function EventCard({ event, onDecision, onClose }: EventCardProps) {
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<DecisionResult | null>(null)

  const handleSubmit = async () => {
    if (selectedChoice === null) return

    setIsSubmitting(true)
    try {
      const decisionResult = await onDecision(event.id, selectedChoice)
      setResult(decisionResult)
    } catch (error) {
      console.error('决策失败:', error)
    }
    setIsSubmitting(false)
  }

  // 显示结果
  if (result) {
    return (
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
        <div className="text-center">
          <div className="text-2xl mb-4">{result.success ? '✓' : '✗'}</div>
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            {result.success ? '决策成功' : '决策失败'}
          </h3>

          {/* 叙事反馈 */}
          <div
            className="text-gray-600 mb-6 p-4 bg-gray-50 rounded-lg"
            style={{ fontFamily: 'serif' }}
          >
            {result.narrativeFeedback}
          </div>

          {/* 后果显示 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {result.consequences.gold !== undefined && (
              <div className="p-3 bg-yellow-50 rounded">
                <span className="text-yellow-600">💰 金币</span>
                <span className="font-bold ml-2">{result.consequences.gold}</span>
              </div>
            )}
            {result.consequences.influence !== undefined && (
              <div className="p-3 bg-purple-50 rounded">
                <span className="text-purple-600">⭐ 影响力</span>
                <span className="font-bold ml-2">{result.consequences.influence}</span>
              </div>
            )}
          </div>

          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
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
            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">
              暂不处理
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={selectedChoice === null || isSubmitting}
            className={`px-6 py-2 rounded-lg ${
              selectedChoice !== null && !isSubmitting
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? '处理中...' : '确认选择'}
          </button>
        </div>
      </div>
    </div>
  )
}
