import { initHomeIdleMotion } from "./home-idle-motion";
import { initHomeScrollTimeline } from "./home-scroll-timeline";

export type StageMode = "act1" | "act2" | "act3" | "act4" | "act5" | "transition" | "resolve";

export interface DirectorRange {
  id: string;
  start: number;
  end: number;
  kind: "act" | "transition";
}

export interface DirectorOverlayState {
  activeAct: "act1" | "act2" | "act3" | "act4" | "act5";
  visibilityMap: Record<"act1" | "act2" | "act3" | "act4" | "act5", number>;
  emphasisMap: Record<string, number>;
}

export interface HomeDirectorOptions {
  root: HTMLElement;
  breakpoint: "mobile" | "tablet" | "desktop";
  reducedMotion: boolean;
}

export interface HomeDirectorHandle {
  destroy: () => void;
}

export function initHomeDirector(options: HomeDirectorOptions): HomeDirectorHandle {
  const { root, breakpoint, reducedMotion } = options;
  if (breakpoint !== "desktop") {
    root.removeAttribute("data-director-active");
    return { destroy: () => undefined };
  }

  const shell = root.querySelector<HTMLElement>("[data-narrative-director]");
  if (!shell) {
    root.removeAttribute("data-director-active");
    return { destroy: () => undefined };
  }

  if (reducedMotion) {
    root.removeAttribute("data-director-active");
    return { destroy: () => undefined };
  }

  root.setAttribute("data-director-active", "true");
  const idleHandle = initHomeIdleMotion({ root });
  const timelineHandle = initHomeScrollTimeline({
    root,
    setIdleSuppressed: idleHandle.setSuppressed
  });

  return {
    destroy: () => {
      timelineHandle.destroy();
      idleHandle.destroy();
      root.removeAttribute("data-director-active");
    }
  };
}
