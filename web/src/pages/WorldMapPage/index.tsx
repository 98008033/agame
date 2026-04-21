import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { worldApi } from '../../services'
import { usePlayerStore } from '../../stores/playerStore'
import { UserAvatarMenu } from '../../components'

// 阵营配置
const factionConfig: Record<string, { name: string; icon: string; color: string; bgAlpha: string }> = {
  canglong: { name: '苍龙帝国', icon: '\u{1F409}', color: '#22C55E', bgAlpha: 'rgba(34, 197, 94, 0.15)' },
  shuanglang: { name: '霜狼联邦', icon: '\u{1F43A}', color: '#0EA5E9', bgAlpha: 'rgba(14, 165, 233, 0.15)' },
  jinque: { name: '金雀花王国', icon: '\u{1F338}', color: '#F97316', bgAlpha: 'rgba(249, 115, 22, 0.15)' },
  border: { name: '边境联盟', icon: '\u{1F3D8}\u{FE0F}', color: '#A855F7', bgAlpha: 'rgba(168, 85, 247, 0.15)' },
  neutral: { name: '中立地带', icon: '\u26AA', color: '#64748B', bgAlpha: 'rgba(100, 116, 139, 0.1)' },
}

// 城市数据结构
interface CityData {
  id: string
  name: string
  faction: string
  population: number
  x: number // 0-100 percentage
  y: number // 0-100 percentage
  hasConflict: boolean
  description?: string
}

//  Faction 势力数据
interface FactionPower {
  id: string
  name: string
  icon: string
  color: string
  power: number
  cities: number
  trend: 'up' | 'down' | 'stable'
}

// MVP默认地图数据 (当API未就绪时使用)
const defaultMapData: { cities: CityData[]; factions: FactionPower[] } = {
  cities: [
    // 苍龙帝国 - 东部
    { id: 'tiandu', name: '天都', faction: 'canglong', population: 500000, x: 78, y: 25, hasConflict: false, description: '帝国首都，六部所在地' },
    { id: 'longcheng', name: '龙城', faction: 'canglong', population: 120000, x: 82, y: 50, hasConflict: false, description: '军事重镇' },
    { id: 'jiangnan', name: '江南', faction: 'canglong', population: 200000, x: 75, y: 72, hasConflict: false, description: '丝绸与茶叶之都' },
    { id: 'donghai', name: '东海', faction: 'canglong', population: 80000, x: 90, y: 60, hasConflict: true, description: '东部港口，贸易枢纽' },
    // 霜狼联邦 - 北部
    { id: 'hanhai', name: '瀚海', faction: 'shuanglang', population: 60000, x: 45, y: 12, hasConflict: false, description: '联邦首府，草原之心' },
    { id: 'xueyuan', name: '雪原', faction: 'shuanglang', population: 40000, x: 25, y: 18, hasConflict: false, description: '北方狩猎部落聚集地' },
    { id: 'beifeng', name: '北风', faction: 'shuanglang', population: 35000, x: 60, y: 10, hasConflict: true, description: '边境贸易城' },
    // 金雀花王国 - 西部
    { id: 'rosevale', name: '玫瑰谷', faction: 'jinque', population: 150000, x: 12, y: 40, hasConflict: false, description: '王国首都，魔法学院所在地' },
    { id: 'silverwood', name: '银木', faction: 'jinque', population: 70000, x: 8, y: 60, hasConflict: false, description: '古老森林边的学术城' },
    { id: 'crystalpeak', name: '水晶峰', faction: 'jinque', population: 45000, x: 18, y: 25, hasConflict: false, description: '山脉中的魔法研究圣地' },
    // 边境联盟 - 南部
    { id: 'twilight', name: '暮光城', faction: 'border', population: 50000, x: 50, y: 85, hasConflict: false, description: '边境联盟核心城市' },
    { id: 'ironforge', name: '铁炉堡', faction: 'border', population: 30000, x: 35, y: 78, hasConflict: false, description: '武器锻造中心' },
    { id: 'sunset', name: '落日港', faction: 'border', population: 40000, x: 65, y: 80, hasConflict: true, description: '南部重要港口' },
    // 中立地带
    { id: 'crossroads', name: '十字路口', faction: 'neutral', population: 25000, x: 50, y: 50, hasConflict: false, description: '四方交汇的自由贸易城' },
    { id: 'mistvale', name: '雾谷', faction: 'neutral', population: 15000, x: 40, y: 40, hasConflict: false, description: '隐秘的山谷小镇' },
  ],
  factions: [
    { id: 'canglong', name: '苍龙帝国', icon: '\u{1F409}', color: '#22C55E', power: 85, cities: 4, trend: 'stable' },
    { id: 'shuanglang', name: '霜狼联邦', icon: '\u{1F43A}', color: '#0EA5E9', power: 62, cities: 3, trend: 'up' },
    { id: 'jinque', name: '金雀花王国', icon: '\u{1F338}', color: '#F97316', power: 70, cities: 3, trend: 'down' },
    { id: 'border', name: '边境联盟', icon: '\u{1F3D8}\u{FE0F}', color: '#A855F7', power: 45, cities: 3, trend: 'up' },
  ],
}

// 城市详情弹窗
function CityDetailModal({ city, onClose }: { city: CityData; onClose: () => void }) {
  const navigate = useNavigate()
  const faction = factionConfig[city.faction] || factionConfig.neutral
  const popFormatted = city.population >= 100000
    ? `${(city.population / 100000).toFixed(1)}万`
    : `${city.population / 1000}千`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="card-modern mx-4 w-full max-w-sm animate-slideUp"
        style={{ borderColor: faction.color + '60' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold font-display" style={{ color: faction.color }}>
              {faction.icon} {city.name}
            </h3>
            <span className="tag-modern mt-1" style={{ color: faction.color, background: faction.bgAlpha }}>
              {faction.name}
            </span>
          </div>
          <button onClick={onClose} className="btn-modern px-2 py-1 text-sm">&times;</button>
        </div>

        {city.description && (
          <p className="text-sm text-[var(--text-secondary)] mb-3">{city.description}</p>
        )}

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">人口</span>
            <span className="font-medium text-[var(--text-primary)]">{popFormatted}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">状态</span>
            {city.hasConflict
              ? <span className="text-[var(--accent-red)] font-medium">⚔️ 冲突中</span>
              : <span className="text-[var(--accent-green)] font-medium">和平</span>
            }
          </div>
        </div>

        <div className="divider-modern" />

        <button
          onClick={() => { navigate('/factions'); onClose() }}
          className="btn-modern w-full text-sm"
          style={{ borderColor: faction.color }}
        >
          查看{faction.name}详情
        </button>
      </div>
    </div>
  )
}

// SVG地图组件
function WorldMap({
  cities,
  playerCityId,
  onCityClick,
}: {
  cities: CityData[]
  playerCityId: string | null
  onCityClick: (city: CityData) => void
}) {
  return (
    <div className="relative w-full" style={{ paddingBottom: '65%' }}>
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full"
        style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}
      >
        {/* 阵营区域 - 简化为矩形区块 */}
        {/* 霜狼联邦 - 北部 */}
        <rect x="15" y="3" width="55" height="22" rx="3" fill={factionConfig.shuanglang.bgAlpha} stroke={factionConfig.shuanglang.color} strokeWidth="0.3" strokeOpacity="0.4" />
        <text x="42" y="15" textAnchor="middle" fill={factionConfig.shuanglang.color} fontSize="3" opacity="0.6">霜狼联邦</text>

        {/* 金雀花王国 - 西部 */}
        <rect x="3" y="18" width="22" height="55" rx="3" fill={factionConfig.jinque.bgAlpha} stroke={factionConfig.jinque.color} strokeWidth="0.3" strokeOpacity="0.4" />
        <text x="14" y="48" textAnchor="middle" fill={factionConfig.jinque.color} fontSize="3" opacity="0.6" transform="rotate(-90, 14, 48)">金雀花王国</text>

        {/* 苍龙帝国 - 东部 */}
        <rect x="68" y="18" width="29" height="55" rx="3" fill={factionConfig.canglong.bgAlpha} stroke={factionConfig.canglong.color} strokeWidth="0.3" strokeOpacity="0.4" />
        <text x="82" y="48" textAnchor="middle" fill={factionConfig.canglong.color} fontSize="3" opacity="0.6" transform="rotate(90, 82, 48)">苍龙帝国</text>

        {/* 边境联盟 - 南部 */}
        <rect x="25" y="72" width="50" height="25" rx="3" fill={factionConfig.border.bgAlpha} stroke={factionConfig.border.color} strokeWidth="0.3" strokeOpacity="0.4" />
        <text x="50" y="86" textAnchor="middle" fill={factionConfig.border.color} fontSize="3" opacity="0.6">边境联盟</text>

        {/* 中立区域 - 中部 */}
        <rect x="30" y="30" width="40" height="38" rx="4" fill={factionConfig.neutral.bgAlpha} stroke={factionConfig.neutral.color} strokeWidth="0.2" strokeOpacity="0.3" />
        <text x="50" y="51" textAnchor="middle" fill={factionConfig.neutral.color} fontSize="2.5" opacity="0.5">中立地带</text>

        {/* 连接线 - 城市间的贸易路线 */}
        <line x1="50" y1="50" x2="78" y2="25" stroke="rgba(255,255,255,0.06)" strokeWidth="0.15" strokeDasharray="0.5,0.5" />
        <line x1="50" y1="50" x2="12" y2="40" stroke="rgba(255,255,255,0.06)" strokeWidth="0.15" strokeDasharray="0.5,0.5" />
        <line x1="50" y1="50" x2="50" y2="85" stroke="rgba(255,255,255,0.06)" strokeWidth="0.15" strokeDasharray="0.5,0.5" />
        <line x1="50" y1="50" x2="45" y2="12" stroke="rgba(255,255,255,0.06)" strokeWidth="0.15" strokeDasharray="0.5,0.5" />

        {/* 城市标记 */}
        {cities.map((city) => {
          const fc = factionConfig[city.faction] || factionConfig.neutral
          const isPlayerCity = city.id === playerCityId
          const radius = city.population > 200000 ? 2.2 : city.population > 80000 ? 1.6 : 1.2

          return (
            <g
              key={city.id}
              onClick={() => onCityClick(city)}
              style={{ cursor: 'pointer' }}
            >
              {/* 冲突标记 */}
              {city.hasConflict && (
                <circle cx={city.x} cy={city.y} r={radius + 1.5} fill="none" stroke="var(--accent-red)" strokeWidth="0.3" opacity="0.7">
                  <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
                </circle>
              )}

              {/* 玩家位置脉冲 */}
              {isPlayerCity && (
                <>
                  <circle cx={city.x} cy={city.y} r={radius + 3} fill="none" stroke="var(--accent-gold)" strokeWidth="0.4">
                    <animate attributeName="r" values={`${radius + 1};${radius + 4};${radius + 1}`} dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={city.x} cy={city.y} r={radius + 1.5} fill="none" stroke="var(--accent-gold)" strokeWidth="0.3">
                    <animate attributeName="r" values={`${radius + 0.5}; ${radius + 2.5}; ${radius + 0.5}`} dur="1.5s" repeatCount="indefinite" begin="0.5s" />
                    <animate attributeName="opacity" values="0.6;0.1;0.6" dur="1.5s" repeatCount="indefinite" begin="0.5s" />
                  </circle>
                </>
              )}

              {/* 城市点 */}
              <circle
                cx={city.x}
                cy={city.y}
                r={radius}
                fill={fc.color}
                stroke="var(--bg-primary)"
                strokeWidth="0.3"
                opacity={isPlayerCity ? 1 : 0.85}
              />

              {/* 城市名称 */}
              <text
                x={city.x}
                y={city.y - radius - 0.8}
                textAnchor="middle"
                fill={isPlayerCity ? 'var(--accent-gold)' : 'var(--text-primary)'}
                fontSize={isPlayerCity ? '2.8' : '2.2'}
                fontWeight={isPlayerCity ? 'bold' : 'normal'}
                style={{ pointerEvents: 'none' }}
              >
                {city.name}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// 阵营势力面板
function FactionPowerPanel({ factions }: { factions: FactionPower[] }) {
  return (
    <div className="card-modern">
      <h3 className="text-sm font-bold text-[var(--text-primary)] font-display mb-3">阵营势力</h3>
      <div className="space-y-3">
        {factions.map((f) => {
          const trendIcon = f.trend === 'up' ? '\u2191' : f.trend === 'down' ? '\u2193' : '\u2192'
          const trendColor = f.trend === 'up' ? 'var(--accent-green)' : f.trend === 'down' ? 'var(--accent-red)' : 'var(--text-muted)'

          return (
            <div key={f.id}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{f.icon}</span>
                  <span className="text-xs font-medium text-[var(--text-primary)]">{f.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: trendColor }}>{trendIcon}</span>
                  <span className="text-xs font-bold font-display" style={{ color: f.color }}>{f.power}</span>
                </div>
              </div>
              <div className="progress-modern" style={{ height: '6px' }}>
                <div
                  className="progress-fill transition-all duration-500"
                  style={{ width: `${f.power}%`, backgroundColor: f.color }}
                />
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">
                {f.cities} 座城市
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// 主页面
export default function WorldMapPage() {
  const navigate = useNavigate()
  const player = usePlayerStore((s) => s.player)
  const [cities, setCities] = useState<CityData[]>([])
  const [factionPowers, setFactionPowers] = useState<FactionPower[]>([])
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 玩家当前城市
  const playerCityId = player?.city || player?.faction === 'border' ? 'twilight'
    : player?.faction === 'canglong' ? 'tiandu'
      : player?.faction === 'shuanglang' ? 'hanhai'
        : player?.faction === 'jinque' ? 'rosevale'
          : 'twilight'

  const loadData = useCallback(async () => {
    try {
      // 尝试从API获取地图数据
      const mapResp = await worldApi.getWorldMap()
      if (mapResp.data.success && mapResp.data.data) {
        const data = mapResp.data.data
        setCities(data.cities || [])
        setFactionPowers(data.factions || [])
      } else {
        // 使用默认数据
        setCities(defaultMapData.cities)
        setFactionPowers(defaultMapData.factions)
      }
    } catch {
      // API未就绪，使用默认数据
      setCities(defaultMapData.cities)
      setFactionPowers(defaultMapData.factions)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)]">
        <header className="header-modern">
          <div className="container-wide flex items-center justify-between">
            <h1 className="text-lg font-bold text-[var(--text-primary)] font-display">世界地图</h1>
            <UserAvatarMenu />
          </div>
        </header>
        <div className="container-wide py-6">
          <div className="text-center py-12 text-[var(--text-muted)]">加载中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="header-modern">
        <div className="container-wide flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="btn-modern text-sm px-3 py-1">
              ← 返回
            </button>
            <h1 className="text-lg font-bold text-[var(--text-primary)] font-display">世界地图</h1>
          </div>
          <UserAvatarMenu />
        </div>
      </header>

      {/* Main */}
      <main className="container-wide py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* 地图区域 - 占3列 */}
          <div className="lg:col-span-3">
            <div className="card-modern p-2">
              {/* 图例 */}
              <div className="flex flex-wrap gap-3 mb-3 px-2">
                {Object.entries(factionConfig).map(([key, fc]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: fc.color }} />
                    <span className="text-xs text-[var(--text-secondary)]">{fc.name}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-xs text-[var(--accent-red)] animate-pulse">⚔️</span>
                  <span className="text-xs text-[var(--text-secondary)]">冲突</span>
                </div>
              </div>

              {/* SVG地图 */}
              <WorldMap
                cities={cities}
                playerCityId={playerCityId}
                onCityClick={setSelectedCity}
              />

              {/* 当前玩家位置 */}
              <div className="mt-3 px-2 flex items-center gap-2">
                <span className="text-xs text-[var(--text-muted)]">当前位置:</span>
                <span className="text-xs font-medium" style={{ color: 'var(--accent-gold)' }}>
                  {cities.find(c => c.id === playerCityId)?.name || playerCityId}
                </span>
              </div>
            </div>
          </div>

          {/* 侧边栏 - 占1列 */}
          <div className="lg:col-span-1 space-y-4">
            <FactionPowerPanel factions={factionPowers} />

            {/* 城市列表 */}
            <div className="card-modern">
              <h3 className="text-sm font-bold text-[var(--text-primary)] font-display mb-3">城市列表</h3>
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {cities.map((city) => {
                  const fc = factionConfig[city.faction] || factionConfig.neutral
                  const isPlayerCity = city.id === playerCityId
                  return (
                    <button
                      key={city.id}
                      onClick={() => setSelectedCity(city)}
                      className={`w-full text-left px-2 py-1.5 rounded-md transition-colors text-sm flex items-center justify-between ${isPlayerCity ? 'bg-[var(--accent-gold)]/10' : 'hover:bg-[var(--bg-elevated)]'}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: fc.color }} />
                        <span className={`truncate ${isPlayerCity ? 'font-bold' : ''}`} style={isPlayerCity ? { color: 'var(--accent-gold)' } : undefined}>
                          {city.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {city.hasConflict && <span className="text-[var(--accent-red)] text-xs">⚔️</span>}
                        {isPlayerCity && <span className="text-xs">📍</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 地图说明 */}
            <div className="card-modern-alt text-xs text-[var(--text-muted)] space-y-1">
              <p>🖱️ 点击城市查看详情</p>
              <p>📍 金色标记为玩家当前位置</p>
              <p>⚔️ 红色脉冲表示冲突区域</p>
            </div>
          </div>
        </div>
      </main>

      {/* 城市详情弹窗 */}
      {selectedCity && (
        <CityDetailModal city={selectedCity} onClose={() => setSelectedCity(null)} />
      )}
    </div>
  )
}
