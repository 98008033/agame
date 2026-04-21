# SkillTreePage 重设计规格 - Web友好布局

> **问题**：当前页面使用 `container-modern`（max-width: 480px），SVG 固定 900x400 垂直排列，节点间距过小，详情面板在树下方而非侧边。对 web 桌面屏幕极不友好。
>
> **目标**：最小化改动实现全宽+水平树+侧边栏布局，同时保持响应式。

---

## 1. 布局设计

### 1.1 桌面端（>1024px）

```
┌─────────────────────────────────────────────────────────────────────┐
│  header-modern（全宽）                                               │
│  [↩ 返回]  技能树                                          [用户]   │
├─────────────────────────────────────────────────────────────────────┤
│  筛选标签条（全宽，居中，max-width: 1200px）                          │
│  [全部] [谋略] [武力] [经营] [生存]                                   │
├──────────────────────────────────────────────────┬──────────────────┤
│  技能树 SVG 容器 (flex: 1, min-width: 0)          │  侧边栏 (320px)  │
│  ┌────────────────────────────────────────────┐  │  ┌──────────────┐│
│  │  [生存之根] → [谋略] [武力] [经营]          │  │  │ 技能详情面板 ││
│  │      → [政治操控] [军事指挥] [产业管理]      │  │  │ - 名称/等级  ││
│  │                                            │  │  │ - 描述       ││
│  │  水平展开: 从左到右 4列                      │  │  │ - 标签       ││
│  │  节点: 150x64, 间距 100px (水平) 90px(垂直) │  │  │ - EXP进度条  ││
│  │  SVG: width 100%, viewBox ~750x320          │  │  │ - 前置条件   ││
│  └────────────────────────────────────────────┘  │  │ - 解锁按钮   ││
│                                                  │  │ - 等级列表   ││
│                                                  │  └──────────────┘│
├──────────────────────────────────────────────────┴──────────────────┤
│  图例: ●已解锁 ●可解锁 ●未解锁                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**外层容器**：
- 使用 `max-w-[1200px] mx-auto px-4` 替代 `container-modern`
- 主内容区：`flex gap-4` 布局，左侧树+右侧详情

**技能树 SVG**：
- 容器：`flex-1 min-w-0 card-modern p-4`，添加 `overflow-auto`
- SVG `width="100%"` 使用固定 `viewBox="0 0 750 320"`
- 添加 `pan/zoom` 支持（后续可选）

**侧边栏**：
- 固定宽度 `w-[320px] shrink-0`
- 内容：原 `detail` 面板内容迁移至此
- 未选中技能时显示占位提示："点击技能节点查看详情"
- 出现时从右侧滑入（`animate-slide-in`）

### 1.2 平板端（768px - 1024px）

- 主内容区仍全宽，但**不显示侧边栏**
- 点击节点后，详情以**底部抽屉**形式出现（高度 ~50vh，从底部滑入）
- 抽屉可拖拽关闭

### 1.3 移动端（<768px）

- 恢复当前行为：垂直树 + 详情在树下方（保持兼容性）
- `container-modern` 继续使用
- SVG 保持垂直排列

---

## 2. SVG 树重新布局（水平展开）

### 2.1 新布局坐标

从**垂直排列**（4行）改为**水平排列**（4列），从左到右：

```
布局方向: → (从左到右)

生存之根(col0)  →  谋略/武力/经营(col1)  →  谋略精通/军事/产业(col2)

     [谋略·入门]  →  [谋略·精通]
           ↑
[生存之根] ────→ [武力·入门]  →  [军事指挥]
           ↓
     [经营·入门]  →  [产业管理]
```

**具体坐标**（viewBox: 0 0 750 320）：

```typescript
const NODE_W = 150   // 增大节点宽度
const NODE_H = 64    // 稍微增高

function getHorizontalLayout(): SkillNodeLayout[] {
  const colGap = 110  // 列间距（节点宽150 + 间隙110 = 260步长）
  const startY = 160  // 生存节点垂直居中
  const branchGap = 90  // 分支间距（谋略/武力/经营之间的垂直距离）

  return [
    // Col 0: 根节点（垂直居中）
    { id: 'survival', x: 20, y: startY - NODE_H / 2 },

    // Col 1: 三条分支（均分布）
    { id: 'strategy.intelligenceAnalysis', x: 20 + colGap, y: startY - branchGap - NODE_H / 2 },
    { id: 'combat.combatTechnique',       x: 20 + colGap, y: startY - NODE_H / 2 },
    { id: 'commerce.trade',               x: 20 + colGap, y: startY + branchGap - NODE_H / 2 },

    // Col 2: 精通层
    { id: 'strategy.politicalManipulation',  x: 20 + colGap * 2, y: startY - branchGap - NODE_H / 2 },
    { id: 'combat.militaryCommand',          x: 20 + colGap * 2, y: startY - NODE_H / 2 },
    { id: 'commerce.industryManagement',     x: 20 + colGap * 2, y: startY + branchGap - NODE_H / 2 },
  ]
}
```

**总宽度计算**：20 + 150 + 110 + 150 + 110 + 150 + 20 = **710** → viewBox 宽度 750 足够
**总高度计算**：160 ± 90 + 节点高度 = 顶部 ~38, 底部 ~282 → viewBox 高度 320 足够

### 2.2 连线方向变更

当前连线是从上到下（`y1 = from.y + NODE_H` → `y2 = to.y`），需要改为**从左到右**：

```typescript
// 旧：垂直连线
const x1 = from.x + NODE_W / 2
const y1 = from.y + NODE_H  // 从节点底部出发
const x2 = to.x + NODE_W / 2
const y2 = to.y              // 到节点顶部
const midY = (y1 + y2) / 2
d={`M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`}

// 新：水平连线
const x1 = from.x + NODE_W  // 从节点右侧出发
const y1 = from.y + NODE_H / 2
const x2 = to.x              // 到节点左侧
const y2 = to.y + NODE_H / 2
const midX = (x1 + x2) / 2
d={`M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`}
```

---

## 3. 颜色与视觉规范

保持现有颜色体系不变：

| 元素 | 颜色 | 来源 |
|------|------|------|
| 谋略线 | `#4CAF50` | 已有 `skillLineColors.strategy` |
| 武力线 | `#A1887F` | 已有 `skillLineColors.combat` |
| 经营线 | `#FFB74D` | 已有 `skillLineColors.commerce` |
| 生存 | `#8D6E63` | 已有 `skillLineColors.survival` |
| 已解锁 | 绿色 `#4CAF50` 边框 | 已有 |
| 可解锁 | 金色 `#FFB74D` 边框+glow | 已有 |
| 未解锁 | 灰色 `#4A4A5A` | 已有 |
| 背景 | `var(--bg-card)` = `#334155` | 已有 `card-modern` |

**新增视觉细节**：
- 选中节点：边框加粗至 3px，外加 2px 光晕（当前已有 `isSelected ? 3 : 2`）
- 侧边栏背景：`var(--bg-secondary)` = `#1E293B`，圆角 `var(--radius-lg)`
- 侧边栏占位文字：居中，`text-[var(--text-muted)]`

---

## 4. 交互设计

### 4.1 点击节点
1. 调用 `loadDetail(skillId)`（已有逻辑不变）
2. 桌面端：侧边栏从右侧滑入显示详情
3. 平板端：底部抽屉从底部滑入
4. 移动端：详情在树下方展开（当前行为）

### 4.2 关闭详情
- 桌面端：点击侧边栏内 "关闭" 按钮或点击树区域空白处
- 平板端：向下拖拽底部抽屉或点击关闭按钮
- 移动端：点击关闭按钮

### 4.3 筛选标签
- 从当前树上方位置移动到页面顶部（header 下方），全宽居中
- 点击筛选后，SVG 中不匹配的节点 `opacity: 0.15`（而非隐藏），保持树结构可见
- 当前行为是直接 `filteredIds` 过滤导致节点消失，改为降低不透明度更友好

---

## 5. 文件修改清单

### 5.1 `web/src/pages/SkillTreePage/index.tsx` - 主要修改

#### 修改1: 布局常量
```diff
- const NODE_W = 140
- const NODE_H = 60
+ const NODE_W = 150
+ const NODE_H = 64
```

#### 修改2: 布局函数 - 新增水平布局
```diff
- function getLayout(): SkillNodeLayout[] { ... }
+ function getLayout(): SkillNodeLayout[] {
+   // 使用响应式：根据窗口宽度决定水平或垂直布局
+   const isDesktop = window.innerWidth > 1024
+   if (isDesktop) return getHorizontalLayout()
+   return getVerticalLayout() // 原来的布局逻辑
+ }
+
+ function getHorizontalLayout(): SkillNodeLayout[] {
+   const colGap = 110
+   const startY = 160
+   const branchGap = 90
+   return [
+     { id: 'survival', x: 20, y: startY - NODE_H / 2 },
+     { id: 'strategy.intelligenceAnalysis', x: 20 + colGap, y: startY - branchGap - NODE_H / 2 },
+     { id: 'combat.combatTechnique', x: 20 + colGap, y: startY - NODE_H / 2 },
+     { id: 'commerce.trade', x: 20 + colGap, y: startY + branchGap - NODE_H / 2 },
+     { id: 'strategy.politicalManipulation', x: 20 + colGap * 2, y: startY - branchGap - NODE_H / 2 },
+     { id: 'combat.militaryCommand', x: 20 + colGap * 2, y: startY - NODE_H / 2 },
+     { id: 'commerce.industryManagement', x: 20 + colGap * 2, y: startY + branchGap - NODE_H / 2 },
+   ]
+ }
+
+ function getVerticalLayout(): SkillNodeLayout[] {
+   const gap = 200
+   const startY = 40
+   const rowH = 160
+   return [
+     { id: 'survival', x: 370, y: startY },
+     { id: 'strategy.intelligenceAnalysis', x: 170, y: startY + rowH },
+     { id: 'combat.combatTechnique', x: 370, y: startY + rowH },
+     { id: 'commerce.trade', x: 570, y: startY + rowH },
+     { id: 'strategy.politicalManipulation', x: 170, y: startY + rowH * 2 },
+     { id: 'combat.militaryCommand', x: 370, y: startY + rowH * 2 },
+     { id: 'commerce.industryManagement', x: 570, y: startY + rowH * 2 },
+   ]
+ }
```

#### 修改3: SVG 连线方向
```diff
  connections.map((conn, idx) => {
    const from = layoutMap.get(conn.from)
    const to = layoutMap.get(conn.to)
    if (!from || !to) return null
    const color = getConnectionColor(conn.from, conn.to)
    const opacity = getConnectionOpacity(conn.from, conn.to)
-   const x1 = from.x + NODE_W / 2
-   const y1 = from.y + NODE_H
-   const x2 = to.x + NODE_W / 2
-   const y2 = to.y
-   const midY = (y1 + y2) / 2
+   const isHorizontal = from.x < to.x
+   if (isHorizontal) {
+     const x1 = from.x + NODE_W
+     const y1 = from.y + NODE_H / 2
+     const x2 = to.x
+     const y2 = to.y + NODE_H / 2
+     const midX = (x1 + x2) / 2
+     path = `M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`
+   } else {
+     const x1 = from.x + NODE_W / 2
+     const y1 = from.y + NODE_H
+     const x2 = to.x + NODE_W / 2
+     const y2 = to.y
+     const midY = (y1 + y2) / 2
+     path = `M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`
+   }
    return (
      <path
        key={idx}
-       d={`M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`}
+       d={path}
        ...
      />
    )
  })
```

#### 修改4: SVG 尺寸
```diff
  <svg
-   width={900}
-   height={400}
-   viewBox="0 0 900 400"
+   width="100%"
+   height="100%"
+   viewBox={isHorizontal ? "0 0 750 320" : "0 0 900 400"}
-   className="mx-auto"
-   style={{ minWidth: 700 }}
+   className="mx-auto"
+   style={{ minWidth: isHorizontal ? 500 : 700 }}
  >
```

#### 修改5: 主容器布局（JSX结构大改）
```diff
  <main className="container-modern py-6">
+ <main className="max-w-[1200px] mx-auto px-4 py-6">

    {/* 分类筛选 - 移到顶部居中 */}
-   <div className="flex gap-2 mb-4">
+   <div className="flex gap-2 mb-4 justify-center">
      ...
    </div>

+   {/* 主内容区：树 + 侧边栏 */}
+   <div className="flex gap-4 items-start">
+     {/* 左侧：技能树 */}
+     <div className="flex-1 min-w-0">
        <div className="card-modern p-4 overflow-auto">
          <svg ...>...</svg>
          {/* 图例 */}
          ...
        </div>
+     </div>

+     {/* 右侧：侧边栏详情 (仅桌面) */}
+     {isDesktop && detail && (
+       <div
+         className="w-[320px] shrink-0 card-modern animate-slide-in"
+         style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
+       >
+         {/* 详情内容 - 迁移自原有 detail 面板 */}
+         <div className="flex items-start justify-between mb-4">
+           ...
+         </div>
+         ...
+       </div>
+     )}
+   </div>

+   {/* 移动端/平板端详情面板（原有逻辑保留） */}
+   {!isDesktop && detail && (
      <div className="card-modern mt-4">
        ...原有详情内容...
      </div>
+   )}
  </main>
```

#### 修改6: 新增响应式状态
```diff
+ const [isDesktop, setIsDesktop] = useState(() => {
+   if (typeof window !== 'undefined') return window.innerWidth > 1024
+   return true
+ })
+ const [isTablet, setIsTablet] = useState(() => {
+   if (typeof window !== 'undefined') {
+     const w = window.innerWidth
+     return w > 768 && w <= 1024
+   }
+   return false
+ })
+
+ useEffect(() => {
+   const handleResize = () => {
+     const w = window.innerWidth
+     setIsDesktop(w > 1024)
+     setIsTablet(w > 768 && w <= 1024)
+   }
+   window.addEventListener('resize', handleResize)
+   return () => window.removeEventListener('resize', handleResize)
+ }, [])
```

#### 修改7: 筛选行为调整
```diff
- if (!filteredIds.has(skill.id)) return null
+ const isFiltered = filteredIds.has(skill.id)
+ if (!isDesktop && !isFiltered) return null
  ...
  <g
    ...
+   opacity={isFiltered ? 1 : 0.15}
+   style={{ transition: 'opacity 0.2s, transform 0.2s' }}
+   pointerEvents={isFiltered ? 'auto' : 'none'}
  >
```

#### 修改8: 添加关闭详情的交互
```diff
  {/* 在树容器上添加点击关闭 */}
+ <div className="flex-1 min-w-0" onClick={(e) => {
+   if (e.target === e.currentTarget && isDesktop) {
+     setSelectedSkill(null)
+     setDetail(null)
+   }
+ }}>
```

### 5.2 `web/src/index.css` - 无需修改

所有需要的 CSS 类（`card-modern`, `animate-slide-in`, `tag-modern`, `progress-modern` 等）已存在。

### 5.3 不需要修改的文件
- `web/src/services/` - API 调用不变
- `web/src/components/` - 无共享组件变动
- `PLAN/` - 设计文档不变

---

## 6. 改动量估算

| 区域 | 改动类型 | 行数变化 |
|------|----------|----------|
| 布局常量 + 响应式状态 | 新增 | +20 |
| getLayout / getHorizontalLayout / getVerticalLayout | 重构 | +30 / -15 |
| SVG 连线方向 | 修改 | +15 / -5 |
| SVG viewBox + 尺寸 | 修改 | +5 / -4 |
| 主容器 JSX 结构 | 重构 | +30 / -10 |
| 筛选节点行为 | 修改 | +5 / -1 |
| 关闭详情交互 | 新增 | +8 |
| **总计** | | **~+113 / -35** |

约 **净增 ~80 行**，核心逻辑（state管理、API调用、颜色计算等）完全不变。

---

## 7. 实现优先级

1. **P0（必须）**：全宽容器 + 水平 SVG 布局 + 侧边栏详情
2. **P1（应该）**：响应式切换（桌面/平板/移动）+ 筛选标签置顶
3. **P2（可选）**：筛选节点降低透明度而非隐藏 + 点击空白关闭详情
4. **P3（后续）**：SVG pan/zoom 支持
