/**
 * LLM服务类型定义
 */

export type ModelProvider = 'zhipu' | 'qwen' | 'ernie';

export interface LLMConfig {
  provider: ModelProvider;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  provider: ModelProvider;
  latency: number;
}

// 模型配置
export const MODEL_CONFIGS: Record<ModelProvider, { apiKey: string; baseURL: string; defaultModel: string }> = {
  zhipu: {
    apiKey: process.env.ZHIPU_API_KEY || '',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4'
  },
  qwen: {
    apiKey: process.env.QWEN_API_KEY || '',
    baseURL: 'https://dashscope.aliyuncs.com/api/v1',
    defaultModel: 'qwen-plus'
  },
  ernie: {
    apiKey: process.env.ERNIE_API_KEY || '',
    baseURL: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop',
    defaultModel: 'ernie-4.0'
  }
};