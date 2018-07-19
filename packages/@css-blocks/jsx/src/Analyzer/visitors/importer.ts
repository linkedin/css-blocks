import * as fs from "fs";
import * as path from "path";

import { Analysis, Block } from "@css-blocks/core";
import { ObjectDictionary } from "@opticss/util";
import { NodePath } from "babel-traverse";
import {
  ClassDeclaration,
  Function,
  ImportDeclaration,
  VariableDeclaration,
  VariableDeclarator,
  isIdentifier,
  isImportDefaultSpecifier,
  isImportNamespaceSpecifier,
  isImportSpecifier,
} from "babel-types";
import * as debugGenerator from "debug";

import { JSXTemplate, TEMPLATE_TYPE } from "../../Analyzer/Template";
import { JSXOptionsReader } from "../../options";
import { ErrorLocation, TemplateImportError } from "../../utils/Errors";
import { isBlockFilename } from "../../utils/isBlockFilename";
import { CSSBlocksJSXAnalyzer } from "../index";

const debug = debugGenerator("css-blocks:jsx");

const DEFAULT_IDENTIFIER = "default";
const VALID_FILE_EXTENSIONS = {
  ".jsx": 1, ".tsx": 1,
};

/**
 * If a given block name is in the passed registry, throw.
 * @param name The Block name in question.
 * @param registry The registry to check.
 */
function throwIfRegistered(name: string, blockRegistry: ObjectDictionary<number>, loc: ErrorLocation) {
  // TODO: Location reporting in errors.
  if (blockRegistry[name]) {
    throw new TemplateImportError(`Block identifier "${name}" cannot be re-defined in any scope once imported.`, loc);
  }
}

/**
 * This importer must run before the main analytics visitors. Here we parse all
 * imported CSS Blocks for a given JSX file. The passed `blocks` promise array
 * will store all discovered and parsed Block files. Once the all resolve, the
 * Block data is loaded into our Analytics object and the main analytics parser
 * can begin.
 * @param file The Template object representing this file.
 * @param analysis The Analysis object used to parse this file.
 * @param blockFactory The BlockFactory we will use to ensure the Blocks and BlockPromised we wait for are singletons.
 */
export function importVisitor(
  file: JSXTemplate,
  analyzer: CSSBlocksJSXAnalyzer,
  analysis: Analysis<TEMPLATE_TYPE>,
  blockPromises: Promise<Block>[],
  childTemplatePromises: Promise<Analysis<TEMPLATE_TYPE>>[],
  options: JSXOptionsReader,
) {

  // Keep a running record of local block names while traversing so we can check
  // for name conflicts elsewhere in the file.
  let _localBlocks: ObjectDictionary<number> = {};
  let dirname = path.dirname(file.identifier);
  let aliases = options.aliases || {};

  return {

    // For each Block import declaration, try to read the block file from disk,
    // compile its contents, and save the Block promises in the passed Blocks array.
    ImportDeclaration(nodePath: NodePath<ImportDeclaration>) {
      let filePath = nodePath.node.source.value;
      let specifiers = nodePath.node.specifiers;

      for (let key in aliases) {
        if (filePath.indexOf(key) === 0) {
          filePath = filePath.replace(key, aliases[key]);
          break;
        }
      }
      let absoluteFilePath = path.isAbsolute(filePath) ? filePath : path.resolve(dirname, filePath);

      // TODO: Handle blocks / components delivered through node_modules

      // Check if this is a jsx or tsx file on disk. If yes, this is a potential
      // part of the CSS Blocks dependency tree. We need to test all valid jsx
      // and typescript file extensions – require.resolve will not pick them up.
      let parsedPath = path.parse(absoluteFilePath);
      delete parsedPath.base;
      if (!parsedPath.ext) {
        for (let key in VALID_FILE_EXTENSIONS) {
          parsedPath.ext = key;
          if (fs.existsSync(path.format(parsedPath))) {
            break;
          }
          delete parsedPath.ext;
        }
      }
      absoluteFilePath = path.format(parsedPath);

      // If this is a jsx or tsx file, parse it with the same analysis object.
      if (fs.existsSync(absoluteFilePath) && VALID_FILE_EXTENSIONS[parsedPath.ext]) {
        debug(`Analyzing discovered dependency: ${absoluteFilePath}`);
        childTemplatePromises.push(analyzer.parseFile(absoluteFilePath));
        return;
      }

      // If this is not a CSS Blocks file, return.
      if (!isBlockFilename(filePath)) { return; }

      // For each specifier in this block import statement:
      let localName = "";
      let blockPath = path.resolve(dirname, filePath);

      specifiers.forEach((specifier) => {

        let isNamespace = isImportNamespaceSpecifier(specifier);

        // If is default import specifier, then fetch local name for block.
        if (isImportDefaultSpecifier(specifier) || isNamespace ||
             (isImportSpecifier(specifier) && specifier.imported.name === DEFAULT_IDENTIFIER)) {

          localName = specifier.local.name;
          _localBlocks[localName] = 1;
        }

      });

      // Try to fetch an existing Block Promise. If it does not exist, parse CSS Block.
      let res: Promise<Block> = analyzer.blockPromises[blockPath];
      if (!res) {
        res = analyzer.blockFactory.getBlockFromPath(blockPath).catch((err) => {
          throw new TemplateImportError(`Error parsing block import "${filePath}". Failed with:\n\n"${err.message}"\n\n`, {
            filename: file.identifier,
            line: nodePath.node.loc.start.line,
            column: nodePath.node.loc.start.column,
          });
        });
        analyzer.blockPromises.set(blockPath, res);
      }

      // When block parsing is done, add to analysis object.
      res.then((block): Block => {
        analysis.addBlock(localName, block);
        return block;
      })

      // Failures handled upstream by Promise.all() in `parseWith` method. Swallow error.
      .catch(() => {});

      blockPromises.push(res);

    },

    // Ensure no Variable Declarations in this file override an imported Block name.
    VariableDeclaration(path: NodePath<VariableDeclaration>) {
      path.node.declarations.forEach((decl: VariableDeclarator) => {
        if (!isIdentifier(decl.id)) {
          return;
        }
        throwIfRegistered(decl.id.name, _localBlocks, {
          filename: analysis.template.identifier,
          line: path.node.loc.start.line,
          column: path.node.loc.start.column,
        });
      });
    },

    // Ensure no Class Declarations in this file override an imported Block name.
    ClassDeclaration(path: NodePath<ClassDeclaration>) {
      if (!isIdentifier(path.node.id)) {
        return;
      }
      throwIfRegistered(path.node.id.name, _localBlocks, {
        filename: analysis.template.identifier,
        line: path.node.loc.start.line,
        column: path.node.loc.start.column,
      });
    },

    // Ensure no Function Declarations in this file override an imported Block name.
    Function(path: NodePath<Function>) {
      let node = path.node;

      if (isIdentifier(node.id)) {
        throwIfRegistered(node.id.name, _localBlocks, {
          filename: analysis.template.identifier,
          line: path.node.loc.start.line,
          column: path.node.loc.start.column,
        });
      }

      node.params.forEach((param) => {
        if (isIdentifier(param)) {
          throwIfRegistered(param.name, _localBlocks, {
            filename: analysis.template.identifier,
            line: path.node.loc.start.line,
            column: path.node.loc.start.column,
          });
        }
      });
    },
  };
}
