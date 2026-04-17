import { usePlayerStore } from '../../stores/playerStore'

// 阵营信息
const factionInfo = {
  canglong: { name: '苍龙帝国', icon: '🐉', color: 'text-yellow-700' },
  shuanglang: { name: '霜狼联邦', icon: '🐺', color: 'text-blue-700' },
  jinque: { name: '金雀花王国', icon: '🌸', color: 'text-green-700' },
  border: { name: '边境联盟', icon: '🏘️', color: 'text-amber-700' },
}

// 属性显示名称
const attributeNames: Record<string, string> = {
  physique: '体魄',
  agility: '敏捷',
  wisdom: '智慧',
  willpower: '意志',
  perception: '感知',
  charisma: '魅力',
  fame: '名望',
  infamy: '恶名',
  luck: '幸运',
}

// 阵营等级显示
const factionLevelNames: Record<string, string> = {
  neutral: '中立',
  friendly: '友好',
  member: '成员',
  officer: '官员',
  leader: '领袖',
}

export default function StatusPage() {
  const { player } = usePlayerStore()

  // 如果是新玩家，显示提示
  if (player.isNew || !player.id) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">请先创建角色</p>
        </div>
      </div>
    )
  }

  const factionData = player.faction ? factionInfo[player.faction] : null

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 头部 */}
      <header className="bg-white border-b border-gray-200 py-4 sticky top-0">
        <div className="max-w-md mx-auto px-4">
          <h1 className="text-lg font-bold text-gray-800">状态面板</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        {/* 玩家基本信息 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{player.name}</h2>
              <p className="text-sm text-gray-500">
                Lv.{player.level} · {player.age}岁
              </p>
            </div>
            {factionData && (
              <div className={`text-right ${factionData.color}`}>
                <span className="text-xl">{factionData.icon}</span>
                <span className="ml-1 font-medium">{factionData.name}</span>
              </div>
            )}
          </div>
          {player.faction && (
            <div className="mt-2 text-sm text-gray-600">
              阵营地位：{factionLevelNames[player.factionLevel]}
            </div>
          )}
        </div>

        {/* 十维属性 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">【十维属性】</h3>
          <div className="space-y-3">
            {Object.entries(player.attributes).map(([key, value]) => (
              <div key={key} className="flex items-center">
                <span className="w-12 text-sm text-gray-600">{attributeNames[key]}</span>
                <div className="flex-1 h-4 bg-gray-200 rounded-full mx-2">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${Math.min(value, 100)}%` }}
                  />
                </div>
                <span className="w-8 text-sm text-gray-800 font-medium text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 资源 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">【资源】</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <span className="text-xl">💰</span>
              <span className="font-bold text-yellow-700 ml-1">{player.resources.gold}</span>
              <p className="text-xs text-gray-500 mt-1">金币</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <span className="text-xl">⭐</span>
              <span className="font-bold text-purple-700 ml-1">{player.resources.influence}</span>
              <p className="text-xs text-gray-500 mt-1">影响力</p>
            </div>
          </div>
        </div>

        {/* 经验值 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">【等级进度】</h3>
          <div className="flex items-center">
            <span className="text-sm text-gray-600">Lv.{player.level}</span>
            <div className="flex-1 h-4 bg-gray-200 rounded-full mx-2">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${Math.min(player.experience, 100)}%` }}
              />
            </div>
            <span className="text-sm text-gray-800">{player.experience}/100</span>
          </div>
        </div>

        {/* 标签 */}
        {player.tags.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">【标签】</h3>
            <div className="flex flex-wrap gap-2">
              {player.tags.map((tag) => (
                <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 出身信息 */}
        {player.origin && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">【出身】</h3>
            <p className="text-gray-600">{player.origin}</p>
          </div>
        )}
      </main>
    </div>
  )
}
