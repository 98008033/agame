/**
 * Backend Vitest Configuration
 * Jest-like testing with Supertest for API testing
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 测试环境
    environment: 'node',

    // 全局设置
    globals: true,

    // 测试文件匹配
    include: ['src/**/*.{test,spec}.{ts,mts,cts}'],

    // 排除文件
    exclude: ['node_modules', 'dist'],

    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/**/*.d.ts',
        'src/types/**',
        'src/**/index.ts',
      ],
    },

    // 设置文件
    setupFiles: ['./src/test/setup.ts'],

    // 测试超时
    testTimeout: 10000,

    // 钩子超时
    hookTimeout: 10000,
  },
});