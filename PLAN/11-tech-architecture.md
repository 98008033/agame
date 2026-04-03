# 技术架构

> **MVP 技术栈**：Web优先、叙事核心、快速上线

---

## 技术栈（MVP）

### 前端

| 技术 | 用途 | 说明 |
|------|------|------|
| **React 18** | UI框架 | 函数组件 + Hooks |
| **TypeScript** | 类型安全 | 严格模式 |
| **Tailwind CSS** | 样式 | 快速开发 |
| **Zustand** | 状态管理 | 轻量级，无需Redux |
| **React Query** | 数据获取 | 缓存、自动重试 |

**页面结构**（4个核心页面）：
```
┌─────────────────────────────────────────────────────────┐
│  页面1: 晨报阅读页                                       │
│  - 顶部：日期 + 游戏阶段                                  │
│  - 主体：四国新闻列表（滚动阅读）                         │
│  - 底部：「我的事件」「个人状态」入口                     │
├─────────────────────────────────────────────────────────┤
│  页面2: 个人事件页                                       │
│  - 待处理事件列表                                         │
│  - 每个事件：标题 + 简介 + 「处理」按钮                   │
├─────────────────────────────────────────────────────────┤
│  页面3: 决策页                                           │
│  - 事件描述（打字机效果呈现）                             │
│  - 2-4个选项按钮                                         │
│  - 选择后立即显示结果                                     │
├─────────────────────────────────────────────────────────┤
│  页面4: 个人状态页                                       │
│  - 五维属性（统治/军事/外交/商业/魔法）                   │
│  - 四国声望值                                           │
│  - 历史决策记录                                         │
└─────────────────────────────────────────────────────────┘
```

### 后端

| 技术 | 用途 | 说明 |
|------|------|------|
| **Node.js 20** | 运行时 | LTS版本 |
| **Express 4** | Web框架 | 轻量，够用 |
| **PostgreSQL 15** | 主数据库 | 世界状态、玩家数据 |
| **Redis** | 缓存 + 队列 | LLM响应缓存、定时任务 |
| **node-cron** | 定时任务 | Agent唤醒调度 |

### LLM 接入

| 层级 | 模型 | 使用场景 | 日调用量 |
|------|------|----------|----------|
| Tier 1 | Claude 3.5 Sonnet | 晨报生成、重大事件 | ~1次/天 |
| Tier 2 | GPT-3.5 | NPC对话、普通事件 | ~50次/天 |
| Tier 3 | 模板填充 | 标准回复、资源提示 | 本地处理 |

---

## 系统架构

```
┌──────────────────────────────────────────────────────────────┐
│                        用户浏览器                             │
│                    React SPA (Vercel)                        │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────┴──────────────────────────────────┐
│                      API Gateway                              │
│         Express + Rate Limit + Auth Middleware                │
└───────────────────────────┬──────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐  ┌─────────────────┐  ┌──────────────┐
│   Agent系统    │  │     游戏逻辑     │  │    状态存储   │
│  Chronos      │  │  - 事件处理      │  │  PostgreSQL  │
│  国家Agent     │  │  - 决策计算      │  │  Redis       │
│  NPC Agent    │  │  - 状态更新      │  └──────────────┘
└───────┬───────┘  └─────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│                      LLM Provider                             │
│            Claude API / OpenAI API                           │
└──────────────────────────────────────────────────────────────┘
```

---

## 数据库设计（MVP简化版）

### 核心表结构

```sql
-- 世界状态表（单表存储全局状态）
CREATE TABLE world_state (
    id SERIAL PRIMARY KEY,
    day INTEGER NOT NULL,              -- 游戏日
    phase VARCHAR(20),                 -- 当前阶段
    season VARCHAR(10),                -- 季节
    balance JSONB,                     -- 四国实力指数
    global_events JSONB,               -- 全局事件
    created_at TIMESTAMP DEFAULT NOW()
);

-- 国家状态表
CREATE TABLE kingdoms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(20) NOT NULL,         -- canglong/shuanglang/jinque/border
    military INTEGER,                  -- 军事实力
    economy INTEGER,                   -- 经济实力
    magic INTEGER,                     -- 魔法实力
    stability INTEGER,                 -- 稳定度
    relations JSONB,                   -- 与其他国家关系
    active_events JSONB,               -- 活跃事件
    updated_at TIMESTAMP
);

-- 玩家表
CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE,        -- 外部用户ID
    faction VARCHAR(20),               -- 所属阵营
    level INTEGER DEFAULT 1,           -- 等级
    title VARCHAR(50),                 -- 头衔
    stats JSONB,                       -- 五维属性
    reputation JSONB,                  -- 四国声望
    relationships JSONB,               -- NPC关系
    created_at TIMESTAMP
);

-- 事件表
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id),
    event_type VARCHAR(50),            -- 事件类型
    title VARCHAR(200),                -- 事件标题
    description TEXT,                  -- 事件描述
    choices JSONB,                     -- 可选项
    status VARCHAR(20),                -- pending/completed/expired
    created_at TIMESTAMP
);

-- 决策历史表
CREATE TABLE decisions (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id),
    event_id INTEGER REFERENCES events(id),
    choice_index INTEGER,              -- 选择的选项
    consequences JSONB,                -- 后果
    made_at TIMESTAMP
);

-- 晨报缓存表
CREATE TABLE daily_news (
    id SERIAL PRIMARY KEY,
    day INTEGER NOT NULL,
    news JSONB,                        -- [{country, content}]
    generated_at TIMESTAMP
);
```

---

## API 设计

### 核心端点

```
GET  /api/world/news          获取今日晨报
GET  /api/player/events       获取玩家待处理事件
POST /api/player/decision     提交决策
GET  /api/player/status       获取玩家状态
GET  /api/player/history      获取决策历史
```

### 决策提交流程

```
POST /api/player/decision
Request:
{
  "event_id": 123,
  "choice_index": 1
}

Response:
{
  "success": true,
  "consequences": {
    "reputation_change": {"canglong": 10, "shuanglang": -5},
    "stats_change": {"diplomacy": 2},
    "new_events": ["event_456"],
    "narrative": "你选择庇护废太子..."
  }
}
```

---

## 部署架构

### 开发环境

```
本地开发：
  - 前端：npm run dev (Vite)
  - 后端：npm run dev (nodemon)
  - 数据库：Docker Compose (Postgres + Redis)
```

### 生产环境（MVP）

```
前端：Vercel (自动部署)
后端：Railway / Fly.io
数据库：Railway Postgres + Upstash Redis
监控：Vercel Analytics + Railway Logs
```

---

## LLM 调用优化

### 成本策略

```
1. 缓存机制
   - 相同状态的事件生成复用结果
   - NPC常用回复模板化存储

2. 批处理
   - 多个事件合并为一次LLM调用
   - 预测可能的玩家选择提前生成

3. 降级策略
   - LLM服务不可用时，使用模板填充
   - 重大事件才调用 Claude，普通事件用 GPT-3.5
```

### 预估成本

| 场景 | 模型 | 日调用 | 月成本 |
|------|------|--------|--------|
| 晨报生成 | Claude Sonnet | 30次 | ~$30 |
| 事件响应 | GPT-3.5 | 1500次 | ~$20 |
| NPC对话 | GPT-3.5 | 500次 | ~$10 |
| **总计** | | | **~$60/月** |

---

## 安全考虑

```
1. API 限流
   - 每个用户每10秒最多1次决策提交
   - 防止刷接口导致LLM费用暴增

2. 输入验证
   - 严格验证所有决策参数
   - 防止注入攻击

3. LLM 输出过滤
   - 检测并过滤不当内容
   - 保持世界观一致性

4. 数据隔离
   - 玩家数据严格隔离
   - 世界状态只读，Agent写入
```

---

## 性能目标

| 指标 | 目标 | 说明 |
|------|------|------|
| 页面首屏 | < 2s | 静态资源CDN加速 |
| API响应 | < 500ms | 缓存热点数据 |
| LLM响应 | < 5s | 异步加载，显示loading |
| 并发用户 | 100 | MVP阶段目标 |

---

## 扩展规划

### Phase 2（上线后）

- 技能树系统 → 增加属性计算
- WebSocket → 实时推送重要事件
- 战斗系统 → 增加战斗表
- 赛季系统 → 增加赛季表

### Phase 3（规模扩大）

- CDN 全球部署
- 数据库读写分离
- 引入消息队列（RabbitMQ）
- 微服务拆分
