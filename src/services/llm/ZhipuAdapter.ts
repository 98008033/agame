/**
 * 智谱AI GLM适配器
 * 支持GLM-4、GLM-3-Turbo等模型
 */

import { ModelProvider, ChatRequest, ChatResponse } from './types';

export class ZhipuAdapter {
  private apiKey: string;
  private baseURL: string;
  private provider: ModelProvider = 'zhipu';

  constructor(apiKey: string, baseURL?: string) {
    this.apiKey = apiKey;
    this.baseURL = baseURL || 'https://open.bigmodel.cn/api/paas/v4';
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const url = `${this.baseURL}/chat/completions`;

    const body = {
      model: this.mapModel(request.model),
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 2048,
      top_p: request.topP ?? 0.9,
      stream: request.stream ?? false
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`智谱API错误: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return {
      id: data.id || `zhipu_${Date.now()}`,
      model: request.model,
      content: data.choices?.[0]?.message?.content || '',
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      },
      latency: 0, // 由LLMClient设置
      provider: this.provider
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      // 简单的健康检查请求
      const testRequest: ChatRequest = {
        model: 'glm-3-turbo',
        messages: [{ role: 'user', content: '你好' }],
        maxTokens: 10
      };

      await this.chat(testRequest);
      return true;
    } catch {
      return false;
    }
  }

  getProvider(): ModelProvider {
    return this.provider;
  }

  private mapModel(model: string): string {
    // 模型名称映射
    const modelMap: Record<string, string> = {
      'glm-4': 'glm-4',
      'glm-4-plus': 'glm-4-plus',
      'glm-4v': 'glm-4v',
      'glm-3-turbo': 'glm-3-turbo'
    };

    return modelMap[model] || model;
  }
}