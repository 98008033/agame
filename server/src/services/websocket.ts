// WebSocket Notification Service - P1-I01
// 实时推送关键事件：玩家死亡、世界大事件

import { WebSocketServer, WebSocket, type RawData } from 'ws';
import type { Server } from 'http';

// ============================================
// 通知类型定义
// ============================================

export type NotificationType =
  | 'player_death'        // 玩家死亡
  | 'world_event'         // 世界大事件
  | 'faction_war'         // 阵营战争
  | 'city_siege'          // 城城围攻
  | 'npc_death'           // 重要NPC死亡
  | 'system_alert';       // 系统警报

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export interface WebSocketMessage {
  event: 'notification' | 'ping' | 'pong' | 'subscribe' | 'unsubscribe';
  payload?: NotificationPayload | { channels?: string[] };
}

// ============================================
// WebSocket服务类
// ============================================

class WebSocketNotificationService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocket> = new Map();
  private playerChannels: Map<string, Set<string>> = new Map(); // playerId -> channels

  /**
   * 初始化WebSocket服务器
   */
  init(server: Server): void {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      perMessageDeflate: false, // Disable to avoid "Insufficient resources" zlib errors
      maxPayload: 1 * 1024 * 1024, // 1MB
    });

    this.wss.on('error', (err) => {
      console.error('[WebSocket] Server error:', err);
    });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientIp = req.socket.remoteAddress || 'unknown';
      const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      console.log(`[WebSocket] Client connected: ${clientId} from ${clientIp}`);

      // 存储客户端
      this.clients.set(clientId, ws);

      // 发送连接确认
      this.send(ws, {
        event: 'notification',
        payload: {
          type: 'system_alert',
          title: '连接成功',
          message: 'WebSocket实时通知已激活',
          timestamp: new Date().toISOString(),
          priority: 'low',
        },
      });

      // 消息处理
      ws.on('message', (data: RawData) => {
        try {
          const message = JSON.parse(data.toString()) as WebSocketMessage;
          this.handleMessage(clientId, ws, message);
        } catch (err) {
          console.error('[WebSocket] Invalid message:', err);
        }
      });

      // 断开处理
      ws.on('close', () => {
        console.log(`[WebSocket] Client disconnected: ${clientId}`);
        this.clients.delete(clientId);
        this.playerChannels.delete(clientId);
      });

      // 错误处理
      ws.on('error', (err) => {
        console.error(`[WebSocket] Client error ${clientId}:`, err);
        this.clients.delete(clientId);
        this.playerChannels.delete(clientId);
      });

      // 心跳检测
      this.startHeartbeat(ws);
    });

    console.log('[WebSocket] Notification service initialized on /ws');
  }

  /**
   * 处理客户端消息
   */
  private handleMessage(clientId: string, ws: WebSocket, message: WebSocketMessage): void {
    switch (message.event) {
      case 'subscribe':
        // 订阅特定频道（如玩家自己的频道）
        const channels = (message.payload as { channels?: string[] })?.channels || [];
        this.subscribeChannels(clientId, channels);
        break;

      case 'unsubscribe':
        const unsubChannels = (message.payload as { channels?: string[] })?.channels || [];
        this.unsubscribeChannels(clientId, unsubChannels);
        break;

      case 'ping':
        this.send(ws, { event: 'pong' });
        break;

      default:
        console.log(`[WebSocket] Unknown event: ${message.event}`);
    }
  }

  /**
   * 订阅频道
   */
  private subscribeChannels(clientId: string, channels: string[]): void {
    const current = this.playerChannels.get(clientId) || new Set();
    channels.forEach((ch) => current.add(ch));
    this.playerChannels.set(clientId, current);
    console.log(`[WebSocket] ${clientId} subscribed to: ${channels.join(',')}`);
  }

  /**
   * 取消订阅频道
   */
  private unsubscribeChannels(clientId: string, channels: string[]): void {
    const current = this.playerChannels.get(clientId);
    if (current) {
      channels.forEach((ch) => current.delete(ch));
      this.playerChannels.set(clientId, current);
    }
  }

  /**
   * 发送消息给客户端
   */
  private send(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * 心跳检测
   */
  private startHeartbeat(ws: WebSocket): void {
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        this.send(ws, { event: 'ping' });
      } else {
        clearInterval(interval);
      }
    }, 30000); // 30秒心跳
  }

  // ============================================
  // 公开API - 发送通知
  // ============================================

  /**
   * 向所有客户端广播通知
   */
  broadcast(payload: NotificationPayload): void {
    const message: WebSocketMessage = {
      event: 'notification',
      payload,
    };

    this.clients.forEach((ws) => {
      this.send(ws, message);
    });

    console.log(`[WebSocket] Broadcast: ${payload.type} - ${payload.title}`);
  }

  /**
   * 向特定玩家发送通知
   */
  sendToPlayer(playerId: string, payload: NotificationPayload): void {
    const message: WebSocketMessage = {
      event: 'notification',
      payload,
    };

    const channel = `player:${playerId}`;

    this.playerChannels.forEach((channels, clientId) => {
      if (channels.has(channel)) {
        const ws = this.clients.get(clientId);
        if (ws) {
          this.send(ws, message);
        }
      }
    });

    console.log(`[WebSocket] Sent to player ${playerId}: ${payload.type}`);
  }

  /**
   * 向特定频道发送通知
   */
  sendToChannel(channel: string, payload: NotificationPayload): void {
    const message: WebSocketMessage = {
      event: 'notification',
      payload,
    };

    this.playerChannels.forEach((channels, clientId) => {
      if (channels.has(channel)) {
        const ws = this.clients.get(clientId);
        if (ws) {
          this.send(ws, message);
        }
      }
    });

    console.log(`[WebSocket] Sent to channel ${channel}: ${payload.type}`);
  }

  /**
   * 发送玩家死亡通知
   */
  notifyPlayerDeath(playerId: string, playerName: string, cause: string): void {
    this.sendToPlayer(playerId, {
      type: 'player_death',
      title: '角色死亡',
      message: `${playerName}已死亡，原因：${cause}`,
      data: { playerId, cause },
      timestamp: new Date().toISOString(),
      priority: 'critical',
    });
  }

  /**
   * 发送世界大事件通知
   */
  notifyWorldEvent(title: string, description: string, affectedFactions?: string[]): void {
    this.broadcast({
      type: 'world_event',
      title,
      message: description,
      data: { affectedFactions },
      timestamp: new Date().toISOString(),
      priority: 'high',
    });
  }

  /**
   * 发送阵营战争通知
   */
  notifyFactionWar(attacker: string, defender: string, status: string): void {
    this.broadcast({
      type: 'faction_war',
      title: `${attacker}发动战争`,
      message: `${attacker}对${defender}发起进攻，状态：${status}`,
      data: { attacker, defender, status },
      timestamp: new Date().toISOString(),
      priority: 'high',
    });
  }

  /**
   * 获取连接数
   */
  getConnectionCount(): number {
    return this.clients.size;
  }

  /**
   * 关闭服务
   */
  close(): void {
    if (this.wss) {
      this.wss.close();
      this.clients.clear();
      this.playerChannels.clear();
      console.log('[WebSocket] Service closed');
    }
  }
}

// 导出单例实例
export const wsNotificationService = new WebSocketNotificationService();

// 导出类型和类供外部使用
export { WebSocketNotificationService };