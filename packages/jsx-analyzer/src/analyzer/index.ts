import Analysis from '../Analysis';
import JSXOpeningElement from './JSXOpeningElement';

// Consolidate all visitors into a hash that we can pass to `babel-traverse`
export default function visitors(analysis: Analysis): object {
  return {
    JSXOpeningElement: JSXOpeningElement.bind(analysis),
  };
}
