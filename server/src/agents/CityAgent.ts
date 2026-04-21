/**
 * 城邦级Agent
 * 城市治理、资源调配、地方事件生成
 */

import { BaseAgent } from './BaseAgent.js';
import { AgentConfig, CityAgentOutput, AGENT_CONFIGS } from './types.js';
import { promptBuilder } from './PromptBuilder.js';
import { outputValidator } from './OutputValidator.js';
import prisma from '../models/prisma.js';
import { NationNames } from '../types/game.js';

export interface CityConfig {
  id: string;
  name: string;
  faction: 'canglong' | 'shuanglang' | 'jinque' | 'border';
  population: number;
  prosperity: number;
}

// 预定义城邦
export const CITY_CONFIGS: Record<string, CityConfig> = {
  tiandu: {
    id: 'tiandu',
    name: '天都城',
    faction: 'canglong',
    population: 500000,
    prosperity: 80
  },
  frost_city: {
    id: 'frost_city',
    name: '霜城',
    faction: 'shuanglang',
    population: 200000,
    prosperity: 60
  },
  flower_city: {
    id: 'flower_city',
    name: '花城',
    faction: 'jinque',
    population: 300000,
    prosperity: 75
  },
  twilight_village: {
    id: 'twilight_village',
    name: '暮光村',
    faction: 'border',
    population: 500,
    prosperity: 30
  }
};

export class CityAgent extends BaseAgent<CityAgentOutput> {
  private cityConfig: CityConfig;

  constructor(agentConfig: AgentConfig, cityConfig: CityConfig) {
    super(agentConfig);
    this.cityConfig = cityConfig;
  }

  /**
   * 执行城邦治理
   */
  async execute(): Promise<CityAgentOutput | null> {
    console.log(`[${this.cityConfig.id}] 开始执行城邦治理...`);

    // 获取城邦资源状态
    const resources = await this.getCityResources();

    // 构建Prompt
    const messages = promptBuilder.buildCityAgentPrompt({
      cityName: this.cityConfig.name,
      factionName: NationNames[this.cityConfig.faction],
      population: this.cityConfig.population,
      prosperity: this.cityConfig.prosperity,
      foodStorage: resources.food,
      materialStock: resources.material,
      manpower: resources.manpower,
      cityNeeds: await this.getCityNeeds()
    });

    // 调用LLM
    const rawOutput = await this.callLLM(messages);

    // 验证输出
    const validation = outputValidator.validateCityOutput(rawOutput);
    if (!validation.valid) {
      console.error(`[${this.cityConfig.id}] 输出验证失败:`, validation.errors);
      return this.getFallbackOutput();
    }

    // 保存治理决策
    const output = rawOutput as CityAgentOutput;
    await this.saveGovernance(output);

    return output;
  }

  /**
   * 获取城邦资源
   */
  private async getCityResources(): Promise<{ food: number; material: number; manpower: number }> {
    // 从世界状态获取城邦资源
    const worldState = await this.getWorldState();
    if (!worldState) {
      return { food: 100, material: 50, manpower: 100 };
    }

    const cities = worldState.cities as Record<string, { food?: number; material?: number; manpower?: number }>;
    const city = cities[this.cityConfig.id];

    return {
      food: city?.food || 100,
      material: city?.material || 50,
      manpower: city?.manpower || 100
    };
  }

  /**
   * 获取城邦需求
   */
  private async getCityNeeds(): Promise<string> {
    const needs: string[] = [];

    if (this.cityConfig.prosperity < 40) {
      needs.push('急需经济发展');
    }
    if (this.cityConfig.population < 1000) {
      needs.push('人口增长需求');
    }
    if (this.cityConfig.faction === 'border') {
      needs.push('安全防护需求');
    }

    return needs.join('\n') || '维持现状';
  }

  /**
   * 保存治理决策
   */
  private async saveGovernance(output: CityAgentOutput): Promise<void> {
    // 创建地方事件
    for (const event of output.localEvents) {
      await prisma.event.create({
        data: {
          id: `local_${this.cityConfig.id}_${Date.now().toString(36)}`,
          title: `${this.cityConfig.name}${event.title}`,
          description: event.description,
          type: 'political_decision',
          category: 'daily_life',
          scope: 'local',
          status: 'active',
          choices: '[]',
          affectedEntities: JSON.stringify([this.cityConfig.faction])
        }
      });
    }

    console.log(`[${this.cityConfig.id}] 已保存${output.localEvents.length}个地方事件`);
  }

  /**
   * 降级输出
   */
  protected getFallbackOutput(): CityAgentOutput {
    return {
      governance: [
        { type: 'welfare', action: '维持日常运作' }
      ],
      resourceAllocation: {
        food: 50,
        material: 30,
        manpower: 50
      },
      localEvents: []
    };
  }
}

// 创建城邦Agent实例
export const tianduAgent = new CityAgent(AGENT_CONFIGS.city_agent!, CITY_CONFIGS.tiandu!);
export const frostCityAgent = new CityAgent(AGENT_CONFIGS.city_agent!, CITY_CONFIGS.frost_city!);
export const flowerCityAgent = new CityAgent(AGENT_CONFIGS.city_agent!, CITY_CONFIGS.flower_city!);
export const twilightVillageAgent = new CityAgent(AGENT_CONFIGS.city_agent!, CITY_CONFIGS.twilight_village!);