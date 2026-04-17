// API Types - Based on docs/api-interface.md

import type { Faction, FactionLevel, HistoryStage, RelationshipLevel } from './game.js';

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  metadata: ApiMetadata;
}

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  retryable: boolean;
}

export interface ApiMetadata {
  timestamp: string;
  version: string;
  requestId: string;
  serverTime: number;
}

export type ErrorCode =
  | 'INVALID_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'INVALID_STATE'
  | 'EVENT_EXPIRED'
  | 'INSUFFICIENT_RESOURCES';

// ============================================
// Player API Types
// ============================================

export interface PlayerStatusResponse {
  id: string;
  name: string;
  age: number;
  faction: Faction | null;
  factionLevel: FactionLevel | null;
  titles: string[];
  level: number;
  experience: number;
  nextLevelExperience: number;
  attributes: PlayerAttributesResponse;
  reputation: ReputationResponse;
  skills: SkillSummaryResponse[];
  resources: PlayerResourcesResponse;
  location: PlayerLocationResponse;
  tags: string[];
  pendingEventsCount: number;
}

export interface PlayerAttributesResponse {
  physique: number;
  agility: number;
  wisdom: number;
  willpower: number;
  perception: number;
  charisma: number;
  fame: number;
  infamy: number;
  luck: number;
}

export interface ReputationResponse {
  canglong: { value: number; level: RelationshipLevel };
  shuanglang: { value: number; level: RelationshipLevel };
  jinque: { value: number; level: RelationshipLevel };
  border: { value: number; level: RelationshipLevel };
}

export interface SkillSummaryResponse {
  name: string;
  category: 'strategy' | 'combat' | 'commerce' | 'survival';
  level: number;
  unlocked: boolean;
  canBreakthrough: boolean;
}

export interface PlayerResourcesResponse {
  gold: number;
  food: number;
  materials: number;
}

export interface PlayerLocationResponse {
  region: string;
  city: string | null;
  faction: Faction;
}

// ============================================
// Event API Types
// ============================================

export interface EventSummaryResponse {
  id: string;
  type: string;
  category: string;
  title: string;
  description: string;
  scope: string;
  choicesPreview: EventChoicePreview[];
  createdAt: string;
  expiresAt: string | null;
  remainingTime: number | null;
  relatedNPCs: string[];
  relatedFactions: Faction[];
  importance: 'minor' | 'normal' | 'major' | 'critical';
  playerTriggered: boolean;
}

export interface EventChoicePreview {
  index: number;
  label: string;
  description: string;
}

export interface SubmitDecisionRequest {
  eventId: string;
  choiceIndex: number;
  confirmation?: {
    understoodRisks: boolean;
    acceptCosts: boolean;
  };
}

export interface SubmitDecisionResponse {
  success: boolean;
  decision: {
    id: string;
    eventId: string;
    choiceIndex: number;
    madeAt: string;
  };
  immediateConsequences: ImmediateConsequences;
  narrativeFeedback: string;
  triggeredEvents: TriggeredEventSummary[];
  nextSteps?: {
    hint: string;
    recommendedAction: string;
  };
}

export interface ImmediateConsequences {
  changes: Record<string, unknown>;
  acquired: {
    items?: string[];
    titles?: string[];
    tags?: string[];
    skills?: Record<string, number>;
  };
  unlocked: {
    events?: string[];
    skills?: string[];
    locations?: string[];
  };
}

export interface TriggeredEventSummary {
  id: string;
  title: string;
  category: string;
  willTriggerAt: string;
}

// ============================================
// World API Types
// ============================================

export interface WorldStateResponse {
  time: {
    day: number;
    year: number;
    month: number;
    season: string;
    phase: string;
  };
  historyStage: HistoryStage;
  balance: {
    powerIndex: Record<Faction, number>;
    balanceStatus: string;
    adjustmentNeeded: boolean;
  };
  factions: Record<Faction, FactionSummaryResponse>;
  activeEvents: WorldEventSummary[];
  cities: CitySummary[];
}

export interface FactionSummaryResponse {
  name: string;
  leader: string;
  military: number;
  economy: number;
  stability: number;
  influence: number;
  relations: Record<Faction, string>;
}

export interface WorldEventSummary {
  id: string;
  type: string;
  title: string;
  affectedFactions: Faction[];
  duration: number;
}

export interface CitySummary {
  id: string;
  name: string;
  faction: Faction;
  population: number;
  prosperity: number;
}

// ============================================
// Auth API Types
// ============================================

export interface LoginRequest {
  provider: 'wechat' | 'email' | 'guest';
  identityToken: string;
  newPlayer?: {
    name: string;
    startingFaction: Faction;
  };
}

export interface LoginResponse {
  success: boolean;
  auth: {
    token: string;
    expiresAt: string;
    refreshToken: string;
  };
  player: {
    id: string;
    name: string;
    isNew: boolean;
    faction: Faction | null;
    level: number;
  };
  gameState: {
    currentDay: number;
    historyStage: HistoryStage;
    pendingEventsCount: number;
  };
}

// ============================================
// Helper Functions
// ============================================

export function createSuccessResponse<T>(data: T, requestId: string): ApiResponse<T> {
  return {
    success: true,
    data,
    error: null,
    metadata: {
      timestamp: new Date().toISOString(),
      version: 'v1.0.0',
      requestId,
      serverTime: Date.now(),
    },
  };
}

export function createErrorResponse(
  code: ErrorCode,
  message: string,
  requestId: string,
  details?: Record<string, unknown>,
  retryable = false
): ApiResponse<null> {
  return {
    success: false,
    data: null,
    error: {
      code,
      message,
      details,
      retryable,
    },
    metadata: {
      timestamp: new Date().toISOString(),
      version: 'v1.0.0',
      requestId,
      serverTime: Date.now(),
    },
  };
}

export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}