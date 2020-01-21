import * as inquirer from "inquirer";

import { SelectorBemObject } from "./interface";

export async function getBemNamesFromUser(selector: string, fileName: string): Promise<SelectorBemObject> {
  let {block} = await inquirer.prompt({
    message: `.${selector}${fileName ? ` in ${fileName} ` : ""} does not follow BEM conventions. Enter the block name for this class (required): `,
    name: "block",
    validate: (input) => {
      // check that the block is not an empty string
      return input !== "";
    },
  });

  let {element} = await inquirer.prompt({
    message: `Enter the element name for .${selector} (optional): `,
    name: "element",
  });

  let {modifier} = await inquirer.prompt({
    message: `Enter the modifier name for .${selector} (optional): `,
    name: "modifier",
  });

  return {selector: selector, bemObj: {block, element, modifier}};

  // .then(blockAns => {
  //   bemName.block = blockAns.block;
  //   if (blockAns.block) {
  //     // get the element
  //     inquirer.prompt({
  //       message: `Enter the element name for .${selector} (optional): `,
  //       name: "element",
  //     }).then(ans => {
  //       bemName.element = ans.element.length > 0  ? ans.element : undefined;
  //         // get the modifier name
  //         inquirer.prompt({
  //           message: `Enter the modifier name for .${selector} (optional): `,
  //           name: "modifier",
  //         }).then(ans => {
  //           bemName.modifier = ans.modifier.length > 0 ? ans.modifier : undefined;
  //           return bemName;
  //         }).catch(e => { throw e; });
  //     }).catch(e => { throw e; });
  //   }
  // }).catch(e => { throw e; });
}
