import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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

const factionColors: Record<string, string> = {
  canglong: 'var(--faction-canglong)',
  shuanglang: 'var(--faction-shuanglang)',
  jinque: 'var(--faction-jinque)',
  border: 'var(--faction-border)'
}

export default function NewsPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

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
        <p className="text-[var(--text-secondary)]">{t('common.loadingMorningNews')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center card-modern">
          <p className="text-[var(--accent-red)] mb-4">{t('common.loadFailed')}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-modern"
          >
            {t('common.backHome')}
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
              {t('common.back')}
            </button>
            <div>
              <h1 className="text-xl font-bold text-[var(--accent-gold)] font-display">{t('news.title')}</h1>
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
          const color = factionColors[factionId] || 'var(--text-muted)'
          const factionName = t(`factions.${factionId}`)
          return (
            <section
              key={factionId}
              className="card-modern"
              style={{ borderColor: color }}
            >
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 font-display">{factionName}</h2>

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
                      {factionNews.headline.importance === 'major' ? t('news.major') :
                       factionNews.headline.importance === 'normal' ? t('news.normal') : t('news.minor')}
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
                <p className="text-[var(--text-muted)]">{t('news.noMajorNews')}</p>
              )}

              <p className="mt-4 text-[var(--text-muted)] text-sm border-t border-[rgba(255,255,255,0.1)] pt-3">
                {t('news.summary')}{factionNews.summary}
              </p>
            </section>
          )
        })}
      </main>
    </div>
  )
}