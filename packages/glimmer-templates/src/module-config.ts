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
export interface ModuleConfig {
  types: ObjectDictionary<ModuleType>;
  collections: ObjectDictionary<ModuleCollection | UnresolvableCollection>;
}
export const MODULE_CONFIG: ModuleConfig = {
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
