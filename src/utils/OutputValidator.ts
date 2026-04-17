/**
 * 输出验证器
 * 验证LLM输出的JSON格式和内容
 */

import Ajv from 'ajv';

// JSON Schema定义
const DAILY_NEWS_SCHEMA = {
  type: 'object',
  required: ['day', 'date', 'news'],
  properties: {
    day: { type: 'integer', minimum: 1 },
    date: { type: 'string' },
    news: {
      type: 'object',
      required: ['canglong', 'shuanglang', 'jinque', 'border'],
      properties: {
        canglong: { $ref: '#/definitions/FactionNews' },
        shuanglang: { $ref: '#/definitions/FactionNews' },
        jinque: { $ref: '#/definitions/FactionNews' },
        border: { $ref: '#/definitions/FactionNews' }
      }
    },
    worldHeadline: { type: 'object' },
    playerNews: { type: 'array' }
  },
  definitions: {
    FactionNews: {
      type: 'object',
      required: ['headline', 'summary'],
      properties: {
        headline: { $ref: '#/definitions/NewsItem' },
        items: {
          type: 'array',
          items: { $ref: '#/definitions/NewsItem' }
        },
        summary: { type: 'string', minLength: 10, maxLength: 100 }
      }
    },
    NewsItem: {
      type: 'object',
      required: ['id', 'title', 'content', 'type', 'importance'],
      properties: {
        id: { type: 'string' },
        title: { type: 'string', minLength: 5, maxLength: 80 },
        content: { type: 'string', minLength: 100, maxLength: 500 },
        type: {
          type: 'string',
          enum: ['military', 'political', 'economic', 'social', 'diplomatic', 'crisis', 'rumor']
        },
        importance: {
          type: 'string',
          enum: ['minor', 'normal', 'major', 'critical']
        },
        relatedEntities: { type: 'array' },
        playerRelevance: { type: 'boolean' }
      }
    }
  }
};

const GAME_EVENT_SCHEMA = {
  type: 'object',
  required: ['event'],
  properties: {
    event: {
      type: 'object',
      required: ['id', 'type', 'category', 'title', 'description', 'choices'],
      properties: {
        id: { type: 'string', pattern: '^event_[a-z]+_[0-9]+$' },
        type: { type: 'string' },
        category: { type: 'string' },
        title: { type: 'string', minLength: 5, maxLength: 100 },
        description: { type: 'string', minLength: 50, maxLength: 500 },
        narrativeText: { type: 'string', minLength: 100, maxLength: 600 },
        scope: { type: 'string', enum: ['personal', 'local', 'regional', 'national'] },
        importance: { type: 'string', enum: ['minor', 'normal', 'major', 'critical'] },
        choices: {
          type: 'array',
          minItems: 2,
          maxItems: 4,
          items: {
            type: 'object',
            required: ['index', 'label', 'description', 'consequenceNarrative'],
            properties: {
              index: { type: 'integer', minimum: 0 },
              label: { type: 'string', minLength: 3, maxLength: 50 },
              description: { type: 'string', minLength: 10, maxLength: 200 },
              cost: { type: 'object' },
              reward: { type: 'object' },
              impact: { type: 'object' },
              consequenceNarrative: { type: 'string', minLength: 30, maxLength: 200 }
            }
          }
        },
        createdAt: { type: 'string' },
        expiresAt: { type: 'string' },
        relatedNPCs: { type: 'array' },
        relatedFactions: { type: 'array' }
      }
    }
  }
};

// 现代词汇检测列表
const MODERN_WORDS = [
  '手机', '电脑', '网络', '数据库', '算法', '系统', '平台', '用户',
  'app', 'API', '接口', '数据', '模型', '程序', '代码', '软件'
];

// 抽象陈述检测列表
const ABSTRACT_PHRASES = [
  '情况如下', '综上所述', '总而言之', '结果表明', '数据显示',
  '可以看出', '显而易见', '不言而喻'
];

export interface ValidationError {
  field?: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: ValidationError[];
}

export class OutputValidator {
  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({ allErrors: true, strict: false });
  }

  /**
   * 验证晨报输出
   */
  validateDailyNews(output: unknown): ValidationResult {
    return this.validateWithSchema(output, DAILY_NEWS_SCHEMA, 'dailyNews');
  }

  /**
   * 验证事件输出
   */
  validateGameEvent(output: unknown): ValidationResult {
    return this.validateWithSchema(output, GAME_EVENT_SCHEMA, 'gameEvent');
  }

  /**
   * 通用JSON Schema验证
   */
  validateWithSchema(output: unknown, schema: object, _schemaName: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // 1. 解析JSON（如果输入是字符串）
    let parsedOutput: unknown;
    if (typeof output === 'string') {
      try {
        // 尝试提取JSON部分
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedOutput = JSON.parse(jsonMatch[0]);
        } else {
          parsedOutput = JSON.parse(output);
        }
      } catch {
        return {
          valid: false,
          errors: [{ message: '无法解析JSON输出' }]
        };
      }
    } else {
      parsedOutput = output;
    }

    // 2. Schema验证
    const validate = this.ajv.compile(schema);
    const valid = validate(parsedOutput);

    if (!valid && validate.errors) {
      for (const error of validate.errors) {
        errors.push({
          field: error.instancePath,
          message: error.message || 'Schema验证失败',
          value: error.data
        });
      }
    }

    // 3. 内容风格验证
    const styleResult = this.validateNarrativeStyle(parsedOutput);
    if (styleResult.errors.length > 0) {
      warnings.push(...styleResult.errors);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 叙事风格验证
   */
  validateNarrativeStyle(output: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    // 提取所有文本内容
    const textContents = this.extractTextContents(output);

    for (const text of textContents) {
      // 检查现代词汇
      for (const word of MODERN_WORDS) {
        if (text.toLowerCase().includes(word.toLowerCase())) {
          errors.push({
            message: `包含现代词汇: "${word}"`,
            value: text.slice(0, 100)
          });
        }
      }

      // 检查抽象陈述
      for (const phrase of ABSTRACT_PHRASES) {
        if (text.includes(phrase)) {
          errors.push({
            message: `包含抽象陈述: "${phrase}"，建议使用具体描写`,
            value: text.slice(0, 100)
          });
        }
      }

      // 检查长度
      if (text.length < 100) {
        errors.push({
          message: `文本过短: ${text.length}字，建议100字以上`,
          value: text
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 自动修正超出范围的数值
   */
  autoCorrectRanges(output: unknown, ranges: Record<string, { min: number; max: number }>): unknown {
    if (typeof output !== 'object' || output === null) {
      return output;
    }

    const result = { ...output as object };

    for (const [field, range] of Object.entries(ranges)) {
      const value = this.getNestedValue(result, field);
      if (typeof value === 'number') {
        const corrected = Math.max(range.min, Math.min(range.max, value));
        this.setNestedValue(result, field, corrected);
      }
    }

    return result;
  }

  /**
   * 从输出中提取所有文本内容
   */
  private extractTextContents(output: unknown): string[] {
    const contents: string[] = [];

    if (typeof output === 'string') {
      contents.push(output);
      return contents;
    }

    if (typeof output === 'object' && output !== null) {
      for (const value of Object.values(output)) {
        contents.push(...this.extractTextContents(value));
      }
    }

    if (Array.isArray(output)) {
      for (const item of output) {
        contents.push(...this.extractTextContents(item));
      }
    }

    return contents;
  }

  /**
   * 获取嵌套属性值
   */
  private getNestedValue(obj: unknown, path: string): unknown {
    const parts = path.split('.');
    let value = obj;

    for (const part of parts) {
      if (typeof value !== 'object' || value === null) {
        return undefined;
      }
      value = (value as Record<string, unknown>)[part];
    }

    return value;
  }

  /**
   * 设置嵌套属性值
   */
  private setNestedValue(obj: unknown, path: string, value: unknown): void {
    const parts = path.split('.');
    let current = obj as Record<string, unknown>;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (typeof current[part] !== 'object' || current[part] === null) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }
}

// 创建默认实例
export const outputValidator = new OutputValidator();