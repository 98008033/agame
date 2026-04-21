import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayerStore } from '../../stores/playerStore'
import { apiClient } from '../../services/api'
import { playerApi } from '../../services'

export default function LoginPage() {
  const navigate = useNavigate()
  const setPlayer = usePlayerStore((s) => s.setPlayer)
  const [mode, setMode] = useState<'login' | 'register' | 'guest'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkingToken, setCheckingToken] = useState(true)

  // 检查是否有现有token，尝试恢复登录状态
  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      playerApi.getStatus()
        .then((res) => {
          if (res.data.success) {
            const data = res.data.data
            setPlayer({
              id: data.id,
              name: data.name,
              age: data.age,
              faction: data.faction,
              factionLevel: data.factionLevel,
              level: data.level,
              experience: data.experience,
              attributes: data.attributes,
              resources: data.resources,
              tags: data.tags,
            })
            navigate('/dashboard')
          } else {
            localStorage.removeItem('auth_token')
            setCheckingToken(false)
          }
        })
        .catch(() => {
          localStorage.removeItem('auth_token')
          setCheckingToken(false)
        })
    } else {
      setCheckingToken(false)
    }
  }, [navigate, setPlayer])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      let res

      if (mode === 'guest') {
        // 游客登录
        res = await apiClient.post('/auth/guest', { name })
      } else if (mode === 'register') {
        // 注册
        res = await apiClient.post('/auth/register', {
          username,
          password,
          name: name || username,
        })
      } else {
        // 登录
        res = await apiClient.post('/auth/login', {
          username,
          password,
        })
      }

      if (res.data.success) {
        const { auth, player } = res.data.data
        localStorage.setItem('auth_token', auth.token)
        setPlayer(player)
        navigate('/dashboard')
      } else {
        setError(res.data.error?.message || '操作失败')
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } }
      setError(axiosErr.response?.data?.error?.message || '网络错误，请检查后端服务')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      {checkingToken ? (
        <div className="text-[var(--text-secondary)]">验证登录状态...</div>
      ) : (
      <div className="card-modern max-w-md w-full">
        <h1 className="text-3xl font-bold text-center text-[var(--accent-gold)] mb-2 font-display">
          Agame
        </h1>
        <p className="text-[var(--text-muted)] text-center mb-8">
          在乱世中书写你的传奇
        </p>

        {/* 模式切换 */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded-[var(--radius-md)] transition font-medium ${
              mode === 'login'
                ? 'bg-[var(--accent-blue)] text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            登录
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-2 rounded-[var(--radius-md)] transition font-medium ${
              mode === 'register'
                ? 'bg-[var(--accent-blue)] text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            注册
          </button>
          <button
            onClick={() => setMode('guest')}
            className={`flex-1 py-2 rounded-[var(--radius-md)] transition font-medium ${
              mode === 'guest'
                ? 'bg-[var(--accent-blue)] text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            游客
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode !== 'guest' && (
            <>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">用户名</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  className="input-modern w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="input-modern w-full"
                  required
                  minLength={6}
                />
              </div>
            </>
          )}

          {(mode === 'register' || mode === 'guest') && (
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">角色名称</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={mode === 'guest' ? '旅行者_xxxx' : '默认使用用户名'}
                className="input-modern w-full"
              />
            </div>
          )}

          {mode === 'guest' && (
            <p className="text-[var(--text-muted)] text-sm">
              游客模式：快速体验，数据不持久保存
            </p>
          )}

          {error && (
            <p className="text-[var(--accent-red)] text-sm bg-[var(--accent-red)]/10 p-3 rounded-[var(--radius-md)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 font-bold"
          >
            {loading ? '处理中...' : mode === 'login' ? '登录' : mode === 'register' ? '注册' : '快速开始'}
          </button>
        </form>

        {/* 游戏介绍 */}
        <div className="mt-8 pt-6 border-t border-[rgba(255,255,255,0.1)]">
          <h3 className="text-[var(--text-secondary)] font-medium mb-3">游戏特色</h3>
          <ul className="text-[var(--text-muted)] text-sm space-y-2">
            <li>• 四大阵营博弈，影响世界格局</li>
            <li>• 每日晨报了解天下大事</li>
            <li>• 小说式叙事体验剧情</li>
            <li>• 关键决策改变历史走向</li>
          </ul>
        </div>
      </div>
      )}
    </div>
  )
}