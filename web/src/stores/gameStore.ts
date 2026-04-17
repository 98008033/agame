import { create } from 'zustand'

/**
 * 游戏状态管理
 * 管理当前游戏进度、玩家状态、NPC交互等
 */
interface GameState {
  // 当前章节ID
  currentChapterId: string | null
  // 当前场景ID
  currentSceneId: string | null
  // 玩家属性
  playerAttributes: {
    reputation: number
    wealth: number
    relationships: Record<string, number>
  }
  // 当前对话上下文
  dialogueContext: {
    npcId: string | null
    history: Array<{ role: 'player' | 'npc'; content: string }>
  }
  // Actions
  setChapter: (chapterId: string) => void
  setScene: (sceneId: string) => void
  updatePlayerAttributes: (attributes: Partial<GameState['playerAttributes']>) => void
  addDialogueMessage: (message: { role: 'player' | 'npc'; content: string }) => void
  clearDialogue: () => void
}

export const useGameStore = create<GameState>((set) => ({
  currentChapterId: null,
  currentSceneId: null,
  playerAttributes: {
    reputation: 0,
    wealth: 0,
    relationships: {},
  },
  dialogueContext: {
    npcId: null,
    history: [],
  },

  setChapter: (chapterId) => set({ currentChapterId: chapterId }),
  setScene: (sceneId) => set({ currentSceneId: sceneId }),
  updatePlayerAttributes: (attributes) =>
    set((state) => ({
      playerAttributes: { ...state.playerAttributes, ...attributes },
    })),
  addDialogueMessage: (message) =>
    set((state) => ({
      dialogueContext: {
        ...state.dialogueContext,
        history: [...state.dialogueContext.history, message],
      },
    })),
  clearDialogue: () =>
    set({
      dialogueContext: {
        npcId: null,
        history: [],
      },
    }),
}))
