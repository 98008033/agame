/**
 * LLM服务类型定义
 * 支持多供应商切换和降级策略
 */

export type ModelProvider = 'zhipu' | 'qwen' | 'ernie';

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
}

export interface ChatResponse {
  id: string;
  model: string;
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latency: number; // 请求耗时(ms)
  provider: ModelProvider;
}

export interface LLMError {
  code: string;
  message: string;
  provider: ModelProvider;
  retryable: boolean;
  details?: Record<string, unknown>;
}

// 模型层级配置
export type ModelTier = 'tier1' | 'tier2' | 'tier3';

export interface TierConfig {
  tier: ModelTier;
  primary: ModelConfig;
  fallback?: ModelConfig;
  useCases: string[];
}

// 默认模型配置
export const DEFAULT_MODEL_CONFIGS: Record<ModelTier, TierConfig> = {
  tier1: {
    tier: 'tier1',
    primary: {
      provider: 'zhipu',
      model: 'glm-4',
      temperature: 0.3,
      maxTokens: 8192
    },
    fallback: {
      provider: 'qwen',
      model: 'qwen-plus',
      temperature: 0.3,
      maxTokens: 4096
    },
    useCases: ['晨报生成', '历史推进', '重大事件生成', '关键NPC对话']
  },
  tier2: {
    tier: 'tier2',
    primary: {
      provider: 'qwen',
      model: 'qwen-plus',
      temperature: 0.5,
      maxTokens: 4096
    },
    fallback: {
      provider: 'zhipu',
      model: 'glm-3-turbo',
      temperature: 0.5,
      maxTokens: 2048
    },
    useCases: ['普通事件生成', '普通NPC对话', '叙事反馈', '决策后果']
  },
  tier3: {
    tier: 'tier3',
    primary: {
      provider: 'qwen',
      model: 'qwen-turbo',
      temperature: 0.7,
      maxTokens: 1024
    },
    useCases: ['简单响应', '标准回复', '模板填充']
  }
};

// 供应商API配置
export interface ProviderConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
}

export interface LLMClientConfig {
  providers: {
    zhipu?: ProviderConfig;
    qwen?: ProviderConfig;
    ernie?: ProviderConfig;
  };
  defaults: {
    timeout: number;
    retries: number;
    retryDelay: number;
  };
}