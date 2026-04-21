import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  usePlayerStore,
  originConfigs,
  type Faction,
  type OriginType,
} from '../../stores/playerStore'

// 阵营信息
const factionInfo = {
  canglong: { nameKey: 'factions.canglong', color: 'var(--faction-canglong)', icon: '🐉', descKey: 'factions.canglong_desc' },
  shuanglang: { nameKey: 'factions.shuanglang', color: 'var(--faction-shuanglang)', icon: '🐺', descKey: 'factions.shuanglang_desc' },
  jinque: { nameKey: 'factions.jinque', color: 'var(--faction-jinque)', icon: '🌸', descKey: 'factions.jinque_desc' },
  border: { nameKey: 'factions.border', color: 'var(--faction-border)', icon: '🏘️', descKey: 'factions.border_desc' },
}

// 创建步骤
type Step = 'name' | 'origin' | 'faction' | 'confirm'

export default function CharacterCreatePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
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

      setMessage({ type: 'success', text: t('character_create.createSuccess') })

      setTimeout(() => {
        navigate('/status')
      }, 1500)
    } catch {
      setMessage({ type: 'error', text: t('character_create.createFailed') })
    }
  }

  // 渲染名称输入步骤
  if (step === 'name') {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <div className="card-modern max-w-md w-full">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6 text-center font-display">{t('character_create.title')}</h1>

          <div className="space-y-4">
            {/* 名称输入 */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">{t('character_create.roleLabel')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('character_create.namePlaceholder')}
                className="input-modern w-full"
                maxLength={20}
              />
            </div>

            {/* 年龄选择 */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">{t('character_create.age')}</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                min={15}
                max={60}
                className="input-modern w-full"
              />
              <p className="text-sm text-[var(--text-muted)] mt-1">{t('character_create.ageHint')}</p>
            </div>

            {/* 下一步按钮 */}
            <button
              onClick={() => setStep('origin')}
              disabled={!name.trim()}
              className={`btn-primary w-full py-3 ${!name.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {t('character_create.nextOrigin')}
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
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2 text-center font-display">{t('character_create.originTitle')}</h1>
          <p className="text-[var(--text-muted)] text-center mb-6">{t('character_create.originSubtitle')}</p>

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
                <div className="font-medium text-[var(--text-primary)] font-display">{t(`origins.${origin.id}`)}</div>
                <div className="text-sm text-[var(--text-muted)] mt-1">{t(`origins.${origin.id}Desc`)}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(origin.bonusAttributes).map(([attr, value]) => (
                    <span key={attr} className="tag-modern tag-success">
                      {attr} +{value}
                    </span>
                  ))}
                </div>
                <div className="text-sm text-[var(--text-secondary)] mt-2">
                  {t('character_create.originPrefix')}: {origin.startingLocation} | 💰{origin.startingResources.gold} | ⭐
                  {origin.startingResources.influence}
                </div>
              </button>
            ))}
          </div>

          {/* 导航按钮 */}
          <div className="flex gap-3">
            <button onClick={() => setStep('name')} className="btn-modern">
              {t('character_create.prevStep')}
            </button>
            <button
              onClick={() => setStep('faction')}
              disabled={!selectedOrigin}
              className={`btn-primary flex-1 ${!selectedOrigin ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {t('character_create.nextFaction')}
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
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2 text-center font-display">{t('character_create.factionTitle')}</h1>
          <p className="text-[var(--text-muted)] text-center mb-6">{t('character_create.factionSubtitle')}</p>

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
                      <div className="font-medium text-[var(--text-primary)] font-display">{t(info.nameKey)}</div>
                      <div className="text-sm text-[var(--text-muted)]">{t(info.descKey)}</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* 导航按钮 */}
          <div className="flex gap-3">
            <button onClick={() => setStep('origin')} className="btn-modern">
              {t('character_create.prevStep')}
            </button>
            <button
              onClick={() => setStep('confirm')}
              disabled={!selectedFaction}
              className={`btn-primary flex-1 ${!selectedFaction ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {t('character_create.nextConfirm')}
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
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6 text-center font-display">{t('character_create.confirmTitle')}</h1>

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
            <div className="text-sm text-[var(--text-muted)]">{age}{t('character_create.ageSuffix')}</div>
          </div>

          {originConfig && (
            <div className="card-modern-alt bg-[var(--bg-secondary)]">
              <div className="font-medium text-[var(--text-primary)] font-display">{t(`origins.${originConfig.id}`)}</div>
              <div className="text-sm text-[var(--text-muted)]">{t(`origins.${originConfig.id}Desc`)}</div>
            </div>
          )}

          {selectedFaction && (
            <div
              className="card-modern-alt"
              style={{ borderColor: factionInfo[selectedFaction].color }}
            >
              <div className="font-medium text-[var(--text-primary)] font-display">
                {factionInfo[selectedFaction].icon} {t(factionInfo[selectedFaction].nameKey)}
              </div>
              <div className="text-sm text-[var(--text-muted)]">{t(factionInfo[selectedFaction].descKey)}</div>
            </div>
          )}

          {/* 属性预览 */}
          {originConfig && (
            <div className="card-modern-alt">
              <div className="text-sm font-medium text-[var(--text-secondary)] mb-2 font-display">{t('character_create.initialAttributes')}</div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                {Object.entries({
                  physique: 'attributes.physique',
                  agility: 'attributes.agility',
                  wisdom: 'attributes.wisdom',
                  willpower: 'attributes.willpower',
                  perception: 'attributes.perception',
                  charisma: 'attributes.charisma',
                }).map(([key, label]) => {
                  const base = 40
                  const bonus = originConfig.bonusAttributes[key] || 0
                  return (
                    <div key={key} className="text-center">
                      <span className="text-[var(--text-muted)]">{t(label)}</span>
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
              <div className="text-sm font-medium text-[var(--text-secondary)] mb-2 font-display">{t('character_create.startingResources')}</div>
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
            {t('character_create.prevStep')}
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className={`btn-success flex-1 py-3 ${isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isCreating ? t('character_create.creating') : t('character_create.createButton')}
          </button>
        </div>
      </div>
    </div>
  )
}