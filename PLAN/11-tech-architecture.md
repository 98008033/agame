# 技术架构

## 十一、技术架构

### 11.1 技术栈

**前端（微信小游戏/H5）**：
- 引擎：Cocos Creator 3.x 或 纯Web（文字为主，引擎需求低）
- 语言：TypeScript
- UI：自定义文本+选择UI组件

**后端**：
- 语言：Node.js / Go
- 框架：NestJS / Gin
- 数据库：PostgreSQL + Redis
- 消息队列：Redis / RabbitMQ
- LLM接入：统一封装层

**部署**：
- 云服务：腾讯云（微信生态）
- 容器：Docker

### 11.2 状态存储

```json
{
  "world": {
    "day": 1247,
    "season": "autumn",
    "phase": "tension_rising",
    "global_events": ["ancient_seal_weakening"],
    "balance_index": {
      "canglong": 0.30,
      "shuanglang": 0.25,
      "jinque": 0.30,
      "border": 0.15
    }
  },
  "kingdoms": {
    "canglong": {
      "military": 85, "economy": 70, "magic": 60,
      "stability": 75, "population": 8000000,
      "relations": {"shuanglang": -40, "jinque": 10, "border": -20},
      "internal_conflict": 0.6,
      "active_events": ["prince_succession"],
      "npcs": [...]
    },
    "shuanglang": { ... },
    "jinque": { ... },
    "border_alliance": { ... }
  },
  "player": {
    "faction": "border",
    "allegiance": null,
    "location": "border/dusk_village",
    "level": 12,
    "title": "村长",
    "stats": {
      "统治力": 35, "军事力": 20, "外交力": 50,
      "商业力": 30, "魔法力": 15
    },
    "reputation": {
      "canglong": 10, "shuanglang": -5,
      "jinque": 0, "border": 80
    },
    "skills": [...],
    "inventory": [...],
    "village": {
      "name": "暮光村",
      "population": 156,
      "buildings": [...],
      "resources": {...}
    },
    "active_quests": [...],
    "relationships": {
      "npc_001": {"relation": 80, "memory": [...]},
      "npc_002": {"relation": -20, "memory": [...]}
    },
    "season_progress": {
      "tasks_completed": 3,
      "total_tasks": 8,
      "rank": "bronze"
    }
  }
}
```

---

