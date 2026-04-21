import { useNavigate } from 'react-router-dom'
import { usePlayerStore } from '../../stores/playerStore'

// 死亡场景模板（可根据死亡原因动态生成）
const deathScenes: Record<string, { title: string; icon: string; narrative: string }> = {
  combat: {
    title: '战死沙场',
    icon: '⚔️',
    narrative: '鲜血染红了脚下的土地，视线逐渐模糊。在最后的时刻，你想起了家乡的炊烟，想起了曾经许下的誓言...',
  },
  illness: {
    title: '病逝',
    icon: '🤒',
    narrative: '病魔的侵蚀让你日渐虚弱，生命的火焰终于熄灭。窗外阳光依旧明媚，而你已无法起身迎接。',
  },
  accident: {
    title: '意外身亡',
    icon: '💫',
    narrative: '命运的玩笑来得太过突然。在生命的最后一刻，你甚至来不及告别...',
  },
  old_age: {
    title: '寿终正寝',
    icon: '🌟',
    narrative: '岁月的痕迹刻满了脸庞，一生的风雨化作平静的微笑。在子孙的环绕中，你安详地闭上了双眼。',
  },
  betrayal: {
    title: '被背叛致死',
    icon: '💔',
    narrative: '信任的刀刃比敌人的更锋利。当真相揭开的瞬间，一切都已无法挽回...',
  },
}

// 阵营名称
const factionNames: Record<string, string> = {
  canglong: '苍龙帝国',
  shuanglang: '霜狼联邦',
  jinque: '金雀花王国',
  border: '边境联盟',
}

export default function DeathNarrativePage() {
  const navigate = useNavigate()
  const player = usePlayerStore((s) => s.player)
  const setPlayer = usePlayerStore((s) => s.setPlayer)

  // 如果没有玩家数据，跳转到登录
  if (!player || !player.id) {
    navigate('/login')
    return null
  }

  // 获取死亡场景（根据玩家标签或随机选择）
  const deathType = player.tags.find((t) => t.startsWith('death_'))?.replace('death_', '') || 'combat'
  const scene = deathScenes[deathType] || deathScenes.combat

  // 计算玩家成就
  const achievements = {
    level: player.level,
    daysSurvived: Math.floor(player.experience / 10), // 假设每行动1次=1天
    goldEarned: player.resources.gold,
    influenceGained: player.resources.influence,
    skillsLearned: player.skills.length,
    faction: player.faction ? factionNames[player.faction] : '无阵营',
  }

  // 处理重新开始
  const handleRestart = () => {
    // 清除本地存储
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_id')
    // 重置玩家状态
    setPlayer({ id: null, name: '', isNew: true })
    // 跳转到角色创建
    navigate('/character/create')
  }

  return (
    <div className="min-h-screen bg-[var(--pixel-bg-dark)] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* 死亡标题 */}
        <div className="text-center mb-6">
          <span className="text-6xl block mb-2">{scene.icon}</span>
          <h1 className="text-2xl font-bold text-[var(--pixel-text-light)] pixel-font">
            【{scene.title}】
          </h1>
          <p className="text-sm text-[var(--pixel-bg-mid)] mt-2">
            {player.name} 的故事结束了
          </p>
        </div>

        {/* 死亡叙事 */}
        <div className="paper-panel p-6 mb-4 pixel-shadow">
          <p className="text-[var(--pixel-text-dark)] leading-relaxed text-center italic">
            "{scene.narrative}"
          </p>
        </div>

        {/* 生平回顾 */}
        <div className="stone-panel p-4 mb-4">
          <h2 className="text-lg font-bold text-[var(--pixel-text-light)] pixel-font mb-3 text-center">
            📜 生平回顾
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--pixel-bg-mid)]">最终等级</span>
              <span className="text-[var(--pixel-exp)] font-bold pixel-font">Lv.{achievements.level}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--pixel-bg-mid)]">存活天数</span>
              <span className="text-[var(--pixel-text-light)] font-medium">{achievements.daysSurvived} 日</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--pixel-bg-mid)]">积累金币</span>
              <span className="text-[var(--pixel-exp)] font-medium">💰 {achievements.goldEarned}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--pixel-bg-mid)]">获得影响力</span>
              <span className="text-[var(--faction-canglong)] font-medium">⭐ {achievements.influenceGained}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--pixel-bg-mid)]">习得技能</span>
              <span className="text-[var(--pixel-text-light)] font-medium">
                {achievements.skillsLearned} 项
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--pixel-bg-mid)]">所属阵营</span>
              <span className="text-[var(--pixel-text-light)] font-medium">{achievements.faction}</span>
            </div>
          </div>
        </div>

        {/* 遗言 */}
        <div className="paper-panel p-4 mb-4">
          <h3 className="text-sm font-bold text-[var(--pixel-text-dark)] pixel-font mb-2">
            💬 最后的遗言
          </h3>
          <p className="text-sm text-[var(--pixel-bg-mid)] italic">
            "这个世界，我曾走过。留下的痕迹，或许会被遗忘，但我无悔。"
          </p>
        </div>

        {/* 重新开始按钮 */}
        <div className="space-y-3">
          <button
            onClick={handleRestart}
            className="w-full pixel-btn magic-glow-purple py-3"
          >
            🔄 重新开始 - 创建新角色
          </button>
          <button
            onClick={() => navigate('/login')}
            className="w-full pixel-btn bg-[var(--pixel-bg-mid)]"
          >
            返回登录页
          </button>
        </div>

        {/* 底部提示 */}
        <p className="text-xs text-[var(--pixel-bg-mid)] text-center mt-6 opacity-70">
          每一次死亡都是新故事的开始。这个世界仍在运转，等待你的归来。
        </p>
      </div>
    </div>
  )
}