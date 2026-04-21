import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePlayerStore } from '../../stores/playerStore'

export default function UserAvatarMenu() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const player = usePlayerStore((s) => s.player)
  const setPlayer = usePlayerStore((s) => s.setPlayer)
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 退出登录
  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_id')
    setPlayer({ id: null, name: '', isNew: true })
    setIsOpen(false)
    navigate('/login')
  }

  // 获取阵营颜色
  const factionColors: Record<string, string> = {
    canglong: 'var(--faction-canglong)',
    shuanglang: 'var(--faction-shuanglang)',
    jinque: 'var(--faction-jinque)',
    border: 'var(--faction-border)',
  }

  const avatarColor = player.faction ? factionColors[player.faction] : 'var(--accent-purple)'

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-card)] transition-colors"
      >
        {/* Avatar图标 */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
          style={{ background: avatarColor }}
        >
          {player.name?.charAt(0) || 'U'}
        </div>
        <div className="hidden sm:block">
          <span className="text-[var(--text-primary)] font-medium">{player.name || t('user_menu.traveler')}</span>
          <span className="text-[var(--accent-gold)] text-xs ml-1">Lv.{player.level || 1}</span>
        </div>
        {/* 下拉箭头 */}
        <span className={`text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--bg-card)] rounded-lg shadow-lg border border-[rgba(255,255,255,0.1)] z-50">
          {/* 用户信息 */}
          <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.1)]">
            <p className="text-[var(--text-primary)] font-medium">{player.name}</p>
            <p className="text-[var(--text-muted)] text-xs">
              {player.faction ? t(`factions.${player.faction}`) : t('factions.noFaction')} · Lv.{player.level}
            </p>
          </div>

          {/* 菜单项 */}
          <div className="py-2">
            {/* 个人信息 */}
            <button
              onClick={() => {
                setIsOpen(false)
                navigate('/status')
              }}
              className="w-full px-4 py-2 text-left text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2"
            >
              <span>👤</span>
              <span>{t('user_menu.profile')}</span>
            </button>

            {/* 设置 */}
            <button
              onClick={() => {
                setIsOpen(false)
                navigate('/status')
              }}
              className="w-full px-4 py-2 text-left text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2"
            >
              <span>⚙️</span>
              <span>{t('user_menu.settings')}</span>
            </button>

            {/* 分隔线 */}
            <div className="my-1 border-t border-[rgba(255,255,255,0.1)]" />

            {/* 退出登录 */}
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-left text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 transition-colors flex items-center gap-2"
            >
              <span>🚪</span>
              <span>{t('user_menu.logout')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}