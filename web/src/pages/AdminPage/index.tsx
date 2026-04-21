import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { adminApi } from '../../services'

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
  const { t } = useTranslation()
  return (
    <div className="error-state">
      <p className="error-state-title">{t('admin.loadFailed')}</p>
      <p className="text-sm">{message}</p>
    </div>
  )
}

export default function AdminPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'status' | 'llm' | 'users' | 'recharge' | 'logs'>('status')
  const [authError, setAuthError] = useState<string | null>(null)

  const [llmForm, setLlmForm] = useState({
    provider: 'zhipu',
    apiKey: '',
    baseURL: '',
    defaultModel: '',
  })

  const { data: statusData, isLoading: statusLoading, error: statusError } = useQuery({
    queryKey: ['admin-status'],
    queryFn: async () => {
      try {
        const res = await adminApi.getSystemStatus()
        if (!res.data.success) throw new Error(res.data.error?.message || t('admin.fetchStatusFailed'))
        return res.data.data as SystemStatus
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : t('admin.accessDenied'))
        throw err
      }
    },
    retry: false,
  })

  const { data: llmData, isLoading: llmLoading, error: llmError } = useQuery({
    queryKey: ['admin-llm'],
    queryFn: async () => {
      const res = await adminApi.getLLMConfig()
      if (!res.data.success) throw new Error(res.data.error?.message || t('admin.fetchLlmConfigFailed'))
      return res.data.data as LLMConfigResponse
    },
    retry: false,
  })

  const { data: usersData, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await adminApi.getUsers(1, 20)
      if (!res.data.success) throw new Error(res.data.error?.message || t('admin.fetchUsersFailed'))
      return res.data.data as UsersResponse
    },
    retry: false,
  })

  const { data: rechargeData, isLoading: rechargeLoading, error: rechargeError } = useQuery({
    queryKey: ['admin-recharge'],
    queryFn: async () => {
      const res = await adminApi.getRechargeLogs(1, 20)
      if (!res.data.success) throw new Error(res.data.error?.message || t('admin.fetchRechargeFailed'))
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
      if (!res.data.success) throw new Error(res.data.error?.message || t('admin.fetchAgentLogsFailed'))
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

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await adminApi.deleteUser(userId)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

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

  const llmUpdateMutation = useMutation({
    mutationFn: async (data: { provider: string; apiKey?: string; baseURL?: string; defaultModel?: string; defaultProvider?: string }) => {
      const res = await adminApi.updateLLMConfig(data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-llm'] })
    },
  })

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
    era_power_struggle: t('admin.historyStages.power_struggle'),
    era_war_prep: t('admin.historyStages.war_prep'),
    era_chaos: t('admin.historyStages.chaos'),
    era_resolution: t('admin.historyStages.resolution'),
  }

  const handleLLMSave = () => {
    llmUpdateMutation.mutate({
      provider: llmForm.provider,
      apiKey: llmForm.apiKey || undefined,
      baseURL: llmForm.baseURL || undefined,
      defaultModel: llmForm.defaultModel || undefined,
      defaultProvider: llmForm.provider,
    })
  }

  const handleLLMTest = () => {
    if (!llmForm.apiKey) return
    llmTestMutation.mutate({
      apiKey: llmForm.apiKey,
      baseURL: llmForm.baseURL,
      model: llmForm.defaultModel,
    })
  }

  const handleUserDelete = useCallback((user: User) => {
    if (window.confirm(`${t('admin.confirmDeleteUser')} "${user.name}" (${user.id})? ${t('admin.confirmDeleteDetail')}`)) {
      deleteUserMutation.mutate(user.id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteUserMutation])

  const handleUserBan = useCallback((user: User) => {
    const ban = !user.banned
    banUserMutation.mutate({ userId: user.id, ban })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banUserMutation])

  const tabs = [
    { id: 'status' as const, label: t('admin.systemStatus') },
    { id: 'llm' as const, label: t('admin.llmConfig') },
    { id: 'users' as const, label: t('admin.userManagement') },
    { id: 'recharge' as const, label: t('admin.rechargeManagement') },
    { id: 'logs' as const, label: t('admin.agentLogs') },
  ]

  const cardStyle = { background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-lg)' }
  const subCardStyle = { background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }
  const mutedText = { color: 'var(--text-secondary)' }
  const labelText = { fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }
  const inputStyle = { ...subCardStyle, padding: '10px 14px', border: '1px solid rgba(255,255,255,0.1)', width: '100%', color: 'var(--text-primary)', borderRadius: 'var(--radius-md)', outline: 'none' }
  const statCardStyle = { ...subCardStyle, padding: '12px' }

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="rounded-lg p-8 max-w-md text-center" style={cardStyle}>
          <p className="font-bold mb-2" style={{ color: 'var(--accent-red)' }}>{t('admin.accessDenied')}</p>
          <p className="mb-4" style={mutedText}>{authError}</p>
          <button onClick={handleLeave} className="px-4 py-2 rounded btn-modern">
            {t('admin.backToGame')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="header-modern">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold font-display" style={{ color: 'var(--accent-gold)' }}>{t('admin.title')}</h1>
          <button onClick={handleLeave} className="px-4 py-2 btn-modern text-sm">
            {t('admin.backToGame')}
          </button>
        </div>
      </header>

      {/* Tab Nav */}
      <div className="tab-nav" style={{ maxWidth: '896px', margin: '0 auto' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <main className="max-w-4xl mx-auto p-6 space-y-4">
        {/* ========== 系统状态 ========== */}
        {activeTab === 'status' && (
          <>
            {statusLoading && <div className="loading-state">{t('common.loading')}</div>}
            {statusError && <ErrorDisplay message={statusError instanceof Error ? statusError.message : t('admin.fetchStatusFailed')} />}
            {statusData && (
              <>
                <div className="rounded-lg p-4" style={cardStyle}>
                  <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{t('admin.dbStatus')}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    {[
                      { label: t('admin.totalPlayers'), value: statusData.database.players, color: 'var(--accent-gold)' },
                      { label: t('admin.guest'), value: statusData.database.guests, color: 'var(--accent-blue)' },
                      { label: t('admin.registered'), value: statusData.database.registered, color: 'var(--accent-green)' },
                      { label: t('admin.totalEvents'), value: statusData.database.events, color: 'var(--accent-purple)' },
                      { label: t('admin.pendingEvents'), value: statusData.database.pendingEvents, color: 'var(--accent-red)' },
                      { label: t('admin.worldState'), value: statusData.database.worldStates, color: 'var(--status-info)' },
                      { label: t('admin.agentTask'), value: statusData.database.agentTasks, color: 'var(--accent-gold)' },
                    ].map((item) => (
                      <div key={item.label} className="rounded" style={statCardStyle}>
                        <span style={mutedText}>{item.label}</span>
                        <span className="font-bold ml-2" style={{ color: item.color }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg p-4" style={cardStyle}>
                  <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{t('admin.worldState')}</h3>
                  {statusData.world ? (
                    <div className="flex gap-3 text-sm">
                      <div className="rounded" style={statCardStyle}>
                        <span style={mutedText}>{t('admin.currentDay')}</span>
                        <span className="font-bold ml-2" style={{ color: 'var(--accent-gold)' }}>Day {statusData.world.currentDay}</span>
                      </div>
                      <div className="rounded" style={statCardStyle}>
                        <span style={mutedText}>{t('admin.historyStage')}</span>
                        <span className="font-bold ml-2" style={{ color: 'var(--accent-purple)' }}>{stageNames[statusData.world.historyStage] || statusData.world.historyStage}</span>
                      </div>
                    </div>
                  ) : (
                    <p style={mutedText}>{t('admin.noWorldStateData')}</p>
                  )}
                </div>

                <div className="rounded-lg p-4" style={cardStyle}>
                  <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{t('admin.serverStatus')}</h3>
                  <div className="flex gap-3 text-sm flex-wrap">
                    <div className="rounded" style={statCardStyle}>
                      <span style={mutedText}>{t('admin.nodeVersion')}</span>
                      <span className="font-bold ml-2" style={{ color: 'var(--accent-green)' }}>{statusData.server.nodeVersion}</span>
                    </div>
                    <div className="rounded" style={statCardStyle}>
                      <span style={mutedText}>{t('admin.uptime')}</span>
                      <span className="font-bold ml-2" style={{ color: 'var(--accent-blue)' }}>{Math.floor(statusData.server.uptime / 60)}min</span>
                    </div>
                    <div className="rounded" style={statCardStyle}>
                      <span style={mutedText}>{t('admin.memoryUsage')}</span>
                      <span className="font-bold ml-2" style={{ color: 'var(--accent-gold)' }}>
                        {Math.round(statusData.server.memoryUsage.heapUsed / 1024 / 1024)}MB
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ========== LLM配置 ========== */}
        {activeTab === 'llm' && (
          <>
            {llmLoading && <div className="loading-state">{t('common.loading')}</div>}
            {llmError && <ErrorDisplay message={llmError instanceof Error ? llmError.message : t('admin.fetchLlmConfigFailed')} />}
            {llmData && (
              <>
                <div className="rounded-lg p-4" style={cardStyle}>
                  <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{t('admin.currentConfig')}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between rounded p-3" style={subCardStyle}>
                      <span style={mutedText}>{t('admin.defaultProvider')}</span>
                      <span className="font-bold" style={{ color: 'var(--accent-gold)' }}>{llmData.defaultProvider}</span>
                    </div>
                    <div className="flex justify-between rounded p-3" style={subCardStyle}>
                      <span style={mutedText}>{t('admin.supportedProviders')}</span>
                      <span className="font-bold" style={{ color: 'var(--accent-green)' }}>{llmData.providers.join(', ')}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg p-4" style={cardStyle}>
                  <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{t('admin.configUpdate')}</h3>
                  <form onSubmit={(e) => { e.preventDefault(); handleLLMSave(); }} className="space-y-3">
                    <div>
                      <label style={labelText}>Provider</label>
                      <select
                        value={llmForm.provider}
                        onChange={(e) => setLlmForm({ ...llmForm, provider: e.target.value })}
                        style={inputStyle}
                      >
                        {llmData.providers.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelText}>API Key</label>
                      <input
                        type="password"
                        value={llmForm.apiKey}
                        onChange={(e) => setLlmForm({ ...llmForm, apiKey: e.target.value })}
                        placeholder={t('admin.apiKeyPlaceholder')}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelText}>Base URL ({t('common.optional')})</label>
                      <input
                        value={llmForm.baseURL}
                        onChange={(e) => setLlmForm({ ...llmForm, baseURL: e.target.value })}
                        placeholder="https://api.example.com/v1"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelText}>{t('admin.defaultModel')} ({t('common.optional')})</label>
                      <input
                        value={llmForm.defaultModel}
                        onChange={(e) => setLlmForm({ ...llmForm, defaultModel: e.target.value })}
                        placeholder="gpt-3.5-turbo"
                        style={inputStyle}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={llmUpdateMutation.isPending}
                        className="px-4 py-2 font-bold rounded disabled:opacity-50"
                        style={{ background: 'var(--accent-gold)', color: 'var(--bg-primary)' }}
                      >
                        {llmUpdateMutation.isPending ? t('admin.saving') : t('admin.saveConfig')}
                      </button>
                      <button
                        type="button"
                        onClick={handleLLMTest}
                        disabled={llmTestMutation.isPending || !llmForm.apiKey}
                        className="px-4 py-2 rounded disabled:opacity-50 btn-modern text-sm"
                      >
                        {llmTestMutation.isPending ? t('admin.testing') : t('admin.testConnection')}
                      </button>
                    </div>
                    {llmUpdateMutation.isSuccess && <p className="text-sm" style={{ color: 'var(--accent-green)' }}>{t('admin.configSaved')}</p>}
                    {llmUpdateMutation.isError && <p className="text-sm" style={{ color: 'var(--accent-red)' }}>{t('admin.saveFailed')}</p>}
                    {llmTestMutation.data && (
                      <p className="text-sm" style={{ color: llmTestMutation.data.data?.success ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        {llmTestMutation.data.data?.message || t('admin.testComplete')}
                      </p>
                    )}
                  </form>
                </div>
              </>
            )}
          </>
        )}

        {/* ========== 用户管理 ========== */}
        {activeTab === 'users' && (
          <div className="rounded-lg p-4" style={cardStyle}>
            <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{t('admin.userList')}</h3>
            {usersLoading && <div className="loading-state">{t('common.loading')}</div>}
            {usersError && <ErrorDisplay message={usersError instanceof Error ? usersError.message : t('admin.fetchUsersFailed')} />}
            {usersData && (
              <>
                <p className="mb-3 text-sm" style={mutedText}>{t('admin.totalCount')}: {usersData.pagination.total}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        {[t('admin.userId'), t('admin.userName'), t('admin.faction'), t('admin.level'), t('admin.type'), t('admin.status'), t('admin.actions')].map((h) => (
                          <th key={h} className="p-2 text-left" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {usersData.users.slice(0, 10).map((user) => (
                        <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td className="p-2" style={mutedText}>{user.id.slice(0, 12)}...</td>
                          <td className="p-2" style={{ color: 'var(--text-primary)' }}>{user.name}</td>
                          <td className="p-2" style={{ color: 'var(--accent-purple)' }}>{user.faction}</td>
                          <td className="p-2" style={{ color: 'var(--accent-gold)' }}>Lv.{user.level}</td>
                          <td className="p-2" style={{ color: 'var(--accent-blue)' }}>{user.isGuest ? t('admin.guestType') : t('admin.registeredType')}</td>
                          <td className="p-2">
                            <span className="px-2 py-0.5 text-xs rounded font-medium"
                              style={{
                                background: user.banned ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                                color: user.banned ? 'var(--accent-red)' : 'var(--accent-green)',
                              }}>
                              {user.banned ? t('admin.banned') : t('admin.normal')}
                            </span>
                          </td>
                          <td className="p-2">
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleUserBan(user)}
                                disabled={banUserMutation.isPending}
                                className="px-2 py-1 text-xs rounded disabled:opacity-50"
                                style={{
                                  background: user.banned ? 'var(--accent-green)' : 'var(--accent-gold)',
                                  color: 'white',
                                }}
                              >
                                {user.banned ? t('admin.unban') : t('admin.ban')}
                              </button>
                              <button
                                onClick={() => handleUserDelete(user)}
                                disabled={deleteUserMutation.isPending}
                                className="px-2 py-1 text-xs rounded disabled:opacity-50"
                                style={{ background: 'var(--accent-red)', color: 'white' }}
                              >
                                {t('admin.delete')}
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

        {/* ========== 充值管理 ========== */}
        {activeTab === 'recharge' && (
          <>
            <div className="rounded-lg p-4" style={cardStyle}>
              <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{t('admin.rechargeOperation')}</h3>
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
                  <label style={labelText}>{t('admin.playerId')}</label>
                  <input name="playerId" placeholder="player_xxxx" style={inputStyle} />
                </div>
                <div>
                  <label style={labelText}>{t('admin.goldAmount')}</label>
                  <input name="amount" type="number" placeholder="100" style={inputStyle} />
                </div>
                <div>
                  <label style={labelText}>{t('admin.reason')}</label>
                  <input name="reason" placeholder={t('admin.activityReward')} style={inputStyle} />
                </div>
                <button
                  type="submit"
                  disabled={rechargeMutation.isPending}
                  className="w-full py-2 font-bold rounded disabled:opacity-50"
                  style={{ background: 'var(--accent-gold)', color: 'var(--bg-primary)' }}
                >
                  {rechargeMutation.isPending ? t('admin.processing') : t('admin.recharge')}
                </button>
              </form>
            </div>

            <div className="rounded-lg p-4" style={cardStyle}>
              <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{t('admin.rechargeRecords')}</h3>
              {rechargeLoading && <div className="loading-state">{t('common.loading')}</div>}
              {rechargeError && <ErrorDisplay message={rechargeError instanceof Error ? rechargeError.message : t('admin.fetchRechargeFailed')} />}
              {rechargeData && (
                <>
                  <p className="mb-3 text-sm" style={mutedText}>{t('admin.totalCount')}: {rechargeData.pagination.total}</p>
                  {rechargeData.logs.length === 0 ? (
                    <div className="empty-state">
                      <p>{t('admin.noRechargeRecords')}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {rechargeData.logs.map((log) => (
                        <div key={log.id} className="rounded p-3 text-sm" style={subCardStyle}>
                          <div className="flex justify-between">
                            <span style={mutedText}>{log.playerName || log.playerId}</span>
                            <span className="font-bold" style={{ color: 'var(--accent-gold)' }}>+{log.amount}</span>
                          </div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{log.reason} - {new Date(log.executedAt).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* ========== Agent日志 ========== */}
        {activeTab === 'logs' && (
          <div className="rounded-lg p-4" style={cardStyle}>
            <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{t('admin.agentTaskLogs')}</h3>
            {agentLogsLoading && <div className="loading-state">{t('common.loading')}</div>}
            {agentLogsError && <ErrorDisplay message={agentLogsError instanceof Error ? agentLogsError.message : t('admin.fetchAgentLogsFailed')} />}
            {agentLogsData && (
              <>
                <p className="mb-3 text-sm" style={mutedText}>{t('admin.totalCount')}: {agentLogsData.pagination.total}</p>
                {agentLogsData.logs.length === 0 ? (
                  <div className="empty-state"><p>{t('admin.noAgentTaskLogs')}</p></div>
                ) : (
                  <div className="space-y-2">
                    {agentLogsData.logs.map((log) => {
                      const statusColors: Record<string, string> = {
                        completed: 'var(--accent-green)',
                        running: 'var(--accent-blue)',
                        failed: 'var(--accent-red)',
                      }
                      return (
                        <div key={log.id} className="rounded p-3 text-sm" style={subCardStyle}>
                          <div className="flex justify-between">
                            <span style={mutedText}>{log.agentId}</span>
                            <span className="font-bold" style={{ color: statusColors[log.status] || 'var(--text-muted)' }}>{log.status}</span>
                          </div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{log.taskType} - {new Date(log.createdAt).toLocaleString()}</div>
                        </div>
                      )
                    })}
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
