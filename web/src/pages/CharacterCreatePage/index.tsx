import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  usePlayerStore,
  originConfigs,
  type Faction,
  type OriginType,
} from '../../stores/playerStore'

// 阵营信息
const factionInfo = {
  canglong: {
    name: '苍龙帝国',
    description: '东方的古老帝国，以权力和秩序著称。',
    color: 'var(--faction-canglong)',
    icon: '🐉',
  },
  shuanglang: {
    name: '霜狼联邦',
    description: '北方的部落联盟，崇尚自由和荣誉。',
    color: 'var(--faction-shuanglang)',
    icon: '🐺',
  },
  jinque: {
    name: '金雀花王国',
    description: '南方的商业王国，贸易与财富的中心。',
    color: 'var(--faction-jinque)',
    icon: '🌸',
  },
  border: {
    name: '边境联盟',
    description: '三国交界之地，自由与混乱并存。',
    color: 'var(--faction-border)',
    icon: '🏘️',
  },
}

// 创建步骤
type Step = 'name' | 'origin' | 'faction' | 'confirm'

export default function CharacterCreatePage() {
  const navigate = useNavigate()
  const { isCreating, createCharacter } = usePlayerStore()
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const [age, setAge] = useState(18)
  const [selectedOrigin, setSelectedOrigin] = useState<OriginType | null>(null)
  const [selectedFaction, setSelectedFaction] = useState<Faction | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // 处理创建
  const handleCreate = async () => {
    if (!selectedOrigin || !selectedFaction || !name.trim()) return

    try {
      await createCharacter({
        name: name.trim(),
        age,
        origin: selectedOrigin,
        faction: selectedFaction,
      })

      setMessage({ type: 'success', text: '角色创建成功！' })

      setTimeout(() => {
        navigate('/status')
      }, 1500)
    } catch {
      setMessage({ type: 'error', text: '创建失败，请重试' })
    }
  }

  // 渲染名称输入步骤
  if (step === 'name') {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <div className="card-modern max-w-md w-full">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6 text-center font-display">创建你的角色</h1>

          <div className="space-y-4">
            {/* 名称输入 */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">角色名称</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入角色名称"
                className="input-modern w-full"
                maxLength={20}
              />
            </div>

            {/* 年龄选择 */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">年龄</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                min={15}
                max={60}
                className="input-modern w-full"
              />
              <p className="text-sm text-[var(--text-muted)] mt-1">建议年龄: 15-60岁</p>
            </div>

            {/* 下一步按钮 */}
            <button
              onClick={() => setStep('origin')}
              disabled={!name.trim()}
              className={`btn-primary w-full py-3 ${!name.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              下一步：选择出身
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 渲染出身选择步骤
  if (step === 'origin') {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <div className="card-modern max-w-lg w-full">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2 text-center font-display">选择你的出身</h1>
          <p className="text-[var(--text-muted)] text-center mb-6">出身决定你的初始属性和技能</p>

          {/* 出身选项 */}
          <div className="space-y-3 mb-6">
            {originConfigs.map((origin) => (
              <button
                key={origin.id}
                onClick={() => setSelectedOrigin(origin.id)}
                className={`card-modern-alt w-full text-left transition-all ${
                  selectedOrigin === origin.id
                    ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/10'
                    : ''
                }`}
              >
                <div className="font-medium text-[var(--text-primary)] font-display">{origin.name}</div>
                <div className="text-sm text-[var(--text-muted)] mt-1">{origin.description}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(origin.bonusAttributes).map(([attr, value]) => (
                    <span key={attr} className="tag-modern tag-success">
                      {attr} +{value}
                    </span>
                  ))}
                </div>
                <div className="text-sm text-[var(--text-secondary)] mt-2">
                  起始: {origin.startingLocation} | 💰{origin.startingResources.gold} | ⭐
                  {origin.startingResources.influence}
                </div>
              </button>
            ))}
          </div>

          {/* 导航按钮 */}
          <div className="flex gap-3">
            <button onClick={() => setStep('name')} className="btn-modern">
              上一步
            </button>
            <button
              onClick={() => setStep('faction')}
              disabled={!selectedOrigin}
              className={`btn-primary flex-1 ${!selectedOrigin ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              下一步：选择阵营
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 渲染阵营选择步骤
  if (step === 'faction') {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <div className="card-modern max-w-lg w-full">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2 text-center font-display">选择你的阵营</h1>
          <p className="text-[var(--text-muted)] text-center mb-6">阵营决定你的故事起点</p>

          {/* 阵营选项 */}
          <div className="space-y-3 mb-6">
            {(Object.keys(factionInfo) as Faction[]).map((faction) => {
              const info = factionInfo[faction]
              return (
                <button
                  key={faction}
                  onClick={() => setSelectedFaction(faction)}
                  className={`card-modern-alt w-full text-left transition-all ${
                    selectedFaction === faction ? 'bg-[var(--bg-elevated)]' : ''
                  }`}
                  style={{ borderColor: selectedFaction === faction ? info.color : undefined }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{info.icon}</span>
                    <div>
                      <div className="font-medium text-[var(--text-primary)] font-display">{info.name}</div>
                      <div className="text-sm text-[var(--text-muted)]">{info.description}</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* 导航按钮 */}
          <div className="flex gap-3">
            <button onClick={() => setStep('origin')} className="btn-modern">
              上一步
            </button>
            <button
              onClick={() => setStep('confirm')}
              disabled={!selectedFaction}
              className={`btn-primary flex-1 ${!selectedFaction ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              下一步：确认角色
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 渲染确认步骤
  const originConfig = originConfigs.find((o) => o.id === selectedOrigin)

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="card-modern max-w-md w-full">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6 text-center font-display">确认你的角色</h1>

        {/* 成功/错误消息 */}
        {message && (
          <div className={`mb-4 p-4 rounded-[var(--radius-md)] text-center ${
            message.type === 'success'
              ? 'bg-[var(--accent-green)]/20 text-[var(--accent-green)]'
              : 'bg-[var(--accent-red)]/20 text-[var(--accent-red)]'
          }`}>
            <span className="text-xl mr-2">{message.type === 'success' ? '✨' : '⚠️'}</span>
            {message.text}
          </div>
        )}

        {/* 角色信息汇总 */}
        <div className="space-y-4 mb-6">
          <div className="card-modern-alt">
            <div className="font-medium text-[var(--text-primary)] text-lg font-display">{name}</div>
            <div className="text-sm text-[var(--text-muted)]">{age}岁</div>
          </div>

          {originConfig && (
            <div className="card-modern-alt bg-[var(--bg-secondary)]">
              <div className="font-medium text-[var(--text-primary)] font-display">{originConfig.name}</div>
              <div className="text-sm text-[var(--text-muted)]">{originConfig.description}</div>
            </div>
          )}

          {selectedFaction && (
            <div
              className="card-modern-alt"
              style={{ borderColor: factionInfo[selectedFaction].color }}
            >
              <div className="font-medium text-[var(--text-primary)] font-display">
                {factionInfo[selectedFaction].icon} {factionInfo[selectedFaction].name}
              </div>
              <div className="text-sm text-[var(--text-muted)]">{factionInfo[selectedFaction].description}</div>
            </div>
          )}

          {/* 属性预览 */}
          {originConfig && (
            <div className="card-modern-alt">
              <div className="text-sm font-medium text-[var(--text-secondary)] mb-2 font-display">初始属性</div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                {Object.entries({
                  physique: '体魄',
                  agility: '敏捷',
                  wisdom: '智慧',
                  willpower: '意志',
                  perception: '感知',
                  charisma: '魅力',
                }).map(([key, label]) => {
                  const base = 40
                  const bonus = originConfig.bonusAttributes[key] || 0
                  return (
                    <div key={key} className="text-center">
                      <span className="text-[var(--text-muted)]">{label}</span>
                      <span className="font-medium text-[var(--text-primary)] ml-1">{base + bonus}</span>
                      {bonus > 0 && <span className="text-[var(--accent-green)] text-xs">+{bonus}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 资源预览 */}
          {originConfig && (
            <div className="card-modern-alt">
              <div className="text-sm font-medium text-[var(--text-secondary)] mb-2 font-display">起始资源</div>
              <div className="flex justify-around">
                <div className="text-center">
                  <span className="text-xl">💰</span>
                  <span className="font-medium text-[var(--accent-gold)] ml-1">{originConfig.startingResources.gold}</span>
                </div>
                <div className="text-center">
                  <span className="text-xl">⭐</span>
                  <span className="font-medium text-[var(--accent-purple)] ml-1">
                    {originConfig.startingResources.influence}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 导航按钮 */}
        <div className="flex gap-3">
          <button onClick={() => setStep('faction')} className="btn-modern">
            上一步
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className={`btn-success flex-1 py-3 ${isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isCreating ? '创建中...' : '创建角色'}
          </button>
        </div>
      </div>
    </div>
  )
}