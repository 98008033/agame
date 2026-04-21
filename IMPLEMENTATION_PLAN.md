# Agame Implementation Plan

> Created: 2026-04-21
> Status: Ready for review
> Execution: Use `/do` skill with this plan

---

## Current State Assessment

### What's Done (~80% of MVP)
- **Server**: Express + TypeScript + Prisma (SQLite), 4-level Agent system (Chronos/Nation/City/NPC), 10 route groups, WebSocket service, JWT auth, multi-LLM fallback (GLM-4/Qwen)
- **Web**: React 19 + TypeScript + Tailwind v4 + Zustand + React Query, 10 pages, ~15 components, 8 Zustand stores, WebSocket integration, full API layer

### Critical Gaps (P0 - must fix before playable)
1. **Decision consequences** - stubbed in player.ts route (empty changes/rewards)
2. **NPC relationship tracking** - hardcoded to 0 in NPCAgent.ts
3. **NPC lifecycle** - inheritance/kill handlers log only, no actual event creation
4. **Ernie LLM provider** - declared but throws "not implemented"
5. **Token usage tracking** - returns zeros
6. **Narrative API endpoints** - frontend stores call `/narrative/*` that don't exist on backend
7. **CSS variable mismatch** - TodayPlanPage uses `--pixel-*` vars not defined in index.css

### Known Bugs
- `useQuery.tsx` exports unused `QueryProvider` (App.tsx creates its own)
- `gameStore` has unused fields (dialogueContext, currentSceneId)
- `uiStore` may be superseded by websocketStore notifications

---

## Phase 0: Fix Critical Gaps (Backend + Frontend consistency)

### P0-1: Backend Decision Consequences
**Task**: Implement real decision consequence calculation in `server/src/routes/player.ts`
- Currently: decision submission returns `{ changes: {}, rewards: {} }`
- Should: apply attribute changes, resource updates, tag additions, skill EXP from event template definitions
- Reference: `server/src/types/eventTemplates.ts` has the consequence schema
- Files: `server/src/routes/player.ts`, `server/src/services/index.ts`

### P0-2: NPC Relationship System
**Task**: Replace hardcoded relationship=0 with actual tracking in NPCAgent.ts
- Store NPC-player relationships in NPC state JSON
- Update relationships based on player decisions
- Files: `server/src/agents/NPCAgent.ts`, `server/prisma/schema.prisma`

### P0-3: NPC Lifecycle Events
**Task**: Wire up actual event creation for NPC death/inheritance
- Currently: `npcLifecycle.ts` only logs inheritance events
- Should: create actual game events, trigger death narrative, handle heir designation
- Files: `server/src/routes/npcLifecycle.ts`, `server/src/types/npcLifecycle.ts`

### P0-4: Ernie LLM Provider
**Task**: Implement Ernie (文心) as 3rd fallback provider
- Files: `server/src/services/llm/LLMService.ts`, `server/src/services/llm/types.ts`
- Use baidu-qianfan SDK or REST API

### P0-5: Token Usage Tracking
**Task**: Track and return actual token usage from LLM responses
- Files: `server/src/services/llm/LLMService.ts`
- Parse usage from GLM/Qwen/Ernie responses

### P0-6: Narrative API Endpoints
**Task**: Create `/narrative/*` route handlers on backend
- Endpoints needed: GET `/narrative/news`, GET `/narrative/journal`, GET `/narrative/biography`, GET `/narrative/event-scroll`, POST `/narrative/intervention`
- Can reuse existing world/news endpoints as base, add narrative carrier formatting
- New file: `server/src/routes/narrative.ts`

### P0-7: CSS Variable Consistency
**Task**: Add missing `--pixel-*` CSS variables to `web/src/index.css`
- Map `--pixel-bg-dark` → `--bg-primary` or equivalent
- Files: `web/src/index.css`

---

## Phase 1: Agent System Integration & Testing

### P1-1: Agent Scheduler End-to-End
**Task**: Verify AgentScheduler runs correctly on startup
- Check cron jobs fire at correct intervals
- Verify Chronos daily run produces valid world events
- Verify Nation/City agents update their respective states
- Files: `server/src/agents/AgentScheduler.ts`, `server/src/index.ts`

### P1-2: Output Validator Hardening
**Task**: Ensure OutputValidator catches all malformed LLM responses
- Add retry with stricter prompts
- Implement graceful degradation to template fallback
- Files: `server/src/agents/OutputValidator.ts`

### P1-3: WebSocket Event Pipeline
**Task**: Connect Agent-generated events to WebSocket push
- When Chronos generates events → push to affected players
- When NPC actions affect player → push notification
- Files: `server/src/services/websocket.ts`, `server/src/agents/AgentScheduler.ts`

### P1-4: Seed Data Enhancement
**Task**: Improve seed.ts with more realistic initial state
- 14 NPCs need more varied attributes and relationships
- World state needs more factions/cities
- Add initial events for testing
- Files: `server/src/seed.ts`, `server/prisma/schema.prisma`

---

## Phase 2: Frontend Polish & Integration

### P2-1: API Integration Audit
**Task**: Ensure every frontend API call has a matching backend endpoint
- Test each store's API calls against running server
- Fix mismatches (URLs, request/response formats)
- Remove unused mock data fallbacks or keep them as graceful degradation

### P2-2: Narrative Carrier Pages
**Task**: Wire up MorningNews, Journal, Biography, EventScroll pages
- Create dedicated pages or integrate into existing pages
- Connect to narrative API endpoints (from P0-6)
- Files: `web/src/components/NarrativeCarriers/`, `web/src/stores/narrativeCarrierStore.ts`

### P2-3: AP System UI Polish
**Task**: Fix TodayPlanPage styling and functionality
- Fix CSS variable references
- Ensure action execution flow works end-to-end with backend
- Files: `web/src/pages/TodayPlanPage/index.tsx`

### P2-4: Dead Code Cleanup
**Task**: Remove unused stores/fields
- Remove unused `QueryProvider` export from `useQuery.tsx`
- Clean up unused `gameStore` fields
- Evaluate if `uiStore` is still needed given websocketStore
- Files: `web/src/hooks/useQuery.tsx`, `web/src/stores/gameStore.ts`, `web/src/stores/uiStore.ts`

### P2-5: Error Handling & Loading States
**Task**: Improve error UX across all pages
- Consistent error messages from API failures
- Loading skeletons for async content
- Retry mechanisms for failed requests

---

## Phase 3: End-to-End Testing & Bug Fixes

### P3-1: Full Player Flow Test
**Task**: Register → Create Character → Read Novel → Make Decisions → See Consequences → Status Page
- Identify and fix any broken links in this flow
- Files: All pages in the flow

### P3-2: Agent Auto-Run Test
**Task**: Start server, wait for cron triggers, verify events are generated
- Check that Chronos runs at 6:00
- Check that Nation agents run every 6h
- Verify events appear in player's event list

### P3-3: WebSocket Test
**Task**: Verify real-time notifications work
- Open two browser tabs with same user
- Trigger an event, verify notification appears in both

### P3-4: Build & Deploy Check
**Task**: Ensure `npm run build` works for both server and web
- Fix any TypeScript errors
- Fix any import/build issues

---

## Execution Order

```
Phase 0 (P0-1 through P0-7) → Critical gaps, can be parallelized
    ↓
Phase 1 (P1-1 through P1-4) → Agent integration, depends on Phase 0
    ↓
Phase 2 (P2-1 through P2-5) → Frontend polish, depends on Phase 0
    ↓
Phase 3 (P3-1 through P3-4) → E2E testing, depends on all previous phases
```

---

## Team Member Assignments (for glm-5 execution)

| Team Member | Assigned Tasks | Focus |
|-------------|---------------|-------|
| **backend-dev** | P0-1, P0-2, P0-3, P0-4, P0-5, P0-6 | Backend gap fixes |
| **frontend-dev** | P0-7, P2-1, P2-2, P2-3, P2-4, P2-5 | Frontend polish |
| **agent-dev** | P1-1, P1-2, P1-3, P1-4 | Agent system integration |
| **qa-dev** | P3-1, P3-2, P3-3, P3-4 | Testing & verification |

---

## Success Criteria

- [ ] All P0 gaps closed (no more stubs, no broken API calls)
- [ ] Agents run on schedule and produce valid events
- [ ] Full player flow works without errors
- [ ] `npm run build` succeeds for both server and web
- [ ] All TypeScript compilation passes with no errors
