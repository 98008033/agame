/**
 * 缓存管理器
 * 支持内存缓存和Redis缓存（多级缓存）
 */

// 缓存条目
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

// 缓存配置
interface CacheConfig {
  maxSize: number; // 最大缓存条目数
  defaultTTL: number; // 默认过期时间(ms)
  cleanupInterval: number; // 清理间隔(ms)
}

const DEFAULT_CONFIG: CacheConfig = {
  maxSize: 1000,
  defaultTTL: 5 * 60 * 1000, // 5分钟
  cleanupInterval: 60 * 1000 // 1分钟
};

export class CacheManager<T = unknown> {
  private cache: Map<string, CacheEntry<T>>;
  private config: CacheConfig;
  private cleanupTimer: ReturnType<typeof setInterval> | null;

  constructor(config?: Partial<CacheConfig>) {
    this.cache = new Map();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cleanupTimer = null;

    // 启动自动清理
    this.startCleanup();
  }

  /**
   * 获取缓存
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * 设置缓存
   */
  set(key: string, value: T, ttl?: number): void {
    // 检查是否超过最大大小
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL
    });
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 按模式清除缓存
   */
  clearPattern(pattern: string): number {
    let count = 0;

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 获取缓存统计
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: { key: string; age: number; ttl: number }[];
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: Date.now() - entry.timestamp,
      ttl: entry.ttl
    }));

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: 0, // TODO: 实现命中率统计
      entries
    };
  }

  /**
   * 检查缓存是否存在
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 获取或设置（如果不存在则计算）
   */
  async getOrSet(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * 清理过期缓存
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[Cache] 清理了 ${cleaned} 条过期缓存`);
    }
  }

  /**
   * 启动自动清理
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(
      () => this.cleanup(),
      this.config.cleanupInterval
    );
  }

  /**
   * 停止自动清理
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * 淘汰最老的缓存（LRU策略）
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

// Prompt专用缓存（带更细粒度的TTL控制）
export class PromptCache extends CacheManager<string> {
  // 不同模板类型的默认TTL
  private templateTTLs: Record<string, number> = {
    'world:daily_news': 24 * 60 * 60 * 1000, // 24小时
    'event:faction_invite': 60 * 60 * 1000, // 1小时
    'npc:dialogue_response': 30 * 60 * 1000, // 30分钟
    'narrative:decision_feedback': 0 // 不缓存
  };

  constructor() {
    super({ defaultTTL: 5 * 60 * 1000 });
  }

  /**
   * 根据模板类型设置缓存
   */
  setByTemplate(templateId: string, key: string, value: string): void {
    const ttl = this.templateTTLs[templateId] || this.config.defaultTTL;

    if (ttl === 0) {
      // 不缓存
      return;
    }

    this.set(key, value, ttl);
  }

  /**
   * 世界事件触发时清除相关缓存
   */
  invalidateOnWorldEvent(eventType: string): void {
    const patternsToClear: Record<string, string[]> = {
      'era_changed': ['world:*', 'nation:*'],
      'war_declared': ['nation:*', 'city:*'],
      'city_event': ['city:*', 'npc:*']
    };

    const patterns = patternsToClear[eventType] || [];
    for (const pattern of patterns) {
      this.clearPattern(pattern);
    }
  }
}

// 创建默认缓存实例
export const promptCache = new PromptCache();
export const generalCache = new CacheManager();