import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()
import { usePlayerStore } from './stores/playerStore'
import { useWebSocket } from './hooks/useWebSocket'
import { NotificationToast } from './components'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import NovelPage from './pages/NovelPage'
import GamePage from './pages/GamePage'
import StatusPage from './pages/StatusPage'
import CharacterCreatePage from './pages/CharacterCreatePage'
import NewsPage from './pages/NewsPage'
import TodayPlanPage from './pages/TodayPlanPage'
import JournalPage from './pages/JournalPage'
import AdminPage from './pages/AdminPage'
import DeathNarrativePage from './pages/DeathNarrativePage'
import EventHistoryPage from './pages/EventHistoryPage'
import FactionPage from './pages/FactionPage'
import APSystemPage from './pages/APSystemPage'
import DialogPage from './pages/DialogPage'

// WebSocket连接组件
function WebSocketProvider() {
  useWebSocket() // 自动连接和管理WebSocket
  return null
}

// App初始化组件 - 恢复用户数据
function AppInitializer() {
  const fetchStatus = usePlayerStore((s) => s.fetchStatus)
  const player = usePlayerStore((s) => s.player)

  useEffect(() => {
    // 检查是否有token，如果有则恢复用户数据
    const token = localStorage.getItem('auth_token')
    const userId = localStorage.getItem('user_id')

    if (token && userId && !player.id) {
      console.log('恢复用户数据...')
      fetchStatus()
    }
  }, [fetchStatus, player.id])

  return null
}

// 认证保护路由
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const player = usePlayerStore((s) => s.player)
  const token = localStorage.getItem('auth_token')

  if (!player.id && !token) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInitializer />
      <WebSocketProvider />
      <NotificationToast />
      <BrowserRouter>
      <Routes>
        {/* 公开路由 */}
        <Route path="/login" element={<LoginPage />} />

        {/* 保护路由 */}
        <Route path="/dashboard" element={
          <ProtectedRoute><DashboardPage /></ProtectedRoute>
        } />
        <Route path="/novel" element={
          <ProtectedRoute><NovelPage /></ProtectedRoute>
        } />
        <Route path="/game" element={
          <ProtectedRoute><GamePage /></ProtectedRoute>
        } />
        <Route path="/status" element={
          <ProtectedRoute><StatusPage /></ProtectedRoute>
        } />
        <Route path="/news" element={
          <ProtectedRoute><NewsPage /></ProtectedRoute>
        } />
        <Route path="/plan" element={
          <ProtectedRoute><TodayPlanPage /></ProtectedRoute>
        } />
        <Route path="/journal" element={
          <ProtectedRoute><JournalPage /></ProtectedRoute>
        } />
        <Route path="/character/create" element={
          <ProtectedRoute><CharacterCreatePage /></ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute><AdminPage /></ProtectedRoute>
        } />
        <Route path="/death" element={<DeathNarrativePage />} />
        <Route path="/event-history" element={
          <ProtectedRoute><EventHistoryPage /></ProtectedRoute>
        } />
        <Route path="/factions" element={
          <ProtectedRoute><FactionPage /></ProtectedRoute>
        } />
        <Route path="/factions/:id" element={
          <ProtectedRoute><FactionPage /></ProtectedRoute>
        } />
        <Route path="/actions" element={
          <ProtectedRoute><APSystemPage /></ProtectedRoute>
        } />
        <Route path="/dialog" element={
          <ProtectedRoute><DialogPage /></ProtectedRoute>
        } />
        <Route path="/dialog/:npcId" element={
          <ProtectedRoute><DialogPage /></ProtectedRoute>
        } />

        {/* 默认路由 */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}