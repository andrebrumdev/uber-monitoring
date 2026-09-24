---
name: Recibos de corrida
description: Prospecto Cívico — bone-white emptiness, one continuous ribbon, one violet button.
colors:
  ground: "#F7F7FA"
  ground-end: "#FFFFFF"
  surface: "#FFFFFF"
  ink: "#1B1547"
  body: "#4B5165"
  violet: "#6B5CE7"
  violet-hover: "#5A4BD6"
  violet-active: "#3F3499"
  violet-tint: "#EFEDFC"
  hairline: "#E6E7EE"
  control-edge: "#D3D4E0"
  error: "#C2364B"
  ribbon-1: "#7FD8D0"
  ribbon-2: "#C9B8F0"
  ribbon-3: "#5B4FD6"
typography:
  display:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.875rem, 8.5vw, 3.5rem)"
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
  caption:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  control: "8px"
  panel: "12px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  form-gap: "16px"
components:
  button-primary:
    backgroundColor: "{colors.violet}"
    textColor: "#FFFFFF"
    rounded: "{rounded.control}"
    typography: "{typography.label}"
    padding: "0 24px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.violet-hover}"
  button-primary-active:
    backgroundColor: "{colors.violet-active}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    typography: "{typography.body}"
    height: "44px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
---

# Design System: Recibos de corrida

## Overview

**Creative North Star: "Prospecto Cívico" (challenger civic-bureau-prospectus, late-modern corporate)**

The world is almost entirely bone-white emptiness: one continuous ribbon of light (teal → lilac → violet) and one violet action are the only color the system spends. Ink (`#1B1547`, never pure black) carries the argument in two weights of a single grotesque face — Figtree, 400 and 500 only. The system explicitly refuses the category default it was built against: the centered, shadowed login card and the KPI-card dashboard. Depth comes from the hairline and from tonal contrast, not from shadow; the one confirmed exception is a single diffuse shadow on the modal panel, never on cards, buttons, or inputs.

The build currently covers the Login screen, the Home header (brand mark + sign-out), the Home error banner, and the "E-mail original" modal. The Home search form (month/year selects, "Buscar Recibos da Uber" heading), the results table, and the pie chart still run on unstyled shadcn/zinc defaults (their icons are lucide, like the rest of the app) — they inherit the color tokens through the shadcn variable mapping but are not yet expressions of this world (tracked as a future subproject). Do not treat them as reference components.

**Key Characteristics:**
- Bone-white ground, one violet accent, one decorative ribbon gradient — no secondary or tertiary accent color.
- Figtree 400/500 only; no synthetic bold, no display face beyond the body grotesque at larger size.
- 8px controls, 12px panels; hairline dividers; flat by default, one named shadow exception.
- Tabular figures on every currency value.

## Colors

The palette is almost monochrome by design: one ink, one body gray, one violet, and the ribbon gradient are the entire vocabulary.

### Primary
- **Prospect Violet** (`#6B5CE7`, hover `#5A4BD6`, active `#3F3499`): the single accent. Used on the primary button, the second line of the Login headline, focus rings, links, and the outlined "Sair" control in the Home header. Nowhere else.

### Neutral
- **Bone Ground** (`#F7F7FA` → `#FFFFFF`): page background, rendered as a top-to-bottom gradient on Login.
- **Panel White** (`#FFFFFF`): cards, inputs, modal surface.
- **Deep Ink** (`#1B1547`): headline and body text color; deliberately never pure black.
- **Slate Body** (`#4B5165`): deck copy, secondary text, muted foreground.
- **Hairline** (`#E6E7EE`): the only border/divider color at rest; control borders use a slightly darker `#D3D4E0` edge.

### Signature gradient
- **Ribbon** (`#7FD8D0` → `#C9B8F0` → `#5B4FD6`): the sole decorative device in the world, a continuous SVG band on Login. It is not a reusable color role for UI chrome — it exists only as the ribbon illustration.

### Error
- **Alert Red** (`#C2364B`, 6% tint background in light; `#F07A8C`, 12% tint in dark): reserved for validation and connection errors only (banner, input `aria-invalid`, error text).

### Named Rules
**The One Accent Rule.** Violet is the only color spent on interactive emphasis. It appears on ≤1 button and ≤1 line of text per view; its rarity is what makes it read as action.

## Typography

**Display/Body Font:** Figtree (with ui-sans-serif, system-ui, sans-serif fallback), packaged as local `.woff2` files (OFL 1.1) so the app works offline — not an npm dependency.

**Character:** A single geometric grotesque carries the whole hierarchy at two weights (400, 500). No mixed families, no synthetic bold (`font-synthesis-weight: none`).

### Hierarchy
- **Display** (500, `clamp(30px, 8.5vw, 56px)` on Login, 1.05 line-height, -0.025em tracking): the two-line Login headline; line 1 in ink, line 2 in violet.
- **Body** (400, 18px, 1.6 line-height, max 44ch): the Login deck copy.
- **Label** (500, 14px): field labels, button text.
- **Caption** (400, 13px): trust line, app-password hint, modal description.
- Currency and numeric values everywhere use `font-variant-numeric: tabular-nums`.

### Named Rules
**The Two-Weight Rule.** Only 400 and 500 exist in this world. Never fabricate a 600/700 for emphasis; use color (violet) or size instead.

## Layout

Login is a two-column split on wide viewports (≥900px): a left text/form column at `max(52%, 500px)` with responsive padding (`clamp(64px, …, 96px)` left inset), and the ribbon bleeding down the right ~45%. Below 900px the ribbon collapses to a 120px horizontal band at the top and the column becomes full-width, stacked.

The Home header is a sticky 64px bar (`h-16`) with the brand mark left and email + sign-out right, bottom hairline border.

Spacing rhythm is built from an 8px base: form field gaps at 16px (`gap-4`), label-to-input at 6px (`gap-1.5`), section gaps at 24-40px. The Login form column caps at 380px; the ribbon crest reaches at most 12px toward the cursor.

## Elevation & Depth

The system is flat by default: cards, inputs, and buttons carry no box-shadow, and depth is conveyed through the hairline border and surface/ground contrast instead. The one confirmed exception is the modal (`EmailPreview`), which keeps a single diffuse shadow to separate it from the dimmed backdrop (`bg-[#1B1547]/45` overlay in light, `black/60` in dark).

### Named Rules
**The Flat-Except-Modal Rule.** No box-shadow on cards, buttons, inputs, or panels. The modal is the sole surface allowed a shadow, because it floats over a dimmed backdrop rather than sitting on the page.

## Shapes

Two radius steps only: 8px (`--radius-control`) for buttons and inputs, 12px (`--radius-panel`) for panels, cards, and the modal. Corners are gently rounded, never sharp and never pill-shaped. Separation between regions is a 1px hairline, not a border-plus-shadow combination.

## Components

### Buttons
- **Shape:** 8px radius (`rounded-control`), 44px height on the Login primary action.
- **Primary:** solid violet fill, white text, no shadow (`shadow-none` explicitly overrides the shadcn default `shadow-xs`); full-width on Login, trailing chevron that shifts 2px on hover.
- **Secondary (Home "Sair"):** outline variant, violet border and text on transparent background, violet-tint fill on hover, deeper violet on active — no shadow.
- **Hover / Focus:** 300ms `cubic-bezier(.25,1,.5,1)` color transitions; focus ring is a 3px violet ring at 40% opacity, never a color-only change.

### Cards / Containers
- **Corner Style:** 12px (`rounded-panel`).
- **Background:** panel white on card, error-tint on the error banner.
- **Shadow Strategy:** none (see Elevation & Depth); separation comes from the hairline border.
- **Border:** 1px hairline at rest; destructive banner uses a 30%-opacity destructive border instead.

### Inputs / Fields
- **Style:** 8px radius, hairline/control-edge border, 44px height, white surface.
- **Focus:** border shifts to violet plus a 3px violet ring at 40% opacity, 300ms ease.
- **Error:** border shifts to the destructive color; the field is paired with a `role="alert"` line below the form, not inline per-field text.
- **Read-only (busy state):** text drops to muted-foreground color rather than graying the whole control.

### Error Banner
- **Style:** rounded-panel container, destructive-tinted background, 30%-opacity destructive border, destructive icon; entrance animates in (`animate-banner-in`, 8px rise over 300ms).
- **Content:** a bold title mapped from the error code plus a plain-language body sentence; always dismissible with a close control in the corner.

### Modal ("E-mail original")
- **Style:** 12px-radius panel, single diffuse shadow (the system's one shadow exception), rises 24px over 300ms on open (`animate-dialog-in`) — a faster variant of the Login panel's 800ms rise.
- **Overlay:** ink at 45% opacity in light mode, black at 60% in dark mode — never a neutral gray scrim.
- **Content trust framing:** carries a `ShieldCheck` line stating that scripts and remote images are blocked; the original e-mail renders inside a sandboxed, permission-empty iframe.

### Signature Component: The Ribbon
A single decorative `<svg>` gradient band (teal → lilac → violet), aria-hidden, that bleeds along the Login screen's trailing edge. Its crest bends up to 12px toward the cursor on pointer move (disabled under `prefers-reduced-motion`), and its ambient drift animation slows (not pauses) while the form is busy. It is the only illustrative device in the system and is not a general-purpose background pattern — it appears once, on Login.

## Do's and Don'ts

### Do:
- **Do** spend violet on exactly one primary action per view; everything else stays ink, body-gray, or hairline.
- **Do** use tabular figures (`font-variant-numeric: tabular-nums`) for every currency and numeric value.
- **Do** keep buttons, inputs, cards, and the error banner shadow-free; reserve the one diffuse shadow for the modal only.
- **Do** respect `prefers-reduced-motion`: the ribbon crest and drift, the panel rise, and the banner entrance all must collapse to static/instant.

### Don't:
- **Don't** introduce a second accent color or a KPI-card dashboard layout; the direction contract explicitly refuses the shadowed, centered login card and the KPI-card pattern this category defaults to.
- **Don't** add hard-offset or neobrutalist-style shadows anywhere; this is not that world.
- **Don't** use a weight other than Figtree 400/500, or synthesize bold.
- **Don't** extend the Login/header/banner/modal system onto the still-unstyled Home search form, table, or pie chart without a deliberate redesign pass — they currently only inherit color tokens through the shadcn variable mapping and are not evidence of this system's component patterns.
