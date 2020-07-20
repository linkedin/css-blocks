/// @ts-ignore
import Helper from "@ember/component/helper";
/// @ts-ignore
import Service from "@ember/service";

/// @ts-ignore
import { data } from "./-css-blocks-data";

// tslint:disable-next-line:no-default-export
export default class CSSBlocksService extends Service {
  classNamesFor(_args: Array<string | number | boolean | null>): string {
    return data.className;
  }
}
