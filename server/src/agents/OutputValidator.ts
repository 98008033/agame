/**
 * Agent输出验证器 - 带重试和降级
 */

import { llmService } from '../services/llm/index.js';

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ field?: string; message: string }>;
}

export class OutputValidator {
  private readonly maxRetries = 2;

  /**
   * 验证世界级Agent输出，支持重试
   */
  async validateWorldOutputWithRetry(
    output: unknown,
    originalPrompt: { messages: Array<{ role: string; content: string }> }
  ): Promise<{ output: unknown; usedFallback: boolean }> {
    return this.validateWithRetry(
      output,
      originalPrompt,
      this.validateWorldOutput.bind(this),
      this.getFallbackWorldOutput.bind(this)
    );
  }

  /**
   * 验证国家级Agent输出，支持重试
   */
  async validateNationOutputWithRetry(
    output: unknown,
    originalPrompt: { messages: Array<{ role: string; content: string }> }
  ): Promise<{ output: unknown; usedFallback: boolean }> {
    return this.validateWithRetry(
      output,
      originalPrompt,
      this.validateNationOutput.bind(this),
      this.getFallbackNationOutput.bind(this)
    );
  }

  /**
   * 验证城邦级Agent输出，支持重试
   */
  async validateCityOutputWithRetry(
    output: unknown,
    originalPrompt: { messages: Array<{ role: string; content: string }> }
  ): Promise<{ output: unknown; usedFallback: boolean }> {
    return this.validateWithRetry(
      output,
      originalPrompt,
      this.validateCityOutput.bind(this),
      this.getFallbackCityOutput.bind(this)
    );
  }

  /**
   * Generic retry mechanism: validate, retry with stricter prompt, fallback
   */
  private async validateWithRetry(
    output: unknown,
    originalPrompt: { messages: Array<{ role: string; content: string }> },
    validator: (output: unknown) => ValidationResult,
    fallback: () => unknown
  ): Promise<{ output: unknown; usedFallback: boolean }> {
    const result = validator(output);
    if (result.valid) {
      return { output, usedFallback: false };
    }

    console.log(`[OutputValidator] Validation failed (${result.errors.length} errors), retrying with stricter prompt...`);

    // Retry with stricter prompt
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      const stricterMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        ...originalPrompt.messages as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
        {
          role: 'assistant' as const,
          content: JSON.stringify(output),
        },
        {
          role: 'user' as const,
          content: `Your previous response was invalid. Errors: ${result.errors.map(e => e.message).join(', ')}. Please return a strictly valid JSON response that follows the original format. Output ONLY valid JSON, no explanations.`,
        },
      ];

      try {
        const retryResponse = await llmService.generate({
          messages: stricterMessages,
          temperature: Math.max(0.1, 0.7 - attempt * 0.3), // Lower temperature on retry
        });

        const jsonMatch = retryResponse.content.match(/\{[\s\S]*\}/);
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(retryResponse.content);

        const retryResult = validator(parsed);
        if (retryResult.valid) {
          console.log(`[OutputValidator] Retry attempt ${attempt} succeeded`);
          return { output: parsed, usedFallback: false };
        }
        console.log(`[OutputValidator] Retry ${attempt} still failed: ${retryResult.errors.map(e => e.message).join(', ')}`);
      } catch (err) {
        console.error(`[OutputValidator] Retry ${attempt} failed:`, err);
      }
    }

    // All retries exhausted, use fallback
    console.log('[OutputValidator] All retries failed, using template fallback');
    return { output: fallback(), usedFallback: true };
  }

  // ============================================
  // Synchronous validators (for use without retry)
  // ============================================

  /**
   * 验证世界级Agent输出
   */
  validateWorldOutput(output: unknown): ValidationResult {
    const errors: Array<{ field?: string; message: string }> = [];

    if (!output || typeof output !== 'object') {
      return { valid: false, errors: [{ message: '输出必须为对象' }] };
    }

    const obj = output as Record<string, unknown>;

    // Validate balanceAnalysis
    if (!obj.balanceAnalysis || typeof obj.balanceAnalysis !== 'object') {
      errors.push({ field: 'balanceAnalysis', message: '缺少balanceAnalysis' });
    } else {
      const balance = obj.balanceAnalysis as Record<string, unknown>;
      if (!['balanced', 'biased_canglong', 'biased_shuanglang', 'biased_jinque', 'biased_border'].includes(balance.currentState as string)) {
        errors.push({ field: 'balanceAnalysis.currentState', message: 'currentState值无效' });
      }
      if (!['low', 'medium', 'high', 'critical'].includes(balance.riskLevel as string)) {
        errors.push({ field: 'balanceAnalysis.riskLevel', message: 'riskLevel值无效' });
      }
    }

    // Validate events array
    if (!Array.isArray(obj.events)) {
      errors.push({ field: 'events', message: 'events必须为数组' });
    }

    // Validate historyProgression
    if (!obj.historyProgression || typeof obj.historyProgression !== 'object') {
      errors.push({ field: 'historyProgression', message: '缺少historyProgression' });
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * 验证国家级Agent输出
   */
  validateNationOutput(output: unknown): ValidationResult {
    const errors: Array<{ field?: string; message: string }> = [];

    if (!output || typeof output !== 'object') {
      return { valid: false, errors: [{ message: '输出必须为对象' }] };
    }

    const obj = output as Record<string, unknown>;

    if (!Array.isArray(obj.policies)) {
      errors.push({ field: 'policies', message: 'policies必须为数组' });
    }

    if (!Array.isArray(obj.diplomaticDecisions)) {
      errors.push({ field: 'diplomaticDecisions', message: 'diplomaticDecisions必须为数组' });
    }

    if (!obj.factionStatus || typeof obj.factionStatus !== 'object') {
      errors.push({ field: 'factionStatus', message: '缺少factionStatus' });
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * 验证城邦级Agent输出
   */
  validateCityOutput(output: unknown): ValidationResult {
    const errors: Array<{ field?: string; message: string }> = [];

    if (!output || typeof output !== 'object') {
      return { valid: false, errors: [{ message: '输出必须为对象' }] };
    }

    const obj = output as Record<string, unknown>;

    if (!Array.isArray(obj.governance)) {
      errors.push({ field: 'governance', message: 'governance必须为数组' });
    }

    if (!obj.resourceAllocation || typeof obj.resourceAllocation !== 'object') {
      errors.push({ field: 'resourceAllocation', message: '缺少resourceAllocation' });
    }

    if (!Array.isArray(obj.localEvents)) {
      errors.push({ field: 'localEvents', message: 'localEvents必须为数组' });
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * 验证NPC Agent输出
   */
  validateNPCOutput(output: unknown): ValidationResult {
    const errors: Array<{ field?: string; message: string }> = [];

    if (!output || typeof output !== 'object') {
      return { valid: false, errors: [{ message: '输出必须为对象' }] };
    }

    const obj = output as Record<string, unknown>;

    if (!obj.behavior || typeof obj.behavior !== 'object') {
      errors.push({ field: 'behavior', message: '缺少behavior' });
    } else {
      const behavior = obj.behavior as Record<string, unknown>;
      if (!behavior.action) {
        errors.push({ field: 'behavior.action', message: '缺少action' });
      }
      if (!behavior.location) {
        errors.push({ field: 'behavior.location', message: '缺少location' });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // ============================================
  // Fallback templates
  // ============================================

  private getFallbackWorldOutput(): unknown {
    return {
      balanceAnalysis: {
        currentState: 'balanced' as const,
        riskLevel: 'low' as const,
        recommendedAction: '维持当前政策，继续观察',
      },
      events: [{
        id: `world_event_fallback_${Date.now()}`,
        type: 'daily_life',
        title: '平静的一天',
        description: '世界各处一切平静，没有重大事件发生。',
        scope: 'national',
        importance: 'minor' as const,
        relatedFactions: ['canglong', 'shuanglang', 'jinque', 'border'],
      }],
      historyProgression: {
        stageCompleted: false,
        progress: 0,
      },
    };
  }

  private getFallbackNationOutput(): unknown {
    return {
      policies: [{
        type: 'cultural' as const,
        description: '维持日常治理，鼓励民生发展',
        priority: 'medium' as const,
      }],
      diplomaticDecisions: [{
        targetFaction: 'border',
        action: 'neutrality' as const,
        reason: '保持现状，不主动出击',
      }],
      factionStatus: {
        militaryStrength: 50,
        economicHealth: 50,
        politicalStability: 50,
        publicMorale: 50,
      },
    };
  }

  private getFallbackCityOutput(): unknown {
    return {
      governance: [{
        type: 'welfare' as const,
        action: '维持城市基本运转',
      }],
      resourceAllocation: {
        food: 50,
        material: 30,
        manpower: 20,
      },
      localEvents: [{
        type: 'festival' as const,
        title: '市民集会',
        description: '城内举行了常规的市民集会，气氛平和。',
      }],
    };
  }
}

export const outputValidator = new OutputValidator();
