/**
 * LLM统一服务
 * 支持多供应商切换和降级策略
 */

import {
  ModelProvider,
  LLMRequest,
  LLMResponse,
  ChatMessage,
  MODEL_CONFIGS
} from './types.js';

// 供应商优先级
const PROVIDER_PRIORITY: ModelProvider[] = ['zhipu', 'qwen', 'ernie'];

export class LLMService {
  private cache: Map<string, { content: string; timestamp: number }>;
  private readonly cacheTTL = 5 * 60 * 1000; // 5分钟

  constructor() {
    this.cache = new Map();
  }

  /**
   * 调用LLM生成内容
   * 自动选择可用的供应商
   */
  async generate(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();

    // 检查缓存
    const cacheKey = this.getCacheKey(request.messages);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return {
        content: cached.content,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        provider: 'zhipu',
        latency: 0
      };
    }

    // 按优先级尝试各供应商
    for (const provider of PROVIDER_PRIORITY) {
      const config = MODEL_CONFIGS[provider];
      if (!config.apiKey) continue;

      try {
        const content = await this.callProvider(provider, request);

        // 缓存结果
        this.cache.set(cacheKey, { content, timestamp: Date.now() });

        return {
          content,
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          provider,
          latency: Date.now() - startTime
        };
      } catch (error) {
        console.error(`[LLM] ${provider}调用失败:`, error);
        continue; // 尝试下一个供应商
      }
    }

    throw new Error('所有LLM供应商不可用');
  }

  /**
   * 调用智谱GLM
   */
  private async callZhipu(request: LLMRequest): Promise<string> {
    const config = MODEL_CONFIGS.zhipu;
    const response = await fetch(`${config.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: request.model || config.defaultModel,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 4096
      })
    });

    if (!response.ok) {
      throw new Error(`智谱API错误: ${response.status}`);
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * 调用通义千问
   */
  private async callQwen(request: LLMRequest): Promise<string> {
    const config = MODEL_CONFIGS.qwen;
    const response = await fetch(`${config.baseURL}/services/aigc/text-generation/generation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: request.model || config.defaultModel,
        input: { messages: request.messages },
        parameters: {
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 4096,
          result_format: 'message'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`通义千问API错误: ${response.status}`);
    }

    const data = await response.json() as { output?: { choices?: Array<{ message?: { content?: string } }>; text?: string } };
    return data.output?.choices?.[0]?.message?.content || data.output?.text || '';
  }

  /**
   * 调用具体供应商
   */
  private async callProvider(provider: ModelProvider, request: LLMRequest): Promise<string> {
    switch (provider) {
      case 'zhipu':
        return this.callZhipu(request);
      case 'qwen':
        return this.callQwen(request);
      case 'ernie':
        // ERNIE需要单独处理，暂时跳过
        throw new Error('ERNIE尚未实现');
      default:
        throw new Error(`未知供应商: ${provider}`);
    }
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(messages: ChatMessage[]): string {
    return messages.map(m => m.content.slice(0, 50)).join('|');
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// 创建默认实例
export const llmService = new LLMService();