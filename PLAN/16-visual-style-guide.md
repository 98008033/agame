# 游戏视觉风格指南

> **设计理念**：中国水墨风 + 轻度奇幻元素，营造史诗感、神秘感和叙事感。色调淡雅古朴，有历史沉淀感。

---

## 一、设计原则

### 1.1 核心设计哲学

```
┌─────────────────────────────────────────────────────────┐
│  设计目标                                                │
├─────────────────────────────────────────────────────────┤
│  • 叙事优先 - 视觉服务于故事，而非喧宾夺主               │
│  • 文化根基 - 根植于中国传统文化美学                     │
│  • 沉浸体验 - 让玩家感觉在阅读一本活着的古书             │
│  • Web友好 - 保证在浏览器中的性能与可读性                │
└─────────────────────────────────────────────────────────┘
```

### 1.2 MVP设计原则

- **简化视觉元素**：Web版本优先使用文字和简单图形
- **CSS动画优先**：避免复杂Canvas/WebGL动画
- **响应式设计**：适配手机和桌面端
- **性能优先**：保证首屏加载 < 3秒

---

## 二、色彩系统

### 2.1 主色调

| 颜色名称 | 色值 | 用途 |
|----------|------|------|
| **墨色** | `#1a1a1a` | 正文、边框、深色背景 |
| **淡墨** | `#4a4a4a` | 次级文字、分隔线 |
| **宣纸黄** | `#f5f0e6` | 主背景、面板底色 |
| **古宣** | `#e8e0d0` | 次级背景、卡片底色 |
| **朱砂红** | `#c9372c` | 强调色、重要按钮、警示 |
| **石青** | `#2d5a7b` | 次要强调、链接、信息 |
| **赭石** | `#8b4513` | 装饰元素、边框点缀 |

### 2.2 阵营色彩体系

#### 苍龙帝国 - 墨绿 + 金色

| 颜色名称 | 色值 | 用途 |
|----------|------|------|
| 苍龙墨绿 | `#1e3a2f` | 主标识色 |
| 苍龙青 | `#3d6b54` | 辅助色、hover状态 |
| 苍龙金 | `#c9a227` | 强调色、高亮文字 |
| 苍龙淡金 | `#f4e8c1` | 背景点缀 |

#### 霜狼联邦 - 冰蓝 + 银白

| 颜色名称 | 色值 | 用途 |
|----------|------|------|
| 霜狼深蓝 | `#1e3a5f` | 主标识色 |
| 霜狼冰蓝 | `#6b9dc7` | 辅助色、hover状态 |
| 霜狼银 | `#a8b8c8` | 强调色、边框 |
| 霜狼雪白 | `#f0f4f8` | 背景点缀 |

#### 金雀花王国 - 暖黄 + 赭石

| 颜色名称 | 色值 | 用途 |
|----------|------|------|
| 金雀暖黄 | `#b8860b` | 主标识色 |
| 金雀琥珀 | `#daa520` | 辅助色、hover状态 |
| 金雀赭石 | `#8b4513` | 强调色、边框 |
| 金雀米黄 | `#faf0e6` | 背景点缀 |

#### 边境联盟 - 土褐 + 灰白

| 颜色名称 | 色值 | 用途 |
|----------|------|------|
| 边境土褐 | `#5c4033` | 主标识色 |
| 边境褐 | `#8b7355` | 辅助色、hover状态 |
| 边境灰 | `#808080` | 强调色、边框 |
| 边境米白 | `#f5f5dc` | 背景点缀 |

### 2.3 CSS变量定义

```css
:root {
  /* 主色调 */
  --ink-black: #1a1a1a;
  --ink-light: #4a4a4a;
  --paper-bg: #f5f0e6;
  --paper-dark: #e8e0d0;
  --cinnabar: #c9372c;
  --stone-blue: #2d5a7b;
  --ochre: #8b4513;

  /* 阵营色 - 苍龙 */
  --canglong-primary: #1e3a2f;
  --canglong-secondary: #3d6b54;
  --canglong-accent: #c9a227;
  --canglong-light: #f4e8c1;

  /* 阵营色 - 霜狼 */
  --shuanglang-primary: #1e3a5f;
  --shuanglang-secondary: #6b9dc7;
  --shuanglang-accent: #a8b8c8;
  --shuanglang-light: #f0f4f8;

  /* 阵营色 - 金雀花 */
  --jinque-primary: #b8860b;
  --jinque-secondary: #daa520;
  --jinque-accent: #8b4513;
  --jinque-light: #faf0e6;

  /* 阵营色 - 边境 */
  --border-primary: #5c4033;
  --border-secondary: #8b7355;
  --border-accent: #808080;
  --border-light: #f5f5dc;

  /* 功能色 */
  --text-primary: #1a1a1a;
  --text-secondary: #4a4a4a;
  --text-muted: #808080;
  --border-color: #d4c8b8;
  --shadow-color: rgba(26, 26, 26, 0.1);
}
```

---

## 三、字体系统

### 3.1 字体选择

#### 标题字体

| 字体 | 用途 | 备选方案 |
|------|------|----------|
| **思源宋体 (Source Han Serif)** | 主标题、章节标题 | Adobe开源，多字重 |
| **方正清刻本悦宋** | 特殊标题、引文 | 商用需授权 |
| **站酷文艺体** | 装饰性文字、LOGO | 免费商用 |

#### 正文字体

| 字体 | 用途 | 备选方案 |
|------|------|----------|
| **思源宋体** | 正文、描述 | 优先使用 |
| **Noto Serif SC** | 正文备选 | Google Fonts |
| **系统宋体** | 后备字体 |  serif |

#### UI字体

| 字体 | 用途 | 备选方案 |
|------|------|----------|
| **思源黑体 (Source Han Sans)** | 按钮、标签 | Adobe开源 |
| **Noto Sans SC** | UI备选 | Google Fonts |
| **系统黑体** | 后备字体 | sans-serif |

### 3.2 字体规格

```css
/* 字体导入 */
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&family=Noto+Sans+SC:wght@400;500;700&display=swap');

/* 字体栈 */
--font-display: 'Source Han Serif SC', 'Noto Serif SC', 'SimSun', serif;
--font-body: 'Source Han Serif SC', 'Noto Serif SC', 'SimSun', serif;
--font-ui: 'Source Han Sans SC', 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
```

#### 字号规范

| 元素 | 字号 | 字重 | 行高 | 用途 |
|------|------|------|------|------|
| 页面大标题 | 32px | 700 | 1.3 | 游戏标题、章节标题 |
| 页面小标题 | 24px | 600 | 1.4 | 区域标题 |
| 卡片标题 | 20px | 600 | 1.4 | 新闻标题、事件标题 |
| 正文大 | 18px | 400 | 1.8 | 重要描述文字 |
| 正文标准 | 16px | 400 | 1.8 | 普通正文 |
| 正文小 | 14px | 400 | 1.6 | 辅助说明 |
| 标签文字 | 12px | 500 | 1.4 | 标签、时间戳 |
| 按钮文字 | 16px | 500 | 1 | 按钮内文字 |

### 3.3 NPC对话样式

```css
/* NPC对话基础样式 */
.npc-dialogue {
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.8;
  color: var(--text-primary);
  padding: 16px 20px;
  background: linear-gradient(to right, var(--paper-dark) 0%, transparent 100%);
  border-left: 3px solid var(--npc-faction-color);
  border-radius: 0 8px 8px 0;
}

/* 阵营特定颜色 */
.npc-dialogue.canglong { --npc-faction-color: var(--canglong-accent); }
.npc-dialogue.shuanglang { --npc-faction-color: var(--shuanglang-secondary); }
.npc-dialogue.jinque { --npc-faction-color: var(--jinque-primary); }
.npc-dialogue.border { --npc-faction-color: var(--border-secondary); }
```

---

## 四、UI组件设计

### 4.1 按钮组件

#### 主按钮（竹简样式）

```css
.btn-primary {
  /* 基础样式 */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 32px;
  font-family: var(--font-ui);
  font-size: 16px;
  font-weight: 500;
  color: var(--paper-bg);
  background: linear-gradient(180deg, var(--ochre) 0%, #6b3410 100%);
  border: 2px solid var(--ochre);
  border-radius: 4px;
  cursor: pointer;
  position: relative;
  overflow: hidden;

  /* 竹简纹理 */
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.2),
    inset 0 -1px 0 rgba(0,0,0,0.3),
    0 2px 4px var(--shadow-color);

  /* 竹节装饰 */
  &::before,
  &::after {
    content: '';
    position: absolute;
    left: 8px;
    right: 8px;
    height: 2px;
    background: rgba(0,0,0,0.2);
  }
  &::before { top: 6px; }
  &::after { bottom: 6px; }

  /* Hover效果 */
  &:hover {
    background: linear-gradient(180deg, #9c5520 0%, var(--ochre) 100%);
    transform: translateY(-1px);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.2),
      inset 0 -1px 0 rgba(0,0,0,0.3),
      0 4px 8px var(--shadow-color);
  }

  /* Active效果 */
  &:active {
    transform: translateY(0);
    box-shadow:
      inset 0 2px 4px rgba(0,0,0,0.3),
      0 1px 2px var(--shadow-color);
  }
}
```

#### 次要按钮（卷轴样式）

```css
.btn-secondary {
  padding: 10px 24px;
  font-family: var(--font-ui);
  font-size: 14px;
  font-weight: 500;
  color: var(--ink-black);
  background: var(--paper-bg);
  border: 2px solid var(--border-color);
  border-radius: 2px;
  cursor: pointer;

  /* 卷轴边角 */
  border-radius: 2px 12px 12px 2px;

  /* 微卷效果 */
  box-shadow:
    2px 2px 0 var(--border-color),
    inset -1px 0 2px rgba(0,0,0,0.05);

  &:hover {
    background: var(--paper-dark);
    border-color: var(--ochre);
  }
}
```

#### 阵营按钮

```css
/* 苍龙按钮 */
.btn-canglong {
  background: linear-gradient(180deg, var(--canglong-primary) 0%, #152a22 100%);
  border-color: var(--canglong-accent);
  color: var(--canglong-light);
}

/* 霜狼按钮 */
.btn-shuanglang {
  background: linear-gradient(180deg, var(--shuanglang-primary) 0%, #152842 100%);
  border-color: var(--shuanglang-secondary);
  color: var(--shuanglang-light);
}

/* 金雀花按钮 */
.btn-jinque {
  background: linear-gradient(180deg, var(--jinque-primary) 0%, #8b6508 100%);
  border-color: var(--jinque-secondary);
  color: var(--jinque-light);
}

/* 边境按钮 */
.btn-border {
  background: linear-gradient(180deg, var(--border-primary) 0%, #3d2b22 100%);
  border-color: var(--border-secondary);
  color: var(--border-light);
}
```

### 4.2 面板组件

#### 宣纸面板

```css
.panel-paper {
  background: var(--paper-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 24px;

  /* 宣纸纹理效果 */
  background-image:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0,0,0,0.02) 2px,
      rgba(0,0,0,0.02) 4px
    );

  /* 微卷边角 */
  box-shadow:
    0 1px 3px var(--shadow-color),
    inset 0 1px 0 rgba(255,255,255,0.5);

  /* 边角装饰 */
  position: relative;
  &::before {
    content: '';
    position: absolute;
    top: -1px;
    left: 20px;
    right: 20px;
    height: 2px;
    background: var(--ochre);
    opacity: 0.3;
  }
}
```

#### 古书页面板

```css
.panel-book {
  background: linear-gradient(to right, var(--paper-bg) 0%, var(--paper-dark) 100%);
  border-left: 4px solid var(--ochre);
  border-radius: 0 8px 8px 0;
  padding: 20px 24px;
  position: relative;

  /* 书页阴影 */
  box-shadow:
    -2px 0 4px rgba(0,0,0,0.1),
    2px 2px 8px var(--shadow-color);

  /* 装订线效果 */
  &::before {
    content: '';
    position: absolute;
    left: 8px;
    top: 12px;
    bottom: 12px;
    width: 1px;
    background: repeating-linear-gradient(
      to bottom,
      var(--border-color) 0px,
      var(--border-color) 4px,
      transparent 4px,
      transparent 8px
    );
  }
}
```

### 4.3 分隔线组件

#### 水墨分隔线

```css
.divider-ink {
  height: 2px;
  background: linear-gradient(
    to right,
    transparent 0%,
    var(--ink-light) 20%,
    var(--ink-black) 50%,
    var(--ink-light) 80%,
    transparent 100%
  );
  margin: 24px 0;
  opacity: 0.6;
}

/* 竖向分隔线（毛笔效果） */
.divider-brush {
  width: 2px;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    var(--ink-black) 10%,
    var(--ink-black) 90%,
    transparent 100%
  );
  opacity: 0.4;
}
```

### 4.4 图标系统

#### 图标风格规范

- **风格**：简笔水墨风，单色线条
- **线条粗细**：2px
- **圆角**：2px
- **尺寸**：16px（小）、24px（标准）、32px（大）、48px（装饰）

#### 图标使用

```css
.icon {
  display: inline-block;
  width: 24px;
  height: 24px;
  stroke: currentColor;
  stroke-width: 2;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* 图标容器 */
.icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-radius: 4px;
  background: var(--paper-dark);
  border: 1px solid var(--border-color);
}
```

#### 核心图标列表

| 图标 | 用途 | 描述 |
|------|------|------|
| 🏛️ | 阵营/国家 | 宫殿轮廓 |
| ⚔️ | 战斗/军事 | 交叉剑 |
| 💰 | 金币/财富 | 古钱币 |
| ✨ | 影响力/声望 | 星光 |
| 📜 | 事件/任务 | 卷轴 |
| 👤 | 人物/NPC | 人物剪影 |
| 📰 | 晨报 | 报纸/竹简 |
| ⚙️ | 设置 | 齿轮 |
| ❌ | 关闭 | 叉号 |
| ✅ | 确认 | 对勾 |

---

## 五、页面设计

### 5.1 晨报阅读页

#### 布局结构

```
┌─────────────────────────────────────────────────────────┐
│  [顶部栏]                                                │
│  日期: 第127天  ·  季节: 深秋  ·  [设置]                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ★ 埃拉西亚晨报 ★                                │   │
│  │                                                 │   │
│  │  ┌────────┐  苍龙帝国                            │   │
│  │  │ [苍龙] │  大皇子在朝会上弹劾首辅...           │   │
│  │  └────────┘                                     │   │
│  │                                                 │   │
│  │  ┌────────┐  霜狼联邦                            │   │
│  │  │ [霜狼] │  血狼部族拒绝缴纳矿税...             │   │
│  │  └────────┘                                     │   │
│  │                                                 │   │
│  │  ┌────────┐  金雀花王国                          │   │
│  │  │ [金雀] │  新航线开辟，海盗活动增加...         │   │
│  │  └────────┘                                     │   │
│  │                                                 │   │
│  │  ┌────────┐  边境联盟                            │   │
│  │  │ [边境] │  暮光村发生边境冲突...               │   │
│  │  └────────┘                                     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [今日事件]  你有3件待处理事件                   │   │
│  │  [前往处理 →]                                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 样式规范

```css
/* 晨报容器 */
.morning-news {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

/* 新闻条目 */
.news-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  margin-bottom: 12px;
  background: var(--paper-bg);
  border-left: 4px solid var(--faction-color);
  border-radius: 0 8px 8px 0;
  transition: all 0.3s ease;

  &:hover {
    background: var(--paper-dark);
    transform: translateX(4px);
  }
}

/* 阵营标签 */
.faction-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 4px;
  color: white;

  &.canglong { background: var(--canglong-primary); }
  &.shuanglang { background: var(--shuanglang-primary); }
  &.jinque { background: var(--jinque-primary); }
  &.border { background: var(--border-primary); }
}
```

#### 卷轴展开动画

```css
@keyframes scroll-unroll {
  from {
    opacity: 0;
    transform: scaleY(0.8) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scaleY(1) translateY(0);
  }
}

.news-item {
  animation: scroll-unroll 0.5s ease-out;
  animation-fill-mode: both;
}

/* 逐条延迟 */
.news-item:nth-child(1) { animation-delay: 0.1s; }
.news-item:nth-child(2) { animation-delay: 0.2s; }
.news-item:nth-child(3) { animation-delay: 0.3s; }
.news-item:nth-child(4) { animation-delay: 0.4s; }
```

### 5.2 决策页

#### 布局结构

```
┌─────────────────────────────────────────────────────────┐
│  [← 返回晨报]                                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                 │
│  │  [事件标题] 边境冲突                              │   │
│  │                                                 │   │
│  │  ─────────────────────────────────────────     │   │
│  │                                                 │   │
│  │  暮光村的侦察兵报告，有一小队霜狼战士在边境      │   │
│  │  游荡。他们声称只是"迷路"，但村民们很紧张。      │   │
│  │                                                 │   │
│  │  烈焰希望你能帮忙处理这件事...                   │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  你的选择：                                             │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [A] 亲自前往调查                                 │   │
│  │      消耗：影响力 -10                            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [B] 派人向霜狼交涉                               │   │
│  │      消耗：金币 -50                              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [C] 建议村民自行处理                             │   │
│  │      消耗：无，但关系可能受影响                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 样式规范

```css
/* 事件描述 */
.event-description {
  font-family: var(--font-body);
  font-size: 18px;
  line-height: 1.8;
  color: var(--text-primary);
  padding: 24px;
  background: var(--paper-bg);
  border-radius: 8px;
  margin-bottom: 24px;

  /* 打字机效果容器 */
  .typewriter-text {
    overflow: hidden;
    border-right: 2px solid var(--ink-black);
    white-space: nowrap;
    animation: typing 3s steps(40, end), blink-caret 0.75s step-end infinite;
  }
}

/* 选项按钮 */
.choice-button {
  width: 100%;
  padding: 20px 24px;
  margin-bottom: 16px;
  background: var(--paper-bg);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--ochre);
    background: var(--paper-dark);
    box-shadow: 0 4px 12px var(--shadow-color);
  }

  .choice-label {
    font-family: var(--font-ui);
    font-size: 14px;
    font-weight: 600;
    color: var(--ochre);
    margin-bottom: 4px;
  }

  .choice-text {
    font-family: var(--font-body);
    font-size: 16px;
    color: var(--text-primary);
  }

  .choice-cost {
    font-family: var(--font-ui);
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 8px;
  }
}
```

#### 打字机效果动画

```css
@keyframes typing {
  from { width: 0; }
  to { width: 100%; }
}

@keyframes blink-caret {
  from, to { border-color: transparent; }
  50% { border-color: var(--ink-black); }
}

/* 实际使用JS实现更可控的打字机效果 */
/* CSS动画仅作备用 */
```

### 5.3 个人状态页

#### 布局结构

```
┌─────────────────────────────────────────────────────────┐
│  [← 返回晨报]                                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐                                          │
│  │          │  玩家名称                                  │
│  │   头像   │  平民 · 暮光村居民                         │
│  │          │                                          │
│  └──────────┘  统治  ████████░░  78                      │
│               军事  ██████░░░░  56                      │
│               外交  ███████░░░  65                      │
│               商业  ████░░░░░░  42                      │
│               魔法  █████░░░░░  50                      │
│                                                         │
│  ─────────────────────────────────────────────────     │
│                                                         │
│  💰 金币: 1,250    ✨ 影响力: 320                       │
│                                                         │
│  ─────────────────────────────────────────────────     │
│                                                         │
│  [阵营声望]                                             │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐         │
│  │ 苍龙   │ │ 霜狼   │ │ 金雀花 │ │ 边境   │         │
│  │  +25   │ │  -10   │ │  +15   │ │  +60   │         │
│  └────────┘ └────────┘ └────────┘ └────────┘         │
│                                                         │
│  ─────────────────────────────────────────────────     │
│                                                         │
│  [最近决策]                                             │
│  · 第125天 - 帮助烈焰处理边境冲突                       │
│  · 第122天 - 拒绝天枢的效忠邀请                         │
│  · 第118天 - 投资商贸村货栈                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 样式规范

```css
/* 头像框 */
.avatar-frame {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 3px solid var(--ochre);
  padding: 4px;
  background: var(--paper-bg);
  box-shadow: 0 2px 8px var(--shadow-color);

  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }
}

/* 水墨风格进度条 */
.ink-progress {
  height: 8px;
  background: var(--paper-dark);
  border-radius: 4px;
  overflow: hidden;

  .ink-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--ink-light) 0%, var(--ink-black) 100%);
    border-radius: 4px;
    transition: width 0.5s ease;
    position: relative;

    /* 水墨晕染效果 */
    &::after {
      content: '';
      position: absolute;
      right: -4px;
      top: 0;
      bottom: 0;
      width: 8px;
      background: radial-gradient(ellipse at center, var(--ink-black) 0%, transparent 70%);
    }
  }
}

/* 阵营声望卡片 */
.reputation-card {
  padding: 16px;
  background: var(--paper-bg);
  border-radius: 8px;
  text-align: center;
  border-top: 3px solid var(--faction-color);

  .faction-name {
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 4px;
  }

  .reputation-value {
    font-size: 24px;
    font-weight: 700;
    color: var(--faction-color);
  }

  &.positive .reputation-value { color: var(--canglong-secondary); }
  &.negative .reputation-value { color: var(--cinnabar); }
}

/* 历史时间轴 */
.history-timeline {
  position: relative;
  padding-left: 24px;

  &::before {
    content: '';
    position: absolute;
    left: 6px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--border-color);
  }

  .timeline-item {
    position: relative;
    padding: 12px 0;

    &::before {
      content: '';
      position: absolute;
      left: -20px;
      top: 16px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--ochre);
    }

    .timeline-date {
      font-size: 12px;
      color: var(--text-muted);
    }

    .timeline-content {
      font-size: 14px;
      color: var(--text-primary);
    }
  }
}
```

---

## 六、插图风格指南

### 6.1 人物立绘风格

**风格描述**：
- 半写实水墨风，面部特征清晰可辨
- 服饰细节丰富，体现阵营特色
- 背景留白，突出人物主体
- 色彩淡雅，以墨色为主调

**尺寸建议**：
- 头像：100x100px（游戏内显示）
- 半身像：400x500px（对话界面）
- 全身像：600x900px（角色详情）

**阵营特色**：

| 阵营 | 服饰特点 | 配色 |
|------|----------|------|
| 苍龙帝国 | 宽袖长袍、玉带、发冠 | 墨绿、玄黑、金色点缀 |
| 霜狼联邦 | 毛皮、护甲、符文纹身 | 冰蓝、银白、深蓝 |
| 金雀花王国 | 精致礼服、珠宝、契约纹身 | 暖黄、赭石、金饰 |
| 边境联盟 | 务实短打、混搭风格 | 土褐、灰白、补丁 |

### 6.2 场景背景风格

**风格描述**：
- 写意山水画风，追求意境而非写实
- 大量留白，营造空间感
- 淡墨渲染，层次丰富
- 与UI元素和谐融合

**场景类型**：
- 天都：巍峨宫城，五行法阵微光
- 霜牙城：冰川裂谷，极光符文
- 金雀花城：港口商船，金库穹顶
- 暮光村：混交林、千年古树、三界交界

### 6.3 事件插图风格

**风格描述**：
- 连环画风格，叙事性强
- 关键场景捕捉，戏剧性构图
- 水墨笔触表现动态
- 配合文字增强沉浸感

---

## 七、动画规范

### 7.1 过渡动画

```css
/* 页面过渡 */
.page-transition {
  transition: opacity 0.3s ease;
}

/* 元素出现 */
.fade-in {
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 悬浮效果 */
.hover-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px var(--shadow-color);
  }
}
```

### 7.2 微交互动画

```css
/* 按钮点击反馈 */
.btn-click {
  transition: transform 0.1s ease;

  &:active {
    transform: scale(0.98);
  }
}

/* 加载动画 - 毛笔书写效果 */
@keyframes brush-writing {
  0% { stroke-dashoffset: 100; }
  100% { stroke-dashoffset: 0; }
}

/* 墨水扩散效果 */
@keyframes ink-spread {
  0% {
    transform: scale(0);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}
```

### 7.3 性能优化

- 使用 `transform` 和 `opacity` 进行动画（GPU加速）
- 避免动画 `width`、`height`、`top`、`left`
- 使用 `will-change` 提示浏览器优化
- 支持 `prefers-reduced-motion` 媒体查询

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 八、响应式设计

### 8.1 断点定义

| 断点 | 宽度范围 | 设备类型 |
|------|----------|----------|
| Mobile | < 640px | 手机 |
| Tablet | 640px - 1024px | 平板 |
| Desktop | > 1024px | 桌面 |

### 8.2 移动端适配

```css
/* 移动端布局调整 */
@media (max-width: 640px) {
  .morning-news {
    padding: 12px;
  }

  .news-item {
    flex-direction: column;
    gap: 8px;
  }

  .panel-paper {
    padding: 16px;
  }

  /* 字号调整 */
  h1 { font-size: 24px; }
  h2 { font-size: 20px; }
  .event-description { font-size: 16px; }
}
```

### 8.3 触摸优化

```css
/* 增大触摸目标 */
.touch-target {
  min-height: 44px;
  min-width: 44px;
}

/* 去除移动端点击高亮 */
.no-tap-highlight {
  -webkit-tap-highlight-color: transparent;
}
```

---

## 九、技术实现建议

### 9.1 推荐技术栈

| 类别 | 推荐方案 | 备选方案 |
|------|----------|----------|
| CSS框架 | Tailwind CSS | 原生CSS + PostCSS |
| UI组件库 | Headless UI + 自定义 | Radix UI |
| 动画库 | Framer Motion | CSS Animations |
| 图标 | Lucide Icons + 自定义SVG | Heroicons |

### 9.2 Tailwind配置扩展

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // 主色调
        ink: {
          DEFAULT: '#1a1a1a',
          light: '#4a4a4a',
        },
        paper: {
          DEFAULT: '#f5f0e6',
          dark: '#e8e0d0',
        },
        cinnabar: '#c9372c',
        ochre: '#8b4513',

        // 阵营色
        canglong: {
          DEFAULT: '#1e3a2f',
          secondary: '#3d6b54',
          accent: '#c9a227',
        },
        shuanglang: {
          DEFAULT: '#1e3a5f',
          secondary: '#6b9dc7',
          accent: '#a8b8c8',
        },
        jinque: {
          DEFAULT: '#b8860b',
          secondary: '#daa520',
          accent: '#8b4513',
        },
        border: {
          DEFAULT: '#5c4033',
          secondary: '#8b7355',
          accent: '#808080',
        },
      },
      fontFamily: {
        display: ['Source Han Serif SC', 'Noto Serif SC', 'serif'],
        body: ['Source Han Serif SC', 'Noto Serif SC', 'serif'],
        ui: ['Source Han Sans SC', 'Noto Sans SC', 'sans-serif'],
      },
      backgroundImage: {
        'paper-texture': 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.02) 4px)',
      },
    },
  },
};
```

### 9.3 组件库结构建议

```
src/
├── components/
│   ├── ui/              # 基础UI组件
│   │   ├── Button.tsx
│   │   ├── Panel.tsx
│   │   ├── Badge.tsx
│   │   └── Divider.tsx
│   ├── game/            # 游戏专用组件
│   │   ├── NewsItem.tsx
│   │   ├── ChoiceCard.tsx
│   │   ├── StatBar.tsx
│   │   └── ReputationCard.tsx
│   └── layout/          # 布局组件
│       ├── Header.tsx
│       ├── Navigation.tsx
│       └── PageWrapper.tsx
├── styles/
│   ├── globals.css      # 全局样式
│   ├── variables.css    # CSS变量
│   └── animations.css   # 动画定义
└── lib/
    └── utils.ts         # 工具函数
```

---

## 十、附录

### 10.1 设计检查清单

**每个UI元素设计前，检查**：

- [ ] 是否符合水墨风整体风格？
- [ ] 是否与叙事体验协调？
- [ ] 是否增加了不必要的认知负担？
- [ ] 在Web上性能是否可接受？
- [ ] 移动端是否可用？
- [ ] 是否有适当的fallback？

### 10.2 参考资源

**字体资源**：
- Google Fonts: Noto Serif/Sans SC
- Adobe Fonts: Source Han Serif/Sans (需订阅)
- 站酷字体: 站酷文艺体、站酷小薇体

**设计灵感**：
- 中国传统书画构图
- 古籍排版（线装书）
- 水墨动画（《小蝌蚪找妈妈》等）
- 日本浮世绘（构图参考）

**技术参考**：
- Tailwind CSS 文档
- Framer Motion 文档
- CSS Tricks (渐变、阴影等)

### 10.3 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v1.0 | 2026-04-03 | 初始版本，MVP视觉规范 |
