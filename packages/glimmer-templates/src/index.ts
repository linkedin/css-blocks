import Resolver from '@glimmer/resolver';
import Project, { ResolutionMap } from './project';
import {
  performStyleAnalysis,
  StyleData
} from './handlebars-style-analyzer';
import { pathFromSpecifier } from './utils';

class BlockAnalyzer {
  project: Project;

  constructor(projectDir: string) {
    this.project = new Project(projectDir);
  }

  analyze(componentName: string): StyleData {
    return performStyleAnalysis(componentName, this.project)
  }
}

export default BlockAnalyzer;
