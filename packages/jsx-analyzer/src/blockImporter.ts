import * as postcss from "postcss";
import { Block, BlockParser } from "css-blocks";

const fs = require('fs');
const path = require('path');

const BLOCK_SUFFIX = '.block.css'; // TODO: Make configurable.
const parser = new BlockParser(postcss);

export interface ResolvedBlock {
  name: string;
  block: Block;
}

export default function visitors(blocks: Promise<ResolvedBlock>[]){
  return {
    ImportDeclaration(ast: any, parent: any) { // TODO: Types shouldn't be `any`
      let filepath = ast.node.source.value;
      let localName = ast.node.specifiers[0].local.name;

      // If this is not a CSS Blocks file, return.
      if ( !~filepath.indexOf(BLOCK_SUFFIX) ) {
        return;
      }

      // Read the referenced block file fron disk.
      let filename = path.parse(filepath).base;
      let blockName = filename.replace(BLOCK_SUFFIX, '');
      let stylesheet = fs.readFileSync(filepath);

      // Parse CSS Block, resolve local name and compiled block when done.
      let res = parser.parse(postcss.parse(stylesheet), filepath, blockName).then((block) : ResolvedBlock => {
        return {
          name: localName,
          block: block
        };
      });

      // Add to our blocks import Promise array
      blocks.push(res);
    }
  };
}
