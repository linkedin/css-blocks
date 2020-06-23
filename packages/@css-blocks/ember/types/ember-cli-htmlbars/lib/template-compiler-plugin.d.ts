import Filter = require('broccoli-persistent-filter');
import type { ASTPluginBuilder } from '@glimmer/syntax';
import type { InputNode } from 'broccoli-node-api';
// This is a hack to get access to the abstract Filter parameters which aren't exported.
declare class Foo extends Filter { }
type PluginOptions = ConstructorParameters<typeof Foo>[1]; // this should be exported by the main import.
declare namespace TemplateCompiler {
  interface HtmlBarsOptions extends PluginOptions {
    plugins?: {
      ast?: Array<ASTPluginBuilder>
    };
  }
}
declare class TemplateCompiler extends Filter {
  public extensions: ['hbs', 'handlebars'];
  public targetExtension: 'js';
  constructor(inputTree: InputNode, options: TemplateCompiler.HtmlBarsOptions);
  registeredASTPlugins(): Array<ASTPluginBuilder>;
  unregisterPlugins(): void;
  baseDir(): string;
  optionsHash(): string;
}
export = TemplateCompiler;