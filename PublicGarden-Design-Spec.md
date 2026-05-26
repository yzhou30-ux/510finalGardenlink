# 🌿 公共花园页面 — 设计规范文档

> 版本 1.0 · 2026.05.24
> 所属页面：花园 tab → Segmented Control → 公共花园
> 核心交互：等距无限画布 + snap-to-center + 底部详情面板

---

## 一、概述

公共花园是一个**等距视角（isometric）的无限画布**，每个菱形地块代表一个用户的花盆。用户通过拖拽/滑动探索画布，距离自己越近的地块代表越相关的人。

### 核心设计原则

**距离 = 相关度。** 这不是分类导航，也不是方向导航。每个地块的位置由多维度加权决定：

| 维度 | 权重示例 | 效果 |
|------|----------|------|
| 社交关系（互关/好友） | 高 | 大幅拉近 |
| 地理距离（同小区/同城） | 中 | 拉近 |
| 植物相似度（同品种） | 中 | 拉近 |
| 互动频率（常评论/点赞） | 中 | 拉近 |
| 平台推荐（算法） | 低 | 外围补充 |

一个同城的、种月季的、互关的好友，三重因素叠加所以紧挨着"我"。一个外地的、种仙人掌的陌生人则在远处。用户不需要理解算法，只需要知道：**近的就是跟我最相关的。**

---

## 二、页面结构

```
┌─────────────────────────────────┐
│ 顶部栏：标题 + 地图/动态 切换     │  ← z-index 40, 渐变淡出背景
├─────────────────────────────────┤
│                                 │
│         等距画布区域              │  ← Canvas 渲染, 可拖拽
│      （上半屏 or 全屏）           │
│     [定位按钮]                   │  ← 右下角, 回到"我"
│                                 │
├─────────────────────────────────┤
│ ┌─ 底部详情面板 ──────────────┐  │  ← 选中地块时滑出
│ │  头像  名字  [关系标签...]   │  │
│ │  [最新动态图片]              │  │
│ │  描述文字                   │  │
│ │  [看看花园] [留言]          │  │
│ └────────────────────────────┘  │
└─────────────────────────────────┘
```

### 两种状态

| 状态 | 画布区域 | 底部面板 |
|------|----------|----------|
| 浏览态（默认） | 占满全屏 | 隐藏（translateY 100%） |
| 聚焦态（选中地块） | 压缩到上半屏（~310px） | 滑出，占下半屏（~290px） |

### 视图切换

右上角有"地图 / 动态"切换按钮：
- **地图模式**：等距画布（本文档主要内容）
- **动态模式**：传统 feed 流，按时间排列最新发帖

---

## 三、等距画布（Isometric Canvas）

### 3.1 坐标系统

每个地块有一个逻辑坐标 `(dx, dy)`，通过等距投影映射到屏幕坐标：

```typescript
function isoProject(dx: number, dy: number) {
  const tileWidth = BASE + GAP;   // BASE ≈ 屏幕宽度 × 0.22, GAP = BASE × 0.5
  const tileHeight = BASE * 0.55 + GAP;
  return {
    x: dx * tileWidth * 0.5,
    y: dy * tileHeight * 0.6,
  };
}
```

屏幕坐标 = 画布中心 + isoProject(dx, dy) + 拖拽偏移量 (oX, oY)

### 3.2 地块间距

地块坐标之间有 **1.8 倍的 SPREAD 系数**，确保地块不会过于密集。首屏（不拖动时）应该只能看到"我"和周围 2-3 个最近的好友。

```typescript
const SPREAD = 1.8;

// 后端返回的相关度坐标（紧凑的）乘以 SPREAD
tile.displayX = tile.relevanceX * SPREAD;
tile.displayY = tile.relevanceY * SPREAD;
```

### 3.3 响应式尺寸

```typescript
const BASE = Math.min(Math.max(screenWidth * 0.22, 70), 120);
```

| 设备 | 屏幕宽度 | BASE | 地块宽度 |
|------|----------|------|----------|
| iPhone SE | 320px | 70px | 70px |
| iPhone 14 | 390px | 86px | 86px |
| iPad Mini | 744px | 120px | 120px |

菱形宽高比固定 **1 : 0.55**（宽 : 高）。

### 3.4 绘制顺序（深度排序）

**按 Y 坐标升序排列**，Y 值小的（画面上方）先画，Y 值大的后画。这样前方地块自然遮挡后方地块，植物向上生长超出菱形的部分也能正确遮挡。

```typescript
const sorted = [...tiles].sort((a, b) => a.dy - b.dy || a.dx - b.dx);
sorted.forEach(tile => drawTile(tile));
```

### 3.5 透明度与远近感

距离"我"越远的地块越淡：

```typescript
const rawDist = Math.sqrt(tile.dx² + tile.dy²) / SPREAD;
const alpha = Math.max(0.2, 1 - rawDist * 0.1);
ctx.globalAlpha = alpha;
```

---

## 四、地块渲染

### 4.1 地块类型

| 类型 | 视觉 | 尺寸倍数 |
|------|------|----------|
| 我的花园 | 双层菱形边框（外深绿 + 内浅奶油），高亮 | 1.0 |
| 好友/花友 | 普通菱形，sage 色调 | 1.0 |
| 活动/运营 | 暖色（amber）菱形 | 1.4 |

### 4.2 地块视觉样式（使用 Design Tokens）

**"我"的地块：**
```
外层: fill rgba(74,93,73,0.16), stroke rgba(74,93,73,0.32), 1.5px
内层: fill rgba(253,251,247,0.65), stroke rgba(74,93,73,0.22), 1px
```

**普通地块：**
```
fill: rgba(74,93,73, 0.04 + 0.02 * alpha)
stroke: rgba(74,93,73, 0.08 + 0.04 * alpha)
lineWidth: 0.5px
```

**聚焦态地块（被选中时）：**
```
外层: fill rgba(74,93,73,0.12), stroke rgba(74,93,73,0.35), 1.5px
内层: fill rgba(253,251,247,0.7), stroke rgba(74,93,73,0.25), 1px
```

**活动地块：**
```
fill: rgba(196,147,90,0.09)
stroke: rgba(196,147,90,0.2), 0.8px
```

### 4.3 地块内文字

名字在菱形内部，emoji/插图下方：

| 属性 | 值 |
|------|-----|
| 字号 | `max(9px, BASE × 0.09)` |
| 字重 | 400 |
| 颜色（普通） | `rgba(107,123,106,0.4)` |
| 颜色（聚焦） | `rgba(61,79,60,0.8)` |
| 颜色（活动） | `rgba(139,100,32,0.5)` |
| 颜色（"我"） | `rgba(61,79,60,0.7)`, 500 weight |
| 位置 | 菱形中心偏下 `sy + ph × 0.32` |

---

## 五、插图规范

### 5.1 概述

每个地块最终将使用**手绘等距插图**替代 emoji。插图描绘一小块土地上种着用户的植物，呈等距俯瞰视角。

### 5.2 画法

**不使用代码裁切（clip）。** 插图本身带透明背景，下半部分是菱形地面，上半部分是植物自然向上生长超出菱形。

```
插图画布结构：

     240px
  ┌──────────┐
  │ 透明     │ ← 植物溢出区（60px+，植物生长部分）
  │   🌹     │
  │  🌿🌿    │
  ├──╱────╲──┤ ← 菱形地面顶点
  │╱ 土壤  ╲│ ← 菱形地面（140px高）
  │╲  泥土 ╱│
  ├──╲────╱──┤ ← 菱形地面底点
  │ 透明     │
  └──────────┘
     200px+
```

### 5.3 插图制作规范

| 属性 | 值 |
|------|-----|
| 画布尺寸 | **240 × 200px**（最小），2x 导出为 480 × 400px |
| 菱形地面区域 | 下半部分，宽 240px × 高 140px（宽高比 1:0.55） |
| 植物溢出区 | 上方 60px 起步，高大植物（竹子、向日葵）可更高（最大 120px） |
| 注册点（anchor） | **菱形中心**，即画布坐标 (120, 130) 附近 |
| 格式 | PNG 透明底（推荐），或 SVG |
| DPI | 2x（视网膜屏），即实际导出 480×400px |
| 配色建议 | 地面用暖土色（#D4C4A8 ~ #B8A88A），植物用绿色系（与 sage 色板协调） |
| 风格建议 | 线条插画或水彩风，不要太写实，保持轻松手绘感 |

### 5.4 代码中使用插图

```typescript
interface GardenTile {
  id: string;
  dx: number;
  dy: number;
  name: string;
  emoji: string;           // fallback
  illustrationUrl?: string; // '/illustrations/tiles/rose-garden.png'
  tags: RelationTag[];
  // ...
}

// 渲染
function drawTile(tile, sx, sy, pw, ph) {
  const img = imageCache[tile.illustrationUrl];
  
  if (img && img.complete) {
    // 插图模式：直接绘制完整图片，不做裁切
    // 注册点在菱形中心，所以向上偏移让菱形部分对齐
    const imgW = pw * 1.0;
    const imgH = imgW * (img.height / img.width);
    const offsetY = imgH * 0.3; // 菱形中心在图片偏下位置
    ctx.drawImage(img, sx - imgW/2, sy - imgH + offsetY, imgW, imgH);
  } else {
    // fallback：画菱形 + emoji
    drawDiamond(sx, sy, pw, ph, fill, stroke);
    ctx.fillText(tile.emoji, sx, sy);
  }
}
```

### 5.5 图片预加载

```typescript
// 首屏预加载"我"+ 第一圈好友的插图
// 拖动到远处时懒加载更远的插图
const preloadTiles = tiles.filter(t => t.ring <= 1);
preloadTiles.forEach(t => {
  if (t.illustrationUrl) {
    const img = new Image();
    img.src = t.illustrationUrl;
    imageCache[t.illustrationUrl] = img;
  }
});
```

---

## 六、交互行为

### 6.1 拖拽

| 行为 | 规范 |
|------|------|
| 手势 | Pointer Events API（统一鼠标和触摸） |
| 响应 | 1:1 跟手，不加缓动/惯性 |
| 容器 | `touch-action: none`，`cursor: grab/grabbing` |
| 移动判定 | `abs(dx) > 4 or abs(dy) > 4` 才算移动（排除点击） |

### 6.2 Snap-to-center 吸附

| 行为 | 规范 |
|------|------|
| 触发条件 | 拖拽松手 or 滚轮静止 400ms |
| 判定半径 | `BASE × 0.9`（只有地块非常接近中心才触发） |
| 对象 | 距离屏幕中心最近的**非"我"**地块 |
| 动画 | 220ms，`ease-out-cubic`，将目标地块滑到屏幕正中心 |
| 无命中 | 如果最近地块超出判定半径，不 snap，不弹面板 |

```typescript
function findNearest(): GardenTile | null {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  let best = null, bestDist = Infinity;
  
  tiles.forEach(tile => {
    if (tile.isMe) return;
    const screen = isoToScreen(tile.dx, tile.dy);
    const dist = Math.hypot(screen.x - centerX, screen.y - centerY);
    if (dist < bestDist) { bestDist = dist; best = tile; }
  });
  
  return bestDist < BASE * 0.9 ? best : null;
}
```

### 6.3 底部详情面板

| 行为 | 规范 |
|------|------|
| 触发 | snap 动画完成后，从底部滑出 |
| 动画 | `transform: translateY(100% → 0)`，400ms `cubic-bezier(0.22,1,0.36,1)` |
| 画布压缩 | `height: 100% → 310px`，同步过渡 |
| 关闭 | 点击"回到我的位置"按钮，或拖拽画布到空地 |
| 面板高度 | 290px |
| 圆角 | 上方 `18px` |
| 背景 | `rgba(253,251,247,0.95)` + `backdrop-filter: blur(16px)` |
| 顶部拖拽条 | `36 × 4px`，圆角 2px，`rgba(74,93,73,0.15)` |

### 6.4 面板内容结构

```
┌─────────────────────────────────┐
│  ── 拖拽条 ──                    │
│                                 │
│  [头像]  名字                    │
│  emoji   [同城] [月季] [互关]    │  ← 关系标签
│                                 │
│  ┌─────────────────────────┐    │
│  │                         │    │  ← 最新动态图片（120px高）
│  │      植物照片            │    │
│  │              3小时前     │    │
│  └─────────────────────────┘    │
│                                 │
│  描述文字...                     │
│                                 │
│  [看看花园]  [留言]              │  ← 操作按钮
└─────────────────────────────────┘
```

### 6.5 关系标签

标签解释**为什么这个人出现在你附近**：

| 标签类型 | 颜色 | 示例 |
|----------|------|------|
| 地理 (geo) | 蓝色 `rgba(91,143,185,0.1)` + 文字 `#3D7BA8` | 同小区、同城、同区 |
| 植物 (plant) | 绿色 `rgba(107,158,107,0.1)` + 文字 `#4A7D4A` | 月季、多肉、绣球 |
| 社交 (social) | 暖色 `rgba(196,147,90,0.1)` + 文字 `#8B6420` | 互关、推荐、活动 |

标签样式：`font-size: 9px`，`padding: 2px 8px`，`border-radius: 10px`

### 6.6 滚轮

| 行为 | 规范 |
|------|------|
| 响应 | 直接偏移画布，`oY -= deltaY × 0.8` |
| 防抖 | 停止滚动 400ms 后触发 snap |
| `passive` | `false`（阻止页面滚动） |

### 6.7 回到我的位置

| 行为 | 规范 |
|------|------|
| 位置 | 右下角，`32 × 32px` 圆形按钮 |
| 效果 | `oX = 0, oY = 0`，关闭底部面板，画布恢复全屏 |
| 图标 | `ti-current-location` |

---

## 七、数据接口（建议）

### 7.1 首屏加载

```typescript
GET /api/garden/nearby?userId=xxx

Response: {
  myTile: { id, illustrationUrl, ... },
  tiles: [
    {
      id: string,
      dx: number,           // 相对"我"的等距 X 坐标（已乘 SPREAD）
      dy: number,           // 相对"我"的等距 Y 坐标（已乘 SPREAD）
      userName: string,
      emoji: string,
      illustrationUrl?: string,
      tags: [{ type: 'geo'|'plant'|'social', label: string }],
      latestPost?: {
        imageUrl: string,
        text: string,
        timeAgo: string,
      },
      isEvent?: boolean,
    },
    // ...
  ],
}
```

### 7.2 懒加载（拖拽到远处时）

```typescript
GET /api/garden/explore?userId=xxx&offsetX=5&offsetY=3&radius=4

// 返回以 (offsetX, offsetY) 为中心，radius 范围内的地块
```

### 7.3 坐标计算（后端）

后端用多维度加权生成每个用户相对于"我"的 2D 坐标，类似 t-SNE/UMAP 降维：

```python
def calculate_position(me, other):
    social_score = mutual_follow_weight(me, other)    # 0-1
    geo_score = geo_proximity(me, other)              # 0-1
    plant_score = plant_similarity(me, other)         # 0-1
    interaction_score = interaction_frequency(me, other)  # 0-1
    
    # 综合相关度 → 距离（越相关越近）
    relevance = (social_score * 0.35 +
                 geo_score * 0.25 +
                 plant_score * 0.25 +
                 interaction_score * 0.15)
    
    distance = (1 - relevance) * MAX_RADIUS
    angle = ... # 基于某种分布算法避免重叠
    
    return (distance * cos(angle), distance * sin(angle))
```

---

## 八、性能优化

| 优化 | 说明 |
|------|------|
| 虚拟化渲染 | 只绘制屏幕可见范围内的地块（± BASE × 2） |
| 图片懒加载 | 首圈预加载，远处地块进入视口时加载 |
| Canvas 离屏缓存 | 静止状态下缓存到 offscreen canvas，拖拽时直接位移 |
| 防抖 snap | 滚轮停止 400ms 后才触发 snap 计算 |
| requestAnimationFrame | 拖拽期间用 rAF 而非 pointermove 每帧重绘 |

---

## 九、无障碍

| 要素 | 处理 |
|------|------|
| Canvas | `role="application"` + `aria-label="公共花园地图"` |
| 键盘 | 方向键移动画布，Enter 选中最近地块，Esc 关闭面板 |
| 屏幕阅读器 | 底部面板内容完整标注 `aria-live="polite"` |
| 减弱动效 | `prefers-reduced-motion` 时关闭 snap 动画，直接切换 |
