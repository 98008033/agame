/**
 * LLM统一服务
 * 支持多供应商切换、降级策略和分层Agent调用
 */

import {
  ModelProvider,
  LLMRequest,
  LLMResponse,
  ChatMessage,
  MODEL_CONFIGS,
  AGENT_TIER_CONFIGS,
  type AgentTier,
} from './types.js';

export class LLMService {
  private cache: Map<string, { content: string; timestamp: number }>;
  private readonly cacheTTL = 5 * 60 * 1000; // 5分钟

  constructor() {
    this.cache = new Map();
  }

  /**
   * 调用LLM生成内容
   * 支持按Agent层级自动选择provider，失败时自动降级
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
        provider: 'local',
        latency: 0
      };
    }

    // 确定provider列表：优先使用agentTier配置，否则遍历所有
    const providers = this.resolveProviders(request.agentTier);

    // 应用tier级别的temperature/maxTokens（请求级别覆盖）
    const effectiveRequest = this.applyTierDefaults(request);

    // 按优先级尝试各供应商
    for (const provider of providers) {
      const config = MODEL_CONFIGS[provider];
      if (!config.apiKey && provider !== 'local') continue;

      try {
        const result = await this.callProviderWithUsage(provider, effectiveRequest);

        // 缓存结果
        this.cache.set(cacheKey, { content: result.content, timestamp: Date.now() });

        return {
          content: result.content,
          usage: result.usage,
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
   * 根据Agent层级解析provider列表
   */
  private resolveProviders(tier?: AgentTier): ModelProvider[] {
    if (!tier) {
      // 未指定层级时，遍历所有可用provider
      return ['local', 'zhipu', 'qwen', 'ernie'];
    }

    const tierConfig = AGENT_TIER_CONFIGS[tier];
    if (!tierConfig) {
      // 配置不存在，退回默认
      return ['local', 'zhipu', 'qwen', 'ernie'];
    }

    // 以配置的provider为首选，其余作为fallback
    const primary = tierConfig.provider;
    const allProviders: ModelProvider[] = ['local', 'zhipu', 'qwen', 'ernie'];
    const fallbacks = allProviders.filter(p => p !== primary);
    return [primary, ...fallbacks];
  }

  /**
   * 应用层级默认参数（temperature、maxTokens等）
   */
  private applyTierDefaults(request: LLMRequest): LLMRequest {
    if (!request.agentTier) return request;

    const tierConfig = AGENT_TIER_CONFIGS[request.agentTier];
    if (!tierConfig) return request;

    return {
      ...request,
      temperature: request.temperature ?? tierConfig.temperature,
      maxTokens: request.maxTokens ?? tierConfig.maxTokens,
      model: request.model ?? tierConfig.model,
    };
  }

  /**
   * 调用智谱GLM
   */
  private async callZhipu(request: LLMRequest): Promise<{ content: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
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

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    return {
      content: data.choices?.[0]?.message?.content || '',
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
    };
  }

  /**
   * 调用通义千问
   */
  private async callQwen(request: LLMRequest): Promise<{ content: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
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

    const data = await response.json() as {
      output?: { choices?: Array<{ message?: { content?: string } }>; text?: string };
      usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
    };
    return {
      content: data.output?.choices?.[0]?.message?.content || data.output?.text || '',
      usage: {
        promptTokens: data.usage?.input_tokens ?? 0,
        completionTokens: data.usage?.output_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
    };
  }

  /**
   * 调用百度文心 (Ernie)
   */
  private async callErnie(request: LLMRequest): Promise<{ content: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
    const config = MODEL_CONFIGS.ernie;

    // Step 1: Get access token
    const tokenRes = await fetch(
      `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${config.apiKey}&client_secret=${process.env.ERNIE_SECRET_KEY ?? ''}`
    );
    if (!tokenRes.ok) throw new Error(`文心获取token失败: ${tokenRes.status}`);
    const tokenData = await tokenRes.json() as { access_token?: string };
    const accessToken = tokenData.access_token;
    if (!accessToken) throw new Error('文心API未返回access_token');

    // Step 2: Call the model
    const modelName = request.model || config.defaultModel;
    const response = await fetch(
      `${config.baseURL}/chat/${modelName}?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: request.messages,
          temperature: request.temperature ?? 0.7,
          max_output_tokens: request.maxTokens ?? 4096,
        })
      }
    );

    if (!response.ok) {
      throw new Error(`文心API错误: ${response.status}`);
    }

    const data = await response.json() as {
      result?: string;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    return {
      content: data.result || '',
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
    };
  }

  /**
   * 调用本地部署的LLM（OpenAI兼容格式）
   */
  private async callLocal(request: LLMRequest): Promise<{ content: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
    const config = MODEL_CONFIGS.local;
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
      throw new Error(`Local LLM错误: ${response.status}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    return {
      content: data.choices?.[0]?.message?.content || '',
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
    };
  }

  /**
   * 调用具体供应商（带usage）
   */
  private async callProviderWithUsage(provider: ModelProvider, request: LLMRequest): Promise<{ content: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
    switch (provider) {
      case 'local':
        return this.callLocal(request);
      case 'zhipu':
        return this.callZhipu(request);
      case 'qwen':
        return this.callQwen(request);
      case 'ernie':
        return this.callErnie(request);
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