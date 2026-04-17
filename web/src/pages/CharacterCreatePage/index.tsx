import { useState } from 'react'
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
    color: 'bg-yellow-100 border-yellow-400 text-yellow-700',
    icon: '🐉',
  },
  shuanglang: {
    name: '霜狼联邦',
    description: '北方的部落联盟，崇尚自由和荣誉。',
    color: 'bg-blue-100 border-blue-400 text-blue-700',
    icon: '🐺',
  },
  jinque: {
    name: '金雀花王国',
    description: '南方的商业王国，贸易与财富的中心。',
    color: 'bg-green-100 border-green-400 text-green-700',
    icon: '🌸',
  },
  border: {
    name: '边境联盟',
    description: '三国交界之地，自由与混乱并存。',
    color: 'bg-amber-100 border-amber-400 text-amber-700',
    icon: '🏘️',
  },
}

// 创建步骤
type Step = 'name' | 'origin' | 'faction' | 'confirm'

export default function CharacterCreatePage() {
  const { isCreating, createCharacter } = usePlayerStore()
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const [age, setAge] = useState(18)
  const [selectedOrigin, setSelectedOrigin] = useState<OriginType | null>(null)
  const [selectedFaction, setSelectedFaction] = useState<Faction | null>(null)

  // 处理创建
  const handleCreate = async () => {
    if (!selectedOrigin || !selectedFaction || !name.trim()) return

    await createCharacter({
      name: name.trim(),
      age,
      origin: selectedOrigin,
      faction: selectedFaction,
    })

    // 创建成功后跳转（这里简化处理）
    alert('角色创建成功！')
  }

  // 渲染名称输入步骤
  if (step === 'name') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">创建你的角色</h1>

          <div className="space-y-4">
            {/* 名称输入 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">角色名称</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入角色名称"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={20}
              />
            </div>

            {/* 年龄选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">年龄</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                min={15}
                max={60}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">建议年龄: 15-60岁</p>
            </div>

            {/* 下一步按钮 */}
            <button
              onClick={() => setStep('origin')}
              disabled={!name.trim()}
              className={`w-full py-3 rounded-lg ${
                name.trim()
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">选择你的出身</h1>
          <p className="text-gray-500 text-center mb-6">出身决定你的初始属性和技能</p>

          {/* 出身选项 */}
          <div className="space-y-3 mb-6">
            {originConfigs.map((origin) => (
              <button
                key={origin.id}
                onClick={() => setSelectedOrigin(origin.id)}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  selectedOrigin === origin.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-gray-800">{origin.name}</div>
                <div className="text-sm text-gray-500 mt-1">{origin.description}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(origin.bonusAttributes).map(([attr, value]) => (
                    <span
                      key={attr}
                      className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded"
                    >
                      {attr} +{value}
                    </span>
                  ))}
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  起始: {origin.startingLocation} | 💰{origin.startingResources.gold} | ⭐
                  {origin.startingResources.influence}
                </div>
              </button>
            ))}
          </div>

          {/* 导航按钮 */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep('name')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              上一步
            </button>
            <button
              onClick={() => setStep('faction')}
              disabled={!selectedOrigin}
              className={`flex-1 py-2 rounded-lg ${
                selectedOrigin
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">选择你的阵营</h1>
          <p className="text-gray-500 text-center mb-6">阵营决定你的故事起点</p>

          {/* 阵营选项 */}
          <div className="space-y-3 mb-6">
            {(Object.keys(factionInfo) as Faction[]).map((faction) => {
              const info = factionInfo[faction]
              return (
                <button
                  key={faction}
                  onClick={() => setSelectedFaction(faction)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    selectedFaction === faction
                      ? info.color + ' border-current'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{info.icon}</span>
                    <div>
                      <div className="font-medium">{info.name}</div>
                      <div className="text-sm opacity-70">{info.description}</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* 导航按钮 */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep('origin')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              上一步
            </button>
            <button
              onClick={() => setStep('confirm')}
              disabled={!selectedFaction}
              className={`flex-1 py-2 rounded-lg ${
                selectedFaction
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">确认你的角色</h1>

        {/* 角色信息汇总 */}
        <div className="space-y-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="font-medium text-gray-800 text-lg">{name}</div>
            <div className="text-sm text-gray-500">{age}岁</div>
          </div>

          {originConfig && (
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="font-medium text-purple-800">{originConfig.name}</div>
              <div className="text-sm text-purple-600">{originConfig.description}</div>
            </div>
          )}

          {selectedFaction && (
            <div className={`p-4 rounded-lg ${factionInfo[selectedFaction].color}`}>
              <div className="font-medium">{factionInfo[selectedFaction].name}</div>
              <div className="text-sm opacity-70">{factionInfo[selectedFaction].description}</div>
            </div>
          )}

          {/* 属性预览 */}
          {originConfig && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-700 mb-2">初始属性</div>
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
                      <span className="text-gray-500">{label}</span>
                      <span className="font-medium ml-1">{base + bonus}</span>
                      {bonus > 0 && <span className="text-green-500 text-xs">+{bonus}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 资源预览 */}
          {originConfig && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-700 mb-2">起始资源</div>
              <div className="flex justify-around">
                <div className="text-center">
                  <span className="text-xl">💰</span>
                  <span className="font-medium ml-1">{originConfig.startingResources.gold}</span>
                </div>
                <div className="text-center">
                  <span className="text-xl">⭐</span>
                  <span className="font-medium ml-1">
                    {originConfig.startingResources.influence}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 导航按钮 */}
        <div className="flex gap-3">
          <button
            onClick={() => setStep('faction')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            上一步
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className={`flex-1 py-2 rounded-lg ${
              isCreating
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {isCreating ? '创建中...' : '创建角色'}
          </button>
        </div>
      </div>
    </div>
  )
}
