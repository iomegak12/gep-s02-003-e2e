---
name: Nexus SCM
colors:
  surface: '#fbf8ff'
  surface-dim: '#dad8e7'
  surface-bright: '#fbf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f2ff'
  surface-container: '#efecfb'
  surface-container-high: '#e9e6f5'
  surface-container-highest: '#e3e1ef'
  on-surface: '#1a1b25'
  on-surface-variant: '#454556'
  inverse-surface: '#2f2f3a'
  inverse-on-surface: '#f1effe'
  outline: '#767588'
  outline-variant: '#c6c4d9'
  surface-tint: '#373ffa'
  primary: '#1d20e9'
  on-primary: '#ffffff'
  primary-container: '#3e46ff'
  on-primary-container: '#dfdeff'
  inverse-primary: '#bfc2ff'
  secondary: '#5d5e62'
  on-secondary: '#ffffff'
  secondary-container: '#dfdfe3'
  on-secondary-container: '#616266'
  tertiary: '#8d2800'
  on-tertiary: '#ffffff'
  tertiary-container: '#b63600'
  on-tertiary-container: '#ffd8cd'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e0e0ff'
  primary-fixed-dim: '#bfc2ff'
  on-primary-fixed: '#01006e'
  on-primary-fixed-variant: '#1213e4'
  secondary-fixed: '#e2e2e6'
  secondary-fixed-dim: '#c6c6ca'
  on-secondary-fixed: '#1a1c1f'
  on-secondary-fixed-variant: '#45474a'
  tertiary-fixed: '#ffdbd0'
  tertiary-fixed-dim: '#ffb59e'
  on-tertiary-fixed: '#3a0b00'
  on-tertiary-fixed-variant: '#842500'
  background: '#fbf8ff'
  on-background: '#1a1b25'
  surface-variant: '#e3e1ef'
  status-active: '#10B981'
  status-pending: '#F59E0B'
  status-error: '#EF4444'
  status-fulfilled: '#14B8A6'
  status-submitted: '#3E46FF'
  status-inactive: '#6B7280'
  health-ok: '#10B981'
  health-slow: '#F59E0B'
  health-down: '#EF4444'
typography:
  display-kpi:
    fontFamily: Roboto
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Roboto
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Roboto
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Roboto
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
  label-caps:
    fontFamily: Roboto
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.05em
  table-header:
    fontFamily: Roboto
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  code-sm:
    fontFamily: jetbrainsMono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  gap-xs: 4px
  gap-sm: 8px
  gap-md: 16px
  container-padding: 24px
  table-row-height: 32px
  sidebar-width: 240px
  sidebar-collapsed: 64px
---

## Brand & Style

The design system is engineered for professional Supply Chain Management (SCM), prioritizing high-density data visualization and operational efficiency. The brand personality is **Technical, Utilitarian, and Reliable**, evoking a sense of "Mission Control" for procurement professionals. 

The visual style follows a **Modern SaaS (Linear/Ramp)** approach. It utilizes clean lines, subtle hairline borders, and a systematic "layer-up" surface model. While the aesthetic is minimal and functional, it incorporates high-contrast semantic status indicators to ensure critical information—like service health and order blockers—is immediately actionable. The UI balances the "breathable" nature of modern SaaS with the extreme density required for large-scale logistics and financial auditing.

## Colors

The palette is anchored by a vibrant **Primary Brand Blue** (#3E46FF) derived from the core identity. This color is used sparingly for primary actions, active navigation states, and specific "submitted" status roles to maintain its impact.

The system supports both Light and Dark modes using a **Tonal Palette** strategy.
- **Light Mode:** Uses a pure white background (#FFFFFF) with neutral grey borders (#E2E8F0) and slate-colored text for optimal legibility in daylight environments.
- **Dark Mode:** Utilizes a deep obsidian base (#0B0C0E) with elevated surfaces using a subtle blue-grey tint to reduce eye strain during long-tail operational shifts.

**Semantic Status Colors** are high-contrast and non-negotiable. They are applied to badges and service health "dots" to provide instant cognitive mapping of system health and document status.

## Typography

This design system uses **Roboto** as the exclusive typeface to ensure maximum compatibility across enterprise environments and high legibility at small scales. 

The base font size is set to **12px** for standard body text and table data, allowing for high information density without sacrificing readability. **11px** is reserved for secondary metadata and column headers. For status badges, an all-caps **10px bold** style is used to create a distinct visual "stamp" that contrasts with standard data strings.

KPI cards utilize a specialized **Display** style (24px) to ensure primary metrics are visible from a distance, while correlation IDs and technical logs use **JetBrains Mono** to distinguish machine-generated strings from human-readable content.

## Layout & Spacing

The layout uses a **4px base unit** to drive a rigid, data-dense grid. 

- **Application Shell:** A fixed-position Top Bar (56px) houses the Service Health Indicator and Global Search. The Left Navigation Rail is collapsible, transitioning between a 240px expanded state and a 64px icon-only state.
- **Dashboard Grid:** Employs a 12-column fluid grid for desktop. Content cards utilize a 16px gutter. 
- **Data Density:** Table rows are constrained to a 32px height to maximize the "above-the-fold" data count. 
- **Responsive Behavior:** 
  - **Desktop (1440px+):** Full 12-column view.
  - **Tablet (768px - 1439px):** Sidebar collapses automatically; KPI cards reflow to a 2x2 grid.
  - **Mobile (<767px):** Sidebar becomes a bottom-sheet; tables horizontal scroll; base typography remains 12px for precision.

## Elevation & Depth

Visual hierarchy is established through **Tonal Layering** and **Subtle Hairline Borders** rather than heavy shadows, reflecting a modern SaaS aesthetic.

- **Level 0 (Base):** The canvas background (White/Obsidian).
- **Level 1 (Surfaces):** Dashboard cards and Sidebar. These use a 1px solid border (#E2E8F0 in light mode) and no shadow to maintain a "flat" and technical feel.
- **Level 2 (Navigation):** The Top Bar utilizes a backdrop blur (20px) and a bottom hairline divider to feel anchored above the content.
- **Level 3 (Overlays):** Modals and Popovers (like Service Health details) use a focused ambient shadow—low opacity (10%), large blur (24px)—to provide depth without cluttering the technical UI.
- **Loading:** Skeleton pulses are used for Level 1 surfaces to indicate data fetching without layout shifting.

## Shapes

The design system employs a **Soft (0.25rem)** roundedness strategy. This small radius maintains a professional, "engineered" look while feeling modern.

- **Standard Elements:** Input fields, cards, and buttons use a 4px (0.25rem) radius.
- **Interactive Specifics:** Small status chips use a "Pill" (100px) radius to differentiate them from square data containers.
- **Avatars:** Strictly circular (50% radius) for user profiles in the top bar.
- **Focus States:** A 2px offset ring in Primary Blue highlights the 4px rounded shape of focused inputs.

## Components

### Paginated Tables
- **Density:** 32px row height. 
- **Header:** Sticky top, 11px Medium weight text, light grey background (#F8FAFC).
- **Actions:** Kebab menu in the final column for row-level actions.
- **Pagination:** Fixed bottom bar within the table container showing "1-50 of 12,000".

### KPI Cards
- **Structure:** 12px Label at top-left, 24px Bold Value in center, and a "Trend Badge" (green/red) at the bottom-right.
- **Visuals:** Subtle 1px border; backgrounds are pure white or slightly tinted blue-grey in dark mode.

### Status Badges (Chips)
- **Design:** Uppercase 10px bold text. 
- **Logic:** Backgrounds are 10% opacity of the semantic color with 100% opacity text. Exception: "Cancelled" uses a 1px red outline and no background fill.

### Service Health Dots
- **Design:** 8px circles in the Top Bar. 
- **States:** Pulse animation for "Error" states; solid for "OK" and "Slow". Hovering triggers a popover showing service-specific latencies (IAM, SUP, PO).

### Navigation Rail
- **Active State:** Left-side 3px vertical "accent bar" in Primary Blue + 10% blue background tint on the item.
- **Icons:** 20px stroke-based icons for high clarity at small sizes.

### Input Fields
- **Design:** 32px height, 1px border. Label is positioned above the field in 11px secondary text.
- **Validation:** Error states use a 1px red border and an 11px error message below the field.