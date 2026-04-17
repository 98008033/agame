/**
 * 阿里通义千问适配器
 * 支持Qwen-Max、Qwen-Plus、Qwen-Turbo等模型
 */

import { ModelProvider, ChatRequest, ChatResponse } from './types';

export class QwenAdapter {
  private apiKey: string;
  private baseURL: string;
  private provider: ModelProvider = 'qwen';

  constructor(apiKey: string, baseURL?: string) {
    this.apiKey = apiKey;
    this.baseURL = baseURL || 'https://dashscope.aliyuncs.com/api/v1';
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const url = `${this.baseURL}/services/aigc/text-generation/generation`;

    const body = {
      model: this.mapModel(request.model),
      input: {
        messages: request.messages
      },
      parameters: {
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 2048,
        top_p: request.topP ?? 0.9,
        result_format: 'message'
      }
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
      throw new Error(`通义千问API错误: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // 通义千问的响应格式略有不同
    const output = data.output;
    const usage = data.usage;

    return {
      id: data.request_id || `qwen_${Date.now()}`,
      model: request.model,
      content: output?.choices?.[0]?.message?.content || output?.text || '',
      usage: {
        promptTokens: usage?.input_tokens || 0,
        completionTokens: usage?.output_tokens || 0,
        totalTokens: usage?.total_tokens || (usage?.input_tokens + usage?.output_tokens) || 0
      },
      latency: 0, // 由LLMClient设置
      provider: this.provider
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      // 简单的健康检查请求
      const testRequest: ChatRequest = {
        model: 'qwen-turbo',
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
      'qwen-max': 'qwen-max',
      'qwen-plus': 'qwen-plus',
      'qwen-turbo': 'qwen-turbo',
      'qwen-long': 'qwen-long'
    };

    return modelMap[model] || model;
  }
}