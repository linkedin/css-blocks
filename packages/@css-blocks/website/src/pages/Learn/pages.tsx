export interface Page {
  name: string;
}

export interface Section {
  name: string;
  pages: Page[];
}

export interface Pages {
  sections: Section[];
}

// TODO: Automate generation of this POJO based on .md files on disk.
export const PAGES: Pages = {
  sections: [
    {
      name: "getting-started",
      pages: [
        {name: "principles" },
        {name: "the-build" },
        {name: "api-overview" },
      ]
    },
    {
      name: "block-files",
      pages: [
        { name: "block-syntax" },
        { name: "scope-selector" },
        { name: "class-selectors" },
        { name: "state-selectors" },
        { name: "selector-rules" },
        { name: "import-export" },
        { name: "block-paths" },
        { name: "inheritance" },
        { name: "composition" },
        { name: "conflict-resolution" },
        { name: "global-states" },
        { name: "external-selectors" },
        { name: "debugging" },
        { name: "configuration" },
        { name: "preprocessors" },
      ]
    },
    {
      name: "ember",
      pages: [
        { name: "install" },
        { name: "configuration" },
        { name: "using-styles" },
        { name: "composing-styles" },
        { name: "conditional-styles" },
        { name: "built-ins" },

      ]
    }
  ]
}