// Database Seed Script
// 初始化游戏世界数据

import prisma from './models/prisma.js';
import { DEFAULT_PLAYER_ATTRIBUTES, DEFAULT_SKILL_SET, type Faction, type NPCType, type NPCRole } from './types/game.js';

async function main(): Promise<void> {
  console.log('🌱 Starting database seeding...');

  // ============================================
  // 清理现有数据（避免唯一约束冲突）
  // ============================================
  console.log('Cleaning existing data...');
  await prisma.gameConfig.deleteMany({});
  await prisma.dailyNews.deleteMany({});
  await prisma.nPC.deleteMany({});
  await prisma.worldState.deleteMany({});
  console.log('✅ Existing data cleaned');

  // ============================================
  // 创建初始世界状态
  // ============================================
  console.log('Creating initial world state...');

  const initialWorldState = await prisma.worldState.create({
    data: {
      day: 1,
      year: 1,
      month: 1,
      season: 'spring',
      phase: 'morning',
      historyStage: 'era_power_struggle',
      snapshotId: `snapshot_${Date.now().toString(36)}`,
      balance: JSON.stringify({
        powerIndex: {
          canglong: 50,
          shuanglang: 50,
          jinque: 50,
          border: 50,
        },
        balanceStatus: 'balanced',
        adjustmentNeeded: false,
      }),
      factions: JSON.stringify({
        canglong: {
          name: '苍龙帝国',
          leader: 'npc_tianshu',
          military: 60,
          economy: 55,
          stability: 70,
          influence: 65,
          relations: {
            shuanglang: 'tension',
            jinque: 'neutral',
            border: 'hostile',
          },
        },
        shuanglang: {
          name: '霜狼联邦',
          leader: 'npc_hanlang',
          military: 65,
          economy: 45,
          stability: 60,
          influence: 55,
          relations: {
            canglong: 'tension',
            jinque: 'friendly',
            border: 'neutral',
          },
        },
        jinque: {
          name: '金雀花王国',
          leader: 'npc_qiushi',
          military: 40,
          economy: 70,
          stability: 75,
          influence: 60,
          relations: {
            canglong: 'neutral',
            shuanglang: 'friendly',
            border: 'friendly',
          },
        },
        border: {
          name: '边境联盟',
          leader: 'npc_laogen',
          military: 35,
          economy: 40,
          stability: 50,
          influence: 30,
          relations: {
            canglong: 'hostile',
            shuanglang: 'neutral',
            jinque: 'friendly',
          },
        },
      }),
      cities: JSON.stringify({
        tiandu: {
          id: 'tiandu',
          name: '天都城',
          faction: 'canglong',
          population: 500000,
          prosperity: 80,
        },
        twilight_village: {
          id: 'twilight_village',
          name: '暮光村',
          faction: 'border',
          population: 500,
          prosperity: 30,
        },
        frost_city: {
          id: 'frost_city',
          name: '霜城',
          faction: 'shuanglang',
          population: 200000,
          prosperity: 60,
        },
        flower_city: {
          id: 'flower_city',
          name: '花城',
          faction: 'jinque',
          population: 300000,
          prosperity: 75,
        },
      }),
      activeEvents: JSON.stringify([]),
      globalVariables: JSON.stringify({
        totalPlayers: 0,
        gameStartTime: new Date().toISOString(),
      }),
    },
  });

  console.log(`✅ World state created: Day ${initialWorldState.day}`);

  // ============================================
  // 创建核心NPC
  // ============================================
  console.log('Creating core NPCs...');

  const coreNPCs: Array<{
      id: string;
      name: string;
      age: number;
      gender: string;
      type: NPCType;
      role: NPCRole;
      faction: Faction;
      factionPosition: string;
      attributes: Record<string, number>;
      skills: Record<string, unknown>;
      personality: Record<string, number>;
      currentStatus: Record<string, unknown>;
    }> = [
    {
      id: 'npc_tianshu',
      name: '天枢皇子',
      age: 28,
      gender: 'male',
      type: 'leader' as NPCType,
      role: 'key' as NPCRole,
      faction: 'canglong' as Faction,
      factionPosition: '大皇子',
      attributes: {
        ...DEFAULT_PLAYER_ATTRIBUTES,
        physique: 70,
        wisdom: 75,
        charisma: 80,
        fame: 60,
      },
      skills: JSON.parse(JSON.stringify(DEFAULT_SKILL_SET)),
      personality: {
        ambition: 80,
        loyalty: 70,
        greed: 30,
        courage: 60,
        kindness: 50,
        cunning: 70,
      },
      currentStatus: {
        health: 100,
        location: { region: 'canglong', city: 'tiandu' },
        mood: 'neutral',
        isAlive: true,
      },
    },
    {
      id: 'npc_hanlang',
      name: '寒狼首领',
      age: 45,
      gender: 'male',
      type: 'leader' as NPCType,
      role: 'key' as NPCRole,
      faction: 'shuanglang' as Faction,
      factionPosition: '联邦首领',
      attributes: {
        ...DEFAULT_PLAYER_ATTRIBUTES,
        physique: 80,
        wisdom: 60,
        charisma: 65,
        fame: 55,
      },
      skills: JSON.parse(JSON.stringify(DEFAULT_SKILL_SET)),
      personality: {
        ambition: 60,
        loyalty: 85,
        greed: 20,
        courage: 90,
        kindness: 40,
        cunning: 50,
      },
      currentStatus: {
        health: 100,
        location: { region: 'shuanglang', city: 'frost_city' },
        mood: 'neutral',
        isAlive: true,
      },
    },
    {
      id: 'npc_qiushi',
      name: '秋实首辅',
      age: 55,
      gender: 'male',
      type: 'official' as NPCType,
      role: 'key' as NPCRole,
      faction: 'jinque' as Faction,
      factionPosition: '王国首辅',
      attributes: {
        ...DEFAULT_PLAYER_ATTRIBUTES,
        physique: 40,
        wisdom: 85,
        charisma: 70,
        fame: 50,
      },
      skills: JSON.parse(JSON.stringify(DEFAULT_SKILL_SET)),
      personality: {
        ambition: 40,
        loyalty: 90,
        greed: 15,
        courage: 30,
        kindness: 70,
        cunning: 75,
      },
      currentStatus: {
        health: 90,
        location: { region: 'jinque', city: 'flower_city' },
        mood: 'neutral',
        isAlive: true,
      },
    },
    {
      id: 'npc_laogen',
      name: '老根村长',
      age: 60,
      gender: 'male',
      type: 'villager' as NPCType,
      role: 'important' as NPCRole,
      faction: 'border' as Faction,
      factionPosition: '暮光村村长',
      attributes: {
        ...DEFAULT_PLAYER_ATTRIBUTES,
        physique: 50,
        wisdom: 60,
        charisma: 55,
        fame: 10,
      },
      skills: JSON.parse(JSON.stringify(DEFAULT_SKILL_SET)),
      personality: {
        ambition: 20,
        loyalty: 80,
        greed: 10,
        courage: 40,
        kindness: 85,
        cunning: 30,
      },
      currentStatus: {
        health: 85,
        location: { region: 'borderlands', city: 'twilight_village' },
        mood: 'happy',
        isAlive: true,
      },
    },
  ];

  for (const npcData of coreNPCs) {
    await prisma.nPC.create({
      data: {
        id: npcData.id,
        name: npcData.name,
        age: npcData.age,
        gender: npcData.gender,
        type: npcData.type,
        role: npcData.role,
        faction: npcData.faction,
        factionPosition: npcData.factionPosition,
        // SQLite: JSON字符串
        attributes: JSON.stringify(npcData.attributes),
        skills: JSON.stringify(npcData.skills),
        personality: JSON.stringify(npcData.personality),
        relationships: '{}',
        currentStatus: JSON.stringify(npcData.currentStatus),
      }
    });
    console.log(`✅ NPC created: ${npcData.name}`);
  }

  // ============================================
  // 创建初始晨报
  // ============================================
  console.log('Creating initial daily news...');

  await prisma.dailyNews.create({
    data: {
      day: 1,
      date: '2026-04-01',
      news: JSON.stringify({
        canglong: {
          faction: 'canglong',
          headline: {
            id: 'news_cl_001',
            title: '天枢皇子巡视北境',
            content: '天枢皇子近日抵达北境要塞，亲自视察边境防务...',
            type: 'political',
            importance: 'major',
          },
          items: [],
          summary: '帝国北境军事布局加强',
        },
        shuanglang: {
          faction: 'shuanglang',
          headline: {
            id: 'news_sl_001',
            title: '联邦议会召开',
            content: '霜狼联邦议会今日召开，讨论与邻邦的关系...',
            type: 'political',
            importance: 'normal',
          },
          items: [],
          summary: '联邦外交政策调整',
        },
        jinque: {
          faction: 'jinque',
          headline: {
            id: 'news_jq_001',
            title: '花城贸易盛会',
            content: '金雀花王国花城举办贸易盛会，四方商贾云集...',
            type: 'economic',
            importance: 'normal',
          },
          items: [],
          summary: '王国经济繁荣',
        },
        border: {
          faction: 'border',
          headline: {
            id: 'news_bd_001',
            title: '暮光村新居民',
            content: '暮光村迎来了一批新居民，为边境带来新的活力...',
            type: 'social',
            importance: 'minor',
          },
          items: [],
          summary: '边境人口增长',
        },
      }),
      worldHeadline: JSON.stringify(null),
      playerNews: JSON.stringify([]),
    },
  });

  console.log('✅ Daily news created for Day 1');

  // ============================================
  // 创建更多NPC（丰富游戏体验）
  // ============================================
  console.log('Creating additional NPCs...');

  const additionalNPCs: Array<{
    id: string;
    name: string;
    age: number;
    gender: string;
    type: NPCType;
    role: NPCRole;
    faction: Faction | null;
    factionPosition: string | null;
    attributes: Record<string, number>;
    skills: Record<string, unknown>;
    personality: Record<string, number>;
    currentStatus: Record<string, unknown>;
  }> = [
    // 苍龙帝国额外NPC
    {
      id: 'npc_cl_general',
      name: '铁臂将军',
      age: 35,
      gender: 'male',
      type: 'soldier' as NPCType,
      role: 'important' as NPCRole,
      faction: 'canglong' as Faction,
      factionPosition: '御林军统领',
      attributes: {
        ...DEFAULT_PLAYER_ATTRIBUTES,
        physique: 75,
        agility: 60,
        willpower: 70,
        fame: 30,
      },
      skills: JSON.parse(JSON.stringify(DEFAULT_SKILL_SET)),
      personality: { ambition: 40, loyalty: 90, greed: 10, courage: 85, kindness: 50, cunning: 30 },
      currentStatus: { health: 95, location: { region: 'canglong', city: 'tiandu' }, mood: 'neutral', isAlive: true },
    },
    {
      id: 'npc_cl_merchant',
      name: '王富贵',
      age: 42,
      gender: 'male',
      type: 'merchant' as NPCType,
      role: 'common' as NPCRole,
      faction: 'canglong' as Faction,
      factionPosition: null,
      attributes: {
        ...DEFAULT_PLAYER_ATTRIBUTES,
        charisma: 55,
        perception: 50,
      },
      skills: JSON.parse(JSON.stringify(DEFAULT_SKILL_SET)),
      personality: { ambition: 55, loyalty: 30, greed: 75, courage: 25, kindness: 40, cunning: 60 },
      currentStatus: { health: 80, location: { region: 'canglong', city: 'tiandu' }, mood: 'happy', isAlive: true },
    },
    // 霜狼联邦额外NPC
    {
      id: 'npc_sl_hunter',
      name: '猎手阿雅',
      age: 25,
      gender: 'female',
      type: 'adventurer' as NPCType,
      role: 'important' as NPCRole,
      faction: 'shuanglang' as Faction,
      factionPosition: '先锋队长',
      attributes: {
        ...DEFAULT_PLAYER_ATTRIBUTES,
        physique: 65,
        agility: 80,
        perception: 70,
      },
      skills: JSON.parse(JSON.stringify(DEFAULT_SKILL_SET)),
      personality: { ambition: 45, loyalty: 70, greed: 15, courage: 90, kindness: 65, cunning: 40 },
      currentStatus: { health: 90, location: { region: 'shuanglang', city: 'frost_city' }, mood: 'happy', isAlive: true },
    },
    {
      id: 'npc_sl_sage',
      name: '智者老狼',
      age: 70,
      gender: 'male',
      type: 'scholar' as NPCType,
      role: 'important' as NPCRole,
      faction: 'shuanglang' as Faction,
      factionPosition: '部落长老',
      attributes: {
        ...DEFAULT_PLAYER_ATTRIBUTES,
        wisdom: 85,
        perception: 75,
      },
      skills: JSON.parse(JSON.stringify(DEFAULT_SKILL_SET)),
      personality: { ambition: 15, loyalty: 85, greed: 5, courage: 35, kindness: 80, cunning: 65 },
      currentStatus: { health: 70, location: { region: 'shuanglang', city: 'frost_city' }, mood: 'neutral', isAlive: true },
    },
    // 金雀花王国额外NPC
    {
      id: 'npc_jq_banker',
      name: '钱万两',
      age: 48,
      gender: 'male',
      type: 'merchant' as NPCType,
      role: 'key' as NPCRole,
      faction: 'jinque' as Faction,
      factionPosition: '花城银行行长',
      attributes: {
        ...DEFAULT_PLAYER_ATTRIBUTES,
        wisdom: 70,
        charisma: 60,
        fame: 45,
      },
      skills: JSON.parse(JSON.stringify(DEFAULT_SKILL_SET)),
      personality: { ambition: 60, loyalty: 40, greed: 85, courage: 20, kindness: 35, cunning: 75 },
      currentStatus: { health: 80, location: { region: 'jinque', city: 'flower_city' }, mood: 'happy', isAlive: true },
    },
    {
      id: 'npc_jq_alchemist',
      name: '炼金师艾琳',
      age: 32,
      gender: 'female',
      type: 'scholar' as NPCType,
      role: 'important' as NPCRole,
      faction: 'jinque' as Faction,
      factionPosition: '炼金学院教授',
      attributes: {
        ...DEFAULT_PLAYER_ATTRIBUTES,
        wisdom: 80,
        perception: 70,
      },
      skills: JSON.parse(JSON.stringify(DEFAULT_SKILL_SET)),
      personality: { ambition: 55, loyalty: 45, greed: 40, courage: 45, kindness: 70, cunning: 55 },
      currentStatus: { health: 85, location: { region: 'jinque', city: 'flower_city' }, mood: 'neutral', isAlive: true },
    },
    // 边境联盟额外NPC
    {
      id: 'npc_bd_hunter',
      name: '铁壁猎户',
      age: 30,
      gender: 'male',
      type: 'adventurer' as NPCType,
      role: 'important' as NPCRole,
      faction: 'border' as Faction,
      factionPosition: null,
      attributes: {
        ...DEFAULT_PLAYER_ATTRIBUTES,
        physique: 70,
        agility: 65,
        perception: 65,
      },
      skills: JSON.parse(JSON.stringify(DEFAULT_SKILL_SET)),
      personality: { ambition: 35, loyalty: 70, greed: 20, courage: 85, kindness: 60, cunning: 35 },
      currentStatus: { health: 90, location: { region: 'borderlands', city: 'twilight_village' }, mood: 'happy', isAlive: true },
    },
    {
      id: 'npc_bd_innkeeper',
      name: '酒馆老板秋娘',
      age: 38,
      gender: 'female',
      type: 'merchant' as NPCType,
      role: 'common' as NPCRole,
      faction: 'border' as Faction,
      factionPosition: null,
      attributes: {
        ...DEFAULT_PLAYER_ATTRIBUTES,
        charisma: 65,
        perception: 55,
      },
      skills: JSON.parse(JSON.stringify(DEFAULT_SKILL_SET)),
      personality: { ambition: 40, loyalty: 60, greed: 50, courage: 40, kindness: 75, cunning: 45 },
      currentStatus: { health: 85, location: { region: 'borderlands', city: 'twilight_village' }, mood: 'neutral', isAlive: true },
    },
    // 无阵营NPC（自由人）
    {
      id: 'npc_free_traveler',
      name: '游侠无名',
      age: 28,
      gender: 'male',
      type: 'adventurer' as NPCType,
      role: 'common' as NPCRole,
      faction: null,
      factionPosition: null,
      attributes: {
        ...DEFAULT_PLAYER_ATTRIBUTES,
        physique: 60,
        agility: 70,
        perception: 65,
        fame: 10,
      },
      skills: JSON.parse(JSON.stringify(DEFAULT_SKILL_SET)),
      personality: { ambition: 30, loyalty: 50, greed: 25, courage: 80, kindness: 60, cunning: 45 },
      currentStatus: { health: 90, location: { region: 'borderlands', city: null }, mood: 'neutral', isAlive: true },
    },
    {
      id: 'npc_free_bard',
      name: '吟游诗人小蝶',
      age: 24,
      gender: 'female',
      type: 'scholar' as NPCType,
      role: 'common' as NPCRole,
      faction: null,
      factionPosition: null,
      attributes: {
        ...DEFAULT_PLAYER_ATTRIBUTES,
        charisma: 75,
        perception: 60,
        fame: 15,
      },
      skills: JSON.parse(JSON.stringify(DEFAULT_SKILL_SET)),
      personality: { ambition: 25, loyalty: 40, greed: 30, courage: 50, kindness: 80, cunning: 50 },
      currentStatus: { health: 85, location: { region: 'jinque', city: 'flower_city' }, mood: 'happy', isAlive: true },
    },
  ];

  for (const npcData of additionalNPCs) {
    await prisma.nPC.create({
      data: {
        id: npcData.id,
        name: npcData.name,
        age: npcData.age,
        gender: npcData.gender,
        type: npcData.type,
        role: npcData.role,
        faction: npcData.faction,
        factionPosition: npcData.factionPosition,
        attributes: JSON.stringify(npcData.attributes),
        skills: JSON.stringify(npcData.skills),
        personality: JSON.stringify(npcData.personality),
        relationships: '{}',
        currentStatus: JSON.stringify(npcData.currentStatus),
      }
    });
    console.log(`✅ Additional NPC created: ${npcData.name}`);
  }

  // ============================================
  // 创建游戏配置
  // ============================================
  console.log('Creating game configurations...');

  const configs = [
    {
      key: 'game_day_duration_seconds',
      value: { value: 86400 },
      description: '每游戏日对应的现实秒数',
    },
    {
      key: 'max_pending_events',
      value: { value: 10 },
      description: '玩家最大待处理事件数',
    },
    {
      key: 'starting_gold',
      value: { value: 100 },
      description: '新玩家初始金币',
    },
    {
      key: 'starting_reputation_border',
      value: { value: 20 },
      description: '新玩家边境阵营初始声望',
    },
    {
      key: 'llm_provider_priority',
      value: { providers: ['zhipu', 'qwen', 'ernie'] },
      description: 'LLM供应商优先级顺序',
    },
    {
      key: 'chronos_schedule_cron',
      value: { cron: '0 6 * * *', timezone: 'Asia/Shanghai' },
      description: 'Chronos Agent每日生成时间',
    },
    {
      key: 'max_action_points',
      value: { value: 6 },
      description: '玩家每日最大行动点数',
    },
  ];

  for (const config of configs) {
    await prisma.gameConfig.create({
      data: {
        key: config.key,
        value: JSON.stringify(config.value),
        description: config.description,
      }
    });
  }

  console.log('✅ Game configurations created');

  console.log('🌱 Database seeding completed successfully!');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });