import Resolver from '@glimmer/resolver';
import Project from './project';
import { discoverTemplateDependencies, TemplateDependencies } from './handlebars-analyzer';

class Analyzer {
  project: Project;

  constructor(projectDir: string) {
    this.project = new Project(projectDir);
  }

  dependenciesForTemplate(templateName: string) {
    let template = this.project.templateFor(templateName);
    return discoverTemplateDependencies(template, this.project.resolver);
  }
}

export default Analyzer;
