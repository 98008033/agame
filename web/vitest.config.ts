/**
 * Vitest Configuration for Frontend Testing
 * @see https://vitest.dev/config/
 */

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // 测试环境
    environment: 'jsdom',

    // 全局设置
    globals: true,

    // 测试文件匹配
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],

    // 排除文件
    exclude: ['node_modules', 'dist'],

    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/**/*.d.ts', 'src/**/*.config.*', 'src/main.tsx'],
    },

    // 设置文件
    setupFiles: ['./src/test/setup.ts'],

    // CSS处理
    css: true,

    // 路径别名
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
