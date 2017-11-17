import { NodePath } from 'babel-traverse';
import { JSXOpeningElement, } from 'babel-types';

import Analysis from '../utils/Analysis';
import { JSXElementAnalyzer } from './JSXElementAnalyzer';

/**
 * Babel visitors we can pass to `babel-traverse` to run analysis on a given JSX file.
 * @param analysis The Analysis object to store our results in.
 */
export default function visitors(analysis: Analysis): object {
  let elementAnalyzer = new JSXElementAnalyzer(analysis.blocks, analysis.template.identifier);

  return {
    //  TODO: handle the `h()` function?

    /**
     * Primary analytics parser for Babylon. Crawls all JSX Elements and their attributes
     * and saves all discovered block references. See README for valid JSX CSS Block APIs.
     * @param path The JSXOpeningElement Babylon path we are processing.
     */
    JSXOpeningElement(path: NodePath<JSXOpeningElement>): void {
      let element = elementAnalyzer.analyze(analysis.template.identifier, path);
      if (element) analysis.addElement(element);
    }
  };
}