import { useEffect, useRef, useCallback } from 'react'
import { useWebSocketStore, createNotification, type WSMessage } from '../stores/websocketStore'
import { useGameStore } from '../stores/gameStore'
import { useEventStore } from '../stores/eventStore'
import { usePlayerStore } from '../stores/playerStore'

/**
 * WebSocket连接管理Hook
 * 提供连接、断线重连、消息处理
 */

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws'
const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAY_BASE = 1000 // 1秒
const RECONNECT_DELAY_MAX = 30000 // 30秒

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const pingIntervalRef = useRef<number | null>(null)

  const {
    status,
    reconnectAttempts,
    gaveUp,
    setStatus,
    addMessage,
    addNotification,
    incrementReconnect,
    resetReconnect,
    setGaveUp,
  } = useWebSocketStore()

  const currentDay = useGameStore((s) => s.currentDay)
  const setActiveEvents = useEventStore((s) => s.setActiveEvents)
  const player = usePlayerStore((s) => s.player)

  // Stable refs to avoid recreating connect/disconnect on every state change
  const connectRef = useRef<(() => void) | null>(null)
  const disconnectRef = useRef<(() => void) | null>(null)

  // 当前订阅的频道
  const subscribedChannels = useRef<Set<string>>(new Set())

  // 计算重连延迟（指数退避）
  const getReconnectDelay = useCallback(() => {
    const delay = Math.min(
      RECONNECT_DELAY_BASE * Math.pow(2, reconnectAttempts),
      RECONNECT_DELAY_MAX
    )
    return delay
  }, [reconnectAttempts])

  // 处理接收到的消息
  const handleMessage = useCallback((rawMessage: string) => {
    try {
      const message: WSMessage = JSON.parse(rawMessage)

      // 记录消息
      addMessage(message)

      // 根据消息类型处理
      switch (message.type) {
        case 'connected':
          setStatus('connected')
          addNotification(createNotification('success', 'WebSocket已连接', '实时通知服务已启动'))
          break

        case 'disconnected':
          setStatus('disconnected')
          break

        case 'subscribed':
          // 订阅确认
          const subData = message.data as { channel: string }
          subscribedChannels.current.add(subData.channel)
          console.log(`[WebSocket] Subscribed to channel: ${subData.channel}`)
          break

        case 'unsubscribed':
          // 取消订阅确认
          const unsubData = message.data as { channel: string }
          subscribedChannels.current.delete(unsubData.channel)
          break

        case 'event_new':
          // 新事件推送 - 个人频道 or 广播
          const eventChannel = (message as Record<string, unknown>).channel as string | undefined
          const eventData = message.data as { id: string; title: string; description: string; faction?: string; playerId?: string; choices?: Array<{ index: number; label: string; description: string }> }
          // 如果是个人事件且有playerId，检查是否匹配当前玩家
          if (eventData.playerId && eventChannel?.startsWith('player:')) {
            if (eventData.playerId !== player.id) {
              // 不匹配当前玩家，忽略
              break
            }
          }
          // 构建新事件对象
          const newEvent = {
            id: eventData.id,
            title: eventData.title,
            description: eventData.description,
            faction: eventData.faction,
            choices: eventData.choices?.map((c) => ({
              id: `choice_${c.index}`,
              index: c.index,
              text: c.label,
              description: c.description,
            })) || [],
            status: 'pending',
            triggeredAt: currentDay,
          }
          // 添加到activeEvents
          const activeEvents = useEventStore.getState().activeEvents
          setActiveEvents([...activeEvents, newEvent as any])
          addNotification(createNotification('info', '新事件', eventData.title, 0))
          break

        case 'event_update':
          // 事件状态更新 - 广播
          const updateData = message.data as { eventId: string; status: string }
          addNotification(createNotification('info', '事件更新', `事件状态变为: ${updateData.status}`))
          break

        case 'world_update':
          // 世界状态更新 - 广播
          addNotification(createNotification('info', '世界变化', '世界状态已更新'))
          break

        case 'player_death':
          // 玩家死亡通知 - 个人频道
          const deathData = message.data as { playerId: string; reason: string }
          // 仅处理当前玩家或无playerId（广播）
          if (!deathData.playerId || deathData.playerId === player.id) {
            addNotification(createNotification('danger', '角色死亡', deathData.reason, 0))
          }
          break

        case 'notification':
          // 通用通知 - 支持个人和广播
          const notifData = message.data as { title: string; message: string; type?: string; playerId?: string }
          if (notifData.playerId && notifData.playerId !== player.id) {
            break
          }
          addNotification(createNotification(
            (notifData.type as 'info' | 'warning' | 'danger' | 'success') || 'info',
            notifData.title,
            notifData.message
          ))
          break

        case 'agent_task':
          // Agent任务完成通知 - 广播
          const taskData = message.data as { agentId: string; taskType: string; status: string }
          if (taskData.status === 'completed') {
            addNotification(createNotification('success', 'Agent任务完成', `${taskData.agentId}: ${taskData.taskType}`))
          } else if (taskData.status === 'failed') {
            addNotification(createNotification('warning', 'Agent任务失败', `${taskData.agentId}: ${taskData.taskType}`))
          }
          break

        case 'pong':
          // 心跳响应，保持连接活跃
          break

        default:
          console.log('[WebSocket] Unknown message type:', message.type)
      }
    } catch (err) {
      console.error('[WebSocket] Failed to parse message:', err)
    }
  }, [addMessage, addNotification, setStatus, setActiveEvents, currentDay, player.id])

  // 发送心跳
  const sendPing = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }))
    }
  }, [])

  // 连接WebSocket — 定义在ref中以稳定依赖
  const connect = useCallback(() => {
    // 已放弃重连时不再尝试
    if (gaveUp) return

    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      return // 已有连接或正在连接
    }

    setStatus('connecting')

    try {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[WebSocket] Connected')
        setStatus('connected')
        resetReconnect()

        // 发送认证（如果有token）
        const token = localStorage.getItem('auth_token')
        const userId = localStorage.getItem('user_id')
        if (token) {
          ws.send(JSON.stringify({ type: 'auth', token }))
        }

        // 订阅个人频道 player:{playerId}
        if (userId) {
          const playerChannel = `player:${userId}`
          ws.send(JSON.stringify({ type: 'subscribe', channel: playerChannel }))
          console.log(`[WebSocket] Subscribing to personal channel: ${playerChannel}`)
        }

        // 开始心跳
        pingIntervalRef.current = window.setInterval(sendPing, 30000) // 30秒心跳
      }

      ws.onmessage = (event) => {
        handleMessage(event.data)
      }

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error)
      }

      ws.onclose = (event) => {
        console.log('[WebSocket] Closed:', event.code, event.reason)
        setStatus('disconnected')

        // 清理心跳
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current)
          pingIntervalRef.current = null
        }

        // 非正常关闭时尝试重连
        if (event.code !== 1000 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          setStatus('reconnecting')
          incrementReconnect()
          const delay = getReconnectDelay()
          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`)
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connectRef.current?.()
          }, delay)
        } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          // 达到最大重连次数，静默放弃，不再发送通知
          console.warn('[WebSocket] Max reconnect attempts reached, giving up')
          setStatus('disconnected')
          setGaveUp(true)
        }
      }
    } catch (err) {
      console.error('[WebSocket] Failed to connect:', err)
      setStatus('disconnected')
    }
  }, [setStatus, resetReconnect, sendPing, handleMessage, reconnectAttempts, incrementReconnect, getReconnectDelay, gaveUp, setGaveUp])

  // 保持ref指向最新的connect
  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  // 断开连接
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect')
      wsRef.current = null
    }
    setStatus('disconnected')
    resetReconnect()
  }, [setStatus, resetReconnect])

  useEffect(() => {
    disconnectRef.current = disconnect
  }, [disconnect])

  // 发送消息
  const send = useCallback((type: string, data?: unknown) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, data }))
    } else {
      console.warn('[WebSocket] Cannot send, not connected')
    }
  }, [])

  // 组件挂载时自动连接 — 使用稳定ref避免无限重连循环
  useEffect(() => {
    connectRef.current?.()

    return () => {
      disconnectRef.current?.()
    }
  }, []) // 空依赖，只挂载/卸载时执行

  // 玩家登录后自动订阅个人频道
  useEffect(() => {
    if (player.id && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const playerChannel = `player:${player.id}`
      if (!subscribedChannels.current.has(playerChannel)) {
        wsRef.current.send(JSON.stringify({ type: 'subscribe', channel: playerChannel }))
        console.log(`[WebSocket] Subscribing to personal channel: ${playerChannel}`)
      }
    }
  }, [player.id])

  return {
    status,
    reconnectAttempts,
    gaveUp,
    connect: connectRef.current ?? connect,
    disconnect: disconnectRef.current ?? disconnect,
    send,
    isConnected: status === 'connected',
  }
}