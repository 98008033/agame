import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../services/api'
import { UserAvatarMenu } from '../../components'

interface FactionNews {
  faction: string
  headline: {
    id: string
    title: string
    content: string
    type: string
    importance: string
  } | null
  items: unknown[]
  summary: string
}

interface NewsData {
  day: number
  date: string
  news: Record<string, FactionNews>
  worldHeadline: unknown | null
  playerNews: unknown[]
}

const factionInfo: Record<string, { name: string; color: string }> = {
  canglong: { name: '苍龙帝国', color: 'var(--faction-canglong)' },
  shuanglang: { name: '霜狼联邦', color: 'var(--faction-shuanglang)' },
  jinque: { name: '金雀花王国', color: 'var(--faction-jinque)' },
  border: { name: '边境联盟', color: 'var(--faction-border)' }
}

export default function NewsPage() {
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: ['daily-news'],
    queryFn: async () => {
      const res = await apiClient.get('/world/news')
      return res.data.data as NewsData
    }
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <p className="text-[var(--text-secondary)]">加载晨报...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center card-modern">
          <p className="text-[var(--accent-red)] mb-4">加载失败</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-modern"
          >
            返回主页
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="header-modern">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-modern text-sm"
            >
              ↩ 返回
            </button>
            <div>
              <h1 className="text-xl font-bold text-[var(--accent-gold)] font-display">每日晨报</h1>
              <p className="text-[var(--text-secondary)] text-sm">
                第{data?.day}日 · {data?.date || '2026-04-01'}
              </p>
            </div>
          </div>
          <UserAvatarMenu />
        </div>
      </header>

      {/* News Content */}
      <main className="max-w-2xl mx-auto p-6 space-y-6">
        {data?.news && Object.entries(data.news).map(([factionId, factionNews]) => {
          const info = factionInfo[factionId] || { name: factionId, color: 'var(--text-muted)' }
          return (
            <section
              key={factionId}
              className="card-modern"
              style={{ borderColor: info.color }}
            >
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 font-display">{info.name}</h2>

              {factionNews.headline ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`tag-modern ${
                      factionNews.headline.importance === 'major'
                        ? 'tag-danger'
                        : factionNews.headline.importance === 'normal'
                        ? 'tag-success'
                        : ''
                    }`}>
                      {factionNews.headline.importance === 'major' ? '重大' :
                       factionNews.headline.importance === 'normal' ? '一般' : '轻微'}
                    </span>
                    <span className="text-[var(--text-muted)] text-xs">
                      {factionNews.headline.type}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2 font-display">
                    {factionNews.headline.title}
                  </h3>
                  <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                    {factionNews.headline.content}
                  </p>
                </div>
              ) : (
                <p className="text-[var(--text-muted)]">暂无重大新闻</p>
              )}

              <p className="mt-4 text-[var(--text-muted)] text-sm border-t border-[rgba(255,255,255,0.1)] pt-3">
                概要：{factionNews.summary}
              </p>
            </section>
          )
        })}
      </main>
    </div>
  )
}