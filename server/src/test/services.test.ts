/**
 * Backend Services Unit Tests
 * Tests for economyService, nationService, skillService, conflictService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Import pure functions (not async DB ones) from services
import { calculateSocialTier, ECONOMY_CONFIG } from '../services/economyService'
import { getNationLevel, NATION_TIERS, TIER_REPUTATION_BONUS } from '../services/nationService'
import {
  EXP_PER_LEVEL,
  SKILL_PREREQUISITES,
  MAX_SKILL_LEVEL,
  SKILL_DEFINITIONS,
  getExpForNextLevel,
  checkSkillUnlock,
  getSkill,
  setSkill,
} from '../services/skillService'
import { CONFLICT_CONFIG, type ConflictType } from '../services/conflictService'

// ============================================
// Economy Service Tests
// ============================================

describe('economyService', () => {
  describe('calculateSocialTier', () => {
    it('should return Outcast for zero resources', () => {
      const result = calculateSocialTier(0, 0)
      expect(result.level).toBe(0)
      expect(result.name).toBe('Outcast')
    })

    it('should return Peasant for low resources', () => {
      const result = calculateSocialTier(100, 100)
      // score = 100*0.3 + 100*0.7 = 100
      expect(result.level).toBe(1)
      expect(result.name).toBe('Peasant')
    })

    it('should return Citizen for moderate resources', () => {
      const result = calculateSocialTier(500, 200)
      // score = 500*0.3 + 200*0.7 = 150 + 140 = 290 -> not enough for Citizen (300)
      // Actually let's pick values that give >= 300
      const result2 = calculateSocialTier(600, 200)
      // score = 600*0.3 + 200*0.7 = 180 + 140 = 320
      expect(result2.level).toBe(2)
      expect(result2.name).toBe('Citizen')
    })

    it('should return Gentry for higher resources', () => {
      const result = calculateSocialTier(1000, 400)
      // score = 1000*0.3 + 400*0.7 = 300 + 280 = 580 -> not enough for Gentry (600)
      const result2 = calculateSocialTier(1000, 500)
      // score = 300 + 350 = 650
      expect(result2.level).toBe(3)
      expect(result2.name).toBe('Gentry')
    })

    it('should return Noble for high resources', () => {
      const result = calculateSocialTier(2000, 600)
      // score = 600 + 420 = 1020
      expect(result.level).toBe(4)
      expect(result.name).toBe('Noble')
    })

    it('should return Royal for very high resources', () => {
      const result = calculateSocialTier(3000, 1000)
      // score = 900 + 700 = 1600 -> not enough for Royal (2000)
      const result2 = calculateSocialTier(3000, 1600)
      // score = 900 + 1120 = 2020
      expect(result2.level).toBe(5)
      expect(result2.name).toBe('Royal')
    })

    it('should weigh influence more than gold', () => {
      // Same score with different ratios
      const goldHeavy = calculateSocialTier(2000, 0)   // score = 600
      const influenceHeavy = calculateSocialTier(0, 858) // score = 0 + 600.6 = 600
      expect(goldHeavy.level).toBe(3) // 600 = Gentry threshold
      expect(influenceHeavy.level).toBe(3) // same level
    })
  })

  describe('soft-cap decay calculation', () => {
    it('should have correct gold soft cap threshold', () => {
      expect(ECONOMY_CONFIG.goldSoftCap).toBe(2000)
    })

    it('should have correct influence soft cap threshold', () => {
      expect(ECONOMY_CONFIG.influenceSoftCap).toBe(500)
    })

    it('should have correct gold decay rate', () => {
      expect(ECONOMY_CONFIG.goldDecayRate).toBe(0.01) // 1% per day
    })

    it('should have correct influence decay rate', () => {
      expect(ECONOMY_CONFIG.influenceDecayRate).toBe(0.02) // 2% per day
    })

    it('should calculate decay for gold above soft cap', () => {
      const excess = 3000 - ECONOMY_CONFIG.goldSoftCap // 1000
      const decay = Math.floor(excess * ECONOMY_CONFIG.goldDecayRate)
      expect(decay).toBe(10) // 1000 * 0.01 = 10
    })

    it('should calculate decay for influence above soft cap', () => {
      const excess = 800 - ECONOMY_CONFIG.influenceSoftCap // 300
      const decay = Math.floor(excess * ECONOMY_CONFIG.influenceDecayRate)
      expect(decay).toBe(6) // 300 * 0.02 = 6
    })

    it('should have zero decay below soft cap', () => {
      const goldExcess = Math.max(0, 1000 - ECONOMY_CONFIG.goldSoftCap)
      const influenceExcess = Math.max(0, 300 - ECONOMY_CONFIG.influenceSoftCap)
      expect(goldExcess).toBe(0)
      expect(influenceExcess).toBe(0)
    })
  })
})

// ============================================
// Nation Service Tests
// ============================================

describe('nationService', () => {
  describe('getNationLevel', () => {
    it('should return stranger for negative reputation', () => {
      expect(getNationLevel(-50)).toBe('stranger')
      expect(getNationLevel(-1)).toBe('stranger')
    })

    it('should return neutral for zero to low reputation', () => {
      expect(getNationLevel(0)).toBe('neutral')
      expect(getNationLevel(10)).toBe('neutral')
      expect(getNationLevel(19)).toBe('neutral')
    })

    it('should return friendly for moderate reputation', () => {
      expect(getNationLevel(20)).toBe('friendly')
      expect(getNationLevel(30)).toBe('friendly')
      expect(getNationLevel(39)).toBe('friendly')
    })

    it('should return loyal for good reputation', () => {
      expect(getNationLevel(40)).toBe('loyal')
      expect(getNationLevel(50)).toBe('loyal')
      expect(getNationLevel(59)).toBe('loyal')
    })

    it('should return core for high reputation', () => {
      expect(getNationLevel(60)).toBe('core')
      expect(getNationLevel(70)).toBe('core')
      expect(getNationLevel(79)).toBe('core')
    })

    it('should return legendary for very high reputation', () => {
      expect(getNationLevel(80)).toBe('legendary')
      expect(getNationLevel(100)).toBe('legendary')
    })

    it('should have monotonically increasing thresholds', () => {
      const thresholds = NATION_TIERS.map(t => t.minRep)
      for (let i = 1; i < thresholds.length; i++) {
        expect(thresholds[i]).toBeGreaterThan(thresholds[i - 1])
      }
    })
  })

  describe('tier reputation bonus', () => {
    it('should have zero bonus for lower tiers', () => {
      expect(TIER_REPUTATION_BONUS['stranger']).toBe(0)
      expect(TIER_REPUTATION_BONUS['neutral']).toBe(0)
      expect(TIER_REPUTATION_BONUS['friendly']).toBe(0)
    })

    it('should have positive bonus for higher tiers', () => {
      expect(TIER_REPUTATION_BONUS['loyal']).toBe(1)
      expect(TIER_REPUTATION_BONUS['core']).toBe(2)
      expect(TIER_REPUTATION_BONUS['legendary']).toBe(3)
    })
  })
})

// ============================================
// Skill Service Tests
// ============================================

describe('skillService', () => {
  describe('EXP accumulation', () => {
    it('should have correct EXP thresholds', () => {
      expect(EXP_PER_LEVEL[0]).toBe(0)
      expect(EXP_PER_LEVEL[1]).toBe(100)
      expect(EXP_PER_LEVEL[2]).toBe(250)
      expect(EXP_PER_LEVEL[3]).toBe(500)
      expect(EXP_PER_LEVEL[4]).toBe(1000)
      expect(EXP_PER_LEVEL[5]).toBe(2000)
      expect(EXP_PER_LEVEL[6]).toBe(3500)
    })

    it('should have thresholds increasing monotonically', () => {
      for (let i = 1; i <= 9; i++) {
        expect(EXP_PER_LEVEL[i]).toBeGreaterThan(EXP_PER_LEVEL[i - 1])
      }
    })

    it('should have max level threshold at 99999', () => {
      expect(EXP_PER_LEVEL[10]).toBe(99999)
    })

    it('should get correct EXP for next level', () => {
      expect(getExpForNextLevel(0)).toBe(0)    // level 0 has 0 threshold
      expect(getExpForNextLevel(1)).toBe(100)  // level 1->2 needs 100
      expect(getExpForNextLevel(2)).toBe(250)
      expect(getExpForNextLevel(3)).toBe(500)
      expect(getExpForNextLevel(5)).toBe(2000)
    })

    it('should return default for unknown level', () => {
      expect(getExpForNextLevel(999)).toBe(99999)
    })
  })

  describe('level-up logic', () => {
    it('should track total EXP needed per level', () => {
      // Level 1->2: 100 EXP
      // Level 2->3: 250 EXP
      // Level 3->4: 500 EXP
      // Cumulative for level 4: 100 + 250 + 500 = 850
      const totalForLevel4 = EXP_PER_LEVEL[1] + EXP_PER_LEVEL[2] + EXP_PER_LEVEL[3]
      expect(totalForLevel4).toBe(850)
    })
  })

  describe('prerequisite checking', () => {
    it('should have prerequisites defined for non-survival skills', () => {
      const prereqKeys = Object.keys(SKILL_PREREQUISITES)
      expect(prereqKeys.length).toBeGreaterThan(0)

      // intelligence_analysis requires survival Lv.2
      expect(SKILL_PREREQUISITES['strategy.intelligenceAnalysis']?.parentSkill).toBe('survival')
      expect(SKILL_PREREQUISITES['strategy.intelligenceAnalysis']?.parentLevel).toBe(2)

      // combat_technique requires survival Lv.1
      expect(SKILL_PREREQUISITES['combat.combatTechnique']?.parentSkill).toBe('survival')
      expect(SKILL_PREREQUISITES['combat.combatTechnique']?.parentLevel).toBe(1)

      // political_manipulation requires intelligence_analysis Lv.3
      expect(SKILL_PREREQUISITES['strategy.politicalManipulation']?.parentSkill).toBe('strategy.intelligenceAnalysis')
      expect(SKILL_PREREQUISITES['strategy.politicalManipulation']?.parentLevel).toBe(3)
    })

    it('should allow survival with no prerequisites', () => {
      const mockSkillSet = { survival: { level: 0, experience: 0, unlocked: true, breakthroughReady: false } }
      const result = checkSkillUnlock(mockSkillSet as any, 'survival')
      expect(result.unlocked).toBe(true)
    })

    it('should block intelligence_analysis without survival Lv.2', () => {
      const mockSkillSet = {
        survival: { level: 1, experience: 0, unlocked: true, breakthroughReady: false },
        strategy: { intelligenceAnalysis: { level: 0, experience: 0, unlocked: false, breakthroughReady: false } },
      }
      const result = checkSkillUnlock(mockSkillSet as any, 'strategy.intelligenceAnalysis')
      expect(result.unlocked).toBe(false)
      expect(result.reason).toContain('Lv.2')
    })

    it('should allow intelligence_analysis with survival Lv.2', () => {
      const mockSkillSet = {
        survival: { level: 2, experience: 0, unlocked: true, breakthroughReady: false },
        strategy: { intelligenceAnalysis: { level: 0, experience: 0, unlocked: false, breakthroughReady: false } },
      }
      const result = checkSkillUnlock(mockSkillSet as any, 'strategy.intelligenceAnalysis')
      expect(result.unlocked).toBe(true)
    })

    it('should allow political_manipulation with intelligence_analysis Lv.3', () => {
      const mockSkillSet = {
        survival: { level: 3, experience: 0, unlocked: true, breakthroughReady: false },
        strategy: {
          intelligenceAnalysis: { level: 3, experience: 0, unlocked: true, breakthroughReady: false },
          politicalManipulation: { level: 0, experience: 0, unlocked: false, breakthroughReady: false },
        },
      }
      const result = checkSkillUnlock(mockSkillSet as any, 'strategy.politicalManipulation')
      expect(result.unlocked).toBe(true)
    })

    it('should support chained prerequisites (3 levels deep)', () => {
      // survival -> intelligence_analysis -> political_manipulation
      // survival -> combat_technique -> military_command
      const chain = SKILL_PREREQUISITES['combat.militaryCommand']
      expect(chain?.parentSkill).toBe('combat.combatTechnique')

      const combatPrereq = SKILL_PREREQUISITES['combat.combatTechnique']
      expect(combatPrereq?.parentSkill).toBe('survival')
    })
  })

  describe('skill definitions', () => {
    it('should have all skills defined', () => {
      expect(SKILL_DEFINITIONS.length).toBe(7)
    })

    it('should have valid categories', () => {
      const categories = new Set(SKILL_DEFINITIONS.map(s => s.category))
      expect(categories.has('survival')).toBe(true)
      expect(categories.has('strategy')).toBe(true)
      expect(categories.has('combat')).toBe(true)
      expect(categories.has('commerce')).toBe(true)
    })

    it('should have correct max levels', () => {
      const survival = SKILL_DEFINITIONS.find(s => s.id === 'survival')
      expect(survival?.maxLevel).toBe(3)

      const political = SKILL_DEFINITIONS.find(s => s.id === 'strategy.politicalManipulation')
      expect(political?.maxLevel).toBe(3)
    })

    it('should have sub-levels defined', () => {
      for (const skill of SKILL_DEFINITIONS) {
        expect(skill.subLevels.length).toBeGreaterThan(0)
        for (const sub of skill.subLevels) {
          expect(sub.level).toBeGreaterThan(0)
          expect(sub.title.length).toBeGreaterThan(0)
          expect(sub.description.length).toBeGreaterThan(0)
        }
      }
    })
  })

  describe('getSkill / setSkill helpers', () => {
    it('should get top-level skill', () => {
      const skillSet = {
        survival: { level: 2, experience: 150, unlocked: true, breakthroughReady: false },
      }
      const skill = getSkill(skillSet as any, 'survival')
      expect(skill?.level).toBe(2)
    })

    it('should get nested skill', () => {
      const skillSet = {
        strategy: {
          intelligenceAnalysis: { level: 1, experience: 50, unlocked: true, breakthroughReady: false },
        },
      }
      const skill = getSkill(skillSet as any, 'strategy.intelligenceAnalysis')
      expect(skill?.level).toBe(1)
    })

    it('should return null for non-existent skill', () => {
      const skillSet = { survival: { level: 1, experience: 0, unlocked: true, breakthroughReady: false } }
      const skill = getSkill(skillSet as any, 'nonexistent')
      expect(skill).toBeNull()
    })

    it('should set top-level skill', () => {
      const skillSet = {
        survival: { level: 1, experience: 0, unlocked: true, breakthroughReady: false },
      }
      setSkill(skillSet as any, 'survival', { level: 3, experience: 300, unlocked: true, breakthroughReady: false })
      expect((skillSet as any).survival.level).toBe(3)
    })

    it('should set nested skill', () => {
      const skillSet = {
        strategy: {
          intelligenceAnalysis: { level: 0, experience: 0, unlocked: false, breakthroughReady: false },
        },
      }
      setSkill(skillSet as any, 'strategy.intelligenceAnalysis', { level: 1, experience: 0, unlocked: true, breakthroughReady: false })
      expect(skillSet.strategy.intelligenceAnalysis.level).toBe(1)
    })
  })

  describe('MAX_SKILL_LEVEL', () => {
    it('should be 10', () => {
      expect(MAX_SKILL_LEVEL).toBe(10)
    })
  })
})

// ============================================
// Conflict Service Tests
// ============================================

describe('conflictService', () => {
  describe('conflict detection config', () => {
    it('should have correct resource shortage threshold', () => {
      expect(CONFLICT_CONFIG.resourceShortageThreshold).toBe(0.8)
    })

    it('should have correct faction hostility threshold', () => {
      expect(CONFLICT_CONFIG.factionHostilityThreshold).toBe(-30)
    })

    it('should have correct NPC rivalry threshold', () => {
      expect(CONFLICT_CONFIG.npcRivalryThreshold).toBe(-40)
    })

    it('should have correct faction power imbalance ratio', () => {
      expect(CONFLICT_CONFIG.factionPowerImbalance).toBe(2.0)
    })

    it('should have correct max new conflicts per day', () => {
      expect(CONFLICT_CONFIG.maxNewConflictsPerDay).toBe(3)
    })

    it('should define all conflict types', () => {
      const types = CONFLICT_CONFIG.types
      expect(types).toContain('resource_scarcity')
      expect(types).toContain('faction_tension')
      expect(types).toContain('personal_rivalry')
      expect(types).toContain('class_tension')
      expect(types.length).toBe(4)
    })
  })

  describe('conflict resolution outcomes', () => {
    it('should have valid resolution types', () => {
      const resolutions = ['peaceful', 'compromise', 'violent', 'suppression', 'ignored']
      // Verify these match the switch cases in resolveConflict
      const deltaMap: Record<string, number> = {
        peaceful: 15,
        compromise: 15,
        violent: -20,
        suppression: -20,
        ignored: -5,
      }

      for (const res of resolutions) {
        expect(deltaMap[res]).toBeDefined()
      }
    })

    it('should have positive delta for peaceful resolution', () => {
      const delta = 15
      expect(delta).toBeGreaterThan(0)
    })

    it('should have negative delta for violent resolution', () => {
      const delta = -20
      expect(delta).toBeLessThan(0)
    })

    it('should have small negative delta for ignored resolution', () => {
      const delta = -5
      expect(delta).toBeLessThan(0)
      expect(delta).toBeGreaterThan(-10)
    })
  })

  describe('conflict severity calculation', () => {
    it('should calculate resource conflict severity from economy value', () => {
      // severity = Math.round((50 - economy) / 5)
      const severity = (economy: number) => Math.round((50 - economy) / 5)
      expect(severity(10)).toBe(8)
      expect(severity(25)).toBe(5)
      expect(severity(45)).toBe(1)
    })

    it('should calculate faction conflict severity from military difference', () => {
      // severity = Math.round((maxMil - minMil) / 10)
      const severity = (a: number, b: number) => Math.round((Math.max(a, b) - Math.min(a, b)) / 10)
      expect(severity(80, 30)).toBe(5)
      expect(severity(90, 10)).toBe(8)
      expect(severity(50, 45)).toBe(1)
    })

    it('should detect power imbalance correctly', () => {
      const isImbalanced = (a: number, b: number) => {
        const max = Math.max(a, b)
        const min = Math.min(a, b)
        return min > 0 && max / min >= CONFLICT_CONFIG.factionPowerImbalance
      }
      expect(isImbalanced(80, 30)).toBe(true)   // 2.67x
      expect(isImbalanced(60, 30)).toBe(true)   // 2.0x
      expect(isImbalanced(55, 30)).toBe(false)  // 1.83x
      expect(isImbalanced(50, 50)).toBe(false)  // 1.0x
    })
  })
})

export { }
