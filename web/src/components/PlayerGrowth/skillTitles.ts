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
    name: '谋略线',
    icon: '🎯',
    stages: ['入门', '精通', '大师', '传奇'],
    titles: ['情报搜集者', '外交官/谋士', '政治家', '一国宰相'],
  },
  combat: {
    name: '武力线',
    icon: '⚔️',
    stages: ['入门', '精通', '大师', '传奇'],
    titles: ['民兵战士', '正式军官', '大将军', '战神'],
  },
  business: {
    name: '经营线',
    icon: '💰',
    stages: ['入门', '精通', '大师', '传奇'],
    titles: ['小商贩', '商队领袖', '商业巨头', '经济霸主'],
  },
}

// 根据等级获取称号
export function getTitleByLevel(skillId: string, level: number): string {
  const skill = skillTitles[skillId]
  if (!skill) return '未知'

  if (level >= 10) return skill.titles[3]
  if (level >= 7) return skill.titles[2]
  if (level >= 4) return skill.titles[1]
  if (level >= 1) return skill.titles[0]
  return '未入门'
}

// 根据等级获取阶段
export function getStageByLevel(level: number): { name: string; color: string } {
  if (level >= 10) return { name: '传奇', color: 'text-purple-400' }
  if (level >= 7) return { name: '大师', color: 'text-yellow-400' }
  if (level >= 4) return { name: '精通', color: 'text-blue-400' }
  if (level >= 1) return { name: '入门', color: 'text-green-400' }
  return { name: '未入门', color: 'text-slate-400' }
}

// 社会阶层映射
export const socialTierNames: Record<string, string> = {
  commoner: '平民',
  gentry: '绅士',
  noble: '贵族',
  royalty: '王族',
}

// 技能线颜色
export const skillColors: Record<string, string> = {
  strategy: 'bg-purple-500',
  combat: 'bg-red-500',
  business: 'bg-yellow-500',
}