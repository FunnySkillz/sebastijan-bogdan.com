import type { HomePageContent } from "./homeContent";

export type DirectorActId = "act1" | "act2" | "act3" | "act4" | "act5";

export interface DirectorOverlayAct1 {
  act: "act1";
  kicker: string;
  title: string;
  roles: string[];
  paragraphs: string[];
  labels: string[];
}

export interface DirectorOverlayAct2 {
  act: "act2";
  kicker: string;
  title: string;
  period: string;
  company: string;
  role: string;
  themes: string[];
  nodes: HomePageContent["experience"]["nodes"];
  highlight: {
    title: string;
    stack: string;
    focus: string;
  };
}

export interface DirectorOverlayAct3 {
  act: "act3";
  kicker: string;
  title: string;
  intro: string;
  projects: HomePageContent["projects"]["stations"];
}

export interface DirectorOverlayAct4 {
  act: "act4";
  kicker: string;
  title: string;
  intro: string;
  groups: HomePageContent["toolbox"]["groups"];
}

export interface DirectorOverlayAct5 {
  act: "act5";
  kicker: string;
  titleTop: string;
  titleBottom: string;
  copy: string;
  keywords: string[];
  contact: {
    heading: string;
    intro: string;
    links: HomePageContent["contact"]["links"];
  };
}

export interface DirectorContentContract {
  act1: DirectorOverlayAct1;
  act2: DirectorOverlayAct2;
  act3: DirectorOverlayAct3;
  act4: DirectorOverlayAct4;
  act5: DirectorOverlayAct5;
}

export function createStageContent(content: HomePageContent): DirectorContentContract {
  return {
    act1: {
      act: "act1",
      kicker: content.hero.actTitle,
      title: content.hero.heading,
      roles: content.hero.roles,
      paragraphs: [content.hero.intro, content.hero.outro],
      labels: content.hero.labels
    },
    act2: {
      act: "act2",
      kicker: content.experience.actTitle,
      title: content.experience.heading,
      period: content.experience.period,
      company: content.experience.company,
      role: content.experience.role,
      themes: content.experience.themes,
      nodes: content.experience.nodes,
      highlight: {
        title: content.experience.highlightTitle,
        stack: content.experience.highlightStack,
        focus: content.experience.highlightFocus
      }
    },
    act3: {
      act: "act3",
      kicker: content.projects.actTitle,
      title: content.projects.heading,
      intro: content.projects.intro,
      projects: content.projects.stations
    },
    act4: {
      act: "act4",
      kicker: content.toolbox.actTitle,
      title: content.toolbox.heading,
      intro: content.toolbox.intro,
      groups: content.toolbox.groups
    },
    act5: {
      act: "act5",
      kicker: content.philosophy.actTitle,
      titleTop: content.philosophy.headingTop,
      titleBottom: content.philosophy.headingBottom,
      copy: content.philosophy.copy,
      keywords: content.philosophy.keywords,
      contact: {
        heading: content.contact.heading,
        intro: content.contact.intro,
        links: content.contact.links
      }
    }
  };
}
