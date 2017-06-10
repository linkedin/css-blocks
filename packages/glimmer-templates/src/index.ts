import Resolver from '@glimmer/resolver';
import Project, { ResolutionMap } from './project';
import {
  HandlebarsStyleAnalyzer
} from './HandlebarsStyleAnalyzer';
import { TemplateAnalysis as StyleAnalysis } from "css-blocks";
import { pathFromSpecifier } from './utils';

export default HandlebarsStyleAnalyzer;
