import { useTranslation } from 'react-i18next'
import type { RiskLevel, Faction } from '../../stores/eventStore'

interface ChoiceOptionProps {
  text: string
  description: string
  riskLevel: RiskLevel
  isUnlocked: boolean
  costs?: {
    gold?: number
    influence?: number
    reputation?: Partial<Record<Faction, number>>
    description: string
  }
  rewards?: {
    gold?: number
    influence?: number
    reputation?: Partial<Record<Faction, number>>
    items?: string[]
    description: string
  }
  skillRequirement?: {
    skillId: string
    skillName: string
    level: number
    reason: string
  }
  cannotChooseReason?: string
  isSelected: boolean
  onSelect: () => void
}

// 风险颜色映射
const riskColors: Record<RiskLevel, string> = {
  low: 'text-green-600 bg-green-50',
  medium: 'text-yellow-600 bg-yellow-50',
  high: 'text-orange-600 bg-orange-50',
  critical: 'text-red-600 bg-red-50',
}

const riskLabels: Record<RiskLevel, string> = {
  low: '低风险',
  medium: '中等风险',
  high: '高风险',
  critical: '极高风险',
}

export default function ChoiceOption({
  text,
  description,
  riskLevel,
  isUnlocked,
  costs,
  rewards,
  skillRequirement,
  cannotChooseReason,
  isSelected,
  onSelect,
}: ChoiceOptionProps) {
  const { t } = useTranslation()
  return (
    <div
      onClick={isUnlocked ? onSelect : undefined}
      className={`p-4 rounded-lg border-2 transition-all duration-300 ${
        isSelected
          ? 'border-blue-500 bg-blue-50 animate-choice-select scale-[1.02]'
          : isUnlocked
            ? 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 hover:scale-[1.01] cursor-pointer'
            : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
      }`}
    >
      {/* 选择指示器 */}
      <div className="flex items-start gap-3">
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
            isSelected ? 'border-blue-500 bg-blue-500 scale-110 animate-success-pop' : 'border-gray-300'
          }`}
        >
          {isSelected && <span className="text-white text-xs animate-fadeIn">✓</span>}
        </div>

        <div className="flex-1">
          {/* 选项文本 */}
          <div className="font-medium text-gray-800 mb-1">{text}</div>
          <div className="text-sm text-gray-500 mb-2">{description}</div>

          {/* 技能需求 */}
          {skillRequirement && (
            <div className="text-sm text-purple-600 mb-2">
              🔒 {t('choice.requirement', { skillName: skillRequirement.skillName, level: skillRequirement.level })}+
              {!isUnlocked && (
                <span className="text-red-500 ml-2">({skillRequirement.reason})</span>
              )}
            </div>
          )}

          {/* 风险等级 */}
          <div className={`text-xs px-2 py-1 rounded inline-block ${riskColors[riskLevel]}`}>
            {riskLabels[riskLevel]}
          </div>

          {/* 代价 */}
          {costs && (
            <div className="mt-2 text-sm text-gray-600">
              <span className="text-red-500">{t('choice.cost')}</span>
              {costs.gold && <span className="ml-1">💰{costs.gold}</span>}
              {costs.influence && <span className="ml-1">⭐{costs.influence}</span>}
              <span className="ml-1 text-gray-500">{costs.description}</span>
            </div>
          )}

          {/* 收益 */}
          {rewards && (
            <div className="mt-2 text-sm text-gray-600">
              <span className="text-green-500">{t('choice.benefit')}</span>
              {rewards.gold && <span className="ml-1">💰{rewards.gold}</span>}
              {rewards.influence && <span className="ml-1">⭐{rewards.influence}</span>}
              {rewards.items && rewards.items.length > 0 && (
                <span className="ml-1">📦{rewards.items.join(', ')}</span>
              )}
              <span className="ml-1 text-gray-500">{rewards.description}</span>
            </div>
          )}

          {/* 解锁失败原因 */}
          {!isUnlocked && cannotChooseReason && (
            <div className="mt-2 text-sm text-red-500">{cannotChooseReason}</div>
          )}
        </div>
      </div>
    </div>
  )
}
