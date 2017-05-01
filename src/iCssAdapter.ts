export interface ExportDictionary {
  [name: string]: string;
}

export default function iCssAdapter(mappings: ExportDictionary): (name: string) => string | null {
  return (name: string) => {
    if (name === ":block") {
      return mappings["block"];
    } else if (name.startsWith(":state")) {
      let md = name.match(/^:state\((?:([^ ]+) )?([^ ]+)\)$/);
      if (md) {
        let group = md[1];
        let state = md[2];
        if (group) {
          return mappings[`${group}-${state}`];
        } else {
          return mappings[state];
        }
      } else {
        throw new Error(`Illegal state: ${name}`);
      }
    } else if (name.startsWith(".")) {
      let md = name.match(/^\.([^:]+)(?::substate\((?:([^ ]+) )?([^ ]+)\))?$/);
      if (md) {
        let elementName = md[1];
        let group = md[2];
        let state = md[3];
        if (state) {
          if (group) {
            return mappings[`${elementName}--${group}-${state}`];
          } else {
            return mappings[`${elementName}--${state}`];
          }
        } else {
          return mappings[elementName];
        }
      } else {
        if (name.match(/:substate/)) {
          throw new Error(`Illegal substate: ${name}`);
        } else {
          throw new Error(`Illegal element: ${name}`);
        }
      }
    }
    return null;
  };
}
