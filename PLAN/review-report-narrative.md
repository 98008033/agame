# Agame 叙事系统视角设计文档审查报告

> 审查日期: 2026-04-03
> 审查者: 叙事系统设计师
> 审查范围: Agent架构、经济系统、视觉风格指南

---

## 一、总体一致性评估

| 文档 | 与叙事系统一致性 | 评分 | 主要问题 |
|-----|----------------|------|---------|
| Agent架构 (`docs/agent-architecture.md`) | 高度一致 | ⭐⭐⭐⭐⭐ (5/5) | 无重大问题 |
| 经济系统 (`16-economy-social-system.md`) | 基本一致 | ⭐⭐⭐⭐☆ (4/5) | 需补充叙事反馈接口 |
| 视觉风格 (`17-visual-style-guide.md`) | 需协调 | ⭐⭐⭐☆☆ (3/5) | 未涉及叙事呈现风格 |

---

## 二、Agent架构审查

### ✅ 高度一致点

1. **四级Agent层级与叙事层级完全匹配**
   - 世界级Agent(Chronos) → 生成主线叙事(四国大事件)
   - 国家级Agent(天命司/先祖议会/黄金议会) → 国家叙事
   - 城邦级Agent → 支线叙事
   - 普通级Agent → NPC个人故事

2. **Prompt三层设计支持叙事模板化**
   - L1系统层: 固定世界观设定
   - L2场景层: 动态世界状态
   - L3任务层: 具体叙事指令
   - 完美契合叙事系统的`chapterGenerationPrompt`结构

3. **层级间通信协议支持叙事传播**
   - `world:event_generated` → 触发主线叙事
   - `nation:policy_issued` → 国家政策叙事
   - `city:event_local` → 地方事件叙事

### 📋 建议补充

| 建议项 | 优先级 | 说明 |
|-------|-------|------|
| 添加`narrative`输出类型 | P1 | Agent输出应支持`NarrativeEvent`类型 |
| 定义叙事记忆接口 | P1 | Agent需记住已生成的重要叙事节点 |
| 增加风格控制参数 | P2 | `style: 'historical' | 'dramatic' | 'concise'` |

### 代码补充建议

```typescript
// 在AgentPlan.output中增加叙事支持
interface AgentPlan {
  output: {
    format: 'json' | 'text' | 'structured' | 'narrative';  // 新增narrative
    narrativeConfig?: {                                   // 新增
      style: 'historical_romance' | 'political_drama' | 'military';
      perspective: 'omniscient' | 'faction' | 'character';
      length: 'brief' | 'standard' | 'detailed';  // 100/300/500字
      targetChapter?: string;  // 关联的小说章节
    };
    // ...
  };
}

// 叙事事件类型
interface NarrativeEvent {
  id: string;
  source: string;  // Agent ID
  timestamp: number;
  content: {
    title: string;
    body: string;  // 叙事正文
    perspective: string;  // 视角角色/阵营
    location: string;
  };
  importance: 'minor' | 'moderate' | 'major' | 'epochal';
  tags: string[];
  relatedCharacters: string[];
}
```

---

## 三、经济系统审查

### ✅ 一致点

1. **资源变化必须伴随叙事反馈** ✓
   - 经济系统明确要求: "金币增加必须伴随叙事反馈"
   - 与叙事系统的"活的历史"理念一致

2. **关系等级与NPC对话** ✓
   - 社会系统定义了-100~+100的关系等级
   - 可映射到叙事系统的NPC态度描述

### ⚠️ 需协调点

| 问题 | 影响 | 建议 |
|-----|------|------|
| 经济系统未定义叙事接口 | 经济变化无法自动触发叙事 | 增加`EconomyNarrativeBridge` |
| 关系变化缺少叙事模板 | 每次关系变化需重复写叙事 | 定义标准关系变化叙事模板 |

### 建议实现

```typescript
// 经济-叙事桥接器
interface EconomyNarrativeBridge {
  // 资源变化 → 叙事事件
  onResourceChange(event: ResourceChangeEvent): NarrativeEvent {
    const templates = {
      gold_increase: [
        "{{source}}今日上缴了税金 {{amount}}金币",
        "完成{{task}}，获得奖励 {{amount}}金币",
        "{{npc}}赠与你 {{amount}}金币作为谢礼"
      ],
      influence_increase: [
        "你在{{location}}的名声传播开来，影响力 +{{amount}}",
        "{{npc}}大人记住了你的帮助，影响力 +{{amount}}"
      ]
    };

    return this.generateNarrative(templates[event.type], event);
  }
}
```

---

## 四、视觉风格审查

### ⚠️ 缺失项

视觉风格指南(`17-visual-style-guide.md`)主要关注UI组件和美术风格，**缺少叙事呈现的视觉规范**。

### 建议补充

```
叙事呈现视觉规范：

1. 小说阅读器样式
   - 字体: 思源宋体(中文正文) / 明朝体(章节标题)
   - 字号: 18px(正文) / 28px(标题)
   - 行高: 1.8
   - 背景: 仿古纸色 #F5F0E1

2. 叙事层级视觉区分
   - 主线叙事: 左侧金色边框
   - 支线叙事: 左侧银色边框
   - 玩家插叙: 左侧玩家阵营色边框

3. 交互元素
   - 选择按钮: 古风卷轴样式
   - 悬停效果: 墨滴晕染动画
```

---

## 五、一致性改进建议

### P1 (必须)

1. **Agent输出增加`narrative`类型**
   - 修改`AgentPlan.output.format`定义
   - 增加`NarrativeEvent`接口

2. **经济系统接入叙事桥接**
   - 所有资源变化自动触发叙事
   - 关系变化使用标准叙事模板

### P2 (建议)

1. **视觉风格增加叙事呈现规范**
2. **Agent记忆增加叙事节点记忆**
3. **统一Prompt变量命名规范**

---

## 六、审查结论

**总体评价**: 架构设计基本满足叙事系统需求，Agent层级与叙事层级高度匹配。

**关键行动项**:
1. 补充`NarrativeEvent`输出类型 (1天)
2. 实现`EconomyNarrativeBridge` (2天)
3. 补充叙事视觉规范 (1天)

**风险点**: 经济系统与叙事系统的桥接未在设计中明确，需在开发初期实现原型验证。
