// Rate Limiter Middleware - P0-B15
// 实现API限流，保护核心接口免受滥用

import { type Request, type Response, type NextFunction } from 'express';
import { createErrorResponse, generateRequestId } from '../types/api.js';

// ============================================
// 限流配置
// ============================================

interface RateLimitConfig {
  windowMs: number;      // 时间窗口（毫秒）
  maxRequests: number;   // 窗口内最大请求数
  keyGenerator?: (req: Request) => string;  // 自定义key生成器
  message?: string;      // 自定义错误消息
}

// 默认配置
const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000,   // 1分钟
  maxRequests: 60,       // 每分钟60次
};

// 关键操作限流配置（登录、注册等）
const STRICT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000,   // 1分钟
  maxRequests: 10,       // 每分钟10次
};

// ============================================
// 内存存储限流器
// ============================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class MemoryRateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // 每5分钟清理过期记录
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key);
      }
    }
  }

  check(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || entry.resetTime < now) {
      // 新窗口
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + config.windowMs,
      };
      this.store.set(key, newEntry);
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: newEntry.resetTime,
      };
    }

    if (entry.count >= config.maxRequests) {
      // 超过限制
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    // 增加计数
    entry.count++;
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  reset(key: string): void {
    this.store.delete(key);
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// 全局限流器实例
const rateLimiter = new MemoryRateLimiter();

// ============================================
// 限流中间件工厂
// ============================================

export function createRateLimiter(config: RateLimitConfig = DEFAULT_CONFIG) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = req.requestId ?? generateRequestId();

    // 生成限流key（默认使用IP + 路径）
    const key = config.keyGenerator
      ? config.keyGenerator(req)
      : `${req.ip || 'unknown'}:${req.path}`;

    const result = rateLimiter.check(key, config);

    // 设置响应头
    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter);

      res.status(429).json(createErrorResponse(
        'RATE_LIMITED',
        config.message || `请求过于频繁，请${retryAfter}秒后再试`,
        requestId,
        { retryAfter, resetTime: result.resetTime },
        true
      ));
      return;
    }

    next();
  };
}

// ============================================
// 预定义限流中间件
// ============================================

// 通用API限流（每分钟60次）
export const apiRateLimiter = createRateLimiter(DEFAULT_CONFIG);

// 严格限流（用于登录、注册等关键操作）
export const strictRateLimiter = createRateLimiter({
  ...STRICT_CONFIG,
  keyGenerator: (req: Request) => `${req.ip || 'unknown'}:${req.path}:${req.body?.username || ''}`,
  message: '操作过于频繁，请稍后再试',
});

// IP全局限流（每分钟100次）
export const ipRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  keyGenerator: (req: Request) => req.ip || 'unknown',
  message: 'IP请求过于频繁',
});

// 认证API限流（登录+注册合并，防止暴力破解）
export const authRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,  // 5分钟
  maxRequests: 20,          // 5分钟20次尝试
  keyGenerator: (req: Request) => `${req.ip || 'unknown'}:auth`,
  message: '认证尝试过多，请5分钟后再试',
});

// ============================================
// 导出清理函数（用于测试）
// ============================================

export function resetRateLimiter(key?: string): void {
  if (key) {
    rateLimiter.reset(key);
  } else {
    rateLimiter.destroy();
  }
}

export default {
  apiRateLimiter,
  strictRateLimiter,
  ipRateLimiter,
  authRateLimiter,
  createRateLimiter,
  resetRateLimiter,
};