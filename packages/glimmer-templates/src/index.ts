import Resolver from '@glimmer/resolver';
import Project, { ResolutionMap } from './project';
import {
  HandlebarsStyleAnalyzer
} from './HandlebarsStyleAnalyzer';
import { TemplateAnalysis as StyleAnalysis } from "css-blocks";
import { pathFromSpecifier } from './utils';

class BlockAnalyzer {
  project: Project;

  constructor(projectDir: string) {
    this.project = new Project(projectDir);
  }

  analyze(componentName: string): Promise<StyleAnalysis> {
    let analyzer = new HandlebarsStyleAnalyzer(this.project);
    return analyzer.performStyleAnalysis(componentName);
  }
}

export default BlockAnalyzer;
