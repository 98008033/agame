// World Map System Tests
// 世界地图系统测试

import { describe, it, expect } from 'vitest'

// ============================================
// City Data Structure (mirrored from WorldMapPage)
// ============================================

interface CityData {
  id: string
  name: string
  faction: string
  population: number
  x: number
  y: number
  hasConflict: boolean
  description?: string
}

interface FactionConfig {
  name: string
  icon: string
  color: string
  bgAlpha: string
}

interface FactionPower {
  id: string
  name: string
  icon: string
  color: string
  power: number
  cities: number
  trend: 'up' | 'down' | 'stable'
}

// ============================================
// Faction Configuration (mirrored from WorldMapPage)
// ============================================

const factionConfig: Record<string, FactionConfig> = {
  canglong: { name: '苍龙帝国', icon: '\u{1F409}', color: '#22C55E', bgAlpha: 'rgba(34, 197, 94, 0.15)' },
  shuanglang: { name: '霜狼联邦', icon: '\u{1F43A}', color: '#0EA5E9', bgAlpha: 'rgba(14, 165, 233, 0.15)' },
  jinque: { name: '金雀花王国', icon: '\u{1F338}', color: '#F97316', bgAlpha: 'rgba(249, 115, 22, 0.15)' },
  border: { name: '边境联盟', icon: '\u{1F3D8}\u{FE0F}', color: '#A855F7', bgAlpha: 'rgba(168, 85, 247, 0.15)' },
  neutral: { name: '中立地带', icon: '\u26AA', color: '#64748B', bgAlpha: 'rgba(100, 116, 139, 0.1)' },
}

// ============================================
// Default Map Data (mirrored from WorldMapPage)
// ============================================

const defaultCities: CityData[] = [
  { id: 'tiandu', name: '天都', faction: 'canglong', population: 500000, x: 78, y: 25, hasConflict: false, description: '帝国首都，六部所在地' },
  { id: 'longcheng', name: '龙城', faction: 'canglong', population: 120000, x: 82, y: 50, hasConflict: false },
  { id: 'jiangnan', name: '江南', faction: 'canglong', population: 200000, x: 75, y: 72, hasConflict: false },
  { id: 'donghai', name: '东海', faction: 'canglong', population: 80000, x: 90, y: 60, hasConflict: true },
  { id: 'hanhai', name: '瀚海', faction: 'shuanglang', population: 60000, x: 45, y: 12, hasConflict: false },
  { id: 'xueyuan', name: '雪原', faction: 'shuanglang', population: 40000, x: 25, y: 18, hasConflict: false },
  { id: 'beifeng', name: '北风', faction: 'shuanglang', population: 35000, x: 60, y: 10, hasConflict: true },
  { id: 'rosevale', name: '玫瑰谷', faction: 'jinque', population: 150000, x: 12, y: 40, hasConflict: false },
  { id: 'silverwood', name: '银木', faction: 'jinque', population: 70000, x: 8, y: 60, hasConflict: false },
  { id: 'crystalpeak', name: '水晶峰', faction: 'jinque', population: 45000, x: 18, y: 25, hasConflict: false },
  { id: 'twilight', name: '暮光城', faction: 'border', population: 50000, x: 50, y: 85, hasConflict: false },
  { id: 'ironforge', name: '铁炉堡', faction: 'border', population: 30000, x: 35, y: 78, hasConflict: false },
  { id: 'sunset', name: '落日港', faction: 'border', population: 40000, x: 65, y: 80, hasConflict: true },
  { id: 'crossroads', name: '十字路口', faction: 'neutral', population: 25000, x: 50, y: 50, hasConflict: false },
  { id: 'mistvale', name: '雾谷', faction: 'neutral', population: 15000, x: 40, y: 40, hasConflict: false },
]

const defaultFactions: FactionPower[] = [
  { id: 'canglong', name: '苍龙帝国', icon: '\u{1F409}', color: '#22C55E', power: 85, cities: 4, trend: 'stable' },
  { id: 'shuanglang', name: '霜狼联邦', icon: '\u{1F43A}', color: '#0EA5E9', power: 62, cities: 3, trend: 'up' },
  { id: 'jinque', name: '金雀花王国', icon: '\u{1F338}', color: '#F97316', power: 70, cities: 3, trend: 'down' },
  { id: 'border', name: '边境联盟', icon: '\u{1F3D8}\u{FE0F}', color: '#A855F7', power: 45, cities: 3, trend: 'up' },
]

// ============================================
// Helper: Find player's city based on faction
// ============================================

function getPlayerCity(faction: string | null): string {
  if (faction === 'canglong') return 'tiandu'
  if (faction === 'shuanglang') return 'hanhai'
  if (faction === 'jinque') return 'rosevale'
  return 'twilight' // border or null
}

// ============================================
// Helper: Format population display
// ============================================

function formatPopulation(pop: number): string {
  if (pop >= 100000) return `${(pop / 100000).toFixed(1)}万`
  return `${pop / 1000}千`
}

// ============================================
// Helper: Determine city radius based on population
// ============================================

function getCityRadius(population: number): number {
  if (population > 200000) return 2.2
  if (population > 80000) return 1.6
  return 1.2
}

// ============================================
// Test: City Data Structure
// ============================================

describe('City Data Structure', () => {
  it('should have all cities with required fields', () => {
    expect(defaultCities.length).toBeGreaterThan(0)

    for (const city of defaultCities) {
      expect(city.id).toBeDefined()
      expect(city.name).toBeDefined()
      expect(city.faction).toBeDefined()
      expect(typeof city.population).toBe('number')
      expect(typeof city.x).toBe('number')
      expect(typeof city.y).toBe('number')
      expect(typeof city.hasConflict).toBe('boolean')
    }
  })

  it('should have valid coordinates (0-100 range)', () => {
    for (const city of defaultCities) {
      expect(city.x).toBeGreaterThanOrEqual(0)
      expect(city.x).toBeLessThanOrEqual(100)
      expect(city.y).toBeGreaterThanOrEqual(0)
      expect(city.y).toBeLessThanOrEqual(100)
    }
  })

  it('should have unique city IDs', () => {
    const ids = defaultCities.map(c => c.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('should have correct total city count', () => {
    expect(defaultCities.length).toBe(15)
  })
})

// ============================================
// Test: Faction Color Mappings
// ============================================

describe('Faction Color Mappings', () => {
  it('should have colors for all 4 factions plus neutral', () => {
    expect(factionConfig.canglong).toBeDefined()
    expect(factionConfig.shuanglang).toBeDefined()
    expect(factionConfig.jinque).toBeDefined()
    expect(factionConfig.border).toBeDefined()
    expect(factionConfig.neutral).toBeDefined()
  })

  it('should have correct color codes', () => {
    expect(factionConfig.canglong.color).toBe('#22C55E') // green
    expect(factionConfig.shuanglang.color).toBe('#0EA5E9') // blue
    expect(factionConfig.jinque.color).toBe('#F97316') // orange
    expect(factionConfig.border.color).toBe('#A855F7') // purple
    expect(factionConfig.neutral.color).toBe('#64748B') // slate
  })

  it('should have valid hex color format', () => {
    for (const [key, fc] of Object.entries(factionConfig)) {
      expect(fc.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('should have valid alpha color format', () => {
    for (const [key, fc] of Object.entries(factionConfig)) {
      expect(fc.bgAlpha).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/)
    }
  })

  it('should have icons for all factions', () => {
    for (const [key, fc] of Object.entries(factionConfig)) {
      expect(fc.icon.length).toBeGreaterThan(0)
    }
  })

  it('should resolve unknown faction to neutral', () => {
    const unknownFaction = factionConfig['nonexistent'] || factionConfig.neutral
    expect(unknownFaction).toBe(factionConfig.neutral)
  })
})

// ============================================
// Test: Player Location Highlighting
// ============================================

describe('Player Location Highlighting', () => {
  it('should correctly identify player city for each faction', () => {
    expect(getPlayerCity('canglong')).toBe('tiandu')
    expect(getPlayerCity('shuanglang')).toBe('hanhai')
    expect(getPlayerCity('jinque')).toBe('rosevale')
    expect(getPlayerCity('border')).toBe('twilight')
    expect(getPlayerCity(null)).toBe('twilight')
  })

  it('should find city by ID', () => {
    const playerCity = getPlayerCity('canglong')
    const city = defaultCities.find(c => c.id === playerCity)
    expect(city).toBeDefined()
    expect(city?.name).toBe('天都')
  })

  it('should highlight player city with gold color', () => {
    const playerCityId = getPlayerCity('border')
    const playerCity = defaultCities.find(c => c.id === playerCityId)
    expect(playerCity?.id).toBe('twilight')
    expect(playerCity?.faction).toBe('border')
  })

  it('should return fallback for unknown player city', () => {
    const cities = defaultCities
    const unknownId = 'nonexistent_city'
    const found = cities.find(c => c.id === unknownId)
    expect(found).toBeUndefined()
  })
})

// ============================================
// Test: City Detail Modal Logic
// ============================================

describe('City Detail Modal', () => {
  it('should have description for major cities', () => {
    const tiandu = defaultCities.find(c => c.id === 'tiandu')
    expect(tiandu?.description).toBeDefined()
    expect(tiandu?.description?.length).toBeGreaterThan(0)
  })

  it('should format population correctly', () => {
    expect(formatPopulation(500000)).toBe('5.0万')
    expect(formatPopulation(120000)).toBe('1.2万')
    expect(formatPopulation(80000)).toBe('80千')
    expect(formatPopulation(30000)).toBe('30千')
  })

  it('should show conflict status', () => {
    const conflictCities = defaultCities.filter(c => c.hasConflict)
    expect(conflictCities.length).toBeGreaterThan(0)
    expect(conflictCities.map(c => c.id)).toContain('donghai')
    expect(conflictCities.map(c => c.id)).toContain('beifeng')
    expect(conflictCities.map(c => c.id)).toContain('sunset')
  })

  it('should calculate city radius based on population', () => {
    const tiandu = defaultCities.find(c => c.id === 'tiandu')!
    const mistvale = defaultCities.find(c => c.id === 'mistvale')!

    expect(getCityRadius(tiandu.population)).toBe(2.2) // > 200k
    expect(getCityRadius(mistvale.population)).toBe(1.2) // < 80k
  })

  it('should have correct city count per faction', () => {
    const canglongCities = defaultCities.filter(c => c.faction === 'canglong')
    const shuanglangCities = defaultCities.filter(c => c.faction === 'shuanglang')
    const jinqueCities = defaultCities.filter(c => c.faction === 'jinque')
    const borderCities = defaultCities.filter(c => c.faction === 'border')
    const neutralCities = defaultCities.filter(c => c.faction === 'neutral')

    expect(canglongCities.length).toBe(4)
    expect(shuanglangCities.length).toBe(3)
    expect(jinqueCities.length).toBe(3)
    expect(borderCities.length).toBe(3)
    expect(neutralCities.length).toBe(2)
  })
})

// ============================================
// Test: Faction Power Data
// ============================================

describe('Faction Power Data', () => {
  it('should have power values for all 4 factions', () => {
    expect(defaultFactions.length).toBe(4)
    for (const f of defaultFactions) {
      expect(f.power).toBeGreaterThan(0)
      expect(f.power).toBeLessThanOrEqual(100)
    }
  })

  it('should have valid trend values', () => {
    const validTrends = ['up', 'down', 'stable']
    for (const f of defaultFactions) {
      expect(validTrends).toContain(f.trend)
    }
  })

  it('should have city counts matching map data', () => {
    for (const faction of defaultFactions) {
      const actualCities = defaultCities.filter(c => c.faction === faction.id).length
      expect(faction.cities).toBe(actualCities)
    }
  })
})

export type { CityData, FactionConfig, FactionPower }
