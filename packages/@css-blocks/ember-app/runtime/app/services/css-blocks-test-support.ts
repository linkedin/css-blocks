/// @ts-ignore
import { data as _data } from "./-css-blocks-data";
/// @ts-ignore
import { testSupportData as _testData } from "./-css-blocks-test-support-data";
import { AggregateRewriteData } from "./AggregateRewriteData";
import CSSBlocksService, { evaluateExpression } from "./css-blocks";
import { TestSupportData } from "./TestSupportData";

const data: AggregateRewriteData = _data;
const testData: TestSupportData = _testData;

// TODO: return this class object for getBlock() instead of the guid
export class TestBlock {
  blockId: string;
  constructor(blockId: string) {
    this.blockId = blockId;
  }
}

export class CSSBlocksTestService extends CSSBlocksService {
  constructor() {
    /// @ts-ignore
    super(...arguments); // need to pass in ...arguments since "@ember/service" extends from EmberObject
  }

  /**
   * Used to query the runtime test data to obtain the block's runtime id from
   * it's moduleName
   * @param moduleName name of the node module to look for the block
   * @param blockName name of the block to find within the moduleName
   */
  // tslint:disable-next-line: prefer-unknown-to-any
  getBlock(fileName: string, blockName: string): string {
    let runtimeBlockName = testData.runtimeBlockMapping[fileName];

    if (!runtimeBlockName) {
      throw new Error(`No block file named ${fileName} found in within this app's namespace`);
    } else {
      let exportedBlocks = testData.exportedBlocks[runtimeBlockName];
      if (!exportedBlocks) {
        throw new Error(`No block named ${blockName} found within ${fileName}. Check the @export declarations within the block file ${fileName}`);
      }
      let runtimeGuid = exportedBlocks[blockName];

      if (!runtimeGuid) {
        throw new Error(`No block named ${blockName} found within ${fileName}. Check the @export declarations within the block file ${fileName}`);
      }
      return runtimeGuid;
    }
  }

  getStyle(blockGuid: string, styleName: string) {
    let stylesApplied = new Set([getStyleId(blockGuid, styleName)]);
    //TODO: If we need styleResolver, do this instead
    //    return this.cssBlocksService.getImpliedAndOptimizedStyles(new Set([styleId]));
    // return `${blockGuid}${this.cssBlocksService.styleNames[styleId]}`;

    // TODO: Only iterate over the subset of optimizations that might match this
    // element's styles.
    let classNameIndices = new Set<number>();
    for (let [clsIdx, expr] of this.getPossibleOptimizations(stylesApplied)) {
      if (evaluateExpression(expr, stylesApplied)) {
        classNameIndices.add(clsIdx);
      }
    }

    // TODO: will we need to check for implied classNames? if so classNames = new Array<string>(...resolver.impliedClassNames());
    let classNames = new Array<string>();
    for (let idx of classNameIndices) {
      classNames.push(data.outputClassnames[idx]);
    }
    return classNames.join(" ");
  }
}

/**
 * Returns the styleId, given the blockGuid and name of the style
 */
function getStyleId(blockGuid: string, name: string ) {
  let blockIndex = data.blockIds[blockGuid];
  let blockInfo = data.blocks[blockIndex];
  let styleIndex = blockInfo.blockInterfaceStyles[name];
  return blockInfo.implementations[blockIndex][styleIndex]!;
}

// TODO: get qunit types
/// @ts-ignore
export function setupCSSBlocksTest(hooks) {
  hooks.beforeEach(function() {
    /// @ts-ignore
    if (!this.owner) {
      throw new Error(
        "setupTracking must be called after setupTest|setupRenderingTest|setupApplicationTest",
      );
    }

    // register the CSS blocks service before each test
    // @ts-ignore
    this.owner.register("service:css-blocks", CSSBlocksTestService);
    /// @ts-ignore
    this.cssBlocks = this.owner.lookup("service:css-blocks");
  });
}
