import Resolver from '@glimmer/resolver';
import * as postcss from "postcss";
import { AST, preprocess, traverse } from '@glimmer/syntax';
import { BlockParser, PluginOptions, PluginOptionsReader, CssBlockError } from "css-blocks";
import Project, { ResolvedFile } from "./project";
import { pathFromSpecifier } from "./utils";
import StyleAnalysis from "./StyleAnalysis";

const STATE = /state:(.*)/;

export function performStyleAnalysis(templateName: string, project: Project): Promise<StyleAnalysis> {
  let resolver = project.resolver;
  let template = project.templateFor(templateName);
  let stylesheet = project.stylesheetFor(templateName);
  let analysis = new StyleAnalysis(template);
  let blockOpts: PluginOptions = { }; // TODO: read this in from a file somehow?
  let parser = new BlockParser(postcss, blockOpts);
  let root = postcss.parse(stylesheet.string);
  let result = parser.parse(root, stylesheet.path, templateName);

  let ast = preprocess(template.string);
  let elementCount = 0;
  let elementStyles: string[] = [];

  return result.then((block) => {
    analysis.blocks[""] = block;
    traverse(ast, {
      AttrNode(node) {
        if (node.name === "class") {
          if (node.value.type === "TextNode") {
            let classNames = (<AST.TextNode>node.value).chars.split(/\s+/);
            classNames.forEach((name) => {
              if (name === "root") {
                analysis.addStyle(block);
              } else {
                let klass = block.getClass(name);
                if (klass) {
                  analysis.addStyle(klass);
                } else {
                  throw new CssBlockError(`No class ${name} found in block at ${stylesheet.path}`, {
                    filename: node.loc.source || template.path,
                    line: node.loc.start.line,
                    column: node.loc.start.column
                  })
                }
              }
            });
          }
        } else if (node.name.match(STATE)) {
          let stateName = RegExp.$1;
          let substateName: string | null = null;
          if (node.value && node.value.type === "TextNode" && node.value.chars) {
              substateName = node.value.chars;
              let state = block.getState({ group: stateName, name: substateName });
              if (state) {
                analysis.addStyle(state);
              } else {
                throw new CssBlockError(`No state ${stateName}=${node.value.chars} found in block at ${stylesheet.path}`, {
                  filename: node.loc.source || template.path,
                  line: node.loc.start.line,
                  column: node.loc.start.column
                })
              }
          } else if (node.value && node.value.type !== "TextNode") {
            // dynamic stuff will go here
            throw new CssBlockError("No handling for dynamic styles yet", {
                filename: node.loc.source || template.path,
                line: node.loc.start.line,
                column: node.loc.start.column
            })
          } else {
            let state = block.getState({ name: stateName });
            if (state) {
              analysis.addStyle(state);
            } else {
              throw new CssBlockError(`No state ${stateName} found in block at ${stylesheet.path}`, {
                filename: node.loc.source || template.path,
                line: node.loc.start.line,
                column: node.loc.start.column
              })
            }
          }
        }
      },

      ElementNode(node) {
        analysis.endElement();
        analysis.startElement();
        elementCount++;
      }
    });
    analysis.endElement();
    return analysis;
  });


}

function isComponentHelper({ path }: AST.MustacheStatement) {
  return path.type === 'PathExpression'
    && path.parts.length === 1
    && path.parts[0] === 'component';
}