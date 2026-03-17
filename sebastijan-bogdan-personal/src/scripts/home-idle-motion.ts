import gsap from "gsap";

export interface HomeIdleMotionOptions {
  root: HTMLElement;
}

export interface HomeIdleMotionHandle {
  destroy: () => void;
  setSuppressed: (suppressed: boolean) => void;
}

export function initHomeIdleMotion(options: HomeIdleMotionOptions): HomeIdleMotionHandle {
  const { root } = options;
  const stage = root.querySelector<HTMLElement>("[data-director-stage]");

  if (!stage) {
    return {
      destroy: () => undefined,
      setSuppressed: () => undefined
    };
  }

  const ring = stage.querySelector<SVGElement>("[data-idle-ring]");
  const traces = Array.from(stage.querySelectorAll<SVGElement>("[data-idle-trace]"));
  const shellPlates = Array.from(stage.querySelectorAll<SVGElement>("[data-core-family='locking-plates']"));

  const context = gsap.context(() => {
    if (ring) {
      gsap.set(ring, { transformOrigin: "center center" });
    }
    gsap.set(shellPlates, { transformOrigin: "center center" });
    gsap.set(traces, { autoAlpha: 0.46 });
  }, stage);

  const idleTl = gsap.timeline({
    repeat: -1,
    yoyo: true,
    defaults: { ease: "sine.inOut" }
  });

  if (ring) {
    idleTl.to(ring, { rotation: 2.2, duration: 8.2 }, 0);
  }
  idleTl.to(shellPlates, { y: -2, duration: 5.8, stagger: 0.16 }, 0);
  idleTl.to(traces, { autoAlpha: 0.72, duration: 3.2, stagger: 0.06 }, 0.8);

  let suppressed = false;
  const setSuppressed = (nextSuppressed: boolean) => {
    if (suppressed === nextSuppressed) return;
    suppressed = nextSuppressed;
    gsap.to(idleTl, { timeScale: suppressed ? 0.22 : 1, duration: 0.3, overwrite: "auto" });
  };

  return {
    destroy: () => {
      idleTl.kill();
      context.revert();
    },
    setSuppressed
  };
}
