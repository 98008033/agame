import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { actionApi } from '../../services'
import { usePlayerStore, type SkillId } from '../../stores/playerStore'
import { UserAvatarMenu } from '../../components'

// 技能经验奖励类型映射（根据行动类型）
const actionSkillRewards: Record<string, SkillId[]> = {
  practice_skill: ['survival', 'combat_technique', 'intelligence_analysis', 'business_trade'],
  hunt_monsters: ['combat_technique', 'survival'],
  visit_npc: ['intelligence_analysis', 'survival'],
  work_job: ['business_trade', 'survival'],
  handle_event: ['intelligence_analysis', 'survival'],
}

// 行动分类颜色
const categoryColors: Record<string, string> = {
  growth: 'bg-[var(--pixel-bg-paper)] border-[var(--pixel-bg-mid)]',
  resource: 'bg-[var(--pixel-bg-paper)] border-[var(--pixel-exp)]',
  social: 'bg-[var(--pixel-bg-paper)] border-[var(--faction-border)]',
  event: 'bg-[var(--pixel-bg-paper)] border-[var(--pixel-health)]',
}

// 行动图标
const actionIcons: Record<string, string> = {
  practice_skill: '⚔️',
  hunt_monsters: '👹',
  visit_npc: '🤝',
  work_job: '💼',
  handle_event: '📋',
}

// 行动名称映射
const actionNames: Record<string, string> = {
  practice_skill: '练习技能',
  hunt_monsters: '打怪狩猎',
  visit_npc: '拜访NPC',
  work_job: '工作赚钱',
  handle_event: '处理事件',
}

// 行动效果预览
const actionEffects: Record<string, string> = {
  practice_skill: '技能经验 +2~5',
  hunt_monsters: '金币 +30~100',
  visit_npc: '关系 +5~10',
  work_job: '金币 +30~50',
  handle_event: '处理待决事件',
}

interface ActionItem {
  type: string
  category: string
  name: string
  description: string
  apCost: number
  unlocked: boolean
  requirements: Array<{ type: string; value: number | string }>
  rewardsPreview: {
    resources?: Record<string, number>
    narrative?: string
  }
}

interface APStatus {
  currentAP: number
  storedAP: number
  maxDaily: number
  maxStored: number
  totalApUsed: number
  remainingAP: number
  lastResetAt: string
  nextResetAt: string
  todayActions: Array<{
    type: string
    apCost: number
    success: boolean
    narrative: string
    executedAt: string
  }>
}

interface ActionResult {
  success: boolean
  action: string
  apConsumed: number
  apRemaining: number
  rewards: {
    resources?: { gold?: number }
    skillExp?: { random?: number }
    relationship?: { npcId?: string; value?: number }
    narrative?: string
  }
  narrativeFeedback: string
  timestamp: string
}

export default function TodayPlanPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { player } = usePlayerStore()
  const [resultModal, setResultModal] = useState<ActionResult | null>(null)

  // 获取行动列表
  const { data: actionsData, isLoading: actionsLoading } = useQuery({
    queryKey: ['actions-list'],
    queryFn: async () => {
      const res = await actionApi.getList()
      return res.data.data as { actions: ActionItem[]; total: number }
    },
    enabled: !!player?.id,
  })

  // 获取AP状态
  const { data: apData, isLoading: apLoading } = useQuery({
    queryKey: ['ap-status'],
    queryFn: async () => {
      const res = await actionApi.getStatus()
      return res.data.data as APStatus
    },
    enabled: !!player?.id,
    refetchInterval: 30000, // 每30秒刷新
  })

  // 执行行动
  const executeMutation = useMutation({
    mutationFn: async (actionType: string) => {
      const res = await actionApi.execute(actionType)
      return res.data.data as ActionResult
    },
    onSuccess: (data, actionType) => {
      setResultModal(data)
      queryClient.invalidateQueries({ queryKey: ['ap-status'] })
      queryClient.invalidateQueries({ queryKey: ['actions-list'] })

      // 更新玩家状态：资源、技能经验
      const { addSkillExp, updateResources, addExperience, updateSocialClass } = usePlayerStore.getState()

      // 更新金币
      if (data.rewards?.resources?.gold) {
        updateResources({ gold: player.resources.gold + data.rewards.resources.gold })
      }

      // 更新技能经验（根据行动类型分配）
      if (data.rewards?.skillExp?.random) {
        const skillIds = actionSkillRewards[actionType] || ['survival']
        // 选择一个已解锁的技能来获得经验
        const unlockedSkills = player.skills.filter(s => skillIds.includes(s.skillId))
        if (unlockedSkills.length > 0) {
          // 随机分配给一个相关技能
          const targetSkill = unlockedSkills[Math.floor(Math.random() * unlockedSkills.length)]
          addSkillExp(targetSkill.skillId, data.rewards.skillExp.random)
        } else {
          // 如果没有相关解锁技能，给生存技能
          addSkillExp('survival', data.rewards.skillExp.random)
        }
      }

      // 更新等级经验（假设每次行动给10经验）
      addExperience(10)
      updateSocialClass()
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : '行动执行失败'
      console.error('行动执行失败:', message)
      // 简单的错误提示
      setResultModal({
        success: false,
        action: 'error',
        apConsumed: 0,
        apRemaining: apData?.remainingAP ?? 0,
        rewards: {},
        narrativeFeedback: `行动执行失败：${message}。请确保服务器正在运行。`,
        timestamp: new Date().toISOString(),
      })
    },
  })

  // 处理行动执行
  const handleExecute = (action: ActionItem) => {
    if (apData && apData.remainingAP < action.apCost) {
      return // AP不足
    }
    executeMutation.mutate(action.type)
  }

  // 关闭结果弹窗
  const closeModal = () => {
    setResultModal(null)
  }

  // 如果没有玩家数据
  if (!player || !player.id) {
    return (
      <div className="min-h-screen bg-[var(--pixel-bg-dark)] flex items-center justify-center">
        <div className="stone-panel p-8 text-center max-w-md">
          <span className="text-4xl mb-4 block">🎭</span>
          <p className="text-[var(--pixel-text-light)] mb-2 text-lg">你还没有角色</p>
          <p className="text-[var(--pixel-text-light)]/60 mb-6">创建角色开始你的冒险之旅</p>
          <button
            onClick={() => navigate('/character/create')}
            className="pixel-btn magic-glow-purple mb-4"
          >
            创建角色
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-[var(--pixel-text-light)]/50 hover:text-[var(--pixel-text-light)]"
          >
            返回主页
          </button>
        </div>
      </div>
    )
  }

  const isLoading = actionsLoading || apLoading
  const apStatus = apData
  const actions = actionsData?.actions ?? []

  return (
    <div className="min-h-screen bg-[var(--pixel-bg-dark)]">
      {/* 头部 */}
      <header className="stone-panel sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="pixel-btn text-sm bg-[var(--pixel-bg-mid)]"
            >
              ↩ 返回
            </button>
            <h1 className="text-lg font-bold text-[var(--pixel-text-light)] pixel-font">今日计划</h1>
          </div>
          <UserAvatarMenu />
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4">
        {/* AP状态显示 */}
        <div className="paper-panel p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-[var(--pixel-text-dark)] pixel-font">
              【行动点】
            </h2>
            <span className="text-xs text-[var(--pixel-bg-mid)]">
              下次重置: {apStatus?.nextResetAt ? new Date(apStatus.nextResetAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '--'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* AP进度条 */}
            <div className="flex-1 h-6 bg-[#2A2A3E] pixel-border relative">
              <div
                className="h-full bg-[var(--pixel-exp)] transition-all flex items-center justify-end pr-2"
                style={{ width: `${((apStatus?.remainingAP ?? 0) / (apStatus?.maxDaily ?? 6)) * 100}%` }}
              >
                <span className="text-xs text-white font-bold pixel-font">
                  {apStatus?.remainingAP ?? 0}/{apStatus?.maxDaily ?? 6}
                </span>
              </div>
            </div>
            {/* 存储AP */}
            {(apStatus?.storedAP ?? 0) > 0 && (
              <div className="flex items-center bg-[var(--pixel-bg-mid)] px-2 py-1 rounded">
                <span className="text-xs text-[var(--pixel-text-light)]">+{apStatus?.storedAP ?? 0}</span>
              </div>
            )}
          </div>

          <p className="text-xs text-[var(--pixel-bg-mid)] mt-2 pixel-font">
            今日已用: {apStatus?.totalApUsed ?? 0} AP
          </p>
        </div>

        {/* 今日已执行行动 */}
        {apStatus?.todayActions && apStatus.todayActions.length > 0 && (
          <div className="stone-panel p-4 mb-4">
            <h3 className="text-sm font-medium text-[var(--pixel-text-light)] mb-3 pixel-font">
              【今日已完成】
            </h3>
            <div className="space-y-2">
              {apStatus.todayActions.map((action, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-[var(--pixel-text-light)]">
                  <span>{actionIcons[action.type] || '✓'}</span>
                  <span className="flex-1">{actionNames[action.type] || action.type}</span>
                  <span className="text-xs text-[var(--pixel-bg-mid)]">-{action.apCost}AP</span>
                  <span className="text-xs">{new Date(action.executedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 可用行动列表 */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-[var(--pixel-text-dark)] mb-3 pixel-font px-1">
            【可用行动】
          </h3>

          {isLoading ? (
            <div className="stone-panel p-4 text-center text-[var(--pixel-text-light)]">
              加载中...
            </div>
          ) : (
            <div className="space-y-3">
              {actions.map((action) => {
                const canExecute = apStatus && apStatus.remainingAP >= action.apCost && action.unlocked
                const categoryStyle = categoryColors[action.category] || categoryColors.growth

                return (
                  <button
                    key={action.type}
                    onClick={() => handleExecute(action)}
                    disabled={!canExecute || executeMutation.isPending}
                    className={`w-full p-4 text-left transition-all pixel-shadow ${categoryStyle} ${
                      canExecute ? 'hover:pixel-shadow-hover' : 'opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{actionIcons[action.type] || '❓'}</span>
                      <div className="flex-1">
                        <div className="font-medium text-[var(--pixel-text-dark)] pixel-font">
                          {actionNames[action.type] || action.name}
                        </div>
                        <div className="text-sm text-[var(--pixel-bg-mid)]">
                          {action.description}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-[var(--pixel-exp)] pixel-font">
                          {action.apCost}AP
                        </div>
                        <div className="text-xs text-[var(--pixel-bg-mid)]">
                          {actionEffects[action.type]}
                        </div>
                      </div>
                    </div>

                    {/* 未解锁提示 */}
                    {!action.unlocked && action.requirements.length > 0 && (
                      <div className="mt-2 text-xs text-[var(--pixel-health)]">
                        需求: {action.requirements.map(r => r.type === 'resource' ? `金币≥${r.value}` : r.value).join(', ')}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 待办提醒区域 */}
        <div className="paper-panel p-4 mb-4">
          <h3 className="text-sm font-medium text-[var(--pixel-text-dark)] mb-3 pixel-font">
            【待办提醒】
          </h3>
          <div className="text-sm text-[var(--pixel-bg-mid)]">
            <div className="flex items-center gap-2 mb-2">
              <span>💡</span>
              <span>暂无待处理事项</span>
            </div>
            <p className="text-xs opacity-70">
              完成行动后可能触发新的事件或提醒
            </p>
          </div>
        </div>

        {/* 导航按钮 */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/status')}
            className="pixel-btn bg-[var(--pixel-bg-mid)] flex-1"
          >
            查看状态
          </button>
          <button
            onClick={() => navigate('/news')}
            className="pixel-btn bg-[var(--pixel-bg-mid)] flex-1"
          >
            查看晨报
          </button>
        </div>
      </main>

      {/* 行动结果弹窗 */}
      {resultModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="paper-panel max-w-md w-full p-6 pixel-shadow">
            <h2 className="text-xl font-bold mb-4 pixel-font text-center" style={{ color: resultModal.success ? 'var(--pixel-text-dark)' : 'var(--pixel-health)' }}>
              {resultModal.success ? '【行动完成】' : '【执行失败】'}
            </h2>

            {/* 叙事反馈 */}
            <div className="stone-panel p-4 mb-4">
              <p className="text-[var(--pixel-text-light)] text-sm leading-relaxed">
                {resultModal.narrativeFeedback}
              </p>
            </div>

            {/* 收益展示 - 仅在成功时显示 */}
            {resultModal.success && (
            <div className="paper-panel p-4 mb-4">
              <h3 className="text-sm font-medium text-[var(--pixel-text-dark)] mb-2 pixel-font">
                📊 收益
              </h3>
              <div className="space-y-1">
                {/* AP消耗 */}
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--pixel-bg-mid)]">行动点</span>
                  <span className="text-[var(--pixel-health)] font-medium">
                    -{resultModal.apConsumed} → 剩余 {resultModal.apRemaining}
                  </span>
                </div>
                {/* 资源收益 */}
                {resultModal.rewards?.resources?.gold && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--pixel-bg-mid)]">金币</span>
                    <span className="text-[var(--pixel-exp)] font-medium">
                      +{resultModal.rewards.resources.gold}
                    </span>
                  </div>
                )}
                {/* 技能经验 */}
                {resultModal.rewards?.skillExp?.random && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--pixel-bg-mid)]">技能经验</span>
                    <span className="text-[var(--faction-canglong)] font-medium">
                      +{resultModal.rewards.skillExp.random}
                    </span>
                  </div>
                )}
                {/* 关系提升 */}
                {resultModal.rewards?.relationship?.value && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--pixel-bg-mid)]">关系</span>
                    <span className="text-[var(--faction-border)] font-medium">
                      +{resultModal.rewards.relationship.value}
                    </span>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* 时间戳 */}
            <p className="text-xs text-[var(--pixel-bg-mid)] text-center mb-4">
              {new Date(resultModal.timestamp).toLocaleString('zh-CN')}
            </p>

            {/* 关闭按钮 */}
            <button
              onClick={closeModal}
              className="w-full pixel-btn bg-[var(--pixel-exp)]"
            >
              继续
            </button>
          </div>
        </div>
      )}
    </div>
  )
}