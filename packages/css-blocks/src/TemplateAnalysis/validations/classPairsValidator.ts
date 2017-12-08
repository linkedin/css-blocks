import { isTrueCondition, isFalseCondition } from '../ElementAnalysis';
import { Block, BlockClass, isBlockClass } from "../../Block";
import { Validator, ErrorCallback } from "./Validator";

/**
 * Prevent two BlockClasses from the same Block hierarchy from being applied together.
 * @param err Error callback.
 */

const classPairsValidator: Validator = (analysis, _templateAnalysis, err) => {
  // TODO: this doesn't work for dynamic classes
  let classPerBlock: Map<Block, BlockClass> = new Map();
  for (let container of analysis.classesFound(false)) {
    if (isBlockClass(container)) {
      for (let block of checkExisting(classPerBlock, classPerBlock, container, err)) {
        classPerBlock.set(block, container);
      }
    }
  }
  for (let dyn of analysis.dynamicClasses) {
    let trueBlocks = new Map<Block, BlockClass>();
    if (isTrueCondition(dyn)) {
      for (let container of dyn.whenTrue) {
        if (isBlockClass(container)) {
          let blocks = checkExisting(classPerBlock, trueBlocks, container, err);
          for (let block of blocks) { trueBlocks.set(block, container); }
        }
      }
    }
    let falseBlocks = new Map<Block, BlockClass>();
    if (isFalseCondition(dyn)) {
      for (let container of dyn.whenFalse) {
        if (isBlockClass(container)) {
          let blocks = checkExisting(classPerBlock, falseBlocks, container, err);
          for (let block of blocks) { trueBlocks.set(block, container); }
        }
      }
    }
    for (let [block, container] of trueBlocks.entries()) {
      classPerBlock.set(block, container);
    }
    for (let [block, container] of falseBlocks.entries()) {
      classPerBlock.set(block, container);
    }
  }
};

function checkExisting(classPerBlock: Map<Block, BlockClass>, tmpClassPerBlock: Map<Block, BlockClass>, container: BlockClass, err: ErrorCallback): Array<Block> {
  let blocks = new Array<Block>();
  let mainBlock = container.block;
  let blockHierarchy = mainBlock.getAncestors();
  blockHierarchy.unshift(mainBlock);
  for (let block of blockHierarchy) {
    let otherClass = classPerBlock.get(block) || tmpClassPerBlock.get(block);
    if (otherClass) {
      err(`Classes "${container.name}" and "${otherClass.name}" from the same block${block !== mainBlock ? ' hierarchy' : ''} are not allowed on the same element at the same time.`);
    } else {
      blocks.push(block);
    }
  }
  return blocks;
}

export default classPairsValidator;
