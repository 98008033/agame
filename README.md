# 《三界风云录》

一款由LLM驱动的动态世界策略经营游戏。

**核心设计原则**：
- 玩家和NPC在同一套规则下运行。玩家只是这个世界中一个被人类操控的角色。
- 游戏的本质是叙事。玩家登录看到的不是"游戏界面"，是一本正在书写的历史书。

## 项目文档

所有设计方案文档位于 [`PLAN/`](./PLAN/) 目录下，按章节独立维护：

| 文件 | 内容 | 状态 |
|------|------|------|
| [01-overview.md](PLAN/01-overview.md) | 核心概念、游戏定位、体验节奏 | ✅ |
| [02-world-setting.md](PLAN/02-world-setting.md) | 世界观、地理、历史、创世神话 | ✅ |
| [03-factions.md](PLAN/03-factions.md) | 四阵营设定（苍龙/霜狼/金雀花/边境） | ✅ |
| [04-character-system.md](PLAN/04-character-system.md) | 角色体系（属性/等级/效忠/背叛/创新认证） | ✅ |
| [04-skill-tree.md](PLAN/04-skill-tree.md) | 技能体系（6路线技能树/跨线交汇/职业演变） | ✅ |
| [05-agent-architecture.md](PLAN/05-agent-architecture.md) | Agent架构（Chronos/国家Agent/NPC Agent） | ✅ |
| [06-gameplay-loop.md](PLAN/06-gameplay-loop.md) | 时间系统、回合制、日常循环 | ✅ |
| [07-territory-management.md](PLAN/07-territory-management.md) | 领地经营、建筑系统、资源系统 | ✅ |
| [08-event-system.md](PLAN/08-event-system.md) | 事件来源、事件链、事件呈现 | ✅ |
| [09-combat-system.md](PLAN/09-combat-system.md) | 战斗与冲突系统 | ✅ |
| [10-llm-integration.md](PLAN/10-llm-integration.md) | LLM集成、Prompt设计、调用优化 | ✅ |
| [11-tech-architecture.md](PLAN/11-tech-architecture.md) | 技术栈、状态存储、数据结构 | ✅ |
| [12-development-roadmap.md](PLAN/12-development-roadmap.md) | 开发路线、阶段划分 | ✅ |
| [13-npc-lifecycle.md](PLAN/13-npc-lifecycle.md) | NPC生命周期（生老病死/继承/新NPC生成） | ✅ |
| [14-narrative-system.md](PLAN/14-narrative-system.md) | 叙事体系（晨报/传记/史书/情感设计） | ✅ |
| [appendix-glossary.md](PLAN/appendix-glossary.md) | 名词表 | ✅ |

## 其他参考文档

- [GameDesignDoc.md](GameDesignDoc.md) — 初版设计方案
