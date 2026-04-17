/**
 * Agame Backend 主入口
 */

import { createLLMClient } from './services/llm';
import { promptBuilder } from './services/prompt';
import { chronosAgent, agentScheduler } from './agents';
import { outputValidator } from './utils';
import config, { validateConfig, getLLMClientConfig } from './config';

// 导出所有模块
export {
  createLLMClient,
  promptBuilder,
  chronosAgent,
  agentScheduler,
  outputValidator,
  config,
  validateConfig,
  getLLMClientConfig
};

// 导出类型
export * from './types';

/**
 * 初始化服务
 */
export async function initializeServices(): Promise<{
  success: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  // 验证配置
  const configValidation = validateConfig();
  if (!configValidation.valid) {
    errors.push(`缺少配置: ${configValidation.missing.join(', ')}`);
  }

  // 检查LLM健康状态
  try {
    const llmClient = createLLMClient(getLLMClientConfig());
    const healthStatus = await llmClient.healthCheck();

    const availableProviders = Object.entries(healthStatus)
      .filter(([, status]) => status)
      .map(([provider]) => provider);

    if (availableProviders.length === 0) {
      errors.push('所有LLM供应商不可用');
    } else {
      console.log(`[Init] 可用LLM供应商: ${availableProviders.join(', ')}`);
    }
  } catch (error) {
    errors.push(`LLM初始化失败: ${error}`);
  }

  return {
    success: errors.length === 0,
    errors
  };
}

/**
 * 启动Agent调度器
 */
export function startAgentScheduler(): void {
  agentScheduler.start();
  console.log('[Main] Agent调度器已启动');
}

/**
 * 停止Agent调度器
 */
export function stopAgentScheduler(): void {
  agentScheduler.stop();
  console.log('[Main] Agent调度器已停止');
}

// 默认导出
export default {
  initializeServices,
  startAgentScheduler,
  stopAgentScheduler
};