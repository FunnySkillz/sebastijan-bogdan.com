# Timeline Contract

## Normalized Ranges

| ID | Kind | Start | End |
|---|---|---:|---:|
| `act1` | act | 0.00 | 0.16 |
| `trans-12` | transition | 0.16 | 0.28 |
| `act2` | act | 0.28 | 0.44 |
| `trans-23` | transition | 0.44 | 0.58 |
| `act3` | act | 0.58 | 0.74 |
| `trans-34` | transition | 0.74 | 0.84 |
| `act4` | act | 0.84 | 0.93 |
| `trans-45` | transition | 0.93 | 1.00 |

## Stage Mode Type
`StageMode = "act1" | "act2" | "act3" | "act4" | "act5" | "transition" | "resolve"`

`data-stage-mode` is driven by scroll progress:
- act ranges -> current act mode,
- transition ranges -> `"transition"`,
- final tail (`> 0.985`) -> `"resolve"`.

## Hook Naming Contract

### Stage
- `data-narrative-director`
- `data-director-stage`
- `data-stage-mode`

### Overlays
- `data-director-overlay`
- `data-director-act="act1|act2|act3|act4|act5"`
- `data-director-project-panel`
- `data-director-project-dot`

### System Core
- `data-core-family="halo-ring|core-drum|locking-plates|cartridges|rails|signal-traces"`
- `data-core-mode-layer="act1|act2|act3|act4|act5"`
- `data-core-transition-layer="trans-12|trans-23|trans-34|trans-45"`
- `data-idle-ring`
- `data-idle-trace`

## Overlap Guardrails
- One act overlay is dominant (`autoAlpha >= 0.85`) in each act range.
- Cross-act overlap is limited to transition windows.
- Outgoing overlay is reduced close to zero before next act reaches stable dominance.

## Director Interfaces
- `initHomeDirector({ root, breakpoint, reducedMotion }): { destroy() }`
- `initHomeScrollTimeline({ root, setIdleSuppressed, onOverlayState }): { destroy() }`
- `initHomeIdleMotion({ root }): { destroy(), setSuppressed(boolean) }`
