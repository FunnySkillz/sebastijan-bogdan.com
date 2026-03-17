import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export type StageMode = "act1" | "act2" | "act3" | "act4" | "act5" | "transition" | "resolve";
export type DirectorRangeKind = "act" | "transition";

export interface DirectorRange {
  id: string;
  start: number;
  end: number;
  kind: DirectorRangeKind;
}

export interface DirectorOverlayState {
  activeAct: "act1" | "act2" | "act3" | "act4" | "act5";
  visibilityMap: Record<"act1" | "act2" | "act3" | "act4" | "act5", number>;
  emphasisMap: Record<string, number>;
}

export interface HomeScrollTimelineOptions {
  root: HTMLElement;
  setIdleSuppressed?: (suppressed: boolean) => void;
  onOverlayState?: (state: DirectorOverlayState) => void;
}

export interface HomeScrollTimelineHandle {
  destroy: () => void;
}

const ACT_IDS = ["act1", "act2", "act3", "act4", "act5"] as const;
type DirectorActId = (typeof ACT_IDS)[number];
type TransitionId = "trans-12" | "trans-23" | "trans-34" | "trans-45";

export const DIRECTOR_RANGES: DirectorRange[] = [
  { id: "act1", start: 0.0, end: 0.16, kind: "act" },
  { id: "trans-12", start: 0.16, end: 0.28, kind: "transition" },
  { id: "act2", start: 0.28, end: 0.44, kind: "act" },
  { id: "trans-23", start: 0.44, end: 0.58, kind: "transition" },
  { id: "act3", start: 0.58, end: 0.74, kind: "act" },
  { id: "trans-34", start: 0.74, end: 0.84, kind: "transition" },
  { id: "act4", start: 0.84, end: 0.93, kind: "act" },
  { id: "trans-45", start: 0.93, end: 1.0, kind: "transition" }
];

const TRANSITION_PAIR_BY_ID: Record<TransitionId, { from: DirectorActId; to: DirectorActId }> = {
  "trans-12": { from: "act1", to: "act2" },
  "trans-23": { from: "act2", to: "act3" },
  "trans-34": { from: "act3", to: "act4" },
  "trans-45": { from: "act4", to: "act5" }
};

const OVERLAY_TRANSITION = {
  outFadeStart: 0.18,
  outFadeEnd: 0.56,
  inFadeStart: 0.44,
  inFadeEnd: 0.82
} as const;

const PROJECT_WINDOW = {
  start: 0.52,
  end: 0.84,
  centers: [0.18, 0.52, 0.84],
  spread: 0.34
} as const;

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function rangeLerp(progress: number, start: number, end: number): number {
  if (end <= start) return 0;
  return clamp((progress - start) / (end - start));
}

function makeEmptyVisibilityMap(): Record<DirectorActId, number> {
  return {
    act1: 0,
    act2: 0,
    act3: 0,
    act4: 0,
    act5: 0
  };
}

function getRangeAtProgress(progress: number): DirectorRange {
  const p = clamp(progress);
  const lastIndex = DIRECTOR_RANGES.length - 1;
  const found = DIRECTOR_RANGES.find(
    (range, index) => p >= range.start && (p < range.end || index === lastIndex)
  );

  return found ?? DIRECTOR_RANGES[0];
}

function computeVisibility(progress: number): Record<DirectorActId, number> {
  const range = getRangeAtProgress(progress);
  const visibilityMap = makeEmptyVisibilityMap();

  if (range.kind === "act") {
    visibilityMap[range.id as DirectorActId] = 1;
    return visibilityMap;
  }

  const pair = TRANSITION_PAIR_BY_ID[range.id as TransitionId];
  if (!pair) {
    return visibilityMap;
  }

  const transitionProgress = rangeLerp(progress, range.start, range.end);
  const { outFadeStart, outFadeEnd, inFadeStart, inFadeEnd } = OVERLAY_TRANSITION;

  const outgoingAlpha =
    transitionProgress <= outFadeStart
      ? 1
      : transitionProgress >= outFadeEnd
        ? 0
        : 1 - rangeLerp(transitionProgress, outFadeStart, outFadeEnd);

  const incomingAlpha =
    transitionProgress <= inFadeStart
      ? 0
      : transitionProgress >= inFadeEnd
        ? 1
        : rangeLerp(transitionProgress, inFadeStart, inFadeEnd);

  visibilityMap[pair.from] = clamp(outgoingAlpha);
  visibilityMap[pair.to] = clamp(incomingAlpha);

  return visibilityMap;
}

function getDominantAct(visibilityMap: Record<DirectorActId, number>): DirectorActId {
  return ACT_IDS.reduce((best, act) => (visibilityMap[act] > visibilityMap[best] ? act : best), "act1");
}

function isTransitionProgress(progress: number): boolean {
  return DIRECTOR_RANGES.some(
    (range) => range.kind === "transition" && progress >= range.start && progress < range.end
  );
}

function syncProjectMode(
  progress: number,
  panels: HTMLElement[],
  dots: HTMLElement[],
  stage: HTMLElement
): { panelIndex: number; panelEmphasis: number } {
  if (!panels.length || !dots.length) {
    return { panelIndex: 0, panelEmphasis: 0 };
  }

  const inProjectWindow = progress >= PROJECT_WINDOW.start && progress <= PROJECT_WINDOW.end;
  const localProgress = inProjectWindow
    ? rangeLerp(progress, PROJECT_WINDOW.start, PROJECT_WINDOW.end)
    : 0;

  const weights = PROJECT_WINDOW.centers.map((center) =>
    inProjectWindow ? clamp(1 - Math.abs(localProgress - center) / PROJECT_WINDOW.spread) : 0
  );

  let activeIndex = 0;
  let emphasis = 0;
  weights.forEach((weight, index) => {
    if (weight > emphasis) {
      emphasis = weight;
      activeIndex = index;
    }
  });

  panels.forEach((panel, index) => {
    const weight = weights[index] ?? 0;
    const isActive = index === activeIndex && emphasis >= 0.76;
    const baseAlpha = inProjectWindow ? 0.14 : 0.06;
    panel.classList.toggle("is-active", isActive);
    gsap.set(panel, {
      autoAlpha: baseAlpha + weight * 0.86,
      y: 12 - weight * 12,
      scale: 0.965 + weight * 0.035
    });
  });

  dots.forEach((dot, index) => {
    const weight = weights[index] ?? 0;
    const isActive = index === activeIndex && emphasis >= 0.76;
    dot.classList.toggle("is-active", isActive);
    gsap.set(dot, {
      autoAlpha: 0.28 + weight * 0.72,
      scale: 1 + weight * 0.08
    });
  });

  stage.dataset.projectMode = emphasis >= 0.28 ? String(activeIndex + 1) : "idle";
  return { panelIndex: activeIndex, panelEmphasis: emphasis };
}

export function initHomeScrollTimeline(options: HomeScrollTimelineOptions): HomeScrollTimelineHandle {
  const { root, setIdleSuppressed, onOverlayState } = options;
  gsap.registerPlugin(ScrollTrigger);

  const shell = root.querySelector<HTMLElement>("[data-narrative-director]");
  const stage = root.querySelector<HTMLElement>("[data-director-stage]");
  const heroAct = root.querySelector<HTMLElement>("#act-hero");
  const contactAct = root.querySelector<HTMLElement>("#act-contact");

  if (!shell || !stage || !heroAct || !contactAct) {
    return { destroy: () => undefined };
  }

  const overlays = Object.fromEntries(
    ACT_IDS.map((id) => [id, root.querySelector<HTMLElement>(`[data-director-overlay][data-director-act='${id}']`)])
  ) as Record<DirectorActId, HTMLElement | null>;

  const modeLayers = Object.fromEntries(
    ACT_IDS.map((id) => [id, stage.querySelector<SVGGElement>(`[data-core-mode-layer='${id}']`)])
  ) as Record<DirectorActId, SVGGElement | null>;

  const transitionLayers = {
    "trans-12": stage.querySelector<SVGGElement>("[data-core-transition-layer='trans-12']"),
    "trans-23": stage.querySelector<SVGGElement>("[data-core-transition-layer='trans-23']"),
    "trans-34": stage.querySelector<SVGGElement>("[data-core-transition-layer='trans-34']"),
    "trans-45": stage.querySelector<SVGGElement>("[data-core-transition-layer='trans-45']")
  };

  const haloRing = stage.querySelector<SVGGElement>("[data-core-family='halo-ring']");
  const lockingPlates = stage.querySelector<SVGGElement>("[data-core-family='locking-plates']");
  const cartridges = stage.querySelector<SVGGElement>("[data-core-family='cartridges']");
  const rails = stage.querySelector<SVGGElement>("[data-core-family='rails']");
  const sharedLines = Array.from(stage.querySelectorAll<SVGElement>("[data-idle-trace]"));
  const projectPanels = Array.from(
    root.querySelectorAll<HTMLElement>("[data-director-overlay][data-director-act='act3'] [data-director-project-panel]")
  );
  const projectDots = Array.from(root.querySelectorAll<HTMLElement>("[data-director-project-dot]"));

  const context = gsap.context(() => {
    gsap.set(shell, { autoAlpha: 1 });
    gsap.set(stage, {
      autoAlpha: 1,
      scale: 0.94,
      yPercent: 4,
      transformOrigin: "center center",
      "--director-grid-shift": "0px"
    });
    gsap.set(sharedLines, { autoAlpha: 0.28 });

    ACT_IDS.forEach((actId, index) => {
      gsap.set(modeLayers[actId], {
        autoAlpha: index === 0 ? 1 : 0.12,
        x: index === 0 ? 0 : index % 2 === 0 ? -22 : 22,
        y: index === 0 ? 0 : index % 2 === 0 ? 16 : -14,
        rotation: index === 0 ? 0 : index % 2 === 0 ? -6 : 6,
        transformOrigin: "center center"
      });
      gsap.set(overlays[actId], { autoAlpha: index === 0 ? 1 : 0, y: index === 0 ? 0 : 20 });
    });

    Object.values(transitionLayers).forEach((layer) => {
      gsap.set(layer, { autoAlpha: 0, transformOrigin: "center center" });
    });

    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: heroAct,
        start: "top top+=84",
        endTrigger: contactAct,
        end: "bottom top+=90",
        scrub: true,
        invalidateOnRefresh: true,
        onEnter: () => gsap.set(shell, { autoAlpha: 1 }),
        onEnterBack: () => gsap.set(shell, { autoAlpha: 1 }),
        onLeave: () => gsap.set(shell, { autoAlpha: 0 }),
        onLeaveBack: () => gsap.set(shell, { autoAlpha: 0 }),
        onUpdate: (self) => {
          const progress = clamp(self.progress);
          const activeRange = getRangeAtProgress(progress);
          const transitionPair =
            activeRange.kind === "transition"
              ? TRANSITION_PAIR_BY_ID[activeRange.id as TransitionId]
              : null;
          const visibilityMap = computeVisibility(progress);
          const activeAct = getDominantAct(visibilityMap);
          const transitionActive = isTransitionProgress(progress);
          const panelState = syncProjectMode(progress, projectPanels, projectDots, stage);

          ACT_IDS.forEach((actId) => {
            const alpha = visibilityMap[actId];
            const overlay = overlays[actId];
            if (!overlay) return;

            let yOffset = (1 - alpha) * 14;
            if (transitionPair) {
              if (actId === transitionPair.from) {
                yOffset = -(1 - alpha) * 10;
              } else if (actId === transitionPair.to) {
                yOffset = (1 - alpha) * 20;
              }
            }

            gsap.set(overlay, {
              autoAlpha: alpha,
              y: yOffset
            });
            overlay.classList.toggle("is-dominant", alpha >= 0.85);
            overlay.style.zIndex = alpha > 0.01 ? String(10 + Math.round(alpha * 40)) : "0";
            overlay.style.pointerEvents = alpha >= 0.86 ? "auto" : "none";
          });

          stage.dataset.stageMode = transitionActive
            ? progress > 0.985
              ? "resolve"
              : "transition"
            : activeAct;

          setIdleSuppressed?.(transitionActive);
          onOverlayState?.({
            activeAct,
            visibilityMap,
            emphasisMap: {
              activePanelIndex: panelState.panelIndex,
              panelEmphasis: panelState.panelEmphasis
            }
          });
        }
      }
    });

    tl.to(stage, { scale: 1, yPercent: 0, duration: 0.16 }, 0.0);
    tl.to(stage, { "--director-grid-shift": "24px", duration: 1 }, 0.0);
    tl.to(sharedLines, { autoAlpha: 0.72, strokeDashoffset: 0, duration: 0.22, stagger: 0.01 }, 0.01);

    tl.to(modeLayers.act1, { autoAlpha: 1, x: 0, y: 0, rotation: 0, duration: 0.16 }, 0.0);
    tl.to(transitionLayers["trans-12"], { autoAlpha: 1, strokeDashoffset: 0, duration: 0.08 }, 0.16);
    tl.to(modeLayers.act1, { autoAlpha: 0.12, x: -24, y: -16, rotation: -8, duration: 0.12 }, 0.16);
    tl.to(modeLayers.act2, { autoAlpha: 1, x: 0, y: 0, rotation: 0, duration: 0.12 }, 0.2);
    tl.to(transitionLayers["trans-12"], { autoAlpha: 0.14, duration: 0.06 }, 0.24);
    tl.to(haloRing, { rotation: 7, duration: 0.12 }, 0.22);

    tl.to(transitionLayers["trans-23"], { autoAlpha: 1, strokeDashoffset: 0, duration: 0.1 }, 0.44);
    tl.to(modeLayers.act2, { autoAlpha: 0.16, x: 20, y: -14, rotation: 8, duration: 0.12 }, 0.44);
    tl.to(modeLayers.act3, { autoAlpha: 1, x: 0, y: 0, rotation: 0, duration: 0.12 }, 0.5);
    tl.to(transitionLayers["trans-23"], { autoAlpha: 0.16, duration: 0.08 }, 0.56);
    tl.to(cartridges, { x: 14, y: -8, duration: 0.1 }, 0.5);
    tl.to(cartridges, { x: 0, y: 0, duration: 0.08 }, 0.66);

    tl.to(transitionLayers["trans-34"], { autoAlpha: 1, strokeDashoffset: 0, duration: 0.08 }, 0.74);
    tl.to(modeLayers.act3, { autoAlpha: 0.14, x: -20, y: 16, rotation: -7, duration: 0.1 }, 0.74);
    tl.to(modeLayers.act4, { autoAlpha: 1, x: 0, y: 0, rotation: 0, duration: 0.1 }, 0.78);
    tl.to(transitionLayers["trans-34"], { autoAlpha: 0.16, duration: 0.06 }, 0.84);
    tl.to(rails, { autoAlpha: 0.72, duration: 0.08 }, 0.82);

    tl.to(transitionLayers["trans-45"], { autoAlpha: 1, strokeDashoffset: 0, duration: 0.06 }, 0.93);
    tl.to(modeLayers.act4, { autoAlpha: 0.14, x: 14, y: -10, rotation: 5, duration: 0.07 }, 0.93);
    tl.to(modeLayers.act5, { autoAlpha: 1, x: 0, y: 0, rotation: 0, duration: 0.07 }, 0.95);
    tl.to(transitionLayers["trans-45"], { autoAlpha: 0.1, duration: 0.04 }, 0.985);
    tl.to(lockingPlates, { autoAlpha: 0.72, duration: 0.05 }, 0.97);
    tl.to(haloRing, { rotation: 2, duration: 0.05 }, 0.97);
  }, root);

  return {
    destroy: () => {
      context.revert();
    }
  };
}
