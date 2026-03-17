# QA Acceptance Matrix

## Build and Routing
- [ ] `npm run build` succeeds.
- [ ] `/` and `/en` render without console errors.
- [ ] Existing non-home routes still resolve.

## Cinematic Continuity (Desktop)
- [ ] Center System Core is visible from Act I start through Act V resolve.
- [ ] No transition appears as "scroll into empty next block".
- [ ] Viewer focus remains center-weighted during handoffs.

## Overlay Dominance and Overlap
- [ ] At each act midpoint, only one overlay is dominant (`>= 0.85`).
- [ ] At transition midpoints, only expected adjacent acts overlap.
- [ ] Previous act content is near-zero before next act stabilizes.

## Screenshot Checkpoints
- [ ] Act I midpoint
- [ ] I->II transition midpoint
- [ ] Act II midpoint
- [ ] II->III transition midpoint
- [ ] Act III midpoint
- [ ] III->IV transition midpoint
- [ ] Act IV midpoint
- [ ] Act V final resolve

Each screenshot must look clearly different while remaining part of the same System Core world.

## Motion and Performance
- [ ] Major choreography uses transform/opacity/stroke-dashoffset.
- [ ] No long dead scroll intervals.
- [ ] No abrupt card-pop behavior.
- [ ] Idle motion is subtle and reduced during transitions.

## Accessibility / Reduced Motion
- [ ] Reduced motion mode avoids long pinned cinematic choreography.
- [ ] Content remains readable and complete in reduced motion.
- [ ] Interactive links in final act remain keyboard-focusable and visible.

## Responsive
- [ ] Desktop uses director stage (`data-director-active=true`).
- [ ] Tablet/mobile use section fallback and remain readable.
- [ ] No clipped overlays at common desktop widths (1280/1440/1728).
