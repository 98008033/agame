/**
 * Agent类型定义
 */

// Agent层级
export type AgentLevel = 'world' | 'nation' | 'city' | 'npc';

// Agent状态
export type AgentStatus = 'init' | 'standby' | 'running' | 'error' | 'terminated';

// Agent配置
export interface AgentConfig {
  id: string;
  name: string;
  level: AgentLevel;
  faction?: 'canglong' | 'shuanglang' | 'jinque' | 'border' | null;
  trigger: {
    type: 'cron' | 'interval' | 'event';
    schedule?: string; // cron表达式
    hours?: number; // interval小时数
    offset?: number; // 错峰偏移小时
  };
  model: {
    primary: {
      provider: 'zhipu' | 'qwen' | 'ernie';
      model: string;
      temperature: number;
    };
    fallback: {
      provider: 'zhipu' | 'qwen' | 'ernie';
      model: string;
    };
  };
  maxTokens: number;
}

// 预定义Agent配置
export const AGENT_CONFIGS: Record<string, AgentConfig> = {
  // 世界级Agent
  chronos: {
    id: 'chronos',
    name: '命运织网者',
    level: 'world',
    trigger: { type: 'cron', schedule: '0 6 * * *' },
    model: {
      primary: { provider: 'zhipu', model: 'glm-4', temperature: 0.3 },
      fallback: { provider: 'qwen', model: 'qwen-plus' }
    },
    maxTokens: 8192
  },

  // 国家级Agent
  tianming_si: {
    id: 'tianming_si',
    name: '天命司',
    level: 'nation',
    faction: 'canglong',
    trigger: { type: 'interval', hours: 6, offset: 0 },
    model: {
      primary: { provider: 'qwen', model: 'qwen-plus', temperature: 0.5 },
      fallback: { provider: 'zhipu', model: 'glm-4' }
    },
    maxTokens: 4096
  },

  xianzu_yihui: {
    id: 'xianzu_yihui',
    name: '先祖议会',
    level: 'nation',
    faction: 'shuanglang',
    trigger: { type: 'interval', hours: 6, offset: 2 },
    model: {
      primary: { provider: 'qwen', model: 'qwen-plus', temperature: 0.5 },
      fallback: { provider: 'zhipu', model: 'glm-4' }
    },
    maxTokens: 4096
  },

  huangjin_yihui: {
    id: 'huangjin_yihui',
    name: '黄金议会',
    level: 'nation',
    faction: 'jinque',
    trigger: { type: 'interval', hours: 6, offset: 4 },
    model: {
      primary: { provider: 'qwen', model: 'qwen-plus', temperature: 0.5 },
      fallback: { provider: 'zhipu', model: 'glm-4' }
    },
    maxTokens: 4096
  },

  // 城邦级Agent模板
  city_agent: {
    id: 'city_agent',
    name: '城邦治理者',
    level: 'city',
    trigger: { type: 'interval', hours: 12 },
    model: {
      primary: { provider: 'zhipu', model: 'glm-4-flash', temperature: 0.7 },
      fallback: { provider: 'qwen', model: 'qwen-turbo' }
    },
    maxTokens: 2048
  },

  // NPC Agent模板
  npc_agent: {
    id: 'npc_agent',
    name: 'NPC行为Agent',
    level: 'npc',
    trigger: { type: 'event' },
    model: {
      primary: { provider: 'zhipu', model: 'glm-4-flash', temperature: 0.8 },
      fallback: { provider: 'qwen', model: 'qwen-turbo' }
    },
    maxTokens: 512
  }
};

// Agent输出类型
export interface WorldAgentOutput {
  balanceAnalysis: {
    currentState: 'balanced' | 'biased_canglong' | 'biased_shuanglang' | 'biased_jinque' | 'biased_border';
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    recommendedAction: string;
  };
  events: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    scope: string;
    importance: 'minor' | 'normal' | 'major' | 'critical';
    relatedFactions: string[];
  }>;
  historyProgression: {
    stageCompleted: boolean;
    progress: number;
  };
}

export interface NationAgentOutput {
  policies: Array<{
    type: 'military' | 'economic' | 'diplomatic' | 'cultural';
    description: string;
    target?: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  diplomaticDecisions: Array<{
    targetFaction: string;
    action: 'alliance' | 'trade' | 'war' | 'neutrality';
    reason: string;
  }>;
  factionStatus: {
    militaryStrength: number;
    economicHealth: number;
    politicalStability: number;
    publicMorale: number;
  };
}

export interface CityAgentOutput {
  governance: Array<{
    type: 'tax' | 'construction' | 'defense' | 'welfare';
    action: string;
    budget?: number;
  }>;
  resourceAllocation: {
    food: number;
    material: number;
    manpower: number;
  };
  localEvents: Array<{
    type: 'festival' | 'disaster' | 'trade_fair' | 'recruitment';
    title: string;
    description: string;
  }>;
}

export interface NPCAgentOutput {
  behavior: {
    action: string;
    target?: string;
    location: string;
  };
  dialogue?: {
    content: string;
    tone: 'friendly' | 'neutral' | 'hostile' | 'respectful';
  };
  memoryUpdate?: {
    event: string;
    sentiment: number;
    importance: number;
  };
}