# ElectroDx Landing Design Direction

## Identity

- Product voice: clinical, rigorous, and calm.
- Visual metaphor: diagnostic instrumentation, not startup marketing.
- Primary audience: rehabilitation physicians and residents in neurophysiology training.

## Dials

- ENERGY: 2 (balanced)
- RHYTHM: 2 (varied, but controlled)
- MOTION: 2 (purposeful transitions, no decorative loops)

## Color System

- Base neutrals: `slate-50` to `slate-950`.
- Accent color: cyan (`cyan-300`/`cyan-700`) for key focus moments.
- Support status:
  - normal/ok: emerald
  - caution/pathologic: amber
- Avoid full-page multi-gradient treatments as a default.

## Typography

- Narrative typography: Inter (sans).
- Technical measurements: monospace only for telemetry values, module IDs, and calibration labels.
- Headings should stay high contrast and avoid decorative gradient text.

## Layout Rules

- The simulator is primary evidence and should stay above the fold on desktop.
- Sections must be content-driven:
  - promise
  - evidence
  - curriculum depth
  - accreditation
  - enrollment CTA
- Avoid repeating the same card grid composition across all sections.

## Motion Rules

- Allowed motion:
  - reveal/fade transitions
  - waveform path drawing on data changes
  - subtle hover feedback on CTAs
- Forbidden motion:
  - infinite pulse/bounce/float loops for decorative elements
  - stacked animation presets on every block

## Interaction Rules

- Every CTA must have a real destination.
- Keep touch targets at least 44px.
- Preserve visible focus states in both light and dark themes.

## Copy Rules

- Prefer specific clinical language over generic marketing claims.
- No fabricated proof points.
- Keep CTA labels explicit and action-based for physicians.
