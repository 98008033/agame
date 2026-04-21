// 技能称号映射表
// 基于PLAN/34玩家存在与成长系统

export interface SkillTitleData {
  name: string
  icon: string
  stages: string[]
  titles: string[]
}

export const skillTitles: Record<string, SkillTitleData> = {
  strategy: {
    name: 'social_class.skillLines.strategy',
    icon: '🎯',
    stages: ['social_class.stages.beginner', 'social_class.stages.proficient', 'social_class.stages.master', 'social_class.stages.legend'],
    titles: ['social_class.titles.intelligence_gatherer', 'social_class.titles.diplomat', 'social_class.titles.politician', 'social_class.titles.chancellor'],
  },
  combat: {
    name: 'social_class.skillLines.combat',
    icon: '⚔️',
    stages: ['social_class.stages.beginner', 'social_class.stages.proficient', 'social_class.stages.master', 'social_class.stages.legend'],
    titles: ['social_class.titles.militia', 'social_class.titles.officer', 'social_class.titles.general', 'social_class.titles.god_of_war'],
  },
  business: {
    name: 'social_class.skillLines.commerce',
    icon: '💰',
    stages: ['social_class.stages.beginner', 'social_class.stages.proficient', 'social_class.stages.master', 'social_class.stages.legend'],
    titles: ['social_class.titles.peddler', 'social_class.titles.caravan_leader', 'social_class.titles.tycoon', 'social_class.titles.economic_dominator'],
  },
}

// 根据等级获取称号
export function getTitleByLevel(skillId: string, level: number): string {
  const skill = skillTitles[skillId]
  if (!skill) return 'social_class.titles.unknown'

  if (level >= 10) return skill.titles[3]
  if (level >= 7) return skill.titles[2]
  if (level >= 4) return skill.titles[1]
  if (level >= 1) return skill.titles[0]
  return 'social_class.titles.novice'
}

// 根据等级获取阶段
export function getStageByLevel(level: number): { name: string; color: string } {
  if (level >= 10) return { name: 'social_class.stages.legend', color: 'text-purple-400' }
  if (level >= 7) return { name: 'social_class.stages.master', color: 'text-yellow-400' }
  if (level >= 4) return { name: 'social_class.stages.proficient', color: 'text-blue-400' }
  if (level >= 1) return { name: 'social_class.stages.beginner', color: 'text-green-400' }
  return { name: 'social_class.titles.novice', color: 'text-slate-400' }
}

// 社会阶层映射
export const socialTierNames: Record<string, string> = {
  commoner: 'social_class.classes.commoner',
  gentry: 'social_class.classes.gentleman',
  noble: 'social_class.classes.noble',
  royalty: 'social_class.classes.royal',
}

// 技能线颜色
export const skillColors: Record<string, string> = {
  strategy: 'bg-purple-500',
  combat: 'bg-red-500',
  business: 'bg-yellow-500',
}