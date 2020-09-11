/// @ts-ignore
import { data as _data } from "./-css-blocks-data";
/// @ts-ignore
import { testSupportData as _testData } from "./-css-blocks-test-support-data";
import CSSBlocksService from "./css-blocks";
import { TestSupportData } from "./TestSupportData";

const testData: TestSupportData = _testData;

export class TestBlock {
  blockId: string;
  constructor(blockId: string) {
    this.blockId = blockId;
  }
  style(styleName: string) {
    // we need to strip "" for styles like [size="large"]
    return `${this.blockId}${styleName.replace('"', "")}`;
  }
}

export class CSSBlocksTestService extends CSSBlocksService {
  constructor() {
    /// @ts-ignore
    super(...arguments); // need to pass in ...arguments since "@ember/service" extends from EmberObject
    // set this to true so that classNamesFor will return a proxy to the actual
    // runtime classes in addition to the actual runtime classes
    CSSBlocksTestService.enableTestMode = true;
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
  // tslint:disable-next-line: prefer-unknown-to-any
  getBlock(fileName: string, blockName: string): TestBlock {
    let runtimeBlockName = testData[fileName];

    if (!runtimeBlockName) {
      throw new Error(`No block file named ${fileName} found in within this app's namespace`);
    } else {
      let runtimeGuid = runtimeBlockName[blockName];

      if (!runtimeGuid) {
        throw new Error(`No block named ${blockName} found within ${fileName}. Check the @export declarations within the block file ${fileName}`);
      }
      return new TestBlock(runtimeGuid);
    }
  }
}


/**
 * This is a utility function that sets up all the testing infra needed for CSS
 * blocks. It essentially overrides the css-blocks service used by the app
 * during tests and adds dummy classNames that is more human readable. It exposes
 * the test API via this.cssBlocks that can be used within the test files themselves.
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
