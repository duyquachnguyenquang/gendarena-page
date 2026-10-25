# GenD Arena 2026 — Design System Guide

> **Version:** 1.0 (Phase U0 — Foundation)  
> **Stack:** Next.js 16 · React 19 · Tailwind v4 · TypeScript  
> **Token source:** [`design/tokens.ts`](./design/tokens.ts)

---

## 1. Brand & Vibe

### Identity
**GenD Arena 2026** là đấu trường khởi nghiệp công nghệ dành cho thế hệ Gen Z Việt Nam — nơi ý tưởng gặp execution, nơi builder gặp investor.

### Direction
- **Cyberpunk refined** — không phải cyberpunk neon-overload. Nghĩa là: dark surfaces tinh tế, cyan accent có chủ đích, không glitch/distortion.
- **modal.com inspiration** — hero clean, typography đẹp, layout có breathing room, gradient dùng đúng chỗ.
- **Tech-forward nhưng uy tín** — không giống startup party, giống platform chuyên nghiệp mà gen Z muốn dùng.

### Brand Core
| Role | Color | Token |
|------|-------|-------|
| Deep background | `#050814` | `surface.base` |
| Primary brand | `#0F1F3D` navy | `brand.navy` |
| Signature accent | `#00D4FF` cyan | `brand.cyan` |
| High-energy highlight | `#33E0FF` | `brand.cyanBright` |

### Tone
- Chuyên nghiệp trẻ — không formal cứng nhắc, không Gen-Z meme
- Tech-forward — UI nói "chúng tôi biết mình đang làm gì"
- Uy tín — không flash, không over-designed

---

## 2. Design Tokens

> Reference: [`design/tokens.ts`](./design/tokens.ts) · CSS: `@theme` trong [`app/globals.css`](./app/globals.css)

### Colors

#### Surface Layers (dùng theo thứ tự độ sâu)
```
surface.base      #050814  → nền trang chính (body bg)
surface.raised    #0A1120  → cards, side panels
surface.overlay   #111B2E  → modal backdrop content, drawers
surface.elevated  #182338  → floating menus, popovers
surface.border    #1E2A44  → dividers, card borders
surface.borderStrong #2A3B5C → active borders, focus rings
```
**Rule:** Không skip layer. Card trên page dùng `raised`, không dùng `elevated`.

#### Brand Colors
```
brand.navy       #0F1F3D  → CTAs, active nav items
brand.navyLight  #1B3160  → hover state của navy
brand.cyan       #00D4FF  → accent chính, links, progress
brand.cyanBright #33E0FF  → hover state của cyan, icon glow
brand.cyanDim    #0099CC  → subtle accent, secondary badges
```

#### Accent (dùng tiết kiệm — max 2 per view)
```
accent.violet   #7C5CFF  → secondary CTA, special tags
accent.magenta  #FF3B8B  → warning-adjacent, highlight reel
```

#### Semantic
```
semantic.success  #22D07A  → success states, verified badges
semantic.warning  #FFB020  → caution, pending states
semantic.danger   #FF4D6D  → errors, destructive actions
semantic.info     #00D4FF  → informational callouts
```

#### Text Hierarchy
```
text.primary    #F0F4FA  → headings, high-emphasis labels
text.secondary  #A8B4C8  → body copy, descriptions
text.tertiary   #6B7A94  → placeholders, meta info, hints
text.disabled   #3E4A62  → non-interactive elements
text.onBrand    #050814  → text trên nền cyan/brand
```

### Typography Scale

| Token | Size | Usage |
|-------|------|-------|
| `xs` | 12px | Labels, badges, captions |
| `sm` | 14px | Secondary text, table cells |
| `base` | 16px | Body copy (default) |
| `lg` | 18px | Lead text, subtitles |
| `xl` | 20px | Section labels |
| `2xl` | 24px | Card headings |
| `3xl` | 30px | Page section titles |
| `4xl` | 36px | Hero subtitle |
| `5xl` | 48px | Hero headline |
| `6xl` | 60px | Display / splash |

#### Font Families
| Variable | Font | Usage |
|----------|------|-------|
| `--font-inter` | Inter | Headings, UI labels, navigation |
| `--font-be-vietnam-pro` | Be Vietnam Pro | Body copy (Vietnamese-optimised) |
| `--font-jetbrains-mono` | JetBrains Mono | Code blocks, scores, IDs |

Tailwind classes: `font-display` · `font-body` · `font-mono`

#### Weights
```
regular  400 → body copy
medium   500 → emphasis, nav items
semibold 600 → headings, CTAs
bold     700 → hero, display text  ← MAX allowed
```

### Spacing Scale (4px base)
```
1 → 4px    2 → 8px    3 → 12px   4 → 16px
5 → 20px   6 → 24px   8 → 32px   10 → 40px
12 → 48px  16 → 64px  20 → 80px  24 → 96px
```

### Radius Scale
```
sm   6px   → badges, chips, small buttons
md   10px  → inputs, secondary buttons
lg   14px  → cards, primary buttons
xl   20px  → modals, large panels
full 9999px → pills, avatars
```

### Motion

#### Durations
```
instant  0ms   → immediate state toggles (no animation)
fast     150ms → hover, focus rings, tooltips
base     250ms → dropdowns, tabs, component transitions
slow     400ms → modals, drawers, page sections
slower   600ms → page-level transitions, onboarding
```

#### Easings
```
standard   cubic-bezier(0.4, 0, 0.2, 1)  → default, enters & exits
emphasized cubic-bezier(0.2, 0, 0, 1)    → large surface, dramatic
decelerate cubic-bezier(0, 0, 0.2, 1)    → elements entering screen
```

---

## 3. Component Patterns

### Button

3 variants × 3 sizes, plus modifier props:

```tsx
// Variants
<Button variant="primary"   size="lg">Đăng ký ngay</Button>
<Button variant="secondary" size="md">Xem thêm</Button>
<Button variant="ghost"     size="sm">Huỷ</Button>

// Modifier props
<Button variant="primary" isLoading>Đang xử lý...</Button>
<Button variant="primary" leftIcon={<PlusIcon />}>Tạo team</Button>
<Button variant="secondary" rightIcon={<ArrowRightIcon />}>Tiếp theo</Button>
```

**Spec:**
- `primary`: bg `brand.navy`, border `brand.cyan` 1px, hover → `navyLight` + glow shadow
- `secondary`: bg transparent, border `surface.borderStrong`, hover → `surface.raised`
- `ghost`: no border, no bg, hover → `surface.raised`
- Sizes: `sm` h-8 px-3 text-sm · `md` h-10 px-4 text-base · `lg` h-12 px-6 text-lg
- Loading: spinner icon thay leftIcon, disabled state, opacity 70%

### Card

```tsx
// Base card
<div className="bg-surface-raised border border-surface-border rounded-lg p-6
               hover:border-surface-border-strong hover:shadow-elevation-2
               transition-all duration-base">
  {children}
</div>
```

**Spec:**
- Rest: `surface.raised` bg, `surface.border` border
- Hover: elevate to `elevation.2` shadow + border brighten to `borderStrong`
- Transition: `duration.base` (250ms) `easing.standard`
- Radius: `radius.lg` (14px)

### Input

```tsx
<input className="bg-surface-overlay border border-surface-border rounded-md
                 h-10 px-3 text-text-primary placeholder:text-text-tertiary
                 focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/40
                 transition-colors duration-fast" />
// Error state: border-semantic-danger + ring-semantic-danger/30
```

**Spec:**
- Height consistent: `h-10` (40px)
- Focus ring: 1px `brand.cyan` + `brand.cyan/40` glow ring
- Error: border `semantic.danger`, ring `semantic.danger/30`

### Modal

```tsx
// Overlay
<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-overlay" />
// Panel
<div className="bg-surface-overlay border border-surface-border rounded-xl
               shadow-elevation-3 z-modal">
  {children}
</div>
```

**Spec:**
- Overlay: `bg-black/60 backdrop-blur-sm`
- Panel: `surface.overlay` bg, `radius.xl`, `elevation.3` shadow
- Enter animation: `slow` (400ms) `decelerate` easing
- z-index: overlay 30, modal 40

### Badge

```tsx
<span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
  Đang diễn ra
</span>
```

**Spec:**
- `radius.full` (pill)
- Sizes: `sm` text-xs px-2 py-0.5 · `md` text-sm px-3 py-1
- Color variants: success / warning / danger / info / default (surface)

---

## 4. Layout Rules

### Container Max-Widths
```
sm   640px   → mobile-first narrow content
md   768px   → tablet, narrow forms
lg   1024px  → default content width
xl   1280px  → wide layouts, dashboards
2xl  1440px  → full-width hero sections
```

### Section Padding
```
mobile   24px (spacing.6)
tablet   48px (spacing.12)
desktop  64–96px (spacing.16–spacing.24)
```

### Grid System
- **Base:** 12-column grid
- **Gap:** 16px (spacing.4) · 24px (spacing.6) · 32px (spacing.8)
- Responsive: 1 col mobile → 2 col tablet → 3/4 col desktop

### Vertical Rhythm
```
Heading → Body text below:   12–16px gap
Section heading → content:   24–32px gap
Section → next section:      64–96px gap
Page header → first section: 48–64px gap
```

---

## 5. Motion Guidelines

### When to Animate
- ✅ User action feedback (click, focus, hover on interactive elements)
- ✅ State change communication (loading → loaded, error appearance)
- ✅ Spatial orientation (modal open/close, drawer slide, tab switch)
- ✅ Delight moments (onboarding, achievement unlock) — sparingly
- ❌ Decorative motion with no purpose
- ❌ Animating every hover unconditionally

### Duration Guide
| Interaction Type | Duration | Easing |
|----------------|----------|--------|
| Hover, focus ring | 150ms | standard |
| Tooltip, chip toggle | 150ms | standard |
| Dropdown, tab switch | 250ms | standard |
| Modal enter | 400ms | decelerate |
| Modal exit | 250ms | standard |
| Page transition | 400–600ms | emphasized |
| Skeleton → content | 300ms | decelerate |

### Reduce Motion
Always respect `prefers-reduced-motion`. Critical transitions should still happen (0ms), purely decorative ones should skip entirely.

### Tactile High-Intent CTA Motion (Micro-Interactions)
Các nút hành động quan trọng (như "Vote ngay", "Đăng ký tham gia", "Gửi dự án") và các nút icon chức năng phải có micro-animation tạo cảm giác phản hồi xúc giác (tactile feedback) sống động:
- **Hover:** Lift nhẹ (`hover:-translate-y-0.5`), vầng sáng cyan glow tinh tế (`hover:shadow-[0_0_18px_rgba(0,212,255,0.4)]`), icon chuyển động định hướng (`group-hover:translate-x-0.5 group-hover:-translate-y-0.5`), hiệu ứng ánh kim trượt nhẹ (`shimmer sweep`).
- **Active / Press:** Phản hồi nhấn xuống dứt khoát (`active:translate-y-0 active:scale-[0.98]`).
- **Icon Actions (Info, Heart, Share):** Hover scale nhẹ (`hover:scale-110 active:scale-95`), viền sáng highlight tinh gọn.
- **Border Radius:** Giữ bo góc tối giản, mạnh mẽ (`rounded-[4px]` đến `rounded-md`, khoảng 5–10%), dứt khoát, kiên quyết không dùng bo tròn bóng bẩy quá đà (`rounded-2xl`, `rounded-full`).

---

## 6. Anti-Slop Rules

> These are hard rules. Violations block PR merge.

| # | Rule |
|---|------|
| 🚫 | **CẤM** stack >1 gradient overlay lên nhau |
| 🚫 | **CẤM** dùng >3 accent colors trong 1 view |
| 🚫 | **CẤM** emoji trong CTA chính — dùng Lucide icons thay thế |
| 🚫 | **CẤM** className string >10 Tailwind utilities — dùng CVA hoặc extract component |
| 🚫 | **CẤM** `shadow-xl` + `border` cùng lúc — chọn 1 (shadow hoặc border, không cả 2) |
| 🚫 | **CẤM** animation trên mọi hover — chỉ animate khi có purpose rõ ràng |
| 🚫 | **CẤM** nút bấm phẳng lì (flat / lifeless) thiếu tương tác cho các CTA chuyển đổi cao — phải có tactile micro-animation (lift, glow, press feedback) |
| 🚫 | **CẤM** breadcrumbs thừa thãi trên các trang đơn mục đích (single-purpose landing/voting pages) khi context đã rõ ràng từ Header |
| 🚫 | **CẤM** subtitle / phụ đề giải thích dài dòng lê thê bên dưới tiêu đề chính làm loãng trang ("Cổng bình chọn chính thức · Top 8 Đội Thi"...) |
| 🚫 | **CẤM** để lộ nút điều khiển nội bộ / switcher / demo state (`Auto | Sắp | Mở | Đóng`) trên giao diện production dành cho người dùng |
| 🚫 | **CẤM** bo tròn quá đà (`rounded-2xl`, `rounded-full`) trên card/nút công nghệ — chỉ bo nhẹ 5–10% (`rounded-[4px]` đến `rounded-md`) để giữ nét dứt khoát, mạnh mẽ |
| 🚫 | **CẤM** `font-weight: 900` (extra-bold) — max `semibold` (600) cho UI, `bold` (700) cho display |
| 🚫 | **CẤM** `letter-spacing: wide` trên body text — chỉ dùng cho labels/badges |
| 🚫 | **CẤM** full-screen glow/neon effect — chỉ dùng glow ở accent element nhỏ, có chủ đích |
| 🚫 | **CẤM** `animate-pulse` trên content đang hiển thị — chỉ dùng cho skeleton/loading hoặc live status dot |
| 🚫 | **CẤM** placeholder image (lorem picsum, gray box) trong production-facing UI |

---

## 7. Do & Don't

### Buttons

**✅ Do:**
```tsx
<Button variant="primary" size="lg" leftIcon={<RocketIcon />}>
  Đăng ký ngay
</Button>
```

**❌ Don't:**
```tsx
<button className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600
                   shadow-2xl hover:scale-110 animate-pulse rounded-2xl
                   font-black tracking-widest uppercase text-yellow-300">
  🚀 ĐĂNG KÝ NGAY!!!
</button>
```

---

### Typography Hierarchy

**✅ Do:**
```tsx
<h1 className="text-5xl font-bold text-text-primary">Đấu Trường Khởi Nghiệp</h1>
<p  className="text-lg text-text-secondary mt-4">
  Nơi ý tưởng Gen Z gặp cơ hội thực sự.
</p>
```

**❌ Don't:**
```tsx
{/* Tất cả text cùng size + weight → mất hierarchy */}
<h1 className="text-base font-medium text-white">Đấu Trường Khởi Nghiệp</h1>
<p  className="text-base font-medium text-white">
  Nơi ý tưởng Gen Z gặp cơ hội thực sự.
</p>
```

---

### Cards

**✅ Do:**
```tsx
<div className="bg-surface-raised border border-surface-border rounded-lg p-6
               hover:border-surface-border-strong hover:shadow-elevation-2
               transition-all duration-250">
  <h3 className="text-xl font-semibold text-text-primary">Team Alpha</h3>
  <p  className="text-sm text-text-secondary mt-2">3 thành viên · Đang thi</p>
</div>
```

**❌ Don't:**
```tsx
{/* Glow trên mọi card, gradient bg, quá nhiều effects */}
<div className="bg-gradient-to-br from-blue-900 to-purple-900
               shadow-2xl shadow-cyan-500/50 border-2 border-cyan-400
               animate-pulse rounded-3xl p-8 hover:scale-105">
```

---

### Color Usage

**✅ Do:** 1 primary accent (cyan) + 1 supporting accent per view tối đa

**❌ Don't:** Cyan hero + violet badge + magenta CTA + yellow warning cùng 1 page section

---

### Inline Styles vs Components

**✅ Do:**
```tsx
// CVA component với defined variants
const buttonVariants = cva('base-classes', {
  variants: { variant: { primary: '...', secondary: '...' } }
})
```

**❌ Don't:**
```tsx
// Inline class string dài > 10 utilities
<div className="flex items-center justify-between bg-blue-900 border border-cyan-400/30 rounded-xl p-4 shadow-lg hover:shadow-cyan-500/20 transition-all duration-300 cursor-pointer select-none">
```

---

## 8. References

### modal.com
- **Hero section** — clean headline, subtext, CTA. Spacing rất thoáng. Không overcrowd.
- **Docs layout** — sidebar navigation tối giản, content area rộng, code blocks đẹp.
- **Code blocks** — syntax highlighting tinh tế, dark bg với subtle border, no garish colors.
- **Gradient usage** — gradient chỉ ở hero background, rất mờ, không compete với content.

### linear.app
- **Typography rhythm** — heading → body spacing nhất quán, line-height chuẩn.
- **Spacing system** — 8px base unit, generous whitespace trong card và sections.
- **Motion** — chỉ animate khi cần, duration ngắn, không distracting.

### vercel.com
- **Dark surface layers** — multiple surface depths tạo depth mà không cần shadow nặng.
- **Subtle motion** — hover states nhẹ nhàng, không jump/bounce/scale-up mạnh.
- **Monochrome focus** — màu tối dominant, accent chỉ ở CTA và key elements.
