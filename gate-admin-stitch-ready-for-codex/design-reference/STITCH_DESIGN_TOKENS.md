---
name: Premium Safety Admin
colors:
  surface: '#111225'
  surface-dim: '#111225'
  surface-bright: '#37374d'
  surface-container-lowest: '#0b0c1f'
  surface-container-low: '#191a2d'
  surface-container: '#1d1e32'
  surface-container-high: '#27283d'
  surface-container-highest: '#323348'
  on-surface: '#e1e0fb'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#e1e0fb'
  inverse-on-surface: '#2e2f43'
  outline: '#849495'
  outline-variant: '#3a494b'
  surface-tint: '#00dbe7'
  primary: '#e1fdff'
  on-primary: '#00363a'
  primary-container: '#00f2ff'
  on-primary-container: '#006a71'
  inverse-primary: '#00696f'
  secondary: '#b4c5ff'
  on-secondary: '#002a78'
  secondary-container: '#0053db'
  on-secondary-container: '#cdd7ff'
  tertiary: '#fcf5ff'
  on-tertiary: '#3c0091'
  tertiary-container: '#e2d4ff'
  on-tertiary-container: '#6f3cd8'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#74f5ff'
  primary-fixed-dim: '#00dbe7'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f54'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#e9ddff'
  tertiary-fixed-dim: '#d0bcff'
  on-tertiary-fixed: '#23005c'
  on-tertiary-fixed-variant: '#5516be'
  background: '#111225'
  on-background: '#e1e0fb'
  surface-variant: '#323348'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: '1.3'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

The design system is engineered for a high-fidelity, professional admin environment. It balances the serious, mission-critical nature of safety training with a futuristic, premium aesthetic. The visual direction is rooted in **Glassmorphism** and **Modern Corporate** styles, utilizing deep layered backgrounds to reduce cognitive load while highlighting essential data.

The personality is authoritative yet innovative, evoking a sense of "technological safety." The interface uses high-contrast cyan and blue accents to guide the user's eye toward primary actions and critical status updates. For the admin dashboard, this translates to a workspace that feels expensive, responsive, and secure.

Key stylistic pillars:
- **Depth through Translucency:** Interfaces use varying levels of background blur to establish a clear information hierarchy.
- **Luminous Accents:** Use of subtle glows and linear gradients to signify interactivity and premium status.
- **Precision Typography:** Modern, wide-set sans-serif typefaces to ensure maximum legibility in data-dense environments.
- **RTL-First Logic:** All components are architected for bi-directional layout support, ensuring the premium feel remains consistent for Arabic-speaking administrators.

## Colors

The color palette is built on a foundation of "Deep Space" tones. The primary background (`#0a0b1e`) provides a high-contrast canvas for vibrant functional colors.

- **Primary Cyan (#00f2ff):** Used for focus states, primary data points, and active navigation indicators. It suggests technical precision.
- **Secondary Blue (#2563eb):** Used for standard interactive elements and informational status.
- **Tertiary Violet (#8b5cf6):** Reserved for premium features, specialized certification badges, and secondary buttons.
- **Surface Navy (#121432):** Used for card backgrounds and elevated containers, often paired with a 10-20% opacity white border to simulate glass.
- **Semantic Colors:**
    - **Success:** Emerald Green (#10b981)
    - **Warning:** Amber (#f59e0b)
    - **Danger/Alert:** Rose (#f43f5e)

## Typography

The system utilizes **Plus Jakarta Sans** for its modern, geometric construction and high legibility. It provides a "tech-forward" feel that matches the dashboard’s educational safety theme.

- **Scale:** A tight scale is used for the admin dashboard to ensure data density remains manageable. Display sizes are reserved for analytics summaries and welcome headers.
- **Hierarchy:** High contrast in font weights (from 400 to 800) is used to distinguish between labels and values in data tables.
- **Arabic Optimization:** Plus Jakarta Sans pairs effectively with IBM Plex Sans Arabic or similar geometric Arabic typefaces. Ensure line-height is increased by 10-15% when rendering Arabic text to accommodate character ascenders/descenders.

## Layout & Spacing

This design system uses a **Fluid Grid** approach for the main dashboard content, while the sidebar remains fixed.

- **Grid System:** A 12-column grid for desktop with 24px gutters. On tablet, this reflows to an 8-column grid. Mobile uses a single-column layout with 16px side margins.
- **Sidebar:** Fixed width of 280px for desktop. In RTL mode, the sidebar mirrors to the right side of the screen.
- **Spacing Rhythm:** Based on a 4px baseline. Components primarily use 16px (md) and 24px (lg) increments to create a spacious, premium feel that avoids "data-cramming."
- **RTL Reflow:** Horizontal spacing, padding-left/right, and margins must use logical properties (padding-inline-start/end) to ensure seamless transition between English and Arabic.

## Elevation & Depth

Visual hierarchy is managed through **Glassmorphism** and tonal stacking.

1.  **Base Layer:** The deepest background (#0a0b1e). No elevation.
2.  **Surface Layer (Cards/Panels):** #121432 with a 1px border. The border should be a subtle gradient (White at 10% to White at 2% opacity).
3.  **Active Layer (Modals/Popovers):** Higher backdrop blur (20px-30px) with a subtle outer glow using the primary cyan color at 5-10% opacity.
4.  **Shadows:** Shadows are rarely used. Instead, depth is created through "Inner Glows" (box-shadow: inset ...) and thin, high-contrast borders that catch the "light" from the top-left (or top-right in RTL).

## Shapes

The design system favors generous, modern roundedness to soften the technical dark aesthetic.

- **Standard Radius:** 16px (rounded-lg) for main dashboard cards and containers.
- **Component Radius:** 8px (standard) for input fields, buttons, and small interactive elements.
- **Pill Shapes:** Used exclusively for "Status Chips" (e.g., "Active," "Completed") and specific call-to-action buttons to make them instantly recognizable as interactive.

## Components

- **Primary Buttons:** High-impact gradients (Cyan to Blue). Use a "glow" hover state where the shadow becomes a soft cyan bloom. Text should be bold and high-contrast white.
- **Glass Cards:** Background-color: `rgba(18, 20, 50, 0.7)`; Backdrop-filter: `blur(12px)`. Borders must be 1px solid `rgba(255, 255, 255, 0.1)`.
- **Data Tables:** Headers use `label-lg` typography with a subtle navy background. Rows use a 1px bottom border (#1e2145). Active or hovered rows should have a subtle cyan left-border (right-border in RTL) to indicate selection.
- **Input Fields:** Dark background (#050614) with an 8px radius. The focus state must transition the border color to the Primary Cyan with a 4px outer glow.
- **Chips/Badges:** Small, semi-transparent fills with high-saturation text. For example, a "Safety" chip uses 10% Purple fill with 100% Purple text.
- **Progress Bars:** Use the Cyan-to-Blue gradient for the "fill" to indicate completion, with a dark, recessed track.