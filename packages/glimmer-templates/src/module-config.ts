export default {
  "types": {
    "application": { "definitiveCollection": "main" },
    "component": { "definitiveCollection": "components" },
    "renderer": { "definitiveCollection": "main" },
    "service": { "definitiveCollection": "services" },
    "template": { "definitiveCollection": "components" },
    "stylesheet": { "definitiveCollection": "components" },
    "util": { "definitiveCollection": "utils" }
  },
  "collections": {
    "main": {
      "types": ["application", "renderer"]
    },
    "components": {
      "group": "ui",
      "types": ["component", "template", "stylesheet"],
      "defaultType": "component",
      "privateCollections": ["utils"]
    },
    "utils": {
      "unresolvable": true
    }
  }
};
