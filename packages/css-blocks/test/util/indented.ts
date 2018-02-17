// import { whatever } from "@opticss/util";
import { outdent } from "outdent";
// function getFirstIndentedString(strings: string[][]): string | undefined {
//   for (let group of strings) {
//     if (group.length > 1) {
//       return (group[0].length === 0) ? group[1] : group[0];
//     } else {
//       if (group[0].length === 0) {
//         continue;
//       } else {
//         return group[0];
//       }
//     }
//   }
//   return;
// }
// function getIndentLength(str: string | undefined): number {
//   if (str && /^(\s*\|?)/.test(str)) {
//     return RegExp.$1.length;
//   } else {
//     return 0;
//   }
// }
export interface HasToString {
  toString(): string;
}
export function indented(strings: TemplateStringsArray, ...values: HasToString[]): string {
  // let splitStrings = strings.map(s => s.split(/\r\n|\n/));
  // let firstIndented = getFirstIndentedString(splitStrings);
  // let indentIndex = getIndentLength(firstIndented);
  return outdent(strings, ...values);
}
