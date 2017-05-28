import Resolver from '@glimmer/resolver';
import { AST, preprocess, traverse } from '@glimmer/syntax';
import Project, { ResolvedFile } from "./project";
import { pathFromSpecifier } from "./utils";

export interface TemplateDependencies {
  path: string;
  hasComponentHelper: boolean;
  components: string[];
}

export interface BlockReferences {
  [localName: string]: string
}

export type Correlation = string | string[];

export interface StyleData {
  template: string;
  blocks: BlockReferences;
  stylesFound: Set<string>;
  styleCorrelations: Correlation[];
}

const STATE = /state:(.*)/;

export function performStyleAnalysis(templateName: string, project: Project): StyleData {
  let resolver = project.resolver;
  let template = project.templateFor(templateName);
  let stylesheet = project.stylesheetFor(templateName);
  let styleData: StyleData = {
    template: template.path,
    blocks: {"": stylesheet.path},
    stylesFound: new Set(),
    styleCorrelations: []
  };

  let ast = preprocess(template.string);
  let elementCount = 0;
  let elementStyles: string[] = [];

  traverse(ast, {
    AttrNode(node) {
      if (node.name === "class") {
        if (node.value.type === "TextNode") {
          let classNames = (<AST.TextNode>node.value).chars.split(/\s+/);
          classNames.forEach((name) => {
            styleData.stylesFound.add(name);
            elementStyles.push(name);
          });
        }
      } else if (node.name.match(STATE)) {
        let stateName = RegExp.$1;
        let substateName: string | null = null;
        if (node.value) {
          if (node.value.type === "TextNode") {
            substateName = node.value.chars;
          } else {
            // dynamic stuff will go here
          }
        }
        let style = substateName ? `[state|${stateName}=${substateName}]` : `[state|${stateName}]`;
        styleData.stylesFound.add(style);
        elementStyles.push(style);
      }
    },

    ElementNode(node) {
      elementCount++;
      if (elementStyles.length > 1) {
        styleData.styleCorrelations.push(elementStyles);
        elementStyles = [];
      }
    }
  });

  return styleData;
}

function isComponentHelper({ path }: AST.MustacheStatement) {
  return path.type === 'PathExpression'
    && path.parts.length === 1
    && path.parts[0] === 'component';
}