/// @ts-ignore
import { helper } from "@ember/component/helper";

// tslint:disable-next-line:prefer-unknown-to-any
function _concat(args: any[]) {
  return args.join("");
}

const concat = helper(_concat);

// tslint:disable-next-line:no-default-export
export default concat;
