/**
 * Frontend Test Setup
 * Global test utilities and mocks
 */

import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}
Object.defineProperty(global, 'localStorage', { value: localStorageMock })

// Mock fetch for API tests
global.fetch = vi.fn()

// 清理函数 - 每个测试后执行
afterEach(() => {
  vi.clearAllMocks()
  localStorageMock.getItem.mockReset()
  localStorageMock.setItem.mockReset()
  localStorageMock.removeItem.mockReset()
  localStorageMock.clear.mockReset()
})
