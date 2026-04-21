import { useState, useEffect } from 'react'
import { npcApi } from '../../services'

/**
 * NPC关系详情卡片 - 显示玩家与NPC的关系状态
 * 包含关系等级、变化动画、关系历史
 */

// 关系等级配置
const relationshipConfig: Record<string, { name: string; color: string; icon: string }> = {
  enemy: { name: '死敌', color: 'text-[var(--accent-red)]', icon: '💀' },
  hostile: { name: '敌对', color: 'text-[var(--accent-red)]', icon: '⚔️' },
  distrust: { name: '不信任', color: 'text-orange-400', icon: '🤨' },
  neutral: { name: '中立', color: 'text-[var(--text-muted)]', icon: '😐' },
  friendly: { name: '友好', color: 'text-[var(--accent-green)]', icon: '😊' },
  respect: { name: '尊敬', color: 'text-[var(--accent-blue)]', icon: '🙏' },
  admire: { name: '爱慕', color: 'text-[var(--accent-purple)]', icon: '❤️' },
}

interface NPC {
  id: string
  name: string
  faction?: string
  role?: string
  relationship?: {
    level: string
    value: number
  }
}

interface NPCRelationshipCardProps {
  npc: NPC
  prevRelationship?: string
  onRelationshipChange?: (npcId: string, oldLevel: string, newLevel: string) => void
}

export default function NPCRelationshipCard({ npc, prevRelationship, onRelationshipChange }: NPCRelationshipCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showChange, setShowChange] = useState(false)
  const [currentLevel, setCurrentLevel] = useState(npc.relationship?.level || 'neutral')
  const [relationshipValue, setRelationshipValue] = useState(npc.relationship?.value || 0)

  // 关系变化时触发动画
  useEffect(() => {
    if (prevRelationship && prevRelationship !== currentLevel) {
      setShowChange(true)
      onRelationshipChange?.(npc.id, prevRelationship, currentLevel)
      const timer = setTimeout(() => setShowChange(false), 1000)
      return () => clearTimeout(timer)
    }
  }, [currentLevel, prevRelationship])

  const config = relationshipConfig[currentLevel] || relationshipConfig.neutral
  const isPositive = prevRelationship
    ? Object.keys(relationshipConfig).indexOf(currentLevel) > Object.keys(relationshipConfig).indexOf(prevRelationship)
    : true

  // 加载NPC详情
  const handleLoadDetail = async () => {
    setIsLoading(true)
    try {
      const response = await npcApi.getDetail(npc.id)
      if (response.data.success) {
        const data = response.data.data
        if (data.relationship) {
          setCurrentLevel(data.relationship.level || 'neutral')
          setRelationshipValue(data.relationship.value || 0)
        }
      }
    } catch (error) {
      console.error('Failed to load NPC detail:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className={`card-modern-alt transition-all duration-300 ${showChange ? (isPositive ? 'animate-attr-change' : 'animate-attr-decrease') : ''}`}
    >
      <div className="flex items-center justify-between">
        {/* NPC信息 */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-lg">
            {config.icon}
          </div>
          <div>
            <span className="font-medium text-[var(--text-primary)] font-display">{npc.name}</span>
            {npc.faction && (
              <p className="text-xs text-[var(--text-muted)]">{npc.faction} · {npc.role}</p>
            )}
          </div>
        </div>

        {/* 关系等级 */}
        <div className="text-right">
          <span className={`font-medium font-display ${config.color}`}>
            {config.name}
          </span>
          <div className="flex items-center gap-1 justify-end mt-1">
            <div className="progress-modern" style={{ width: '60px', height: '4px' }}>
              <div
                className="progress-fill"
                style={{
                  width: `${Math.max(0, Math.min(100, relationshipValue))}%`,
                  backgroundColor: config.color.includes('red') ? 'var(--accent-red)' :
                    config.color.includes('green') ? 'var(--accent-green)' :
                    config.color.includes('blue') ? 'var(--accent-blue)' :
                    config.color.includes('purple') ? 'var(--accent-purple)' :
                    'var(--text-muted)'
                }}
              />
            </div>
            <span className="text-xs text-[var(--text-muted)]">{relationshipValue}</span>
          </div>
        </div>
      </div>

      {/* 变化浮动提示 */}
      {showChange && (
        <div className={`text-xs font-bold text-center mt-2 ${isPositive ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'} animate-float-up`}>
          {isPositive ? '关系提升' : '关系下降'}
        </div>
      )}

      {/* 详情按钮 */}
      <button
        onClick={handleLoadDetail}
        disabled={isLoading}
        className="w-full mt-3 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
      >
        {isLoading ? '加载中...' : '查看详情'}
      </button>
    </div>
  )
}
