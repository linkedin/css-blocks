import Resolver from '@glimmer/resolver';
import { AST, preprocess, traverse } from '@glimmer/syntax';
import Project, { ResolvedFile } from "./project";
import { pathFromSpecifier } from "./utils";

export interface TemplateDependencies {
  path: string;
  hasComponentHelper: boolean;
  components: string[];
}

export function discoverTemplateDependencies(templateName: string, project: Project): TemplateDependencies {
  let resolver = project.resolver;
  let template = project.templateFor(templateName);

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

  let path = pathFromSpecifier(template.specifier);
  let components = Array.from(usedComponents);

  return {
    path,
    hasComponentHelper,
    components
  };
}

function isComponentHelper({ path }: AST.MustacheStatement) {
  return path.type === 'PathExpression'
    && path.parts.length === 1
    && path.parts[0] === 'component';
}

export function discoverRecursiveTemplateDependencies(templateName: string, project: Project): TemplateDependencies {
  let resolver = project.resolver;
  let entryPoint = project.templateFor(templateName);
  let entryPointPath = pathFromSpecifier(entryPoint.specifier);

  let seen = new Set([entryPointPath]);
  let queue = [entryPointPath];
  let hasComponentHelper = false;

  let current;
  while (current = queue.pop()) {
    let dependencies = discoverTemplateDependencies(current, project);
    hasComponentHelper = hasComponentHelper || dependencies.hasComponentHelper;

    for (let component of dependencies.components) {
      if (!seen.has(component)) {
        seen.add(component);
        queue.push(component);
      }
    }
  }

  seen.delete(entryPointPath);

  let components = Array.from(seen);
  return {
    path: entryPointPath,
    hasComponentHelper,
    components
  };
}
