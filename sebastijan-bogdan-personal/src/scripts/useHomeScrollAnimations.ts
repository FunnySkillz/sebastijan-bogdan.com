import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { initHomeDirector } from "./homeDirector";

export type HomeBreakpoint = "mobile" | "tablet" | "desktop";

export interface HomeAnimationOptions {
  root: HTMLElement;
  reducedMotion: boolean;
  breakpoint: HomeBreakpoint;
}

export interface HomeAnimationHandle {
  destroy: () => void;
}

const REVEAL_SELECTOR = "[data-reveal]";
const LINE_GROW_SELECTOR = "[data-line-grow]";
const LINE_DRAW_SELECTOR = "[data-line-draw]";
const SHARED_STAGE_ACTS = new Set(["hero", "experience", "projects"]);

function hasSharedDesktopStage(root: HTMLElement, breakpoint: HomeBreakpoint): boolean {
  return breakpoint === "desktop" && root.querySelector("[data-persistent-stage]") !== null;
}

function primeSvgLine(line: SVGElement): number {
  const target = line as SVGGeometryElement;
  if (typeof target.getTotalLength !== "function") {
    return 0;
  }

  const length = target.getTotalLength();
  line.style.strokeDasharray = `${length}`;

  const isHeroModuleLine =
    line.closest("[data-hero-module]") !== null &&
    line.getAttribute("data-hero-connector") === null &&
    line.getAttribute("data-hero-node") === null;

  line.style.strokeDashoffset = `${isHeroModuleLine ? length * 0.52 : length}`;
  return length;
}

function setActiveIndex(elements: Element[], activeIndex: number, className = "is-active") {
  elements.forEach((element, index) => {
    if (!(element instanceof HTMLElement)) return;
    element.classList.toggle(className, index === activeIndex);
  });
}

function applyReducedMotionState(root: HTMLElement): void {
  const revealNodes = Array.from(root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));
  const growLines = Array.from(root.querySelectorAll<HTMLElement>(LINE_GROW_SELECTOR));
  const drawLines = Array.from(root.querySelectorAll<SVGElement>(LINE_DRAW_SELECTOR));
  const projectPanels = Array.from(root.querySelectorAll<HTMLElement>("[data-project-panel]"));
  const projectDots = Array.from(root.querySelectorAll<HTMLElement>("[data-project-dot]"));

  gsap.set(revealNodes, { autoAlpha: 1, y: 0, x: 0, scale: 1 });
  gsap.set(growLines, { scaleX: 1, scaleY: 1 });
  gsap.set(projectPanels, { autoAlpha: 1, y: 0, x: 0, scale: 1 });
  gsap.set(projectDots, { autoAlpha: 1, scale: 1 });
  drawLines.forEach((line) => {
    line.style.strokeDasharray = "none";
    line.style.strokeDashoffset = "0";
  });

  if (projectPanels.length) {
    setActiveIndex(projectPanels, 0);
  }
  if (projectDots.length) {
    setActiveIndex(projectDots, 0);
  }

  root.querySelectorAll("[data-hero-label], [data-hero-stage-dot]").forEach((node) => {
    if (node instanceof HTMLElement) {
      node.style.opacity = "1";
    }
  });

  const persistentStageShell = root.querySelector<HTMLElement>("[data-persistent-stage-shell]");
  if (persistentStageShell) {
    persistentStageShell.style.opacity = "1";
  }
  root.querySelectorAll("[data-stage-label-group]").forEach((node) => {
    if (node instanceof HTMLElement) {
      node.style.opacity = "1";
      node.style.transform = "none";
    }
  });
}

function initLenisIfNeeded(reducedMotion: boolean, breakpoint: HomeBreakpoint): {
  cleanup: () => void;
} {
  if (reducedMotion || breakpoint === "mobile") {
    return { cleanup: () => undefined };
  }

  const lenis = new Lenis({
    duration: 1.06,
    smoothWheel: true,
    syncTouch: false,
    wheelMultiplier: 0.92,
    touchMultiplier: 1
  });

  const raf = (time: number) => {
    lenis.raf(time * 1000);
  };

  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(raf);

  const onRefresh = () => lenis.resize();
  ScrollTrigger.addEventListener("refresh", onRefresh);

  return {
    cleanup: () => {
      ScrollTrigger.removeEventListener("refresh", onRefresh);
      gsap.ticker.remove(raf);
      lenis.destroy();
    }
  };
}

function setupActHandoffs(root: HTMLElement, breakpoint: HomeBreakpoint): void {
  const acts = Array.from(root.querySelectorAll<HTMLElement>("[data-act]"));
  if (acts.length < 2) return;
  const useSharedDesktopStage = hasSharedDesktopStage(root, breakpoint);

  const configByBreakpoint: Record<
    HomeBreakpoint,
    {
      incomingFromY: number;
      outgoingToY: number;
      incomingFromAlpha: number;
      outgoingToAlpha: number;
      start: string;
      end: string;
    }
  > = {
    desktop: {
      incomingFromY: 10,
      outgoingToY: -1.4,
      incomingFromAlpha: 0.8,
      outgoingToAlpha: 0.92,
      start: "top 92%",
      end: "top 64%"
    },
    tablet: {
      incomingFromY: 5.2,
      outgoingToY: -1.1,
      incomingFromAlpha: 0.86,
      outgoingToAlpha: 0.96,
      start: "top 94%",
      end: "top 72%"
    },
    mobile: {
      incomingFromY: 1.2,
      outgoingToY: -0.4,
      incomingFromAlpha: 0.94,
      outgoingToAlpha: 0.98,
      start: "top 98%",
      end: "top 84%"
    }
  };

  const cfg = configByBreakpoint[breakpoint];
  const pinnedDesktopActs = new Set(["hero", "experience", "projects", "toolbox", "philosophy"]);
  const isDesktop = breakpoint === "desktop";

  acts.forEach((incomingAct, index) => {
    if (index === 0) return;

    const outgoingAct = acts[index - 1];
    const incomingActName = incomingAct.dataset.act ?? "";
    const outgoingActName = outgoingAct.dataset.act ?? "";

    if (
      useSharedDesktopStage &&
      (incomingActName === "experience" || incomingActName === "projects")
    ) {
      return;
    }

    const isProjectsAdjacentDesktop =
      isDesktop &&
      ((incomingActName === "projects" && outgoingActName === "experience") ||
        (incomingActName === "toolbox" && outgoingActName === "projects"));
    const skipOutgoingMotion =
      isDesktop &&
      (pinnedDesktopActs.has(incomingActName) || pinnedDesktopActs.has(outgoingActName)) &&
      !isProjectsAdjacentDesktop;
    const incomingFromY = isProjectsAdjacentDesktop ? 0 : cfg.incomingFromY;
    const outgoingToY = isProjectsAdjacentDesktop ? 0 : cfg.outgoingToY;
    const incomingFromAlpha = isProjectsAdjacentDesktop ? 0.9 : cfg.incomingFromAlpha;
    const outgoingToAlpha = isProjectsAdjacentDesktop ? 0.95 : cfg.outgoingToAlpha;
    const incomingPanel = incomingAct.querySelector<HTMLElement>("[data-scene-panel]");
    const outgoingPanel = outgoingAct.querySelector<HTMLElement>("[data-scene-panel]");

    if (!incomingPanel || !outgoingPanel) return;

    const handoffTl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: incomingAct,
        start: cfg.start,
        end: cfg.end,
        scrub: true,
        invalidateOnRefresh: true,
        onLeave: () => {
          gsap.set(incomingPanel, { clearProps: "transform,opacity,visibility" });
          gsap.set(outgoingPanel, { clearProps: "transform,opacity,visibility" });
        },
        onLeaveBack: () => {
          gsap.set(incomingPanel, { clearProps: "transform,opacity,visibility" });
          gsap.set(outgoingPanel, { clearProps: "transform,opacity,visibility" });
        }
      }
    });

    handoffTl.fromTo(
      incomingPanel,
      { yPercent: incomingFromY, autoAlpha: incomingFromAlpha, immediateRender: false },
      { yPercent: 0, autoAlpha: 1, immediateRender: false },
      0
    );

    if (!skipOutgoingMotion) {
      handoffTl.fromTo(
        outgoingPanel,
        { yPercent: 0, autoAlpha: 1 },
        { yPercent: outgoingToY, autoAlpha: outgoingToAlpha, immediateRender: false },
        0.35
      );
    }
  });
}

function setupPersistentStage(root: HTMLElement, breakpoint: HomeBreakpoint): void {
  if (!hasSharedDesktopStage(root, breakpoint)) return;

  const shell = root.querySelector<HTMLElement>("[data-persistent-stage-shell]");
  const stage = root.querySelector<HTMLElement>("[data-persistent-stage]");
  const heroAct = root.querySelector<HTMLElement>("#act-hero");
  const experienceAct = root.querySelector<HTMLElement>("#act-experience");
  const projectsAct = root.querySelector<HTMLElement>("#act-projects");

  if (!shell || !stage || !heroAct || !experienceAct || !projectsAct) return;

  const heroText = heroAct.querySelector<HTMLElement>("[data-hero-text]");
  const experienceRevealNodes = Array.from(experienceAct.querySelectorAll<HTMLElement>("[data-reveal]"));
  const experienceNodeCluster = Array.from(
    experienceAct.querySelectorAll<HTMLElement>(
      ".experience-node, .experience-spec-mini, .experience-theme-list li, .spec-card-highlight"
    )
  );
  const projectRevealNodes = Array.from(projectsAct.querySelectorAll<HTMLElement>("[data-reveal]"));
  const projectPanels = Array.from(projectsAct.querySelectorAll<HTMLElement>("[data-project-panel]"));
  const projectDots = Array.from(projectsAct.querySelectorAll<HTMLElement>("[data-project-dot]"));

  const heroLayer = stage.querySelector<SVGGElement>("[data-stage-mode-layer='hero']");
  const experienceLayer = stage.querySelector<SVGGElement>("[data-stage-mode-layer='experience']");
  const projectsLayer = stage.querySelector<SVGGElement>("[data-stage-mode-layer='projects']");
  const heroLabelGroup = stage.querySelector<HTMLElement>("[data-stage-label-group='hero']");
  const experienceLabelGroup = stage.querySelector<HTMLElement>("[data-stage-label-group='experience']");
  const projectsLabelGroup = stage.querySelector<HTMLElement>("[data-stage-label-group='projects']");

  if (!heroLayer || !experienceLayer || !projectsLayer) return;

  const sharedLines = Array.from(stage.querySelectorAll<SVGElement>("[data-stage-shared-line]"));
  const heroModeLines = Array.from(stage.querySelectorAll<SVGElement>("[data-stage-mode-line='hero']"));
  const experienceModeLines = Array.from(
    stage.querySelectorAll<SVGElement>("[data-stage-mode-line='experience']")
  );
  const projectsModeLines = Array.from(stage.querySelectorAll<SVGElement>("[data-stage-mode-line='projects']"));

  const setStageMode = (mode: "hero" | "experience" | "projects" | "resolve") => {
    stage.dataset.stageMode = mode;
  };

  const setProjectActive = (index: number) => {
    if (projectPanels.length) {
      setActiveIndex(projectPanels, index);
    }
    if (projectDots.length) {
      setActiveIndex(projectDots, index);
    }
  };

  gsap.set(shell, { autoAlpha: 1 });
  gsap.set(stage, { autoAlpha: 0.96, scale: 0.94, yPercent: 4, transformOrigin: "center center" });
  gsap.set(sharedLines, { autoAlpha: 0.3 });
  gsap.set(heroModeLines, { autoAlpha: 0.9 });
  gsap.set(experienceModeLines, { autoAlpha: 0.16 });
  gsap.set(projectsModeLines, { autoAlpha: 0.14 });
  gsap.set(heroLayer, { autoAlpha: 1, x: 0, y: 0, rotation: 0, transformOrigin: "center center" });
  gsap.set(experienceLayer, { autoAlpha: 0.2, x: 22, y: -14, rotation: 6, transformOrigin: "center center" });
  gsap.set(projectsLayer, { autoAlpha: 0.14, x: -20, y: 24, rotation: -6, transformOrigin: "center center" });
  gsap.set(heroLabelGroup, { autoAlpha: 1, y: 0 });
  gsap.set(experienceLabelGroup, { autoAlpha: 0, y: 8 });
  gsap.set(projectsLabelGroup, { autoAlpha: 0, y: 8 });
  gsap.set(experienceRevealNodes, { autoAlpha: 0, y: 16 });
  gsap.set(experienceNodeCluster, { autoAlpha: 0.36, y: 10 });
  gsap.set(projectRevealNodes, { autoAlpha: 0, y: 16 });
  gsap.set(projectPanels, { autoAlpha: 0.2, y: 14, scale: 0.97 });
  gsap.set(projectDots, { autoAlpha: 0.44, scale: 1 });
  projectPanels.forEach((panel) => panel.classList.remove("is-active"));
  projectDots.forEach((dot) => dot.classList.remove("is-active"));
  setStageMode("hero");

  const persistentTl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: heroAct,
      start: "top top",
      endTrigger: projectsAct,
      end: "bottom top+=88",
      scrub: true,
      invalidateOnRefresh: true,
      onEnter: () => {
        gsap.set(shell, { autoAlpha: 1 });
      },
      onEnterBack: () => {
        gsap.set(shell, { autoAlpha: 1 });
      },
      onLeave: () => {
        gsap.set(shell, { autoAlpha: 0 });
      },
      onLeaveBack: () => {
        gsap.set(shell, { autoAlpha: 0 });
      }
    }
  });

  persistentTl.to(shell, { autoAlpha: 1, duration: 0.04 }, 0);
  persistentTl.to(stage, { scale: 1, yPercent: 0, duration: 0.15 }, 0.02);
  persistentTl.to(sharedLines, { autoAlpha: 0.7, strokeDashoffset: 0, duration: 0.18, stagger: 0.01 }, 0.02);
  persistentTl.to(heroModeLines, { autoAlpha: 1, strokeDashoffset: 0, duration: 0.2, stagger: 0.012 }, 0.04);

  if (heroText) {
    persistentTl.to(heroText, { autoAlpha: 1, y: 0, duration: 0.08 }, 0.04);
    persistentTl.to(heroText, { autoAlpha: 0, y: -24, duration: 0.14 }, 0.22);
  }

  persistentTl.call(() => setStageMode("hero"), undefined, 0.12);
  persistentTl.to(heroLayer, { autoAlpha: 0.16, x: -30, y: -20, rotation: -8, duration: 0.16 }, 0.2);
  persistentTl.to(heroLabelGroup, { autoAlpha: 0, duration: 0.1 }, 0.22);
  persistentTl.to(experienceLayer, { autoAlpha: 1, x: 0, y: 0, rotation: 0, duration: 0.18 }, 0.24);
  persistentTl.to(experienceModeLines, { autoAlpha: 1, strokeDashoffset: 0, duration: 0.18, stagger: 0.012 }, 0.26);
  persistentTl.to(experienceLabelGroup, { autoAlpha: 1, y: 0, duration: 0.13 }, 0.28);
  persistentTl.to(experienceRevealNodes, { autoAlpha: 1, y: 0, duration: 0.12, stagger: 0.03 }, 0.3);
  persistentTl.to(experienceNodeCluster, { autoAlpha: 1, y: 0, duration: 0.14, stagger: 0.02 }, 0.34);
  persistentTl.call(() => setStageMode("experience"), undefined, 0.4);

  persistentTl.to(experienceLayer, { autoAlpha: 0.16, x: 20, y: -12, rotation: 7, duration: 0.1 }, 0.56);
  persistentTl.to(experienceLabelGroup, { autoAlpha: 0, duration: 0.1 }, 0.56);
  persistentTl.to(experienceRevealNodes, { autoAlpha: 0, y: -14, duration: 0.1, stagger: 0.015 }, 0.56);
  persistentTl.to(experienceNodeCluster, { autoAlpha: 0, y: -16, duration: 0.1, stagger: 0.01 }, 0.58);

  persistentTl.to(projectsLayer, { autoAlpha: 1, x: 0, y: 0, rotation: 0, duration: 0.18 }, 0.62);
  persistentTl.to(projectsModeLines, { autoAlpha: 1, strokeDashoffset: 0, duration: 0.2, stagger: 0.01 }, 0.64);
  persistentTl.to(projectsLabelGroup, { autoAlpha: 1, y: 0, duration: 0.13 }, 0.66);
  persistentTl.to(projectRevealNodes, { autoAlpha: 1, y: 0, duration: 0.12, stagger: 0.03 }, 0.68);
  persistentTl.call(() => setStageMode("projects"), undefined, 0.72);

  if (projectPanels.length >= 3) {
    persistentTl.call(() => setProjectActive(0), undefined, 0.74);
    persistentTl.to(projectPanels[0], { autoAlpha: 1, y: 0, scale: 1, duration: 0.12 }, 0.74);
    persistentTl.to([projectPanels[1], projectPanels[2]], { autoAlpha: 0.24, y: 12, scale: 0.97, duration: 0.12 }, 0.74);
    persistentTl.to(projectDots[0], { autoAlpha: 1, scale: 1.08, duration: 0.1 }, 0.76);
    persistentTl.to([projectDots[1], projectDots[2]], { autoAlpha: 0.45, scale: 1, duration: 0.1 }, 0.76);

    persistentTl.call(() => setProjectActive(1), undefined, 0.84);
    persistentTl.to(projectPanels[1], { autoAlpha: 1, y: 0, scale: 1, duration: 0.11 }, 0.84);
    persistentTl.to([projectPanels[0], projectPanels[2]], { autoAlpha: 0.25, y: 10, scale: 0.97, duration: 0.11 }, 0.84);
    persistentTl.to(projectDots[1], { autoAlpha: 1, scale: 1.08, duration: 0.1 }, 0.86);
    persistentTl.to([projectDots[0], projectDots[2]], { autoAlpha: 0.45, scale: 1, duration: 0.1 }, 0.86);

    persistentTl.call(() => setProjectActive(2), undefined, 0.92);
    persistentTl.to(projectPanels[2], { autoAlpha: 1, y: 0, scale: 1, duration: 0.1 }, 0.92);
    persistentTl.to([projectPanels[0], projectPanels[1]], { autoAlpha: 0.26, y: 8, scale: 0.97, duration: 0.1 }, 0.92);
    persistentTl.to(projectDots[2], { autoAlpha: 1, scale: 1.08, duration: 0.08 }, 0.93);
    persistentTl.to([projectDots[0], projectDots[1]], { autoAlpha: 0.45, scale: 1, duration: 0.08 }, 0.93);
  }

  persistentTl.call(() => setStageMode("resolve"), undefined, 0.96);
  persistentTl.to(stage, { xPercent: 1.2, scale: 0.985, duration: 0.08 }, 0.94);
  persistentTl.to(shell, { autoAlpha: 0, duration: 0.05 }, 0.98);
}

function setupHeroScene(root: HTMLElement, breakpoint: HomeBreakpoint): void {
  if (hasSharedDesktopStage(root, breakpoint)) return;

  const hero = root.querySelector<HTMLElement>("#act-hero");
  if (!hero) return;

  const panel = hero.querySelector<HTMLElement>("[data-scene-panel]");
  const heroScene = hero.querySelector<HTMLElement>("[data-hero-scene]");
  const textNodes = Array.from(hero.querySelectorAll<HTMLElement>("[data-hero-text-node]"));
  const labels = Array.from(hero.querySelectorAll<HTMLElement>("[data-hero-label]"));
  const stageDots = Array.from(hero.querySelectorAll<HTMLElement>("[data-hero-stage-dot]"));
  const modules = Array.from(hero.querySelectorAll<SVGGElement>("[data-hero-module]"));

  if (!panel || !heroScene || !modules.length) return;

  const moduleOffsets: Record<string, { x: number; y: number; rotation: number; scale: number }> = {
    backend: { x: 54, y: -70, rotation: -6, scale: 0.96 },
    architecture: { x: 98, y: -18, rotation: 5, scale: 0.95 },
    automation: { x: 72, y: 12, rotation: -3, scale: 0.94 },
    performance: { x: 30, y: 66, rotation: 3, scale: 0.93 },
    product: { x: -46, y: 90, rotation: -5, scale: 0.92 }
  };

  gsap.set(textNodes, { autoAlpha: 1, y: 0 });
  gsap.set(labels, { autoAlpha: 0.34, x: 0 });
  gsap.set(stageDots, { autoAlpha: 0.52 });
  gsap.set(heroScene, { autoAlpha: 0.86, scale: 0.95, transformOrigin: "center center" });

  modules.forEach((module) => {
    const key = module.dataset.heroModule ?? "";
    const offset = moduleOffsets[key] ?? { x: 0, y: 0, rotation: 0, scale: 1 };
    gsap.set(module, {
      x: offset.x,
      y: offset.y,
      rotation: offset.rotation,
      scale: offset.scale,
      autoAlpha: 0.84,
      transformOrigin: "center center"
    });

    const glows = Array.from(module.querySelectorAll<SVGElement>(".hero-module-glow"));
    gsap.set(glows, { autoAlpha: 0.2 });
  });

  const heroTl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: hero,
      start: breakpoint === "desktop" ? "top top+=84" : "top 74%",
      end: breakpoint === "desktop" ? "+=320%" : "+=155%",
      scrub: true,
      pin: breakpoint === "desktop",
      pinSpacing: true,
      anticipatePin: 1
    }
  });

  heroTl.to(heroScene, { autoAlpha: 1, scale: 1, duration: 0.2 }, 0.02);
  heroTl.to(panel, { "--panel-grid-shift": "26px", duration: 1 }, 0);

  modules.forEach((module, index) => {
    const target = module.dataset.heroModule;
    if (!target) return;
    const moduleLines = Array.from(module.querySelectorAll<SVGElement>("[data-line-draw]"));

    const label = labels.find((node) => node.dataset.target === target);
    const connector = hero.querySelector<SVGElement>(`[data-hero-connector='${target}']`);
    const anchor = hero.querySelector<SVGElement>(`[data-hero-node='${target}']`);
    const glowParts = Array.from(module.querySelectorAll<SVGElement>(".hero-module-glow"));

    const stageStart = 0.14 + index * 0.125;

    heroTl.to(module, { x: 0, y: 0, rotation: 0, scale: 1, autoAlpha: 1, duration: 0.24 }, stageStart);
    heroTl.to(moduleLines, { strokeDashoffset: 0, duration: 0.14, stagger: 0.02 }, stageStart + 0.02);

    if (connector) {
      heroTl.to(connector, { strokeDashoffset: 0, duration: 0.15 }, stageStart + 0.06);
    }

    if (anchor) {
      heroTl.to(anchor, { strokeDashoffset: 0, duration: 0.12 }, stageStart + 0.09);
    }

    if (label) {
      heroTl.to(label, { autoAlpha: 1, x: 0, duration: 0.14 }, stageStart + 0.12);
      heroTl.call(
        () => {
          label.classList.add("is-active");
        },
        undefined,
        stageStart + 0.12
      );
      heroTl.call(
        () => {
          label.classList.remove("is-active");
        },
        undefined,
        stageStart + 0.24
      );
    }

    if (stageDots[index]) {
      heroTl.to(stageDots[index], { autoAlpha: 1, duration: 0.08 }, stageStart + 0.08);
    }

    heroTl.call(
      () => {
        module.classList.add("is-highlight");
        connector?.classList.add("is-highlight");
        anchor?.classList.add("is-highlight");
      },
      undefined,
      stageStart + 0.11
    );

    heroTl.to(glowParts, { autoAlpha: 0.92, duration: 0.08 }, stageStart + 0.11);
    heroTl.to(glowParts, { autoAlpha: 0.18, duration: 0.14 }, stageStart + 0.22);

    heroTl.call(
      () => {
        module.classList.remove("is-highlight");
        connector?.classList.remove("is-highlight");
        anchor?.classList.remove("is-highlight");
      },
      undefined,
      stageStart + 0.29
    );
  });

  heroTl.to(heroScene, { xPercent: -5, scale: 0.985, duration: 0.2 }, 0.84);
}

function setupExperienceScene(root: HTMLElement, breakpoint: HomeBreakpoint): void {
  if (hasSharedDesktopStage(root, breakpoint)) return;

  const act = root.querySelector<HTMLElement>("#act-experience");
  if (!act) return;

  const scene = act.querySelector<HTMLElement>("[data-exp-scene]");
  const introNodes = Array.from(
    act.querySelectorAll<HTMLElement>(
      ".act-header [data-reveal], .experience-period[data-reveal], .experience-company[data-reveal], .experience-role[data-reveal]"
    )
  );
  const spineLine = act.querySelector<HTMLElement>(".experience-spine-line");
  const nodes = Array.from(act.querySelectorAll<HTMLElement>(".experience-node"));
  const diagramLines = Array.from(act.querySelectorAll<SVGElement>(".experience-diagram [data-line-draw]"));
  const themes = Array.from(act.querySelectorAll<HTMLElement>(".experience-theme-list li"));
  const miniSpecs = Array.from(act.querySelectorAll<HTMLElement>("[data-exp-card]"));
  const connectors = Array.from(act.querySelectorAll<HTMLElement>("[data-exp-connector]"));
  const highlight = act.querySelector<HTMLElement>(".spec-card-highlight");

  if (!scene || !spineLine || !nodes.length) return;

  gsap.set(themes, { autoAlpha: 0.62, y: 8 });
  gsap.set(nodes, { autoAlpha: 0.56, x: -8 });
  gsap.set(miniSpecs, { autoAlpha: 0.54, x: 8 });
  gsap.set(connectors, { scaleX: 0.3, transformOrigin: "left center" });
  gsap.set(highlight, { autoAlpha: 0.6, y: 12 });

  const expTl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: act,
      start: breakpoint === "desktop" ? "top top+=84" : "top 74%",
      end: breakpoint === "desktop" ? "+=220%" : "bottom 30%",
      scrub: true,
      pin: breakpoint === "desktop",
      pinSpacing: true,
      anticipatePin: 1
    }
  });

  expTl.to(spineLine, { scaleY: 1, duration: 0.24 }, 0.02);
  expTl.to(introNodes, { autoAlpha: 1, y: 0, duration: 0.16, stagger: 0.04 }, 0.02);
  expTl.to(diagramLines, { strokeDashoffset: 0, duration: 0.2, stagger: 0.02 }, 0.04);
  expTl.to(themes, { autoAlpha: 1, y: 0, stagger: 0.05, duration: 0.2 }, 0.06);

  nodes.forEach((node, index) => {
    const t = 0.18 + index * 0.14;
    expTl.to(node, { autoAlpha: 1, x: 0, duration: 0.16 }, t);

    if (miniSpecs[index]) {
      expTl.to(miniSpecs[index], { autoAlpha: 1, x: 0, duration: 0.15 }, t + 0.06);
    }

    if (connectors[index]) {
      expTl.to(connectors[index], { scaleX: 1, duration: 0.1 }, t + 0.04);
    }

    expTl.call(
      () => {
        setActiveIndex(nodes, index);
        setActiveIndex(miniSpecs, index);
      },
      undefined,
      t + 0.08
    );
  });

  expTl.to(highlight, { autoAlpha: 1, y: 0, duration: 0.2 }, 0.68);
}

function setupProjectsScene(root: HTMLElement, breakpoint: HomeBreakpoint): void {
  if (hasSharedDesktopStage(root, breakpoint)) return;

  const act = root.querySelector<HTMLElement>("#act-projects");
  if (!act) return;

  const stage = act.querySelector<HTMLElement>("[data-project-stage]");
  const field = act.querySelector<HTMLElement>("[data-project-field]");
  const introNodes = Array.from(act.querySelectorAll<HTMLElement>(".act-header [data-reveal]"));
  const sharedParts = Array.from(act.querySelectorAll<HTMLElement>("[data-core-part='shared']"));
  const sharedLines = Array.from(act.querySelectorAll<SVGElement>("[data-project-shared-line]"));
  const panels = Array.from(act.querySelectorAll<HTMLElement>("[data-project-panel]"));
  const dots = Array.from(act.querySelectorAll<HTMLElement>("[data-project-dot]"));

  if (!stage || !field || panels.length < 3) return;

  type ProjectMode = "fleetfuel" | "steuerfux" | "automation";
  const projectModes: ProjectMode[] = ["fleetfuel", "steuerfux", "automation"];

  const orderedPanels = projectModes
    .map((mode, index) => panels.find((panel) => panel.dataset.projectMode === mode) ?? panels[index])
    .filter((panel): panel is HTMLElement => panel instanceof HTMLElement);

  const modeAssets = Object.fromEntries(
    projectModes.map((mode) => [
      mode,
      {
        parts: Array.from(act.querySelectorAll<HTMLElement>(`[data-core-part='${mode}']`)),
        overlays: Array.from(
          act.querySelectorAll<SVGElement>(`[data-project-overlay][data-project-mode='${mode}']`)
        ),
        callouts: Array.from(
          act.querySelectorAll<SVGElement>(
            `[data-project-callout][data-project-mode='${mode}'], [data-project-callout-node][data-project-mode='${mode}']`
          )
        ),
        traces: Array.from(act.querySelectorAll<SVGElement>(`[data-project-trace][data-project-mode='${mode}']`))
      }
    ])
  ) as Record<
    ProjectMode,
    {
      parts: HTMLElement[];
      overlays: SVGElement[];
      callouts: SVGElement[];
      traces: SVGElement[];
    }
  >;

  const allOverlays = projectModes.flatMap((mode) => modeAssets[mode].overlays);
  const allCallouts = projectModes.flatMap((mode) => modeAssets[mode].callouts);

  const isDesktop = breakpoint === "desktop";
  const offsetScale = isDesktop ? 1 : breakpoint === "tablet" ? 0.68 : 0.42;
  const modeOffsets: Record<ProjectMode, { x: number; y: number; rotation: number }> = {
    fleetfuel: { x: -56 * offsetScale, y: -44 * offsetScale, rotation: -8 * offsetScale },
    steuerfux: { x: 66 * offsetScale, y: -16 * offsetScale, rotation: 7 * offsetScale },
    automation: { x: 42 * offsetScale, y: 54 * offsetScale, rotation: -6 * offsetScale }
  };

  const modeBalancedOffsets: Record<ProjectMode, { x: number; y: number; rotation: number }> = {
    fleetfuel: { x: -12 * offsetScale, y: -8 * offsetScale, rotation: -1.5 * offsetScale },
    steuerfux: { x: 14 * offsetScale, y: -4 * offsetScale, rotation: 1.2 * offsetScale },
    automation: { x: 10 * offsetScale, y: 11 * offsetScale, rotation: -1.1 * offsetScale }
  };

  const setMode = (index: number) => {
    setActiveIndex(orderedPanels, index);
    setActiveIndex(dots, index);
    act.dataset.projectMode = projectModes[index] ?? "neutral";
  };

  const clearMode = () => {
    orderedPanels.forEach((panel) => panel.classList.remove("is-active"));
    dots.forEach((dot) => dot.classList.remove("is-active"));
    act.dataset.projectMode = "neutral";
  };

  clearMode();
  gsap.set(stage, { "--project-field-shift": "0px" });
  gsap.set(sharedParts, { autoAlpha: 0.84, scale: 0.97, transformOrigin: "center center" });
  gsap.set(sharedLines, { autoAlpha: 0.34 });
  gsap.set(orderedPanels, { autoAlpha: 0.24, y: 12, scale: 0.98 });
  gsap.set(dots, { autoAlpha: 0.48, scale: 1 });
  gsap.set(allOverlays, { autoAlpha: 0.08 });
  gsap.set(allCallouts, { autoAlpha: 0.08 });

  projectModes.forEach((mode) => {
    const { x, y, rotation } = modeOffsets[mode];
    gsap.set(modeAssets[mode].parts, {
      x,
      y,
      rotation,
      autoAlpha: 0.48,
      transformOrigin: "center center"
    });
  });

  const projectsTl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: act,
      start: breakpoint === "desktop" ? "top top+=84" : breakpoint === "tablet" ? "top top+=88" : "top 76%",
      end: breakpoint === "desktop" ? "+=388%" : breakpoint === "tablet" ? "+=248%" : "bottom 20%",
      scrub: true,
      pin: breakpoint !== "mobile",
      pinSpacing: true,
      anticipatePin: 1
    }
  });

  projectsTl.to(introNodes, { autoAlpha: 1, y: 0, duration: 0.1, stagger: 0.03 }, 0.02);
  projectsTl.to(stage, { "--project-field-shift": "20px", duration: 1 }, 0);
  projectsTl.to(sharedLines, { autoAlpha: 0.78, strokeDashoffset: 0, duration: 0.15, stagger: 0.008 }, 0.03);
  projectsTl.to(sharedParts, { autoAlpha: 1, scale: 1, duration: 0.14 }, 0.04);

  projectsTl.call(() => setMode(0), undefined, 0.2);
  projectsTl.to(modeAssets.fleetfuel.parts, { x: 0, y: 0, rotation: 0, autoAlpha: 1, duration: 0.2 }, 0.16);
  projectsTl.to(
    [...modeAssets.steuerfux.parts, ...modeAssets.automation.parts],
    { autoAlpha: 0.32, duration: 0.16 },
    0.18
  );
  projectsTl.to(modeAssets.fleetfuel.overlays, { autoAlpha: 1, duration: 0.18 }, 0.19);
  projectsTl.to(modeAssets.fleetfuel.callouts, { autoAlpha: 1, duration: 0.16 }, 0.2);
  projectsTl.to(
    modeAssets.fleetfuel.traces,
    { strokeDashoffset: 0, duration: 0.19, stagger: 0.014 },
    0.2
  );
  projectsTl.to(orderedPanels[0], { autoAlpha: 1, y: 0, scale: 1, duration: 0.17 }, 0.2);
  projectsTl.to([orderedPanels[1], orderedPanels[2]], { autoAlpha: 0.2, y: 14, scale: 0.97, duration: 0.16 }, 0.2);
  projectsTl.to(dots[0], { autoAlpha: 1, scale: 1.08, duration: 0.14 }, 0.22);
  projectsTl.to([dots[1], dots[2]], { autoAlpha: 0.42, scale: 1, duration: 0.14 }, 0.22);

  projectsTl.to(
    modeAssets.fleetfuel.parts,
    {
      x: -16 * offsetScale,
      y: -12 * offsetScale,
      rotation: -2 * offsetScale,
      autoAlpha: 0.56,
      duration: 0.1
    },
    0.36
  );
  projectsTl.to(modeAssets.fleetfuel.overlays, { autoAlpha: 0.18, duration: 0.1 }, 0.36);
  projectsTl.to(modeAssets.fleetfuel.callouts, { autoAlpha: 0.14, duration: 0.1 }, 0.36);
  projectsTl.to(orderedPanels[0], { autoAlpha: 0.24, y: -4, scale: 0.97, duration: 0.1 }, 0.36);

  projectsTl.call(() => setMode(1), undefined, 0.52);
  projectsTl.to(modeAssets.steuerfux.parts, { x: 0, y: 0, rotation: 0, autoAlpha: 1, duration: 0.2 }, 0.46);
  projectsTl.to(
    modeAssets.fleetfuel.parts,
    {
      x: -20 * offsetScale,
      y: -14 * offsetScale,
      rotation: -2.8 * offsetScale,
      autoAlpha: 0.34,
      duration: 0.2
    },
    0.46
  );
  projectsTl.to(
    modeAssets.automation.parts,
    {
      x: modeOffsets.automation.x,
      y: modeOffsets.automation.y,
      rotation: modeOffsets.automation.rotation,
      autoAlpha: 0.34,
      duration: 0.2
    },
    0.46
  );
  projectsTl.to(modeAssets.steuerfux.overlays, { autoAlpha: 1, duration: 0.18 }, 0.5);
  projectsTl.to(modeAssets.steuerfux.callouts, { autoAlpha: 1, duration: 0.16 }, 0.52);
  projectsTl.to(
    modeAssets.steuerfux.traces,
    { strokeDashoffset: 0, duration: 0.19, stagger: 0.012 },
    0.5
  );
  projectsTl.to(orderedPanels[1], { autoAlpha: 1, y: 0, scale: 1, duration: 0.17 }, 0.5);
  projectsTl.to([orderedPanels[0], orderedPanels[2]], { autoAlpha: 0.22, y: 12, scale: 0.97, duration: 0.16 }, 0.5);
  projectsTl.to(dots[1], { autoAlpha: 1, scale: 1.08, duration: 0.14 }, 0.52);
  projectsTl.to([dots[0], dots[2]], { autoAlpha: 0.42, scale: 1, duration: 0.14 }, 0.52);

  projectsTl.to(
    modeAssets.steuerfux.parts,
    {
      x: 22 * offsetScale,
      y: -8 * offsetScale,
      rotation: 2.6 * offsetScale,
      autoAlpha: 0.56,
      duration: 0.1
    },
    0.66
  );
  projectsTl.to(modeAssets.steuerfux.overlays, { autoAlpha: 0.18, duration: 0.1 }, 0.66);
  projectsTl.to(modeAssets.steuerfux.callouts, { autoAlpha: 0.14, duration: 0.1 }, 0.66);
  projectsTl.to(orderedPanels[1], { autoAlpha: 0.24, y: -4, scale: 0.97, duration: 0.1 }, 0.66);

  projectsTl.call(() => setMode(2), undefined, 0.82);
  projectsTl.to(modeAssets.automation.parts, { x: 0, y: 0, rotation: 0, autoAlpha: 1, duration: 0.2 }, 0.76);
  projectsTl.to(
    modeAssets.steuerfux.parts,
    {
      x: 24 * offsetScale,
      y: -10 * offsetScale,
      rotation: 3 * offsetScale,
      autoAlpha: 0.34,
      duration: 0.2
    },
    0.76
  );
  projectsTl.to(
    modeAssets.fleetfuel.parts,
    {
      x: -24 * offsetScale,
      y: -16 * offsetScale,
      rotation: -3 * offsetScale,
      autoAlpha: 0.3,
      duration: 0.2
    },
    0.76
  );
  projectsTl.to(modeAssets.automation.overlays, { autoAlpha: 1, duration: 0.18 }, 0.8);
  projectsTl.to(modeAssets.automation.callouts, { autoAlpha: 1, duration: 0.17 }, 0.82);
  projectsTl.to(
    modeAssets.automation.traces,
    { strokeDashoffset: 0, duration: 0.2, stagger: 0.01 },
    0.8
  );
  projectsTl.to(orderedPanels[2], { autoAlpha: 1, y: 0, scale: 1, duration: 0.17 }, 0.8);
  projectsTl.to([orderedPanels[0], orderedPanels[1]], { autoAlpha: 0.22, y: 12, scale: 0.97, duration: 0.16 }, 0.8);
  projectsTl.to(dots[2], { autoAlpha: 1, scale: 1.08, duration: 0.14 }, 0.82);
  projectsTl.to([dots[0], dots[1]], { autoAlpha: 0.42, scale: 1, duration: 0.14 }, 0.82);

  projectsTl.call(() => {
    act.dataset.projectMode = "resolve";
  }, undefined, 0.92);
  projectsTl.to(
    modeAssets.fleetfuel.parts,
    { ...modeBalancedOffsets.fleetfuel, autoAlpha: 0.62, duration: 0.08 },
    0.92
  );
  projectsTl.to(
    modeAssets.steuerfux.parts,
    { ...modeBalancedOffsets.steuerfux, autoAlpha: 0.64, duration: 0.08 },
    0.92
  );
  projectsTl.to(
    modeAssets.automation.parts,
    { ...modeBalancedOffsets.automation, autoAlpha: 0.66, duration: 0.08 },
    0.92
  );
  projectsTl.to(allOverlays, { autoAlpha: 0.24, duration: 0.08 }, 0.92);
  projectsTl.to(allCallouts, { autoAlpha: 0.22, duration: 0.08 }, 0.92);
  projectsTl.to(orderedPanels, { autoAlpha: 0.42, y: 7, scale: 0.98, duration: 0.08, stagger: 0.01 }, 0.92);
  projectsTl.to(orderedPanels[2], { autoAlpha: 0.86, y: 0, scale: 1, duration: 0.08 }, 0.95);
  projectsTl.to(dots, { autoAlpha: 0.54, scale: 1, duration: 0.08 }, 0.92);
  projectsTl.to(dots[2], { autoAlpha: 1, scale: 1.06, duration: 0.08 }, 0.95);
}

function setupToolboxScene(root: HTMLElement, breakpoint: HomeBreakpoint): void {
  const act = root.querySelector<HTMLElement>("#act-toolbox");
  if (!act) return;

  const introNodes = Array.from(act.querySelectorAll<HTMLElement>(".act-header [data-reveal]"));
  const board = act.querySelector<HTMLElement>("[data-toolbox-scene]");
  const zones = Array.from(act.querySelectorAll<HTMLElement>("[data-tool-zone]"));
  const diagramLines = Array.from(act.querySelectorAll<SVGElement>(".toolbox-diagram [data-line-draw]"));
  const traces = Array.from(act.querySelectorAll<SVGElement>("[data-tool-trace]"));
  const indicator = act.querySelector<HTMLElement>("[data-tool-indicator]");

  if (!board || !zones.length) return;

  gsap.set(zones, { autoAlpha: 0.58, y: 10 });
  gsap.set(indicator, { autoAlpha: 0, x: 0, y: 0 });

  const toolboxTl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: act,
      start: breakpoint === "desktop" ? "top top+=84" : "top 74%",
      end: breakpoint === "desktop" ? "+=220%" : "bottom 30%",
      scrub: true,
      pin: breakpoint === "desktop",
      pinSpacing: true,
      anticipatePin: 1
    }
  });

  toolboxTl.to(introNodes, { autoAlpha: 1, y: 0, duration: 0.18, stagger: 0.05 }, 0.02);
  toolboxTl.to(diagramLines, { strokeDashoffset: 0, duration: 0.2, stagger: 0.02 }, 0.04);
  toolboxTl.to(zones, { autoAlpha: 1, y: 0, duration: 0.16, stagger: 0.08 }, 0.08);
  toolboxTl.to(traces, { strokeDashoffset: 0, duration: 0.22, stagger: 0.06 }, 0.12);

  if (indicator && breakpoint !== "mobile") {
    const getPoint = (xRatio: number, yRatio: number) => ({
      x: () => board.clientWidth * xRatio,
      y: () => board.clientHeight * yRatio
    });

    const p0 = getPoint(0.03, 0.03);
    const p1 = getPoint(0.47, 0.03);
    const p2 = getPoint(0.47, 0.48);
    const p3 = getPoint(0.9, 0.48);
    const p4 = getPoint(0.9, 0.9);

    toolboxTl.to(indicator, { autoAlpha: 1, x: p0.x, y: p0.y, duration: 0.08 }, 0.18);
    toolboxTl.to(indicator, { x: p1.x, y: p1.y, duration: 0.18 }, 0.26);
    toolboxTl.call(() => setActiveIndex(zones, 1), undefined, 0.28);
    toolboxTl.to(indicator, { x: p2.x, y: p2.y, duration: 0.16 }, 0.48);
    toolboxTl.call(() => setActiveIndex(zones, 3), undefined, 0.5);
    toolboxTl.to(indicator, { x: p3.x, y: p3.y, duration: 0.16 }, 0.66);
    toolboxTl.call(() => setActiveIndex(zones, 2), undefined, 0.68);
    toolboxTl.to(indicator, { x: p4.x, y: p4.y, duration: 0.16 }, 0.82);
    toolboxTl.call(() => setActiveIndex(zones, 0), undefined, 0.84);
  }
}

function setupPhilosophyScene(root: HTMLElement, breakpoint: HomeBreakpoint): void {
  const act = root.querySelector<HTMLElement>("#act-philosophy");
  if (!act) return;

  const scene = act.querySelector<HTMLElement>("[data-philosophy-scene]");
  const kicker = act.querySelector<HTMLElement>(".act-kicker[data-reveal]");
  const headingTop = act.querySelector<HTMLElement>(".philosophy-title:not(.emphasis)");
  const headingBottom = act.querySelector<HTMLElement>(".philosophy-title.emphasis");
  const copy = act.querySelector<HTMLElement>(".philosophy-copy");
  const axis = act.querySelector<HTMLElement>(".philosophy-axis");
  const diagramLines = Array.from(act.querySelectorAll<SVGElement>(".philosophy-diagram [data-line-draw]"));
  const keywords = Array.from(act.querySelectorAll<HTMLElement>(".keyword-chip"));

  if (!scene || !headingTop || !headingBottom || !copy || !axis) return;

  gsap.set([headingTop, headingBottom], { autoAlpha: 0.62, y: 12, scale: 1.01 });
  gsap.set(copy, { autoAlpha: 0.58, y: 10 });
  gsap.set(axis, { scaleX: 0.36, transformOrigin: "left center" });
  gsap.set(keywords, { autoAlpha: 0.56, y: 10 });

  const philosophyTl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: scene,
      start: breakpoint === "desktop" ? "top top+=84" : "top 74%",
      end: breakpoint === "desktop" ? "+=220%" : "bottom 28%",
      scrub: true,
      pin: breakpoint === "desktop",
      pinSpacing: true,
      anticipatePin: 1
    }
  });

  if (kicker) {
    philosophyTl.to(kicker, { autoAlpha: 1, y: 0, duration: 0.14 }, 0.02);
  }
  philosophyTl.to(diagramLines, { strokeDashoffset: 0, duration: 0.2, stagger: 0.02 }, 0.03);
  philosophyTl.to(headingTop, { autoAlpha: 1, y: 0, scale: 1, duration: 0.2 }, 0.06);
  philosophyTl.to(headingBottom, { autoAlpha: 1, y: 0, scale: 1, duration: 0.2 }, 0.24);
  philosophyTl.to(copy, { autoAlpha: 1, y: 0, duration: 0.18 }, 0.42);
  philosophyTl.to(axis, { scaleX: 1, duration: 0.18 }, 0.5);
  philosophyTl.to(keywords, { autoAlpha: 1, y: 0, duration: 0.15, stagger: 0.08 }, 0.58);

  keywords.forEach((_, index) => {
    philosophyTl.call(() => setActiveIndex(keywords, index), undefined, 0.62 + index * 0.09);
  });
}

function setupContactScene(root: HTMLElement): void {
  const act = root.querySelector<HTMLElement>("#act-contact");
  if (!act) return;

  const introNodes = Array.from(
    act.querySelectorAll<HTMLElement>(".act-kicker[data-reveal], .act-title[data-reveal], .act-intro[data-reveal]")
  );
  const links = Array.from(act.querySelectorAll<HTMLElement>(".contact-link"));
  const lines = Array.from(act.querySelectorAll<SVGElement>("[data-line-draw]"));

  const contactTl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: act,
      start: "top 74%",
      end: "bottom 30%",
      scrub: true
    }
  });

  contactTl.to(introNodes, { autoAlpha: 1, y: 0, duration: 0.18, stagger: 0.05 }, 0.06);
  contactTl.to(lines, { strokeDashoffset: 0, duration: 0.22, stagger: 0.03 }, 0.06);
  contactTl.to(links, { autoAlpha: 1, y: 0, duration: 0.2, stagger: 0.07 }, 0.24);

  links.forEach((_, index) => {
    contactTl.call(() => setActiveIndex(links, index), undefined, 0.28 + index * 0.1);
  });
}

function setupParallax(root: HTMLElement): void {
  const parallaxNodes = Array.from(root.querySelectorAll<HTMLElement>("[data-parallax]"));

  parallaxNodes.forEach((node) => {
    const amount = Number(node.dataset.parallax ?? "0");
    if (!amount) return;

    gsap.to(node, {
      yPercent: amount * -44,
      ease: "none",
      scrollTrigger: {
        trigger: node.closest("[data-act]") ?? node,
        start: "top bottom",
        end: "bottom top",
        scrub: true
      }
    });
  });
}

export function initHomeScrollAnimations(options: HomeAnimationOptions): HomeAnimationHandle {
  const { root, reducedMotion, breakpoint } = options;

  gsap.registerPlugin(ScrollTrigger);

  const { cleanup: cleanupLenis } = initLenisIfNeeded(reducedMotion, breakpoint);
  let cleanupDirector = () => undefined;

  const context = gsap.context(() => {
    const revealNodes = Array.from(root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));
    const growLines = Array.from(root.querySelectorAll<HTMLElement>(LINE_GROW_SELECTOR));
    const drawLines = Array.from(root.querySelectorAll<SVGElement>(LINE_DRAW_SELECTOR));

    growLines.forEach((line) => {
      const direction = line.dataset.lineGrow;
      gsap.set(line, {
        scaleX: direction === "x" ? 0 : 1,
        scaleY: direction === "y" ? 0 : 1,
        transformOrigin: direction === "y" ? "top center" : "left center"
      });
    });

    drawLines.forEach((line) => {
      primeSvgLine(line);
    });

    const shouldUseDirector =
      !reducedMotion &&
      breakpoint === "desktop" &&
      root.querySelector("[data-narrative-director]") !== null;
    if (shouldUseDirector) {
      cleanupDirector = initHomeDirector({
        root,
        breakpoint,
        reducedMotion
      }).destroy;
      return;
    }

    root.removeAttribute("data-director-active");

    if (reducedMotion) {
      applyReducedMotionState(root);
      return;
    }

    gsap.set(revealNodes, { autoAlpha: 0, y: 18 });

    setupActHandoffs(root, breakpoint);
    setupPersistentStage(root, breakpoint);
    setupHeroScene(root, breakpoint);
    setupExperienceScene(root, breakpoint);
    setupProjectsScene(root, breakpoint);
    setupToolboxScene(root, breakpoint);
    setupPhilosophyScene(root, breakpoint);
    setupContactScene(root);
    setupParallax(root);
  }, root);

  ScrollTrigger.refresh();

  return {
    destroy: () => {
      context.revert();
      cleanupDirector();
      cleanupLenis();
    }
  };
}
