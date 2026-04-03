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
| [00-team-workflow.md](PLAN/00-team-workflow.md) | **团队协作规范与工作文档** | P0 |
| [01-overview.md](PLAN/01-overview.md) | 核心概念、游戏定位、体验节奏 | P0 |
| [02-world-setting.md](PLAN/02-world-setting.md) | 世界观、地理、历史、创世神话 | P0 |
| [03-factions.md](PLAN/03-factions.md) | 四阵营设定（苍龙/霜狼/金雀花/边境） | P0 |
| [04-character-system.md](PLAN/04-character-system.md) | 角色体系（属性/声望/效忠） | P0 |
| [05-agent-architecture.md](PLAN/05-agent-architecture.md) | Agent架构概览 | P0 |
| [06-gameplay-loop.md](PLAN/06-gameplay-loop.md) | 时间系统、日常循环 | P0 |
| [08-event-system.md](PLAN/08-event-system.md) | 事件系统、事件链 | P0 |
| [10-llm-integration.md](PLAN/10-llm-integration.md) | LLM集成、Prompt设计 | P0 |
| [11-tech-architecture.md](PLAN/11-tech-architecture.md) | 技术栈、状态存储 | P0 |
| [14-narrative-system.md](PLAN/14-narrative-system.md) | 叙事体系（晨报/史书） | **P0** |
| [15-priority-web-narrative.md](PLAN/15-priority-web-narrative.md) | **Web优先与叙事核心设计** | **P0** |

### 🆕 系统详细设计（团队交付）

| 文件 | 内容 | 状态 |
|------|------|------|
| [16-economy-social-system.md](PLAN/16-economy-social-system.md) | **经济与社会系统**（双资源+社会关系） | ✅ |
| [17-visual-style-guide.md](PLAN/17-visual-style-guide.md) | **视觉风格指南**（水墨风+色彩系统+UI规范） | ✅ |
| [20-narrative-system-detailed.md](PLAN/20-narrative-system-detailed.md) | **小说叙事系统**（每日小说+实时造英雄） | ✅ |
| [docs/agent-architecture.md](docs/agent-architecture.md) | **多层级Agent技术架构**（四级Agent+Plan模式） | ✅ |

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

## 核心设计亮点

### 🎯 四级Agent架构

```
世界级 (Chronos)     → 每日1次，世界平衡、历史推进
    ↓
国家级 (天命司等)    → 每6小时，国家政策、外交决策
    ↓
城邦级 (地区领袖)    → 每12小时，地方治理、资源调配
    ↓
普通级 (NPC)         → 事件触发，日常行为、玩家交互
```

每层使用不同参数规模的模型，国产模型优先。

### 📖 每日小说叙事

- 每日生成3000-5000字历史演义风格小说章节
- "实时造英雄"：四国各1个主角NPC，实时生成传记
- 玩家行动被自然记录在叙事中

### 💰 双资源经济系统

- **金币**：物质基础，用于建设/招募/交易
- **影响力**：社交资本，用于外交/开启事件
- 社会关系网络：7级关系 + 4级阶层

### 🎨 水墨风视觉

- 中国水墨风 + 轻度奇幻元素
- 主色调：墨色 `#1A1A1A`、宣纸黄 `#F5F0E6`、朱砂红 `#C73E3A`
- 四国阵营专属配色方案

---

## 快速开始

### 当前开发重点

**MVP 阶段（8周）**：
1. **叙事引擎** - 晨报生成、小说章节输出
2. **决策系统** - 二选一/三选一选择面板
3. **Agent 系统** - 四级Agent + Plan模式
4. **Web 前端** - 水墨风阅读界面

### 技术栈

```
前端：React + TypeScript + Tailwind CSS
后端：Node.js + Express + PostgreSQL + Redis
LLM：国产模型优先（文心一言/通义千问/GLM-4）
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
