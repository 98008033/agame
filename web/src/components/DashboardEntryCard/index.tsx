import { useNavigate } from 'react-router-dom'

interface DashboardEntryCardProps {
  icon: string
  title: string
  description?: string
  accent: string
  path: string
  priority?: 'high' | 'normal'
  size?: 'large' | 'compact'
}

export default function DashboardEntryCard({
  icon,
  title,
  description,
  accent,
  path,
  priority = 'normal',
  size = 'large',
}: DashboardEntryCardProps) {
  const navigate = useNavigate()
  const isCompact = size === 'compact'

  return (
    <button
      onClick={() => navigate(path)}
      className={`w-full text-left rounded-xl transition-all duration-200 active:scale-[0.98] ${
        isCompact
          ? 'p-3 text-center bg-[var(--bg-secondary)] hover:-translate-y-[1px]'
          : 'p-4 hover:-translate-y-[2px] hover:shadow-lg'
      }`}
      style={{
        border: `1px solid ${accent}40`,
        borderTopWidth: priority === 'high' ? '3px' : '1px',
        borderTopColor: priority === 'high' ? accent : `${accent}40`,
        borderRadius: isCompact ? '8px' : '12px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = accent
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = `${accent}40`
      }}
    >
      <span
        className={`inline-flex items-center justify-center rounded-lg ${isCompact ? 'w-8 h-8 mb-2' : 'w-10 h-10 mb-3'}`}
        style={{ backgroundColor: `${accent}20` }}
      >
        <span className={isCompact ? 'text-lg' : 'text-xl'}>{icon}</span>
      </span>
      <h4
        className={`font-bold font-display ${isCompact ? 'text-sm' : 'text-base'}`}
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </h4>
      {!isCompact && description && (
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
      )}
    </button>
  )
}
