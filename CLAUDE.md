# CLAUDE.md — 植物社交日记 App（GardenLink v2）

> **读这个文件是你写任何代码之前的第一步。**
> 本文件是唯一的设计与架构真相来源（single source of truth）。
> 最后更新：2026-05-23

---

## 一、项目概述

### 产品定位

植物社交 + 个人花园日记。用户通过拍照记录每天的植物状态，按花盆（pot）、按时间轴组织内容，同时有社区功能与好友互动。

### 目标用户

- 核心用户：中老年植物爱好者（大字体、简单层级、温暖色调）
- 次要用户：年轻园艺爱好者
- 设计原则：并行内容越少越好，层级清晰，操作路径短

### 与旧版 Garden Stream 的关系

本项目是旧版 Garden Stream 的完全重写。旧代码位于 `legacy/` 目录，仅供参考。**不要修改 `legacy/` 中的任何文件。** 所有新代码写在项目根目录。

可从旧版复用的部分：
- Supabase 连接配置（`.env.local` 中的 URL 和 anon key）
- Supabase Storage bucket "photos" 的上传逻辑（client-side 压缩 → Storage → DB insert 的流程）
- Next.js + TypeScript 项目脚手架

不可复用、必须重写的部分：
- 所有路由和页面组件
- 导航组件
- 设计系统（颜色、字体、间距全部变了）
- 数据模型（需要新增 pots 和 tasks 表）

---

## 二、技术栈

| 领域 | 选择 | 备注 |
|------|------|------|
| 框架 | Next.js 14+ (App Router) | TypeScript，Server Components 默认 |
| 动画 | Framer Motion (`motion`) | CardDeck 核心依赖 |
| 样式 | Tailwind CSS + CSS Variables | Design tokens 通过 CSS 变量定义 |
| 日期 | date-fns | 轻量，tree-shakable |
| 图标 | `@tabler/icons-react` | 线性风格，匹配设计调性 |
| 状态管理 | Zustand | 花盆选择、视图模式等轻量全局状态 |
| 数据库 + 存储 | Supabase | DB + Storage + 未来 Auth |
| 部署 | Vercel | — |

### 初始化命令

```bash
npm install framer-motion @tabler/icons-react date-fns zustand
```

---

## 三、目录结构

```
project-root/
├── CLAUDE.md                      ← 你正在读的文件
├── legacy/                        ← 旧版 Garden Stream（只读参考）
│   ├── src/
│   ├── supabase/
│   └── ...
├── app/
│   ├── layout.tsx                 ← 全局布局，FloatingTabBar 在这里
│   ├── globals.css                ← Design tokens CSS 变量
│   ├── (tabs)/
│   │   ├── garden/page.tsx        ← 花园（含 Segmented: 公共/我的）
│   │   ├── timeline/page.tsx      ← 时间轴（含 PotSelector + CardDeck）
│   │   └── profile/page.tsx       ← 我的（含消息入口）
│   ├── messages/page.tsx          ← 消息列表
│   ├── post/[id]/page.tsx         ← Post 详情页
│   └── camera/page.tsx            ← 拍照/上传流程
├── components/
│   ├── FloatingTabBar.tsx
│   ├── SegmentedControl.tsx
│   ├── PotSelector.tsx
│   ├── ViewToggle.tsx
│   ├── PlantGrid.tsx
│   ├── TaskList.tsx
│   ├── MessageCard.tsx
│   ├── DiamondGrid.tsx
│   └── CardDeck/
│       ├── index.ts               ← export { CardDeck } from './CardDeck'
│       ├── CardDeck.tsx            ← 主容器组件
│       ├── CardItem.tsx            ← 单张卡片
│       ├── useCardDeckScroll.ts    ← 自定义 Hook：滚轮/手势/惯性/snap
│       ├── types.ts                ← 类型定义
│       └── constants.ts            ← 动画参数常量
├── lib/
│   ├── supabase.ts                ← Supabase client（可从 legacy 复制）
│   └── store.ts                   ← Zustand store
├── supabase/
│   ├── schema.sql                 ← 新版 DDL（含 pots、tasks 表）
│   └── seed.sql                   ← 新版 demo 数据
└── public/
    └── demo/                      ← demo 用的植物照片
```

---

## 四、信息架构（IA）

### 全局导航

```
底部 Floating Tab Bar（3 tab + 拍照按钮）
├── 🌿 花园          /garden
│   ├── [Segmented Control]
│   │   ├── 公共花园（菱形田地网格 + 好友动态）
│   │   └── 我的花园（花盆圆形网格 + 今日任务）
│   └── [ViewToggle] 网格 ↔ 列表
│
├── 📅 时间轴        /timeline
│   ├── [PotSelector] 下拉切换花盆
│   ├── [ViewToggle] 卡片 ↔ 列表
│   ├── 卡片模式：滚筒式 CardDeck（核心交互）
│   └── 列表模式：简单图文 Feed
│
├── 📷 拍照           （中心按钮，触发拍照/上传流程）
│
└── 👤 我的          /profile
    ├── Profile 简要信息
    ├── 消息入口卡片（大卡片 + 未读角标）
    ├── 统计区（花盆数 / 动态数 / 获赞数）
    └── 菜单（我的动态 / 我的收藏 / 设置）
```

### 跨页面导航

| 起点 | 操作 | 终点 |
|------|------|------|
| 我的花园 → 点击花盆圆圈 | `router.push('/timeline?pot=月季')` | 时间轴（自动选中该花盆） |
| 时间轴 → 点击聚焦卡片 | `router.push('/post/[id]')` | Post 详情页 |
| 时间轴 → 点击"标记发帖" | 弹出发帖编辑 | 发帖页（Modal 或新页面） |
| 我的 → 点击消息卡片 | `router.push('/messages')` | 消息列表页 |
| 公共花园 → 点击菱形 | `router.push('/user/[id]/pot/[potId]')` | 他人花盆页 |

---

## 五、设计语言 — Design Tokens

### 5.1 配色：鼠尾草与奶油（Sage & Cream）

在 `globals.css` 中定义所有 CSS 变量：

```css
:root {
  /* Base */
  --bg-base: #F5F0E8;
  --bg-card: #FDFBF7;
  --bg-elevated: #FFFFFF;

  /* Sage 色阶 */
  --sage-900: #3D4F3C;
  --sage-700: #4A5D49;
  --sage-500: #6B7B6A;
  --sage-400: #8B9E89;
  --sage-300: #9B9484;

  /* 功能色 */
  --info: #5B8FB9;
  --info-bg: rgba(91,143,185,0.12);
  --warning: #C4935A;
  --warning-bg: rgba(196,147,90,0.12);
  --success: #6B9E6B;
  --success-bg: rgba(107,158,107,0.15);
  --danger: #E24B4A;

  /* 边框 */
  --border-default: rgba(74,93,73,0.12);
  --border-subtle: rgba(74,93,73,0.08);
  --border-cream: rgba(200,209,198,0.5);

  /* 阴影（全部使用 sage 色调，禁止纯黑阴影） */
  --shadow-card-focus: 0 4px 20px rgba(61,79,60,0.08), 0 1px 4px rgba(0,0,0,0.04);
  --shadow-tab-bar: 0 2px 12px rgba(61,79,60,0.08);
  --shadow-seg-active: 0 1px 4px rgba(61,79,60,0.10);

  /* 字体 */
  --font-sans: -apple-system, 'SF Pro Display', 'PingFang SC', 'Noto Sans SC', 'Helvetica Neue', sans-serif;
}
```

### 5.2 透明度系统（核心特色）

**设计中大量使用透明层。所有透明层必须带有色调染色。**

**禁止**使用纯白 `rgba(255,255,255,α)` 或纯黑 `rgba(0,0,0,α)` 做半透明。

| 方向 | 基色 | 用于 |
|------|------|------|
| 沉入层（凹下去） | `rgba(74,93,73,α)` — sage | 后方卡片、tag、segmented 底、hover |
| 浮出层（浮起来） | `rgba(253,251,247,α)` — cream | 聚焦卡片、tab bar、选择器、弹窗 |

```css
:root {
  /* Glass - Sage（沉入） */
  --glass-sage-subtle: rgba(74,93,73, 0.04);
  --glass-sage-light: rgba(74,93,73, 0.06);   /* + blur(2px)  */
  --glass-sage-medium: rgba(74,93,73, 0.08);   /* + blur(4px)  */
  --glass-sage-strong: rgba(74,93,73, 0.12);
  --glass-sage-border: rgba(74,93,73, 0.15);

  /* Glass - Cream（浮出） */
  --glass-cream-light: rgba(253,251,247, 0.70);  /* + blur(6px)  */
  --glass-cream-medium: rgba(253,251,247, 0.82); /* + blur(16px) */
  --glass-cream-strong: rgba(253,251,247, 0.92); /* + blur(12px) */

  /* 渐变遮罩 */
  --mask-top: linear-gradient(to bottom, rgba(245,240,232,0.95) 0%, rgba(245,240,232,0.6) 40%, transparent 100%);
  --mask-bottom: linear-gradient(to top, rgba(245,240,232,0.95) 0%, rgba(245,240,232,0.6) 40%, transparent 100%);

  /* 卡片封面图蒙版 */
  --card-cover-overlay: linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.40) 100%);
}
```

### 5.3 字体规范

```css
/* 在 Tailwind 中自定义或直接使用 */
font-family: var(--font-sans);
```

| 用途 | 大小 | 字重 | 颜色 |
|------|------|------|------|
| 页面大标题 | 18px | 600 | `--sage-900` |
| 卡片日期-月 | 12-14px | 500 | `--sage-400` |
| 卡片日期-日 | 36-48px | 600 | `--sage-900` |
| 正文 | 13-14px | 400 | `--sage-700` |
| 次文字 | 11-12px | 400 | `--sage-300` |
| Tag 文字 | 9-10px | 400 | `--sage-500` |
| Tab 标签 | 9px | 500 | active: `--sage-900` / inactive: `--sage-300` |

### 5.4 圆角

| 用途 | 圆角 |
|------|------|
| 大卡片/面板 | 14px |
| 按钮/Segmented | 8-10px |
| Tag pill | 14-16px |
| Tab Bar 容器 | 22px |
| Tab 项高亮 | 18px |
| 圆形元素（花盆、头像） | 50% |

### 5.5 无暗色模式

MVP 不做 dark mode。

---

## 六、组件规范

### 6.1 FloatingTabBar

**位置**：`app/layout.tsx`，所有页面共享。

| 属性 | 值 |
|------|-----|
| 定位 | `fixed; bottom: 14px; left: 50%; translateX(-50%)` |
| 背景 | `--glass-cream-medium` + `backdrop-filter: blur(16px)` |
| 边框 | `0.5px solid rgba(200,209,198,0.5)` |
| 阴影 | `--shadow-tab-bar` |
| 圆角 | `22px` |
| 内边距 | `5px 8px` |

**Tab 项**：

| 位置 | 图标 | 文字 | 路由 |
|------|------|------|------|
| 1 | `IconPlant2` | 花园 | `/garden` |
| 2 | `IconCalendar` | 时间轴 | `/timeline` |
| 中心 | `IconCamera` | （无文字） | 触发拍照流程 |
| 3 | `IconUser` | 我的 | `/profile` |

- 每个 tab 项：`50×36px`，圆角 `18px`
- 选中态：背景 `--glass-sage-strong`，文字 `--sage-900`
- 未选中态：透明背景，文字 `--sage-300`
- 拍照按钮：`34×34px` 圆形，背景 `--glass-sage-subtle`，边框 `--glass-sage-border`
- 未读红点："我的" tab 右上角，`7×7px`，`--danger`
- 选中状态与 `usePathname()` 同步
- 切换用 `next/link`
- iPhone 安全区：`padding-bottom: env(safe-area-inset-bottom)`

### 6.2 SegmentedControl

花园页顶部，切换公共花园 / 我的花园。

| 属性 | 值 |
|------|-----|
| 背景 | `--glass-sage-medium` + `backdrop-filter: blur(8px)` |
| 外圆角 | `10px`，内项圆角 `8px` |
| 选中项背景 | `rgba(253,251,247,0.85)` |
| 选中项阴影 | `--shadow-seg-active` |
| 选中文字 | `--sage-900`，500 weight |
| 未选文字 | `--sage-400` |
| 字号 | `12px` |

### 6.3 PotSelector

时间轴页面顶部，下拉切换花盆。

**收起态**：

| 属性 | 值 |
|------|-----|
| 背景 | `--glass-cream-light` + `backdrop-filter: blur(6px)` |
| 边框 | `0.5px solid rgba(200,209,198,0.5)` |
| 圆角 | `12px` |
| 左侧 | 花盆图标 `30×30px` 圆形，背景 `--glass-sage-medium` |
| 花盆名 | `12px` 600 weight `--sage-900` |
| 副文字 | `9px` `--sage-400`（如"养了 128 天"） |
| 右侧 | `IconChevronDown`，点击旋转 180° |

**展开态**：

| 属性 | 值 |
|------|-----|
| 背景 | `--bg-card` |
| 边框 | `0.5px solid --border-default` |
| 列表项 | `padding: 10px 14px`，每项带花盆图标 + 名称 + 天数 |
| 选中项 | 文字变为 `--info` 色，带 check 图标 |
| 动画 | `max-height` expand，`cubic-bezier(0.22,1,0.36,1)` |

**行为**：
- 点击收起态 → 展开下拉，箭头旋转 180°
- 选择花盆 → 高亮选中项，收起下拉，CardDeck 重新加载该花盆数据
- 点击外部 → 收起下拉

### 6.4 ViewToggle

各页面右上角。

| 属性 | 值 |
|------|-----|
| 选中项 | 背景 `--glass-sage-strong`，文字 `--sage-900`，边框 `--glass-sage-border` |
| 未选项 | 透明背景，文字 `--sage-300`，边框透明 |
| 圆角 | `6px` |
| 字号 | `9-10px` |
| 图标 | 选中前带图标（卡片=`IconStack2`，列表=`IconList`，网格=`IconLayoutGrid`） |

**行为**：
- 立即切换，无过渡动画
- 切换回来时保持之前的滚动位置/聚焦卡片
- 偏好存 localStorage

### 6.5 PlantGrid（花盆圆形网格）

| 属性 | 值 |
|------|-----|
| 布局 | `flex-wrap`，居中，`gap: 10px` |
| 花盆项 | `90×90px` 圆形 |
| 背景 | `--bg-card` |
| 边框 | `0.5px solid --border-default` |
| 花盆图标 | `28px`，`--sage-500` |
| 花盆名 | `9px`，`--sage-500` |
| 浇水角标 | 右上角 `14×14px` 圆形，背景 `--info` 20%，图标 `IconDroplet` |
| 添加按钮 | 虚线边框 `1.5px dashed --sage-300`，透明背景，`+` 图标 |

**点击花盆** → `router.push('/timeline?pot=花盆名')`

### 6.6 TaskList（今日任务）

| 属性 | 值 |
|------|-----|
| 标题 | `13px` 500 weight `--sage-900` |
| 任务项 | 圆角 `8px`，背景 `--bg-card`，边框 `--border-default` |
| 左侧图标 | `32×32px` 圆形，浇水=`--info-bg`，检查=`--warning-bg` |
| 任务名 | `12px` 500 weight `--sage-900` |
| 频率 | `10px` `--sage-300` |
| 勾选框 | `24×24px` 圆形，未勾=边框 `--sage-300`，已勾=填充 `--success` + check 图标 |

### 6.7 DiamondGrid（公共花园菱形网格）

| 属性 | 值 |
|------|-----|
| 布局 | `grid-template-columns: repeat(3, 1fr)`，`gap: 8px` |
| 每个格子 | `aspect-ratio: 1`，`transform: rotate(45deg)` |
| 背景 | `--glass-sage-light` |
| 边框 | `0.5px solid --border-subtle` |
| 圆角 | `8px`（旋转前） |
| 内容图标 | `transform: rotate(-45deg)` 反向旋转，`20px`，`--sage-300` |

### 6.8 MessageCard（消息入口卡片）

| 属性 | 值 |
|------|-----|
| 背景 | `--bg-card` |
| 边框 | `0.5px solid --border-default` |
| 圆角 | `14px` |
| 左侧图标 | `44×44px` 圆形，背景 `--info` 15%，图标 `IconMessageCircle` |
| 未读角标 | `18×18px` 圆形，背景 `--danger`，白色数字 `10px` |
| 标题 | "消息"，`14px` 500 weight `--sage-900` |
| 预览 | `11px` `--sage-300`，单行截断 |

### 6.9 Feed 列表模式（时间轴备选视图）

| 属性 | 值 |
|------|-----|
| 列表项 | 水平排列，左图右文 |
| 缩略图 | `64×64px`，圆角 `8px`，背景 `--glass-sage-light` |
| 日期 | `12px` 500 weight `--sage-900` |
| 描述 | `11px` `--sage-300` |
| Tag | `9px`，圆角 `10px`，背景 `--glass-sage-light`，文字 `--sage-500` |

---

## 七、CardDeck — 核心组件完整规范

### 7.1 类型定义 (`types.ts`)

```typescript
export interface CardData {
  id: string;
  date: Date;
  coverImageUrl?: string;   // 用户上传的植物照片（可选）
  tags?: string[];           // AI 自动识别的标签
  hasPost?: boolean;         // 是否已标记发帖
}

export interface CardDeckProps {
  cards: CardData[];
  initialIndex?: number;     // 默认 0
  onActiveChange?: (index: number) => void;
  onMarkPost?: (card: CardData) => void;
  onTagClick?: (card: CardData, tag: string) => void;
}
```

### 7.2 动画参数 (`constants.ts`)

```typescript
export const VISIBLE_RANGE = 3;

// 卡片尺寸
export const CARD_WIDTH_FOCUSED = 380;
export const CARD_HEIGHT_FOCUSED = 260;
export const CARD_WIDTH_NORMAL = 340;
export const CARD_HEIGHT_NORMAL = 160;

// 间距与动画
export const CARD_SPACING = 85;
export const SCALE_FACTOR = 0.1;
export const OPACITY_FACTOR = 0.3;
export const MIN_SCALE = 0.65;
export const MIN_OPACITY = 0.2;

// 物理参数
export const SPRING_STIFFNESS = 0.15;
export const DAMPING = 0.75;
export const WHEEL_SENSITIVITY = 0.15;
export const DRAG_SENSITIVITY = 0.005;
export const SNAP_THRESHOLD = 0.005;
export const VELOCITY_THRESHOLD = 0.008;
```

### 7.3 自定义 Hook (`useCardDeckScroll.ts`)

**职责**：管理滚动偏移量和聚焦索引。

输出：
1. `scrollOffset`（`MotionValue<number>`）：当前滚动偏移
2. `activeIndex`（`number`）：当前聚焦卡片索引
3. 容器 `ref` 和事件 handlers

**核心循环**（requestAnimationFrame）：

```
滚轮/拖拽 → 累加 velocity → rAF {
  1. velocity += (snapTarget - offset) * SPRING_STIFFNESS
  2. velocity *= DAMPING
  3. offset += velocity
  4. if |offset| >= 0.5 → 卡片切换（index ±1），offset 回绕
  5. 边界检测：index 不能 < 0 或 >= cards.length
  6. if |offset| < SNAP_THRESHOLD && |velocity| < VELOCITY_THRESHOLD → 停止
}
```

**事件**：
- **wheel**：`deltaY > 0` → velocity 增加。阻止默认滚动。
- **pointer**：pointerdown 开始追踪，pointermove 实时更新 offset，pointerup 启动 snap。
- 使用 Pointer Events API 统一鼠标和触摸。

**关键**：`scrollOffset` 使用 `useMotionValue` 而非 `useState`，避免频繁 re-render。

### 7.4 CardDeck 主组件 (`CardDeck.tsx`)

```tsx
<div ref={containerRef}
     className="relative overflow-hidden cursor-grab touch-none select-none"
     style={{ width: 440, height: 560, borderRadius: 16 }}
     onWheel={handleWheel}
     onPointerDown={handlePointerDown}>

  {/* 顶部渐变遮罩 */}
  <div className="absolute top-0 left-0 right-0 h-[120px] z-20 pointer-events-none"
       style={{ background: 'var(--mask-top)' }} />

  {/* 卡片渲染区 */}
  {visibleCards.map(({ card, position }) => (
    <CardItem key={card.id} card={card} position={position}
              isFocused={Math.abs(position) < 0.35} />
  ))}

  {/* 底部渐变遮罩 */}
  <div className="absolute bottom-0 left-0 right-0 h-[120px] z-20 pointer-events-none"
       style={{ background: 'var(--mask-bottom)' }} />
</div>
```

**容器背景**：transparent（使用页面背景 `--bg-base`）。

**可见卡片计算**（每帧）：

```typescript
const visibleCards = [];
for (let i = -VISIBLE_RANGE; i <= VISIBLE_RANGE; i++) {
  const cardIndex = activeIndex + i;
  if (cardIndex < 0 || cardIndex >= cards.length) continue;
  const position = i - scrollOffset;
  if (Math.abs(position) > VISIBLE_RANGE) continue;
  visibleCards.push({ card: cards[cardIndex], position });
}
```

### 7.5 CardItem 组件 (`CardItem.tsx`)

**视觉映射**（position 为浮点数，0 = 中心）：

| 属性 | 公式 |
|------|------|
| translateY | `position * CARD_SPACING` px |
| scale | `max(MIN_SCALE, 1 - abs(position) * SCALE_FACTOR)` |
| opacity | `max(MIN_OPACITY, 1 - abs(position) * OPACITY_FACTOR)` |
| z-index | 聚焦 = 150；其余 = `100 - round(abs(position) * 10)` |
| width | 聚焦 380px → 非聚焦 340px（平滑过渡） |
| height | 聚焦 260px → 非聚焦 160px（平滑过渡） |

**聚焦卡片样式**：

| 属性 | 无封面图 | 有封面图 |
|------|----------|----------|
| 背景 | `--glass-cream-strong` + `blur(12px)` | 封面图 `background-size: cover` |
| 边框 | `0.5px solid rgba(200,209,198,0.6)` | 无 |
| 阴影 | `--shadow-card-focus` | `--shadow-card-focus` |
| 蒙版 | 无 | `--card-cover-overlay` |
| 月份文字 | `--sage-400` | `rgba(255,255,255,0.85)` |
| 日期文字 | `--sage-900` | `#FFFFFF` |
| 标记发帖按钮 | 背景 `--glass-sage-medium`，文字 `--sage-700` | 背景 `rgba(255,255,255,0.18)` + `blur(4px)` |
| Tag pills | 背景 `--glass-sage-medium`，文字 `--sage-500` | 背景 `rgba(255,255,255,0.12)`，文字 `rgba(255,255,255,0.9)` |

**非聚焦卡片样式**：

| 属性 | 值 |
|------|-----|
| 背景 | `--glass-sage-light` + `blur(2px)` |
| 边框 | `0.5px solid --border-subtle` |
| 月份文字 | `rgba(74,93,73,0.45)` |
| 日期文字 | `rgba(61,79,60,0.35)` |

**卡片内容结构**：
- 左上角：月份（大写，如 MAR）+ 日期数字（大号）
- 右上角：聚焦状态显示"标记发帖"按钮
- 右下角：聚焦状态显示 tag pills
- 日期格式化用 `date-fns` 的 `format()`

### 7.6 CardDeck 交互行为

| 行为 | 规范 |
|------|------|
| 滚轮 | 每次 `deltaY` 叠加 velocity ±0.15~0.18，连续物理模拟（非离散翻页） |
| 拖拽 | pointer 事件驱动，松手后惯性衰减 + snap |
| Snap | 弹簧回复力模型，自动吸附到最近整数位 |
| 边界 | 到达首/末张阻止翻动，可选 rubber-band 回弹 |
| 聚焦 | `abs(position) < 0.35` 判定，切换时触发 `onActiveChange` |
| 容器 | `cursor: grab/grabbing`，`touch-action: none` |

### 7.7 性能要求

- 可见范围外的卡片**不渲染**（虚拟化）
- 动画使用 `requestAnimationFrame` 或 Framer Motion 的 `useAnimationFrame`
- `scrollOffset` 是 `MotionValue` 而非 `useState`
- 卡片元素使用 `will-change: transform, opacity`

### 7.8 无障碍

- 容器：`role="listbox"` + `aria-label="日期时间轴"`
- 卡片：`role="option"` + `aria-selected`
- 键盘：上下箭头翻页
- 尊重 `prefers-reduced-motion`：关闭滚筒动画改为直接切换

---

## 八、数据模型

### 新版 Schema（替代旧版的 4 表结构）

```sql
-- 花盆（植物）
CREATE TABLE pots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name TEXT NOT NULL DEFAULT 'Guest',  -- 未来改 user_id
  name TEXT NOT NULL,                        -- 花盆名如"月季"
  icon TEXT DEFAULT 'plant-2',               -- Tabler icon name
  days_owned INTEGER DEFAULT 0,              -- 养了多少天
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 每日记录（原 photos 表的演化）
CREATE TABLE daily_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pot_id UUID REFERENCES pots(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL DEFAULT 'Guest',
  image_url TEXT,
  thumb_url TEXT,
  caption TEXT,
  tags TEXT[],                               -- AI 识别的标签数组
  has_post BOOLEAN DEFAULT false,            -- 是否已标记发帖
  record_date DATE NOT NULL,                 -- 该记录对应的日期
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(pot_id, record_date)                -- 每盆每天一条
);

-- 养护任务
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pot_id UUID REFERENCES pots(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('water', 'inspect', 'fertilize', 'prune')),
  name TEXT NOT NULL,                        -- 如"浇水 · 月季"
  frequency TEXT,                            -- 如"每天 1-2 次"
  completed_today BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 评论（结构与旧版基本一致）
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID REFERENCES daily_records(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL DEFAULT 'Guest',
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 消息（新增）
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name TEXT NOT NULL DEFAULT 'Guest',
  sender_name TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX idx_records_pot ON daily_records(pot_id, record_date DESC);
CREATE INDEX idx_tasks_pot ON tasks(pot_id);
CREATE INDEX idx_comments_record ON comments(record_id);
CREATE INDEX idx_messages_user ON messages(user_name, is_read);
```

### Supabase Storage

- Bucket: `photos`（已存在，public，保持不变）
- 上传路径改为：`{pot_id}/{YYYY-MM-DD}_{filename}`

---

## 九、响应式

| 场景 | 处理 |
|------|------|
| 移动端竖屏 | **核心**，全部设计基于此 |
| 平板 | 内容区 `max-width: 480px` 居中 |
| 桌面 | 内容区 `max-width: 480px` 居中 |
| iPhone 安全区 | Tab Bar 底部 `env(safe-area-inset-bottom)` |

---

## 十、开发规则

1. **本文件是唯一的设计真相来源**——写代码前先读完。
2. **不要修改 `legacy/` 目录下的任何文件。**
3. **TypeScript only**，App Router，Server Components 默认，`'use client'` 仅在需要时。
4. **Tailwind CSS + CSS 变量**——不创建独立 CSS 文件（`globals.css` 除外）。
5. **所有透明层必须染色**——禁止纯白/纯黑半透明。
6. **所有阴影使用 sage 色调**——禁止 `rgba(0,0,0,α)` 阴影。
7. **无暗色模式**。
8. **移动端优先**：设计基于 375px 宽度。
9. **图标统一使用 `@tabler/icons-react`**——不用其他图标库。
10. **日期格式化统一使用 `date-fns`**。
11. **CardDeck 的 scrollOffset 必须是 MotionValue**——不是 useState。
12. **所有 mutation 后用 `router.refresh()` 或 `window.location.reload()`** 刷新数据。
13. **每个编码 session 更新 `docs/WORKLOG.md`**——记录做了什么。

---

## 附录：使用示例

```tsx
// app/(tabs)/timeline/page.tsx 中使用 CardDeck
import { CardDeck } from '@/components/CardDeck';

const demoCards = [
  {
    id: '1',
    date: new Date(2026, 2, 1),
    coverImageUrl: '/demo/rose-mar-1.jpg',
    tags: ['月季', '花苞'],
  },
  {
    id: '2',
    date: new Date(2026, 2, 2),
    tags: ['月季'],
  },
  // ...
];

export default function TimelinePage() {
  return (
    <CardDeck
      cards={demoCards}
      initialIndex={2}
      onActiveChange={(i) => console.log('当前聚焦:', i)}
      onMarkPost={(card) => console.log('标记发帖:', card.id)}
      onTagClick={(card, tag) => console.log('点击tag:', tag)}
    />
  );
}
```
