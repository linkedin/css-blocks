import Resolver from '@glimmer/resolver';
import Project, { ResolutionMap } from './project';
import {
  discoverTemplateDependencies,
  discoverRecursiveTemplateDependencies,
  TemplateDependencies
} from './handlebars-analyzer';
import { pathFromSpecifier } from './utils';

class Analyzer {
  project: Project;

  constructor(projectDir: string) {
    this.project = new Project(projectDir);
  }

  dependenciesForTemplate(templateName: string) {
    return discoverTemplateDependencies(templateName, this.project);
  }

  recursiveDependenciesForTemplate(templateName: string) {
    return discoverRecursiveTemplateDependencies(templateName, this.project);
  }

  resolutionMapForEntryPoint(templateName: string) {
    let dependencies = discoverRecursiveTemplateDependencies(templateName, this.project);
    let components = new Set([dependencies.path, ...dependencies.components]);
    
    return filterResolutionMap(this.project.map, specifier => {
      let [type, path] = specifier.split(':');
      return (type === 'component' || type === 'template') && components.has(path);
    });
  }
}

function filterResolutionMap(map: ResolutionMap, filter: (specifier: string) => boolean): ResolutionMap {
  let filteredMap: ResolutionMap = {};

  for (let specifier of Object.keys(map)) {
    if (filter(specifier)) {
      filteredMap[specifier] = map[specifier];
    }
  }

  return filteredMap;
}

export default Analyzer;
