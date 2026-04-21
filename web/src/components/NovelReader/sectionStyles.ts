// 各章节类型和阵营的样式配置 - 像素奇幻风格

export interface SectionStyle {
  titleColor: string
  icon: string
  borderColor: string
  glowClass?: string
  bgClass?: string
}

// 阵营颜色映射 - 使用CSS变量和魔法发光效果
export const factionColors = {
  canglong: {
    titleColor: 'text-[var(--faction-canglong)]',
    icon: '◆',
    borderColor: 'border-[var(--faction-canglong)]',
    glowClass: 'magic-glow-green',
    bgClass: 'faction-panel-canglong',
  },
  shuanglang: {
    titleColor: 'text-[var(--faction-shuanglang)]',
    icon: '◆',
    borderColor: 'border-[var(--faction-shuanglang)]',
    glowClass: 'magic-glow-blue',
    bgClass: 'faction-panel-shuanglang',
  },
  jinque: {
    titleColor: 'text-[var(--faction-jinque)]',
    icon: '◆',
    borderColor: 'border-[var(--faction-jinque)]',
    glowClass: 'magic-glow-gold',
    bgClass: 'faction-panel-jinque',
  },
  border: {
    titleColor: 'text-[var(--faction-border)]',
    icon: '◆',
    borderColor: 'border-[var(--faction-border)]',
    glowClass: 'magic-glow-purple',
    bgClass: 'faction-panel-border',
  },
}

// 节类型样式映射 - 像素奇幻风格
export const sectionTypeStyles = {
  intro: {
    titleColor: 'text-[var(--pixel-text-dark)] italic',
    icon: '',
    borderColor: 'border-[var(--pixel-bg-mid)]',
    bgClass: 'bg-[var(--pixel-bg-paper)]',
  },
  faction_news: {
    titleColor: 'text-[var(--pixel-text-dark)]',
    icon: '',
    borderColor: 'border-[var(--pixel-bg-mid)]',
    bgClass: '',
  },
  hero: {
    titleColor: 'text-[var(--pixel-legendary)]',
    icon: '【',
    borderColor: 'border-[var(--pixel-legendary)]',
    glowClass: 'magic-glow-purple',
    bgClass: 'stone-panel',
  },
  rumor: {
    titleColor: 'text-[var(--pixel-warning)]',
    icon: '【',
    borderColor: 'border-[var(--pixel-warning)]',
    bgClass: 'bg-[var(--pixel-bg-dark)]',
  },
  player: {
    titleColor: 'text-[var(--pixel-exp)]',
    icon: '【',
    borderColor: 'border-[var(--pixel-exp)]',
    bgClass: 'paper-panel',
  },
  ending: {
    titleColor: 'text-[var(--pixel-bg-mid)] italic',
    icon: '',
    borderColor: 'border-[var(--pixel-bg-mid)]',
    bgClass: 'bg-[var(--pixel-bg-dark)]',
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
