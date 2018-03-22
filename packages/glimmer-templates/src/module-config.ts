import { ObjectDictionary } from "@opticss/util";

export interface ModuleType {
  definitiveCollection: string;
}
export interface ModuleCollection {
  types: string[];
  group?: string;
  defaultType?: string;
  privateCollections?: string[];
}
export interface UnresolvableCollection {
  unresolvable: true;
}

export interface AppMeta {
  name: string;
  rootName: string;
}
export interface ModuleConfig {
  app: AppMeta;
  types: ObjectDictionary<ModuleType | UnresolvableCollection>;
  collections: ObjectDictionary<ModuleCollection | UnresolvableCollection>;
}
export const MODULE_CONFIG: ModuleConfig = {
  "app": {
    "name": "glimmer-test",
    "rootName": "glimmer-test"
  },

  "types": {
    "application": { "definitiveCollection": "main" },
    "component": { "definitiveCollection": "components" },
    "component-test": { "unresolvable": true },
    "helper": { "definitiveCollection": "components" },
    "helper-test": { "unresolvable": true },
    "renderer": { "definitiveCollection": "main" },
    "template": { "definitiveCollection": "components" },
    "stylesheet": { "definitiveCollection": "components" },
  },

  "collections": {
    "main": { "types": ["application", "renderer"] },
    "components": {
      "group": "ui",
      "types": ["component", "component-test", "template", "helper", "helper-test", "stylesheet"],
      "defaultType": "component",
      "privateCollections": ["utils"]
    },
    "styles": {
      "group": "ui",
      "unresolvable": true
    },
    "utils": { "unresolvable": true }
  }
};



/*{
  "types": {
    "application": { "definitiveCollection": "main" },
    "component": { "definitiveCollection": "components" },
    "renderer": { "definitiveCollection": "main" },
    "service": { "definitiveCollection": "services" },
    "template": { "definitiveCollection": "components" },
    "stylesheet": { "definitiveCollection": "components" },
    "util": { "definitiveCollection": "utils" },
  },
  "collections": {
    "main": {
      "types": ["application", "renderer"],
    },
    "components": {
      "group": "ui",
      "types": ["component", "template", "stylesheet"],
      "defaultType": "component",
      "privateCollections": ["utils"],
    },
    "utils": {
      "unresolvable": true,
    },
  },
};
*/