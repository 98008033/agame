// Utility Functions

import { v4 as uuidv4 } from 'uuid';

// ID Generation
export function generatePlayerId(): string {
  return `player_${uuidv4().substring(0, 8)}`;
}

export function generateEventId(): string {
  return `event_${Date.now().toString(36)}_${uuidv4().substring(0, 4)}`;
}

export function generateNPCId(): string {
  return `npc_${uuidv4().substring(0, 8)}`;
}

// Date Utilities
export function getGameDateString(gameDay: number): string {
  // 游戏日映射到现实日期 (每游戏日 = 1现实天)
  const baseDate = new Date('2026-04-01');
  const resultDate = new Date(baseDate);
  resultDate.setDate(resultDate.getDate() + gameDay - 1);
  return resultDate.toISOString().split('T')[0] ?? '2026-04-01';
}

export function calculateNextLevelExperience(level: number): number {
  // 等级经验公式: level * 500
  return level * 500;
}

// Validation Utilities
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidName(name: string): boolean {
  return name.length >= 1 && name.length <= 50;
}

// Math Utilities
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// JSON Utilities for SQLite
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}

export function safeJsonStringify(value: unknown): string {
  return JSON.stringify(value);
}

// Delay Utility (for testing)
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}