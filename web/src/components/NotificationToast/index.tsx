import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useWebSocketStore, type WSNotification } from '../../stores/websocketStore'

/**
 * WebSocket实时通知组件
 * 显示来自WebSocket的通知消息
 */

export default function NotificationToast() {
  const { t } = useTranslation()
  const notifications = useWebSocketStore((s) => s.notifications)
  const removeNotification = useWebSocketStore((s) => s.removeNotification)

  // 自动移除有duration的通知
  useEffect(() => {
    notifications.forEach((notif) => {
      if (notif.duration && notif.duration > 0) {
        const timeout = setTimeout(() => {
          removeNotification(notif.id)
        }, notif.duration)

        return () => clearTimeout(timeout)
      }
    })
  }, [notifications, removeNotification])

  if (notifications.length === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notif) => (
        <NotificationItem
          key={notif.id}
          notification={notif}
          onClose={() => removeNotification(notif.id)}
        />
      ))}
    </div>
  )
}

function NotificationItem({
  notification,
  onClose,
}: {
  notification: WSNotification
  onClose: () => void
}) {
  const typeStyles = {
    info: 'bg-blue-900/90 border-blue-500 text-blue-200',
    success: 'bg-green-900/90 border-green-500 text-green-200',
    warning: 'bg-yellow-900/90 border-yellow-500 text-yellow-200',
    danger: 'bg-red-900/90 border-red-500 text-red-200',
  }

  const typeIcons = {
    info: '[i]',
    success: '[ok]',
    warning: '[!]',
    danger: '[x]',
  }

  return (
    <div
      className={`p-3 rounded-lg border shadow-lg ${typeStyles[notification.type]} animate-slide-in`}
      role="alert"
    >
      <div className="flex items-start gap-2">
        <span className="font-bold">{typeIcons[notification.type]}</span>
        <div className="flex-1">
          <p className="font-medium">{notification.title}</p>
          <p className="text-sm opacity-80">{notification.message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-sm opacity-60 hover:opacity-100"
        >
          {t('notification.close')}
        </button>
      </div>
      <p className="text-xs opacity-50 mt-1">
        {notification.timestamp.toLocaleTimeString()}
      </p>
    </div>
  )
}