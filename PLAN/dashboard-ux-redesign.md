# Dashboard 功能入口 & 快捷入口 UX 重设计规格

> **问题**：当前 DashboardPage 的功能入口（modules）和快捷入口（quickEntries）设计混乱：
> 1. 使用 emoji 作为图标，视觉不统一且依赖平台渲染
> 2. modules 用 2列 grid，plan 占 2列（col-span-2），其他 4个挤在第二行，布局不平衡
> 3. quickEntries 用 3列 grid 纯文字+emoji，缺乏视觉层次
> 4. 两种卡片样式混用（card-modern 和 card-modern-alt），没有统一的入口卡片组件
> 5. 缺乏悬停状态的视觉反馈一致性
> 6. Quick Stats 区域与功能入口风格割裂
>
> **目标**：统一卡片设计，优化布局结构，增强视觉层次和交互反馈。

---

## 1. 当前问题诊断

### 1.1 功能入口（modules）- 当前布局
```
┌───────────────────┬───────────────────┐
│  📋 今日计划 (plan)  全宽高亮           │  ← col-span-2, 紫色ring
├───────────────────┼───────────────────┤
│  📰 每日晨报      │  👤 个人状态       │  ← 普通卡片
├───────────────────┼───────────────────┤
│  📖 小说阅读       │  ⚔️ 游戏决策       │  ← 普通卡片
└───────────────────┴───────────────────┘
```
**问题**：plan 独占一行导致视觉不平衡；4个模块分两行但内容密度差异大；emoji 图标尺寸不一致。

### 1.2 快捷入口（quickEntries）- 当前布局
```
┌──────────┬──────────┬──────────┐
│  🎯 今日行动 │  💬 NPC对话 │  📜 事件历史│  ← 纯文字+emoji
├──────────┼──────────┼──────────┤
│  🏰 派系   │  🗺️ 世界地图 │  🌳 技能树  │  ← 无描述，纯标题
└──────────┴──────────┴──────────┘
```
**问题**：无图标一致性；无描述文字；与 modules 视觉风格割裂。

### 1.3 Quick Stats - 当前布局
```
┌──────────┬──────────┬──────────┐
│  金币     │  待处理事件│  阵营声望  │  ← card-modern-alt
│  100     │  0       │  友好     │
└──────────┴──────────┴──────────┘
```
**问题**：使用不同的卡片变体，数字无单位提示，"待处理事件"硬编码为0。

---

## 2. 新设计方案

### 2.1 整体布局重构

```
┌────────────────────────────────────────────────────────┐
│  header-modern（全宽）                                    │
│  Agame · 第X日 · 权力博弈期           [语言切换] [用户]  │
├────────────────────────────────────────────────────────┤
│  Welcome 卡片（全宽）                                     │
│  "欢迎，旅行者 · 你当前位于苍龙帝国·铁壁关"                  │
│  "乱世之中，每一步选择都将影响你的命运..."                    │
├────────────────────────────────────────────────────────┤
│  AP 状态条（有角色时）                                     │
│  🎯 AP: 8/10 · 已消耗: 2      [前往行动]                  │
│  [████████░░] 80%                                       │
├────────────────────────────────────────────────────────┤
│  功能入口区                                               │
│  ┌─────────┬─────────┬─────────┬─────────┬─────────┐   │
│  │ 📋 计划  │ 📰 晨报  │ 👤 状态  │ 📖 小说  │ ⚔️ 决策  │   │
│  │ 安排今日  │ 天下大事  │ 属性声望  │ 沉浸剧情  │ 处理事件 │   │
│  └─────────┴─────────┴─────────┴─────────┴─────────┘   │
│  5列等宽卡片，plan 不再独占一行，通过颜色和图标区分优先级       │
├────────────────────────────────────────────────────────┤
│  快捷入口区（有角色时）                                     │
│  ┌──────┬──────┬──────┬──────┬──────┬──────┐          │
│  │ 🎯行动│ 💬对话│ 📜历史│ 🏰派系│ 🗺️地图│ 🌳技能│          │
│  └──────┴──────┴──────┴──────┴──────┴──────┘          │
│  6列紧凑卡片，统一小图标+文字                              │
├────────────────────────────────────────────────────────┤
│  最近决策历史（有角色时）                                    │
│  [事件1] 描述...           [时间]                         │
│  [事件2] 描述...           [时间]                         │
│  [事件3] 描述...           [时间]                         │
├────────────────────────────────────────────────────────┤
│  Quick Stats                                           │
│  ┌────────────┬────────────┬────────────┐              │
│  │ 💰 金币     │ 📬 待办事件  │ 🛡️ 阵营声望 │              │
│  │ 100        │ 2          │ 苍龙·友好   │              │
│  └────────────┴────────────┴────────────┘              │
└────────────────────────────────────────────────────────┘
```

### 2.2 功能入口卡片设计（modules）

**布局**：`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3`
- 移动端 2列
- 平板 3列
- 桌面 5列（一行全部展示）

**卡片结构**：
```
┌────────────────────┐
│  [图标 28px]        │
│  模块标题 (16px bold)│
│  描述文字 (12px)     │
└────────────────────┘
```

**统一样式**：
- 所有卡片使用相同的 `ModuleEntryCard` 组件（新建）
- 背景：`var(--bg-card)` = `#334155`
- 边框：`1px solid {accent}40`（40%透明度强调色）
- 圆角：`var(--radius-lg)` = `12px`
- 内边距：`16px`
- 悬停效果：`translateY(-2px)` + `box-shadow: 0 4px 12px rgba(0,0,0,0.3)` + 边框颜色变为 `{accent}80`
- 点击效果：`scale(0.98)`

**优先级区分**（替代原有的 highlight/col-span-2）：
- plan 模块：顶部边框加粗 `border-top-width: 3px`，颜色 `var(--accent-purple)`
- 其他模块：统一边框宽度
- 不再使用 col-span-2

**图标**：继续使用 emoji（MVP阶段不引入图标库），但统一大小：
```tsx
<span className="inline-flex items-center justify-center w-10 h-10 rounded-lg"
      style={{ backgroundColor: accent + '20' }}>
  <span className="text-xl">{icon}</span>
</span>
```

### 2.3 快捷入口卡片设计（quickEntries）

**布局**：`grid grid-cols-3 md:grid-cols-6 gap-2`
- 移动端 3列
- 桌面 6列（一行全部展示）

**卡片结构**：
```
┌──────────────┐
│   [图标 20px] │
│   标题 (13px) │
└──────────────┘
```

**统一样式**：
- 背景：`var(--bg-secondary)` = `#1E293B`（比模块卡片浅一级）
- 边框：`1px solid {accent}30`
- 圆角：`var(--radius-md)` = `8px`
- 内边距：`12px 8px`
- 居中对齐
- 悬停：`translateY(-1px)` + 边框变为 `{accent}60`
- 点击：`scale(0.97)`

### 2.4 Quick Stats 重新设计

**布局**：`grid grid-cols-3 gap-3`（不变）

**变更**：
- 添加图标：金币 💰、待办 📬、声望 🛡️
- 数字添加单位/上下文
- 使用与快捷入口相同的卡片样式（`bg-secondary` 变体）
- "待处理事件" 改为从 API 获取真实数据（或暂时显示 "暂无"）

```
┌──────────────┬──────────────┬──────────────┐
│    💰        │    📬        │    🛡️        │
│   100 金币    │   2 个待办    │   苍龙·友好   │
│   text-sm    │   text-sm    │   text-sm    │
└──────────────┴──────────────┴──────────────┘
```

---

## 3. 颜色与视觉规范

### 3.1 模块 accent 色映射（保持不变）

| 模块 | accent 色 | 用途 |
|------|-----------|------|
| plan | `var(--accent-purple)` = `#8B5CF6` | 今日计划 |
| news | `var(--accent-blue)` = `#3B82F6` | 每日晨报 |
| status | `var(--accent-green)` = `#10B981` | 个人状态 |
| novel | `var(--accent-gold)` = `#F59E0B` | 小说阅读 |
| game | `var(--accent-red)` = `#EF4444` | 游戏决策 |

快捷入口 accent 色：
| 入口 | accent 色 |
|------|-----------|
| actions | `var(--accent-purple)` |
| dialog | `var(--accent-blue)` |
| event-history | `var(--accent-gold)` |
| factions | `var(--faction-canglong)` = `#22C55E` |
| map | `var(--accent-green)` |
| skills | `var(--accent-gold)` |

### 3.2 悬停状态统一规范

```css
/* 所有入口卡片通用 */
.dashboard-entry-card {
  background: var(--bg-card);
  border: 1px solid var(--entry-accent, rgba(255,255,255,0.1));
  border-radius: var(--radius-lg);
  padding: 16px;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.dashboard-entry-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border-color: var(--entry-accent);  /* 不透明度提升到100% */
}

.dashboard-entry-card:active {
  transform: scale(0.98);
}

/* 快捷入口变体（更轻量） */
.dashboard-entry-card--compact {
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 12px 8px;
}

.dashboard-entry-card--compact:hover {
  transform: translateY(-1px);
}
```

---

## 4. 文件修改清单

### 4.1 新建组件：`web/src/components/DashboardEntryCard/index.tsx`

```tsx
interface ModuleEntryCardProps {
  icon: string
  title: string
  description?: string
  accent: string
  path: string
  priority?: 'high' | 'normal'
  size?: 'large' | 'compact'
}

export default function DashboardEntryCard({
  icon, title, description, accent, path, priority = 'normal', size = 'large'
}: ModuleEntryCardProps) {
  const navigate = useNavigate()
  const isCompact = size === 'compact'

  return (
    <button
      onClick={() => navigate(path)}
      className={`w-full text-left rounded-xl transition-all duration-200 hover:-translate-y-${isCompact ? '1' : '2'} hover:shadow-lg active:scale-[0.98] ${
        isCompact ? 'p-3 text-center bg-[var(--bg-secondary)]' : 'p-4'
      }`}
      style={{
        border: `1px solid ${accent}40`,
        borderTopWidth: priority === 'high' ? '3px' : '1px',
        borderTopColor: priority === 'high' ? accent : `${accent}40`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = accent
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = `${accent}40`
      }}
    >
      <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3"
            style={{ backgroundColor: `${accent}20` }}>
        <span className={isCompact ? 'text-lg' : 'text-xl'}>{icon}</span>
      </span>
      <h4 className={`font-bold font-display ${isCompact ? 'text-sm' : 'text-base'}`}
          style={{ color: 'var(--text-primary)' }}>
        {title}
      </h4>
      {!isCompact && description && (
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
      )}
    </button>
  )
}
```

### 4.2 修改 `web/src/pages/DashboardPage/index.tsx`

#### 修改1: 导入新组件
```diff
- import { UserAvatarMenu, LanguageSwitcher } from '../../components'
+ import { UserAvatarMenu, LanguageSwitcher, DashboardEntryCard } from '../../components'
```

#### 修改2: 更新 barrel export
`web/src/components/index.ts` 添加：
```diff
+ export { default as DashboardEntryCard } from './DashboardEntryCard'
```

#### 修改3: 功能入口渲染（modules section）
```diff
- <div className="grid grid-cols-2 gap-4">
-   {modules.map((mod) => (
-     <button
-       key={mod.id}
-       onClick={() => navigate(mod.path)}
-       className={`card-modern text-left ${
-         mod.highlight ? 'col-span-2 ring-2 ring-[var(--accent-purple)]/50 bg-[var(--accent-purple)]/10' : ''
-       }`}
-       style={{ borderColor: mod.highlight ? mod.accent : undefined }}
-     >
-       <span className="text-3xl mb-3 block">{mod.icon}</span>
-       <h4 className="text-xl font-bold text-[var(--text-primary)] mb-1 font-display">{mod.title}</h4>
-       <p className="text-[var(--text-secondary)] text-sm">{mod.desc}</p>
-     </button>
-   ))}
- </div>
+ <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
+   {modules.map((mod) => (
+     <DashboardEntryCard
+       key={mod.id}
+       icon={mod.icon}
+       title={mod.title}
+       description={mod.desc}
+       accent={mod.accent}
+       path={mod.path}
+       priority={mod.highlight ? 'high' : 'normal'}
+       size="large"
+     />
+   ))}
+ </div>
```

#### 修改4: 快捷入口渲染
```diff
- <div className="grid grid-cols-3 gap-3">
-   {quickEntries.map((entry) => (
-     <button
-       key={entry.id}
-       onClick={() => navigate(entry.path)}
-       className="card-modern text-center hover:scale-[1.02] transition-all"
-       style={{ borderColor: entry.accent + '60' }}
-     >
-       <span className="text-2xl block mb-1">{entry.icon}</span>
-       <span className="font-medium text-[var(--text-primary)] font-display">{entry.title}</span>
-     </button>
-   ))}
- </div>
+ <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
+   {quickEntries.map((entry) => (
+     <DashboardEntryCard
+       key={entry.id}
+       icon={entry.icon}
+       title={entry.title}
+       accent={entry.accent}
+       path={entry.path}
+       size="compact"
+     />
+   ))}
+ </div>
```

#### 修改5: Quick Stats 重新设计
```diff
- <div className="grid grid-cols-3 gap-4 text-center">
-   <div className="card-modern-alt">
-     <p className="text-[var(--text-muted)] text-sm">{t('dashboard.stats.gold')}</p>
-     <p className="text-[var(--accent-gold)] font-bold text-xl">{player?.resources?.gold || 0}</p>
-   </div>
-   <div className="card-modern-alt">
-     <p className="text-[var(--text-muted)] text-sm">{t('dashboard.stats.pendingEvents')}</p>
-     <p className="text-[var(--accent-red)] font-bold text-xl">0</p>
-   </div>
-   <div className="card-modern-alt">
-     <p className="text-[var(--text-muted)] text-sm">{t('dashboard.stats.factionReputation')}</p>
-     <p className="text-[var(--accent-green)] font-bold text-xl">
-       {player?.factionLevel === 'friendly' ? t('dashboard.stats.reputation_friendly') : player?.factionLevel || t('dashboard.stats.reputation_neutral')}
-     </p>
-   </div>
- </div>
+ <div className="grid grid-cols-3 gap-3">
+   <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.05)' }}>
+     <span className="text-xl block mb-1">💰</span>
+     <p className="text-[var(--accent-gold)] font-bold text-lg">{player?.resources?.gold || 0}</p>
+     <p className="text-[var(--text-muted)] text-xs">{t('dashboard.stats.gold')}</p>
+   </div>
+   <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.05)' }}>
+     <span className="text-xl block mb-1">📬</span>
+     <p className="text-[var(--accent-red)] font-bold text-lg">
+       {pendingEventsCount > 0 ? `${pendingEventsCount} 个` : '暂无'}
+     </p>
+     <p className="text-[var(--text-muted)] text-xs">{t('dashboard.stats.pendingEvents')}</p>
+   </div>
+   <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.05)' }}>
+     <span className="text-xl block mb-1">🛡️</span>
+     <p className="text-[var(--accent-green)] font-bold text-lg">
+       {player?.faction ? `${factionNames[player.faction] || player.faction}` : '未加入'}
+     </p>
+     <p className="text-[var(--text-muted)] text-xs">{t('dashboard.stats.factionReputation')}</p>
+   </div>
+ </div>
```

#### 修改6: 容器宽度调整
```diff
- <main className="container-wide py-6">
+ <main className="max-w-[1200px] mx-auto px-4 py-6">
```

#### 修改7: 新增 pendingEventsCount 状态
```diff
+ const pendingEventsCount = 0 // TODO: 从 API 获取，暂时为0
```

### 4.3 不需要修改的文件
- `web/src/index.css` - 所有需要的 CSS 类已存在，新的内联样式直接写在组件中
- `web/src/i18n/locales/*.json` - i18n key 不变
- `web/src/services/` - API 不变

---

## 5. 改动量估算

| 区域 | 改动类型 | 行数变化 |
|------|----------|----------|
| 新建 DashboardEntryCard 组件 | 新增 | ~50 |
| 更新 components/index.ts barrel | 新增 | +1 |
| DashboardPage modules 渲染 | 重构 | +10 / -15 |
| DashboardPage quickEntries 渲染 | 重构 | +10 / -12 |
| DashboardPage Quick Stats | 重构 | +15 / -12 |
| 容器宽度调整 | 修改 | +1 / -1 |
| **总计** | | **~+87 / -40** |

约 **净增 ~47 行**，主要变化是提取了可复用的 `DashboardEntryCard` 组件。

---

## 6. 实现优先级

1. **P0（必须）**：新建 DashboardEntryCard 组件 + 统一 modules 和 quickEntries 卡片样式
2. **P1（应该）**：响应式 grid（移动端2/3列 → 桌面5/6列）+ Quick Stats 添加图标
3. **P2（可选）**：plan 模块顶部加粗边框区分优先级 + 悬停边框颜色变化
4. **P3（后续）**：替换 emoji 为 SVG 图标 + pendingEventsCount 从 API 获取
