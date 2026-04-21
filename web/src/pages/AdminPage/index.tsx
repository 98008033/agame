import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../services'

// 管理后台认证token
const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || 'admin_secret_key_mvp'

// 组件外提前设置admin token
const originalToken = typeof window !== 'undefined' ? window.localStorage.getItem('auth_token') : null
if (typeof window !== 'undefined') {
  window.localStorage.setItem('auth_token', ADMIN_SECRET)
}

interface SystemStatus {
  database: {
    connected: boolean
    players: number
    guests: number
    registered: number
    events: number
    pendingEvents: number
    worldStates: number
    agentTasks: number
  }
  world: {
    currentDay: number
    year: number
    month: number
    historyStage: string
  } | null
  server: {
    uptime: number
    memoryUsage: { rss: number; heapTotal: number; heapUsed: number; external: number }
    nodeVersion: string
  }
}

interface LLMConfigResponse {
  configs: Record<string, unknown>
  providers: string[]
  defaultProvider: string
}

interface User {
  id: string
  name: string
  userId: string
  faction: string
  level: number
  isGuest: boolean
  banned: boolean
  createdAt: string
}

interface UsersResponse {
  users: User[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 text-red-200">
      <p className="font-bold">加载失败</p>
      <p className="text-sm mt-1">{message}</p>
    </div>
  )
}

export default function AdminPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'status' | 'llm' | 'users' | 'recharge' | 'logs'>('status')
  const [authError, setAuthError] = useState<string | null>(null)

  // LLM配置表单状态
  const [llmForm, setLlmForm] = useState({
    provider: 'zhipu',
    apiKey: '',
    baseURL: '',
    defaultModel: '',
  })

  useEffect(() => {
    return () => {
      if (originalToken) {
        window.localStorage.setItem('auth_token', originalToken)
      } else {
        window.localStorage.removeItem('auth_token')
      }
    }
  }, [])

  const { data: statusData, isLoading: statusLoading, error: statusError } = useQuery({
    queryKey: ['admin-status'],
    queryFn: async () => {
      try {
        const res = await adminApi.getSystemStatus()
        if (!res.data.success) throw new Error(res.data.error?.message || '获取系统状态失败')
        return res.data.data as SystemStatus
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : '认证失败')
        throw err
      }
    },
    retry: false,
  })

  const { data: llmData, isLoading: llmLoading, error: llmError } = useQuery({
    queryKey: ['admin-llm'],
    queryFn: async () => {
      const res = await adminApi.getLLMConfig()
      if (!res.data.success) throw new Error(res.data.error?.message || '获取LLM配置失败')
      return res.data.data as LLMConfigResponse
    },
    retry: false,
  })

  const { data: usersData, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await adminApi.getUsers(1, 20)
      if (!res.data.success) throw new Error(res.data.error?.message || '获取用户列表失败')
      return res.data.data as UsersResponse
    },
    retry: false,
  })

  const { data: rechargeData, isLoading: rechargeLoading, error: rechargeError } = useQuery({
    queryKey: ['admin-recharge'],
    queryFn: async () => {
      const res = await adminApi.getRechargeLogs(1, 20)
      if (!res.data.success) throw new Error(res.data.error?.message || '获取充值记录失败')
      return res.data.data as {
        logs: Array<{ id: string; playerId: string; playerName: string; amount: number; reason: string; executedAt: string }>
        pagination: { total: number }
      }
    },
    retry: false,
  })

  const { data: agentLogsData, isLoading: agentLogsLoading, error: agentLogsError } = useQuery({
    queryKey: ['admin-agent-logs'],
    queryFn: async () => {
      const res = await adminApi.getAgentLogs(1, 20)
      if (!res.data.success) throw new Error(res.data.error?.message || '获取Agent日志失败')
      return res.data.data as {
        logs: Array<{ id: string; agentId: string; taskType: string; status: string; createdAt: string }>
        pagination: { total: number }
      }
    },
    retry: false,
  })

  const rechargeMutation = useMutation({
    mutationFn: async (data: { playerId: string; amount: number; reason: string }) => {
      const res = await adminApi.recharge(data.playerId, data.amount, data.reason)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-recharge'] })
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  // 用户删除
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await adminApi.deleteUser(userId)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  // 禁止/解除禁止用户
  const banUserMutation = useMutation({
    mutationFn: async ({ userId, ban }: { userId: string; ban: boolean }) => {
      if (ban) {
        const res = await adminApi.banUser(userId)
        return res.data
      }
      const res = await adminApi.unbanUser(userId)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  // 删除确认弹窗状态
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)

  // LLM配置更新
  const llmUpdateMutation = useMutation({
    mutationFn: async (data: { provider: string; apiKey?: string; baseURL?: string; defaultModel?: string; defaultProvider?: string }) => {
      const res = await adminApi.updateLLMConfig(data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-llm'] })
    },
  })

  // LLM连接测试
  const llmTestMutation = useMutation({
    mutationFn: async (data: { apiKey: string; baseURL?: string; model?: string }) => {
      const res = await adminApi.testLLM(data)
      return res.data
    },
  })

  const handleLeave = () => {
    window.location.href = '/dashboard'
  }

  const stageNames: Record<string, string> = {
    era_power_struggle: '权力博弈期',
    era_war_prep: '战争酝酿期',
    era_chaos: '动荡期',
    era_resolution: '决局期',
  }

  // 处理LLM配置保存
  const handleLLMSave = () => {
    llmUpdateMutation.mutate({
      provider: llmForm.provider,
      apiKey: llmForm.apiKey || undefined,
      baseURL: llmForm.baseURL || undefined,
      defaultModel: llmForm.defaultModel || undefined,
      defaultProvider: llmForm.provider,
    })
  }

  // 处理LLM连接测试
  const handleLLMTest = () => {
    if (!llmForm.apiKey) return
    llmTestMutation.mutate({
      apiKey: llmForm.apiKey,
      baseURL: llmForm.baseURL,
      model: llmForm.defaultModel,
    })
  }

  // 处理用户删除
  const handleUserDelete = useCallback((user: User) => {
    if (window.confirm(`确定要删除用户 "${user.name}" (${user.id}) 吗？此操作不可撤销。`)) {
      deleteUserMutation.mutate(user.id)
      setDeleteTarget(null)
    }
  }, [deleteUserMutation])

  // 处理用户封禁/解封
  const handleUserBan = useCallback((user: User) => {
    const ban = !user.banned
    banUserMutation.mutate({ userId: user.id, ban })
  }, [banUserMutation])

  if (authError) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="bg-slate-800 rounded-lg p-8 max-w-md text-center">
          <p className="text-red-400 font-bold mb-2">管理后台访问被拒绝</p>
          <p className="text-slate-400 mb-4">{authError}</p>
          <button onClick={handleLeave} className="px-4 py-2 bg-slate-700 text-slate-300 rounded hover:bg-slate-600">
            返回游戏
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-amber-400">游戏管理后台</h1>
          <button onClick={handleLeave} className="px-4 py-2 bg-slate-700 text-slate-300 rounded hover:bg-slate-600">
            返回游戏
          </button>
        </div>
      </header>

      <nav className="bg-slate-800/50 border-b border-slate-700">
        <div className="max-w-4xl mx-auto flex gap-2 p-2">
          {['系统状态', 'LLM配置', '用户管理', '充值管理', 'Agent日志'].map((name, idx) => {
            const ids = ['status', 'llm', 'users', 'recharge', 'logs'] as const
            return (
              <button
                key={name}
                onClick={() => setActiveTab(ids[idx])}
                className={`px-4 py-2 rounded ${
                  activeTab === ids[idx]
                    ? 'bg-amber-500 text-slate-900'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {name}
              </button>
            )
          })}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6">
        {activeTab === 'status' && (
          <div className="space-y-4">
            {statusLoading ? (
              <div className="text-slate-400">加载中...</div>
            ) : statusError ? (
              <ErrorDisplay message={statusError instanceof Error ? statusError.message : '获取系统状态失败'} />
            ) : statusData && (
              <>
                <div className="bg-slate-800 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-white mb-3">数据库状态</h3>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div className="bg-slate-700 p-3 rounded">
                      <span className="text-slate-400">玩家总数</span>
                      <span className="text-amber-400 font-bold ml-2">{statusData.database.players}</span>
                    </div>
                    <div className="bg-slate-700 p-3 rounded">
                      <span className="text-slate-400">游客</span>
                      <span className="text-blue-400 font-bold ml-2">{statusData.database.guests}</span>
                    </div>
                    <div className="bg-slate-700 p-3 rounded">
                      <span className="text-slate-400">注册用户</span>
                      <span className="text-green-400 font-bold ml-2">{statusData.database.registered}</span>
                    </div>
                    <div className="bg-slate-700 p-3 rounded">
                      <span className="text-slate-400">事件总数</span>
                      <span className="text-purple-400 font-bold ml-2">{statusData.database.events}</span>
                    </div>
                    <div className="bg-slate-700 p-3 rounded">
                      <span className="text-slate-400">待处理事件</span>
                      <span className="text-red-400 font-bold ml-2">{statusData.database.pendingEvents}</span>
                    </div>
                    <div className="bg-slate-700 p-3 rounded">
                      <span className="text-slate-400">世界状态</span>
                      <span className="text-cyan-400 font-bold ml-2">{statusData.database.worldStates}</span>
                    </div>
                    <div className="bg-slate-700 p-3 rounded">
                      <span className="text-slate-400">Agent任务</span>
                      <span className="text-orange-400 font-bold ml-2">{statusData.database.agentTasks}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-white mb-3">世界状态</h3>
                  {statusData.world ? (
                    <div className="flex gap-4 text-sm">
                      <div className="bg-slate-700 p-3 rounded">
                        <span className="text-slate-400">当前天数</span>
                        <span className="text-amber-400 font-bold ml-2">Day {statusData.world.currentDay}</span>
                      </div>
                      <div className="bg-slate-700 p-3 rounded">
                        <span className="text-slate-400">历史阶段</span>
                        <span className="text-purple-400 font-bold ml-2">{stageNames[statusData.world.historyStage] || statusData.world.historyStage}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400">暂无世界状态数据</p>
                  )}
                </div>

                <div className="bg-slate-800 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-white mb-3">服务器状态</h3>
                  <div className="flex gap-4 text-sm">
                    <div className="bg-slate-700 p-3 rounded">
                      <span className="text-slate-400">Node版本</span>
                      <span className="text-green-400 font-bold ml-2">{statusData.server.nodeVersion}</span>
                    </div>
                    <div className="bg-slate-700 p-3 rounded">
                      <span className="text-slate-400">运行时间</span>
                      <span className="text-blue-400 font-bold ml-2">{Math.floor(statusData.server.uptime)}s</span>
                    </div>
                    <div className="bg-slate-700 p-3 rounded">
                      <span className="text-slate-400">内存使用</span>
                      <span className="text-orange-400 font-bold ml-2">
                        {Math.round(statusData.server.memoryUsage.heapUsed / 1024 / 1024)}MB
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'llm' && (
          <div className="space-y-4">
            {llmLoading ? (
              <div className="text-slate-400">加载中...</div>
            ) : llmError ? (
              <ErrorDisplay message={llmError instanceof Error ? llmError.message : '获取LLM配置失败'} />
            ) : llmData && (
              <>
                <div className="bg-slate-800 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-white mb-3">当前配置</h3>
                  <div className="space-y-3 text-sm">
                    <div className="bg-slate-700 p-3 rounded flex justify-between">
                      <span className="text-slate-400">默认Provider</span>
                      <span className="text-amber-400 font-bold">{llmData.defaultProvider}</span>
                    </div>
                    <div className="bg-slate-700 p-3 rounded flex justify-between">
                      <span className="text-slate-400">支持的Provider</span>
                      <span className="text-green-400 font-bold">{llmData.providers.join(', ')}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-white mb-3">配置更新</h3>
                  <form onSubmit={(e) => { e.preventDefault(); handleLLMSave(); }} className="space-y-3">
                    <div>
                      <label className="text-slate-400 text-sm">Provider</label>
                      <select
                        value={llmForm.provider}
                        onChange={(e) => setLlmForm({ ...llmForm, provider: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700 text-white rounded"
                      >
                        {llmData.providers.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-400 text-sm">API Key</label>
                      <input
                        type="password"
                        value={llmForm.apiKey}
                        onChange={(e) => setLlmForm({ ...llmForm, apiKey: e.target.value })}
                        placeholder="输入API密钥"
                        className="w-full px-3 py-2 bg-slate-700 text-white rounded"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 text-sm">Base URL（可选）</label>
                      <input
                        value={llmForm.baseURL}
                        onChange={(e) => setLlmForm({ ...llmForm, baseURL: e.target.value })}
                        placeholder="https://api.example.com/v1"
                        className="w-full px-3 py-2 bg-slate-700 text-white rounded"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 text-sm">默认模型（可选）</label>
                      <input
                        value={llmForm.defaultModel}
                        onChange={(e) => setLlmForm({ ...llmForm, defaultModel: e.target.value })}
                        placeholder="gpt-3.5-turbo"
                        className="w-full px-3 py-2 bg-slate-700 text-white rounded"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={llmUpdateMutation.isPending}
                        className="px-4 py-2 bg-amber-500 text-slate-900 font-bold rounded hover:bg-amber-400 disabled:opacity-50"
                      >
                        {llmUpdateMutation.isPending ? '保存中...' : '保存配置'}
                      </button>
                      <button
                        type="button"
                        onClick={handleLLMTest}
                        disabled={llmTestMutation.isPending || !llmForm.apiKey}
                        className="px-4 py-2 bg-slate-600 text-slate-300 rounded hover:bg-slate-500 disabled:opacity-50"
                      >
                        {llmTestMutation.isPending ? '测试中...' : '测试连接'}
                      </button>
                    </div>
                    {llmUpdateMutation.isSuccess && (
                      <p className="text-green-400 text-sm">配置已保存</p>
                    )}
                    {llmUpdateMutation.isError && (
                      <p className="text-red-400 text-sm">保存失败</p>
                    )}
                    {llmTestMutation.data && (
                      <p className={`text-sm ${llmTestMutation.data.data?.success ? 'text-green-400' : 'text-red-400'}`}>
                        {llmTestMutation.data.data?.message || '测试完成'}
                      </p>
                    )}
                  </form>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-lg font-bold text-white mb-3">用户列表</h3>
            {usersLoading ? (
              <div className="text-slate-400">加载中...</div>
            ) : usersError ? (
              <ErrorDisplay message={usersError instanceof Error ? usersError.message : '获取用户列表失败'} />
            ) : usersData && (
              <>
                <p className="text-slate-400 mb-3">总数: {usersData.pagination.total}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-700">
                      <tr>
                        <th className="p-2 text-left text-slate-300">ID</th>
                        <th className="p-2 text-left text-slate-300">名称</th>
                        <th className="p-2 text-left text-slate-300">阵营</th>
                        <th className="p-2 text-left text-slate-300">等级</th>
                        <th className="p-2 text-left text-slate-300">类型</th>
                        <th className="p-2 text-left text-slate-300">状态</th>
                        <th className="p-2 text-left text-slate-300">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersData.users.slice(0, 10).map((user) => (
                        <tr key={user.id} className="border-b border-slate-700">
                          <td className="p-2 text-slate-400">{user.id.slice(0, 12)}...</td>
                          <td className="p-2 text-white">{user.name}</td>
                          <td className="p-2 text-purple-400">{user.faction}</td>
                          <td className="p-2 text-amber-400">Lv.{user.level}</td>
                          <td className="p-2 text-blue-400">{user.isGuest ? '游客' : '注册'}</td>
                          <td className="p-2">
                            {user.banned ? (
                              <span className="px-2 py-0.5 bg-red-900/50 text-red-400 text-xs rounded font-medium">已封禁</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-green-900/50 text-green-400 text-xs rounded font-medium">正常</span>
                            )}
                          </td>
                          <td className="p-2">
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleUserBan(user)}
                                disabled={banUserMutation.isPending}
                                className={`px-2 py-1 text-xs rounded ${
                                  user.banned
                                    ? 'bg-green-600 text-white hover:bg-green-500'
                                    : 'bg-yellow-600 text-white hover:bg-yellow-500'
                                } disabled:opacity-50`}
                              >
                                {user.banned ? '解除' : '封禁'}
                              </button>
                              <button
                                onClick={() => handleUserDelete(user)}
                                disabled={deleteUserMutation.isPending}
                                className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-500 disabled:opacity-50"
                              >
                                删除
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'recharge' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-lg font-bold text-white mb-3">充值操作</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const form = e.target as HTMLFormElement
                  const playerId = (form.elements.namedItem('playerId') as HTMLInputElement).value
                  const amount = Number((form.elements.namedItem('amount') as HTMLInputElement).value)
                  const reason = (form.elements.namedItem('reason') as HTMLInputElement).value
                  if (playerId && amount > 0) {
                    rechargeMutation.mutate({ playerId, amount, reason })
                  }
                }}
                className="space-y-3"
              >
                <div>
                  <label className="text-slate-400 text-sm">玩家ID</label>
                  <input name="playerId" placeholder="player_xxxx" className="w-full px-3 py-2 bg-slate-700 text-white rounded" />
                </div>
                <div>
                  <label className="text-slate-400 text-sm">金币数量</label>
                  <input name="amount" type="number" placeholder="100" className="w-full px-3 py-2 bg-slate-700 text-white rounded" />
                </div>
                <div>
                  <label className="text-slate-400 text-sm">原因</label>
                  <input name="reason" placeholder="活动奖励" className="w-full px-3 py-2 bg-slate-700 text-white rounded" />
                </div>
                <button
                  type="submit"
                  disabled={rechargeMutation.isPending}
                  className="w-full py-2 bg-amber-500 text-slate-900 font-bold rounded hover:bg-amber-400 disabled:opacity-50"
                >
                  {rechargeMutation.isPending ? '处理中...' : '充值'}
                </button>
              </form>
            </div>

            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-lg font-bold text-white mb-3">充值记录</h3>
              {rechargeLoading ? (
                <div className="text-slate-400">加载中...</div>
              ) : rechargeError ? (
                <ErrorDisplay message={rechargeError instanceof Error ? rechargeError.message : '获取充值记录失败'} />
              ) : rechargeData && (
                <>
                  <p className="text-slate-400 mb-3">总数: {rechargeData.pagination.total}</p>
                  {rechargeData.logs.length === 0 ? (
                    <p className="text-slate-500">暂无充值记录</p>
                  ) : (
                    <div className="space-y-2">
                      {rechargeData.logs.map((log) => (
                        <div key={log.id} className="bg-slate-700 p-3 rounded text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-400">{log.playerName || log.playerId}</span>
                            <span className="text-amber-400 font-bold">+{log.amount}</span>
                          </div>
                          <div className="text-slate-500 text-xs">{log.reason} - {new Date(log.executedAt).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-lg font-bold text-white mb-3">Agent任务日志</h3>
            {agentLogsLoading ? (
              <div className="text-slate-400">加载中...</div>
            ) : agentLogsError ? (
              <ErrorDisplay message={agentLogsError instanceof Error ? agentLogsError.message : '获取Agent日志失败'} />
            ) : agentLogsData && (
              <>
                <p className="text-slate-400 mb-3">总数: {agentLogsData.pagination.total}</p>
                {agentLogsData.logs.length === 0 ? (
                  <p className="text-slate-500">暂无Agent任务日志</p>
                ) : (
                  <div className="space-y-2">
                    {agentLogsData.logs.map((log) => (
                      <div key={log.id} className="bg-slate-700 p-3 rounded text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">{log.agentId}</span>
                          <span className={`font-bold ${
                            log.status === 'completed' ? 'text-green-400' :
                            log.status === 'running' ? 'text-blue-400' :
                            log.status === 'failed' ? 'text-red-400' :
                            'text-slate-400'
                          }`}>{log.status}</span>
                        </div>
                        <div className="text-slate-500 text-xs">{log.taskType} - {new Date(log.createdAt).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}