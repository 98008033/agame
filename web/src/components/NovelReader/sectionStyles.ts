// 各章节类型和阵营的样式配置

export interface SectionStyle {
  titleColor: string
  icon: string
  borderColor: string
}

// 阵营颜色映射
export const factionColors = {
  canglong: {
    titleColor: 'text-yellow-700',
    icon: '◆',
    borderColor: 'border-yellow-500',
  },
  shuanglang: {
    titleColor: 'text-blue-700',
    icon: '◆',
    borderColor: 'border-blue-500',
  },
  jinque: {
    titleColor: 'text-green-700',
    icon: '◆',
    borderColor: 'border-green-500',
  },
  border: {
    titleColor: 'text-amber-700',
    icon: '◆',
    borderColor: 'border-amber-500',
  },
}

// 节类型样式映射
export const sectionTypeStyles = {
  intro: {
    titleColor: 'text-gray-600 italic',
    icon: '',
    borderColor: 'border-gray-400',
  },
  faction_news: {
    titleColor: 'text-gray-800',
    icon: '',
    borderColor: 'border-gray-300',
  },
  hero: {
    titleColor: 'text-purple-700',
    icon: '【',
    borderColor: 'border-purple-400',
  },
  rumor: {
    titleColor: 'text-amber-600',
    icon: '【',
    borderColor: 'border-amber-300',
  },
  player: {
    titleColor: 'text-indigo-700',
    icon: '【',
    borderColor: 'border-indigo-400',
  },
  ending: {
    titleColor: 'text-gray-500 italic',
    icon: '',
    borderColor: 'border-gray-400',
  },
}

export function getSectionStyle(
  type: string,
  faction?: 'canglong' | 'shuanglang' | 'jinque' | 'border'
): SectionStyle {
  if (faction && factionColors[faction]) {
    return factionColors[faction]
  }
  return sectionTypeStyles[type as keyof typeof sectionTypeStyles] || sectionTypeStyles.faction_news
}
