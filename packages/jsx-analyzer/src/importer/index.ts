import * as postcss from 'postcss';
import { Block, BlockParser } from 'css-blocks';
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
const { parse } = require('path');

const BLOCK_SUFFIX = '.block.css'; // TODO: Make configurable.
const STATE_IDENTIFIER = 'states';
const DEFAULT_IDENTIFIER = 'default';
const parser = new BlockParser(postcss);

export interface ResolvedBlock {
  name: string;
  localName: string;
  localState: string;
  block: Block | undefined;
}

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
export default function importer(blocks: Promise<ResolvedBlock>[]){

  // Keep a running record of local block names while traversing so we can check
  // for name conflicts elsewhere in the file.
  let _localBlocks: BlockRegistry = {};
  let _localStates: BlockStateRegistry = {};

  return {

    // For each Block import declaration, try to read the block file from disk,
    // compile its contents, and save the Block promises in the passed Blocks array.
    ImportDeclaration(path: NodePath<ImportDeclaration>) {
      let filepath = path.node.source.value;
      let specifiers = path.node.specifiers;

      // If this is not a CSS Blocks file, return.
      if ( !~filepath.indexOf(BLOCK_SUFFIX) ) {
        return;
      }

      // For each specifier in this block import statement:
      let blockDescriptor: ResolvedBlock = {
        name: '',
        localName: '',
        localState: '',
        block: undefined
      };
      specifiers.forEach((specifier) => {

        // TODO: For namespaced imports, the parser needs to be smart enougn to
        //       recognize `namespace.default` and `namespace.states` as block references.
        let isNamespace = isImportNamespaceSpecifier(specifier);

        // If is default import specifier, read the referenced block file from disk.
        // Then, parse CSS Block, resolve local name and compiled block when done.
        if (   isImportDefaultSpecifier(specifier) || isNamespace ||
             ( isImportSpecifier(specifier) && specifier.imported.name === DEFAULT_IDENTIFIER ) ) {
          let filename = parse(filepath).base;
          let blockName = filename.replace(BLOCK_SUFFIX, '');
          let stylesheet = fs.readFileSync(filepath);

          blockDescriptor.localName = specifier.local.name;
          let res = parser.parse(postcss.parse(stylesheet), filepath, blockName).then((block) : ResolvedBlock => {
            blockDescriptor.name = block.name;
            blockDescriptor.block = block;
            return blockDescriptor;
          });

          // Add to our blocks import Promise array
          _localBlocks[blockDescriptor.localName] = 1;
          blocks.push(res);
        }

        // If this is a named import specifier, discover local state object name.
        else if ( isImportSpecifier(specifier) ) {
          if ( specifier.imported.name === STATE_IDENTIFIER ) {
            blockDescriptor.localState = specifier.local.name;
            _localStates[specifier.local.name] = 1;
          }
        }
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
