# Director Architecture

## Goal
Desktop homepage behavior is controlled by one "movie director" pipeline:
- one persistent centered System Core stage,
- one GSAP master timeline for Acts I-V,
- overlay actors entering/exiting around the core,
- subtle idle motion that is reduced during transitions.

## Layers
1. Persistent Stage Layer
- Component: `src/components/home/NarrativeDirector.astro`
- Object renderer: `src/components/home/SystemCore.astro`
- Role: keeps one center anchor alive for the whole narrative.

2. Overlay Actor Layer
- Five overlays in `NarrativeDirector.astro`, one per act (`data-director-act="act1"...`).
- Role: display act content near the stage, never as separate stacked section visuals on desktop.

3. Director Motion Layer
- API owner: `src/scripts/homeDirector.ts`
- Master timeline: `src/scripts/home-scroll-timeline.ts`
- Idle motion: `src/scripts/home-idle-motion.ts`
- Role: state choreography, transition gating, overlap control.

## Content Contract
- Mapping source: `src/content/stage-content.ts`
- Input: existing `homeContent` locale data.
- Output: stable act-shaped contract for overlay slots without schema breaks.

## Runtime Ownership
1. `initHomeScrollAnimations` decides mode.
2. Desktop + non-reduced-motion + director shell present -> `initHomeDirector`.
3. `initHomeDirector` sets `data-director-active="true"` on root.
4. CSS gates hide section visuals and show the fixed director stage.
5. On destroy, director and idle timelines revert and root flag is removed.

## Fallbacks
- Tablet/mobile keep section-based behavior.
- Reduced motion skips director mode and uses static readable section content.
