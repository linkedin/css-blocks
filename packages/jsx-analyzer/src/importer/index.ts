import Analysis, { Template } from '../utils/Analysis';

import { parseFileWith } from '../index';
import { Block, BlockFactory } from 'css-blocks';
import { NodePath } from 'babel-traverse';
import { ImportDeclaration,
         VariableDeclaration,
         VariableDeclarator,
         Function,
         Identifier,
         isIdentifier,
         ClassDeclaration,
         isImportDefaultSpecifier,
         isImportSpecifier,
         isImportNamespaceSpecifier
       } from 'babel-types';

const fs = require('fs');
const path = require('path');

const BLOCK_SUFFIX = '.block.css'; // TODO: Make configurable.
const STATE_IDENTIFIER = 'states';
const DEFAULT_IDENTIFIER = 'default';
const VALID_FILE_EXTS = {
  '.jsx': 1, '.tsx': 1
};

interface BlockRegistry {
  [key: string]: number;
}

interface BlockStateRegistry {
  [key: string]: number;
}

/**
 * If a given block name is in the passed BlockRegistry, throw.
 * @param name The Block name in question.
 * @param registry The registry to check.
 */
function throwIfRegistered(name: string, blockRegistry: BlockRegistry, blockStateRegistry: BlockStateRegistry){
  // TODO: Location reporting in errors.
  if ( blockRegistry[name] ) {
    throw new Error(`Block identifier "${name}" cannot be re-defined in any scope once imported.`);
  }
  else if ( blockStateRegistry[name] ) {
    throw new Error(`Block state identifier "${name}" cannot be re-defined in any scope once imported.`);
  }
}

/**
 * This importer must run before the main analytics visitors. Here we parse all
 * imported CSS Blocks for a given JSX file. The passed `blocks` promise array
 * will store all discovered and parsed Block files. Once the all resolve, the
 * Block data is loaded into our Analytics object and the main analytics parser
 * can begin.
 * @param blocks The ResolvedBlock Promise array that will contain all read Block files.
 */
export default function importer(file: Template, analysis: Analysis, blockFactory: BlockFactory) {

  // Keep a running record of local block names while traversing so we can check
  // for name conflicts elsewhere in the file.
  let _localBlocks: BlockRegistry = {};
  let _localStates: BlockStateRegistry = {};
  let dirname = path.dirname(file.identifier);

  return {

    // For each Block import declaration, try to read the block file from disk,
    // compile its contents, and save the Block promises in the passed Blocks array.
    ImportDeclaration(nodepath: NodePath<ImportDeclaration>) {
      let filepath = nodepath.node.source.value;
      let specifiers = nodepath.node.specifiers;
      let absoluteFilepath = path.resolve(dirname, filepath);

      // TODO: Handle blocks / components delivered through node_modules

      // Check if this is a jsx or tsx file on disk. If yes, this is a potential
      // part of the CSS Blocks dependency tree. We need to test all valid jsx
      // and typescript file extensions – require.resolve will not pick them up.
      let parsedPath = path.parse(absoluteFilepath);
      delete parsedPath.base;
      if ( !parsedPath.ext ) {
        let exists = false;
        for (let key in VALID_FILE_EXTS) {
          parsedPath.ext = key;
          if ( fs.existsSync(path.format(parsedPath)) ){
            exists = true;
            break;
          }
        }
        if ( !exists ) {
          delete parsedPath.ext;
        }
      }
      absoluteFilepath = path.format(parsedPath);

      // If this is a jsx or tsx file, parse it with the same analysis object.
      if ( fs.existsSync(absoluteFilepath) && VALID_FILE_EXTS[parsedPath.ext] ) {
        parseFileWith(absoluteFilepath, analysis.parent, blockFactory);
        return;
      }

      // If this is not a CSS Blocks file, return.
      if ( !~filepath.indexOf(BLOCK_SUFFIX) ) {
        return;
      }

      // TODO: Make configurable
      filepath = filepath.replace('cssblock!', '');

      // For each specifier in this block import statement:
      let localState = '';
      let localName = '';
      let blockPath = path.resolve(dirname, filepath);

      specifiers.forEach((specifier) => {

        // TODO: For namespaced imports, the parser needs to be smart enougn to
        //       recognize `namespace.default` and `namespace.states` as block references.
        let isNamespace = isImportNamespaceSpecifier(specifier);

        // If is default import specifier, then fetch local name for block.
        if (   isImportDefaultSpecifier(specifier) || isNamespace ||
             ( isImportSpecifier(specifier) && specifier.imported.name === DEFAULT_IDENTIFIER ) ) {

          localName = specifier.local.name;
          _localBlocks[localName] = 1;
        }

        // If this is a named import specifier, discover local state object name.
        else if ( isImportSpecifier(specifier) ) {
          if ( specifier.imported.name === STATE_IDENTIFIER ) {
            localState = specifier.local.name;
            _localStates[specifier.local.name] = 1;
          }
        }
      });

      // Try to fetch an existing Block Promise. If it does not exist, parse CSS Block.
      let res: Promise<Block> = analysis.parent.blockPromises[blockPath];
      if ( !res ) {
        res = blockFactory.getBlockFromPath(blockPath);
        analysis.parent.blockPromises[blockPath] = res;
      }

      // When block parsing is done, add to analysis object.
      analysis.blockPromises.push(res);
      res.then((block) : Block => {
        analysis.blocks[localName] = block;
        analysis.template.localStates[localName] = localState;
        return block;
      });

    },

    // Ensure no Variable Declarations in this file override an imported Block name.
    VariableDeclaration(path: NodePath<VariableDeclaration>){
      path.node.declarations.forEach((decl: VariableDeclarator) => {
        if (!isIdentifier(decl.id)) {
          return;
        }
        throwIfRegistered(decl.id.name, _localBlocks, _localStates);
      });
    },

    // Ensure no Class Declarations in this file override an imported Block name.
    ClassDeclaration(path: NodePath<ClassDeclaration>){
      throwIfRegistered(path.node.id.name, _localBlocks, _localStates);
    },

    // Ensure no Function Declarations in this file override an imported Block name.
    Function(path: NodePath<Function>){
      let node = path.node;

      if (isIdentifier(node.id)) {
        throwIfRegistered(node.id.name, _localBlocks, _localStates);
      }

      node.params.forEach((param: Identifier) => {
        throwIfRegistered(param.name, _localBlocks, _localStates);
      });
    }
  };
}