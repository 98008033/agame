/**
 * 游戏配置
 * 包含LLM密钥管理、模型配置等
 */

import { LLMClientConfig } from '../services/llm/types';

// 环境变量加载
const config = {
  // LLM配置
  llm: {
    zhipu: {
      apiKey: process.env.ZHIPU_API_KEY || '',
      baseURL: 'https://open.bigmodel.cn/api/paas/v4'
    },
    qwen: {
      apiKey: process.env.QWEN_API_KEY || '',
      baseURL: 'https://dashscope.aliyuncs.com/api/v1'
    },
    ernie: {
      apiKey: process.env.ERNIE_API_KEY || '',
      secretKey: process.env.ERNIE_SECRET_KEY || ''
    }
  },

  // 调度配置
  scheduler: {
    chronos: {
      enabled: true,
      cron: '0 6 * * *', // 每日6点
      timezone: 'Asia/Shanghai'
    }
  },

  // 缓存配置
  cache: {
    maxSize: 1000,
    defaultTTL: 5 * 60 * 1000, // 5分钟
    cleanupInterval: 60 * 1000 // 1分钟
  },

  // 游戏配置
  game: {
    startDay: 1,
    startSeason: 'spring',
    startEra: 'era_power_struggle',
    dayDuration: 24 * 60 * 60 * 1000 // 1天 = 24小时（现实时间）
  }
};

// LLM客户端配置工厂
export function getLLMClientConfig(): LLMClientConfig {
  return {
    providers: {
      zhipu: config.llm.zhipu.apiKey ? {
        apiKey: config.llm.zhipu.apiKey,
        baseURL: config.llm.zhipu.baseURL
      } : undefined,
      qwen: config.llm.qwen.apiKey ? {
        apiKey: config.llm.qwen.apiKey,
        baseURL: config.llm.qwen.baseURL
      } : undefined
    },
    defaults: {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000
    }
  };
}

// 验证配置是否完整
export function validateConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!config.llm.zhipu.apiKey && !config.llm.qwen.apiKey) {
    missing.push('ZHIPU_API_KEY 或 QWEN_API_KEY');
  }

  return {
    valid: missing.length === 0,
    missing
  };
}

export default config;