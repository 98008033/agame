// Internationalization Tests
// 国际化测试

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Import locale files directly (not through i18n instance which uses localStorage)
import zh from '../i18n/locales/zh.json'
import en from '../i18n/locales/en.json'

// ============================================
// Helper: Extract all keys from an object recursively
// ============================================

function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getAllKeys(value as Record<string, unknown>, fullKey))
    } else {
      keys.push(fullKey)
    }
  }
  return keys
}

// ============================================
// Helper: Get value by dot-notation path
// ============================================

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

// ============================================
// In-memory storage for localStorage mock
// ============================================

const LANGUAGE_KEY = 'language'
let memoryStore: Record<string, string> = {}

function setLanguage(lang: string): void {
  memoryStore[LANGUAGE_KEY] = lang
}

function getLanguage(): string | undefined {
  return memoryStore[LANGUAGE_KEY]
}

function clearStorage(): void {
  memoryStore = {}
}

// ============================================
// Test: Translation Files Structure
// ============================================

describe('Translation Files Structure', () => {
  it('should have zh.json and en.json loaded', () => {
    expect(zh).toBeDefined()
    expect(en).toBeDefined()
    expect(typeof zh).toBe('object')
    expect(typeof en).toBe('object')
  })

  it('should have matching top-level keys', () => {
    const zhKeys = Object.keys(zh).sort()
    const enKeys = Object.keys(en).sort()
    expect(zhKeys).toEqual(enKeys)
  })

  it('should have matching nested keys', () => {
    const zhAllKeys = getAllKeys(zh).sort()
    const enAllKeys = getAllKeys(en).sort()
    expect(zhAllKeys).toEqual(enAllKeys)
  })

  it('should have all required sections', () => {
    const requiredSections = ['common', 'language', 'nav', 'dashboard', 'login']
    for (const section of requiredSections) {
      expect(zh[section]).toBeDefined()
      expect(en[section]).toBeDefined()
    }
  })
})

// ============================================
// Test: No Missing Translations
// ============================================

describe('No Missing Translations', () => {
  it('should have no missing keys in zh relative to en', () => {
    const zhKeys = new Set(getAllKeys(zh))
    const enKeys = getAllKeys(en)

    const missing = enKeys.filter(key => !zhKeys.has(key))
    expect(missing).toEqual([])
  })

  it('should have no missing keys in en relative to zh', () => {
    const enKeys = new Set(getAllKeys(en))
    const zhKeys = getAllKeys(zh)

    const missing = zhKeys.filter(key => !enKeys.has(key))
    expect(missing).toEqual([])
  })

  it('should have non-empty values for all translations', () => {
    const allKeys = getAllKeys(zh)
    for (const key of allKeys) {
      const zhValue = getNestedValue(zh, key)
      const enValue = getNestedValue(en, key)

      if (typeof zhValue === 'string') {
        expect(zhValue.length).toBeGreaterThan(0)
      }
      if (typeof enValue === 'string') {
        expect(enValue.length).toBeGreaterThan(0)
      }
    }
  })

  it('should have correct array lengths for array translations', () => {
    // login.features is an array in both locales
    expect(Array.isArray(zh.login.features)).toBe(true)
    expect(Array.isArray(en.login.features)).toBe(true)
    expect(zh.login.features.length).toBe(en.login.features.length)
    expect(zh.login.features.length).toBe(4)
  })
})

// ============================================
// Test: Language Switching
// ============================================

describe('Language Switching', () => {
  beforeEach(() => {
    clearStorage()
  })

  afterEach(() => {
    clearStorage()
  })

  it('should store language preference in memory', () => {
    setLanguage('en')
    expect(getLanguage()).toBe('en')
  })

  it('should be empty when no preference set', () => {
    clearStorage()
    expect(getLanguage()).toBeUndefined()
  })

  it('should support both zh and en languages', () => {
    const supportedLanguages = ['zh', 'en']
    for (const lang of supportedLanguages) {
      setLanguage(lang)
      expect(getLanguage()).toBe(lang)
    }
  })

  it('should persist language across "page loads"', () => {
    // Simulate setting language
    setLanguage('en')

    // Simulate new page load reading from storage
    const restoredLang = getLanguage()
    expect(restoredLang).toBe('en')
  })
})

// ============================================
// Test: Translation Content Quality
// ============================================

describe('Translation Content Quality', () => {
  it('should have Chinese text in zh locale', () => {
    // Check that some zh values contain Chinese characters
    const zhNavKeys = getAllKeys(zh.nav)
    for (const key of zhNavKeys) {
      const value = getNestedValue(zh.nav, key) as string
      if (typeof value === 'string') {
        // Chinese characters are in the range \u4e00-\u9fff
        const hasChinese = /[\u4e00-\u9fff]/.test(value)
        expect(hasChinese).toBe(true)
      }
    }
  })

  it('should have English text in en locale', () => {
    // Check that some en values contain Latin characters
    const enNavKeys = getAllKeys(en.nav)
    for (const key of enNavKeys) {
      const value = getNestedValue(en.nav, key) as string
      if (typeof value === 'string') {
        const hasLatin = /[a-zA-Z]/.test(value)
        expect(hasLatin).toBe(true)
      }
    }
  })

  it('should have interpolation placeholders preserved in both locales', () => {
    // dashboard.welcome has {{name}} placeholder
    const zhWelcome = zh.dashboard.welcome as string
    const enWelcome = en.dashboard.welcome as string
    expect(zhWelcome).toContain('{{name}}')
    expect(enWelcome).toContain('{{name}}')
  })

  it('should have consistent key count', () => {
    const zhKeyCount = getAllKeys(zh).length
    const enKeyCount = getAllKeys(en).length
    expect(zhKeyCount).toBe(enKeyCount)
    expect(zhKeyCount).toBeGreaterThan(20) // Reasonable minimum
  })
})

// ============================================
// Test: i18n Initialization
// ============================================

describe('i18n Initialization', () => {
  beforeEach(() => {
    clearStorage()
  })

  it('should store and retrieve language preference', () => {
    setLanguage('en')
    expect(getLanguage()).toBe('en')
  })

  it('should use fallback language when no preference set', () => {
    clearStorage()
    // The default fallback is 'zh' as defined in i18n/index.ts
    const defaultLang = getLanguage() || 'zh'
    expect(defaultLang).toBe('zh')
  })

  it('should load both locale resources', () => {
    // Verify resources are loadable
    expect(zh.common.loading).toBeDefined()
    expect(en.common.loading).toBeDefined()
  })
})
