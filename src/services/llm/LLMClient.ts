/**
 * LLM统一客户端
 * 支持多供应商切换、降级策略、批量调用
 */

import {
  ModelProvider,
  ChatRequest,
  ChatResponse,
  LLMError,
  LLMClientConfig,
  DEFAULT_MODEL_CONFIGS,
  ModelTier
} from './types';
import { ZhipuAdapter } from './ZhipuAdapter';
import { QwenAdapter } from './QwenAdapter';

// 供应商适配器接口
interface ProviderAdapter {
  chat(request: ChatRequest): Promise<ChatResponse>;
  healthCheck(): Promise<boolean>;
  getProvider(): ModelProvider;
}

export class LLMClient {
  private adapters: Map<ModelProvider, ProviderAdapter>;
  private config: LLMClientConfig;
  private cache: Map<string, { result: ChatResponse; timestamp: number }>;
  private readonly cacheTTL = 5 * 60 * 1000; // 5分钟缓存

  constructor(config: LLMClientConfig) {
    this.config = config;
    this.adapters = new Map();
    this.cache = new Map();

    // 初始化适配器
    this.initAdapters();
  }

  private initAdapters(): void {
    // 初始化智谱适配器
    if (this.config.providers.zhipu?.apiKey) {
      this.adapters.set('zhipu', new ZhipuAdapter(
        this.config.providers.zhipu.apiKey,
        this.config.providers.zhipu.baseURL
      ));
    }

    // 初始化通义千问适配器
    if (this.config.providers.qwen?.apiKey) {
      this.adapters.set('qwen', new QwenAdapter(
        this.config.providers.qwen.apiKey,
        this.config.providers.qwen.baseURL
      ));
    }

    // ERNIE适配器可后续添加
  }

  /**
   * 单次聊天请求
   * 自动选择供应商和降级
   */
  async chat(
    request: ChatRequest,
    tier: ModelTier = 'tier1'
  ): Promise<ChatResponse> {
    const tierConfig = DEFAULT_MODEL_CONFIGS[tier];
    const providers = [tierConfig.primary, tierConfig.fallback];

    for (const modelConfig of providers) {
      if (!modelConfig) continue;

      const adapter = this.adapters.get(modelConfig.provider);
      if (!adapter) {
        console.warn(`适配器未初始化: ${modelConfig.provider}`);
        continue;
      }

      try {
        // 检查缓存
        const cacheKey = this.getCacheKey(request, modelConfig.provider);
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
          return cached.result;
        }

        // 调用LLM
        const startTime = Date.now();
        const response = await adapter.chat({
          ...request,
          temperature: modelConfig.temperature,
          maxTokens: modelConfig.maxTokens
        });
        response.latency = Date.now() - startTime;

        // 缓存结果
        this.cache.set(cacheKey, { result: response, timestamp: Date.now() });

        return response;
      } catch (error) {
        const llmError = this.handleError(error, modelConfig.provider);
        console.error(`LLM调用失败 [${modelConfig.provider}]:`, llmError.message);

        // 如果可重试且不是最后一个供应商，继续尝试下一个
        if (llmError.retryable && modelConfig !== providers[providers.length - 1]) {
          continue;
        }

        // 不可重试或所有供应商都失败，抛出错误
        throw llmError;
      }
    }

    // 所有供应商都不可用
    throw {
      code: 'ALL_PROVIDERS_FAILED',
      message: '所有LLM供应商都不可用',
      provider: 'unknown',
      retryable: false
    } as LLMError;
  }

  /**
   * 带重试的聊天请求
   */
  async chatWithRetry(
    request: ChatRequest,
    tier: ModelTier = 'tier1',
    maxRetries: number = this.config.defaults.retries
  ): Promise<ChatResponse> {
    let lastError: LLMError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.chat(request, tier);
      } catch (error) {
        lastError = error as LLMError;
        if (!lastError.retryable) {
          throw lastError;
        }
        if (attempt < maxRetries) {
          const delay = this.config.defaults.retryDelay * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * 批量聊天请求
   * 优化Token消耗，支持并行调用
   */
  async chatBatch(
    requests: ChatRequest[],
    tier: ModelTier = 'tier1'
  ): Promise<ChatResponse[]> {
    // 并行处理（最多3个并发）
    const concurrencyLimit = 3;
    const results: ChatResponse[] = [];

    for (let i = 0; i < requests.length; i += concurrencyLimit) {
      const batch = requests.slice(i, i + concurrencyLimit);
      const batchResults = await Promise.all(
        batch.map(req => this.chatWithRetry(req, tier))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 健康检查
   */
  async healthCheck(provider?: ModelProvider): Promise<Record<ModelProvider, boolean>> {
    const results: Record<ModelProvider, boolean> = {} as Record<ModelProvider, boolean>;

    for (const [name, adapter] of this.adapters) {
      if (provider && name !== provider) continue;
      try {
        results[name] = await adapter.healthCheck();
      } catch {
        results[name] = false;
      }
    }

    return results;
  }

  /**
   * 清除缓存
   */
  clearCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  private getCacheKey(request: ChatRequest, provider: ModelProvider): string {
    // 基于消息内容和模型生成缓存键
    const contentHash = request.messages
      .map(m => m.content)
      .join('|')
      .slice(0, 100);
    return `${provider}:${request.model}:${contentHash}`;
  }

  private handleError(error: unknown, provider: ModelProvider): LLMError {
    if (error instanceof Error) {
      // 判断是否可重试
      const retryableCodes = ['TIMEOUT', 'RATE_LIMIT', 'SERVICE_UNAVAILABLE', 'NETWORK_ERROR'];
      const isRetryable = retryableCodes.some(code =>
        error.message.includes(code) || error.message.includes('retry')
      );

      return {
        code: 'API_ERROR',
        message: error.message,
        provider,
        retryable: isRetryable,
        details: { stack: error.stack }
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: '未知错误',
      provider,
      retryable: false,
      details: { error }
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 创建默认客户端实例
export function createLLMClient(config?: Partial<LLMClientConfig>): LLMClient {
  const defaultConfig: LLMClientConfig = {
    providers: {
      zhipu: {
        apiKey: process.env.ZHIPU_API_KEY || '',
        baseURL: 'https://open.bigmodel.cn/api/paas/v4'
      },
      qwen: {
        apiKey: process.env.QWEN_API_KEY || '',
        baseURL: 'https://dashscope.aliyuncs.com/api/v1'
      }
    },
    defaults: {
      timeout: 30000,
      retries: 2,
      retryDelay: 1000
    }
  };

  return new LLMClient({ ...defaultConfig, ...config });
}