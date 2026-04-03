# 《三界风云录》

一款由 LLM 驱动的叙事优先策略游戏。

> **核心定位**：玩家登录看到的不是"游戏界面"，是一本正在书写的历史书——而你也是书中的一页。

---

## 核心体验

```
轻度入口 → 深度内核

日常：每日登录5-10分钟，阅读世界晨报，做2-3个关键决策
深入：每周1-2次30分钟深度体验——外交谈判、重大抉择、事件链
极端：重大事件期间（战争/政变/瘟疫）需要密集决策
```

---

## 项目文档

### 📋 核心设计文档

| 文件 | 内容 | 优先级 |
|------|------|--------|
| [01-overview.md](PLAN/01-overview.md) | 核心概念、游戏定位、体验节奏 | P0 |
| [02-world-setting.md](PLAN/02-world-setting.md) | 世界观、地理、历史、创世神话 | P0 |
| [03-factions.md](PLAN/03-factions.md) | 四阵营设定（苍龙/霜狼/金雀花/边境） | P0 |
| [04-character-system.md](PLAN/04-character-system.md) | 角色体系（属性/声望/效忠） | P0 |
| [05-agent-architecture.md](PLAN/05-agent-architecture.md) | Agent架构（Chronos/国家Agent） | P0 |
| [06-gameplay-loop.md](PLAN/06-gameplay-loop.md) | 时间系统、日常循环 | P0 |
| [08-event-system.md](PLAN/08-event-system.md) | 事件系统、事件链 | P0 |
| [10-llm-integration.md](PLAN/10-llm-integration.md) | LLM集成、Prompt设计 | P0 |
| [11-tech-architecture.md](PLAN/11-tech-architecture.md) | 技术栈、状态存储 | P0 |
| [14-narrative-system.md](PLAN/14-narrative-system.md) | 叙事体系（晨报/史书） | **P0** |
| [15-priority-web-narrative.md](PLAN/15-priority-web-narrative.md) | **Web优先与叙事核心设计（必读）** | **P0** |

### 📚 扩展设计文档

| 文件 | 内容 | 优先级 |
|------|------|--------|
| [04-skill-tree.md](PLAN/04-skill-tree.md) | 技能体系（6路线技能树） | P2 |
| [07-territory-management.md](PLAN/07-territory-management.md) | 领地经营、建筑系统 | P2 |
| [09-combat-system.md](PLAN/09-combat-system.md) | 战斗与冲突系统 | P2 |
| [12-development-roadmap.md](PLAN/12-development-roadmap.md) | 开发路线、阶段划分 | P1 |
| [13-npc-lifecycle.md](PLAN/13-npc-lifecycle.md) | NPC生命周期 | P2 |
| [appendix-glossary.md](PLAN/appendix-glossary.md) | 名词表 | P1 |

---

## 快速开始

### 当前开发重点

**MVP 阶段（8周）**：
1. **叙事引擎** - 晨报生成、事件呈现
2. **决策系统** - 二选一/三选一选择面板
3. **Agent 系统** - Chronos + 简化国家Agent
4. **Web 前端** - 纯文字为主的阅读界面

### 技术栈

```
前端：React + TypeScript + Tailwind CSS
后端：Node.js + Express + PostgreSQL + Redis
LLM：Claude API（分层调用）
部署：Vercel / Railway
```

---

## 核心理念

```
传统游戏：玩家 → 操作 → 系统反馈 → 数值变化
三界风云录：世界 → 自动运转 → 产生故事 → 玩家阅读/参与 → 故事继续
```

玩家不是"操控世界的人"，是"在历史中生活的人"。

---

## 仓库地址

https://github.com/98008033/agame
