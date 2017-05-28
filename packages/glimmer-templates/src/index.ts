import Resolver from '@glimmer/resolver';
import Project, { ResolutionMap } from './project';
import {
  performStyleAnalysis
} from './handlebars-style-analyzer';
import StyleAnalysis from './StyleAnalysis';
import { pathFromSpecifier } from './utils';

class BlockAnalyzer {
  project: Project;

  constructor(projectDir: string) {
    this.project = new Project(projectDir);
  }

  analyze(componentName: string): Promise<StyleAnalysis> {
    return performStyleAnalysis(componentName, this.project)
  }
}

export default BlockAnalyzer;
