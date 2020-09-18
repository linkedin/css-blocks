/// @ts-ignore
import { data as _data } from "./-css-blocks-data";
/// @ts-ignore
import { testSupportData as _testData } from "./-css-blocks-test-support-data";
import { AggregateRewriteData } from "./AggregateRewriteData";
import CSSBlocksService from "./css-blocks";
import { TestSupportData } from "./TestSupportData";

const testData: TestSupportData = _testData;
const data: AggregateRewriteData = _data;

export class TestBlock {
  blockName: string;
  blockId: string;
  styles: Array<string>;
  constructor(blockName: string , blockId: string, styles: Array<string>) {
    this.blockName = blockName;
    this.blockId = blockId;
    this.styles = styles;
  }
  style(styleName: string) {
    if (this.styles.includes(styleName)) {
      return `${this.blockId}${styleName}`;
    } else {
      throw new Error(`No style named "${styleName}" found on "${this.blockName}". Specify one of: ${this.styles.join(", ")}.`);
    }
  }
}

export class CSSBlocksTestService extends CSSBlocksService {
  constructor() {
    /// @ts-ignore
    super(...arguments); // need to pass in ...arguments since "@ember/service" extends from EmberObject
  }

  classNamesFor(argv: Array<string | number | boolean | null>): string {
    let runtimeClassNames = super.classNamesFor(argv);
    let directlyAppliedStyleIds = this.getDirectlyAppliedStyles(argv);
    // convert the directly applied styleIds into a human readable form
    let proxyClassNames = this.getStyleNames(directlyAppliedStyleIds).join(" ");
    return `${proxyClassNames} ${runtimeClassNames}`;
  }

  /**
   * Used to query the runtime test data to obtain the block's runtime id from
   * it's moduleName
   * @param moduleName name of the node module to look for the block
   * @param blockName name of the block to find within the moduleName
   */
  getBlock(fileName: string, blockName: string): TestBlock {
    let runtimeBlockName = testData[fileName];

    if (!runtimeBlockName) {
      throw new Error(`No block file named "${fileName}" found in within this app's namespace`);
    } else {
      let runtimeGuid = runtimeBlockName[blockName];

      if (!runtimeGuid) {
        throw new Error(`No block named "${blockName}" found within "${fileName}". Specify one of: ${Object.keys(runtimeBlockName).join(", ")}.`);
      }
      return new TestBlock(blockName, runtimeGuid, getStyles(runtimeGuid));
    }
  }
}

/**
* Returns the available styles, given the blockGuid
*/
function getStyles(guid: string): Array<string> {
  let blockIndex = data.blockIds[guid];
  let blockInfo = data.blocks[blockIndex];
  return Object.keys(blockInfo.blockInterfaceStyles);
}

/**
 * This is a utility function that sets up all the testing infra needed for CSS
 * blocks. It essentially overrides the css-blocks service used by the app
 * during tests and adds dummy classNames that is more human readable. It exposes
 * the test API via this.cssBlocks that can be used within the test files themselves.
 *
 * This function will work both with `ember-qunit` and with `ember-mocha` since
 * the ember setup functions do the same for both the libraries.
 *
 * Usage within a test
    module('Acceptance | css blocks helper', function (hooks) {
      setupApplicationTest(hooks);
      setupCSSBlocksTest(hooks);

      test('visiting /', async function (assert) {
        await visit('/');
        let defaultBlock = this.cssBlocks.getBlock("hue-web-component/styles/components/hue-web-component", "default");
        let element = find('[data-test-large-hello]');
        assert.ok(element.classList.contains(defaultBlock.style(':scope[size="large]')));
      });
    });
 */
// @ts-ignore the error for hooks as this can either come from qunit or mocha
export function setupCSSBlocksTest(hooks) {
  hooks.beforeEach(function() {
    // ember-qunit and ember-mocha sets this.owner and we have to check that one of the
    // setup functions from there are called before we can register our service
    // @ts-ignore
    if (!this.owner) {
      throw new Error(
        "setupCSSBlocksTest must be called after setupTest|setupRenderingTest|setupApplicationTest",
      );
    }

    // register the CSS blocks service before each test
    // @ts-ignore
    this.owner.register("service:css-blocks", CSSBlocksTestService);
    // @ts-ignore
    this.cssBlocks = this.owner.lookup("service:css-blocks");
  });
}
