/// @ts-ignore
import Helper from "@ember/component/helper";
/// @ts-ignore
import { inject as service } from "@ember/service";

interface CSSBlocksService {
  classNamesFor(args: Array<string | number | boolean | null>): string;
}

// tslint:disable-next-line:no-default-export
export default class CSSBlocksHelper extends Helper {
  @service("css-blocks")
  cssBlocks!: CSSBlocksService;

  compute(...args: Array<string | number | boolean | null>) {
    return this.cssBlocks.classNamesFor(args);
  }
}
