import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

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

  gsap.set(revealNodes, { autoAlpha: 1, y: 0, x: 0, scale: 1 });
  gsap.set(growLines, { scaleX: 1, scaleY: 1 });
  drawLines.forEach((line) => {
    line.style.strokeDasharray = "none";
    line.style.strokeDashoffset = "0";
  });

  root.querySelectorAll("[data-hero-label], [data-hero-stage-dot]").forEach((node) => {
    if (node instanceof HTMLElement) {
      node.style.opacity = "1";
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

function setupPanelTransitions(root: HTMLElement, breakpoint: HomeBreakpoint): void {
  const panels = Array.from(root.querySelectorAll<HTMLElement>("[data-scene-panel]"));
  const pinnedActs = new Set(["hero", "experience", "projects", "toolbox", "philosophy"]);

  panels.forEach((panel) => {
    const act = panel.closest<HTMLElement>("[data-act]")?.dataset.act;
    if (breakpoint === "desktop" && act && pinnedActs.has(act)) {
      return;
    }

    gsap.fromTo(
      panel,
      { yPercent: 10, autoAlpha: 0.7 },
      {
        yPercent: 0,
        autoAlpha: 1,
        ease: "none",
        scrollTrigger: {
          trigger: panel,
          start: "top 96%",
          end: "top 56%",
          scrub: true
        }
      }
    );

    gsap.to(panel, {
      yPercent: -4,
      autoAlpha: 0.94,
      ease: "none",
      scrollTrigger: {
        trigger: panel,
        start: "bottom 54%",
        end: "bottom top",
        scrub: true
      }
    });
  });
}

function setupHeroScene(root: HTMLElement, breakpoint: HomeBreakpoint): void {
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
  const act = root.querySelector<HTMLElement>("#act-projects");
  if (!act) return;

  const stage = act.querySelector<HTMLElement>("[data-project-stage]");
  const introNodes = Array.from(act.querySelectorAll<HTMLElement>(".act-header [data-reveal]"));
  const stations = Array.from(act.querySelectorAll<HTMLElement>("[data-project-station]"));
  const diagramLines = Array.from(act.querySelectorAll<SVGElement>(".projects-diagram [data-line-draw]"));
  const links = Array.from(act.querySelectorAll<SVGElement>("[data-project-link]"));
  const dots = Array.from(act.querySelectorAll<HTMLElement>("[data-project-dot]"));

  if (!stage || !stations.length) return;

  const stationTraces = stations.map((station) =>
    Array.from(station.querySelectorAll<SVGElement>("[data-project-trace]"))
  );

  gsap.set(stations, { autoAlpha: 0.52, scale: 0.94, y: 10 });
  gsap.set(dots, { autoAlpha: 0.54 });
  stationTraces.flat().forEach((line) => {
    primeSvgLine(line);
  });

  const activateProject = (index: number) => {
    setActiveIndex(stations, index);
    setActiveIndex(dots, index);
    stations.forEach((station, stationIndex) => {
      const isActive = stationIndex === index;
      gsap.to(station, {
        autoAlpha: isActive ? 1 : 0.24,
        scale: isActive ? 1.02 : 0.92,
        y: isActive ? 0 : stationIndex < index ? -18 : 18,
        duration: 0.18,
        overwrite: "auto",
        ease: "power2.out"
      });

      const traces = stationTraces[stationIndex] ?? [];
      traces.forEach((trace) => {
        gsap.to(trace, {
          strokeDashoffset: isActive ? 0 : Number(trace.style.strokeDasharray || 0),
          duration: 0.18,
          overwrite: "auto",
          ease: "power2.out"
        });
      });
    });
  };

  const projectsTl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: stage,
      start: breakpoint === "desktop" ? "top top+=84" : "top 72%",
      end: breakpoint === "desktop" ? "+=340%" : "bottom 26%",
      scrub: true,
      pin: breakpoint === "desktop",
      pinSpacing: true,
      anticipatePin: 1
    }
  });

  projectsTl.to(introNodes, { autoAlpha: 1, y: 0, duration: 0.18, stagger: 0.05 }, 0.01);
  projectsTl.to(diagramLines, { strokeDashoffset: 0, duration: 0.2, stagger: 0.02 }, 0.02);
  projectsTl.to(links, { strokeDashoffset: 0, duration: 0.2, stagger: 0.05 }, 0.04);
  projectsTl.call(() => activateProject(0), undefined, 0.1);
  projectsTl.call(() => activateProject(1), undefined, 0.46);
  projectsTl.call(() => activateProject(2), undefined, 0.78);
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

  const context = gsap.context(() => {
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

    if (reducedMotion) {
      applyReducedMotionState(root);
      return;
    }

    setupPanelTransitions(root, breakpoint);
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
      cleanupLenis();
    }
  };
}
