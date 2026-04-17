/**
 * OutputValidator 测试
 */

import { outputValidator } from '../src/utils/OutputValidator';

describe('OutputValidator', () => {
  describe('validateDailyNews', () => {
    test('应该验证正确的晨报输出', () => {
      const validOutput = {
        day: 1,
        date: '第一年 春季',
        news: {
          canglong: {
            headline: {
              id: 'news_cl_1_01',
              title: '测试新闻',
              content: '这是测试新闻内容，包含足够的字数用于验证。',
              type: 'military',
              importance: 'major'
            },
            summary: '测试总结'
          },
          shuanglang: {
            headline: {
              id: 'news_sl_1_01',
              title: '霜狼新闻',
              content: '霜狼联邦的测试新闻内容。',
              type: 'social',
              importance: 'minor'
            },
            summary: '霜狼总结'
          },
          jinque: {
            headline: {
              id: 'news_jq_1_01',
              title: '金雀花新闻',
              content: '金雀花王国的测试新闻内容。',
              type: 'economic',
              importance: 'normal'
            },
            summary: '金雀花总结'
          },
          border: {
            headline: {
              id: 'news_bd_1_01',
              title: '边境新闻',
              content: '边境联盟的测试新闻内容。',
              type: 'social',
              importance: 'minor'
            },
            summary: '边境总结'
          }
        }
      };

      const result = outputValidator.validateDailyNews(validOutput);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('应该检测缺失的必需字段', () => {
      const invalidOutput = {
        day: 1,
        // 缺少 date 和 news
      };

      const result = outputValidator.validateDailyNews(invalidOutput);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateNarrativeStyle', () => {
    test('应该检测现代词汇', () => {
      const output = {
        news: {
          canglong: {
            headline: {
              content: '玩家使用手机联系了皇帝'
            }
          }
        }
      };

      const result = outputValidator.validateNarrativeStyle(output);
      expect(result.errors.some(e => e.message.includes('现代词汇'))).toBe(true);
    });

    test('应该检测抽象陈述', () => {
      const output = {
        news: {
          canglong: {
            headline: {
              content: '情况如下：帝国军队开始行动'
            }
          }
        }
      };

      const result = outputValidator.validateNarrativeStyle(output);
      expect(result.errors.some(e => e.message.includes('抽象陈述'))).toBe(true);
    });
  });

  describe('autoCorrectRanges', () => {
    test('应该自动修正超出范围的数值', () => {
      const output = {
        day: -1
      };

      const ranges = {
        day: { min: 1, max: 1000 }
      };

      const corrected = outputValidator.autoCorrectRanges(output, ranges) as { day: number };
      expect(corrected.day).toBe(1);
    });
  });
});