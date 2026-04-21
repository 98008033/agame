/**
 * LLM服务类型定义
 */

export type ModelProvider = 'zhipu' | 'qwen' | 'ernie' | 'local';

/**
 * Agent层级 - 对应不同Agent级别使用不同的LLM provider以控制成本
 * - L1: 世界级 (Chronos Agent) - 高质量模型
 * - L2: 国家层 (Nation Agent) - 中等质量模型
 * - L3: 城邦层 (City Agent) - 低成本模型
 * - L4: NPC层 - 最便宜/免费模型
 */
export type AgentTier = 'l1_world' | 'l2_nation' | 'l3_city' | 'l4_npc';

export interface LLMConfig {
  provider: ModelProvider;
  model: string;
  temperature: number;
  maxTokens: number;
}

/**
 * 每层Agent的LLM配置（从环境变量读取）
 */
export interface AgentTierConfig {
  provider: ModelProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * 从环境变量解析Agent层级配置
 */
function getTierConfig(tier: AgentTier): AgentTierConfig {
  const envKey = tier.toUpperCase().replace('_', '_');
  const providerEnv = process.env[`AGENT_TIER_${envKey}_PROVIDER`] || '';
  const modelEnv = process.env[`AGENT_TIER_${envKey}_MODEL`] || '';

  // Validate provider is valid ModelProvider
  const validProviders: ModelProvider[] = ['zhipu', 'qwen', 'ernie', 'local'];
  const provider: ModelProvider = validProviders.includes(providerEnv as ModelProvider)
    ? (providerEnv as ModelProvider)
    : 'local'; // default to local for cost saving

  return {
    provider,
    model: modelEnv || undefined,
  };
}

/**
 * 各层级默认provider映射（未配置环境变量时的默认值）
 */
export const DEFAULT_TIER_CONFIGS: Record<AgentTier, AgentTierConfig> = {
  l1_world: { provider: 'zhipu', temperature: 0.3, maxTokens: 8192 },
  l2_nation: { provider: 'qwen', temperature: 0.5, maxTokens: 4096 },
  l3_city: { provider: 'local', temperature: 0.7, maxTokens: 2048 },
  l4_npc: { provider: 'local', temperature: 0.9, maxTokens: 1024 },
};

/**
 * 当前Agent层级配置（环境变量优先，否则使用默认值）
 */
export const AGENT_TIER_CONFIGS: Record<AgentTier, AgentTierConfig> = {
  l1_world: { ...DEFAULT_TIER_CONFIGS.l1_world, ...getTierConfig('l1_world') },
  l2_nation: { ...DEFAULT_TIER_CONFIGS.l2_nation, ...getTierConfig('l2_nation') },
  l3_city: { ...DEFAULT_TIER_CONFIGS.l3_city, ...getTierConfig('l3_city') },
  l4_npc: { ...DEFAULT_TIER_CONFIGS.l4_npc, ...getTierConfig('l4_npc') },
};

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** Agent层级，自动选择对应provider */
  agentTier?: AgentTier;
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
  },
  local: {
    apiKey: process.env.LOCAL_API_KEY || '',
    baseURL: process.env.LOCAL_BASE_URL || 'http://localhost:11434/v1',
    defaultModel: process.env.LOCAL_MODEL || 'llama3'
  }
};