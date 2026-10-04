
# SKILL: HUMAN-CRAFTED FRONTEND & ANTI-AI SLOP FILTER

## MISSION

Eliminate generic "AI slop" aesthetics. Build interfaces that look deliberate,
authoritative, domain-specific, and crafted by expert human designers.
Prioritize clarity, density, information hierarchy, and engineering precision.

---

## 1. HARD PROHIBITIONS (STRICTLY FORBIDDEN)

1. NO TEXT GRADIENTS: Never use `bg-clip-text text-transparent bg-gradient-to-*` on headlines. Text must be solid, high-contrast, and legible.
2. NO FLOATING GLASSMORPHISM: Never use `backdrop-blur-md bg-white/5 border-white/10` on primary content cards. Cards must use solid, opaque backgrounds with crisp 1px borders.
3. NO SPARKLE/MAGIC ICONS: Never use `Sparkles`, `Wand2`, or glowing orbs as decorative accents unless representing a literal, active AI generative action.
4. NO OVERSIZED PILL BUTTONS: Action buttons must use `rounded-md` or `rounded-lg` (6px to 8px radius). Never use `rounded-full` for main CTA buttons.
5. NO GLOWING NEON SHADOWS: Prohibit `shadow-cyan-500/50` or `shadow-indigo-500/30`. Shadows must be achromatic, subtle, and natural (e.g., `0 1px 3px rgba(0,0,0,0.12)`).
6. NO GENERIC BENTO GRIDS: Do not force layout elements into uniform 4-column cards with meaningless metrics (e.g., "99.9% Speed", "10x Faster"). If data is shown, it must be functional, domain-accurate, and structurally meaningful.

---

## 2. VISUAL FOUNDATIONS & TOKENS

- Color System (60-30-10 Rule):
  * 60% Base / Background: Deep, solid neutrals (e.g., `#090D16`, `#0F172A` or pure `#FAFAFA` in light mode).
  * 30% Structure & Surfaces: Subtle contrast panels, borders (`1px solid var(--border)`), and text layers (`foreground` / `muted-foreground`).
  * 10% Functional Accent: One singular accent color used exclusively for primary CTAs, active data points, or diagnostic statuses (e.g., Medical Electric Blue `#2563EB` or Emerald `#059669`).
- Spacing System:
  * Strict mathematical scale: 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px.
  * Internal padding of cards must always exceed the gap between adjacent cards.
- Typography & Hierarchy:
  * Restrict to a maximum of 4 font sizes per view (Hero Title, Section Header, Body, Metadata/Label).
  * Restrict to 2 weights: Regular (400) and SemiBold (600).
  * For telemetry, scientific, medical, and numerical data: ALWAYS use a tabular, monospace font (`font-mono` / `tabular-nums`).

---

## 3. COMPONENT & LAYOUT PRINCIPLES

- Asymmetric & Functional Layouts: Do not center-align everything. Anchor layouts with strong left alignments, crisp dividers, and functional side-by-side structures.
- Product-First Evidence: Place real interactive demonstrators, actual diagnostic trace viewers, or real data tables directly above or next to the value proposition.
- State Completeness: Every interactive data component must explicitly handle:
  1. Default State
  2. Hover / Active Focus State (WCAG-compliant keyboard focus ring)
  3. Loading State (Structured skeleton, not generic spinners)
  4. Empty / Error State with recovery action

---

## 4. PRE-DELIVERY SELF-AUDIT

Before marking any UI code as complete, verify:

- [ ] Is there any decorative gradient on text? (If yes, remove it).
- [ ] Does the screen look like a generic tech template, or does it look like specialized software for its domain?
- [ ] Are all metric values verified, realistic, and formatted with proper units?
- [ ] Can every button and link be reached and navigated using only the `Tab`, `Enter`, and `Esc` keys?
