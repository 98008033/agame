# 开发路线图 - Technical Architecture Analysis & Development Roadmap

> 基于完整设计文档分析生成的技术架构评估与开发任务规划
>
> 创建日期：2026-04-17

---

## 一、设计文档阅读清单

### 1.1 PLAN目录核心设计文档

| 文档 | 内容概要 | 状态 |
|------|---------|------|
| 01-overview.md | 核心概念："每日网文"策略游戏，永久死亡，叙事优先，Agent系统驱动世界自动运行 | ✅ 已读 |
| 04-character-system.md | 十维属性体系，等级/称号系统，技能需求，忠诚/背叛机制，职业涌现 | ✅ 已读 |
| 05-agent-architecture.md | Agent YAML配置模板，调度器配置，错误处理策略 | ✅ 已读 |
| 10-llm-integration.md | 三层模型使用策略，Prompt分层设计，缓存/批处理策略 | ✅ 已读 |
| 11-tech-architecture.md | MVP技术栈定义，数据库Schema，API端点，部署架构(Vercel + Railway) | ✅ 已读 |
| 12-development-roadmap.md | 原Phase 1-4计划(8周MVP)，P0/P1/P2定义，风险评估表，成功标准 | ✅ 已读 |
| 14-narrative-system.md | Chronos作为"作者"，NPC故事线，章节生成，叙事视角切换 | ✅ 已读 |
| 30-frontend-architecture.md | React组件层级，4核心页面(小说阅读/游戏事件/状态/NPC对话)，Zustand stores | ✅ 已读 |
| 33-society-runtime.md | 社会循环(经济/权力/关系)，阶层系统，冲突爆发算法 | ✅ 已读 |
| 38-core-gameplay-loop.md | AP系统设计(每日6点)，行动类别(成长/资源/社交/事件)，即时反馈层，六核心驱动 | ✅ 已读 |
| 42-gameplay-improvements.md | 四系统整合(核心循环/反馈/影响力/风险回报)，P0/P1/P2任务定义 | ✅ 已读 |

### 1.2 docs目录技术文档

| 文档 | 内容概要 | 状态 |
|------|---------|------|
| agent-architecture.md | 四级Agent架构详细设计：Chronos/National/City/NPC Agent接口，生命周期状态机，消息总线架构，NPC记忆系统，故障恢复策略 | ✅ 已读 |
| data-structures.md | 完整TypeScript接口定义：PlayerState(十维属性/技能/关系/资源)，NPCState，WorldState，GameEvent，PlayerDecision，DailyNews | ✅ 已读 |
| api-interface.md | 17个API端点完整定义，请求/响应TypeScript接口，错误处理，WebSocket扩展设计 | ✅ 已读 |
| prompt-templates.md | L1/L2/L3 Prompt模板示例(world/national/NPC agents)，JSON Schema验证，降级机制 | ✅ 已读 |

---

## 二、可行性分析

### 2.1 可行的设计

#### ✅ 四级Agent架构
**可行性：高**
- **理由**：分层设计符合LLM调用频率优化原则，世界级Agent每日1次、国家级Agent每6小时、城市级Agent每12小时、NPC Agent事件触发，有效控制API成本
- **验证点**：node-cron调度器成熟稳定，Express中间件架构支持良好

#### ✅ 十维属性系统
**可行性：高**
- **理由**：属性设计完整覆盖身体(体质/敏捷)、心智(智慧/意志/感知)、社交(魅力/声望/恶名)、命运(运气)、派系声望，数值系统清晰
- **验证点**：TypeScript接口定义完善(data-structures.md)，可直接映射到数据库Schema

#### ✅ AP行动点系统
**可行性：高**
- **理由**：每日6AP限制提供了明确的时间约束，行动消耗1-5AP可量化，用户决策成本可控
- **验证点**：前端React状态管理(Zustand)可完美支持AP消耗实时更新

#### ✅ 三层Prompt设计
**可行性：高**
- **理由**：L1系统层(固定世界规则) + L2场景层(动态状态) + L3任务层(具体生成)，分层减少Token消耗，缓存策略有效
- **验证点**：GLM-4/Qwen-Plus API支持System Prompt持久化

#### ✅ 叙事优先架构
**可行性：高**
- **理由**：Chronos同时担任"导演"(事件编排)和"作者"(叙事生成)，避免叙事与游戏机制分离
- **验证点**：DailyNews结构化输出可直接渲染为小说章节

#### ✅ 社会循环模拟
**可行性：中-高**
- **理由**：经济循环(生产→分配→消费)、权力循环(权威→斗争→重组)、关系循环(变化→影响→变化)三者耦合，模拟真实社会动态
- **验证点**：状态机设计(agent-architecture.md)支持循环状态追踪

#### ✅ 数据库Schema设计
**可行性：高**
- **理由**：world_state/kingdoms/players/events/decisions/daily_news六表设计覆盖核心数据流，PostgreSQL JSONB支持灵活扩展
- **验证点**：TypeScript接口与Schema可直接映射，无需额外转换层

### 2.2 不可行的设计及替代方案

#### ❌ 实时WebSocket推送
**原设计**：所有游戏状态通过WebSocket实时推送
**不可行原因**：
1. Railway容器资源限制，长连接维护成本高
2. MVP阶段玩家交互频率低(每日数次决策)，WebSocket收益有限
3. 增加运维复杂度，需要额外处理连接断开/重连逻辑

**替代方案**：
- **Phase 1**：采用轮询机制(每30秒)，配合React Query缓存策略
- **Phase 2+**：仅在关键事件(玩家死亡/世界大事件)引入WebSocket通知
- **技术栈调整**：移除ws库依赖，使用axios + React Query polling

#### ❌ NPC完全自主决策
**原设计**：每个NPC独立Agent实时决策
**不可行原因**：
1. LLM成本爆炸：假设100个NPC每日各调用5次，月成本>¥5000
2. 响应延迟：LLM生成时间2-5秒，无法支持即时交互
3. 输出一致性：NPC行为可能偏离世界设定

**替代方案**：
- **批量NPC决策**：NPC Agent按组(同一城市/同一派系)调用，单次生成多NPC行为
- **规则引擎辅助**：低重要度NPC(对玩家影响<10%)使用规则引擎预定义行为模板
- **混合架构**：高重要度NPC(玩家关系>50)使用LLM生成，低重要度NPC使用模板填充

#### ❌ 每日全量世界状态生成
**原设计**：Chronos每日生成完整世界状态报告
**不可行原因**：
1. Token消耗过大：完整世界状态可能需要5000+ tokens
2. 信息冗余：大部分状态变化微小，全量生成浪费资源

**替代方案**：
- **增量生成**：Chronos仅生成当日变化事件，基准状态存储在数据库
- **摘要层**：生成三层摘要(世界摘要→国家摘要→城市摘要)，玩家按需展开
- **缓存策略**：未变化区域的状态描述缓存48小时

### 2.3 技术风险点

| 风险项 | 严重度 | 影响范围 | 缓解策略 |
|--------|--------|---------|---------|
| LLM API稳定性 | 高 | 世界/NPC生成失败导致游戏停滞 | 多供应商备用(GLM→Qwen→ERNIE)，本地缓存降级 |
| LLM输出格式偏离 | 中高 | JSON解析失败，前端渲染异常 | JSON Schema验证 + 重试机制 + 结构化模板强制 |
| 状态同步延迟 | 中 | 玩家决策后世界状态未及时更新 | 异步处理 + 乐观更新 + 状态版本号校验 |
| 数据库连接池耗尽 | 中 | 高并发Agent写入导致连接阻塞 | Redis消息队列缓冲 + 批量写入 + 连接池监控 |
| Prompt注入攻击 | 中 | 玩家输入污染NPC行为生成 | 输入过滤 + System Prompt隔离 + 输出验证 |
| 部署资源限制 | 中低 | Railway/Vercel容器内存/时间限制 | 优化Agent调用频率 + 减少内存占用 + 冷启动优化 |
| 玩家数据一致性 | 低 | 并发决策导致状态冲突 | 决策锁机制 + 事务隔离 + 最终一致性策略 |
| 永久死亡体验 | 中 | 玩家死亡后流失 | 死亡叙事优化 + 遗产继承机制 + 新开局奖励 |

---

## 三、技术方案选型

### 3.1 前端技术栈

| 组件 | 选型 | 理由 |
|------|------|------|
| **框架** | React 18 + TypeScript | 生态成熟，类型安全，组件复用率高 |
| **样式** | Tailwind CSS 3.4 | 快速原型，响应式支持，无需CSS预处理器 |
| **状态管理** | Zustand 4 | 轻量(2KB)，无Provider包裹，支持持久化 |
| **数据获取** | React Query 5 | 缓存管理，轮询支持，后台自动刷新 |
| **HTTP客户端** | Axios | 拦截器支持，请求取消，错误统一处理 |
| **路由** | React Router 6 | 标准方案，懒加载支持 |
| **构建工具** | Vite 5 | 快速冷启动，HMR，ESM原生支持 |
| **部署平台** | Vercel | 零配置部署，边缘缓存，免费额度充足 |

**前端架构图**：
```
src/
├── components/          # 可复用组件
│   ├── NovelReader/     # 小说阅读组件
│   ├── GameEvent/       # 游戏事件组件
│   ├── StatusPanel/     # 状态面板组件
│   └── NPCDialog/       # NPC对话组件
├── pages/               # 页面组件
│   ├── NovelPage/       # 小说阅读页
│   ├── EventPage/       # 游戏事件页
│   ├── StatusPage/      # 状态查看页
│   └── DialogPage/      # NPC对话页
├── stores/              # Zustand状态库
│   ├── playerStore.ts   # 玩家状态
│   ├── worldStore.ts    # 世界状态
│   └── gameStore.ts     # 游戏进程
├── services/            # API服务
│   ├── api.ts           # Axios配置
│   ├── playerService.ts # 玩家API
│   └── worldService.ts  # 世界API
└── hooks/               # 自定义Hooks
    ├── usePolling.ts    # 轮询Hook
    └── useGameActions.ts # 游戏行动Hook
```

### 3.2 后端技术栈

| 组件 | 选型 | 理由 |
|------|------|------|
| **运行时** | Node.js 20 LTS | Express生态成熟，与前端技术栈统一 |
| **Web框架** | Express 4.18 | 路由清晰，中间件丰富，社区支持强 |
| **数据库** | PostgreSQL 15 | JSONB支持，事务可靠，开源免费 |
| **缓存** | Redis 7 | Agent消息队列，Session缓存，热点数据缓存 |
| **调度器** | node-cron | Agent定时任务触发，轻量可靠 |
| **ORM** | Prisma 5 | 类型安全，迁移管理，自动生成类型 |
| **LLM SDK** | zhipu-sdk + qwen-sdk | GLM-4主力，Qwen备用，官方SDK稳定 |
| **部署平台** | Railway | PostgreSQL/Redis集成，容器部署，免费额度 |

**后端架构图**：
```
src/
├── agents/              # Agent系统
│   ├── chronosAgent.ts  # 世界级Agent
│   ├── nationalAgent.ts # 国家级Agent
│   ├── cityAgent.ts     # 城市级Agent
│   └ npcAgent.ts        # NPC级Agent
│   └── agentScheduler.ts # 调度器
├── services/            # 业务服务
│   ├── llmService.ts    # LLM调用服务
│   ├── worldService.ts  # 世界状态服务
│   ├── playerService.ts # 玩家服务
│   ├── eventService.ts  # 事件服务
│   └── newsService.ts   # 新闻生成服务
├── models/              # Prisma模型
│   └── schema.prisma    # 数据库Schema
├── routes/              # API路由
│   ├── worldRoutes.ts   # 世界API
│   ├── playerRoutes.ts  # 玩家API
│   ├── eventRoutes.ts   # 事件API
│   └── newsRoutes.ts    # 新闻API
├── utils/               # 工具函数
│   ├── promptBuilder.ts # Prompt构建器
│   ├── validator.ts     # 输出验证器
│   └── cache.ts         # 缓存工具
└── middleware/          # 中间件
    ├── errorHandler.ts  # 错误处理
    ├── rateLimiter.ts   # 限流中间件
    └── authMiddleware.ts # 认证中间件
```

### 3.3 LLM集成方案

| 层级 | 模型选择 | 调用频率 | 月成本预估 |
|------|---------|---------|-----------|
| **L1 世界层(Chronos)** | GLM-4 | 每日1次 | ¥90/月 |
| **L2 国家层(National)** | GLM-4-Plus | 每6小时(4国) | ¥120/月 |
| **L3 城市层(City)** | Qwen-Plus | 每12小时(16城) | ¥60/月 |
| **L4 NPC层** | Qwen-Turbo(批量) | 事件触发 | ¥114/月 |
| **总预估** | - | - | **¥284/月** |

**降级策略**：
1. GLM-4不可用 → 切换Qwen-Plus
2. Qwen不可用 → 切换ERNIE-4.0
3. 全LLM不可用 → 使用缓存模板 + 规则引擎生成

**Prompt缓存策略**：
- L1 System Prompt(世界规则)：持久缓存，Token节省50%
- L2/L3场景数据：增量更新，仅传入变化字段
- NPC行为模板：预定义20个场景模板，优先匹配

### 3.4 数据存储方案

| 数据类型 | 存储位置 | 生命周期 |
|---------|---------|---------|
| **世界核心状态** | PostgreSQL(world_state表) | 永久存储，每日更新 |
| **玩家数据** | PostgreSQL(players表) | 玩家生命周期内存储 |
| **事件历史** | PostgreSQL(events表) | 保留30天，归档至冷存储 |
| **决策记录** | PostgreSQL(decisions表) | 玩家生命周期内存储 |
| **每日新闻** | PostgreSQL(daily_news表) | 保留7天(可回看) |
| **Agent消息队列** | Redis(List) | 处理后删除，TTL=24h |
| **热点数据缓存** | Redis(String/Hash) | TTL=6h，按需刷新 |
| **Session数据** | Redis(Hash) | TTL=7天 |

---

## 四、MVP定义

### 4.1 MVP核心目标

**一句话定义**：
> 玩家可以每日阅读生成的小说章节，做出有限决策(AP系统)，观察世界变化，体验永久死亡。

### 4.2 MVP必须包含的功能

| 功能模块 | 具体能力 | 优先级 |
|---------|---------|--------|
| **小说阅读** | 每日生成小说章节(500-1000字)，按时间线浏览历史章节 | P0 |
| **玩家状态** | 显示十维属性、当前AP、资源、关系网络 | P0 |
| **游戏决策** | 每日做出1-3个决策(消耗AP)，决策影响世界状态 | P0 |
| **世界概览** | 显示当前世界状态摘要(国家/城市/重要NPC) | P0 |
| **角色创建** | 创建新角色，选择出身/初始属性分布 | P0 |
| **永久死亡** | 角色死亡后生成死亡叙事，引导创建新角色 | P0 |
| **Chronos Agent** | 每日生成世界事件+小说章节 | P0 |
| **NPC Agent** | 关系NPC响应玩家决策生成行为 | P0 |

### 4.3 MVP不包含的功能

| 功能 | 原因 | Phase规划 |
|------|------|----------|
| WebSocket实时推送 | 轮询方案成本更低，MVP交互频率低 | Phase 2 |
| 国家级Agent | 单一世界简化MVP复杂度 | Phase 2 |
| 城市级Agent | 世界级Agent覆盖核心生成需求 | Phase 2 |
| 派系系统 | 关系网络简化为NPC关系 | Phase 2 |
| 经济循环模拟 | 资源简化为玩家持有量 | Phase 2 |
| 技能系统 | MVP仅用基础属性 | Phase 2 |
| NPC对话界面 | MVP以决策替代对话 | Phase 3 |
| 遗产继承 | 死亡体验需验证后迭代 | Phase 3 |
| 多语言支持 | 中文优先，验证核心玩法 | Phase 3+ |

### 4.4 MVP简化策略

| 原设计 | MVP简化 | 理由 |
|--------|--------|------|
| 四级Agent架构 | 仅Chronos + NPC Agent(简化版) | 降低开发复杂度，验证核心叙事生成 |
| 多国家/多城市 | 单一世界(简化版王国) | 避免多区域状态同步复杂度 |
| 完整社会循环 | 仅玩家决策→NPC响应→状态更新 | 验证决策闭环即可 |
| 100+ NPC | 10-20个核心NPC | 确保每个NPC质量可控 |
| WebSocket | 轮询(30秒) | 降低运维复杂度 |
| 复杂Prompt | L1 + L2简化版 | 验证三层架构可行性 |

---

## 五、开发任务列表

### 5.1 P0任务（MVP必需）

#### P0-前端任务

| 任务ID | 任务名称 | 工作量 | 技术要点 |
|--------|---------|--------|---------|
| P0-F01 | 项目初始化 | 2h | Vite + React + TypeScript + Tailwind配置 |
| P0-F02 | Zustand状态库搭建 | 4h | playerStore/worldStore/gameStore设计 |
| P0-F03 | Axios API层搭建 | 3h | 基础配置/拦截器/错误处理 |
| P0-F04 | 小说阅读页面 | 8h | NovelReader组件/章节列表/滚动阅读 |
| P0-F05 | 玩家状态页面 | 6h | StatusPanel组件/十维属性展示/AP显示 |
| P0-F06 | 游戏决策页面 | 10h | GameEvent组件/决策选项/AP消耗/确认流程 |
| P0-F07 | 世界概览页面 | 6h | WorldSummary组件/国家/城市/重要NPC |
| P0-F08 | 角色创建页面 | 8h | CharacterCreation组件/出身选择/属性分配 |
| P0-F09 | 死亡叙事页面 | 6h | DeathNarrative组件/死亡故事/新建角色引导 |
| P0-F10 | React Query轮询 | 4h | usePolling Hook/缓存策略/后台刷新 |
| P0-F11 | 响应式布局 | 4h | Tailwind响应式/移动端适配 |
| **前端总计** | - | **51h** | - |

#### P0-后端任务

| 任务ID | 任务名称 | 工作量 | 技术要点 |
|--------|---------|--------|---------|
| P0-B01 | 项目初始化 | 3h | Express + TypeScript + ESLint配置 |
| P0-B02 | Prisma Schema设计 | 6h | 6表Schema/关系定义/迁移脚本 |
| P0-B03 | PostgreSQL连接配置 | 3h | Prisma Client/连接池/健康检查 |
| P0-B04 | Redis连接配置 | 2h | ioredis/消息队列基础 |
| P0-B05 | LLM服务集成 | 8h | zhipu-sdk/qwen-sdk封装/降级策略 |
| P0-B06 | Prompt构建器 | 6h | L1/L2模板/增量数据组装 |
| P0-B07 | Chronos Agent | 12h | 每日调度/事件生成/小说生成/node-cron |
| P0-B08 | NPC Agent(简化版) | 10h | 玩家决策触发/响应生成/批量调用 |
| P0-B09 | 世界状态服务 | 8h | 状态查询/状态更新/版本控制 |
| P0-B10 | 玩家服务 | 6h | 创建角色/状态查询/AP消耗/死亡处理 |
| P0-B11 | 事件服务 | 6h | 事件创建/事件查询/事件影响计算 |
| P0-B12 | 新闻服务 | 4h | 小说章节生成/章节查询/时间线组织 |
| P0-B13 | API路由设计 | 8h | 17端点路由/请求验证/响应格式 |
| P0-B14 | 错误处理中间件 | 3h | 统一错误格式/日志记录 |
| P0-B15 | 限流中间件 | 2h | rate-limiter-flexible/防止滥用 |
| **后端总计** | - | **78h** | - |

#### P0-集成与部署任务

| 任务ID | 任务名称 | 工作量 | 技术要点 |
|--------|---------|--------|---------|
| P0-D01 | Vercel前端部署 | 2h | 项目配置/环境变量/构建优化 |
| P0-D02 | Railway后端部署 | 4h | Dockerfile/PostgreSQL/Redis配置 |
| P0-D03 | Agent调度器部署 | 3h | node-cron在Railway容器运行 |
| P0-D04 | LLM API密钥配置 | 1h | GLM/Qwen密钥管理/降级配置 |
| P0-D05 | 监控告警配置 | 3h | Railway日志/健康检查/告警规则 |
| **部署总计** | - | **13h** | - |

**P0总工作量：142小时 ≈ 18个工作日**

---

### 5.2 P1任务（核心体验）

#### P1-前端任务

| 任务ID | 任务名称 | 工作量 | 技术要点 |
|--------|---------|--------|---------|
| P1-F01 | 决策动画效果 | 4h | 决策确认动画/AP消耗动画 |
| P1-F02 | 状态变化可视化 | 6h | 属性变化动画/关系变化可视化 |
| P1-F03 | 小说章节导航 | 4h | 章节跳转/时间线浏览/搜索 |
| P1-F04 | NPC卡片详情 | 6h | NPC信息卡片/关系图谱/交互历史 |
| P1-F05 | 事件历史页面 | 4h | 历史决策查询/影响追踪 |
| P1-F06 | 离线缓存支持 | 4h | Service Worker/章节缓存 |
| **前端总计** | - | **28h** | - |

#### P1-后端任务

| 任务ID | 任务名称 | 工作量 | 技术要点 |
|--------|---------|--------|---------|
| P1-B01 | National Agent | 12h | 国家级Agent/每6小时调度/多国状态 |
| P1-B02 | City Agent | 10h | 城市级Agent/每12小时调度/城市状态 |
| P1-B03 | 批量NPC决策优化 | 8h | 按组批量生成/Token优化 |
| P1-B04 | 经济循环模拟 | 10h | 资源生产/分配/消费基础循环 |
| P1-B05 | 派系系统 | 8h | 派系数据结构/派系声誉计算 |
| P1-B06 | 技能系统 | 6h | 技能数据结构/技能解锁条件 |
| P1-B07 | 状态版本控制 | 4h | 状态快照/回滚机制 |
| P1-B08 | 事件影响追溯 | 6h | 决策→事件→状态变化链路记录 |
| **后端总计** | - | **54h** | - |

#### P1-集成任务

| 任务ID | 任务名称 | 工作量 | 技术要点 |
|--------|---------|--------|---------|
| P1-I01 | WebSocket关键事件通知 | 6h | 仅死亡/世界大事件推送 |
| P1-I02 | 多LLM供应商切换 | 4h | GLM→Qwen→ERNIE自动切换 |
| **集成总计** | - | **10h** | - |

**P1总工作量：92小时 ≈ 12个工作日**

---

### 5.3 P2任务（完整体验）

#### P2-前端任务

| 任务ID | 任务名称 | 工作量 | 技术要点 |
|--------|---------|--------|---------|
| P2-F01 | NPC对话界面 | 10h | NPCDialog组件/对话生成/对话历史 |
| P2-F02 | 遗产继承界面 | 6h | 遗产选择/属性继承/新角色奖励 |
| P2-F03 | 世界地图可视化 | 8h | 简化地图/城市位置/势力分布 |
| P2-F04 | 派系详情页面 | 6h | 派系信息/成员列表/声誉排行 |
| P2-F05 | 技能树展示 | 6h | 技能树组件/解锁条件/进度显示 |
| P2-F06 | 多语言支持 | 8h | i18n配置/英文翻译 |
| **前端总计** | - | **44h** | - |

#### P2-后端任务

| 任务ID | 任务名称 | 工作量 | 技术要点 |
|--------|---------|--------|---------|
| P2-B01 | NPC对话生成 | 12h | 对话Prompt设计/对话上下文管理 |
| P2-B02 | 遗产继承机制 | 8h | 遗产计算/继承规则/奖励分配 |
| P2-B03 | 关系循环完整实现 | 10h | 关系变化→影响→变化完整循环 |
| P2-B04 | 权力循环模拟 | 10h | 权威→斗争→重组循环 |
| P2-B05 | 冲突爆发算法 | 8h | 冲突检测/事件生成/解决机制 |
| P2-B06 | 完整Prompt三层 | 8h | L1/L2/L3完整实现/场景细分 |
| P2-B07 | NPC记忆系统 | 10h | 长期记忆/短期记忆/对话上下文 |
| P2-B08 | 性能优化 | 6h | 批量处理/缓存策略/查询优化 |
| **后端总计** | - | **74h** | - |

#### P2-测试任务

| 任务ID | 任务名称 | 工作量 | 技术要点 |
|--------|---------|--------|---------|
| P2-T01 | 前端单元测试 | 8h | Vitest + React Testing Library |
| P2-T02 | 后端单元测试 | 8h | Jest + Supertest |
| P2-T03 | Agent集成测试 | 6h | Agent调度测试/LLM输出验证 |
| P2-T04 | E2E测试 | 6h | Playwright/核心流程测试 |
| **测试总计** | - | **30h** | - |

**P2总工作量：148小时 ≈ 19个工作日**

---

## 六、开发阶段规划

### Phase 1: MVP基础 (Week 1-3)

**目标**：完成P0任务，上线可玩MVP版本

#### Week 1: 基础架构搭建
- P0-F01 项目初始化
- P0-F02 Zustand状态库
- P0-F03 Axios API层
- P0-B01 项目初始化
- P0-B02 Prisma Schema
- P0-B03 PostgreSQL配置
- P0-B04 Redis配置

#### Week 2: 核心服务开发
- P0-B05 LLM服务集成
- P0-B06 Prompt构建器
- P0-B07 Chronos Agent
- P0-B08 NPC Agent(简化)
- P0-B09 世界状态服务
- P0-B10 玩家服务

#### Week 3: 前端页面与部署
- P0-F04 小说阅读页面
- P0-F05 玩家状态页面
- P0-F06 游戏决策页面
- P0-F07 世界概览页面
- P0-F08 角色创建页面
- P0-F09 死亡叙事页面
- P0-B13 API路由
- P0-D01-D05 部署配置

**Phase 1里程碑**：
- ✅ 玩家可创建角色
- ✅ 玩家可阅读每日小说
- ✅ 玩家可做出决策(AP消耗)
- ✅ 世界状态随决策变化
- ✅ 角色死亡后生成死亡叙事

---

### Phase 2: 核心体验增强 (Week 4-5)

**目标**：完成P1任务，提升用户体验

#### Week 4: Agent扩展与动画
- P1-F01 决策动画
- P1-F02 状态变化可视化
- P1-B01 National Agent
- P1-B02 City Agent
- P1-B03 批量NPC优化
- P1-B04 经济循环模拟

#### Week 5: 系统扩展
- P1-F03 小说章节导航
- P1-F04 NPC卡片详情
- P1-F05 事件历史页面
- P1-B05 派系系统
- P1-B06 技能系统
- P1-I01 WebSocket通知
- P1-I02 多LLM切换

**Phase 2里程碑**：
- ✅ 多国家/多城市世界
- ✅ 经济循环运转
- ✅ 派系系统上线
- ✅ 决策体验优化(动画/历史)
- ✅ WebSocket关键事件通知

---

### Phase 3: 完整体验 (Week 6-7)

**目标**：完成P2任务，打造完整游戏体验

#### Week 6: 高级功能开发
- P2-F01 NPC对话界面
- P2-F02 遗产继承界面
- P2-F03 世界地图可视化
- P2-B01 NPC对话生成
- P2-B02 遗产继承机制
- P2-B03 关系循环
- P2-B04 权力循环

#### Week 7: 系统完善与测试
- P2-F04 派系详情页面
- P2-F05 技能树展示
- P2-B05 冲突爆发算法
- P2-B06 完整Prompt三层
- P2-B07 NPC记忆系统
- P2-B08 性能优化
- P2-T01-T04 测试覆盖

**Phase 3里程碑**：
- ✅ NPC对话系统上线
- ✅ 遗产继承机制
- ✅ 完整社会循环(经济/权力/关系)
- ✅ 世界地图可视化
- ✅ 测试覆盖率>80%

---

### 开发总览

| Phase | 时长 | 工作量 | 核心产出 |
|-------|------|--------|---------|
| Phase 1 | 3周 | 142h | MVP可玩版本 |
| Phase 2 | 2周 | 92h | 核心体验增强 |
| Phase 3 | 2周 | 148h | 完整游戏体验 |
| **总计** | **7周** | **382h** | **完整产品** |

---

## 附录

### A. 成本预估

| 成本项 | 月费用 | 备注 |
|--------|--------|------|
| LLM API | ¥284 | GLM-4主力 + Qwen备用 |
| Vercel部署 | ¥0 | 免费额度足够 |
| Railway部署 | $5/月 | 容器+PostgreSQL+Redis |
| 域名(可选) | ¥50/年 | .com域名 |
| **月成本** | **≈¥320** | MVP阶段 |

### B. 技术栈版本锁定

```json
{
  "frontend": {
    "react": "18.2.0",
    "typescript": "5.3.0",
    "tailwindcss": "3.4.0",
    "zustand": "4.4.0",
    "react-query": "5.0.0",
    "vite": "5.0.0"
  },
  "backend": {
    "node": "20.10.0",
    "express": "4.18.0",
    "prisma": "5.7.0",
    "ioredis": "5.3.0",
    "node-cron": "3.0.0"
  },
  "llm": {
    "zhipu": "glm-4",
    "qwen": "qwen-plus"
  }
}
```

### C. 关键API端点清单(P0)

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/world/status` | GET | 获取世界状态 |
| `/api/player/create` | POST | 创建角色 |
| `/api/player/status` | GET | 获取玩家状态 |
| `/api/player/action` | POST | 玩家决策 |
| `/api/news/today` | GET | 今日小说章节 |
| `/api/news/history` | GET | 历史章节列表 |
| `/api/events/list` | GET | 当前事件列表 |
| `/api/npc/list` | GET | NPC列表 |

---

*文档完成于 2026-04-17*
*基于完整设计文档分析生成*
*Technical Architect - Claude*