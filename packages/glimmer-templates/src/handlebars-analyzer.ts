import Resolver from '@glimmer/resolver';
import { AST, preprocess, traverse } from '@glimmer/syntax';
import { Template } from "./project";

export interface TemplateDependencies {
  hasComponentHelper: boolean;
  components: string[];
}

export function discoverTemplateDependencies(template: Template, resolver: Resolver): TemplateDependencies {
  let ast = preprocess(template.string);
  let usedComponents = new Set<string>();
  let hasComponentHelper = false;

  traverse(ast, {
    MustacheStatement(node) {
      if (isComponentHelper(node)) {
        hasComponentHelper = true;
      }
    },

    ElementNode(node) {
      let { tag } = node;
      let specifier = resolver.identify(`template:${tag}`, template.specifier);

      if (specifier) {
        usedComponents.add(pathFromSpecifier(specifier));
      }
    }
  });

  let components = Array.from(usedComponents);

  return {
    hasComponentHelper,
    components
  };
}

function isComponentHelper({ path }: AST.MustacheStatement) {
  return path.type === 'PathExpression'
    && path.parts.length === 1
    && path.parts[0] === 'component';
}

function pathFromSpecifier(specifier: string) {
  return specifier.split(':')[1];
}
