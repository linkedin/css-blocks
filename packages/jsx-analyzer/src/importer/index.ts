import * as postcss from "postcss";
import { Block, BlockParser } from "css-blocks";
import { NodePath } from 'babel-traverse';
import { ImportDeclaration,
         VariableDeclaration,
         VariableDeclarator,
         Function,
         Identifier,
         isIdentifier,
         ClassDeclaration
       } from 'babel-types';

const fs = require('fs');
const { parse } = require('path');

const BLOCK_SUFFIX = '.block.css'; // TODO: Make configurable.
const parser = new BlockParser(postcss);

export interface ResolvedBlock {
  name: string;
  localName: string;
  block: Block;
}

interface BlockRegistry {
  [key: string]: number;
}

/**
 * If a given block name is in the passed BlockRegistry, throw.
 * @param name The Block name in question.
 * @param registry The registry to check.
 */
function throwIfRegistered(name: string, registry: BlockRegistry){
  if ( registry[name] ) {
    // TODO: Location reporting in error.
    throw new Error(`Block identifier "${name}" cannot be re-defined in any scope once imported.`);
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

  return {

    // For each Block import declaration, try to read the block file from disk,
    // compile its contents, and save the Block promises in the passed Blocks array.
    ImportDeclaration(path: NodePath<ImportDeclaration>) {
      let filepath = path.node.source.value;
      let localName = path.node.specifiers[0].local.name;

      // If this is not a CSS Blocks file, return.
      if ( !~filepath.indexOf(BLOCK_SUFFIX) ) {
        return;
      }

      // Read the referenced block file fron disk.
      let filename = parse(filepath).base;
      let blockName = filename.replace(BLOCK_SUFFIX, '');
      let stylesheet = fs.readFileSync(filepath);

      // Parse CSS Block, resolve local name and compiled block when done.
      let res = parser.parse(postcss.parse(stylesheet), filepath, blockName).then((block) : ResolvedBlock => {
        return {
          name: block.name,
          localName: localName,
          block: block
        };
      });

      // Add to our blocks import Promise array
      _localBlocks[localName] = 1;
      blocks.push(res);
    },

    // Ensure no Variable Declarations in this file override an imported Block name.
    VariableDeclaration(path: NodePath<VariableDeclaration>){
      path.node.declarations.forEach((decl: VariableDeclarator) => {
        if (!isIdentifier(decl.id)) {
          return;
        }
        throwIfRegistered(decl.id.name, _localBlocks);
      });
    },

    // Ensure no Class Declarations in this file override an imported Block name.
    ClassDeclaration(path: NodePath<ClassDeclaration>){
      throwIfRegistered(path.node.id.name, _localBlocks)
    },

    // Ensure no Function Declarations in this file override an imported Block name.
    Function(path: NodePath<Function>){
      let node = path.node;

      if (isIdentifier(node.id)) {
        throwIfRegistered(node.id.name, _localBlocks)
      }

      node.params.forEach((param: Identifier) => {
        throwIfRegistered(param.name, _localBlocks)
      });
    }
  };
}
